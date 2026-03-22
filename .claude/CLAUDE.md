# CLAUDE.md — VoiceCollect 프로젝트 마스터 가이드

> 이 파일은 Claude가 VoiceCollect 프로젝트 작업 시 **가장 먼저 읽어야 할 진입점**입니다.
> 각 기능의 상세 구현은 `.claude/feature/*/SKILL.md` 를 참조하십시오.

---

## 프로젝트 한 줄 요약

**VoiceCollect**: AI 학습용 한국어 음성 데이터를 크라우드소싱으로 수집하는 웹 플랫폼.
참여자가 제시 문장을 녹음 → 서버에서 품질 분석 → 어드민이 검수 → 데이터셋 납품.

---

## 기술 스택 (확정)

| 레이어 | 기술 |
|--------|------|
| Frontend | React 18 + Vite 5 + Zustand + React Router v6 |
| Backend | FastAPI 0.111+ (Python 3.11) |
| DB | MySQL 8.0 + SQLAlchemy 2.x + Alembic |
| 인증 | bcrypt + JWT HS256 (python-jose), Access Token 24h |
| 오디오 | WebM → WAV 16kHz mono (ffmpeg), librosa 분석 |
| 비동기 | Celery 5.x + Redis 7 |
| 배포 | Docker Compose v2 + Nginx 1.25 |

---

## 핵심 정책 (변경 불가 — 설계 기반)

| 항목 | 결정값 |
|------|--------|
| 재녹음 | ✅ 허용, 같은 문장 **덮어쓰기** (UPSERT) |
| 무효 녹음 필터 | ❌ 자동 reject 없음 — 어드민 **수동 검수** |
| 문장 추출 방식 | 미녹음 우선 랜덤 10문장, 100문장 완료 시 전체에서 재추출 |
| 포인트 지급 | 세션(10문장) 완료 시 적립, 마이페이지 표시 |
| 화자 메타데이터 | 성별, 연령대, 거주지역/방언 (회원가입 시 수집) |
| 음성 저장 경로 | `recordings/{user_id}/{sentence_id}.wav` |
| 음성 분석 타이밍 | 업로드 즉시 Celery 비동기 처리 |

---

## 프로젝트 디렉토리 구조

```
voicecollect/
├── CLAUDE.md                        ← 이 파일
├── docker-compose.yml
├── .env                             ← Git 제외 (민감정보)
├── nginx/
│   └── nginx.conf
│
├── frontend/                        # React (Vite)
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Auth/               # 로그인, 회원가입
│   │   │   │   ├── LoginPage.jsx
│   │   │   │   └── RegisterPage.jsx
│   │   │   ├── Record/             # 녹음 핵심 기능
│   │   │   │   └── RecordPage.jsx
│   │   │   ├── MyPage/             # 포인트, 진행 현황
│   │   │   │   └── MyPage.jsx
│   │   │   └── Admin/              # 어드민 전용
│   │   │       ├── AdminLayout.jsx
│   │   │       ├── Dashboard.jsx
│   │   │       ├── SentenceManager.jsx
│   │   │       ├── BulkImport.jsx
│   │   │       ├── RecordingList.jsx
│   │   │       ├── ReviewPage.jsx
│   │   │       ├── UserList.jsx
│   │   │       ├── UserDetail.jsx
│   │   │       └── Settings.jsx
│   │   ├── components/
│   │   │   ├── Admin/
│   │   │   │   ├── KPICard.jsx
│   │   │   │   ├── Pagination.jsx
│   │   │   │   └── WaveformPlayer.jsx  # WaveSurfer.js
│   │   │   └── Record/
│   │   │       ├── StepIndicator.jsx
│   │   │       └── WaveformVisualizer.jsx
│   │   ├── hooks/
│   │   │   ├── useRecorder.js          # MediaRecorder 훅
│   │   │   └── useAdminFilter.js       # 어드민 필터 훅
│   │   ├── api/
│   │   │   └── index.js               # axios 인스턴스 + 인터셉터
│   │   └── store/
│   │       └── authStore.js           # Zustand (JWT, user 상태)
│   ├── nginx.conf
│   └── Dockerfile
│
├── backend/                          # FastAPI
│   ├── app/
│   │   ├── main.py                   # FastAPI 앱 진입점, CORS, 라우터 등록
│   │   ├── core/
│   │   │   ├── config.py             # 환경변수 로딩 (pydantic Settings)
│   │   │   ├── security.py           # JWT 생성/검증, bcrypt, Dependency
│   │   │   └── database.py           # SQLAlchemy 엔진, 세션, Base
│   │   ├── models/                   # SQLAlchemy ORM 모델
│   │   │   ├── user.py               # User
│   │   │   ├── sentence.py           # Sentence
│   │   │   ├── recording.py          # Recording
│   │   │   ├── recording_session.py  # RecordingSession
│   │   │   └── system_config.py      # SystemConfig (포인트 정책 등)
│   │   ├── schemas/                  # Pydantic 요청/응답 스키마
│   │   │   ├── auth.py
│   │   │   ├── sentence.py
│   │   │   ├── recording.py
│   │   │   └── stats.py
│   │   ├── routers/                  # API 라우터 (prefix: /api/v1/*)
│   │   │   ├── auth.py               # /auth
│   │   │   ├── sentences.py          # /sentences
│   │   │   ├── recordings.py         # /recordings
│   │   │   ├── users.py              # /users (어드민)
│   │   │   ├── stats.py              # /stats (어드민)
│   │   │   └── settings.py           # /settings (어드민)
│   │   ├── tasks/
│   │   │   ├── audio.py              # Celery 태스크: 오디오 분석
│   │   │   └── celeryconfig.py
│   │   └── utils/
│   │       ├── audio.py              # ffmpeg 변환, librosa 분석 함수
│   │       └── seed.py               # 초기 데이터 (100문장, 어드민 계정)
│   ├── alembic/
│   │   └── versions/
│   ├── alembic.ini
│   ├── requirements.txt
│   └── Dockerfile
│
└── recordings/                       # Docker Volume 마운트
    └── {user_id}/
        └── {sentence_id}.wav
```

