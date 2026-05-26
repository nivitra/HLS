from typing import List, Optional, Callable
import numpy as np
from sentence_transformers import SentenceTransformer
from app.models import TranscriptSegment, SemanticChunk
from app.config import settings

_embedding_model = None


def get_embedding_model() -> SentenceTransformer:
    global _embedding_model
    if _embedding_model is None:
        _embedding_model = SentenceTransformer(settings.EMBEDDING_MODEL)
    return _embedding_model


def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    """Compute cosine similarity between two vectors."""
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b)))


def create_semantic_chunks(
    segments: List[TranscriptSegment],
    media_id: str,
    progress_callback: Optional[Callable[[float, str], None]] = None
) -> List[SemanticChunk]:
    """Create semantic chunks using sliding-window embedding similarity for topic shift detection."""
    if progress_callback:
        progress_callback(0.0, "Starting semantic chunking...")
    
    if not segments:
        return []
    
    model = get_embedding_model()
    
    # First pass: create sentence-level chunks from segments
    sentence_chunks = []
    for seg in segments:
        sentences = [s.strip() for s in seg.text.replace('!', '.').replace('?', '.').split('.') if s.strip()]
        for sent in sentences:
            sentence_chunks.append({
                'text': sent,
                'start': seg.start,
                'end': seg.end,
                'language': seg.language
            })
    
    if not sentence_chunks:
        return []
    
    # Embed all sentences for similarity comparison
    if progress_callback:
        progress_callback(0.2, f"Embedding {len(sentence_chunks)} sentences...")
    
    sentences_text = [sc['text'] for sc in sentence_chunks]
    embeddings = model.encode(sentences_text, convert_to_numpy=True, show_progress_bar=False)
    
    if progress_callback:
        progress_callback(0.4, "Detecting topic shifts...")
    
    # Second pass: detect topic shifts via cosine similarity drops
    topic_breaks = [0]  # Always start at index 0
    
    for i in range(1, len(embeddings)):
        sim = cosine_similarity(embeddings[i-1], embeddings[i])
        if sim < settings.CHUNK_SIMILARITY_THRESHOLD:
            topic_breaks.append(i)
    
    topic_breaks.append(len(sentence_chunks))  # End marker
    
    # Third pass: create chunks respecting word count limits
    chunks = []
    chunk_counter = 0
    
    for break_idx in range(len(topic_breaks) - 1):
        start_idx = topic_breaks[break_idx]
        end_idx = topic_breaks[break_idx + 1]
        
        topic_sentences = sentence_chunks[start_idx:end_idx]
        
        # Split into sub-chunks if too large
        current_chunk_sentences = []
        current_word_count = 0
        
        for sent_chunk in topic_sentences:
            word_count = len(sent_chunk['text'].split())
            
            # Check if adding this sentence exceeds max
            if current_word_count + word_count > settings.CHUNK_MAX_WORDS and current_chunk_sentences:
                # Finalize current chunk
                chunk = _build_chunk(current_chunk_sentences, media_id, chunk_counter)
                chunks.append(chunk)
                chunk_counter += 1
                
                # Overlap: keep last N sentences
                overlap_count = min(settings.CHUNK_OVERLAP_SENTENCES, len(current_chunk_sentences))
                current_chunk_sentences = current_chunk_sentences[-overlap_count:]
                current_word_count = sum(len(s['text'].split()) for s in current_chunk_sentences)
            
            current_chunk_sentences.append(sent_chunk)
            current_word_count += word_count
        
        # Finalize remaining sentences
        if current_chunk_sentences:
            chunk = _build_chunk(current_chunk_sentences, media_id, chunk_counter)
            chunks.append(chunk)
            chunk_counter += 1
    
    if progress_callback:
        progress_callback(1.0, f"Created {len(chunks)} semantic chunks")
    
    return chunks


def _build_chunk(sentences: List[dict], media_id: str, chunk_idx: int) -> SemanticChunk:
    """Build a SemanticChunk from a list of sentence chunks."""
    text = ' '.join(s['text'] for s in sentences)
    word_count = len(text.split())
    
    return SemanticChunk(
        chunk_id=f"{media_id}_chunk_{chunk_idx}",
        media_id=media_id,
        start_timestamp=sentences[0]['start'],
        end_timestamp=sentences[-1]['end'],
        text=text,
        word_count=word_count,
        language=sentences[0].get('language')
    )
