import { useAppStore } from '../store';

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export default function StatusBar() {
  const { selectedMedia } = useAppStore();

  if (!selectedMedia) {
    return (
      <div className="header-bar">
        <div className="header-left">// SEMANTIC HLS</div>
        <div className="header-center" />
        <div className="header-right">
          <span className="status-dot" style={{ background: 'var(--signal-orange)' }} />
          <span>IDLE — UPLOAD MEDIA</span>
        </div>
      </div>
    );
  }

  return (
    <div className="header-bar">
      <div className="header-left">// SEMANTIC HLS</div>
      <div className="header-center">
        {selectedMedia.filename}
      </div>
      <div className="header-right">
        <span className="status-dot ready" />
        INDEXED [{selectedMedia.chunk_count} chunks · {selectedMedia.transcript_count} cycles]
        <span style={{ marginLeft: 8, color: 'var(--text-muted)' }}>
          {formatDuration(selectedMedia.duration_seconds)} total
        </span>
      </div>
    </div>
  );
}
