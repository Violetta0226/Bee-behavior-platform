"""Pure NumPy preprocessing and YOLO26 detection postprocessing."""

from __future__ import annotations

import math
from typing import Any, Iterable

import numpy as np


def decode_yolo_output(
    output: np.ndarray, image_size: int
) -> tuple[np.ndarray, np.ndarray, np.ndarray, bool]:
    """Decode either E2E Nx6 rows or dense (4+C)xN YOLO output.

    Returns ``xyxy``, confidence, class id and whether the output was E2E.
    Coordinates remain in letterboxed model-input space.
    """
    values = np.asarray(output)
    if values.ndim == 3 and values.shape[0] == 1:
        values = values[0]

    is_e2e = values.ndim == 2 and values.shape[1] == 6
    if is_e2e:
        boxes = values[:, :4].astype(np.float32, copy=True)
        scores = values[:, 4].astype(np.float32, copy=False)
        classes = np.rint(values[:, 5]).astype(np.int64, copy=False)
    else:
        if values.ndim != 2:
            raise ValueError(f"unsupported YOLO output shape: {values.shape}")
        if values.shape[0] > values.shape[1] and values.shape[1] >= 5:
            values = values.T
        if values.shape[0] < 5:
            raise ValueError(f"dense YOLO output has too few channels: {values.shape}")

        rows = values.T
        centers = rows[:, :4].astype(np.float32, copy=False)
        class_scores = rows[:, 4:].astype(np.float32, copy=False)
        if class_scores.shape[1] == 1:
            classes = np.zeros(len(rows), dtype=np.int64)
            scores = class_scores[:, 0]
        else:
            classes = np.argmax(class_scores, axis=1).astype(np.int64)
            scores = class_scores[np.arange(len(rows)), classes]
        boxes = np.empty_like(centers)
        boxes[:, 0] = centers[:, 0] - centers[:, 2] / 2.0
        boxes[:, 1] = centers[:, 1] - centers[:, 3] / 2.0
        boxes[:, 2] = centers[:, 0] + centers[:, 2] / 2.0
        boxes[:, 3] = centers[:, 1] + centers[:, 3] / 2.0

    if boxes.size and float(np.nanmax(np.abs(boxes))) <= 2.0:
        boxes *= float(image_size)
    return boxes, scores, classes, is_e2e


def filter_candidates(
    boxes: np.ndarray,
    scores: np.ndarray,
    classes: np.ndarray,
    confidence_threshold: float,
) -> tuple[np.ndarray, np.ndarray]:
    finite = np.isfinite(boxes).all(axis=1) & np.isfinite(scores)
    selected = finite & (classes == 0) & (scores >= confidence_threshold)
    return boxes[selected], scores[selected]


def box_iou_one_to_many(box: np.ndarray, boxes: np.ndarray) -> np.ndarray:
    x1 = np.maximum(box[0], boxes[:, 0])
    y1 = np.maximum(box[1], boxes[:, 1])
    x2 = np.minimum(box[2], boxes[:, 2])
    y2 = np.minimum(box[3], boxes[:, 3])
    intersection = np.maximum(0.0, x2 - x1) * np.maximum(0.0, y2 - y1)
    area_a = max(0.0, float(box[2] - box[0])) * max(0.0, float(box[3] - box[1]))
    area_b = np.maximum(0.0, boxes[:, 2] - boxes[:, 0]) * np.maximum(
        0.0, boxes[:, 3] - boxes[:, 1]
    )
    union = area_a + area_b - intersection
    return np.divide(
        intersection, union, out=np.zeros_like(intersection), where=union > 0
    )


def non_max_suppression(
    boxes: np.ndarray,
    scores: np.ndarray,
    iou_threshold: float,
    max_detections: int,
) -> np.ndarray:
    if not len(boxes):
        return np.empty(0, dtype=np.int64)
    order = np.argsort(-scores, kind="stable")
    keep: list[int] = []
    while order.size and len(keep) < max_detections:
        current = int(order[0])
        keep.append(current)
        if order.size == 1:
            break
        remaining = order[1:]
        overlaps = box_iou_one_to_many(boxes[current], boxes[remaining])
        order = remaining[overlaps < iou_threshold]
    return np.asarray(keep, dtype=np.int64)


