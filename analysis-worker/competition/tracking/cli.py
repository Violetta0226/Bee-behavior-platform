"""Convert frame-by-frame detector JSONL output to MOT tracks."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Iterator

from .core import BeeTracker, Detection, TrackerConfig
from .mot import MOTWriter


def iter_detection_frames(path: str | Path) -> Iterator[tuple[int, list[Detection]]]:
    """Yield ``(frame_id, detections)`` from one-JSON-object-per-line input."""

    source = Path(path)
    with source.open("r", encoding="utf-8") as handle:
        for line_number, raw_line in enumerate(handle, start=1):
            line = raw_line.strip()
            if not line:
                continue
            try:
                payload = json.loads(line)
            except json.JSONDecodeError as exc:
                raise ValueError(f"invalid JSON at line {line_number}: {exc.msg}") from exc
            if not isinstance(payload, dict):
                raise ValueError(f"line {line_number} must contain a JSON object")
            frame_id = payload.get("frame_id")
            detections = payload.get("detections", [])
            if not isinstance(frame_id, int) or isinstance(frame_id, bool):
                raise ValueError(f"line {line_number} requires an integer frame_id")
            if not isinstance(detections, list):
                raise ValueError(f"line {line_number} detections must be a list")
            yield frame_id, [BeeTracker._coerce_detection(item) for item in detections]


def run_jsonl(
    detections_path: str | Path,
    output_path: str | Path,
    config: TrackerConfig | None = None,
) -> int:
    """Track one sequence and return the number of MOT rows written."""

    tracker = BeeTracker(config)
    row_count = 0
    with MOTWriter(output_path) as writer:
        for frame_id, detections in iter_detection_frames(detections_path):
            tracks = tracker.update(detections, frame_id=frame_id)
            writer.write(tracks)
            row_count += len(tracks)
    return row_count


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Associate bee detections and export MOT frame,id,x,y,w,h,conf,cls,vis rows."
    )
    parser.add_argument("--detections-jsonl", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--high-confidence", type=float, default=0.45)
    parser.add_argument("--low-confidence", type=float, default=0.10)
    parser.add_argument("--new-track-confidence", type=float, default=0.45)
    parser.add_argument("--max-lost", type=int, default=12)
    parser.add_argument("--emit-predictions", action="store_true")
    parser.add_argument("--max-prediction-age", type=int, default=2)
    return parser


def main() -> int:
    args = build_parser().parse_args()
    config = TrackerConfig(
        high_confidence=args.high_confidence,
        low_confidence=args.low_confidence,
        new_track_confidence=args.new_track_confidence,
        max_lost=args.max_lost,
        emit_predictions=args.emit_predictions,
        max_prediction_age=args.max_prediction_age,
    )
    row_count = run_jsonl(args.detections_jsonl, args.output, config)
    print(json.dumps({"ok": True, "rows": row_count, "output": str(args.output)}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
