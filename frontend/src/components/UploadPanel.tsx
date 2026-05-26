import { useState, useRef, useCallback } from 'react';
import { uploadMedia, ingestUrl, subscribeToProgress, listMedia } from '../api';
import { useAppStore, ProcessingProgress } from '../store';

const STAGES = [
  { key: 'uploading', label: 'Uploading', icon: '↑' },
  { key: 'validating', label: 'Validating', icon: '✓' },
  { key: 'transcribing', label: 'Transcribing', icon: '🎤' },
  { key: 'chunking', label: 'Chunking', icon: '⊞' },
  { key: 'embedding', label: 'Embedding', icon: '◆' },
  { key: 'indexing', label: 'Indexing', icon: '⚡' },
  { key: 'ready', label: 'Ready', icon: '✔' },
];

export default function UploadPanel() {
  const [dragActive, setDragActive] = useState(false);
  const [url, setUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [jobs, setJobs] = useState<ProcessingProgress[]>([]);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const { setMediaList } = useAppStore();

  const refreshMedia = useCallback(async () => {
    try {
      const data = await listMedia();
      setMediaList(data.items);
    } catch (e) {
      console.error('Failed to refresh media:', e);
    }
  }, [setMediaList]);

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

  const handleDragLeave = useCallback(() => {
    setDragActive(false);
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

  const getStageIndex = (stage: string) => STAGES.findIndex((s) => s.key === stage);

  return (
    <div className="card">
      <h3 style={{ margin: '0 0 16px' }}>Upload Media</h3>
      
      {/* Drag & Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileRef.current?.click()}
        style={{
          border: `2px dashed ${dragActive ? 'var(--color-primary)' : 'var(--color-border)'}`,
          borderRadius: 'var(--radius-lg)',
          padding: '40px 20px',
          textAlign: 'center',
          cursor: uploading ? 'not-allowed' : 'pointer',
          background: dragActive ? 'var(--color-primary-light)' : 'transparent',
          transition: 'all 0.2s',
          opacity: uploading ? 0.5 : 1,
        }}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".mp4,.mp3,.wav,.webm,.mkv,.m4a"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          disabled={uploading}
          style={{ display: 'none' }}
        />
        <div style={{ fontSize: 32, marginBottom: 8 }}>
          {dragActive ? '↓' : '↑'}
        </div>
        <p style={{ margin: 0, fontWeight: 500 }}>
          {dragActive ? 'Drop file here' : 'Drag & drop or click to upload'}
        </p>
        <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--color-text-muted)' }}>
          .mp4, .mp3, .wav, .webm, .mkv, .m4a — Max 2GB
        </p>
      </div>

      {/* URL Input */}
      <form onSubmit={handleUrlSubmit} style={{ marginTop: 16, display: 'flex', gap: 8 }}>
        <input
          type="url"
          className="input"
          placeholder="Or paste a URL (YouTube, HLS, CDN...)"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={uploading}
          style={{ flex: 1 }}
        />
        <button type="submit" className="btn btn-primary" disabled={uploading || !url.trim()}>
          Ingest
        </button>
      </form>

      {error && (
        <p style={{ margin: '12px 0 0', fontSize: 13, color: 'var(--color-error)' }}>
          {error}
        </p>
      )}

      {/* Processing Jobs */}
      {jobs.length > 0 && (
        <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {jobs.map((job) => (
            <div key={job.job_id} style={{ padding: 12, border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{job.message}</span>
                <span className="badge">{Math.round(job.progress * 100)}%</span>
              </div>
              
              {/* Stage indicators */}
              <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
                {STAGES.map((stage, idx) => {
                  const currentIdx = getStageIndex(job.stage);
                  const isComplete = idx < currentIdx;
                  const isCurrent = idx === currentIdx;
                  return (
                    <div
                      key={stage.key}
                      title={stage.label}
                      style={{
                        flex: 1,
                        height: 4,
                        borderRadius: 2,
                        background: isComplete ? 'var(--color-success)' : isCurrent ? 'var(--color-primary)' : 'var(--color-border)',
                        transition: 'background 0.3s',
                      }}
                    />
                  );
                })}
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--color-text-muted)' }}>
                <span>{STAGES[getStageIndex(job.stage)]?.label || job.stage}</span>
                <span>{job.job_id.slice(0, 8)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
