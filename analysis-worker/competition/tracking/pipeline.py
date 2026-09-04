#!/usr/bin/env python3
"""Run the final ONNX detector and bee tracker over one MOT image sequence."""

from __future__ import annotations

import argparse
import json
import statistics
import sys
import time
from collections import Counter
from pathlib import Path
from typing import Any, Iterable

from .core import BeeTracker, TrackResult, TrackerConfig, assignment_backend
from .mot import MOTWriter


PACKAGE_ROOT = Path(__file__).resolve().parents[1]
RUNTIME_ROOT = PACKAGE_ROOT / "runtime"
if str(RUNTIME_ROOT) not in sys.path:
    sys.path.insert(0, str(RUNTIME_ROOT))


PRESETS: dict[str, dict[str, Any]] = {
    "rgb": {
        "high_confidence": 0.30,
        "low_confidence": 0.05,
        "new_track_confidence": 0.40,
        "max_lost": 3,
        "max_center_distance": 2.50,
        "second_max_center_distance": 1.75,
    },
    "infrared": {
        "high_confidence": 0.35,
        "low_confidence": 0.08,
        "new_track_confidence": 0.45,
        "max_lost": 2,
        "max_center_distance": 1.80,
        "second_max_center_distance": 1.35,
    },
}


def frame_id_from_path(path: Path, fallback: int) -> int:
    try:
        value = int(path.stem)
    except ValueError:
        return fallback
    return value if value >= 1 else fallback


def continuity_statistics(
    tracks: Iterable[TrackResult],
    *,
    frame_count: int,
    detection_count: int,
    elapsed_seconds: float,
) -> dict[str, Any]:
    rows = list(tracks)
    lengths = Counter(item.track_id for item in rows)
    values = sorted(lengths.values())
    singleton_count = sum(value == 1 for value in values)
    return {
        "frame_count": frame_count,
        "detection_count": detection_count,
        "mot_row_count": len(rows),
        "unique_track_count": len(values),
        "mean_detections_per_frame": detection_count / frame_count if frame_count else 0.0,
        "mean_tracks_per_frame": len(rows) / frame_count if frame_count else 0.0,
        "mean_track_observations": statistics.fmean(values) if values else 0.0,
        "median_track_observations": statistics.median(values) if values else 0.0,
        "max_track_observations": max(values, default=0),
        "single_observation_track_count": singleton_count,
        "single_observation_track_fraction": singleton_count / len(values) if values else 0.0,
        "elapsed_seconds": elapsed_seconds,
        "wall_ms_per_frame": elapsed_seconds * 1000.0 / frame_count if frame_count else 0.0,
    }


def run_sequence(
    sequence_dir: Path,
    output_dir: Path,
    runtime_config: Path,
    deploy_dir: Path,
    modality: str,
    tracker_config: TrackerConfig,
    limit: int | None = None,
    allow_cpu: bool = False,
) -> dict[str, Any]:
    from bee_runtime.detector import BeeDetector, load_rgb_image

    image_dir = sequence_dir / "img1"
    images = sorted(
        path for path in image_dir.iterdir() if path.suffix.lower() in {".jpg", ".jpeg", ".png"}
    )
    if limit is not None:
        images = images[:limit]
    if not images:
        raise ValueError(f"no images found in {image_dir}")
    output_dir.mkdir(parents=True, exist_ok=True)
    detections_path = output_dir / "detections.jsonl"
    mot_path = output_dir / "tracks.txt"
    detector = BeeDetector(runtime_config, artifact_root=deploy_dir)
    if allow_cpu:
        detector.config["require_cuda"] = False
    tracker = BeeTracker(tracker_config)
    all_tracks: list[TrackResult] = []
    detection_count = 0
    started = time.perf_counter()
    with detections_path.open("w", encoding="utf-8") as detection_stream, MOTWriter(mot_path) as writer:
        for fallback, image_path in enumerate(images, start=1):
            frame_id = frame_id_from_path(image_path, fallback)
            image = load_rgb_image(image_path)
            detections = detector.detect(image, modality)
            detection_count += len(detections)
            detection_stream.write(
                json.dumps(
                    {"frame_id": frame_id, "image": image_path.name, "detections": detections},
                    ensure_ascii=False,
                    separators=(",", ":"),
                )
                + "\n"
            )
            tracks = tracker.update(detections, frame_id=frame_id)
            writer.write(tracks)
            all_tracks.extend(tracks)
    elapsed = time.perf_counter() - started
    report = {
        "schema_version": 1,
        "sequence": sequence_dir.name,
        "modality": modality,
        "runtime_config": str(runtime_config.resolve()),
        "deploy_dir": str(deploy_dir.resolve()),
        "tracker_config": {
            name: getattr(tracker_config, name)
            for name in tracker_config.__dataclass_fields__
        },
        "assignment_backend": assignment_backend(),
        "offline_cpu_fallback": allow_cpu,
        "outputs": {
            "detections_jsonl": str(detections_path.resolve()),
            "mot": str(mot_path.resolve()),
        },
        "statistics": continuity_statistics(
            all_tracks,
            frame_count=len(images),
            detection_count=detection_count,
            elapsed_seconds=elapsed,
        ),
        "metric_status": "unavailable_without_human_mot_ground_truth",
    }
    (output_dir / "report.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    return report


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--sequence-dir", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--runtime-config", type=Path, required=True)
    parser.add_argument("--deploy-dir", type=Path, required=True)
    parser.add_argument("--modality", choices=("rgb", "infrared"), required=True)
    parser.add_argument("--limit", type=int)
    parser.add_argument("--high-confidence", type=float)
    parser.add_argument("--low-confidence", type=float)
    parser.add_argument("--new-track-confidence", type=float)
    parser.add_argument("--max-lost", type=int)
    parser.add_argument("--emit-predictions", action="store_true")
    parser.add_argument(
        "--allow-cpu",
        action="store_true",
        help="offline prelabeling only; production runtime still requires CUDA",
    )
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    values = dict(PRESETS[args.modality])
    for name in ("high_confidence", "low_confidence", "new_track_confidence", "max_lost"):
        value = getattr(args, name)
        if value is not None:
            values[name] = value
    values["emit_predictions"] = args.emit_predictions
    config = TrackerConfig(**values)
    try:
        report = run_sequence(
            args.sequence_dir,
            args.output_dir,
            args.runtime_config,
            args.deploy_dir,
            args.modality,
            config,
            args.limit,
            args.allow_cpu,
        )
    except (OSError, ValueError, RuntimeError) as exc:
        print(json.dumps({"ok": False, "error": str(exc)}, ensure_ascii=False), file=sys.stderr)
        return 2
    print(json.dumps({"ok": True, **report["statistics"]}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
