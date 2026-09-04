from __future__ import annotations

import hashlib
import json
import os
import secrets
import subprocess
import threading
from pathlib import Path
from typing import Any, Literal

from fastapi import Depends, FastAPI, Header, HTTPException
from pydantic import BaseModel, Field

from behavior.analysis import BehaviorConfig, analyze_behavior, parse_mot, write_outputs
from tracking.core import TrackerConfig
from tracking.pipeline import run_sequence

DATA_ROOT = Path(os.environ.get("ANALYSIS_DATA_ROOT", "/data")).resolve()
MODEL_ROOT = Path(os.environ.get("ANALYSIS_MODEL_ROOT", "/models")).resolve()
WORKER_TOKEN = os.environ.get("ANALYSIS_WORKER_TOKEN", "")
SAMPLE_FPS = float(os.environ.get("ANALYSIS_SAMPLE_FPS", "5"))
_ANOMALY_FIELDS = (
    "activity_robust_z",
    "speed_body_lengths_robust_z",
    "interaction_robust_z",
    "flux_robust_z",
)
_analysis_lock = threading.Lock()

app = FastAPI(title="Bee analysis worker", docs_url=None, redoc_url=None)


class AnalysisRequest(BaseModel):
    input_video: str
    output_dir: str
    sequence_id: str = Field(min_length=1, max_length=255)
    modality: Literal["rgb", "infrared"]


def authorize(x_worker_token: str = Header(default="")) -> None:
    if not WORKER_TOKEN or not secrets.compare_digest(x_worker_token, WORKER_TOKEN):
        raise HTTPException(status_code=401, detail="Invalid worker token")


def _within(root: Path, value: str) -> Path:
    path = Path(value).resolve()
    if path != root and root not in path.parents:
        raise HTTPException(status_code=422, detail="Path is outside the shared data root")
    return path


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _probe_video(path: Path) -> dict[str, float | int]:
    command = [
        "ffprobe",
        "-v",
        "error",
        "-select_streams",
        "v:0",
        "-show_entries",
        "stream=width,height:format=duration",
        "-of",
        "json",
        str(path),
    ]
    try:
        result = subprocess.run(command, check=True, capture_output=True, text=True, timeout=30)
        payload = json.loads(result.stdout)
        stream = payload["streams"][0]
        duration = float(payload["format"]["duration"])
        width = int(stream["width"])
        height = int(stream["height"])
    except (KeyError, IndexError, TypeError, ValueError, subprocess.SubprocessError) as exc:
        raise HTTPException(status_code=422, detail="The uploaded video cannot be decoded") from exc
    if duration <= 0 or duration > 1800:
        raise HTTPException(status_code=422, detail="Video duration must be between 0 and 1800 seconds")
    return {"duration_seconds": duration, "width": width, "height": height}


def _tracker_config(modality: str) -> TrackerConfig:
    config = json.loads((MODEL_ROOT / "runtime_config.json").read_text(encoding="utf-8"))
    values = dict(config.get("tracking", {}).get(modality, {}))
    allowed = TrackerConfig.__dataclass_fields__.keys()
    return TrackerConfig(**{key: value for key, value in values.items() if key in allowed})


def _anomaly_count(report: dict[str, Any]) -> int:
    group = report.get("group", {})
    temporal = group.get("temporal_summary", []) if isinstance(group, dict) else []
    count = 0
    for row in temporal if isinstance(temporal, list) else []:
        if not isinstance(row, dict) or row.get("warmup") is True:
            continue
        scores = [
            abs(float(row[field]))
            for field in _ANOMALY_FIELDS
            if isinstance(row.get(field), int | float)
        ]
        if scores and max(scores) >= 3.5:
            count += 1
    return count


@app.get("/health")
def health() -> dict[str, Any]:
    config = MODEL_ROOT / "runtime_config.json"
    return {
        "status": "ok" if config.is_file() else "degraded",
        "model_config_present": config.is_file(),
        "sample_fps": SAMPLE_FPS,
    }


@app.post("/analyze", dependencies=[Depends(authorize)])
def analyze(request: AnalysisRequest) -> dict[str, Any]:
    input_video = _within(DATA_ROOT, request.input_video)
    output_dir = _within(DATA_ROOT, request.output_dir)
    if not input_video.is_file():
        raise HTTPException(status_code=404, detail="Input video not found")
    if not _analysis_lock.acquire(blocking=False):
        raise HTTPException(status_code=409, detail="Analysis worker is busy")

    try:
        probe = _probe_video(input_video)
        if output_dir.exists():
            raise HTTPException(status_code=409, detail="Analysis output already exists")
        frames_dir = output_dir / "sequence" / "img1"
        tracks_dir = output_dir / "tracking"
        behavior_dir = output_dir / "behavior"
        frames_dir.mkdir(parents=True)
        command = [
            "ffmpeg",
            "-v",
            "error",
            "-i",
            str(input_video),
            "-vf",
            f"fps={SAMPLE_FPS}",
            "-q:v",
            "2",
            str(frames_dir / "%06d.jpg"),
        ]
        try:
            subprocess.run(command, check=True, timeout=1800)
        except subprocess.SubprocessError as exc:
            raise HTTPException(status_code=422, detail="Video frame extraction failed") from exc

        tracking = run_sequence(
            frames_dir.parent,
            tracks_dir,
            MODEL_ROOT / "runtime_config.json",
            MODEL_ROOT,
            request.modality,
            _tracker_config(request.modality),
            allow_cpu=True,
        )
        detections = parse_mot(tracks_dir / "tracks.txt")
        result = analyze_behavior(
            detections,
            BehaviorConfig(fps=SAMPLE_FPS),
            sequence_id=request.sequence_id,
            source=str(tracks_dir / "tracks.txt"),
        )
        write_outputs(result, behavior_dir)
        report_path = behavior_dir / "behavior_summary.json"
        report = json.loads(report_path.read_text(encoding="utf-8"))
        report["provenance"] = {
            "executor": "oracle-arm64-cpu",
            "input_sha256": _sha256(input_video),
            "model_manifest_sha256": _sha256(MODEL_ROOT / "SHA256SUMS"),
            "sample_fps": SAMPLE_FPS,
            "source_duration_seconds": probe["duration_seconds"],
            "source_width": probe["width"],
            "source_height": probe["height"],
            "offline_cpu_fallback": True,
            "tracking_assignment_backend": tracking["assignment_backend"],
            "metric_status": "descriptive_only_without_human_mot_ground_truth",
            "gate_configured": False,
        }
        report_path.write_text(
            json.dumps(report, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        return {
            "report_path": str(report_path),
            "result_video_path": None,
            "anomaly_window_count": _anomaly_count(report),
        }
    finally:
        _analysis_lock.release()