def box_vote(
    boxes: np.ndarray,
    scores: np.ndarray,
    keep: np.ndarray,
    vote_iou: float,
    score_ratio: float,
    power: float,
    alpha: float,
) -> np.ndarray:
    """Refine retained coordinates using confidence-weighted nearby candidates."""
    output = boxes[keep].astype(np.float32, copy=True)
    if alpha <= 0.0 or not len(output):
        return output
    for output_index, source_index in enumerate(keep):
        overlaps = box_iou_one_to_many(boxes[source_index], boxes)
        selected = (overlaps >= vote_iou) & (
            scores >= scores[source_index] * score_ratio
        )
        if np.count_nonzero(selected) <= 1:
            continue
        weights = np.power(np.maximum(scores[selected], 1e-8), power)
        voted = np.average(boxes[selected], axis=0, weights=weights)
        output[output_index] = (1.0 - alpha) * output[output_index] + alpha * voted
    return output


def restore_original_coordinates(
    boxes: np.ndarray,
    ratio: float,
    pad_x: int,
    pad_y: int,
    image_width: int,
    image_height: int,
) -> np.ndarray:
    output = np.asarray(boxes, dtype=np.float32).copy()
    if not len(output):
        return output
    output[:, [0, 2]] = (output[:, [0, 2]] - float(pad_x)) / ratio
    output[:, [1, 3]] = (output[:, [1, 3]] - float(pad_y)) / ratio
    output[:, [0, 2]] = np.clip(output[:, [0, 2]], 0.0, float(image_width))
    output[:, [1, 3]] = np.clip(output[:, [1, 3]], 0.0, float(image_height))
    return output


def calibrate_xyxy(
    boxes: np.ndarray,
    image_width: int,
    image_height: int,
    calibration: dict[str, Any],
) -> np.ndarray:
    values = np.asarray(boxes, dtype=np.float32)
    if not len(values):
        return values.copy()
    output = values.copy()
    widths = np.maximum(values[:, 2] - values[:, 0], 1e-6)
    heights = np.maximum(values[:, 3] - values[:, 1], 1e-6)
    sizes = np.sqrt(widths * heights)
    centers_x = (values[:, 0] + values[:, 2]) / 2.0
    centers_y = (values[:, 1] + values[:, 3]) / 2.0
    strength = float(calibration["strength"])
    assigned = np.zeros(len(values), dtype=bool)
    for item in calibration["bins"]:
        upper = item.get("upper_size")
        selected = ~assigned if upper is None else ((sizes <= float(upper)) & ~assigned)
        if not np.any(selected):
            continue
        center_x = centers_x[selected] + strength * float(item["dx"]) * widths[selected]
        center_y = (
            centers_y[selected] + strength * float(item["dy"]) * heights[selected]
        )
        width = widths[selected] * np.exp(strength * float(item["log_width"]))
        height = heights[selected] * np.exp(strength * float(item["log_height"]))
        output[selected, 0] = np.maximum(0.0, center_x - width / 2.0)
        output[selected, 1] = np.maximum(0.0, center_y - height / 2.0)
        output[selected, 2] = np.minimum(float(image_width), center_x + width / 2.0)
        output[selected, 3] = np.minimum(float(image_height), center_y + height / 2.0)
        assigned[selected] = True
    if not np.all(assigned):
        raise ValueError("calibration bins do not cover every box")
    return output


def quality_features(
    raw_boxes: np.ndarray,
    raw_scores: np.ndarray,
    source_indices: np.ndarray,
    boxes: np.ndarray,
    scores: np.ndarray,
    image_width: int,
    image_height: int,
) -> np.ndarray:
    """Build the fixed geometric/consensus features used by score calibration."""
    rows = []
    image_area = max(float(image_width * image_height), 1.0)
    for source_index, box, score in zip(source_indices, boxes, scores):
        box_width = max(float(box[2] - box[0]), 1e-6)
        box_height = max(float(box[3] - box[1]), 1e-6)
        center_x = float(box[0] + box[2]) / 2.0
        center_y = float(box[1] + box[3]) / 2.0
        overlaps = box_iou_one_to_many(raw_boxes[source_index], raw_boxes)
        selected = (overlaps >= 0.5) & (raw_scores >= max(float(score) * 0.05, 0.001))
        selected_overlaps = overlaps[selected]
        selected_scores = raw_scores[selected]
        rows.append(
            [
                math.log(max(float(score), 1e-6) / max(1.0 - float(score), 1e-6)),
                math.log(max(box_width * box_height / image_area, 1e-9)),
                math.log(box_width / box_height),
                center_x / image_width,
                center_y / image_height,
                box_width / image_width,
                box_height / image_height,
                math.log1p(int(np.count_nonzero(selected))),
                float(np.average(selected_overlaps, weights=selected_scores))
                if len(selected_overlaps)
                else 0.0,
                float(np.std(selected_overlaps)) if len(selected_overlaps) else 0.0,
            ]
        )
    values = np.asarray(rows, dtype=np.float64)
    if not len(values):
        return np.empty((0, 19), dtype=np.float64)
    return np.concatenate((values, values[:, 1:] ** 2), axis=1)


