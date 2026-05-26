interface Props {
  progress: number;
  stage: string;
  message: string;
  filename?: string;
  filesize?: string;
}

const STAGES = [
  { key: 'uploading', label: 'UPLOADING', order: 1 },
  { key: 'validating', label: 'VALIDATING MEDIA', order: 2 },
  { key: 'transcribing', label: 'TRANSCRIBING', order: 3 },
  { key: 'chunking', label: 'SEMANTIC CHUNKING', order: 4 },
  { key: 'embedding', label: 'GENERATING EMBEDDINGS', order: 5 },
  { key: 'indexing', label: 'INDEXING VECTOR STORE', order: 6 },
];

export default function ProcessingPipeline({ progress, stage, message, filename, filesize }: Props) {
  const currentStageIdx = STAGES.findIndex(s => s.key === stage);

  return (
    <div className="pipeline-screen">
      {filename && (
        <div className="pipeline-filename">{filename}</div>
      )}
      {filesize && (
        <div className="pipeline-filesize">[{filesize}]</div>
      )}

      <div className="pipeline-stages">
        {STAGES.map((s) => {
          const idx = STAGES.indexOf(s);
          const isComplete = idx < currentStageIdx;
          const isActive = idx === currentStageIdx;

          return (
            <div key={s.key} className="pipeline-stage">
              <span className="stage-number">[0{idx + 1}]</span>
              <span className="stage-name">{s.label}</span>
              <span className={`stage-status ${isComplete ? 'complete' : isActive ? 'in-progress' : 'pending'}`}>
                {isComplete ? '✓ COMPLETE' : isActive ? `● IN PROGRESS [${Math.round(progress * 100)}%]` : '○ PENDING'}
              </span>
            </div>
          );
        })}
      </div>

      {currentStageIdx >= 0 && (
        <div style={{ width: 480 }}>
          <div className="stage-progress-bar" style={{ height: 6 }}>
            <div className="filled" style={{ width: `${progress * 100}%` }} />
            <div className="empty" style={{ flex: 1 }} />
          </div>
        </div>
      )}

      <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 8 }}>
        // {message || 'PROCESSING...'}
      </div>
    </div>
  );
}
