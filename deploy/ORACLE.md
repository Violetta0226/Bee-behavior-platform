# Oracle deployment

The Oracle release uses two application containers: the web/API container and
a single-concurrency analysis worker. PostgreSQL and uploaded/generated files
are stored in named volumes. Model artifacts are mounted read-only and remain
outside Git.

Required model directory:

```text
runtime_config.json
SHA256SUMS
rgb/best.onnx
rgb/box_calibration.json
rgb/score_quality.json
infrared/best.onnx
infrared/box_calibration.json
infrared/score_quality.json
```

Verify it against `deploy/MODEL_SHA256SUMS` from inside that directory before
building or starting the worker.

The worker performs real ONNX inference, MOT tracking, and behavior analysis.
Oracle deployment intentionally records CPU execution as an offline,
descriptive result. It does not claim CUDA delivery parity or human-MOT
validation. Arbitrary uploads do not infer hive entry/exit unless a directed
gate has been configured; those fields remain unavailable in the behavior
report.

Before starting the backend, run migrations and initial data in a one-off
container:

```bash
docker compose --env-file .env -f deploy/compose.oracle.yml run --rm backend \
  sh -c 'python app/backend_pre_start.py && alembic upgrade head && python app/initial_data.py'
docker compose --env-file .env -f deploy/compose.oracle.yml up -d
```

Use a separate compose project, port, database volume, and analysis volume for
candidate acceptance. Reusing the production database volume is reserved for
the final cutover after a database backup and migration dry-run.
