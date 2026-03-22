from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "mysql+pymysql://vcuser:vcpassword@db:3306/voicecollect"
    SECRET_KEY: str = "change-me-in-production"
    REDIS_URL: str = "redis://redis:6379/0"
    RECORDINGS_BASE: str = "/recordings"
    ENVIRONMENT: str = "development"

    class Config:
        env_file = ".env"


settings = Settings()
