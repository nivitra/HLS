import { useAppStore } from '../store';

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default function MetadataPanel() {
  const { selectedMedia } = useAppStore();

  if (!selectedMedia) {
    return (
      <div className="card">
        <h3 style={{ margin: '0 0 16px' }}>Metadata</h3>
        <p style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>
          Select a media file to view metadata
        </p>
      </div>
    );
  }

  const metadata = [
    { label: 'Media ID', value: selectedMedia.media_id },
    { label: 'Filename', value: selectedMedia.filename },
    { label: 'Duration', value: formatTime(selectedMedia.duration_seconds) },
    { label: 'Language', value: selectedMedia.language || 'Unknown' },
    { label: 'Transcript Segments', value: selectedMedia.transcript_count.toString() },
    { label: 'Semantic Chunks', value: selectedMedia.chunk_count.toString() },
    { label: 'Total Words', value: selectedMedia.word_count.toLocaleString() },
    { label: 'Created', value: new Date(selectedMedia.created_at).toLocaleString() },
    { label: 'HLS URL', value: selectedMedia.hls_url },
  ];

  return (
    <div className="card">
      <h3 style={{ margin: '0 0 16px' }}>Metadata</h3>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {metadata.map((item) => (
          <div key={item.label} style={{ display: 'flex', gap: 12, fontSize: 13 }}>
            <div style={{ 
              minWidth: 140, 
              color: 'var(--color-text-secondary)',
              fontWeight: 500,
            }}>
              {item.label}
            </div>
            <div style={{ 
              flex: 1, 
              color: 'var(--color-text)',
              fontFamily: item.label === 'Media ID' || item.label === 'HLS URL' ? 'var(--font-mono)' : 'var(--font-sans)',
              fontSize: item.label === 'Media ID' || item.label === 'HLS URL' ? 12 : 13,
              wordBreak: 'break-all',
            }}>
              {item.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
