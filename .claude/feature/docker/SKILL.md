# 07. Docker 배포 (DOCKER)

## Docker Compose 전체 구성

```yaml
# docker-compose.yml
version: '3.9'

services:
  # ── Frontend (React + Nginx) ──────────────────────────────
  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    container_name: voicecollect-frontend
    restart: unless-stopped
    depends_on:
      - backend
    networks:
      - app-network

  # ── Backend (FastAPI) ─────────────────────────────────────
  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: voicecollect-backend
    restart: unless-stopped
    environment:
      - DATABASE_URL=mysql+pymysql://${DB_USER}:${DB_PASSWORD}@db:3306/${DB_NAME}
      - SECRET_KEY=${SECRET_KEY}
      - REDIS_URL=redis://redis:6379/0
      - RECORDINGS_BASE=/recordings
    volumes:
      - recordings-data:/recordings
    depends_on:
      db:
        condition: service_healthy
      redis:
        condition: service_started
    networks:
      - app-network

  # ── Celery Worker (오디오 분석) ────────────────────────────
  worker:
    build:
      context: ./backend
      dockerfile: Dockerfile
    container_name: voicecollect-worker
    restart: unless-stopped
    command: celery -A app.tasks.audio worker --loglevel=info --concurrency=2 -Q audio_analysis
    environment:
      - DATABASE_URL=mysql+pymysql://${DB_USER}:${DB_PASSWORD}@db:3306/${DB_NAME}
      - REDIS_URL=redis://redis:6379/0
      - RECORDINGS_BASE=/recordings
    volumes:
      - recordings-data:/recordings
    depends_on:
      - backend
      - redis
    networks:
      - app-network

  # ── MySQL 8.0 ─────────────────────────────────────────────
  db:
    image: mysql:8.0
    container_name: voicecollect-db
    restart: unless-stopped
    environment:
      MYSQL_ROOT_PASSWORD: ${DB_ROOT_PASSWORD}
      MYSQL_DATABASE: ${DB_NAME}
      MYSQL_USER: ${DB_USER}
      MYSQL_PASSWORD: ${DB_PASSWORD}
    volumes:
      - mysql-data:/var/lib/mysql
      - ./backend/init.sql:/docker-entrypoint-initdb.d/init.sql:ro
    ports:
      - "3306:3306"   # 개발 환경에서만 노출, 운영에서는 제거
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - app-network

  # ── Redis (Celery 브로커) ─────────────────────────────────
  redis:
    image: redis:7-alpine
    container_name: voicecollect-redis
    restart: unless-stopped
    volumes:
      - redis-data:/data
    networks:
      - app-network

  # ── Nginx (리버스 프록시) ──────────────────────────────────
  nginx:
    image: nginx:1.25-alpine
    container_name: voicecollect-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
      - ./nginx/ssl:/etc/nginx/ssl:ro      # SSL 인증서 (운영)
    depends_on:
      - frontend
      - backend
    networks:
      - app-network

volumes:
  mysql-data:
  redis-data:
  recordings-data:    # 녹음 파일 영속 볼륨

networks:
  app-network:
    driver: bridge
```

---

## 환경변수 파일 (.env)

```bash
# .env (Git에 절대 커밋하지 말 것 → .gitignore에 추가)

# Database
DB_ROOT_PASSWORD=rootpassword_change_me
DB_NAME=voicecollect
DB_USER=vcuser
DB_PASSWORD=vcpassword_change_me

# FastAPI
SECRET_KEY=your-256-bit-secret-key-change-me-in-production

# App
ENVIRONMENT=production   # development | production
```

---

## Dockerfile (Backend)

```dockerfile
# backend/Dockerfile
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

# DB 마이그레이션 + 서버 시작
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
```

---

## Dockerfile (Frontend)

