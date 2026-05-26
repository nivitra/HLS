from rank_bm25 import BM25Okapi
from typing import List, Dict, Optional, Tuple
import numpy as np
from app.models import SemanticChunk

_bm25_index: Dict[str, BM25Okapi] = {}
_chunk_store: Dict[str, Dict[str, SemanticChunk]] = {}


def _tokenize(text: str) -> List[str]:
    """Simple whitespace + lowercase tokenization."""
    return text.lower().split()


def build_bm25_index(media_id: str, chunks: List[SemanticChunk]):
    """Build BM25 index for a media file."""
    if not chunks:
        return
    
    tokenized_corpus = [_tokenize(chunk.text) for chunk in chunks]
    _bm25_index[media_id] = BM25Okapi(tokenized_corpus)
    
    # Store chunks for retrieval
    if media_id not in _chunk_store:
        _chunk_store[media_id] = {}
    
    for chunk in chunks:
        _chunk_store[media_id][chunk.chunk_id] = chunk


def search_bm25(
    query: str,
    media_id: Optional[str] = None,
    n_results: int = 5
) -> List[Tuple[str, float]]:
    """Search using BM25 keyword matching. Returns list of (chunk_id, score)."""
    results = []
    
    if media_id:
        # Search specific media file
        if media_id not in _bm25_index:
            return []
        
        bm25 = _bm25_index[media_id]
        tokenized_query = _tokenize(query)
        scores = bm25.get_scores(tokenized_query)
        
        # Get top-k indices
        top_indices = np.argsort(scores)[::-1][:n_results]
        
        for idx in top_indices:
            if scores[idx] > 0:
                chunk_id = list(_chunk_store[media_id].keys())[idx]
                results.append((chunk_id, float(scores[idx])))
    else:
        # Search across all media files
        all_scores = []
        
        for mid, bm25 in _bm25_index.items():
            tokenized_query = _tokenize(query)
            scores = bm25.get_scores(tokenized_query)
            
            for idx, score in enumerate(scores):
                if score > 0:
                    chunk_id = list(_chunk_store[mid].keys())[idx]
                    all_scores.append((chunk_id, score, mid))
        
        # Sort by score and take top-k
        all_scores.sort(key=lambda x: x[1], reverse=True)
        results = [(chunk_id, score) for chunk_id, score, _ in all_scores[:n_results]]
    
    return results


def delete_bm25_index(media_id: str):
    """Delete BM25 index for a media file."""
    if media_id in _bm25_index:
        del _bm25_index[media_id]
    if media_id in _chunk_store:
        del _chunk_store[media_id]
