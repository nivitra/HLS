# Semantic Media Search - SOTA Edition

Production-grade, AI-native semantic search system that transforms audio/video into fully queryable knowledge bases. Upload media, extract meaning through transcription and embeddings, and return precise timestamp-linked results via natural language queries.

## Features

### Core Capabilities
- **Multi-format Support**: .mp4, .mp3, .wav, .webm, .mkv, .m4a (up to 2GB)
- **URL Ingestion**: YouTube links, HLS streams, CDN URLs
- **Real-time Processing**: SSE-based progress streaming with stage tracking
- **Hybrid Search**: Weighted semantic (0.7) + BM25 keyword (0.3) retrieval
- **Context Windows**: ±1 chunk context for each search result
- **MMR Re-ranking**: Maximal Marginal Relevance for diverse results

### SOTA Components

**Transcription Layer**
- faster-whisper with CTranslate2 backend (4x faster than OpenAI Whisper)
- Word-level timestamps with confidence scores
- Multi-language detection and metadata tagging
- VAD filtering for clean transcription

**Semantic Chunking**
- Sliding-window embedding similarity for topic shift detection
- Dynamic chunk sizing (120-250 words) based on semantic boundaries
- 2-sentence overlap for contextual continuity
- Preserves word-level timestamps throughout pipeline

**Embedding & Indexing**
- Batch processing with L2 normalization (100 chunks/batch)
- ChromaDB with HNSW indexing (M=16, ef_construction=200)
- Metadata filtering by media_id, language, time_range
- BM25 inverted index for keyword fallback

**Search & Retrieval**
- Hybrid scoring: 0.7 semantic + 0.3 BM25
- Confidence threshold filtering (0.4 minimum)
- MMR diversification to avoid duplicate moments
- Sub-300ms p95 query latency

### Frontend Features
- **Drag-and-Drop Upload**: Visual feedback with real-time SSE progress
- **Search-as-you-type**: 400ms debounce with instant results
- **Relevance Bars**: Visual score indicators (0-100%)
- **Timeline Markers**: Search result positions on video scrubber
- **Transcript Sync**: Real-time highlighting with auto-scroll
- **Click-to-Seek**: Jump to any transcript segment or search result
- **Metadata Panel**: Duration, language, chunk count, word count

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React + Vite)                  │
│  UploadPanel │ SearchPanel │ PlayerPanel │ TranscriptPanel   │
└────────────────────────┬────────────────────────────────────┘
                         │ SSE / REST API
┌────────────────────────┴────────────────────────────────────┐
│                   Backend (FastAPI)                          │
│  ┌──────────────┐  ┌─────────────┐  ┌──────────────────┐  │
│  │ Media Router │  │Search Router│  │ Pipeline Service │  │
│  └──────┬───────┘  └──────┬──────┘  └────────┬─────────┘  │
│         │                  │                   │             │
│  ┌──────┴──────────────────┴───────────────────┴──────────┐ │
│  │              Processing Pipeline                        │ │
│  │  Validate → Transcribe → Chunk → Embed → Index         │ │
│  └────────────────────────────────────────────────────────┘ │
└────────────────────────┬────────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
   ┌────┴────┐    ┌─────┴─────┐    ┌────┴─────┐
   │faster-  │    │sentence-  │    │ ChromaDB │
   │whisper  │    │transformers│    │   HNSW   │
   └─────────┘    └───────────┘    └──────────┘
