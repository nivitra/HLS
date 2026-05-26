import { useEffect, useRef } from 'react';
import Hls from 'hls.js';
import { useAppStore } from '../store';

export function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export default function PlayerPanel() {
  const { selectedMedia, setCurrentTime, seekTime, setSeekTime } = useAppStore();
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!selectedMedia || !videoRef.current) return;

    const video = videoRef.current;
    const hlsUrl = selectedMedia.hls_url
      ? `/api${selectedMedia.hls_url}`
      : '';

    if (hlsUrl && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        backBufferLength: 90,
      });

      hlsRef.current = hls;
      hls.loadSource(hlsUrl);
      hls.attachMedia(video);

      return () => {
        hls.destroy();
        hlsRef.current = null;
      };
    } else if (hlsUrl && video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = hlsUrl;
    }
  }, [selectedMedia]);

  useEffect(() => {
    if (seekTime !== null && videoRef.current) {
      videoRef.current.currentTime = seekTime;
      videoRef.current.play().catch(() => {});
      setSeekTime(null);
    }
  }, [seekTime, setSeekTime]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const tick = () => {
      setCurrentTime(video.currentTime);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(rafRef.current);
  }, [setCurrentTime]);

  if (!selectedMedia) {
    return (
      <div className="video-viewport">
        <div className="empty-state">
          <div className="empty-state-label">// SIGNAL IDLE</div>
          <div className="empty-state-sub">UPLOAD MEDIA TO BEGIN</div>
        </div>
      </div>
    );
  }

  return (
    <div className="video-viewport">
      <video
        ref={videoRef}
        style={{
          width: '100%',
          maxHeight: '100%',
          objectFit: 'contain',
          background: '#000000',
        }}
      />
      <div style={{
        position: 'absolute',
        top: 12,
        left: 12,
        fontFamily: 'var(--font-mono)',
        fontSize: 'var(--text-xs)',
        color: 'var(--text-muted)',
      }}>
        {selectedMedia.language || ''}
      </div>
    </div>
  );
}