---

## API 엔드포인트 빠른 참조

```
Base URL: /api/v1

[인증 불필요]
POST /auth/register          회원가입
POST /auth/login             로그인 → JWT 발급

[로그인 사용자]
GET  /auth/me                내 정보
GET  /sentences/random       미녹음 랜덤 10문장 + 세션 생성
POST /recordings/upload      녹음 파일 업로드 (multipart)
POST /recordings/complete-session  세션 완료 → 포인트 지급
GET  /recordings/my          내 녹음 목록

[어드민 전용 — is_admin=True 필요]
GET/POST       /sentences              문장 목록 / 추가
PUT/DELETE     /sentences/{id}         문장 수정 / 비활성화
POST           /sentences/bulk-import  CSV 일괄 등록
GET            /recordings             전체 녹음 목록 (필터)
PATCH          /recordings/{id}/review 검수 결과 (accept/reject)
GET            /recordings/{id}/file   WAV 스트리밍
GET            /users                  사용자 목록
GET            /users/{id}             사용자 상세
PATCH          /users/{id}/points      포인트 수동 조정
GET            /stats/dashboard        대시보드 통계
GET            /stats/daily            일별 통계
GET            /stats/export/metadata  메타데이터 CSV 내보내기
GET/PUT        /settings/points-policy 포인트 정책 조회/수정
```

---

## DB 테이블 빠른 참조

```
users               — 회원 정보 + 화자 메타데이터 (성별/연령/지역/방언)
sentences           — 발화 문장 (is_active로 소프트 삭제)
recordings          — 녹음 데이터 (UNIQUE: user_id + sentence_id → 재녹음 덮어쓰기)
recording_sessions  — 세션 단위 진행 추적 + 포인트 지급 기록
system_config       — key-value 시스템 설정 (포인트 정책 등)
```

### 녹음 상태 흐름
```
pending → analyzed → accepted
                   ↘ rejected
  ↑업로드       ↑Celery분석   ↑어드민검수
```

---

## 어드민 페이지 구조

```
/admin/dashboard              📊 KPI + 14일 추이 + 실시간 피드
/admin/sentences              📝 문장 목록 + CRUD 모달
/admin/sentences/bulk-import  📥 CSV 일괄 등록
/admin/recordings             🎙 전체 녹음 목록 + 다중 필터
/admin/recordings/review      🔍 좌우 분할 검수 UI (키보드: A/R/Space)
/admin/users                  👥 사용자 목록
/admin/users/:id              👤 사용자 상세 + 포인트 조정
/admin/settings               ⚙️ 포인트 정책 / 데이터 내보내기
```

---

## SKILL.md 파일 맵 — 작업 유형별 참조 가이드

```
작업 유형                             읽어야 할 SKILL.md
─────────────────────────────────────────────────────────────────
프로젝트 전체 구조 파악          → feature/overview/SKILL.md
시스템 흐름 / API 목록 확인      → feature/architecture/SKILL.md
회원가입 / 로그인 구현           → feature/auth/SKILL.md
DB 테이블 / ORM 모델 작업        → feature/database/SKILL.md
녹음 UI / useRecorder 훅 작업    → feature/recording/SKILL.md
오디오 변환 / 품질 분석 작업     → feature/audio_processing/SKILL.md
어드민 API 로직 작업             → feature/admin/SKILL.md
어드민 UI 페이지 작업            → feature/admin_pages/SKILL.md
Docker / 배포 / Nginx 작업       → feature/docker/SKILL.md
```

