"""Small-object tracker combining ByteTrack and OC-SORT ideas.

The tracker deliberately depends only on the Python standard library. Detection
can be performed by any ONNX/Ultralytics frontend and passed in after NMS.
"""

from __future__ import annotations

from dataclasses import dataclass
import math
from typing import Iterable, Mapping, Sequence


BBox = tuple[float, float, float, float]


def _require_finite(name: str, value: float) -> float:
    value = float(value)
    if not math.isfinite(value):
        raise ValueError(f"{name} must be finite")
    return value


@dataclass(frozen=True, slots=True)
class Detection:
    """A post-NMS detection in pixel ``(x, y, width, height)`` format."""

    x: float
    y: float
    width: float
    height: float
    confidence: float
    class_id: int = 0

    def __post_init__(self) -> None:
        for name in ("x", "y", "width", "height", "confidence"):
            object.__setattr__(self, name, _require_finite(name, getattr(self, name)))
        if self.width <= 0 or self.height <= 0:
            raise ValueError("detection width and height must be positive")
        if not 0.0 <= self.confidence <= 1.0:
            raise ValueError("detection confidence must be in [0, 1]")
        if self.class_id < 0:
            raise ValueError("class_id must be non-negative")

    @property
    def bbox(self) -> BBox:
        return self.x, self.y, self.width, self.height

    @classmethod
    def from_xyxy(
        cls,
        x1: float,
        y1: float,
        x2: float,
        y2: float,
        confidence: float,
        class_id: int = 0,
    ) -> "Detection":
        return cls(x1, y1, float(x2) - float(x1), float(y2) - float(y1), confidence, class_id)


@dataclass(frozen=True, slots=True)
class TrackResult:
    """One public track observation in pixel ``xywh`` format."""

    frame_id: int
    track_id: int
    x: float
    y: float
    width: float
    height: float
    confidence: float
    class_id: int = 0
    visibility: float = 1.0
    predicted: bool = False

    @property
    def bbox(self) -> BBox:
        return self.x, self.y, self.width, self.height


@dataclass(frozen=True, slots=True)
class TrackerConfig:
    """Parameters shared by RGB and infrared tracking.

    ``max_lost`` counts fully missing frames. A track last observed at frame 1
    can therefore be recovered at frame ``max_lost + 2``.
    """

    high_confidence: float = 0.45
    low_confidence: float = 0.10
    new_track_confidence: float = 0.45
    max_lost: int = 12
    min_iou: float = 0.02
    second_min_iou: float = 0.01
    max_center_distance: float = 2.50
    second_max_center_distance: float = 1.75
    min_size_similarity: float = 0.20
    min_match_score: float = 0.18
    second_min_match_score: float = 0.20
    velocity_momentum: float = 0.50
    emit_predictions: bool = False
    max_prediction_age: int = 2
    prediction_confidence_decay: float = 0.70
    first_track_id: int = 1

    def __post_init__(self) -> None:
        if not 0.0 <= self.low_confidence <= self.high_confidence <= 1.0:
            raise ValueError("confidence thresholds must satisfy 0 <= low <= high <= 1")
        if not self.high_confidence <= self.new_track_confidence <= 1.0:
            raise ValueError("new_track_confidence must be at least high_confidence")
        if self.max_lost < 0 or self.max_prediction_age < 0:
            raise ValueError("lost and prediction ages must be non-negative")
        for name in ("min_iou", "second_min_iou", "min_size_similarity"):
            if not 0.0 <= getattr(self, name) <= 1.0:
                raise ValueError(f"{name} must be in [0, 1]")
        for name in ("min_match_score", "second_min_match_score"):
            if not 0.0 <= getattr(self, name) <= 1.0:
                raise ValueError(f"{name} must be in [0, 1]")
        if self.max_center_distance <= 0 or self.second_max_center_distance <= 0:
            raise ValueError("center-distance gates must be positive")
        if not 0.0 <= self.velocity_momentum < 1.0:
            raise ValueError("velocity_momentum must be in [0, 1)")
        if not 0.0 <= self.prediction_confidence_decay <= 1.0:
            raise ValueError("prediction_confidence_decay must be in [0, 1]")
        if self.first_track_id < 1:
            raise ValueError("first_track_id must be positive")


