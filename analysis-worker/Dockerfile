FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONPATH=/app/competition:/app/competition/runtime

RUN apt-get update \
    && apt-get install --no-install-recommends -y curl ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY analysis-worker/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

COPY analysis-worker/app.py /app/app.py
COPY analysis-worker/competition /app/competition

HEALTHCHECK --interval=20s --timeout=5s --retries=5 \
    CMD curl -fsS http://localhost:8100/health || exit 1

CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8100", "--workers", "1"]
