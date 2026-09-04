"""Dependency-free behavior quantification for bee MOT trajectories."""

from .analysis import (
    AnalysisResult,
    BehaviorConfig,
    Detection,
    Rectangle,
    analyze_behavior,
    parse_mot,
    write_outputs,
)

__all__ = [
    "AnalysisResult",
    "BehaviorConfig",
    "Detection",
    "Rectangle",
    "analyze_behavior",
    "parse_mot",
    "write_outputs",
]