### 복합 작업 시 다중 참조 예시

| 작업 내용 | 참조 파일 |
|---------|---------|
| 녹음 업로드 엔드포인트 추가 | `architecture` + `recording` + `audio_processing` |
| 어드민 검수 화면 개선 | `admin` + `admin_pages` |
| DB 스키마 변경 | `database` + `architecture` |
| Docker 환경 수정 | `docker` + `overview` |
| 신규 어드민 기능 추가 | `admin_pages` + `admin` + `database` |

---

## 공통 코딩 컨벤션

### Backend (Python / FastAPI)
```python
# 응답 포맷 — 항상 이 구조를 유지
{"success": True,  "data": {...}}           # 성공
{"success": False, "error": {"code": "...", "message": "..."}}  # 실패

# Dependency 패턴
get_current_user  → 로그인 사용자 요구
require_admin     → 어드민 권한 요구

# DB 세션
db: Session = Depends(get_db)  # 모든 라우터에서 동일하게 사용

# 파일 저장 경로
RECORDINGS_BASE = "/recordings"
path = f"{RECORDINGS_BASE}/{user_id}/{sentence_id}.wav"
```

### Frontend (React)
```javascript
// API 호출 — 항상 api 인스턴스 사용 (토큰 자동 첨부)
import { api } from '@/api'
const res = await api.get('/sentences/random')

// 인증 상태 — Zustand store
import { useAuthStore } from '@/store/authStore'
const { user, token, login, logout } = useAuthStore()

// 어드민 라우트 보호
<AdminRoute><AdminLayout /></AdminRoute>  // is_admin 체크 자동

// 에러 처리 — try/catch 필수, 업로드 실패 시 재시도 안내
```

### 파일 명명 규칙
```
React 컴포넌트: PascalCase.jsx       (RecordPage.jsx)
React 훅:       camelCase.js          (useRecorder.js)
Python 모듈:    snake_case.py         (audio_processing.py)
API 라우터:     snake_case.py         (sentences.py)
환경변수:       UPPER_SNAKE_CASE      (SECRET_KEY)
Docker 서비스:  kebab-case            (voicecollect-backend)
```

---

## 환경변수 목록

```bash
# .env (필수 — Git 제외)
DB_ROOT_PASSWORD=     # MySQL root 패스워드
DB_NAME=voicecollect
DB_USER=vcuser
DB_PASSWORD=          # MySQL 앱 계정 패스워드
SECRET_KEY=           # JWT 서명 키 (256bit 이상 랜덤)
ENVIRONMENT=          # development | production

# backend/app/core/config.py 에서 로딩
DATABASE_URL=mysql+pymysql://{DB_USER}:{DB_PASSWORD}@db:3306/{DB_NAME}
REDIS_URL=redis://redis:6379/0
RECORDINGS_BASE=/recordings
```

---

## 개발 시작 체크리스트

```bash
# 1. 환경변수 설정
cp .env.example .env && vi .env

# 2. 전체 빌드 및 실행
docker compose up -d --build

# 3. DB 마이그레이션 (최초 1회)
docker compose exec backend alembic upgrade head

# 4. 초기 데이터 투입 (문장 100개 + 어드민 계정)
docker compose exec backend python -m app.utils.seed

# 5. 동작 확인
curl http://localhost/api/v1/health
open http://localhost          # 사용자 화면
open http://localhost/admin    # 어드민 (admin / 초기패스워드)

# 6. 로그 확인
docker compose logs -f backend worker
```

---

## 주요 리스크 및 주의사항

| 항목 | 내용 |
|------|------|
| 브라우저 호환 | iOS Safari MediaRecorder 제한 → `getSupportedMimeType()` 함수로 자동 감지 |
| 파일 크기 | Nginx `client_max_body_size 50M` 설정 필수 |
| 경로 보안 | user_id, sentence_id는 DB 검증 정수만 사용 — 경로 traversal 방지 |
| ffmpeg | Backend Dockerfile에 `apt-get install -y ffmpeg` 필수 |
| 운영 배포 | MySQL 외부 포트(3306) docker-compose.yml에서 제거 |
| 개인정보 | 음성 데이터 = 생체정보 → 회원가입 시 수집 동의 필수 |
| 재녹음 | UPSERT 시 `ON DUPLICATE KEY UPDATE` — 이전 파일 즉시 덮어쓰기 |

---

## 버전 히스토리

| 버전 | 날짜 | 내용 |
|------|------|------|
| v1.0 | 2025-03 | 최초 설계 확정 (FastAPI + React + MySQL + Docker) |
| v1.1 | 2025-03 | 어드민 페이지 상세 설계 추가 (admin_pages SKILL.md) |
