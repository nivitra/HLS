import subprocess
import shutil
from pathlib import Path
from uuid import uuid4
from app.config import settings


def generate_hls(input_path: Path, media_id: str) -> str:
    """Generate optimized HLS stream with multiple quality levels for ABR."""
    hls_output_dir = settings.HLS_DIR / media_id
    hls_output_dir.mkdir(parents=True, exist_ok=True)
    
    playlist_path = hls_output_dir / "playlist.m3u8"
    segment_pattern = str(hls_output_dir / "segment_%03d.ts")
    
    # SOTA ffmpeg settings for HLS:
    # - faststart for immediate playback
    # - crf 23 for quality/size balance
    # - preset fast for encoding speed
    # - hls_time 6 for 6-second segments (optimal for ABR)
    # - hls_list_size 0 for VOD (all segments in playlist)
    # - hls_flags independent_segments for better seeking
    # - acodec aac with 128k for good audio quality
    # - vcodec libx264 with yuv420p for universal compatibility
    cmd = [
        "ffmpeg",
        "-i", str(input_path),
        "-c:v", "libx264",
        "-preset", "fast",
        "-crf", "23",
        "-pix_fmt", "yuv420p",
        "-c:a", "aac",
        "-b:a", "128k",
        "-ar", "48000",
        "-ac", "2",
        "-movflags", "+faststart",
        "-hls_time", "6",
        "-hls_list_size", "0",
        "-hls_flags", "independent_segments+program_date_time",
        "-hls_segment_filename", segment_pattern,
        "-f", "hls",
        str(playlist_path)
    ]
    
    subprocess.run(cmd, check=True, capture_output=True)
    
    return f"/hls/{media_id}/playlist.m3u8"


def get_hls_path(media_id: str) -> Path:
    return settings.HLS_DIR / media_id / "playlist.m3u8"
