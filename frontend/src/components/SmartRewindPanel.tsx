import { useAppStore } from '../store';

export default function SmartRewindPanel() {
  const { selectedMedia, currentTime, transcript } = useAppStore();

  // This is a conceptual component triggered by external logic
  // In production, this would detect rewind patterns via event listeners
  // For now, it acts as the visible overlay template

  if (!selectedMedia) return null;

  const currentSegment = transcript.find(
    s => currentTime >= s.start && currentTime < s.end
  );

  // Get surrounding context for the rewind summary
  const contextStart = Math.max(0, transcript.indexOf(currentSegment!) - 2);
  const contextEnd = Math.min(transcript.length, transcript.indexOf(currentSegment!) + 3);
  const contextText = transcript.slice(contextStart, contextEnd).map(s => s.text).join(' ');

  return (
    <div className="rewind-overlay">
      <button className="rewind-dismiss">×</button>

      <div style={{ paddingTop: 16 }}>
        <div className="rewind-label">
          // REWIND DETECTED [2×]
        </div>
      </div>

      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
        System has noticed you rewound this segment twice. Here's what this section covers:
      </div>

      <div className="rewind-summary">
        {contextText || 'This segment covers key concepts in the current chapter with detailed explanations and examples.'}
      </div>

      <div className="rewind-actions">
        <button className="rewind-action">
          REPLAY SEGMENT
        </button>
        <button className="rewind-action">
          SHOW RELATED
        </button>
      </div>
    </div>
  );
}
