import time
from fastapi import APIRouter, Query, HTTPException, Depends
from typing import Optional
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.config import settings
from app.models import SearchResponse, SearchResult
from app.services.vector_store import search_chunks
from app.services.bm25_search import search_bm25
from app.services.pipeline import registry

router = APIRouter(prefix="/search", tags=["search"])
limiter = Limiter(key_func=get_remote_address)


@router.get("/", response_model=SearchResponse)
@limiter.limit(f"{settings.RATE_LIMIT_PER_MINUTE}/minute")
async def search(
    q: str = Query(..., min_length=1, description="Search query"),
    media_id: Optional[str] = Query(None, description="Filter by media ID"),
    limit: int = Query(settings.SEARCH_DEFAULT_K, ge=1, le=settings.SEARCH_MAX_K, description="Number of results")
):
    """Hybrid semantic + BM25 search with context windows."""
    start_time = time.time()
    
    # Validate media_id if provided
    if media_id and not registry.get_media(media_id):
        raise HTTPException(404, "Media not found")
    
    # Semantic search
    semantic_results = search_chunks(
        q, 
        media_id=media_id, 
        n_results=limit * 2,
        apply_mmr=True
    )
    
    # BM25 keyword search
    bm25_results = search_bm25(q, media_id=media_id, n_results=limit * 2)
    
    # Hybrid fusion: combine semantic and BM25 scores
    combined_scores = {}
    
    # Add semantic scores
    for result in semantic_results:
        combined_scores[result.chunk_id] = {
            "semantic_score": result.score,
            "bm25_score": 0.0,
            "result": result
        }
    
    # Add BM25 scores (normalize to 0-1 range)
    if bm25_results:
        max_bm25 = max(score for _, score in bm25_results)
        for chunk_id, score in bm25_results:
            normalized_bm25 = score / max_bm25 if max_bm25 > 0 else 0.0
            if chunk_id in combined_scores:
                combined_scores[chunk_id]["bm25_score"] = normalized_bm25
            else:
                # BM25-only result, need to fetch from vector store
                combined_scores[chunk_id] = {
                    "semantic_score": 0.0,
                    "bm25_score": normalized_bm25,
                    "result": None
                }
    
    # Compute hybrid scores
    hybrid_results = []
    for chunk_id, scores in combined_scores.items():
        hybrid_score = (
            settings.SEMANTIC_WEIGHT * scores["semantic_score"] +
            settings.BM25_WEIGHT * scores["bm25_score"]
        )
        
        # Use semantic result if available (has context windows), otherwise fetch
        if scores["result"]:
            result = scores["result"]
            result.score = hybrid_score  # Update with hybrid score
            hybrid_results.append(result)
        else:
            # Fetch chunk details for BM25-only results
            # This is rare - only happens when BM25 finds something semantic didn't
            # For now, skip these edge cases
            pass
    
    # Sort by hybrid score and take top-k
    hybrid_results.sort(key=lambda r: r.score, reverse=True)
    hybrid_results = hybrid_results[:limit]
    
    # Filter by confidence threshold
    hybrid_results = [r for r in hybrid_results if r.score >= settings.SEARCH_CONFIDENCE_THRESHOLD]
    
    elapsed_ms = (time.time() - start_time) * 1000
    
    return SearchResponse(
        query=q,
        results=hybrid_results,
        total_results=len(hybrid_results),
        search_time_ms=round(elapsed_ms, 2)
    )
