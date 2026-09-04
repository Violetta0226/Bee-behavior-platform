"""ONNX Runtime detector with modality routing and calibrated boxes."""

from __future__ import annotations

import json
import os
import sys
from contextlib import contextmanager
from pathlib import Path
from typing import Any, Iterator

import numpy as np

from .postprocess import (
    box_vote,
    calibrate_xyxy,
    calibrate_scores_by_quality,
    decode_yolo_output,
    detections_to_json,
    filter_candidates,
    non_max_suppression,
    restore_original_coordinates,
    select_top_indices,
)


class CorruptImageError(ValueError):
    """Raised when the input exists but cannot be decoded as an image."""


class ModelRuntimeError(RuntimeError):
    """Raised when the bundled ONNX runtime cannot execute the model."""


@contextmanager
def suppress_native_stdout() -> Iterator[None]:
    """Prevent native dependencies from contaminating the JSON stdout contract."""
    try:
        stdout_fd = sys.stdout.fileno()
    except (AttributeError, OSError):
        yield
        return
    saved_fd = os.dup(stdout_fd)
    try:
        with open(os.devnull, "w", encoding="utf-8") as sink:
            os.dup2(sink.fileno(), stdout_fd)
            yield
    finally:
        os.dup2(saved_fd, stdout_fd)
        os.close(saved_fd)


def load_rgb_image(path: Path) -> Any:
    try:
        from PIL import Image, UnidentifiedImageError
    except ImportError as exc:
        raise ModelRuntimeError("bundled Pillow runtime is unavailable") from exc
    try:
        with Image.open(path) as source:
            source.load()
            return source.convert("RGB")
    except (UnidentifiedImageError, OSError, ValueError) as exc:
        raise CorruptImageError("image file is damaged or unsupported") from exc


def infer_modality(image: Any, path: Path, chroma_threshold: float) -> str:
    upper = str(path).upper().replace("\\", "/")
    if any(marker in upper for marker in ("/A-5-", "A-5-1", "A-5-2", "A-5-3", "A-5-4")):
        return "rgb"
    if any(marker in upper for marker in ("/B-5-", "B-5-1", "B-5-2", "B-5-3", "B-5-4")):
        return "infrared"
    sample = image.copy()
    sample.thumbnail((128, 128))
    pixels = np.asarray(sample, dtype=np.float32)
    chroma = np.max(pixels, axis=2) - np.min(pixels, axis=2)
    return "infrared" if float(np.mean(chroma)) < chroma_threshold else "rgb"


def letterbox(image: Any, size: int) -> tuple[np.ndarray, float, int, int, int, int]:
    from PIL import Image

    original_width, original_height = image.size
    ratio = min(size / float(original_width), size / float(original_height))
    resized_width = max(1, int(round(original_width * ratio)))
    resized_height = max(1, int(round(original_height * ratio)))
    resized = image.resize((resized_width, resized_height), Image.Resampling.BILINEAR)
    canvas = Image.new("RGB", (size, size), (114, 114, 114))
    pad_x = (size - resized_width) // 2
    pad_y = (size - resized_height) // 2
    canvas.paste(resized, (pad_x, pad_y))
    tensor = np.asarray(canvas, dtype=np.float32) / 255.0
    tensor = np.ascontiguousarray(np.transpose(tensor, (2, 0, 1))[None])
    return tensor, ratio, pad_x, pad_y, original_width, original_height


