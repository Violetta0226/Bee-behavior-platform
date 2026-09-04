#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from .analysis import (
    BehaviorConfig,
    CountingGate,
    Rectangle,
    analyze_behavior,
    parse_mot,
    write_outputs,
)


def parse_roi(value: str) -> Rectangle:
    try:
        values = [float(part.strip()) for part in value.split(",")]
    except ValueError as exc:
        raise argparse.ArgumentTypeError("ROI values must be numbers") from exc
    if len(values) != 4:
        raise argparse.ArgumentTypeError("ROI must be x1,y1,x2,y2")
    try:
        return Rectangle(*values)
    except ValueError as exc:
        raise argparse.ArgumentTypeError(str(exc)) from exc


def parse_gate(value: str) -> CountingGate:
    try:
        values = [float(part.strip()) for part in value.split(",")]
    except ValueError as exc:
        raise argparse.ArgumentTypeError("gate values must be numbers") from exc
    if len(values) != 4:
        raise argparse.ArgumentTypeError("gate must be x1,y1,x2,y2")
    try:
        return CountingGate(*values)
    except ValueError as exc:
        raise argparse.ArgumentTypeError(str(exc)) from exc


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Quantify individual and group behavior from bee MOT tracks."
    )
    parser.add_argument("--input", type=Path, required=True, help="MOT txt or CSV input")
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--fps", type=float, required=True)
    parser.add_argument("--sequence-id", default=None)
    parser.add_argument("--pixels-per-mm", type=float, default=None)
    parser.add_argument("--roi", type=parse_roi, default=None, help="x1,y1,x2,y2 in pixels")
    parser.add_argument("--gate", type=parse_gate, default=None, help="directed x1,y1,x2,y2 line")
    parser.add_argument(
        "--gate-entry-side",
        choices=("positive", "negative"),
        default="negative",
        help="which side of the directed gate is inside the hive",
    )
    parser.add_argument("--gate-deadband-px", type=float, default=3.0)
    parser.add_argument("--grid-rows", type=int, default=8)
    parser.add_argument("--grid-cols", type=int, default=12)
    parser.add_argument("--stationary-threshold-px-s", type=float, default=5.0)
    parser.add_argument("--interaction-distance-px", type=float, default=50.0)
    parser.add_argument("--temporal-bin-seconds", type=float, default=10.0)
    parser.add_argument("--temporal-warmup-bins", type=int, default=1)
    parser.add_argument("--crossing-debounce-frames", type=int, default=3)
    parser.add_argument("--crossing-cooldown-frames", type=int, default=5)
    parser.add_argument("--max-gap-frames", type=int, default=5)
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    try:
        gate = args.gate
        if gate is not None:
            gate = CountingGate(
                gate.x1,
                gate.y1,
                gate.x2,
                gate.y2,
                1 if args.gate_entry_side == "positive" else -1,
            )
        config = BehaviorConfig(
            fps=args.fps,
            pixels_per_mm=args.pixels_per_mm,
            roi=args.roi,
            gate=gate,
            gate_deadband_px=args.gate_deadband_px,
            grid_rows=args.grid_rows,
            grid_cols=args.grid_cols,
            stationary_threshold_px_s=args.stationary_threshold_px_s,
            interaction_distance_px=args.interaction_distance_px,
            temporal_bin_seconds=args.temporal_bin_seconds,
            temporal_warmup_bins=args.temporal_warmup_bins,
            crossing_debounce_frames=args.crossing_debounce_frames,
            crossing_cooldown_frames=args.crossing_cooldown_frames,
            max_gap_frames=args.max_gap_frames,
        )
        detections = parse_mot(args.input)
        result = analyze_behavior(
            detections,
            config,
            sequence_id=args.sequence_id or args.input.stem,
            source=str(args.input),
        )
        outputs = write_outputs(result, args.output_dir)
    except (OSError, ValueError) as exc:
        print(json.dumps({"ok": False, "error": str(exc)}, ensure_ascii=False), file=sys.stderr)
        return 2
    print(
        json.dumps(
            {
                "ok": True,
                "tracks": result.summary["sequence"]["track_count"],
                "detections": result.summary["sequence"]["detection_count"],
                "outputs": outputs,
            },
            ensure_ascii=False,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
