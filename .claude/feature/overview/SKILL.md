# 00. 프로젝트 개요 (PROJECT OVERVIEW)

## 프로젝트명
**VoiceCollect** — 음성 데이터 수집 플랫폼

## 목적
AI 학습용 음성 데이터를 크라우드소싱 방식으로 수집하는 웹 플랫폼.
참여자가 제시된 문장을 녹음하고, 서버에서 품질 지표를 분석하여 데이터셋을 구축한다.

---

## 확정 기술 스택

| 레이어 | 기술 | 버전 |
|--------|------|------|
| Frontend | React (Vite) | React 18 + Vite 5 |
| Backend | FastAPI | 0.111+ |
| Database | MySQL | 8.0 |
| ORM | SQLAlchemy + Alembic | 2.x |
| 인증 | bcrypt + JWT (HS256) | python-jose |
| 오디오 분석 | librosa, soundfile, ffmpeg-python | 최신 |
| 비동기 처리 | Celery + Redis | Celery 5.x |
| 배포 | Docker Compose | v2 |
| 리버스 프록시 | Nginx | 1.25 |

---

## 핵심 정책 결정 사항

| 항목 | 결정 |
|------|------|
| 재녹음 | ✅ 허용 — 같은 문장 덮어쓰기 |
| 화자 메타데이터 | 성별, 연령대, 거주지역/방언 |
| 어드민 기능 | 통계 대시보드, 문장 CRUD, 품질 검수(accept/reject) |
| 무효 녹음 필터 | 어드민 수동 검수 (자동 reject 없음) |
| 녹음 포맷 | 브라우저 WebM → 서버 변환 → WAV 16kHz mono 저장 |
| SNR/Energy/Duration | 서버사이드 Celery Worker에서 비동기 분석 |
| 문장 추출 | 100문장 중 미녹음 문장 우선, 랜덤 10문장 |
| 포인트 | 세션 완료(10문장) 시 누적, 마이페이지 표시 |

---

## 디렉토리 구조

```
voicecollect/
├── docker-compose.yml
├── .env
├── frontend/                    # React (Vite)
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Auth/           # 로그인, 회원가입
│   │   │   ├── Record/         # 녹음 슬라이드
│   │   │   ├── MyPage/         # 포인트, 진행현황
│   │   │   └── Admin/          # 어드민
│   │   ├── components/
│   │   ├── hooks/
│   │   │   └── useRecorder.js  # MediaRecorder 훅
│   │   ├── api/                # axios 인스턴스
│   │   └── store/              # Zustand 상태관리
│   └── nginx.conf
├── backend/                     # FastAPI
│   ├── app/
│   │   ├── main.py
│   │   ├── core/
│   │   │   ├── config.py       # 환경설정
│   │   │   ├── security.py     # JWT, bcrypt
│   │   │   └── database.py     # SQLAlchemy 엔진
│   │   ├── models/             # ORM 모델
│   │   ├── schemas/            # Pydantic 스키마
│   │   ├── routers/            # API 라우터
│   │   ├── services/           # 비즈니스 로직
│   │   ├── tasks/              # Celery 태스크
│   │   └── utils/
│   │       └── audio.py        # 오디오 처리 유틸
│   ├── alembic/                # DB 마이그레이션
│   ├── requirements.txt
│   └── Dockerfile
├── recordings/                  # 녹음 파일 저장소
│   └── {user_id}/
│       └── {sentence_id}.wav
└── nginx/
    └── nginx.conf
```

---

## SKILL.md 파일 목록

| 파일 | 담당 영역 |
|------|---------|
| `00_PROJECT_OVERVIEW.md` | 전체 구조, 기술스택, 정책 (이 파일) |
| `01_ARCHITECTURE.md` | 시스템 아키텍처, API 설계 원칙, Docker 구성 |
| `02_AUTH.md` | 회원가입, 로그인, JWT, 화자 메타데이터 |
| `03_DATABASE.md` | ERD, 테이블 정의, Alembic 마이그레이션 |
| `04_RECORDING.md` | 녹음 UI 슬라이드, 문장 추출 로직, 진행 상태 |
| `05_AUDIO_PROCESSING.md` | WebM→WAV 변환, SNR/Energy/Duration 분석, Celery |
| `06_ADMIN.md` | 어드민 대시보드, 품질 검수, 문장 CRUD |
| `07_DOCKER.md` | Docker Compose 전체 구성, 환경변수, 배포 절차 |
