import { useEffect, useRef } from 'react';
import { useAppStore } from '../store';
import { getTranscript } from '../api';

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export default function TranscriptPanel() {
  const { selectedMedia, currentTime, transcript, setTranscript, setSeekTime } = useAppStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!selectedMedia) return;
    getTranscript(selectedMedia.media_id)
      .then(setTranscript)
      .catch(console.error);
  }, [selectedMedia, setTranscript]);

  useEffect(() => {
    if (activeRef.current && containerRef.current) {
      const container = containerRef.current;
      const activeEl = activeRef.current;
      
      const containerRect = container.getBoundingClientRect();
      const elRect = activeEl.getBoundingClientRect();

      const isVisible = elRect.top >= containerRect.top && elRect.bottom <= containerRect.bottom;
      if (!isVisible) {
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [currentTime]);

  if (!selectedMedia) {
    return (
      <div>
        <div className="section-label" style={{ fontSize: 'var(--text-xs)', marginBottom: 16 }}>TRANSCRIPT</div>
        <div style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)', fontFamily: 'var(--font-mono)' }}>
          SELECT MEDIA TO VIEW TRANSCRIPT
        </div>
      </div>
    );
  }

  if (transcript.length === 0) {
    return (
      <div>
        <div className="section-label" style={{ fontSize: 'var(--text-xs)', marginBottom: 16 }}>TRANSCRIPT</div>
        <div style={{ color: 'var(--signal-orange)', fontSize: 'var(--text-xs)', fontFamily: 'var(--font-mono)' }}>
          ● INDEXING TRANSCRIPT...
        </div>
      </div>
    );
  }

  const activeIndex = transcript.findIndex(
    (seg) => currentTime >= seg.start && currentTime < seg.end
  );

  // Group segments into chapters
  const chunkSize = Math.ceil(transcript.length / Math.max(1, Math.ceil((selectedMedia.duration_seconds) / 300)));
  const chapters = [];
  for (let i = 0; i < transcript.length; i += chunkSize) {
    chapters.push({
      index: chapters.length + 1,
      segments: transcript.slice(i, i + chunkSize),
    });
  }

  const language = transcript[0]?.language || 'EN';

  return (
    <div>
      <div className="section-label" style={{ fontSize: 'var(--text-xs)', marginBottom: 16 }}>
        TRANSCRIPT [{language}] [{transcript.length} CHUNKS]
      </div>

      <div ref={containerRef} style={{ maxHeight: '100%' }}>
        {chapters.map((chapter) => {
          return (
            <div key={chapter.index}>
              <div className="chapter-divider">
                [{String(chapter.index).padStart(2, '0')}] CHAPTER {chapter.index}
              </div>

              {chapter.segments.map((segment) => {
                const absoluteIdx = transcript.indexOf(segment);
                const isActive = absoluteIdx === activeIndex;

                return (
                  <div
                    key={segment.id}
                    ref={isActive ? activeRef : null}
                    className={`transcript-chunk ${isActive ? 'active' : ''}`}
                    onClick={() => setSeekTime(segment.start)}
                  >
                    {isActive && (
                      <div className="chunk-active-label">
                        ● [ACTIVE — PLAYING]
                      </div>
                    )}
                    <div className="chunk-time">
                      {formatTime(segment.start)}
                    </div>
                    <div className={`chunk-text ${isActive ? 'active' : ''}`}>
                      {segment.text}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
