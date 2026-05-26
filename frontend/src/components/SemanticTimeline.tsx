import { useRef, useEffect, useCallback } from 'react';
import { useAppStore } from '../store';

interface SISSegment {
  start: number;
  end: number;
  score: number;
  isChapterBoundary: boolean;
  chapterLabel?: string;
}

export default function SemanticTimeline() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number>(0);
  const { selectedMedia, currentTime, setSeekTime, searchResults, transcript } = useAppStore();

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    const W = rect.width;
    const H = rect.height;
    const barY = H - 20;
    const barH = 8;

    ctx.clearRect(0, 0, W, H);

    const duration = selectedMedia?.duration_seconds || 1;

    const segments: SISSegment[] = [];
    
    if (transcript.length > 0) {
      const numSegments = 200;
      const segDuration = duration / numSegments;
      
      for (let i = 0; i < numSegments; i++) {
        const segStart = i * segDuration;
        const segEnd = (i + 1) * segDuration;
        
        const segsInRange = transcript.filter(
          t => (t.start >= segStart && t.start < segEnd) || (t.end > segStart && t.end <= segEnd)
        );
        
        const totalWords = segsInRange.reduce(
          (sum, s) => sum + s.text.split(/\s+/).length, 0
        );
        
        let score = Math.min(totalWords / 30, 1);
        
        for (const result of searchResults) {
          const overlap = Math.max(0, Math.min(segEnd, result.end_timestamp) - Math.max(segStart, result.start_timestamp));
          if (overlap > 0) {
            score = Math.max(score, 0.6 + result.score * 0.4);
          }
        }

        const isChapter = segsInRange.length > 0 && i % 20 === 0;
        
        segments.push({
          start: segStart,
          end: segEnd,
          score,
          isChapterBoundary: isChapter,
          chapterLabel: isChapter ? `[${String(Math.floor(i / 20) + 1).padStart(2, '0')}]` : undefined,
        });
      }
    }

    const barWidth = W / segments.length;
    const barSpacing = 1;
    const expandedH = 18;
    const normalH = barH;

    segments.forEach((seg, i) => {
      const x = i * barWidth;
      const w = Math.max(barWidth - barSpacing, 1);
      const h = seg.score > 0.75 ? expandedH : normalH;

      let color: string;
      if (seg.score < 0.25) {
        color = `rgba(255, 255, 255, ${0.08 + seg.score * 0.4})`;
      } else if (seg.score < 0.75) {
        color = `rgba(0, 229, 255, ${0.2 + seg.score * 0.5})`;
      } else {
        color = `rgba(255, 140, 0, ${0.55 + seg.score * 0.4})`;
      }

      ctx.fillStyle = color;
      ctx.fillRect(x, barY + normalH - h, w, h);

      if (seg.score > 0.85) {
        ctx.shadowColor = 'rgba(255, 140, 0, 0.8)';
        ctx.shadowBlur = 4;
        ctx.fillRect(x, barY + normalH - h, w, h);
        ctx.shadowBlur = 0;
      }
    });

    segments.forEach((seg, i) => {
      if (seg.isChapterBoundary) {
        const x = i * barWidth;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
        ctx.setLineDash([2, 4]);
        ctx.beginPath();
        ctx.moveTo(x, barY - 4);
        ctx.lineTo(x, barY + normalH + 4);
        ctx.stroke();
        ctx.setLineDash([]);

        if (seg.chapterLabel) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
          ctx.font = '9px "JetBrains Mono", monospace';
          ctx.fillText(seg.chapterLabel, x + 2, 12);
        }
      }
    });

    const playheadX = (currentTime / duration) * W;
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(playheadX, barY - 8);
    ctx.lineTo(playheadX, barY + normalH + 8);
    ctx.stroke();

    const handleSize = 3;
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.moveTo(playheadX, barY - 8);
    ctx.lineTo(playheadX + handleSize, barY - 4);
    ctx.lineTo(playheadX, barY);
    ctx.lineTo(playheadX - handleSize, barY - 4);
    ctx.closePath();
    ctx.fill();

    rafRef.current = requestAnimationFrame(draw);
  }, [selectedMedia, currentTime, searchResults, transcript]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [draw]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    const container = containerRef.current;
    if (!container || !selectedMedia) return;

    const rect = container.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    const time = ratio * selectedMedia.duration_seconds;
    setSeekTime(time);
  }, [selectedMedia, setSeekTime]);

  return (
    <div ref={containerRef} className="sis-timeline" onClick={handleClick}>
      <canvas ref={canvasRef} />
    </div>
  );
}
