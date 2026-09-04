"""Dependency-light multi-object tracking for the bee competition pipeline."""

from .core import (
    BeeTracker,
    Detection,
    TrackResult,
    TrackerConfig,
    detections_from_xyxy_rows,
)
from .mot import MOTWriter, format_mot_row, write_mot

__all__ = [
    "BeeTracker",
    "Detection",
    "MOTWriter",
    "TrackResult",
    "TrackerConfig",
    "detections_from_xyxy_rows",
    "format_mot_row",
    "write_mot",
]
