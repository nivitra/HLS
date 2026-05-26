import asyncio
import json
import subprocess
from pathlib import Path
from typing import Dict, Optional, AsyncGenerator, List
from datetime import datetime
from uuid import uuid4
import aiohttp
import shutil

from app.config import settings
from app.models import (
    ProcessingStage, ProcessingProgress, MediaMetadata,
    TranscriptSegment, SemanticChunk, MediaStatus
)
from app.services.transcription import transcribe_audio
from app.services.chunking import create_semantic_chunks
from app.services.embeddings import generate_embeddings
from app.services.vector_store import store_chunks, delete_media_chunks
from app.services.bm25_search import build_bm25_index, delete_bm25_index
from app.services.hls import generate_hls


class JobRegistry:
    """Manages processing jobs and their state."""
    
    def __init__(self):
        self.jobs: Dict[str, dict] = {}
        self.media: Dict[str, MediaMetadata] = {}
        self.transcripts: Dict[str, List[TranscriptSegment]] = {}
        self.chunks: Dict[str, List[SemanticChunk]] = {}
        self._listeners: Dict[str, List[asyncio.Queue]] = {}
    
    def create_job(self, media_id: str, filename: str) -> str:
        job_id = str(uuid4())
        self.jobs[job_id] = {
            "media_id": media_id,
            "filename": filename,
            "status": MediaStatus.PROCESSING,
            "stage": ProcessingStage.UPLOADING,
            "progress": 0.0,
            "message": "Job created",
            "created_at": datetime.utcnow(),
        }
        return job_id
    
    def get_job(self, job_id: str) -> Optional[dict]:
        return self.jobs.get(job_id)
    
    def get_media(self, media_id: str) -> Optional[MediaMetadata]:
        return self.media.get(media_id)
    
    def get_transcript(self, media_id: str) -> List[TranscriptSegment]:
        return self.transcripts.get(media_id, [])
    
    def get_chunks(self, media_id: str) -> List[SemanticChunk]:
        return self.chunks.get(media_id, [])
    
    def get_all_media(self) -> List[MediaMetadata]:
        return [m for m in self.media.values()]
    
    def subscribe(self, job_id: str) -> asyncio.Queue:
        if job_id not in self._listeners:
            self._listeners[job_id] = []
        queue = asyncio.Queue()
        self._listeners[job_id].append(queue)
        return queue
    
    def unsubscribe(self, job_id: str, queue: asyncio.Queue):
        if job_id in self._listeners:
            self._listeners[job_id] = [q for q in self._listeners[job_id] if q != queue]
    
    async def update_progress(self, job_id: str, stage: ProcessingStage, progress: float, message: str):
        if job_id in self.jobs:
            self.jobs[job_id]["stage"] = stage
            self.jobs[job_id]["progress"] = progress
            self.jobs[job_id]["message"] = message
        
        event = ProcessingProgress(
            job_id=job_id,
            stage=stage,
            progress=progress,
            message=message,
            timestamp=datetime.utcnow()
        )
        
        if job_id in self._listeners:
            for queue in self._listeners[job_id]:
                try:
                    queue.put_nowait(event)
                except asyncio.QueueFull:
                    pass
    
    def complete_job(self, job_id: str, media_metadata: MediaMetadata,
                     transcripts: List[TranscriptSegment], chunks: List[SemanticChunk]):
        if job_id in self.jobs:
            self.jobs[job_id]["status"] = MediaStatus.READY
            self.jobs[job_id]["stage"] = ProcessingStage.READY
            self.jobs[job_id]["progress"] = 1.0
            self.jobs[job_id]["message"] = "Processing complete"
        
        media_id = self.jobs[job_id]["media_id"]
        self.media[media_id] = media_metadata
        self.transcripts[media_id] = transcripts
        self.chunks[media_id] = chunks
    
    def fail_job(self, job_id: str, error: str):
        if job_id in self.jobs:
            self.jobs[job_id]["status"] = MediaStatus.ERROR
            self.jobs[job_id]["stage"] = ProcessingStage.ERROR
            self.jobs[job_id]["message"] = f"Error: {error}"
    
    def delete_media(self, media_id: str):
        if media_id in self.media:
            del self.media[media_id]
        if media_id in self.transcripts:
            del self.transcripts[media_id]
        if media_id in self.chunks:
            del self.chunks[media_id]


