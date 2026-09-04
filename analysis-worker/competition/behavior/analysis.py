"""Behavior metrics derived from MOT bounding-box trajectories.

The module intentionally uses only the Python standard library so the analysis
can run on an annotation workstation or in the final packaged application.
"""

from __future__ import annotations

import csv
import json
import math
import statistics
from collections import defaultdict
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any, Iterable, Sequence


@dataclass(frozen=True)
class Detection:
    frame: int
    track_id: int
    x: float
    y: float
    width: float
    height: float
    confidence: float = 1.0
    class_id: int = 0
    visibility: float = 1.0

    @property
    def center(self) -> tuple[float, float]:
        return self.x + self.width / 2.0, self.y + self.height / 2.0


@dataclass(frozen=True)
class Rectangle:
    x1: float
    y1: float
    x2: float
    y2: float

    def __post_init__(self) -> None:
        if not all(math.isfinite(value) for value in (self.x1, self.y1, self.x2, self.y2)):
            raise ValueError("ROI coordinates must be finite")
        if self.x2 <= self.x1 or self.y2 <= self.y1:
            raise ValueError("ROI must satisfy x2 > x1 and y2 > y1")

    def contains(self, point: tuple[float, float]) -> bool:
        x, y = point
        return self.x1 <= x <= self.x2 and self.y1 <= y <= self.y2


@dataclass(frozen=True)
class CountingGate:
    x1: float
    y1: float
    x2: float
    y2: float
    entry_side: int = -1

    def __post_init__(self) -> None:
        values = (self.x1, self.y1, self.x2, self.y2)
        if not all(math.isfinite(value) for value in values):
            raise ValueError("gate coordinates must be finite")
        if self.x1 == self.x2 and self.y1 == self.y2:
            raise ValueError("gate endpoints must differ")
        if self.entry_side not in {-1, 1}:
            raise ValueError("gate entry_side must be -1 or 1")

    def signed_distance(self, point: tuple[float, float]) -> float:
        dx = self.x2 - self.x1
        dy = self.y2 - self.y1
        return (dx * (point[1] - self.y1) - dy * (point[0] - self.x1)) / math.hypot(dx, dy)

    def crossing_on_segment(
        self, start: tuple[float, float], end: tuple[float, float]
    ) -> bool:
        first = self.signed_distance(start)
        second = self.signed_distance(end)
        denominator = first - second
        if abs(denominator) < 1e-12:
            return False
        ratio = first / denominator
        if not 0.0 <= ratio <= 1.0:
            return False
        crossing_x = start[0] + ratio * (end[0] - start[0])
        crossing_y = start[1] + ratio * (end[1] - start[1])
        dx = self.x2 - self.x1
        dy = self.y2 - self.y1
        projection = (
            (crossing_x - self.x1) * dx + (crossing_y - self.y1) * dy
        ) / (dx * dx + dy * dy)
        return 0.0 <= projection <= 1.0


@dataclass(frozen=True)
class BehaviorConfig:
    fps: float
    pixels_per_mm: float | None = None
    roi: Rectangle | None = None
    gate: CountingGate | None = None
    gate_deadband_px: float = 3.0
    grid_rows: int = 8
    grid_cols: int = 12
    stationary_threshold_px_s: float = 5.0
    interaction_distance_px: float = 50.0
    temporal_bin_seconds: float = 10.0
    temporal_warmup_bins: int = 1
    crossing_debounce_frames: int = 3
    crossing_cooldown_frames: int = 5
    max_gap_frames: int = 5

    def __post_init__(self) -> None:
        scalar_values = (
            self.fps,
            self.stationary_threshold_px_s,
            self.interaction_distance_px,
            self.temporal_bin_seconds,
            self.gate_deadband_px,
        )
        if not all(math.isfinite(value) for value in scalar_values):
            raise ValueError("numeric configuration values must be finite")
        if self.fps <= 0:
            raise ValueError("fps must be positive")
        if self.pixels_per_mm is not None:
            if not math.isfinite(self.pixels_per_mm) or self.pixels_per_mm <= 0:
                raise ValueError("pixels_per_mm must be finite and positive")
        if self.grid_rows <= 0 or self.grid_cols <= 0:
            raise ValueError("grid dimensions must be positive")
        if self.stationary_threshold_px_s < 0:
            raise ValueError("stationary threshold cannot be negative")
        if self.interaction_distance_px <= 0:
            raise ValueError("interaction distance must be positive")
        if self.temporal_bin_seconds <= 0:
            raise ValueError("temporal bin must be positive")
        if self.temporal_warmup_bins < 0:
            raise ValueError("temporal warmup bins cannot be negative")
        if self.gate_deadband_px < 0:
            raise ValueError("gate deadband cannot be negative")
        if self.crossing_debounce_frames <= 0:
            raise ValueError("crossing debounce must be positive")
        if self.crossing_cooldown_frames < 0:
            raise ValueError("crossing cooldown cannot be negative")
        if self.max_gap_frames <= 0:
            raise ValueError("max gap must be positive")


