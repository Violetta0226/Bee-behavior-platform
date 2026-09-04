"""Safe conversion between MOT rows and CVAT rectangle tracks."""

from __future__ import annotations

import math
from collections import defaultdict
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable, Iterator


@dataclass(frozen=True)
class MOTRow:
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
    def xyxy(self) -> list[float]:
        return [self.x, self.y, self.x + self.width, self.y + self.height]


def read_mot_rows(path: str | Path) -> list[MOTRow]:
    rows: list[MOTRow] = []
    seen: set[tuple[int, int]] = set()
    with Path(path).open("r", encoding="utf-8-sig") as stream:
        for line_number, raw in enumerate(stream, start=1):
            line = raw.strip()
            if not line or line.startswith("#"):
                continue
            fields = [value.strip() for value in line.split(",")]
            if len(fields) not in {6, 7, 8, 9}:
                raise ValueError(f"line {line_number} must have 6-9 MOT fields")
            values = [float(value) for value in fields]
            row = MOTRow(
                frame=int(values[0]),
                track_id=int(values[1]),
                x=values[2],
                y=values[3],
                width=values[4],
                height=values[5],
                confidence=values[6] if len(values) >= 7 else 1.0,
                class_id=int(values[7]) if len(values) >= 8 else 0,
                visibility=values[8] if len(values) >= 9 else 1.0,
            )
            numeric = (
                row.x,
                row.y,
                row.width,
                row.height,
                row.confidence,
                row.visibility,
            )
            if row.frame < 1 or row.track_id < 1:
                raise ValueError(f"line {line_number} frame and id must be positive")
            if (
                row.width <= 0
                or row.height <= 0
                or not all(map(math.isfinite, numeric))
            ):
                raise ValueError(f"line {line_number} contains invalid geometry")
            if row.class_id != 0:
                raise ValueError(f"line {line_number} class_id must be 0")
            key = (row.frame, row.track_id)
            if key in seen:
                raise ValueError(f"line {line_number} duplicates frame/id {key}")
            seen.add(key)
            rows.append(row)
    return sorted(rows, key=lambda item: (item.frame, item.track_id))


def _shape(frame: int, points: list[float], *, outside: bool) -> dict[str, Any]:
    return {
        "type": "rectangle",
        "frame": frame,
        "outside": outside,
        "occluded": False,
        "keyframe": True,
        "z_order": 0,
        "points": [round(value, 3) for value in points],
        "rotation": 0.0,
        "attributes": [],
    }


def mot_rows_to_cvat_tracks(
    rows: Iterable[MOTRow],
    *,
    label_id: int,
    task_size: int,
    frame_stride: int = 1,
    start_frame: int = 0,
) -> list[dict[str, Any]]:
    """Map 1-based sampled MOT frames to 0-based CVAT video frames.

    Consecutive sampled observations are keyframes that CVAT interpolates. A
    missing sampled observation inserts an ``outside`` keyframe so an occlusion
    is not silently converted into a visible box.
    """

    if label_id < 1 or task_size < 1 or frame_stride < 1 or start_frame < 0:
        raise ValueError("label_id, task_size and frame_stride must be positive")
    grouped: dict[int, list[MOTRow]] = defaultdict(list)
    for row in rows:
        grouped[row.track_id].append(row)

    tracks: list[dict[str, Any]] = []
    for track_id, observations in sorted(grouped.items()):
        observations.sort(key=lambda item: item.frame)
        shapes: list[dict[str, Any]] = []
        previous: MOTRow | None = None
        previous_frame: int | None = None
        for row in observations:
            cvat_frame = start_frame + (row.frame - 1) * frame_stride
            if cvat_frame >= task_size:
                raise ValueError(
                    f"track {track_id} maps frame {row.frame} outside task size {task_size}"
                )
            if previous is not None and row.frame > previous.frame + 1:
                outside_frame = previous_frame + frame_stride
                if outside_frame < cvat_frame:
                    shapes.append(_shape(outside_frame, previous.xyxy, outside=True))
            shapes.append(_shape(cvat_frame, row.xyxy, outside=False))
            previous = row
            previous_frame = cvat_frame
        if previous is not None and previous_frame is not None:
            outside_frame = previous_frame + frame_stride
            if outside_frame < task_size:
                shapes.append(_shape(outside_frame, previous.xyxy, outside=True))
        tracks.append(
            {
                "label_id": label_id,
                "frame": int(shapes[0]["frame"]),
                "group": 0,
                "source": "auto",
                "attributes": [],
                "elements": [],
                "shapes": shapes,
            }
        )
    return tracks