@dataclass(slots=True)
class _Track:
    track_id: int
    bbox: BBox
    confidence: float
    class_id: int
    last_observation_frame: int
    velocity_x: float = 0.0
    velocity_y: float = 0.0
    hits: int = 1
    missed: int = 0

    def predicted_bbox(self, frame_id: int) -> BBox:
        elapsed = frame_id - self.last_observation_frame
        x, y, width, height = self.bbox
        return (
            x + self.velocity_x * elapsed,
            y + self.velocity_y * elapsed,
            width,
            height,
        )

    def update(self, detection: Detection, frame_id: int, momentum: float) -> None:
        old_center = _center(self.bbox)
        new_center = _center(detection.bbox)
        elapsed = max(1, frame_id - self.last_observation_frame)
        observed_vx = (new_center[0] - old_center[0]) / elapsed
        observed_vy = (new_center[1] - old_center[1]) / elapsed
        if self.hits == 1:
            self.velocity_x = observed_vx
            self.velocity_y = observed_vy
        else:
            self.velocity_x = momentum * self.velocity_x + (1.0 - momentum) * observed_vx
            self.velocity_y = momentum * self.velocity_y + (1.0 - momentum) * observed_vy
        self.bbox = detection.bbox
        self.confidence = detection.confidence
        self.last_observation_frame = frame_id
        self.hits += 1
        self.missed = 0


