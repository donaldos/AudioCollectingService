# 01. 시스템 아키텍처 (ARCHITECTURE)

## 전체 아키텍처 다이어그램

```
┌─────────────────────────────────────────────────────────┐
│                      Docker Compose                      │
│                                                         │
│  ┌──────────┐    ┌──────────┐    ┌──────────────────┐  │
│  │  Nginx   │───▶│ Frontend │    │     Backend       │  │
│  │ :80/:443 │    │  React   │───▶│    FastAPI        │  │
│  └──────────┘    │  :5173   │    │    :8000          │  │
│        │         └──────────┘    └────────┬─────────┘  │
│        │                                  │            │
│        └──────────────────────────────────┘            │
│                                           │            │
│                              ┌────────────▼──────────┐ │
│                              │       MySQL 8.0        │ │
│                              │       :3306            │ │
│                              └───────────────────────┘ │
│                                           │            │
│                              ┌────────────▼──────────┐ │
│                              │   Celery Worker        │ │
│                              │  (오디오 비동기 분석)   │ │
│                              └────────────┬──────────┘ │
│                                           │            │
│                              ┌────────────▼──────────┐ │
│                              │        Redis           │ │
│                              │   (Celery 브로커)      │ │
│                              └───────────────────────┘ │
│                                                        │
│  Volume: ./recordings ──▶ /recordings (WAV 파일)       │
└────────────────────────────────────────────────────────┘
```

---

## 요청 흐름 (Request Flow)

### 일반 API 요청
```
Browser → Nginx(:80) → FastAPI(:8000) → MySQL → Response
```

### 녹음 업로드 흐름
```
Browser
  │ 1. WebM Blob POST /api/recordings/upload
  ▼
FastAPI
  │ 2. WebM 파일 임시 저장
  │ 3. recordings/{user_id}/{sentence_id}.wav 경로 생성
  │ 4. DB recording 레코드 INSERT (status='pending')
  │ 5. Celery 태스크 큐에 분석 작업 Push
  ▼
Response: { recording_id, status: "pending" }

  [비동기]
Celery Worker
  │ 6. ffmpeg: WebM → WAV 16kHz mono 변환
  │ 7. librosa: SNR, Energy, Duration 계산
  │ 8. DB UPDATE recordings SET snr=?, energy=?, duration=?, status='done'
  ▼
완료 (어드민 검수 대기)
```

---

## API 설계 원칙

### Base URL
```
/api/v1/
```

### 인증 헤더
```
Authorization: Bearer <JWT_TOKEN>
```

### 공통 응답 포맷
```json
{
  "success": true,
  "data": { ... },
  "message": "처리 완료"
}
```

### 에러 응답 포맷
```json
{
  "success": false,
  "error": {
    "code": "INVALID_TOKEN",
    "message": "인증 토큰이 유효하지 않습니다"
  }
}
```

---

## API 엔드포인트 전체 목록

### Auth
| Method | Path | 설명 | 인증 |
|--------|------|------|------|
| POST | `/api/v1/auth/register` | 회원가입 | ❌ |
| POST | `/api/v1/auth/login` | 로그인 → JWT 발급 | ❌ |
| GET | `/api/v1/auth/me` | 내 정보 조회 | ✅ |

### Sentences
| Method | Path | 설명 | 인증 |
|--------|------|------|------|
| GET | `/api/v1/sentences/random` | 미녹음 랜덤 10문장 추출 | ✅ |
| GET | `/api/v1/sentences` | 전체 문장 목록 (어드민) | ✅ Admin |
| POST | `/api/v1/sentences` | 문장 추가 (어드민) | ✅ Admin |
| PUT | `/api/v1/sentences/{id}` | 문장 수정 (어드민) | ✅ Admin |
| DELETE | `/api/v1/sentences/{id}` | 문장 비활성화 (어드민) | ✅ Admin |

### Recordings
| Method | Path | 설명 | 인증 |
|--------|------|------|------|
| POST | `/api/v1/recordings/upload` | 녹음 파일 업로드 | ✅ |
| GET | `/api/v1/recordings/my` | 내 녹음 목록 | ✅ |
| GET | `/api/v1/recordings` | 전체 녹음 목록 (어드민) | ✅ Admin |
| PATCH | `/api/v1/recordings/{id}/review` | 검수 결과 업데이트 | ✅ Admin |
| GET | `/api/v1/recordings/{id}/file` | WAV 파일 스트리밍 | ✅ Admin |

### Users (어드민)
| Method | Path | 설명 | 인증 |
|--------|------|------|------|
| GET | `/api/v1/users` | 전체 사용자 목록 | ✅ Admin |
| GET | `/api/v1/users/{id}` | 사용자 상세 | ✅ Admin |
| PATCH | `/api/v1/users/{id}/points` | 포인트 수동 조정 | ✅ Admin |

### Statistics (어드민)
| Method | Path | 설명 | 인증 |
|--------|------|------|------|
| GET | `/api/v1/stats/dashboard` | 대시보드 통계 | ✅ Admin |
| GET | `/api/v1/stats/daily` | 일별 녹음 현황 | ✅ Admin |

---

## FastAPI 프로젝트 구조 상세

```python
# backend/app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import auth, sentences, recordings, users, stats

app = FastAPI(title="VoiceCollect API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "https://yourdomain.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router,       prefix="/api/v1/auth")
app.include_router(sentences.router,  prefix="/api/v1/sentences")
app.include_router(recordings.router, prefix="/api/v1/recordings")
app.include_router(users.router,      prefix="/api/v1/users")
app.include_router(stats.router,      prefix="/api/v1/stats")
```

---

## 파일 저장소 구조

```
/recordings/                         ← Docker Volume 마운트
├── {user_id}/                       ← 사용자 ID 디렉토리
│   ├── {sentence_id}.wav            ← 최종 WAV (재녹음 시 덮어쓰기)
│   ├── {sentence_id}_temp.webm      ← 변환 전 임시 파일 (변환 후 삭제)
│   └── ...
└── ...
```

### 파일 명명 규칙
- 경로: `recordings/{user_id}/{sentence_id}.wav`
- 재녹음 시: 동일 경로로 덮어쓰기 (이전 파일 자동 교체)
- 임시파일: 변환 완료 즉시 삭제

---

## 보안 고려사항

1. **파일 업로드 제한**
   - 최대 파일 크기: 50MB
   - 허용 MIME: `audio/webm`, `audio/ogg`, `audio/wav`

2. **경로 traversal 방지**
   - user_id, sentence_id는 DB에서 검증된 정수값만 사용
   - 직접 경로 조작 불가

3. **JWT 만료 시간**
   - Access Token: 24시간
   - 갱신: 재로그인 방식 (Refresh Token 미사용)

4. **어드민 권한**
   - DB users.is_admin = True 인 사용자만 어드민 API 접근
   - FastAPI Dependency로 권한 체크
