import chromadb
from chromadb.config import Settings as ChromaSettings
from typing import List, Optional, Dict, Any
import numpy as np
from app.models import SemanticChunk, SearchResult
from app.services.embeddings import generate_embeddings, generate_query_embedding
from app.config import settings

_client = None


def get_client() -> chromadb.Client:
    global _client
    if _client is None:
        _client = chromadb.Client(
            ChromaSettings(
                chroma_db_dir=str(settings.CHROMA_DB_DIR),
                anonymized_telemetry=False
            )
        )
    return _client


def get_collection():
    client = get_client()
    return client.get_or_create_collection(
        name="media_chunks",
        metadata={
            "hnsw:M": settings.CHROMA_M,
            "hnsw:construction_ef": settings.CHROMA_EF_CONSTRUCTION,
            "hnsw:search_ef": settings.CHROMA_EF_SEARCH,
        }
    )


def store_chunks(chunks: List[SemanticChunk]):
    """Store chunks with embeddings in ChromaDB."""
    if not chunks:
        return
    
    collection = get_collection()
    texts = [chunk.text for chunk in chunks]
    embeddings = generate_embeddings(texts)
    
    collection.add(
        ids=[chunk.chunk_id for chunk in chunks],
        embeddings=embeddings,
        documents=texts,
        metadatas=[{
            "media_id": chunk.media_id,
            "start_timestamp": chunk.start_timestamp,
            "end_timestamp": chunk.end_timestamp,
            "word_count": chunk.word_count,
            "language": chunk.language or "unknown"
        } for chunk in chunks]
    )


def mmr_rerank(
    query_embedding: List[float],
    results: Dict[str, Any],
    lambda_param: float = 0.7,
    top_k: int = 5
) -> List[int]:
    """Apply Maximal Marginal Relevance re-ranking to diversify results."""
    if not results["ids"] or not results["ids"][0]:
        return []
    
    query_vec = np.array(query_embedding)
    doc_embeddings = np.array(results["embeddings"][0])
    
    # Compute similarity to query
    query_sims = np.dot(doc_embeddings, query_vec) / (
        np.linalg.norm(doc_embeddings, axis=1) * np.linalg.norm(query_vec)
    )
    
    selected = []
    candidates = list(range(len(results["ids"][0])))
    
    while len(selected) < top_k and candidates:
        if not selected:
            # First iteration: pick most similar to query
            best_idx = candidates[int(np.argmax(query_sims[candidates]))]
        else:
            # MMR: balance relevance and diversity
            best_score = -np.inf
            best_idx = None
            
            for idx in candidates:
                relevance = query_sims[idx]
                
                # Max similarity to already selected
                selected_embs = doc_embeddings[selected]
                sims_to_selected = np.dot(selected_embs, doc_embeddings[idx]) / (
                    np.linalg.norm(selected_embs, axis=1) * np.linalg.norm(doc_embeddings[idx])
                )
                max_sim = np.max(sims_to_selected)
                
                mmr_score = lambda_param * relevance - (1 - lambda_param) * max_sim
                
                if mmr_score > best_score:
                    best_score = mmr_score
                    best_idx = idx
        
        selected.append(best_idx)
        candidates.remove(best_idx)
    
    return selected


def search_chunks(
    query: str,
    media_id: Optional[str] = None,
    n_results: int = 5,
    apply_mmr: bool = True
) -> List[SearchResult]:
    """Search chunks with optional MMR re-ranking."""
    collection = get_collection()
    query_embedding = generate_query_embedding(query)
    
    where_filter = {"media_id": media_id} if media_id else None
    
    # Fetch more results than needed for MMR re-ranking
    fetch_k = n_results * 3 if apply_mmr else n_results
    
    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=fetch_k,
        where=where_filter,
        include=["documents", "metadatas", "distances", "embeddings"]
    )
    
    if not results["ids"] or not results["ids"][0]:
        return []
    
    # Apply MMR re-ranking
    if apply_mmr:
        selected_indices = mmr_rerank(query_embedding, results, top_k=n_results)
    else:
        selected_indices = list(range(min(n_results, len(results["ids"][0]))))
    
    # Build search results with context windows
    all_chunks = _get_all_chunks_for_context(results)
    
    search_results = []
    for idx in selected_indices:
        doc_id = results["ids"][0][idx]
        metadata = results["metadatas"][0][idx]
        distance = results["distances"][0][idx]
        text = results["documents"][0][idx]
        
        # Cosine similarity score (0-1)
        score = 1.0 - (distance / 2.0) if distance <= 2.0 else 0.0
        
        # Get context window (±1 chunk)
        context_before, context_after = _get_context_windows(doc_id, all_chunks)
        
        search_results.append(SearchResult(
            chunk_id=doc_id,
            score=round(score, 4),
            start_timestamp=metadata["start_timestamp"],
            end_timestamp=metadata["end_timestamp"],
            transcript_snippet=text,
            context_before=context_before,
            context_after=context_after
        ))
    
    return search_results


def _get_all_chunks_for_context(query_results: Dict[str, Any]) -> Dict[str, str]:
    """Get all chunks mentioned in query results for context lookup."""
    collection = get_collection()
    
    # Extract media_ids from results
    media_ids = set()
    for metadata in query_results["metadatas"][0]:
        media_ids.add(metadata["media_id"])
    
    # Fetch all chunks for these media files
    all_chunks = {}
    for media_id in media_ids:
        chunks = collection.get(
            where={"media_id": media_id},
            include=["documents"]
        )
        if chunks["ids"]:
            for i, chunk_id in enumerate(chunks["ids"]):
                all_chunks[chunk_id] = chunks["documents"][i]
    
    return all_chunks


def _get_context_windows(chunk_id: str, all_chunks: Dict[str, str]) -> tuple[Optional[str], Optional[str]]:
    """Get context windows (±1 chunk) for a given chunk."""
    # Parse chunk_id to find neighbors
    # Format: {media_id}_chunk_{idx}
    parts = chunk_id.rsplit("_chunk_", 1)
    if len(parts) != 2:
        return None, None
    
    media_id, idx_str = parts
    try:
        idx = int(idx_str)
    except ValueError:
        return None, None
    
    before_id = f"{media_id}_chunk_{idx - 1}"
    after_id = f"{media_id}_chunk_{idx + 1}"
    
    context_before = all_chunks.get(before_id)
    context_after = all_chunks.get(after_id)
    
    return context_before, context_after


def delete_media_chunks(media_id: str):
    """Delete all chunks for a given media file."""
    collection = get_collection()
    collection.delete(where={"media_id": media_id})
