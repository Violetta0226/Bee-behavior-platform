"""MOTChallenge-compatible output helpers."""

from __future__ import annotations

import math
from pathlib import Path
from typing import Iterable, TextIO

from .core import TrackResult


def _format_number(value: float, precision: int = 6) -> str:
    text = f"{float(value):.{precision}f}".rstrip("0").rstrip(".")
    return "0" if text in {"-0", ""} else text


def format_mot_row(track: TrackResult) -> str:
    """Format ``frame,id,x,y,w,h,conf,cls,vis`` without a trailing newline."""

    if track.frame_id < 1 or track.track_id < 1:
        raise ValueError("MOT frame_id and track_id must be positive")
    if track.width <= 0 or track.height <= 0:
        raise ValueError("MOT width and height must be positive")
    if track.class_id != 0:
        raise ValueError("competition MOT output requires class_id=0")
    values = (
        track.x,
        track.y,
        track.width,
        track.height,
        track.confidence,
        track.visibility,
    )
    if not all(math.isfinite(value) for value in values):
        raise ValueError("MOT numeric fields must be finite")
    if not 0.0 <= track.confidence <= 1.0 or not 0.0 <= track.visibility <= 1.0:
        raise ValueError("MOT confidence and visibility must be in [0, 1]")
    return ",".join(
        [
            str(track.frame_id),
            str(track.track_id),
            _format_number(track.x, 3),
            _format_number(track.y, 3),
            _format_number(track.width, 3),
            _format_number(track.height, 3),
            _format_number(track.confidence, 6),
            str(track.class_id),
            _format_number(track.visibility, 6),
        ]
    )


def write_mot(path: str | Path, tracks: Iterable[TrackResult]) -> Path:
    """Write a complete MOT file, replacing any existing file."""

    output = Path(path)
    output.parent.mkdir(parents=True, exist_ok=True)
    rows = [format_mot_row(track) for track in tracks]
    output.write_text("".join(f"{row}\n" for row in rows), encoding="utf-8")
    return output


class MOTWriter:
    """Incremental writer for long sequences.

    Use as a context manager and call :meth:`write` after every tracker update.
    """

    def __init__(self, path: str | Path) -> None:
        self.path = Path(path)
        self._handle: TextIO | None = None

    def __enter__(self) -> "MOTWriter":
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self._handle = self.path.open("w", encoding="utf-8", newline="\n")
        return self

    def write(self, tracks: Iterable[TrackResult]) -> None:
        if self._handle is None:
            raise RuntimeError("MOTWriter must be used inside a with block")
        for track in tracks:
            self._handle.write(format_mot_row(track) + "\n")

    def __exit__(self, exc_type: object, exc_value: object, traceback: object) -> None:
        if self._handle is not None:
            self._handle.close()
            self._handle = None