@dataclass
class AnalysisResult:
    summary: dict[str, Any]
    individuals: list[dict[str, Any]]
    flux_events: list[dict[str, Any]]
    density_cells: list[dict[str, Any]]
    interaction_edges: list[dict[str, Any]]
    temporal_summary: list[dict[str, Any]]


_HEADER_ALIASES = {
    "frame": ("frame", "frame_id"),
    "track_id": ("id", "track_id", "track"),
    "x": ("x", "left", "bbox_x"),
    "y": ("y", "top", "bbox_y"),
    "width": ("w", "width", "bbox_width"),
    "height": ("h", "height", "bbox_height"),
    "confidence": ("conf", "confidence", "score"),
    "class_id": ("cls", "class_id", "class"),
    "visibility": ("vis", "visibility"),
}


def _split_row(line: str) -> list[str]:
    row = next(csv.reader([line]))
    if len(row) == 1:
        row = line.split()
    return [part.strip() for part in row]


def _header_indices(row: Sequence[str]) -> dict[str, int] | None:
    normalized = [part.strip().lower() for part in row]
    if len(normalized) >= 2:
        try:
            int(float(normalized[0]))
            int(float(normalized[1]))
            return None
        except ValueError:
            pass
    result: dict[str, int] = {}
    for canonical, aliases in _HEADER_ALIASES.items():
        for alias in aliases:
            if alias in normalized:
                result[canonical] = normalized.index(alias)
                break
    required = {"frame", "track_id", "x", "y", "width", "height"}
    if not required.issubset(result):
        missing = sorted(required - set(result))
        raise ValueError(f"CSV header is missing required fields: {missing}")
    return result


def _field(row: Sequence[str], indices: dict[str, int], name: str, default: str) -> str:
    index = indices.get(name)
    if index is None or index >= len(row) or not row[index]:
        return default
    return row[index]


def parse_mot(path: Path | str) -> list[Detection]:
    """Parse headerless MOT rows or a CSV with named columns.

    Official rows are ``frame,id,x,y,w,h,conf,cls,vis``. Comment and blank
    lines are ignored. Duplicate frame/track pairs are rejected because they
    would otherwise inflate density and interaction statistics.
    """

    source = Path(path)
    lines = [
        line.strip()
        for line in source.read_text(encoding="utf-8-sig").splitlines()
        if line.strip() and not line.lstrip().startswith("#")
    ]
    if not lines:
        raise ValueError(f"no trajectory rows found in {source}")
    first = _split_row(lines[0])
    indices = _header_indices(first)
    data_lines = lines[1:] if indices is not None else lines
    if indices is None:
        indices = {
            "frame": 0,
            "track_id": 1,
            "x": 2,
            "y": 3,
            "width": 4,
            "height": 5,
            "confidence": 6,
            "class_id": 7,
            "visibility": 8,
        }

    detections: list[Detection] = []
    seen: set[tuple[int, int]] = set()
    for offset, line in enumerate(data_lines, start=2 if data_lines is not lines else 1):
        row = _split_row(line)
        try:
            item = Detection(
                frame=int(float(_field(row, indices, "frame", ""))),
                track_id=int(float(_field(row, indices, "track_id", ""))),
                x=float(_field(row, indices, "x", "")),
                y=float(_field(row, indices, "y", "")),
                width=float(_field(row, indices, "width", "")),
                height=float(_field(row, indices, "height", "")),
                confidence=float(_field(row, indices, "confidence", "1")),
                class_id=int(float(_field(row, indices, "class_id", "0"))),
                visibility=float(_field(row, indices, "visibility", "1")),
            )
        except (ValueError, IndexError) as exc:
            raise ValueError(f"{source}:{offset}: invalid trajectory row: {exc}") from exc
        if item.frame < 1 or item.track_id < 1:
            raise ValueError(f"{source}:{offset}: frame and track_id must be positive")
        if item.width <= 0 or item.height <= 0:
            raise ValueError(f"{source}:{offset}: bbox width and height must be positive")
        numeric_values = (
            item.x,
            item.y,
            item.width,
            item.height,
            item.confidence,
            item.visibility,
        )
        if not all(math.isfinite(value) for value in numeric_values):
            raise ValueError(f"{source}:{offset}: numeric fields must be finite")
        if item.class_id != 0:
            raise ValueError(f"{source}:{offset}: class_id must be 0 for bee")
        key = (item.frame, item.track_id)
        if key in seen:
            raise ValueError(f"{source}:{offset}: duplicate frame/track pair {key}")
        seen.add(key)
        detections.append(item)
    if not detections:
        raise ValueError(f"no trajectory rows found in {source}")
    return sorted(detections, key=lambda item: (item.frame, item.track_id))