def _interpolate_points(
    left: dict[str, Any], right: dict[str, Any], frame: int
) -> list[float]:
    if frame == int(left["frame"]):
        return [float(value) for value in left["points"]]
    span = int(right["frame"]) - int(left["frame"])
    if span <= 0:
        raise ValueError("CVAT track shapes must have strictly increasing frames")
    ratio = (frame - int(left["frame"])) / span
    return [
        float(a) + ratio * (float(b) - float(a))
        for a, b in zip(left["points"], right["points"])
    ]


def iter_cvat_track_boxes(
    track: dict[str, Any], sample_frames: Iterable[int]
) -> Iterator[tuple[int, list[float], bool]]:
    """Yield materialized CVAT boxes at requested 0-based video frames."""

    shapes = sorted(track.get("shapes", []), key=lambda item: int(item["frame"]))
    if not shapes:
        return
    for shape in shapes:
        if shape.get("type") != "rectangle" or len(shape.get("points", [])) != 4:
            raise ValueError("tracking GT supports rectangle track shapes only")
    index = 0
    for frame in sorted(set(sample_frames)):
        while index + 1 < len(shapes) and int(shapes[index + 1]["frame"]) <= frame:
            index += 1
        left = shapes[index]
        if frame < int(left["frame"]):
            continue
        if bool(left.get("outside", False)):
            continue
        if index + 1 < len(shapes):
            right = shapes[index + 1]
            if frame > int(right["frame"]):
                continue
            points = _interpolate_points(left, right, frame)
        elif frame == int(left["frame"]):
            points = [float(value) for value in left["points"]]
        else:
            continue
        yield frame, points, bool(left.get("occluded", False))


def cvat_annotations_to_mot_rows(
    annotations: dict[str, Any],
    *,
    task_size: int,
    frame_stride: int = 1,
    start_frame: int = 0,
) -> list[MOTRow]:
    if task_size < 1 or frame_stride < 1 or start_frame < 0:
        raise ValueError("task_size and frame_stride must be positive")
    sample_frames = range(start_frame, task_size, frame_stride)
    rows: list[MOTRow] = []
    for track_id, track in enumerate(annotations.get("tracks", []), start=1):
        for frame, points, occluded in iter_cvat_track_boxes(track, sample_frames):
            x1, y1, x2, y2 = points
            if x2 <= x1 or y2 <= y1:
                raise ValueError(f"track {track_id} frame {frame} has invalid box")
            rows.append(
                MOTRow(
                    frame=(frame - start_frame) // frame_stride + 1,
                    track_id=track_id,
                    x=x1,
                    y=y1,
                    width=x2 - x1,
                    height=y2 - y1,
                    confidence=1.0,
                    class_id=0,
                    visibility=0.0 if occluded else 1.0,
                )
            )
    return sorted(rows, key=lambda item: (item.frame, item.track_id))


def format_mot_rows(rows: Iterable[MOTRow]) -> str:
    return "".join(
        f"{row.frame},{row.track_id},{row.x:.3f},{row.y:.3f},"
        f"{row.width:.3f},{row.height:.3f},{row.confidence:.6f},"
        f"{row.class_id},{row.visibility:.6f}\n"
        for row in rows
    )
