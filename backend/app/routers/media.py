import asyncio
from pathlib import Path
from uuid import uuid4
from typing import Optional
from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks, Depends
from fastapi.responses import StreamingResponse, FileResponse
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.config import settings
from app.models import (
    MediaUploadResponse, MediaListResponse, MediaMetadata,
    TranscriptSegment, SemanticChunk, URLIngestRequest
)
from app.services.pipeline import (
    registry, process_media_pipeline, progress_stream,
    validate_media, download_url
)
from app.services.vector_store import delete_media_chunks
from app.services.bm25_search import delete_bm25_index
from app.services.hls import get_hls_path

router = APIRouter(prefix="/media", tags=["media"])
limiter = Limiter(key_func=get_remote_address)


@router.post("/upload", response_model=MediaUploadResponse)
@limiter.limit(f"{settings.RATE_LIMIT_PER_MINUTE}/minute")
async def upload_media(
    request: UploadFile = File(...),
    background_tasks: BackgroundTasks = Depends()
):
    """Upload media file for processing."""
    if not request.content_type or not request.content_type.startswith(("video/", "audio/")):
        raise HTTPException(400, "File must be video or audio")
    
    # Check file size
    if request.size and request.size > settings.MAX_FILE_SIZE:
        raise HTTPException(413, f"File too large. Maximum size: {settings.MAX_FILE_SIZE / 1e9:.1f}GB")
    
    media_id = str(uuid4())
    file_ext = Path(request.filename or "unknown").suffix
    file_path = settings.UPLOAD_DIR / f"{media_id}{file_ext}"
    
    # Save uploaded file
    settings.UPLOAD_DIR.mkdir(exist_ok=True)
    with open(file_path, "wb") as f:
        content = await request.read()
        f.write(content)
    
    # Create job
    job_id = registry.create_job(media_id, request.filename or "unknown")
    
    # Start processing in background
    background_tasks.add_task(
        process_media_pipeline, job_id, media_id, file_path, request.filename or "unknown"
    )
    
    return MediaUploadResponse(
        media_id=media_id,
        job_id=job_id,
        filename=request.filename or "unknown",
        status="processing"
    )


@router.post("/ingest-url", response_model=MediaUploadResponse)
@limiter.limit(f"{settings.RATE_LIMIT_PER_MINUTE}/minute")
async def ingest_url(
    request: URLIngestRequest,
    background_tasks: BackgroundTasks = Depends()
):
    """Ingest media from URL (YouTube, HLS streams, CDN links)."""
    media_id = str(uuid4())
    filename = request.filename or f"url_media_{media_id[:8]}.mp4"
    file_path = settings.UPLOAD_DIR / f"{media_id}.mp4"
    
    settings.UPLOAD_DIR.mkdir(exist_ok=True)
    
    # Create job
    job_id = registry.create_job(media_id, filename)
    
    # Download and process in background
    async def download_and_process():
        try:
            await registry.update_progress(job_id, "uploading", 0.0, "Downloading from URL...")
            await download_url(request.url, file_path)
            await process_media_pipeline(job_id, media_id, file_path, filename)
        except Exception as e:
            registry.fail_job(job_id, str(e))
    
    background_tasks.add_task(download_and_process)
    
    return MediaUploadResponse(
        media_id=media_id,
        job_id=job_id,
        filename=filename,
        status="processing"
    )


@router.get("/status/{job_id}")
async def get_status(job_id: str):
    """Get processing status for a job."""
    job = registry.get_job(job_id)
    if not job:
        raise HTTPException(404, "Job not found")
    
    return job


@router.get("/progress/{job_id}")
async def stream_progress(job_id: str):
    """SSE stream of processing progress."""
    job = registry.get_job(job_id)
    if not job:
        raise HTTPException(404, "Job not found")
    
    return StreamingResponse(
        progress_stream(job_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


@router.get("/list", response_model=MediaListResponse)
async def list_media():
    """List all processed media."""
    items = registry.get_all_media()
    return MediaListResponse(items=items, total=len(items))


@router.get("/{media_id}", response_model=MediaMetadata)
async def get_media(media_id: str):
    """Get media metadata."""
    metadata = registry.get_media(media_id)
    if not metadata:
        raise HTTPException(404, "Media not found")
    return metadata


@router.get("/{media_id}/transcript", response_model=list[TranscriptSegment])
async def get_transcript(media_id: str):
    """Get transcript segments for media."""
    if not registry.get_media(media_id):
        raise HTTPException(404, "Media not found")
    return registry.get_transcript(media_id)


@router.get("/{media_id}/chunks", response_model=list[SemanticChunk])
async def get_chunks(media_id: str):
    """Get semantic chunks for media."""
    if not registry.get_media(media_id):
        raise HTTPException(404, "Media not found")
    return registry.get_chunks(media_id)


@router.get("/{media_id}/hls/{filename}")
async def serve_hls(media_id: str, filename: str):
    """Serve HLS stream files."""
    hls_dir = settings.HLS_DIR / media_id
    file_path = hls_dir / filename
    
    if not file_path.exists():
        raise HTTPException(404, "HLS file not found")
    
    content_type = "application/vnd.apple.mpegurl" if filename.endswith(".m3u8") else "video/mp2t"
    return FileResponse(file_path, media_type=content_type)


@router.delete("/{media_id}")
async def delete_media(media_id: str):
    """Delete media and all associated data."""
    if not registry.get_media(media_id):
        raise HTTPException(404, "Media not found")
    
    # Delete from vector store
    delete_media_chunks(media_id)
    
    # Delete from BM25 index
    delete_bm25_index(media_id)
    
    # Delete HLS files
    hls_dir = settings.HLS_DIR / media_id
    if hls_dir.exists():
        import shutil
        shutil.rmtree(hls_dir)
    
    # Delete from registry
    registry.delete_media(media_id)
    
    return {"status": "deleted"}