class BeeTracker:
    """Online multi-object tracker for one video sequence at a time.

    Association is performed in two passes. High-confidence detections first
    establish trajectories; lower-confidence detections can then recover an
    unmatched trajectory but never create a new ID. Observation-derived motion
    predicts the next center, while scale-normalized center distance stabilizes
    association when small boxes have near-zero IoU after a few-pixel shift.
    """

    def __init__(self, config: TrackerConfig | None = None) -> None:
        self.config = config or TrackerConfig()
        self.reset()

    @property
    def last_frame_id(self) -> int | None:
        return self._last_frame_id

    def reset(self) -> None:
        """Clear sequence state and restart IDs at ``first_track_id``."""

        self._tracks: list[_Track] = []
        self._next_track_id = self.config.first_track_id
        self._last_frame_id: int | None = None

    def update(
        self,
        detections: Iterable[Detection | Mapping[str, object]],
        frame_id: int | None = None,
    ) -> list[TrackResult]:
        """Process one frame and return visible (or configured predicted) tracks."""

        frame_id = self._resolve_frame_id(frame_id)
        candidates = [self._coerce_detection(item) for item in detections]
        candidates = [item for item in candidates if item.confidence >= self.config.low_confidence]

        # A track may match after max_lost missing frames; older state is removed.
        self._tracks = [
            track
            for track in self._tracks
            if frame_id - track.last_observation_frame <= self.config.max_lost + 1
        ]
        updated_ids: set[int] = set()

        high = [item for item in candidates if item.confidence >= self.config.high_confidence]
        low = [item for item in candidates if item.confidence < self.config.high_confidence]

        first_matches, unmatched_track_indices, unmatched_high = self._associate(
            self._tracks,
            high,
            frame_id,
            min_iou=self.config.min_iou,
            max_center_distance=self.config.max_center_distance,
            min_score=self.config.min_match_score,
        )
        for track_index, detection_index in first_matches:
            track = self._tracks[track_index]
            track.update(high[detection_index], frame_id, self.config.velocity_momentum)
            updated_ids.add(track.track_id)

        second_tracks = [self._tracks[index] for index in unmatched_track_indices]
        second_matches, still_unmatched_local, _ = self._associate(
            second_tracks,
            low,
            frame_id,
            min_iou=self.config.second_min_iou,
            max_center_distance=self.config.second_max_center_distance,
            min_score=self.config.second_min_match_score,
        )
        for local_track_index, detection_index in second_matches:
            track = second_tracks[local_track_index]
            track.update(low[detection_index], frame_id, self.config.velocity_momentum)
            updated_ids.add(track.track_id)

        for local_track_index in still_unmatched_local:
            track = second_tracks[local_track_index]
            track.missed = frame_id - track.last_observation_frame

        for detection_index in unmatched_high:
            detection = high[detection_index]
            if detection.confidence < self.config.new_track_confidence:
                continue
            track = _Track(
                track_id=self._next_track_id,
                bbox=detection.bbox,
                confidence=detection.confidence,
                class_id=detection.class_id,
                last_observation_frame=frame_id,
            )
            self._next_track_id += 1
            self._tracks.append(track)
            updated_ids.add(track.track_id)

        self._tracks = [track for track in self._tracks if track.missed <= self.config.max_lost]
        self._last_frame_id = frame_id
        return self._build_results(frame_id, updated_ids)

    def active_track_ids(self, include_lost: bool = False) -> tuple[int, ...]:
        """Return current IDs, optionally including internally retained lost tracks."""

        return tuple(
            track.track_id
            for track in self._tracks
            if include_lost or track.missed == 0
        )

    def state_dict(self) -> dict[str, object]:
        """Return JSON-serializable state for frame-by-frame CLI processes."""
        return {
            "schema_version": 1,
            "last_frame_id": self._last_frame_id,
            "next_track_id": self._next_track_id,
            "tracks": [
                {
                    "track_id": track.track_id,
                    "bbox": list(track.bbox),
                    "confidence": track.confidence,
                    "class_id": track.class_id,
                    "last_observation_frame": track.last_observation_frame,
                    "velocity_x": track.velocity_x,
                    "velocity_y": track.velocity_y,
                    "hits": track.hits,
                    "missed": track.missed,
                }
                for track in self._tracks
            ],
        }

    def load_state_dict(self, payload: Mapping[str, object]) -> None:
        """Restore validated state written by :meth:`state_dict`."""
        if payload.get("schema_version") != 1:
            raise ValueError("unsupported tracker state schema")
        last_frame = payload.get("last_frame_id")
        if last_frame is not None and (
            not isinstance(last_frame, int) or isinstance(last_frame, bool) or last_frame < 1
        ):
            raise ValueError("invalid tracker last_frame_id")
        next_track_id = payload.get("next_track_id")
        if not isinstance(next_track_id, int) or isinstance(next_track_id, bool) or next_track_id < 1:
            raise ValueError("invalid tracker next_track_id")
        raw_tracks = payload.get("tracks")
        if not isinstance(raw_tracks, list):
            raise ValueError("tracker state tracks must be a list")
        restored: list[_Track] = []
        seen_ids: set[int] = set()
        for item in raw_tracks:
            if not isinstance(item, Mapping):
                raise ValueError("invalid tracker state track")
            bbox = item.get("bbox")
            if not isinstance(bbox, Sequence) or isinstance(bbox, (str, bytes)) or len(bbox) != 4:
                raise ValueError("invalid tracker state bbox")
            track = _Track(
                track_id=int(item["track_id"]),
                bbox=tuple(_require_finite("bbox", value) for value in bbox),
                confidence=_require_finite("confidence", item["confidence"]),
                class_id=int(item["class_id"]),
                last_observation_frame=int(item["last_observation_frame"]),
                velocity_x=_require_finite("velocity_x", item["velocity_x"]),
                velocity_y=_require_finite("velocity_y", item["velocity_y"]),
                hits=int(item["hits"]),
                missed=int(item["missed"]),
            )
            if track.track_id < 1 or track.track_id in seen_ids:
                raise ValueError("invalid or duplicate tracker state id")
            if track.bbox[2] <= 0 or track.bbox[3] <= 0:
                raise ValueError("tracker state bbox width and height must be positive")
            if not 0 <= track.confidence <= 1 or track.class_id != 0:
                raise ValueError("invalid tracker state confidence or class")
            if track.last_observation_frame < 1 or track.hits < 1 or track.missed < 0:
                raise ValueError("invalid tracker state counters")
            seen_ids.add(track.track_id)
            restored.append(track)
        if seen_ids and next_track_id <= max(seen_ids):
            raise ValueError("tracker next_track_id must exceed active ids")
        self._tracks = restored
        self._next_track_id = next_track_id
        self._last_frame_id = last_frame

    def _resolve_frame_id(self, frame_id: int | None) -> int:
        if frame_id is None:
            return 1 if self._last_frame_id is None else self._last_frame_id + 1
        if not isinstance(frame_id, int) or isinstance(frame_id, bool) or frame_id < 1:
            raise ValueError("frame_id must be a positive integer")
        if self._last_frame_id is not None and frame_id <= self._last_frame_id:
            raise ValueError("frame_id must increase within a sequence; call reset() for a new sequence")
        return frame_id

    @staticmethod
    def _coerce_detection(item: Detection | Mapping[str, object]) -> Detection:
        if isinstance(item, Detection):
            return item
        if not isinstance(item, Mapping):
            raise TypeError("detections must be Detection objects or mappings")
        bbox = item.get("bbox")
        if not isinstance(bbox, Sequence) or isinstance(bbox, (str, bytes)) or len(bbox) != 4:
            raise ValueError("mapping detection bbox must contain four xywh values")
        confidence = item.get("confidence", item.get("score"))
        if confidence is None:
            raise ValueError("mapping detection requires confidence or score")
        class_id = int(item.get("class_id", 0))
        return Detection(*bbox, confidence=float(confidence), class_id=class_id)

    def _associate(
        self,
        tracks: Sequence[_Track],
        detections: Sequence[Detection],
        frame_id: int,
        *,
        min_iou: float,
        max_center_distance: float,
        min_score: float,
    ) -> tuple[list[tuple[int, int]], list[int], list[int]]:
        if not tracks or not detections:
            return [], list(range(len(tracks))), list(range(len(detections)))

        fast_matches = _lapx_numpy_assignment(
            tracks,
            detections,
            frame_id,
            min_iou=min_iou,
            max_center_distance=max_center_distance,
            min_size_similarity=self.config.min_size_similarity,
            min_score=min_score,
        )
        if fast_matches is not None:
            matched_tracks = {track_index for track_index, _ in fast_matches}
            matched_detections = {detection_index for _, detection_index in fast_matches}
            return (
                fast_matches,
                [index for index in range(len(tracks)) if index not in matched_tracks],
                [index for index in range(len(detections)) if index not in matched_detections],
            )

        scores: list[list[float | None]] = []
        for track in tracks:
            row: list[float | None] = []
            predicted = track.predicted_bbox(frame_id)
            for detection in detections:
                row.append(
                    _association_score(
                        track,
                        predicted,
                        detection,
                        min_iou=min_iou,
                        max_center_distance=max_center_distance,
                        min_size_similarity=self.config.min_size_similarity,
                        min_score=min_score,
                    )
                )
            scores.append(row)

        matches = _maximum_weight_assignment(scores)
        matched_tracks = {track_index for track_index, _ in matches}
        matched_detections = {detection_index for _, detection_index in matches}
        return (
            matches,
            [index for index in range(len(tracks)) if index not in matched_tracks],
            [index for index in range(len(detections)) if index not in matched_detections],
        )

    def _build_results(self, frame_id: int, updated_ids: set[int]) -> list[TrackResult]:
        results: list[TrackResult] = []
        for track in self._tracks:
            predicted = track.track_id not in updated_ids
            if predicted:
                if not self.config.emit_predictions or track.missed > self.config.max_prediction_age:
                    continue
                bbox = track.predicted_bbox(frame_id)
                confidence = track.confidence * (
                    self.config.prediction_confidence_decay ** track.missed
                )
            else:
                bbox = track.bbox
                confidence = track.confidence
            results.append(
                TrackResult(
                    frame_id=frame_id,
                    track_id=track.track_id,
                    x=bbox[0],
                    y=bbox[1],
                    width=bbox[2],
                    height=bbox[3],
                    confidence=confidence,
                    class_id=track.class_id,
                    predicted=predicted,
                )
            )
        return sorted(results, key=lambda item: item.track_id)