def _distance(a: tuple[float, float], b: tuple[float, float]) -> float:
    return math.hypot(b[0] - a[0], b[1] - a[1])


def _angle_delta_degrees(previous: float, current: float) -> float:
    return math.degrees((current - previous + math.pi) % (2.0 * math.pi) - math.pi)


def _segment_inside_fraction(
    start: tuple[float, float], end: tuple[float, float], roi: Rectangle
) -> float:
    """Return the fraction of a line segment inside an axis-aligned ROI."""

    dx = end[0] - start[0]
    dy = end[1] - start[1]
    low, high = 0.0, 1.0
    for p, q in (
        (-dx, start[0] - roi.x1),
        (dx, roi.x2 - start[0]),
        (-dy, start[1] - roi.y1),
        (dy, roi.y2 - start[1]),
    ):
        if p == 0:
            if q < 0:
                return 0.0
            continue
        ratio = q / p
        if p < 0:
            low = max(low, ratio)
        else:
            high = min(high, ratio)
        if low > high:
            return 0.0
    return max(0.0, high - low)


def _individual_metrics(
    by_track: dict[int, list[Detection]],
    config: BehaviorConfig,
    scale: float,
    body_length_px: float,
) -> tuple[list[dict[str, Any]], list[dict[str, float | int]]]:
    rows: list[dict[str, Any]] = []
    speed_samples: list[dict[str, float | int]] = []
    for track_id, track in sorted(by_track.items()):
        path_px = 0.0
        stationary_seconds = 0.0
        roi_seconds = 0.0
        valid_seconds = 0.0
        speeds_px_s: list[float] = []
        signed_angular: list[float] = []
        absolute_angular: list[float] = []
        previous_heading: float | None = None
        previous_segment_gap: int | None = None
        for previous, current in zip(track, track[1:]):
            gap = current.frame - previous.frame
            if gap > config.max_gap_frames:
                previous_heading = None
                previous_segment_gap = None
                continue
            dt = gap / config.fps
            distance_px = _distance(previous.center, current.center)
            speed_px_s = distance_px / dt
            path_px += distance_px
            valid_seconds += dt
            speeds_px_s.append(speed_px_s)
            speed_samples.append(
                {
                    "frame": current.frame,
                    "track_id": track_id,
                    "speed": speed_px_s * scale,
                    "speed_body_lengths_s": speed_px_s / body_length_px,
                }
            )
            if speed_px_s <= config.stationary_threshold_px_s:
                stationary_seconds += dt
            if config.roi is not None:
                roi_seconds += dt * _segment_inside_fraction(
                    previous.center, current.center, config.roi
                )
            if distance_px > 1e-9:
                heading = math.atan2(
                    current.center[1] - previous.center[1],
                    current.center[0] - previous.center[0],
                )
                if previous_heading is not None and previous_segment_gap is not None:
                    heading_dt = (previous_segment_gap + gap) / (2.0 * config.fps)
                    angular = _angle_delta_degrees(previous_heading, heading) / heading_dt
                    signed_angular.append(angular)
                    absolute_angular.append(abs(angular))
                previous_heading = heading
                previous_segment_gap = gap
            else:
                previous_heading = None
                previous_segment_gap = None

        if not speeds_px_s:
            status = "too_short"
        elif not absolute_angular:
            status = "insufficient_turn_samples"
        else:
            status = "ok"
        span_seconds = (track[-1].frame - track[0].frame) / config.fps
        rows.append(
            {
                "track_id": track_id,
                "status": status,
                "observations": len(track),
                "start_frame": track[0].frame,
                "end_frame": track[-1].frame,
                "span_seconds": span_seconds,
                "valid_motion_seconds": valid_seconds,
                "path_length": path_px * scale,
                "path_length_body_lengths": path_px / body_length_px,
                "mean_speed": (
                    sum(speeds_px_s) / len(speeds_px_s) * scale if speeds_px_s else None
                ),
                "max_speed": max(speeds_px_s) * scale if speeds_px_s else None,
                "mean_speed_body_lengths_s": (
                    sum(speeds_px_s) / len(speeds_px_s) / body_length_px
                    if speeds_px_s
                    else None
                ),
                "max_speed_body_lengths_s": (
                    max(speeds_px_s) / body_length_px if speeds_px_s else None
                ),
                "mean_signed_angular_velocity_deg_s": (
                    sum(signed_angular) / len(signed_angular) if signed_angular else None
                ),
                "mean_absolute_angular_velocity_deg_s": (
                    sum(absolute_angular) / len(absolute_angular)
                    if absolute_angular
                    else None
                ),
                "max_absolute_angular_velocity_deg_s": (
                    max(absolute_angular) if absolute_angular else None
                ),
                "stationary_dwell_seconds": stationary_seconds,
                "roi_dwell_seconds": roi_seconds if config.roi is not None else None,
            }
        )
    return rows, speed_samples


