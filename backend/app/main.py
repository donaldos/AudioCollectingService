from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.routers import auth, recordings, sentences
from app.routers import settings as settings_router
from app.routers import stats, users

app = FastAPI(
    title="VoiceCollect API",
    version="1.0.0",
    docs_url="/api/v1/docs",
    redoc_url="/api/v1/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(auth.router,            prefix="/api/v1/auth",       tags=["auth"])
app.include_router(sentences.router,       prefix="/api/v1/sentences",  tags=["sentences"])
app.include_router(recordings.router,      prefix="/api/v1/recordings", tags=["recordings"])
app.include_router(users.router,           prefix="/api/v1/users",      tags=["users"])
app.include_router(stats.router,           prefix="/api/v1/stats",      tags=["stats"])
app.include_router(settings_router.router, prefix="/api/v1/settings",   tags=["settings"])


@app.get("/api/v1/health")
def health_check():
    return {
        "success": True,
        "data": {
            "status": "ok",
            "environment": settings.ENVIRONMENT,
            "version": "1.0.0",
        },
    }
