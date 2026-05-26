import { useCallback, useState, useEffect, useRef } from 'react';
import { useAppStore } from '../store';

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export default function PlayerControls() {
  const {
    selectedMedia, currentTime,
    transcript
  } = useAppStore();

  const duration = selectedMedia?.duration_seconds || 0;
  const [isPlaying, setIsPlaying] = useState(false);
  const [densityMode, setDensityMode] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  
  useEffect(() => {
    videoRef.current = document.querySelector('video');
    const handler = () => {
      setIsPlaying(videoRef.current?.paused === false);
    };
    document.addEventListener('play', handler, true);
    document.addEventListener('pause', handler, true);
    document.addEventListener('ended', handler, true);
    return () => {
      document.removeEventListener('play', handler, true);
      document.removeEventListener('pause', handler, true);
      document.removeEventListener('ended', handler, true);
    };
  }, []);

  const handlePlayPause = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().catch(() => {});
    } else {
      videoRef.current.pause();
    }
  };

  const handleSkipBack = () => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.max(0, currentTime - 10);
  };

  const handleSkipForward = () => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.min(duration, currentTime + 10);
  };

  const handleConceptJump = useCallback((direction: 'prev' | 'next') => {
    if (!transcript.length || !videoRef.current) return;
    const chunkSize = Math.ceil(transcript.length / Math.max(1, Math.ceil(duration / 300)));
    const chapters: Array<{start: number; end: number}> = [];
    for (let i = 0; i < transcript.length; i += chunkSize) {
      chapters.push({
        start: transcript[i].start,
        end: transcript[Math.min(i + chunkSize - 1, transcript.length - 1)].end,
      });
    }
    
    const currentIdx = chapters.findIndex(c => currentTime >= c.start && currentTime < c.end);
    let targetIdx;
    if (direction === 'prev') targetIdx = currentIdx <= 0 ? chapters.length - 1 : currentIdx - 1;
    else targetIdx = currentIdx >= chapters.length - 1 ? 0 : currentIdx + 1;

    if (targetIdx >= 0 && targetIdx < chapters.length) {
      videoRef.current.currentTime = chapters[targetIdx].start;
      videoRef.current.play().catch(() => {});
    }
  }, [currentTime, transcript, duration]);

  if (!selectedMedia) return null;

  return (
    <div className="player-controls">
      <button className="ctrl-btn" onClick={handleSkipBack} title="Skip back 10s">
        ◀◀
      </button>
      <button className="ctrl-btn" onClick={handlePlayPause}>
        {isPlaying ? '‖' : '▶'}
      </button>
      <button className="ctrl-btn" onClick={handleSkipForward} title="Skip forward 10s">
        ▶▶
      </button>

      <span className="time-display">
        {formatTime(currentTime)}
        <span className="separator"> / </span>
        {formatTime(duration)}
      </span>

      <div style={{ flex: 1 }} />

      <button
        className={`ctrl-btn ${densityMode ? 'active' : ''}`}
        onClick={() => setDensityMode(!densityMode)}
      >
        ⊡ DENSITY MODE
        {densityMode && <span className="active-dot"> ●</span>}
      </button>

      <button className="ctrl-btn" onClick={() => handleConceptJump('prev')}>
        ◀ CONCEPT JUMP
      </button>
      <button className="ctrl-btn" onClick={() => handleConceptJump('next')}>
        CONCEPT JUMP ▶
      </button>

      <button
        className="ctrl-btn"
        onClick={() => {
          const el = videoRef.current;
          if (el) el.requestFullscreen?.();
        }}
      >
        ⧉ FULLSCREEN
      </button>
    </div>
  );
}