def _roi_flux_events(
    by_track: dict[int, list[Detection]], config: BehaviorConfig
) -> list[dict[str, Any]]:
    if config.roi is None:
        return []
    events: list[dict[str, Any]] = []
    for track_id, track in sorted(by_track.items()):
        stable = config.roi.contains(track[0].center)
        pending: bool | None = None
        pending_count = 0
        pending_start = track[0].frame
        previous_frame = track[0].frame
        last_event_frame: int | None = None
        for item in track[1:]:
            inside = config.roi.contains(item.center)
            if item.frame - previous_frame > config.max_gap_frames:
                stable = inside
                pending = None
                pending_count = 0
                previous_frame = item.frame
                continue
            if inside == stable:
                pending = None
                pending_count = 0
            elif pending == inside:
                pending_count += 1
            else:
                pending = inside
                pending_count = 1
                pending_start = item.frame
            if pending_count >= config.crossing_debounce_frames:
                stable = inside
                outside_cooldown = (
                    last_event_frame is None
                    or item.frame - last_event_frame >= config.crossing_cooldown_frames
                )
                if outside_cooldown:
                    direction = "entry" if inside else "exit"
                    events.append(
                        {
                            "frame": item.frame,
                            "candidate_start_frame": pending_start,
                            "time_seconds": (item.frame - 1) / config.fps,
                            "track_id": track_id,
                            "direction": direction,
                        }
                    )
                    last_event_frame = item.frame
                pending = None
                pending_count = 0
            previous_frame = item.frame
    return sorted(events, key=lambda row: (row["frame"], row["track_id"]))


def _gate_flux_events(
    by_track: dict[int, list[Detection]], config: BehaviorConfig
) -> list[dict[str, Any]]:
    gate = config.gate
    if gate is None:
        return []
    events: list[dict[str, Any]] = []
    for track_id, track in sorted(by_track.items()):
        stable_side: int | None = None
        pending_side: int | None = None
        pending_count = 0
        pending_start = track[0].frame
        pending_crossing_valid = False
        previous = track[0]
        initial_distance = gate.signed_distance(previous.center)
        if abs(initial_distance) > config.gate_deadband_px:
            stable_side = 1 if initial_distance > 0 else -1
        last_event_frame: int | None = None
        for item in track[1:]:
            gap = item.frame - previous.frame
            distance = gate.signed_distance(item.center)
            side = 0 if abs(distance) <= config.gate_deadband_px else (1 if distance > 0 else -1)
            if gap > config.max_gap_frames:
                stable_side = side or None
                pending_side = None
                pending_count = 0
                previous = item
                continue
            if side == 0:
                previous = item
                continue
            if stable_side is None:
                stable_side = side
            elif side == stable_side:
                pending_side = None
                pending_count = 0
                pending_crossing_valid = False
            elif pending_side == side:
                pending_count += 1
            else:
                pending_side = side
                pending_count = 1
                pending_start = item.frame
                pending_crossing_valid = gate.crossing_on_segment(previous.center, item.center)
            if pending_count >= config.crossing_debounce_frames:
                stable_side = side
                cooldown_ok = (
                    last_event_frame is None
                    or item.frame - last_event_frame >= config.crossing_cooldown_frames
                )
                if pending_crossing_valid and cooldown_ok:
                    events.append(
                        {
                            "frame": item.frame,
                            "candidate_start_frame": pending_start,
                            "time_seconds": (item.frame - 1) / config.fps,
                            "track_id": track_id,
                            "direction": "entry" if side == gate.entry_side else "exit",
                            "gate_side": side,
                        }
                    )
                    last_event_frame = item.frame
                pending_side = None
                pending_count = 0
                pending_crossing_valid = False
            previous = item
    return sorted(events, key=lambda row: (row["frame"], row["track_id"]))