# Global registry
registry = JobRegistry()


def validate_media(file_path: Path) -> dict:
    """Validate media file using ffprobe and return metadata."""
    cmd = [
        "ffprobe", "-v", "quiet",
        "-print_format", "json",
        "-show_format", "-show_streams",
        str(file_path)
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, check=True)
    info = json.loads(result.stdout)
    
    if "format" not in info:
        raise ValueError("Invalid media file: no format information found")
    
    return info


def extract_audio(file_path: Path, output_path: Path):
    """Extract audio from media file for transcription."""
    cmd = [
        "ffmpeg", "-y", "-i", str(file_path),
        "-vn", "-acodec", "pcm_s16le",
        "-ar", "16000", "-ac", "1",
        str(output_path)
    ]
    subprocess.run(cmd, check=True, capture_output=True)


async def download_url(url: str, output_path: Path, progress_callback=None) -> Path:
    """Download media from URL (YouTube, HLS streams, CDN links)."""
    # Check if it's a YouTube URL
    if "youtube.com" in url or "youtu.be" in url:
        return await _download_youtube(url, output_path, progress_callback)
    
    # Check if it's an HLS stream
    if url.endswith(".m3u8") or "m3u8" in url:
        return await _download_hls(url, output_path, progress_callback)
    
    # Direct download
    return await _download_direct(url, output_path, progress_callback)


async def _download_youtube(url: str, output_path: Path, progress_callback=None) -> Path:
    """Download from YouTube using yt-dlp."""
    cmd = [
        "yt-dlp",
        "-f", "best[ext=mp4]/best",
        "--no-playlist",
        "-o", str(output_path),
        url
    ]
    proc = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE
    )
    stdout, stderr = await proc.communicate()
    
    if proc.returncode != 0:
        raise ValueError(f"YouTube download failed: {stderr.decode()}")
    
    # yt-dlp may add extension, find the actual file
    if not output_path.exists():
        for ext in [".mp4", ".webm", ".mkv", ".m4a"]:
            candidate = output_path.with_suffix(ext)
            if candidate.exists():
                return candidate
    
    return output_path


async def _download_hls(url: str, output_path: Path, progress_callback=None) -> Path:
    """Download HLS stream using ffmpeg."""
    cmd = [
        "ffmpeg", "-y", "-i", url,
        "-c", "copy", "-bsf:a", "aac_adtstoasc",
        str(output_path)
    ]
    proc = await asyncio.create_subprocess_exec(
        *cmd,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE
    )
    await proc.communicate()
    
    if not output_path.exists():
        raise ValueError("HLS download failed")
    
    return output_path


async def _download_direct(url: str, output_path: Path, progress_callback=None) -> Path:
    """Direct HTTP download with progress tracking."""
    async with aiohttp.ClientSession() as session:
        async with session.get(url) as response:
            response.raise_for_status()
            total = int(response.headers.get("content-length", 0))
            downloaded = 0
            
            with open(output_path, "wb") as f:
                async for chunk in response.content.iter_chunked(1024 * 1024):
                    f.write(chunk)
                    downloaded += len(chunk)
                    if progress_callback and total > 0:
                        progress_callback(downloaded / total, f"Downloading: {downloaded}/{total} bytes")
    
    return output_path