def e2e_quality_features(
    boxes: np.ndarray,
    scores: np.ndarray,
    image_width: int,
    image_height: int,
) -> np.ndarray:
    """Build quality features for outputs that already contain fused detections."""
    rows = []
    image_area = max(float(image_width * image_height), 1.0)
    for box, score in zip(boxes, scores):
        box_width = max(float(box[2] - box[0]), 1e-6)
        box_height = max(float(box[3] - box[1]), 1e-6)
        rows.append(
            [
                math.log(max(float(score), 1e-6) / max(1.0 - float(score), 1e-6)),
                math.log(max(box_width * box_height / image_area, 1e-9)),
                math.log(box_width / box_height),
                float(box[0] + box[2]) / (2.0 * image_width),
                float(box[1] + box[3]) / (2.0 * image_height),
                box_width / image_width,
                box_height / image_height,
                math.log(2.0),
                1.0,
                0.0,
            ]
        )
    values = np.asarray(rows, dtype=np.float64)
    if not len(values):
        return np.empty((0, 19), dtype=np.float64)
    return np.concatenate((values, values[:, 1:] ** 2), axis=1)


def calibrate_scores_by_quality(
    raw_boxes: np.ndarray,
    raw_scores: np.ndarray,
    source_indices: np.ndarray,
    boxes: np.ndarray,
    scores: np.ndarray,
    image_width: int,
    image_height: int,
    config: dict[str, Any],
) -> np.ndarray:
    """Re-rank detections with a train-only fitted linear IoU-quality model."""
    if not len(scores):
        return scores.copy()
    if bool(config.get("use_consensus", True)):
        features = quality_features(
            raw_boxes,
            raw_scores,
            source_indices,
            boxes,
            scores,
            image_width,
            image_height,
        )
    else:
        features = e2e_quality_features(boxes, scores, image_width, image_height)
    model = config["model"]
    mean = np.asarray(model["mean"], dtype=np.float64)
    scale = np.asarray(model["scale"], dtype=np.float64)
    coefficients = np.asarray(model["coefficients"], dtype=np.float64)
    if features.shape[1] != len(mean) or len(scale) != len(mean):
        raise ValueError("quality feature dimensions do not match model")
    normalized = (features - mean) / scale
    design = np.concatenate((np.ones((len(features), 1)), normalized), axis=1)
    if design.shape[1] != len(coefficients):
        raise ValueError("quality coefficients do not match feature dimensions")
    quality = np.clip(design @ coefficients, 0.03, 1.0)
    gamma = float(config["gamma"])
    return np.asarray(scores, dtype=np.float64) * np.power(quality, gamma)


def detections_to_json(boxes: np.ndarray, scores: np.ndarray) -> list[dict[str, Any]]:
    detections: list[dict[str, Any]] = []
    for box, score in zip(boxes, scores):
        x1, y1, x2, y2 = (round(float(value), 3) for value in box)
        width = round(max(0.0, x2 - x1), 3)
        height = round(max(0.0, y2 - y1), 3)
        if width <= 0.0 or height <= 0.0:
            continue
        detections.append(
            {
                "bbox": [x1, y1, width, height],
                "label": "bee",
                "class_id": 0,
                "confidence": round(float(score), 6),
            }
        )
    return detections


def select_top(
    boxes: np.ndarray, scores: np.ndarray, max_detections: int
) -> tuple[np.ndarray, np.ndarray]:
    indices = select_top_indices(scores, max_detections)
    return boxes[indices], scores[indices]


def select_top_indices(scores: np.ndarray, max_detections: int) -> np.ndarray:
    if len(scores) <= max_detections:
        order: Iterable[int] = np.argsort(-scores, kind="stable")
    else:
        candidates = np.argpartition(-scores, max_detections - 1)[:max_detections]
        order = candidates[np.argsort(-scores[candidates], kind="stable")]
    return np.asarray(list(order), dtype=np.int64)