```

## Tech Stack

**Backend**
- FastAPI (async, typed, auto-docs)
- faster-whisper (CTranslate2, word timestamps)
- sentence-transformers (all-MiniLM-L6-v2)
- ChromaDB (HNSW vector index)
- rank-bm25 (keyword search)
- slowapi (rate limiting)
- aiohttp (async URL downloads)

**Frontend**
- React 18 + TypeScript + Vite
- Zustand (state management)
- Radix UI (accessible primitives)
- hls.js (SOTA video playback)
- Custom CSS design system

**Infrastructure**
- Docker + docker-compose
- Nginx reverse proxy
- FFmpeg (HLS generation, audio extraction)

## Quick Start

### Prerequisites
- Python 3.11+
- Node.js 20+
- FFmpeg

### Development Mode

```bash
./start.sh
```

This starts:
- Backend: http://localhost:8000 (API docs: http://localhost:8000/docs)
- Frontend: http://localhost:5173

### Docker Deployment

```bash
./start.sh docker
# or
docker-compose up --build
```

Access at http://localhost:3000

## API Endpoints

### Media Management
- `POST /media/upload` - Upload media file (multipart/form-data)
- `POST /media/ingest-url` - Ingest from URL (YouTube, HLS, CDN)
- `GET /media/list` - List all processed media
- `GET /media/{media_id}` - Get media metadata
- `GET /media/{media_id}/transcript` - Get transcript segments
- `GET /media/{media_id}/chunks` - Get semantic chunks
- `DELETE /media/{media_id}` - Delete media and associated data

### Processing
- `GET /status/{job_id}` - Get processing job status
- `GET /progress/{job_id}` - SSE stream of processing progress

### Search
- `GET /search/?q={query}&media_id={id}&limit={k}` - Hybrid semantic search

### System
- `GET /health` - System health check

## Configuration

Environment variables (backend/.env):

```bash
WHISPER_MODEL=large-v3          # whisper model size
EMBEDDING_MODEL=all-MiniLM-L6-v2  # sentence-transformer model
CHUNK_MIN_WORDS=120              # minimum chunk size
CHUNK_MAX_WORDS=250              # maximum chunk size
SEMANTIC_WEIGHT=0.7              # semantic search weight
BM25_WEIGHT=0.3                  # keyword search weight
SEARCH_CONFIDENCE_THRESHOLD=0.4  # minimum score threshold
RATE_LIMIT_PER_MINUTE=100        # API rate limit
```

## Project Structure

```
.
├── backend/
│   ├── app/
│   │   ├── main.py              # FastAPI app
│   │   ├── config.py            # Settings
│   │   ├── models.py            # Pydantic models
│   │   ├── routers/
│   │   │   ├── media.py         # Media endpoints
│   │   │   └── search.py        # Search endpoints
│   │   └── services/
│   │       ├── transcription.py # faster-whisper
│   │       ├── chunking.py      # Semantic chunking
│   │       ├── embeddings.py    # Vector embeddings
│   │       ├── vector_store.py  # ChromaDB
│   │       ├── bm25_search.py   # Keyword search
│   │       ├── pipeline.py      # Processing pipeline
│   │       └── hls.py           # HLS generation
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.tsx              # Main layout
│   │   ├── store.ts             # Zustand store
│   │   ├── api.ts               # API client
│   │   ├── styles.css           # Design system
│   │   └── components/
│   │       ├── UploadPanel.tsx
│   │       ├── SearchPanel.tsx
│   │       ├── PlayerPanel.tsx
│   │       ├── TranscriptPanel.tsx
│   │       └── MetadataPanel.tsx
│   ├── Dockerfile
│   ├── nginx.conf
│   └── package.json
├── docker-compose.yml
└── start.sh
```

## Usage Example

1. Upload a 60-minute lecture video
2. Wait for processing (transcription → chunking → embedding → indexing)
3. Search: "gradient descent optimization"
4. Results show 3-5 precise moments with:
   - Timestamp badges (e.g., 12:34 - 13:20)
   - Relevance scores (e.g., 87%)
   - Context windows (before/after snippets)
5. Click any result to jump to that moment
6. Transcript panel syncs in real-time with video playback

## Performance Targets

- **Transcription**: <8% WER on clean audio
- **Semantic Retrieval**: >0.75 precision@5
- **Search Latency**: <300ms p95
- **Pipeline Throughput**: ≥4x realtime speed
- **Seek Accuracy**: ±1 second

## License

MIT