def _flux_events(
    by_track: dict[int, list[Detection]], config: BehaviorConfig
) -> list[dict[str, Any]]:
    return _gate_flux_events(by_track, config) if config.gate is not None else _roi_flux_events(by_track, config)


def _density_grid(
    detections: Sequence[Detection], config: BehaviorConfig
) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    centers = [item.center for item in detections]
    if config.roi is not None:
        domain = config.roi
    else:
        xs = [point[0] for point in centers]
        ys = [point[1] for point in centers]
        x1, x2 = min(xs), max(xs)
        y1, y2 = min(ys), max(ys)
        domain = Rectangle(x1, y1, x2 if x2 > x1 else x1 + 1.0, y2 if y2 > y1 else y1 + 1.0)
    counts: dict[tuple[int, int], int] = defaultdict(int)
    included = 0
    for point in centers:
        if not domain.contains(point):
            continue
        col = min(
            config.grid_cols - 1,
            int((point[0] - domain.x1) / (domain.x2 - domain.x1) * config.grid_cols),
        )
        row = min(
            config.grid_rows - 1,
            int((point[1] - domain.y1) / (domain.y2 - domain.y1) * config.grid_rows),
        )
        counts[(row, col)] += 1
        included += 1
    frame_count = max(item.frame for item in detections) - min(item.frame for item in detections) + 1
    cell_width = (domain.x2 - domain.x1) / config.grid_cols
    cell_height = (domain.y2 - domain.y1) / config.grid_rows
    cells: list[dict[str, Any]] = []
    for row in range(config.grid_rows):
        for col in range(config.grid_cols):
            count = counts[(row, col)]
            cells.append(
                {
                    "row": row,
                    "col": col,
                    "x1_px": domain.x1 + col * cell_width,
                    "y1_px": domain.y1 + row * cell_height,
                    "x2_px": domain.x1 + (col + 1) * cell_width,
                    "y2_px": domain.y1 + (row + 1) * cell_height,
                    "observation_count": count,
                    "mean_bees_per_frame": count / frame_count,
                    "observation_fraction": count / included if included else 0.0,
                }
            )
    probabilities = [cell["observation_fraction"] for cell in cells if cell["observation_fraction"] > 0]
    entropy = -sum(value * math.log(value) for value in probabilities)
    max_entropy = math.log(len(cells)) if len(cells) > 1 else 0.0
    top_count = max(1, math.ceil(len(cells) * 0.10))
    hotspot_concentration = (
        sum(sorted(counts.values(), reverse=True)[:top_count]) / included
        if included
        else 0.0
    )
    mean_count = included / len(cells)
    count_variance = (
        sum((cell["observation_count"] - mean_count) ** 2 for cell in cells) / len(cells)
    )
    return cells, {
        "domain_px": asdict(domain),
        "included_observations": included,
        "excluded_observations": len(detections) - included,
        "frame_count": frame_count,
        "normalized_spatial_entropy": entropy / max_entropy if max_entropy else 0.0,
        "top_10_percent_cell_concentration": hotspot_concentration,
        "cell_count_coefficient_of_variation": (
            math.sqrt(count_variance) / mean_count if mean_count else 0.0
        ),
    }


