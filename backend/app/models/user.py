import enum

from sqlalchemy import Boolean, Column, DateTime, Enum, Integer, String, func

from app.core.database import Base


def enum_values(enum_class):
    """SQLAlchemy Enum 컬럼이 Python enum.name 대신 enum.value를 DB에 저장하도록 함"""
    return [e.value for e in enum_class]


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


class DialectEnum(str, enum.Enum):
    standard = "standard"
    gyeonggi = "gyeonggi"
    chungcheong = "chungcheong"
    jeolla = "jeolla"
    gyeongsang = "gyeongsang"
    gangwon = "gangwon"
    jeju = "jeju"
    other = "other"


class User(Base):
    __tablename__ = "users"

    id            = Column(Integer, primary_key=True, autoincrement=True)
    username      = Column(String(20), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    name          = Column(String(50), nullable=False)
    email         = Column(String(100), unique=True, nullable=False, index=True)

    # 화자 메타데이터
    # Python enum name("thirties") 대신 value("30s")를 DB에 저장하기 위해 values_callable 사용
    gender    = Column(Enum(GenderEnum,   values_callable=enum_values), nullable=False)
    age_group = Column(Enum(AgeGroupEnum, values_callable=enum_values), nullable=False)
    region    = Column(String(50), nullable=False)
    dialect   = Column(Enum(DialectEnum,  values_callable=enum_values), nullable=False)

    # 시스템 필드
    points        = Column(Integer, default=0, nullable=False)
    is_admin      = Column(Boolean, default=False, nullable=False)
    privacy_agreed= Column(Boolean, default=False, nullable=False)
    is_active     = Column(Boolean, default=True, nullable=False)

    created_at    = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at    = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)
