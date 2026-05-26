from pydantic_settings import BaseSettings
from pathlib import Path


class Settings(BaseSettings):
    UPLOAD_DIR: Path = Path("uploads")
    HLS_DIR: Path = Path("hls")
    CHROMA_DB_DIR: Path = Path("chroma_db")
    
    # Whisper transcription (faster-whisper with CTranslate2)
    WHISPER_MODEL: str = "large-v3"  # large-v3 for SOTA accuracy
    WHISPER_DEVICE: str = "auto"  # auto, cpu, cuda
    WHISPER_COMPUTE_TYPE: str = "int8"  # int8 for speed, float16 for GPU
    
    # Embedding configuration
    EMBEDDING_MODEL: str = "sentence-transformers/all-MiniLM-L6-v2"  # fallback offline
    EMBEDDING_MODEL_PRIMARY: str = "nomic-embed-text"  # via Ollama if available
    EMBEDDING_DIM: int = 1536
    EMBEDDING_BATCH_SIZE: int = 100
    
    # Semantic chunking
    CHUNK_MIN_WORDS: int = 120
    CHUNK_MAX_WORDS: int = 250
    CHUNK_OVERLAP_SENTENCES: int = 2
    CHUNK_SIMILARITY_THRESHOLD: float = 0.5  # cosine distance drop threshold
    
    # Vector search
    CHROMA_M: int = 16
    CHROMA_EF_CONSTRUCTION: int = 200
    CHROMA_EF_SEARCH: int = 100
    
    # Hybrid search weights
    SEMANTIC_WEIGHT: float = 0.7
    BM25_WEIGHT: float = 0.3
    SEARCH_CONFIDENCE_THRESHOLD: float = 0.4
    SEARCH_DEFAULT_K: int = 5
    SEARCH_MAX_K: int = 20
    
    # System limits
    MAX_FILE_SIZE: int = 2 * 1024 * 1024 * 1024  # 2GB
    RATE_LIMIT_PER_MINUTE: int = 100
    CORS_ORIGINS: list[str] = ["http://localhost:5173", "http://localhost:3000"]

    class Config:
        env_file = ".env"


settings = Settings()
