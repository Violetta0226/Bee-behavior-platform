"""Official single-image CLI contract."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import sys
import tempfile
import time
from pathlib import Path
from typing import Any, Callable, Sequence, TextIO

from .detector import BeeDetector, CorruptImageError, ModelRuntimeError, infer_modality, load_rgb_image


EXIT_SUCCESS = 0
EXIT_NOT_FOUND = 404
EXIT_CORRUPT_IMAGE = 501
EXIT_RUNTIME_ERROR = 500


def runtime_root() -> Path:
    bundled = getattr(sys, "_MEIPASS", None)
    return Path(bundled) if bundled else Path(__file__).resolve().parents[1]


def parser() -> argparse.ArgumentParser:
    result = argparse.ArgumentParser(add_help=True)
    result.add_argument("--image_path", default=None)
    result.add_argument("--modality", choices=("auto", "rgb", "infrared"), default="auto")
    result.add_argument("--task", choices=("auto", "detect", "track"), default="auto")
    result.add_argument("--sequence_id", default=None)
    result.add_argument("--frame_id", type=int, default=None)
    result.add_argument("--state_dir", type=Path, default=None, help=argparse.SUPPRESS)
    result.add_argument("--reset", action="store_true", help=argparse.SUPPRESS)
    result.add_argument("--config", type=Path, default=None, help=argparse.SUPPRESS)
    return result


def emit(payload: dict[str, Any], stream: TextIO) -> None:
    stream.write(json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + "\n")
    stream.flush()


def failure(message: str, processing_time_ms: int) -> dict[str, Any]:
    return {"code": 0, "message": message, "processing_time_ms": processing_time_ms}


def infer_task(path: Path) -> str:
    parts = [part.lower() for part in path.parts]
    return "track" if path.parent.name.lower() == "img1" or "tracking" in parts else "detect"


def tracking_identity(path: Path, sequence_id: str | None, frame_id: int | None) -> tuple[str, int]:
    sequence = sequence_id or (path.parent.parent.name if path.parent.name.lower() == "img1" else path.parent.name)
    if not sequence:
        raise ValueError("tracking sequence_id cannot be empty")
    if frame_id is None:
        try:
            frame_id = int(path.stem)
        except ValueError as exc:
            raise ValueError("tracking frame_id is required for a non-numeric filename") from exc
    if frame_id < 1:
        raise ValueError("tracking frame_id must be positive")
    return sequence, frame_id


def tracker_state_path(state_dir: Path, sequence_id: str) -> Path:
    digest = hashlib.sha256(sequence_id.encode("utf-8")).hexdigest()[:20]
    return state_dir / f"sequence-{digest}.json"


def save_tracker_state(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    descriptor, temporary_name = tempfile.mkstemp(prefix=path.name + ".", suffix=".tmp", dir=path.parent)
    try:
        with os.fdopen(descriptor, "w", encoding="utf-8") as handle:
            json.dump(payload, handle, ensure_ascii=False, separators=(",", ":"))
            handle.write("\n")
        os.replace(temporary_name, path)
    finally:
        if os.path.exists(temporary_name):
            os.unlink(temporary_name)


def track_detections(
    detections: list[dict[str, Any]],
    modality: str,
    sequence_id: str,
    frame_id: int,
    detector: Any,
    state_dir: Path,
    reset: bool,
) -> list[dict[str, Any]]:
    try:
        from tracking import BeeTracker, TrackerConfig
    except ImportError:
        package_root = Path(__file__).resolve().parents[2]
        if str(package_root) not in sys.path:
            sys.path.insert(0, str(package_root))
        from tracking import BeeTracker, TrackerConfig

    settings = detector.config["tracking"][modality]
    tracker = BeeTracker(TrackerConfig(**settings))
    state_path = tracker_state_path(state_dir, sequence_id)
    if state_path.is_file() and not reset and frame_id != 1:
        payload = json.loads(state_path.read_text(encoding="utf-8"))
        tracker.load_state_dict(payload)
        if tracker.last_frame_id is not None and frame_id <= tracker.last_frame_id:
            tracker.reset()
    tracks = tracker.update(detections, frame_id=frame_id)
    save_tracker_state(state_path, tracker.state_dict())
    return [
        {
            "track_id": item.track_id,
            "bbox": [round(item.x, 3), round(item.y, 3), round(item.width, 3), round(item.height, 3)],
            "label": "bee",
            "class_id": 0,
            "confidence": round(item.confidence, 6),
        }
        for item in tracks
    ]


def run(
    argv: Sequence[str] | None = None,
    *,
    detector_factory: Callable[[Path], Any] = BeeDetector,
    image_loader: Callable[[Path], Any] = load_rgb_image,
    stdout: TextIO | None = None,
) -> int:
    stream = stdout or sys.stdout
    started = time.perf_counter()
    args = parser().parse_args(argv)
    if args.image_path is None or not str(args.image_path).strip():
        emit(failure("image path is empty", 0), stream)
        return EXIT_NOT_FOUND
    path = Path(args.image_path).expanduser()
    if not path.is_file():
        emit(failure("image file not found", 0), stream)
        return EXIT_NOT_FOUND
    try:
        image = image_loader(path)
        config_path = args.config or (runtime_root() / "runtime_config.json")
        detector = detector_factory(config_path)
        chroma_threshold = float(detector.config.get("auto_modality_chroma_threshold", 4.0))
        modality = args.modality if args.modality != "auto" else infer_modality(image, path, chroma_threshold)
        detections = detector.detect(image, modality)
        elapsed = max(0, int(round((time.perf_counter() - started) * 1000)))
        task = args.task if args.task != "auto" else infer_task(path)
        if task == "track":
            sequence_id, frame_id = tracking_identity(path, args.sequence_id, args.frame_id)
            state_dir = args.state_dir or (Path(tempfile.gettempdir()) / "bee_algorithm_tracking_state")
            tracks = track_detections(
                detections,
                modality,
                sequence_id,
                frame_id,
                detector,
                state_dir,
                args.reset,
            )
            elapsed = max(0, int(round((time.perf_counter() - started) * 1000)))
            emit(
                {
                    "code": 1,
                    "frame_id": frame_id,
                    "sequence_id": sequence_id,
                    "tracks": tracks,
                    "processing_time_ms": elapsed,
                },
                stream,
            )
        else:
            emit(
                {
                    "code": 1,
                    "image_id": path.stem,
                    "detections": detections,
                    "processing_time_ms": elapsed,
                },
                stream,
            )
        return EXIT_SUCCESS
    except CorruptImageError:
        elapsed = max(0, int(round((time.perf_counter() - started) * 1000)))
        emit(failure("image file is damaged or unsupported", elapsed), stream)
        return EXIT_CORRUPT_IMAGE
    except (ModelRuntimeError, OSError, ValueError, KeyError, json.JSONDecodeError) as exc:
        elapsed = max(0, int(round((time.perf_counter() - started) * 1000)))
        emit(failure(f"runtime error: {exc}", elapsed), stream)
        return EXIT_RUNTIME_ERROR