def _interaction_network(
    by_frame: dict[int, list[Detection]], config: BehaviorConfig, scale: float
) -> tuple[list[dict[str, Any]], dict[str, Any], list[dict[str, int]]]:
    threshold = config.interaction_distance_px
    edges: dict[tuple[int, int], dict[str, Any]] = {}
    pair_frames: list[dict[str, int]] = []
    for frame, items in sorted(by_frame.items()):
        buckets: dict[tuple[int, int], list[Detection]] = defaultdict(list)
        for item in items:
            x, y = item.center
            buckets[(math.floor(x / threshold), math.floor(y / threshold))].append(item)
        seen_pairs: set[tuple[int, int]] = set()
        for bucket, bucket_items in buckets.items():
            nearby: list[Detection] = []
            for dx in (-1, 0, 1):
                for dy in (-1, 0, 1):
                    nearby.extend(buckets.get((bucket[0] + dx, bucket[1] + dy), []))
            for first in bucket_items:
                for second in nearby:
                    if second.track_id <= first.track_id:
                        continue
                    pair = (first.track_id, second.track_id)
                    if pair in seen_pairs:
                        continue
                    seen_pairs.add(pair)
                    distance_px = _distance(first.center, second.center)
                    if distance_px > threshold:
                        continue
                    state = edges.setdefault(
                        pair,
                        {
                            "track_id_a": pair[0],
                            "track_id_b": pair[1],
                            "interaction_frames": 0,
                            "episode_count": 0,
                            "distance_sum_px": 0.0,
                            "min_distance_px": distance_px,
                            "last_frame": None,
                        },
                    )
                    if state["last_frame"] is None or frame - state["last_frame"] > config.max_gap_frames:
                        state["episode_count"] += 1
                    state["interaction_frames"] += 1
                    state["distance_sum_px"] += distance_px
                    state["min_distance_px"] = min(state["min_distance_px"], distance_px)
                    state["last_frame"] = frame
                    pair_frames.append({"frame": frame, "pair_count": 1})

    rows: list[dict[str, Any]] = []
    node_degree: dict[int, int] = defaultdict(int)
    node_weight: dict[int, int] = defaultdict(int)
    for pair, state in sorted(edges.items()):
        frames = state["interaction_frames"]
        node_degree[pair[0]] += 1
        node_degree[pair[1]] += 1
        node_weight[pair[0]] += frames
        node_weight[pair[1]] += frames
        rows.append(
            {
                "track_id_a": pair[0],
                "track_id_b": pair[1],
                "interaction_frames": frames,
                "interaction_seconds": frames / config.fps,
                "episode_count": state["episode_count"],
                "mean_distance": state["distance_sum_px"] / frames * scale,
                "min_distance": state["min_distance_px"] * scale,
            }
        )
    node_rows = [
        {
            "track_id": track_id,
            "degree": node_degree[track_id],
            "weighted_interaction_frames": node_weight[track_id],
        }
        for track_id in sorted(node_degree)
    ]
    return rows, {"nodes": node_rows, "edge_count": len(rows)}, pair_frames


def _temporal_bins(
    detections: Sequence[Detection],
    speed_samples: Sequence[dict[str, float | int]],
    events: Sequence[dict[str, Any]],
    pair_frames: Sequence[dict[str, int]],
    config: BehaviorConfig,
) -> list[dict[str, Any]]:
    first_frame = min(item.frame for item in detections)
    last_frame = max(item.frame for item in detections)
    bin_frames = max(1, round(config.temporal_bin_seconds * config.fps))
    frame_tracks: dict[int, set[int]] = defaultdict(set)
    for item in detections:
        frame_tracks[item.frame].add(item.track_id)
    speeds_by_bin: dict[int, list[float]] = defaultdict(list)
    normalized_speeds_by_bin: dict[int, list[float]] = defaultdict(list)
    for sample in speed_samples:
        index = (int(sample["frame"]) - first_frame) // bin_frames
        speeds_by_bin[index].append(float(sample["speed"]))
        normalized_speeds_by_bin[index].append(float(sample["speed_body_lengths_s"]))
    events_by_bin: dict[int, list[str]] = defaultdict(list)
    for event in events:
        index = (int(event["frame"]) - first_frame) // bin_frames
        events_by_bin[index].append(str(event["direction"]))
    interactions_by_bin: dict[int, int] = defaultdict(int)
    for sample in pair_frames:
        index = (sample["frame"] - first_frame) // bin_frames
        interactions_by_bin[index] += sample["pair_count"]

    result: list[dict[str, Any]] = []
    bin_count = (last_frame - first_frame) // bin_frames + 1
    for index in range(bin_count):
        start = first_frame + index * bin_frames
        end = min(last_frame, start + bin_frames - 1)
        frame_count = end - start + 1
        detection_count = sum(len(frame_tracks[frame]) for frame in range(start, end + 1))
        unique_tracks = set().union(*(frame_tracks[frame] for frame in range(start, end + 1)))
        speeds = speeds_by_bin[index]
        normalized_speeds = normalized_speeds_by_bin[index]
        directions = events_by_bin[index]
        result.append(
            {
                "bin_index": index,
                "start_frame": start,
                "end_frame": end,
                "start_time_seconds": (start - first_frame) / config.fps,
                "end_time_seconds": (end - first_frame + 1) / config.fps,
                "detection_count": detection_count,
                "unique_track_count": len(unique_tracks),
                "mean_active_tracks_per_frame": detection_count / frame_count,
                "mean_speed": sum(speeds) / len(speeds) if speeds else None,
                "mean_speed_body_lengths_s": (
                    sum(normalized_speeds) / len(normalized_speeds)
                    if normalized_speeds
                    else None
                ),
                "entry_count": directions.count("entry"),
                "exit_count": directions.count("exit"),
                "interaction_pair_frames": interactions_by_bin[index],
                "warmup": index < config.temporal_warmup_bins,
            }
        )
    def add_robust_z(source: str, destination: str) -> None:
        values = [
            float(row[source])
            for row in result
            if row[source] is not None and not row["warmup"]
        ]
        if not values:
            for row in result:
                row[destination] = None
            return
        center = statistics.median(values)
        mad = statistics.median(abs(value - center) for value in values)
        for row in result:
            value = row[source]
            row[destination] = (
                None
                if row["warmup"]
                else 0.0
                if value is not None and mad <= 1e-12
                else (0.6745 * (float(value) - center) / mad if value is not None else None)
            )

    for source, destination in (
        ("mean_active_tracks_per_frame", "activity_robust_z"),
        ("mean_speed_body_lengths_s", "speed_body_lengths_robust_z"),
        ("interaction_pair_frames", "interaction_robust_z"),
    ):
        add_robust_z(source, destination)
    if config.gate is not None or config.roi is not None:
        for row in result:
            row["flux_event_count"] = row["entry_count"] + row["exit_count"]
        add_robust_z("flux_event_count", "flux_robust_z")
    else:
        for row in result:
            row["flux_event_count"] = None
            row["flux_robust_z"] = None
    return result


