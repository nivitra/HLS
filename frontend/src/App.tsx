import { useEffect, useState } from 'react';
import { useAppStore } from './store';
import { listMedia } from './api';
import StatusBar from './components/StatusBar';
import PlayerPanel from './components/PlayerPanel';
import PlayerControls from './components/PlayerControls';
import SemanticTimeline from './components/SemanticTimeline';
import SearchPanel from './components/SearchPanel';
import TranscriptPanel from './components/TranscriptPanel';
import ChaptersPanel from './components/ChaptersPanel';
import HighlightsPanel from './components/HighlightsPanel';
import UploadScreen from './components/UploadScreen';
import './styles.css';

type Tab = 'transcript' | 'search' | 'chapters' | 'highlights';

function App() {
  const { mediaList, setMediaList, selectedMedia, setSelectedMedia, searchResults } = useAppStore();
  const [activeTab, setActiveTab] = useState<Tab>('transcript');

  useEffect(() => {
    listMedia()
      .then((data) => {
        setMediaList(data.items);
        if (data.items.length > 0 && !selectedMedia) {
          setSelectedMedia(data.items[0]);
        }
      })
      .catch(console.error);
  }, [setMediaList, setSelectedMedia]);

  // Auto-switch to search tab when results come in
  useEffect(() => {
    if (searchResults.length > 0) {
      setActiveTab('search');
    }
  }, [searchResults]);

  const TABS: { key: Tab; label: string }[] = [
    { key: 'transcript', label: 'TRANSCRIPT' },
    { key: 'search', label: 'SEARCH' },
    { key: 'chapters', label: 'CHAPTERS' },
    { key: 'highlights', label: 'HIGHLIGHTS' },
  ];

  // Upload screen when no media is loaded
  if (!selectedMedia && mediaList.length === 0) {
    return (
      <div className="app-layout">
        <div className="main-content">
          <UploadScreen />
        </div>
      </div>
    );
  }

  return (
    <div className="app-layout">
      <div className="main-content">
        <StatusBar />
        
        {/* Quick upload bar when media exists */}
        <UploadScreen />

        <div className="body-area">
          <div className="player-area">
            <div className="video-section">
              <PlayerPanel />
              <PlayerControls />
            </div>

            <div className="right-panel">
              <div className="panel-tabs">
                {TABS.map((tab) => (
                  <button
                    key={tab.key}
                    className={`panel-tab ${activeTab === tab.key ? 'active' : ''}`}
                    onClick={() => setActiveTab(tab.key)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="panel-content">
                {activeTab === 'transcript' && <TranscriptPanel />}
                {activeTab === 'search' && <SearchPanel />}
                {activeTab === 'chapters' && <ChaptersPanel />}
                {activeTab === 'highlights' && <HighlightsPanel />}
              </div>
            </div>
          </div>

          <SemanticTimeline />
        </div>
      </div>

      {/* Media Library Sidebar (left rail) */}
      <div className="left-rail">
        <div
          className={`left-rail-icon ${!selectedMedia ? 'active' : ''}`}
          onClick={() => { if (mediaList.length > 0) setSelectedMedia(null); }}
          title="Library"
        >
          ⌂
        </div>
        {mediaList.map((media) => (
          <div
            key={media.media_id}
            className={`left-rail-icon ${selectedMedia?.media_id === media.media_id ? 'active' : ''}`}
            onClick={() => setSelectedMedia(media)}
            title={media.filename}
            style={{
              fontSize: '9px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {media.filename.slice(0, 4)}
          </div>
        ))}
        <div style={{ flex: 1 }} />
        <div className="left-rail-icon" style={{ fontSize: '18px' }} title="Upload">
          ↑
        </div>
      </div>
    </div>
  );
}

export default App;
