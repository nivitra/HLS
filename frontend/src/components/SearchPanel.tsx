import { useState, useEffect, useCallback } from 'react';
import { searchMedia } from '../api';
import { useAppStore } from '../store';

export default function SearchPanel() {
  const { selectedMedia, searchQuery, setSearchQuery, searchResults, setSearchResults, setSeekTime, isSearching, setIsSearching, searchTimeMs } = useAppStore();
  const [focused, setFocused] = useState(false);

  const performSearch = useCallback(async (query: string) => {
    if (!query.trim() || !selectedMedia) {
      setSearchResults([], 0);
      return;
    }

    setIsSearching(true);
    try {
      const res = await searchMedia(query, selectedMedia.media_id, 10);
      setSearchResults(res.results, res.search_time_ms || 0);
    } catch (err) {
      console.error('Search failed:', err);
      setSearchResults([], 0);
    } finally {
      setIsSearching(false);
    }
  }, [selectedMedia, setSearchResults, setIsSearching]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      performSearch(searchQuery);
    }, 400);

    return () => clearTimeout(timeout);
  }, [searchQuery, performSearch]);

  const handleResultClick = (timestamp: number) => {
    setSeekTime(timestamp);
  };

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

  if (!selectedMedia) {
    return (
      <div>
        <div className="section-label" style={{ fontSize: 'var(--text-xs)', marginBottom: 16 }}>SEARCH</div>
        <div style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)', fontFamily: 'var(--font-mono)' }}>
          SELECT MEDIA TO SEARCH
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="section-label" style={{ fontSize: 'var(--text-xs)', marginBottom: 12 }}>SEARCH</div>

      <div className={`search-input-wrapper ${focused ? 'focused' : ''}`}>
        <span className="search-prompt">$</span>
        <input
          className="search-input"
          type="text"
          placeholder="search media for concept or moment..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
      </div>

      {isSearching && (
        <div className="result-section-label">
          // QUERYING...
        </div>
      )}

      {searchResults.length > 0 && !isSearching && (
        <>
          <div className="result-section-label">
            // RESULTS [{searchResults.length} found · {searchTimeMs !== undefined ? Math.round(searchTimeMs) : '...'}ms]
          </div>

          {searchResults.map((result, idx) => (
            <div
              key={result.chunk_id}
              className="result-card"
              onClick={() => handleResultClick(result.start_timestamp)}
            >
              <div className="result-header">
                <span className="result-index">[{String(idx + 1).padStart(2, '0')}]</span>
                {renderScoreBar(result.score)}
                <span className="result-score">{result.score.toFixed(2)}</span>
                <span className="result-label">
                  {result.transcript_snippet.slice(0, 40).toUpperCase()}
                  {result.transcript_snippet.length > 40 ? '…' : ''}
                </span>
                <span className="result-seek" onClick={(e) => { e.stopPropagation(); handleResultClick(result.start_timestamp); }}>
                  ↗ {formatTimestamp(result.start_timestamp)}
                </span>
              </div>
              <div className="result-snippet">
                ...{result.transcript_snippet}
              </div>
            </div>
          ))}
        </>
      )}

      {searchQuery && !isSearching && searchResults.length === 0 && (
        <div style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)', padding: 24, textAlign: 'center' }}>
          NO RESULTS FOUND
        </div>
      )}
    </div>
  );
}

function formatTimestamp(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}