def detections_from_xyxy_rows(
    rows: Iterable[Sequence[float]],
    *,
    confidence_index: int = 4,
    class_index: int | None = 5,
) -> list[Detection]:
    """Convert common post-NMS ``x1,y1,x2,y2,score,class`` rows.

    NumPy arrays work without importing NumPy because only the sequence
    protocol is used. Set ``class_index=None`` for single-class five-column
    outputs.
    """

    detections: list[Detection] = []
    required_index = max(3, confidence_index, class_index if class_index is not None else 0)
    for row in rows:
        if len(row) <= required_index:
            raise ValueError("xyxy row does not contain the configured fields")
        class_id = 0 if class_index is None else int(row[class_index])
        detections.append(
            Detection.from_xyxy(
                row[0], row[1], row[2], row[3], row[confidence_index], class_id
            )
        )
    return detections


def _center(bbox: BBox) -> tuple[float, float]:
    x, y, width, height = bbox
    return x + width / 2.0, y + height / 2.0


def _iou(first: BBox, second: BBox) -> float:
    ax, ay, aw, ah = first
    bx, by, bw, bh = second
    left = max(ax, bx)
    top = max(ay, by)
    right = min(ax + aw, bx + bw)
    bottom = min(ay + ah, by + bh)
    intersection = max(0.0, right - left) * max(0.0, bottom - top)
    union = aw * ah + bw * bh - intersection
    return intersection / union if union > 0.0 else 0.0


