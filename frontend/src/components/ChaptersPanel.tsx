import { useAppStore } from '../store';

function formatTimestamp(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export default function ChaptersPanel() {
  const { selectedMedia, currentTime, transcript, setSeekTime } = useAppStore();

  if (!selectedMedia || !transcript.length) {
    return (
      <div>
        <div className="section-label" style={{ fontSize: 'var(--text-xs)', marginBottom: 16 }}>AI CHAPTERS</div>
        <div style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)', fontFamily: 'var(--font-mono)' }}>
          {selectedMedia ? '● INDEXING...' : 'SELECT MEDIA'}
        </div>
      </div>
    );
  }

  const duration = selectedMedia.duration_seconds;
  const chunkSize = Math.ceil(transcript.length / Math.max(1, Math.ceil(duration / 300)));
  const chapters = [];
  for (let i = 0; i < transcript.length; i += chunkSize) {
    const segs = transcript.slice(i, i + chunkSize);
    chapters.push({
      index: chapters.length + 1,
      start: segs[0].start,
      end: segs[segs.length - 1].end,
      title: segs[0].text.slice(0, 50).toUpperCase(),
      summary: segs.slice(0, 3).map(s => s.text).join(' ').slice(0, 120) + '...',
    });
  }

  const currentChapter = chapters.find(
    c => currentTime >= c.start && currentTime < c.end
  );

  return (
    <div>
      <div className="section-label" style={{ fontSize: 'var(--text-xs)', marginBottom: 16 }}>
        AI CHAPTERS [{chapters.length} DETECTED · AUTO-GENERATED]
      </div>

      {chapters.map((chapter) => {
        const isCurrent = currentChapter?.index === chapter.index;
        return (
          <div
            key={chapter.index}
            className={`chapter-row ${isCurrent ? 'current' : ''}`}
            onClick={() => setSeekTime(chapter.start)}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
              <span className="chapter-index">[{String(chapter.index).padStart(2, '0')}]</span>
              <span className="chapter-time-range">
                {formatTimestamp(chapter.start)} → {formatTimestamp(chapter.end)}
              </span>
              {isCurrent && (
                <span style={{ color: 'var(--signal-green)', fontSize: 'var(--text-xs)' }}>●</span>
              )}
            </div>
            <div className="chapter-title">{chapter.title}</div>
            <div className="chapter-summary">{chapter.summary}</div>
          </div>
        );
      })}
    </div>
  );
}