class BeeDetector:
    def __init__(self, config_path: Path, artifact_root: Path | None = None) -> None:
        self.config_path = config_path
        self.base_dir = config_path.parent
        self.artifact_root = artifact_root
        self.config = json.loads(config_path.read_text(encoding="utf-8"))
        self.sessions: dict[str, tuple[Any, str]] = {}
        self.calibrations: dict[str, dict[str, Any]] = {}
        self.quality_models: dict[str, dict[str, Any]] = {}

    def _artifact_path(self, modality: str, key: str) -> Path:
        configured = Path(self.config["models"][modality][key])
        if self.artifact_root is not None:
            return (self.artifact_root / modality / configured.name).resolve()
        return (self.base_dir / configured).resolve()

    def _session(self, modality: str) -> tuple[Any, str]:
        if modality in self.sessions:
            return self.sessions[modality]
        try:
            import onnxruntime as ort
        except ImportError as exc:
            raise ModelRuntimeError("bundled ONNX Runtime is unavailable") from exc

        require_cuda = bool(self.config.get("require_cuda", True))
        if require_cuda and hasattr(ort, "preload_dlls"):
            try:
                ort.preload_dlls(directory=str(self.base_dir))
            except Exception as exc:
                raise ModelRuntimeError(
                    "failed to preload bundled CUDA/cuDNN DLLs"
                ) from exc
        available = ort.get_available_providers()
        if require_cuda and "CUDAExecutionProvider" not in available:
            raise ModelRuntimeError(
                "CUDAExecutionProvider is unavailable; refusing silent CPU fallback"
            )
        providers: list[Any] = []
        if "CUDAExecutionProvider" in available:
            providers.append(
                (
                    "CUDAExecutionProvider",
                    {
                        "device_id": 0,
                        "gpu_mem_limit": 8 * 1024 * 1024 * 1024,
                        "cudnn_conv_algo_search": "HEURISTIC",
                        "do_copy_in_default_stream": 1,
                    },
                )
            )
        if "CPUExecutionProvider" in available:
            providers.append("CPUExecutionProvider")
        model_path = self._artifact_path(modality, "model")
        if not model_path.is_file():
            raise ModelRuntimeError(f"bundled model is missing: {model_path.name}")
        options = ort.SessionOptions()
        options.log_severity_level = 3
        options.intra_op_num_threads = int(self.config.get("intra_op_num_threads", 1))
        options.inter_op_num_threads = int(self.config.get("inter_op_num_threads", 1))
        try:
            with suppress_native_stdout():
                session = ort.InferenceSession(
                    str(model_path), sess_options=options, providers=providers
                )
        except Exception as exc:
            raise ModelRuntimeError(
                f"failed to initialize {modality} ONNX model"
            ) from exc
        if require_cuda and "CUDAExecutionProvider" not in session.get_providers():
            raise ModelRuntimeError(
                "ONNX session did not activate CUDAExecutionProvider"
            )
        value = (session, session.get_inputs()[0].name)
        self.sessions[modality] = value
        return value

    def _calibration(self, modality: str) -> dict[str, Any]:
        if modality not in self.calibrations:
            path = self._artifact_path(modality, "calibration")
            self.calibrations[modality] = json.loads(path.read_text(encoding="utf-8"))
        return self.calibrations[modality]

    def _quality_model(self, modality: str) -> dict[str, Any] | None:
        configured = self.config["models"][modality].get("quality_model")
        if configured is None:
            return None
        if modality not in self.quality_models:
            path = self._artifact_path(modality, "quality_model")
            self.quality_models[modality] = json.loads(path.read_text(encoding="utf-8"))
        return self.quality_models[modality]

    def detect(self, image: Any, modality: str) -> list[dict[str, Any]]:
        settings = self.config["models"][modality]
        image_size = int(settings["image_size"])
        tensor, ratio, pad_x, pad_y, width, height = letterbox(image, image_size)
        session, input_name = self._session(modality)
        try:
            with suppress_native_stdout():
                output = session.run(None, {input_name: tensor})[0]
        except Exception as exc:
            raise ModelRuntimeError(f"{modality} ONNX inference failed") from exc
        raw_boxes, raw_scores, classes, output_is_e2e = decode_yolo_output(
            output, image_size
        )
        raw_boxes, raw_scores = filter_candidates(
            raw_boxes,
            raw_scores,
            classes,
            float(settings["confidence_threshold"]),
        )
        source_indices = None
        if bool(settings.get("apply_nms", not output_is_e2e)):
            source_indices = non_max_suppression(
                raw_boxes,
                raw_scores,
                float(settings["iou_threshold"]),
                int(settings["max_detections"]),
            )
            voting = settings.get("box_voting")
            if voting and bool(voting.get("enabled", True)):
                boxes = box_vote(
                    raw_boxes,
                    raw_scores,
                    source_indices,
                    float(voting["vote_iou"]),
                    float(voting["score_ratio"]),
                    float(voting["power"]),
                    float(voting["alpha"]),
                )
            else:
                boxes = raw_boxes[source_indices]
            scores = raw_scores[source_indices]
        else:
            source_indices = select_top_indices(
                raw_scores, int(settings["max_detections"])
            )
            boxes, scores = raw_boxes[source_indices], raw_scores[source_indices]
        boxes = restore_original_coordinates(boxes, ratio, pad_x, pad_y, width, height)
        boxes = calibrate_xyxy(boxes, width, height, self._calibration(modality))
        quality_model = self._quality_model(modality)
        if quality_model is not None:
            scores = calibrate_scores_by_quality(
                raw_boxes,
                raw_scores,
                source_indices,
                boxes,
                scores,
                width,
                height,
                quality_model,
            )
        return detections_to_json(boxes, scores)
