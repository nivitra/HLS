import { useMemo } from 'react';
import { useAppStore } from '../store';

function formatTimestamp(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export default function HighlightsPanel() {
  const { selectedMedia, transcript, searchResults, setSeekTime } = useAppStore();

  const highlights = useMemo(() => {
    if (!transcript.length) return [];

    // Compute SIS (Semantic Importance Score) based on word density
    const entries = transcript.map((seg) => {
      const wordCount = seg.text.split(/\s+/).length;
      const density = Math.min(wordCount / 25, 1);
      
      // Boost if near search result
      let boost = 0;
      for (const r of searchResults) {
        if (seg.start >= r.start_timestamp && seg.start <= r.end_timestamp) {
          boost = r.score * 0.3;
          break;
        }
      }
      
      return {
        ...seg,
        sis: Math.min(density + boost, 1),
      };
    });

    return entries
      .sort((a, b) => b.sis - a.sis)
      .slice(0, 10);
  }, [transcript, searchResults]);

  const topDensity = highlights.filter(h => h.sis > 0.75);

  if (!selectedMedia) {
    return (
      <div>
        <div className="section-label" style={{ fontSize: 'var(--text-xs)', marginBottom: 16 }}>HIGHLIGHTS</div>
        <div style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)', fontFamily: 'var(--font-mono)' }}>
          SELECT MEDIA
        </div>
      </div>
    );
  }

  const renderScoreBar = (score: number) => {
    const filled = Math.round(score * 12);
    return (
      <div className="scoring-bar">
        {Array.from({ length: 12 }).map((_, i) => (
          <div
            key={i}
            className={`scoring-bar-block ${i < filled ? 'filled' : 'empty'}`}
          />
        ))}
      </div>
    );
  };

  return (
    <div>
      <div className="section-label" style={{ fontSize: 'var(--text-xs)', marginBottom: 16 }}>
        HIGHLIGHTS [TOP MOMENTS · SIS SCORED]
      </div>

      <button className="highlight-reel-btn">
        ▶ PLAY HIGHLIGHT REEL [~{transcript.length} segments → ~{topDensity.length} high]
      </button>

      {highlights.map((h, idx) => (
        <div
          key={h.id}
          className="result-card"
          onClick={() => setSeekTime(h.start)}
        >
          <div className="result-header">
            <span className="result-index">[{String(idx + 1).padStart(2, '0')}]</span>
            {renderScoreBar(h.sis)}
            <span className="result-score">{h.sis.toFixed(2)}</span>
            <span className="result-seek" onClick={(e) => { e.stopPropagation(); setSeekTime(h.start); }}>
              ↗ {formatTimestamp(h.start)}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 4 }}>
            <span className="result-label" style={{ fontSize: 'var(--text-xs)' }}>
              {h.text.slice(0, 50).toUpperCase()}
            </span>
            <span className={`density-tag ${h.sis < 0.75 ? 'med' : ''}`}>
              {h.sis > 0.75 ? '● HIGH DENSITY' : '○ MED DENSITY'}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
