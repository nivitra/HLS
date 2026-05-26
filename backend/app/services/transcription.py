from faster_whisper import WhisperModel
from pathlib import Path
from typing import List, Optional, Callable
import torch
from app.models import TranscriptSegment, WordTimestamp
from app.config import settings

_model = None


def get_model() -> WhisperModel:
    global _model
    if _model is None:
        device = settings.WHISPER_DEVICE
        if device == "auto":
            device = "cuda" if torch.cuda.is_available() else "cpu"
        
        _model = WhisperModel(
            settings.WHISPER_MODEL,
            device=device,
            compute_type=settings.WHISPER_COMPUTE_TYPE,
        )
    return _model


def transcribe_audio(
    audio_path: Path,
    progress_callback: Optional[Callable[[float, str], None]] = None
) -> List[TranscriptSegment]:
    """Transcribe audio with faster-whisper, word-level timestamps, and language detection."""
    model = get_model()
    
    if progress_callback:
        progress_callback(0.0, "Starting transcription...")
    
    segments_gen, info = model.transcribe(
        str(audio_path),
        beam_size=5,
        word_timestamps=True,
        vad_filter=True,
        vad_parameters=dict(
            min_silence_duration_ms=500,
            speech_pad_ms=200,
        ),
    )
    
    if progress_callback:
        progress_callback(0.1, f"Detected language: {info.language} (prob: {info.language_probability:.2f})")
    
    segments = []
    total_duration = info.duration
    
    for i, seg in enumerate(segments_gen):
        words = []
        if seg.words:
            words = [
                WordTimestamp(
                    word=w.word.strip(),
                    start=round(w.start, 3),
                    end=round(w.end, 3),
                    probability=round(w.probability, 3)
                )
                for w in seg.words
            ]
        
        segments.append(TranscriptSegment(
            id=i,
            start=round(seg.start, 3),
            end=round(seg.end, 3),
            text=seg.text.strip(),
            words=words,
            language=info.language,
            avg_logprob=round(seg.avg_logprob, 3) if seg.avg_logprob else None
        ))
        
        if progress_callback and total_duration > 0:
            progress = min(0.1 + (seg.end / total_duration) * 0.8, 0.9)
            progress_callback(progress, f"Transcribing: {seg.end:.1f}s / {total_duration:.1f}s")
    
    if progress_callback:
        progress_callback(1.0, "Transcription complete")
    
    return segments
