# 02. 인증 (AUTH)

## 인증 방식
- **방식**: ID/Password + JWT (HS256)
- **Access Token 유효시간**: 24시간
- **저장 위치**: 클라이언트 localStorage (또는 메모리)
- **갱신**: 만료 시 재로그인

---

## 회원가입 (Register)

### 수집 항목

| 필드 | 타입 | 필수 | 설명 |
|------|------|------|------|
| username | string | ✅ | 영문+숫자 4~20자, 중복 불가 |
| password | string | ✅ | 8자 이상, bcrypt 해싱 저장 |
| name | string | ✅ | 실명 또는 닉네임 |
| email | string | ✅ | 이메일 형식, 중복 불가 |
| gender | enum | ✅ | 'male' \| 'female' \| 'other' |
| age_group | enum | ✅ | '10s'\|'20s'\|'30s'\|'40s'\|'50s'\|'60s_above' |
| region | string | ✅ | 거주지역 (시/도 단위) |
| dialect | enum | ✅ | 'standard'\|'gyeonggi'\|'chungcheong'\|'jeolla'\|'gyeongsang'\|'gangwon'\|'jeju'\|'other' |
| privacy_agreed | boolean | ✅ | 개인정보 수집·이용 동의 |

### API
```
POST /api/v1/auth/register
Content-Type: application/json

{
  "username": "john123",
  "password": "securepass!1",
  "name": "김철수",
  "email": "john@example.com",
  "gender": "male",
  "age_group": "30s",
  "region": "서울특별시",
  "dialect": "standard",
  "privacy_agreed": true
}
```

### 응답
```json
{
  "success": true,
  "data": {
    "user_id": 42,
    "username": "john123",
    "message": "회원가입이 완료되었습니다"
  }
}
```

### FastAPI 구현 (핵심 로직)
```python
# backend/app/routers/auth.py
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from app.core.security import hash_password, create_access_token
from app.core.database import get_db
from app.models.user import User
from app.schemas.auth import RegisterRequest

router = APIRouter()

@router.post("/register")
async def register(req: RegisterRequest, db: Session = Depends(get_db)):
    # 중복 체크
    if db.query(User).filter(User.username == req.username).first():
        raise HTTPException(400, "이미 사용 중인 아이디입니다")
    if db.query(User).filter(User.email == req.email).first():
        raise HTTPException(400, "이미 사용 중인 이메일입니다")
    
    user = User(
        username=req.username,
        password_hash=hash_password(req.password),
        name=req.name,
        email=req.email,
        gender=req.gender,
        age_group=req.age_group,
        region=req.region,
        dialect=req.dialect,
        privacy_agreed=req.privacy_agreed,
    )
    db.add(user)
    db.commit()
    return {"success": True, "data": {"user_id": user.id, "username": user.username}}
```

---

## 로그인 (Login)

### API
```
POST /api/v1/auth/login
Content-Type: application/json

{
  "username": "john123",
  "password": "securepass!1"
}
```

### 응답
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGci...",
    "token_type": "bearer",
    "user": {
      "id": 42,
      "username": "john123",
      "name": "김철수",
      "is_admin": false,
      "points": 30
    }
  }
}
```

### FastAPI 구현
```python
@router.post("/login")
async def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == req.username).first()
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(401, "아이디 또는 비밀번호가 올바르지 않습니다")
    
    token = create_access_token(data={"sub": str(user.id), "is_admin": user.is_admin})
    return {
        "success": True,
        "data": {
            "access_token": token,
            "token_type": "bearer",
            "user": {
                "id": user.id,
                "username": user.username,
                "name": user.name,
                "is_admin": user.is_admin,
                "points": user.points
            }
        }
    }
```

---

## JWT 핵심 유틸 (security.py)

```python
# backend/app/core/security.py
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

SECRET_KEY = "your-secret-key-from-env"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
bearer_scheme = HTTPBearer()

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

def create_access_token(data: dict) -> str:
    payload = data.copy()
    payload["exp"] = datetime.utcnow() + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db)
) -> User:
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = int(payload["sub"])
    except JWTError:
        raise HTTPException(401, "유효하지 않은 토큰입니다")
    
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(401, "사용자를 찾을 수 없습니다")
    return user

def require_admin(current_user: User = Depends(get_current_user)) -> User:
    if not current_user.is_admin:
        raise HTTPException(403, "관리자 권한이 필요합니다")
    return current_user
```

---

## React 인증 상태 관리 (Zustand)

```javascript
// frontend/src/store/authStore.js
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useAuthStore = create(
  persist(
    (set) => ({
      token: null,
      user: null,
      isAuthenticated: false,

      login: (token, user) => set({ token, user, isAuthenticated: true }),
      logout: () => set({ token: null, user: null, isAuthenticated: false }),
      updatePoints: (points) => set((state) => ({
        user: { ...state.user, points }
      })),
    }),
    { name: 'auth-storage' }
  )
)
```

---

## 회원가입 UI 플로우

```
1단계: 기본 정보
  ├── 아이디 (실시간 중복확인)
  ├── 비밀번호 / 확인
  └── 이름, 이메일

2단계: 화자 정보
  ├── 성별 (라디오)
  ├── 연령대 (select)
  ├── 거주지역 (시/도 select)
  └── 방언 (select)

3단계: 약관 동의
  ├── [필수] 개인정보 수집·이용 동의 (전문 보기 링크)
  └── 가입 완료 버튼
```

---

## 개인정보 처리 안내 (필수 표시 항목)

회원가입 화면에 반드시 포함해야 할 내용:

```
수집 항목: 아이디, 이름, 이메일, 성별, 연령대, 거주지역, 음성 녹음 데이터
수집 목적: AI 학습용 음성 데이터셋 구축
보유 기간: 회원 탈퇴 시까지 (음성 데이터는 납품 후 별도 고지)
제3자 제공: AI 데이터셋 납품 시 발화 내용 및 메타데이터 포함될 수 있음
```
