from pydantic import BaseModel, EmailStr, field_validator

from app.models.user import AgeGroupEnum, DialectEnum, GenderEnum


class RegisterRequest(BaseModel):
    username: str
    password: str
    name: str
    email: EmailStr
    gender: GenderEnum
    age_group: AgeGroupEnum
    region: str
    dialect: DialectEnum
    privacy_agreed: bool

    @field_validator("username")
    @classmethod
    def username_valid(cls, v: str) -> str:
        if not 4 <= len(v) <= 20:
            raise ValueError("아이디는 4~20자여야 합니다")
        if not v.isalnum():
            raise ValueError("아이디는 영문과 숫자만 사용 가능합니다")
        return v

    @field_validator("password")
    @classmethod
    def password_valid(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("비밀번호는 8자 이상이어야 합니다")
        return v

    @field_validator("privacy_agreed")
    @classmethod
    def must_agree(cls, v: bool) -> bool:
        if not v:
            raise ValueError("개인정보 수집·이용에 동의해야 합니다")
        return v


class LoginRequest(BaseModel):
    username: str
    password: str


class UserOut(BaseModel):
    id: int
    username: str
    name: str
    email: str
    gender: str
    age_group: str
    region: str
    dialect: str
    points: int
    is_admin: bool

    model_config = {"from_attributes": True}
