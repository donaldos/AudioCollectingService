from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import create_access_token, get_current_user, hash_password, verify_password
from app.models.user import User
from app.schemas.auth import LoginRequest, RegisterRequest, UserOut

router = APIRouter()


@router.post("/register")
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    if db.query(User).filter(User.username == req.username).first():
        raise HTTPException(status_code=400, detail="이미 사용 중인 아이디입니다")
    if db.query(User).filter(User.email == req.email).first():
        raise HTTPException(status_code=400, detail="이미 사용 중인 이메일입니다")

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
    db.refresh(user)

    return {
        "success": True,
        "data": {
            "user_id": user.id,
            "username": user.username,
            "message": "회원가입이 완료되었습니다",
        },
    }


@router.post("/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == req.username, User.is_active == True).first()
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="아이디 또는 비밀번호가 올바르지 않습니다")

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
                "points": user.points,
            },
        },
    }


@router.get("/me", response_model=None)
def me(current_user: User = Depends(get_current_user)):
    return {
        "success": True,
        "data": UserOut.model_validate(current_user),
    }