def _association_score(
    track: _Track,
    predicted_bbox: BBox,
    detection: Detection,
    *,
    min_iou: float,
    max_center_distance: float,
    min_size_similarity: float,
    min_score: float,
) -> float | None:
    if track.class_id != detection.class_id:
        return None

    overlap = _iou(predicted_bbox, detection.bbox)
    track_center = _center(predicted_bbox)
    detection_center = _center(detection.bbox)
    distance = math.hypot(
        detection_center[0] - track_center[0],
        detection_center[1] - track_center[1],
    )
    scale = max(
        1.0,
        math.sqrt((predicted_bbox[2] * predicted_bbox[3] + detection.width * detection.height) / 2.0),
    )
    normalized_distance = distance / scale
    width_similarity = min(predicted_bbox[2], detection.width) / max(
        predicted_bbox[2], detection.width
    )
    height_similarity = min(predicted_bbox[3], detection.height) / max(
        predicted_bbox[3], detection.height
    )
    size_similarity = width_similarity * height_similarity

    if size_similarity < min_size_similarity:
        return None
    if overlap < min_iou and normalized_distance > max_center_distance:
        return None

    proximity = math.exp(-0.5 * normalized_distance * normalized_distance)
    direction = _direction_score(track, detection)
    score = 0.35 * overlap + 0.45 * proximity + 0.15 * size_similarity + 0.05 * direction
    return score if score >= min_score else None


def _direction_score(track: _Track, detection: Detection) -> float:
    speed = math.hypot(track.velocity_x, track.velocity_y)
    if speed < 1e-9:
        return 0.5
    old_center = _center(track.bbox)
    new_center = _center(detection.bbox)
    dx = new_center[0] - old_center[0]
    dy = new_center[1] - old_center[1]
    displacement = math.hypot(dx, dy)
    if displacement < 1e-9:
        return 0.5
    cosine = (dx * track.velocity_x + dy * track.velocity_y) / (displacement * speed)
    return (max(-1.0, min(1.0, cosine)) + 1.0) / 2.0