def analyze_behavior(
    detections: Iterable[Detection],
    config: BehaviorConfig,
    *,
    sequence_id: str = "sequence",
    source: str | None = None,
) -> AnalysisResult:
    records = sorted(detections, key=lambda item: (item.frame, item.track_id))
    if not records:
        raise ValueError("at least one detection is required")
    for item in records:
        if item.frame < 1 or item.track_id < 1:
            raise ValueError("frame and track_id must be positive")
        if item.width <= 0 or item.height <= 0:
            raise ValueError("bbox width and height must be positive")
        values = (
            item.x,
            item.y,
            item.width,
            item.height,
            item.confidence,
            item.visibility,
        )
        if not all(math.isfinite(value) for value in values):
            raise ValueError("detection numeric fields must be finite")
        if item.class_id != 0:
            raise ValueError("class_id must be 0 for bee")
    keys = [(item.frame, item.track_id) for item in records]
    if len(keys) != len(set(keys)):
        raise ValueError("duplicate frame/track pairs are not allowed")
    by_track: dict[int, list[Detection]] = defaultdict(list)
    by_frame: dict[int, list[Detection]] = defaultdict(list)
    for item in records:
        by_track[item.track_id].append(item)
        by_frame[item.frame].append(item)

    scale = 1.0 / config.pixels_per_mm if config.pixels_per_mm else 1.0
    distance_unit = "mm" if config.pixels_per_mm else "px"
    body_length_px = statistics.median(max(item.width, item.height) for item in records)
    individuals, speed_samples = _individual_metrics(
        by_track, config, scale, body_length_px
    )
    flux_events = _flux_events(by_track, config)
    density_cells, density_metadata = _density_grid(records, config)
    interaction_edges, interaction_metadata, pair_frames = _interaction_network(
        by_frame, config, scale
    )
    temporal_summary = _temporal_bins(
        records, speed_samples, flux_events, pair_frames, config
    )
    first_frame = records[0].frame
    last_frame = records[-1].frame
    duration_seconds = (last_frame - first_frame + 1) / config.fps
    entries = sum(event["direction"] == "entry" for event in flux_events)
    exits = sum(event["direction"] == "exit" for event in flux_events)
    duration_minutes = duration_seconds / 60.0
    flux_available = config.gate is not None or config.roi is not None
    config_payload = asdict(config)
    config_payload["roi"] = asdict(config.roi) if config.roi is not None else None
    config_payload["gate"] = asdict(config.gate) if config.gate is not None else None
    summary = {
        "schema_version": "1.0",
        "source": source,
        "sequence_id": sequence_id,
        "units": {
            "coordinates": "px",
            "distance": distance_unit,
            "speed": f"{distance_unit}/s",
            "angular_velocity": "deg/s",
            "time": "s",
            "calibrated": config.pixels_per_mm is not None,
            "body_normalized_distance": "body_length",
            "body_normalized_speed": "body_length/s",
            "median_body_length_px": body_length_px,
        },
        "config": config_payload,
        "sequence": {
            "first_frame": first_frame,
            "last_frame": last_frame,
            "frame_span": last_frame - first_frame + 1,
            "duration_seconds": duration_seconds,
            "detection_count": len(records),
            "track_count": len(by_track),
            "too_short_track_count": sum(row["status"] == "too_short" for row in individuals),
        },
        "individuals": individuals,
        "group": {
            "flux": {
                "status": (
                    "ok"
                    if config.gate is not None or config.roi is not None
                    else "unavailable_without_gate_or_roi"
                ),
                "entry_count": entries if flux_available else None,
                "exit_count": exits if flux_available else None,
                "net_entry_count": entries - exits if flux_available else None,
                "entries_per_minute": (
                    entries / duration_minutes if flux_available and duration_minutes else None
                ),
                "exits_per_minute": (
                    exits / duration_minutes if flux_available and duration_minutes else None
                ),
                "method": (
                    "directed_gate"
                    if config.gate is not None
                    else ("roi_boundary" if config.roi is not None else None)
                ),
                "events": flux_events,
            },
            "density": {"metadata": density_metadata, "cells": density_cells},
            "interaction_network": {
                **interaction_metadata,
                "edges": interaction_edges,
            },
            "temporal_summary": temporal_summary,
        },
    }
    return AnalysisResult(
        summary=summary,
        individuals=individuals,
        flux_events=flux_events,
        density_cells=density_cells,
        interaction_edges=interaction_edges,
        temporal_summary=temporal_summary,
    )


