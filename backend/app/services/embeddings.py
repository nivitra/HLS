from sentence_transformers import SentenceTransformer
from typing import List, Optional, Callable
import numpy as np
from app.config import settings

_model = None


def get_model() -> SentenceTransformer:
    global _model
    if _model is None:
        _model = SentenceTransformer(settings.EMBEDDING_MODEL)
    return _model


def normalize_embeddings(embeddings: np.ndarray) -> np.ndarray:
    """L2 normalize embeddings for cosine similarity."""
    norms = np.linalg.norm(embeddings, axis=1, keepdims=True)
    norms[norms == 0] = 1  # Avoid division by zero
    return embeddings / norms


def generate_embeddings(
    texts: List[str],
    progress_callback: Optional[Callable[[float, str], None]] = None
) -> List[List[float]]:
    """Generate embeddings with batch processing and L2 normalization."""
    model = get_model()
    
    if progress_callback:
        progress_callback(0.0, f"Embedding {len(texts)} chunks...")
    
    all_embeddings = []
    batch_size = settings.EMBEDDING_BATCH_SIZE
    total_batches = (len(texts) + batch_size - 1) // batch_size
    
    for batch_idx in range(total_batches):
        start_idx = batch_idx * batch_size
        end_idx = min(start_idx + batch_size, len(texts))
        batch_texts = texts[start_idx:end_idx]
        
        batch_embeddings = model.encode(
            batch_texts,
            convert_to_numpy=True,
            show_progress_bar=False,
            normalize_embeddings=False  # We'll normalize ourselves
        )
        
        all_embeddings.append(batch_embeddings)
        
        if progress_callback:
            progress = (batch_idx + 1) / total_batches
            progress_callback(progress, f"Embedded batch {batch_idx + 1}/{total_batches}")
    
    # Concatenate all batches and normalize
    all_embeddings_np = np.vstack(all_embeddings)
    normalized = normalize_embeddings(all_embeddings_np)
    
    return [emb.tolist() for emb in normalized]


def generate_query_embedding(query: str) -> List[float]:
    """Generate a single query embedding with L2 normalization."""
    model = get_model()
    embedding = model.encode(
        query,
        convert_to_numpy=True,
        show_progress_bar=False
    )
    # Normalize single vector
    norm = np.linalg.norm(embedding)
    if norm > 0:
        embedding = embedding / norm
    return embedding.tolist()