```dockerfile
# frontend/Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json .
RUN npm ci
COPY . .
RUN npm run build

# Nginx로 정적 파일 서빙
FROM nginx:1.25-alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

---

## Nginx 설정

```nginx
# nginx/nginx.conf
events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    # 업로드 파일 크기 제한 (녹음 파일)
    client_max_body_size 50M;

    # 업스트림 서버
    upstream backend {
        server backend:8000;
    }
    upstream frontend {
        server frontend:80;
    }

    server {
        listen 80;
        server_name localhost;

        # API 요청 → FastAPI
        location /api/ {
            proxy_pass http://backend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            
            # 파일 업로드 타임아웃 (대용량 오디오)
            proxy_read_timeout 120s;
            proxy_send_timeout 120s;
        }

        # 정적 파일 → React
        location / {
            proxy_pass http://frontend;
            proxy_set_header Host $host;
            
            # React Router를 위한 fallback
            try_files $uri $uri/ /index.html;
        }
    }

    # HTTPS 설정 (운영 환경)
    # server {
    #     listen 443 ssl http2;
    #     server_name yourdomain.com;
    #
    #     ssl_certificate /etc/nginx/ssl/fullchain.pem;
    #     ssl_certificate_key /etc/nginx/ssl/privkey.pem;
    #     ssl_protocols TLSv1.2 TLSv1.3;
    #
    #     location /api/ { proxy_pass http://backend; }
    #     location / { proxy_pass http://frontend; }
    # }
}
```

---

## 배포 절차

### 최초 배포
```bash
# 1. 레포 클론
git clone https://github.com/yourrepo/voicecollect.git
cd voicecollect

# 2. 환경변수 설정
cp .env.example .env
vi .env  # SECRET_KEY, DB_PASSWORD 등 변경

# 3. 빌드 및 실행
docker compose up -d --build

# 4. DB 마이그레이션 확인 (자동 실행되지만 확인)
docker compose exec backend alembic upgrade head

# 5. 초기 데이터 입력 (문장 100개 + 어드민 계정)
docker compose exec backend python -m app.utils.seed

# 6. 동작 확인
docker compose ps
curl http://localhost/api/v1/health
```

### 업데이트 배포
```bash
git pull origin main
docker compose up -d --build backend frontend
# worker도 코드 변경이 있으면:
docker compose up -d --build worker
```

### 서비스 모니터링
```bash
# 전체 로그
docker compose logs -f

# 서비스별 로그
docker compose logs -f backend
docker compose logs -f worker

# Celery 태스크 현황
docker compose exec worker celery -A app.tasks.audio inspect active

# DB 접속
docker compose exec db mysql -u vcuser -p voicecollect
```

---

## 볼륨 백업 전략

```bash
# MySQL 데이터 백업 (crontab 등록 권장)
docker compose exec db mysqldump -u vcuser -p voicecollect > backup_$(date +%Y%m%d).sql

# 녹음 파일 백업
docker run --rm \
  -v voicecollect_recordings-data:/recordings \
  -v $(pwd)/backups:/backup \
  alpine tar czf /backup/recordings_$(date +%Y%m%d).tar.gz /recordings
```

---

## 서비스 포트 요약

| 서비스 | 내부 포트 | 외부 포트 | 설명 |
|--------|---------|---------|------|
| Nginx | 80/443 | 80/443 | 외부 진입점 |
| Frontend | 80 | - | Nginx가 프록시 |
| Backend | 8000 | - | Nginx가 프록시 |
| MySQL | 3306 | 3306* | *개발환경에서만 노출 |
| Redis | 6379 | - | 내부 전용 |

> **운영 환경 주의**: MySQL의 외부 포트(3306) 노출은 개발 편의를 위한 것으로,
> 운영 배포 시 `docker-compose.yml`에서 `ports: - "3306:3306"` 라인을 제거하세요.

---

## .gitignore 필수 항목

```gitignore
.env
*.env.local
recordings/
__pycache__/
*.pyc
node_modules/
dist/
.DS_Store
backups/
*.sql
```
