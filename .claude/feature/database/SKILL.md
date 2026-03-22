# 03. 데이터베이스 (DATABASE)

## ERD 개요

```
users ──────────────────────┐
  │                         │
  │ 1:N                     │ 1:N
  ▼                         ▼
recordings ──── N:1 ──── sentences
```

---

## 테이블 정의

### 1. users (회원 테이블)

```sql
CREATE TABLE users (
    id              INT             NOT NULL AUTO_INCREMENT,
    username        VARCHAR(20)     NOT NULL UNIQUE,
    password_hash   VARCHAR(255)    NOT NULL,
    name            VARCHAR(50)     NOT NULL,
    email           VARCHAR(100)    NOT NULL UNIQUE,
    
    -- 화자 메타데이터
    gender          ENUM('male','female','other')                            NOT NULL,
    age_group       ENUM('10s','20s','30s','40s','50s','60s_above')         NOT NULL,
    region          VARCHAR(50)     NOT NULL,  -- 시/도 단위 (예: 서울특별시)
    dialect         ENUM('standard','gyeonggi','chungcheong','jeolla',
                         'gyeongsang','gangwon','jeju','other')              NOT NULL,
    
    -- 시스템 필드
    points          INT             NOT NULL DEFAULT 0,
    is_admin        TINYINT(1)      NOT NULL DEFAULT 0,
    privacy_agreed  TINYINT(1)      NOT NULL DEFAULT 0,
    is_active       TINYINT(1)      NOT NULL DEFAULT 1,
    
    created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    PRIMARY KEY (id),
    INDEX idx_username (username),
    INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 2. sentences (문장 테이블)

```sql
CREATE TABLE sentences (
    id          INT             NOT NULL AUTO_INCREMENT,
    text        TEXT            NOT NULL,           -- 발화 문장 원문
    category    VARCHAR(50)     NULL DEFAULT NULL,  -- 도메인 분류 (확장용)
    language    VARCHAR(10)     NOT NULL DEFAULT 'ko',  -- 언어 코드 (확장용)
    is_active   TINYINT(1)      NOT NULL DEFAULT 1, -- 0: 비활성화 (삭제 대신 사용)
    
    created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    PRIMARY KEY (id),
    INDEX idx_is_active (is_active),
    INDEX idx_category (category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 3. recordings (녹음 데이터 테이블)

```sql
CREATE TABLE recordings (
    id              INT             NOT NULL AUTO_INCREMENT,
    user_id         INT             NOT NULL,
    sentence_id     INT             NOT NULL,
    
    -- 파일 정보
    file_path       VARCHAR(500)    NOT NULL,   -- recordings/{user_id}/{sentence_id}.wav
    file_size       INT             NULL,        -- bytes
    
    -- 음성 품질 지표 (Celery 분석 후 업데이트)
    snr             FLOAT           NULL,        -- Signal-to-Noise Ratio (dB)
    energy          FLOAT           NULL,        -- RMS Energy
    duration        FLOAT           NULL,        -- 발화 길이 (초)
    
    -- 상태 관리
    status          ENUM('pending','analyzed','accepted','rejected')
                                    NOT NULL DEFAULT 'pending',
    -- pending: 업로드 완료, 분석 대기
    -- analyzed: SNR/Energy/Duration 분석 완료, 어드민 검수 대기
    -- accepted: 어드민 승인 완료
    -- rejected: 어드민 거부

    review_note     TEXT            NULL,        -- 어드민 검수 메모
    reviewed_by     INT             NULL,        -- 검수한 어드민 user_id
    reviewed_at     DATETIME        NULL,
    
    created_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    PRIMARY KEY (id),
    
    -- 재녹음 정책: user_id + sentence_id 조합은 항상 최신 1건만 유지
    -- → 업로드 시 UPSERT (ON DUPLICATE KEY UPDATE) 사용
    UNIQUE KEY uq_user_sentence (user_id, sentence_id),
    
    INDEX idx_user_id (user_id),
    INDEX idx_sentence_id (sentence_id),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at),
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (sentence_id) REFERENCES sentences(id) ON DELETE RESTRICT,
    FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### 4. recording_sessions (세션 추적 테이블, 포인트 관리)

```sql
CREATE TABLE recording_sessions (
    id              INT             NOT NULL AUTO_INCREMENT,
    user_id         INT             NOT NULL,
    sentence_ids    JSON            NOT NULL,   -- 해당 세션에서 제시된 10문장 ID 배열
    completed_count INT             NOT NULL DEFAULT 0,  -- 완료된 문장 수
    points_awarded  INT             NOT NULL DEFAULT 0,  -- 지급된 포인트
    is_completed    TINYINT(1)      NOT NULL DEFAULT 0,  -- 10문장 모두 완료 여부
    
    started_at      DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at    DATETIME        NULL,
    
    PRIMARY KEY (id),
    INDEX idx_user_id (user_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## SQLAlchemy ORM 모델

```python
# backend/app/models/user.py
from sqlalchemy import Column, Integer, String, Enum, Boolean, DateTime, func
from app.core.database import Base
import enum

class GenderEnum(str, enum.Enum):
    male = "male"
    female = "female"
    other = "other"

class AgeGroupEnum(str, enum.Enum):
    teens = "10s"
    twenties = "20s"
    thirties = "30s"
    forties = "40s"
    fifties = "50s"
    sixties_above = "60s_above"

class User(Base):
    __tablename__ = "users"
    
    id            = Column(Integer, primary_key=True, autoincrement=True)
    username      = Column(String(20), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    name          = Column(String(50), nullable=False)
    email         = Column(String(100), unique=True, nullable=False)
    gender        = Column(Enum(GenderEnum), nullable=False)
    age_group     = Column(Enum(AgeGroupEnum), nullable=False)
    region        = Column(String(50), nullable=False)
    dialect       = Column(String(20), nullable=False)
    points        = Column(Integer, default=0, nullable=False)
    is_admin      = Column(Boolean, default=False, nullable=False)
    privacy_agreed= Column(Boolean, default=False, nullable=False)
    is_active     = Column(Boolean, default=True, nullable=False)
    created_at    = Column(DateTime, server_default=func.now())
    updated_at    = Column(DateTime, server_default=func.now(), onupdate=func.now())


# backend/app/models/recording.py
from sqlalchemy import Column, Integer, Float, String, Enum, Text, DateTime, ForeignKey, func
import enum

class RecordingStatus(str, enum.Enum):
    pending  = "pending"
    analyzed = "analyzed"
    accepted = "accepted"
    rejected = "rejected"

class Recording(Base):
    __tablename__ = "recordings"
    
    id           = Column(Integer, primary_key=True, autoincrement=True)
    user_id      = Column(Integer, ForeignKey("users.id"), nullable=False)
    sentence_id  = Column(Integer, ForeignKey("sentences.id"), nullable=False)
    file_path    = Column(String(500), nullable=False)
    file_size    = Column(Integer, nullable=True)
    snr          = Column(Float, nullable=True)
    energy       = Column(Float, nullable=True)
    duration     = Column(Float, nullable=True)
    status       = Column(Enum(RecordingStatus), default=RecordingStatus.pending)
    review_note  = Column(Text, nullable=True)
    reviewed_by  = Column(Integer, ForeignKey("users.id"), nullable=True)
    reviewed_at  = Column(DateTime, nullable=True)
    created_at   = Column(DateTime, server_default=func.now())
    updated_at   = Column(DateTime, server_default=func.now(), onupdate=func.now())
```

---

## Alembic 마이그레이션 설정

```bash
# 초기 설정
cd backend
alembic init alembic

# alembic.ini 수정
# sqlalchemy.url = mysql+pymysql://user:pass@db:3306/voicecollect

# 마이그레이션 생성
alembic revision --autogenerate -m "initial tables"

# 마이그레이션 실행
alembic upgrade head
```

---

## 주요 쿼리 패턴

### 미녹음 문장 랜덤 추출
```python
# user_id가 아직 녹음하지 않은 활성 문장 중 랜덤 10개 추출
from sqlalchemy import func, not_, select

already_recorded = (
    db.query(Recording.sentence_id)
    .filter(Recording.user_id == user_id)
    .subquery()
)

sentences = (
    db.query(Sentence)
    .filter(Sentence.is_active == True)
    .filter(not_(Sentence.id.in_(select(already_recorded))))
    .order_by(func.rand())
    .limit(10)
    .all()
)

# 100문장 모두 완료한 경우: 전체 문장에서 랜덤 추출 (재도전 허용)
if len(sentences) < 10:
    sentences = (
        db.query(Sentence)
        .filter(Sentence.is_active == True)
        .order_by(func.rand())
        .limit(10)
        .all()
    )
```

### 녹음 UPSERT (재녹음 처리)
```python
# INSERT ... ON DUPLICATE KEY UPDATE (user_id + sentence_id 유니크 제약 활용)
from sqlalchemy.dialects.mysql import insert

stmt = insert(Recording).values(
    user_id=user_id,
    sentence_id=sentence_id,
    file_path=file_path,
    file_size=file_size,
    status='pending',
    snr=None, energy=None, duration=None
)
stmt = stmt.on_duplicate_key_update(
    file_path=stmt.inserted.file_path,
    file_size=stmt.inserted.file_size,
    status='pending',
    snr=None, energy=None, duration=None,
    updated_at=func.now()
)
db.execute(stmt)
db.commit()
```

---

## 초기 데이터 (Seed)

```python
# backend/app/utils/seed.py
SAMPLE_SENTENCES = [
    "오늘 날씨가 참 맑고 따뜻하네요.",
    "저는 매일 아침 커피 한 잔으로 하루를 시작합니다.",
    # ... 100개 문장
]

def seed_sentences(db: Session):
    for text in SAMPLE_SENTENCES:
        if not db.query(Sentence).filter(Sentence.text == text).first():
            db.add(Sentence(text=text))
    db.commit()

# 어드민 계정 생성
def seed_admin(db: Session):
    from app.core.security import hash_password
    admin = User(
        username="admin",
        password_hash=hash_password("admin_password_change_me"),
        name="관리자",
        email="admin@voicecollect.com",
        gender="other",
        age_group="30s",
        region="서울특별시",
        dialect="standard",
        is_admin=True,
        privacy_agreed=True
    )
    db.add(admin)
    db.commit()
```
