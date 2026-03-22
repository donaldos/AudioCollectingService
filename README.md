# VoiceCollect

AI 학습용 한국어 음성 데이터를 크라우드소싱으로 수집하는 웹 플랫폼.

참여자가 제시 문장을 녹음 → 서버에서 품질 분석 → 어드민이 검수 → 데이터셋 납품.

---

## 기술 스택

| 레이어 | 기술 |
|--------|------|
| Frontend | React 18 + Vite 5 + Zustand + React Router v6 |
| Backend | FastAPI 0.111+ (Python 3.11) |
| DB | MySQL 8.0 + SQLAlchemy 2.x + Alembic |
| 인증 | bcrypt + JWT HS256, Access Token 24h |
| 오디오 | WebM → WAV 16kHz mono (ffmpeg), librosa 분석 |
| 비동기 | Celery 5.x + Redis 7 |
| 배포 | Docker Compose v2 + Nginx 1.25 |

---

## 빠른 시작

```bash
# 1. 환경변수 설정
cp .env.example .env
# .env 파일에서 SECRET_KEY, DB_PASSWORD 등 변경

# 2. 빌드 및 실행
docker compose up -d --build

# 3. DB 마이그레이션 (최초 1회)
docker compose exec backend alembic upgrade head

# 4. 초기 데이터 투입 (문장 100개 + 어드민 계정)
docker compose exec backend python -m app.utils.seed

# 5. 동작 확인
curl http://localhost/api/v1/health
open http://localhost          # 사용자 화면
open http://localhost/admin    # 어드민
```

---

## 환경변수

`.env.example`을 복사해 `.env`를 만들고 아래 항목을 채웁니다.

```bash
DB_ROOT_PASSWORD=   # MySQL root 패스워드
DB_NAME=voicecollect
DB_USER=vcuser
DB_PASSWORD=        # MySQL 앱 계정 패스워드
SECRET_KEY=         # JWT 서명 키 (openssl rand -hex 32)
ENVIRONMENT=        # development | production
```

---

## 서비스 구성

| 서비스 | 역할 | 포트 |
|--------|------|------|
| nginx | 리버스 프록시 | 80 |
| frontend | React 정적 서빙 | - |
| backend | FastAPI | - |
| worker | Celery 오디오 분석 | - |
| db | MySQL 8.0 | 3306 (개발 환경) |
| redis | Celery 브로커 | - |

---

## API 요약

```
Base URL: /api/v1

POST /auth/register          회원가입
POST /auth/login             로그인 → JWT 발급
GET  /auth/me                내 정보

GET  /sentences/random       랜덤 10문장 + 세션 생성
POST /recordings/upload      녹음 파일 업로드
POST /recordings/complete-session  세션 완료 → 포인트 지급
GET  /recordings/my          내 녹음 목록

# 어드민 전용
GET  /stats/dashboard        대시보드 통계
GET  /recordings             전체 녹음 목록 (필터)
PATCH /recordings/{id}/review  검수 (accept/reject)
```

Swagger UI: `http://localhost/api/v1/docs`

---

## 녹음 상태 흐름

```
pending → analyzed → accepted
                   ↘ rejected
  ↑업로드       ↑Celery분석   ↑어드민검수
```

---

## 로그 확인

```bash
docker compose logs -f backend worker
docker compose ps
```