def _write_csv(path: Path, rows: Sequence[dict[str, Any]], fieldnames: Sequence[str]) -> None:
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(rows)


def write_outputs(result: AnalysisResult, output_dir: Path | str) -> dict[str, str]:
    output = Path(output_dir)
    output.mkdir(parents=True, exist_ok=True)
    paths = {
        "summary_json": output / "behavior_summary.json",
        "individual_csv": output / "individual_behavior.csv",
        "flux_csv": output / "flux_events.csv",
        "density_csv": output / "density_grid.csv",
        "interaction_csv": output / "interaction_edges.csv",
        "temporal_csv": output / "temporal_summary.csv",
    }
    paths["summary_json"].write_text(
        json.dumps(result.summary, ensure_ascii=False, indent=2, allow_nan=False) + "\n",
        encoding="utf-8",
    )
    _write_csv(
        paths["individual_csv"],
        result.individuals,
        (
            "track_id",
            "status",
            "observations",
            "start_frame",
            "end_frame",
            "span_seconds",
            "valid_motion_seconds",
            "path_length",
            "path_length_body_lengths",
            "mean_speed",
            "max_speed",
            "mean_speed_body_lengths_s",
            "max_speed_body_lengths_s",
            "mean_signed_angular_velocity_deg_s",
            "mean_absolute_angular_velocity_deg_s",
            "max_absolute_angular_velocity_deg_s",
            "stationary_dwell_seconds",
            "roi_dwell_seconds",
        ),
    )
    _write_csv(
        paths["flux_csv"],
        result.flux_events,
        (
            "frame",
            "candidate_start_frame",
            "time_seconds",
            "track_id",
            "direction",
            "gate_side",
        ),
    )
    _write_csv(
        paths["density_csv"],
        result.density_cells,
        (
            "row",
            "col",
            "x1_px",
            "y1_px",
            "x2_px",
            "y2_px",
            "observation_count",
            "mean_bees_per_frame",
            "observation_fraction",
        ),
    )
    _write_csv(
        paths["interaction_csv"],
        result.interaction_edges,
        (
            "track_id_a",
            "track_id_b",
            "interaction_frames",
            "interaction_seconds",
            "episode_count",
            "mean_distance",
            "min_distance",
        ),
    )
    _write_csv(
        paths["temporal_csv"],
        result.temporal_summary,
        (
            "bin_index",
            "start_frame",
            "end_frame",
            "start_time_seconds",
            "end_time_seconds",
            "detection_count",
            "unique_track_count",
            "mean_active_tracks_per_frame",
            "mean_speed",
            "mean_speed_body_lengths_s",
            "entry_count",
            "exit_count",
            "interaction_pair_frames",
            "warmup",
            "flux_event_count",
            "activity_robust_z",
            "speed_body_lengths_robust_z",
            "interaction_robust_z",
            "flux_robust_z",
        ),
    )
    return {name: str(path) for name, path in paths.items()}
