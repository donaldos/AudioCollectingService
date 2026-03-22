FROM python:3.11-slim

# ffmpeg 설치 (오디오 변환 필수)
RUN apt-get update && apt-get install -y \
    ffmpeg \
    libsndfile1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 의존성 먼저 설치 (레이어 캐싱 활용)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Phase 1: 서버만 시작 (DB 마이그레이션은 Phase 2에서 추가)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