def _lapx_numpy_assignment(
    tracks: Sequence[_Track],
    detections: Sequence[Detection],
    frame_id: int,
    *,
    min_iou: float,
    max_center_distance: float,
    min_size_similarity: float,
    min_score: float,
) -> list[tuple[int, int]] | None:
    """Vectorized association used when the production LAPX stack is present."""
    try:
        import lap
        import numpy as np
    except ImportError:
        return None

    predicted = np.asarray([track.predicted_bbox(frame_id) for track in tracks], dtype=np.float64)
    observed = np.asarray([detection.bbox for detection in detections], dtype=np.float64)
    track_x1 = predicted[:, 0, None]
    track_y1 = predicted[:, 1, None]
    track_x2 = (predicted[:, 0] + predicted[:, 2])[:, None]
    track_y2 = (predicted[:, 1] + predicted[:, 3])[:, None]
    detection_x1 = observed[None, :, 0]
    detection_y1 = observed[None, :, 1]
    detection_x2 = (observed[:, 0] + observed[:, 2])[None, :]
    detection_y2 = (observed[:, 1] + observed[:, 3])[None, :]
    intersection = np.maximum(0.0, np.minimum(track_x2, detection_x2) - np.maximum(track_x1, detection_x1))
    intersection *= np.maximum(0.0, np.minimum(track_y2, detection_y2) - np.maximum(track_y1, detection_y1))
    track_area = (predicted[:, 2] * predicted[:, 3])[:, None]
    detection_area = (observed[:, 2] * observed[:, 3])[None, :]
    union = track_area + detection_area - intersection
    overlap = np.divide(intersection, union, out=np.zeros_like(intersection), where=union > 0)

    track_center_x = (predicted[:, 0] + predicted[:, 2] / 2.0)[:, None]
    track_center_y = (predicted[:, 1] + predicted[:, 3] / 2.0)[:, None]
    detection_center_x = (observed[:, 0] + observed[:, 2] / 2.0)[None, :]
    detection_center_y = (observed[:, 1] + observed[:, 3] / 2.0)[None, :]
    dx_predicted = detection_center_x - track_center_x
    dy_predicted = detection_center_y - track_center_y
    distance = np.hypot(dx_predicted, dy_predicted)
    scale = np.maximum(1.0, np.sqrt((track_area + detection_area) / 2.0))
    normalized_distance = distance / scale

    width_similarity = np.minimum(predicted[:, 2, None], observed[None, :, 2]) / np.maximum(
        predicted[:, 2, None], observed[None, :, 2]
    )
    height_similarity = np.minimum(predicted[:, 3, None], observed[None, :, 3]) / np.maximum(
        predicted[:, 3, None], observed[None, :, 3]
    )
    size_similarity = width_similarity * height_similarity

    actual = np.asarray([track.bbox for track in tracks], dtype=np.float64)
    actual_center_x = (actual[:, 0] + actual[:, 2] / 2.0)[:, None]
    actual_center_y = (actual[:, 1] + actual[:, 3] / 2.0)[:, None]
    dx_actual = detection_center_x - actual_center_x
    dy_actual = detection_center_y - actual_center_y
    displacement = np.hypot(dx_actual, dy_actual)
    velocity_x = np.asarray([track.velocity_x for track in tracks], dtype=np.float64)[:, None]
    velocity_y = np.asarray([track.velocity_y for track in tracks], dtype=np.float64)[:, None]
    speed = np.hypot(velocity_x, velocity_y)
    direction = np.full_like(overlap, 0.5)
    directional = (speed > 1e-9) & (displacement > 1e-9)
    cosine = np.divide(
        dx_actual * velocity_x + dy_actual * velocity_y,
        displacement * speed,
        out=np.zeros_like(overlap),
        where=directional,
    )
    direction[directional] = (np.clip(cosine[directional], -1.0, 1.0) + 1.0) / 2.0

    track_classes = np.asarray([track.class_id for track in tracks])[:, None]
    detection_classes = np.asarray([item.class_id for item in detections])[None, :]
    scores = 0.35 * overlap + 0.45 * np.exp(-0.5 * normalized_distance**2)
    scores += 0.15 * size_similarity + 0.05 * direction
    valid = track_classes == detection_classes
    valid &= size_similarity >= min_size_similarity
    valid &= (overlap >= min_iou) | (normalized_distance <= max_center_distance)
    valid &= scores >= min_score

    forbidden = 1_000_000.0
    real_costs = np.where(valid, -scores, forbidden)
    dummy_costs = np.zeros((len(tracks), len(tracks)), dtype=np.float64)
    costs = np.ascontiguousarray(np.concatenate((real_costs, dummy_costs), axis=1))
    row_to_column, _ = lap.lapjv(costs, extend_cost=True, return_cost=False)
    matches = [
        (row, int(column))
        for row, column in enumerate(row_to_column)
        if 0 <= column < len(detections) and valid[row, column]
    ]
    return sorted(matches)


