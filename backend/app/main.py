from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from pathlib import Path

from app.config import settings
from app.routers import media, search

settings.UPLOAD_DIR.mkdir(exist_ok=True)
settings.HLS_DIR.mkdir(exist_ok=True)
settings.CHROMA_DB_DIR.mkdir(exist_ok=True)

limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title="Semantic Media Search",
    description="AI-native semantic search over audio/video — ChatGPT for media navigation",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(media.router)
app.include_router(search.router)

app.mount("/hls", StaticFiles(directory=str(settings.HLS_DIR)), name="hls")


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "version": "1.0.0",
        "whisper_model": settings.WHISPER_MODEL,
        "embedding_model": settings.EMBEDDING_MODEL,
        "max_file_size_gb": round(settings.MAX_FILE_SIZE / 1e9, 1)
    }