async def process_media_pipeline(job_id: str, media_id: str, file_path: Path, filename: str):
    """Main processing pipeline: validate -> transcribe -> chunk -> embed -> index."""
    try:
        # Stage 1: Validate
        await registry.update_progress(job_id, ProcessingStage.VALIDATING, 0.0, "Validating media file...")
        media_info = validate_media(file_path)
        duration = float(media_info["format"].get("duration", 0))
        
        # Detect primary language from streams
        has_video = any(s.get("codec_type") == "video" for s in media_info.get("streams", []))
        
        await registry.update_progress(job_id, ProcessingStage.VALIDATING, 1.0, f"Valid: {duration:.0f}s, {'video' if has_video else 'audio'}")
        
        # Stage 2: Generate HLS (for video files)
        hls_url = ""
        if has_video:
            await registry.update_progress(job_id, ProcessingStage.VALIDATING, 0.5, "Generating HLS stream...")
            hls_url = generate_hls(file_path, media_id)
        
        # Stage 3: Extract audio and transcribe
        await registry.update_progress(job_id, ProcessingStage.TRANSCRIBING, 0.0, "Extracting audio...")
        audio_path = file_path.with_suffix(".wav")
        extract_audio(file_path, audio_path)
        
        def trans_progress(p, msg):
            asyncio.get_event_loop().call_soon_threadsafe(
                lambda: asyncio.create_task(
                    registry.update_progress(job_id, ProcessingStage.TRANSCRIBING, p, msg)
                )
            )
        
        segments = transcribe_audio(audio_path, progress_callback=trans_progress)
        
        # Detect primary language
        language = segments[0].language if segments else None
        
        # Cleanup audio file
        audio_path.unlink(missing_ok=True)
        
        # Stage 4: Semantic chunking
        await registry.update_progress(job_id, ProcessingStage.CHUNKING, 0.0, "Creating semantic chunks...")
        
        def chunk_progress(p, msg):
            asyncio.get_event_loop().call_soon_threadsafe(
                lambda: asyncio.create_task(
                    registry.update_progress(job_id, ProcessingStage.CHUNKING, p, msg)
                )
            )
        
        chunks = create_semantic_chunks(segments, media_id, progress_callback=chunk_progress)
        
        # Stage 5: Generate embeddings and store
        await registry.update_progress(job_id, ProcessingStage.EMBEDDING, 0.0, "Generating embeddings...")
        
        def embed_progress(p, msg):
            asyncio.get_event_loop().call_soon_threadsafe(
                lambda: asyncio.create_task(
                    registry.update_progress(job_id, ProcessingStage.EMBEDDING, p, msg)
                )
            )
        
        texts = [chunk.text for chunk in chunks]
        embeddings = generate_embeddings(texts, progress_callback=embed_progress)
        
        # Stage 6: Store in vector DB and BM25 index
        await registry.update_progress(job_id, ProcessingStage.INDEXING, 0.0, "Indexing in vector database...")
        store_chunks(chunks)
        build_bm25_index(media_id, chunks)
        
        await registry.update_progress(job_id, ProcessingStage.INDEXING, 1.0, "Indexing complete")
        
        # Compute total word count
        total_words = sum(chunk.word_count for chunk in chunks)
        
        # Create metadata
        media_metadata = MediaMetadata(
            media_id=media_id,
            filename=filename,
            created_at=datetime.utcnow(),
            duration_seconds=duration,
            language=language,
            hls_url=hls_url,
            transcript_count=len(segments),
            chunk_count=len(chunks),
            word_count=total_words
        )
        
        registry.complete_job(job_id, media_metadata, segments, chunks)
        
    except Exception as e:
        registry.fail_job(job_id, str(e))
        raise
    finally:
        # Cleanup uploaded file if needed (keep for HLS serving)
        pass


async def progress_stream(job_id: str) -> AsyncGenerator[str, None]:
    """SSE stream of processing progress for a job."""
    queue = registry.subscribe(job_id)
    
    try:
        while True:
            try:
                event = await asyncio.wait_for(queue.get(), timeout=30.0)
                yield f"data: {event.model_dump_json()}\n\n"
                
                if event.stage in (ProcessingStage.READY, ProcessingStage.ERROR):
                    break
            except asyncio.TimeoutError:
                # Send keepalive
                yield f"data: {json.dumps({'type': 'keepalive'})}\n\n"
    finally:
        registry.unsubscribe(job_id, queue)