def _maximum_weight_assignment(
    scores: Sequence[Sequence[float | None]],
) -> list[tuple[int, int]]:
    """Return an optimal optional bipartite assignment.

    Production uses the compiled LAPJV implementation from ``lapx``. The pure
    Python Hungarian solver remains a deterministic dependency-free fallback
    for annotation workstations and unit tests.
    """

    row_count = len(scores)
    if row_count == 0:
        return []
    column_count = len(scores[0])
    if column_count == 0:
        return []
    if any(len(row) != column_count for row in scores):
        raise ValueError("assignment score matrix must be rectangular")

    # One zero-weight dummy column per track permits every track to remain
    # unmatched. Real allowed edges have negative cost and are therefore chosen.
    forbidden = 1_000_000.0
    costs = [
        [forbidden if score is None else -score for score in row] + [0.0] * row_count
        for row in scores
    ]
    assignment = _solve_rows_to_columns(costs)
    return sorted(
        (row, column)
        for row, column in enumerate(assignment)
        if column < column_count and scores[row][column] is not None
    )


def assignment_backend() -> str:
    try:
        import lap  # noqa: F401
        import numpy  # noqa: F401
    except ImportError:
        return "python_hungarian"
    return "lapx_lapjv"


def _solve_rows_to_columns(costs: Sequence[Sequence[float]]) -> list[int]:
    try:
        import lap
        import numpy as np
    except ImportError:
        return _hungarian_rows_to_columns(costs)
    matrix = np.ascontiguousarray(costs, dtype=np.float64)
    row_to_column, _ = lap.lapjv(matrix, extend_cost=True, return_cost=False)
    return [int(value) for value in row_to_column]


def _hungarian_rows_to_columns(costs: Sequence[Sequence[float]]) -> list[int]:
    """Minimum-cost assignment for a rectangular matrix with rows <= columns."""

    row_count = len(costs)
    column_count = len(costs[0])
    if row_count > column_count:
        raise ValueError("Hungarian implementation requires rows <= columns")

    potentials_rows = [0.0] * (row_count + 1)
    potentials_columns = [0.0] * (column_count + 1)
    column_match = [0] * (column_count + 1)
    previous_column = [0] * (column_count + 1)

    for row in range(1, row_count + 1):
        column_match[0] = row
        current_column = 0
        minimum = [math.inf] * (column_count + 1)
        used = [False] * (column_count + 1)
        while True:
            used[current_column] = True
            current_row = column_match[current_column]
            delta = math.inf
            next_column = 0
            for column in range(1, column_count + 1):
                if used[column]:
                    continue
                reduced_cost = (
                    costs[current_row - 1][column - 1]
                    - potentials_rows[current_row]
                    - potentials_columns[column]
                )
                if reduced_cost < minimum[column]:
                    minimum[column] = reduced_cost
                    previous_column[column] = current_column
                if minimum[column] < delta:
                    delta = minimum[column]
                    next_column = column
            for column in range(column_count + 1):
                if used[column]:
                    potentials_rows[column_match[column]] += delta
                    potentials_columns[column] -= delta
                else:
                    minimum[column] -= delta
            current_column = next_column
            if column_match[current_column] == 0:
                break
        while True:
            previous = previous_column[current_column]
            column_match[current_column] = column_match[previous]
            current_column = previous
            if current_column == 0:
                break

    assignment = [-1] * row_count
    for column in range(1, column_count + 1):
        if column_match[column] != 0:
            assignment[column_match[column] - 1] = column - 1
    return assignment
