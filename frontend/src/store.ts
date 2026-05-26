import { create } from 'zustand';

export interface MediaMetadata {
  media_id: string;
  filename: string;
  created_at: string;
  duration_seconds: number;
  language: string | null;
  hls_url: string;
  transcript_count: number;
  chunk_count: number;
  word_count: number;
}

export interface TranscriptSegment {
  id: number;
  start: number;
  end: number;
  text: string;
  words: Array<{ word: string; start: number; end: number; probability: number }>;
  language: string | null;
  avg_logprob: number | null;
}

export interface SearchResult {
  chunk_id: string;
  score: number;
  start_timestamp: number;
  end_timestamp: number;
  transcript_snippet: string;
  context_before: string | null;
  context_after: string | null;
}

export interface ProcessingProgress {
  job_id: string;
  stage: string;
  progress: number;
  message: string;
  timestamp: string;
}

interface AppState {
  mediaList: MediaMetadata[];
  selectedMedia: MediaMetadata | null;
  currentTime: number;
  seekTime: number | null;
  searchQuery: string;
  searchResults: SearchResult[];
  searchTimeMs: number;
  transcript: TranscriptSegment[];
  processingJobs: Map<string, ProcessingProgress>;
  isSearching: boolean;
  
  setMediaList: (list: MediaMetadata[]) => void;
  setSelectedMedia: (media: MediaMetadata | null) => void;
  setCurrentTime: (time: number) => void;
  setSeekTime: (time: number | null) => void;
  setSearchQuery: (query: string) => void;
  setSearchResults: (results: SearchResult[], timeMs: number) => void;
  setTranscript: (transcript: TranscriptSegment[]) => void;
  updateProcessingJob: (jobId: string, progress: ProcessingProgress) => void;
  setIsSearching: (isSearching: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  mediaList: [],
  selectedMedia: null,
  currentTime: 0,
  seekTime: null,
  searchQuery: '',
  searchResults: [],
  searchTimeMs: 0,
  transcript: [],
  processingJobs: new Map(),
  isSearching: false,
  
  setMediaList: (list) => set({ mediaList: list }),
  setSelectedMedia: (media) => set({ selectedMedia: media, searchResults: [], transcript: [] }),
  setCurrentTime: (time) => set({ currentTime: time }),
  setSeekTime: (time) => set({ seekTime: time }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSearchResults: (results, timeMs) => set({ searchResults: results, searchTimeMs: timeMs }),
  setSearchTimeMs: (ms: number) => set({ searchTimeMs: ms }),
  setTranscript: (transcript) => set({ transcript }),
  updateProcessingJob: (jobId, progress) => set((state) => {
    const newJobs = new Map(state.processingJobs);
    newJobs.set(jobId, progress);
    return { processingJobs: newJobs };
  }),
  setIsSearching: (isSearching) => set({ isSearching }),
}));
