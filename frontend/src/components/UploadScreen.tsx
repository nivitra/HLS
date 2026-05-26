import { useState, useRef, useCallback } from 'react';
import { uploadMedia, ingestUrl, subscribeToProgress, listMedia } from '../api';
import { useAppStore, ProcessingProgress } from '../store';

const PIPELINE_STAGES = [
  { key: 'validating', label: 'VALIDATING MEDIA' },
  { key: 'transcribing', label: 'TRANSCRIBING' },
  { key: 'chunking', label: 'SEMANTIC CHUNKING' },
  { key: 'embedding', label: 'GENERATING EMBEDDINGS' },
  { key: 'indexing', label: 'INDEXING VECTOR STORE' },
  { key: 'ready', label: 'READY' },
];

export default function UploadScreen() {
  const [dragActive, setDragActive] = useState(false);
  const [url, setUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [jobs, setJobs] = useState<ProcessingProgress[]>([]);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const { setMediaList, setSelectedMedia, selectedMedia } = useAppStore();

  const refreshMedia = useCallback(async () => {
    try {
      const data = await listMedia();
      setMediaList(data.items);
      if (data.items.length > 0 && !selectedMedia) {
        setSelectedMedia(data.items[0]);
      }
    } catch (e) {
      console.error('Failed to refresh media:', e);
    }
  }, [setMediaList, setSelectedMedia, selectedMedia]);

  const startProgressTracking = useCallback((jobId: string) => {
    const unsubscribe = subscribeToProgress(
      jobId,
      (progress) => {
        setJobs((prev) => {
          const idx = prev.findIndex((j) => j.job_id === jobId);
          if (idx >= 0) {
            const updated = [...prev];
            updated[idx] = progress;
            return updated;
          }
          return [...prev, progress];
        });
      },
      () => {
        setUploading(false);
        refreshMedia();
        // Auto-clear after 5s
        setTimeout(() => setJobs([]), 5000);
      },
      (err) => {
        setError(err);
        setUploading(false);
      }
    );
    return unsubscribe;
  }, [refreshMedia]);

  const handleFile = useCallback(async (file: File) => {
    setUploading(true);
    setError('');
    try {
      const res = await uploadMedia(file);
      startProgressTracking(res.job_id);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Upload failed');
      setUploading(false);
    }
  }, [startProgressTracking]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  }, []);

  const handleUrlSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    setUploading(true);
    setError('');
    try {
      const res = await ingestUrl(url.trim());
      setUrl('');
      startProgressTracking(res.job_id);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'URL ingestion failed');
      setUploading(false);
    }
  }, [url, startProgressTracking]);

  // If media is already loaded, show a minimal upload zone
  if (selectedMedia) {
    return (
      <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-ghost)' }}>
        {jobs.length > 0 && jobs.map((job) => (
          <div key={job.job_id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ color: job.stage === 'error' ? 'var(--signal-red)' : 'var(--signal-orange)', fontSize: 'var(--text-xs)' }}>
              {job.stage === 'error' ? '● FAILED' : '● PROCESSING'}
            </span>
            <div className="stage-progress-bar" style={{ flex: 1 }}>
              <div className="filled" style={{ width: `${job.progress * 100}%` }} />
              <div className="empty" style={{ flex: 1 }} />
            </div>
          </div>
        ))}
        {!uploading && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 'var(--text-xs)' }}>
            <input
              ref={fileRef}
              type="file"
              accept=".mp4,.mp3,.wav,.webm,.mkv,.m4a"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              style={{ display: 'none' }}
            />
            <button
              className="ctrl-btn"
              onClick={() => fileRef.current?.click()}
            >
              ↑ UPLOAD NEW
            </button>

            <form onSubmit={handleUrlSubmit} style={{ display: 'flex', gap: 0 }}>
              <input
                type="url"
                className="url-input"
                style={{ padding: '4px 8px', fontSize: 'var(--text-xs)' }}
                placeholder="Paste URL..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
              <button type="submit" className="url-submit" style={{ padding: '4px 8px', fontSize: 'var(--text-xs)' }}>
                INGEST
              </button>
            </form>
          </div>
        )}
        {error && (
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--signal-red)', marginTop: 4 }}>
            {error}
          </div>
        )}
      </div>
    );
  }

  // Full upload screen — no media loaded
  return (
    <div className="upload-screen">
      <div style={{ fontFamily: 'var(--font-display)', fontSize: '28px', color: 'var(--signal-cyan)' }}>
        // SEMANTIC HLS
      </div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-md)', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
        // INGEST MEDIA
      </div>

      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={() => setDragActive(false)}
        onClick={() => !uploading && fileRef.current?.click()}
        className={`upload-zone ${dragActive ? 'drag-active' : ''}`}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".mp4,.mp3,.wav,.webm,.mkv,.m4a"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          disabled={uploading}
          style={{ display: 'none' }}
        />
        <div className="upload-zone-text">
          {dragActive ? '↓ DROP FILE HERE' : '↑ DRAG FILE HERE OR PASTE URL'}
        </div>
      </div>

      <div className="command-well" style={{ width: 480 }}>
        <span className="prompt">$ </span>
        <span className="url">semantic-hls ingest &lt;file-or-url&gt;</span>
      </div>

      <div className="divider-rule" />

      <form onSubmit={handleUrlSubmit} className="url-input-row" style={{ width: 480 }}>
        <input
          type="url"
          className="url-input"
          placeholder="https://youtube.com/watch?v=... or .m3u8 or CDN URL..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={uploading}
          style={{ flex: 1 }}
        />
        <button type="submit" className="url-submit" disabled={uploading || !url.trim()}>
          INGEST
        </button>
      </form>

      <button
        className="browse-btn"
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
      >
        browse local files
      </button>

      {error && (
        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--signal-red)' }}>
          {error}
        </div>
      )}
    </div>
  );
}
