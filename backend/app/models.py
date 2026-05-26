from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum


class ProcessingStage(str, Enum):
    UPLOADING = "uploading"
    VALIDATING = "validating"
    TRANSCRIBING = "transcribing"
    CHUNKING = "chunking"
    EMBEDDING = "embedding"
    INDEXING = "indexing"
    READY = "ready"
    ERROR = "error"


class MediaStatus(str, Enum):
    PROCESSING = "processing"
    READY = "ready"
    ERROR = "error"


class WordTimestamp(BaseModel):
    word: str
    start: float
    end: float
    probability: float = Field(ge=0.0, le=1.0)


class TranscriptSegment(BaseModel):
    id: int
    start: float
    end: float
    text: str
    words: List[WordTimestamp] = []
    language: Optional[str] = None
    avg_logprob: Optional[float] = None


class SemanticChunk(BaseModel):
    chunk_id: str
    media_id: str
    start_timestamp: float
    end_timestamp: float
    text: str
    word_count: int
    language: Optional[str] = None


class SearchResult(BaseModel):
    chunk_id: str
    score: float
    start_timestamp: float
    end_timestamp: float
    transcript_snippet: str
    context_before: Optional[str] = None
    context_after: Optional[str] = None


class SearchResponse(BaseModel):
    query: str
    results: List[SearchResult]
    total_results: int
    search_time_ms: float


class MediaUploadResponse(BaseModel):
    media_id: str
    job_id: str
    filename: str
    status: MediaStatus


class MediaMetadata(BaseModel):
    media_id: str
    filename: str
    created_at: datetime
    duration_seconds: float
    language: Optional[str] = None
    hls_url: str
    transcript_count: int
    chunk_count: int
    word_count: int


class ProcessingProgress(BaseModel):
    job_id: str
    stage: ProcessingStage
    progress: float = Field(ge=0.0, le=1.0)
    message: str
    timestamp: datetime


class MediaListResponse(BaseModel):
    items: List[MediaMetadata]
    total: int


class URLIngestRequest(BaseModel):
    url: str
    filename: Optional[str] = None
