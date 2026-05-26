import axios from 'axios';
import { MediaMetadata, TranscriptSegment, SearchResult, ProcessingProgress } from './store';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface UploadResponse {
  media_id: string;
  job_id: string;
  filename: string;
  status: string;
}

export interface SearchResponse {
  query: string;
  results: SearchResult[];
  total_results: number;
  search_time_ms: number;
}

export const uploadMedia = async (file: File): Promise<UploadResponse> => {
  const formData = new FormData();
  formData.append('file', file);
  const res = await api.post('/media/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
};

export const ingestUrl = async (url: string, filename?: string): Promise<UploadResponse> => {
  const res = await api.post('/media/ingest-url', { url, filename });
  return res.data;
};

export const listMedia = async (): Promise<{ items: MediaMetadata[]; total: number }> => {
  const res = await api.get('/media/list');
  return res.data;
};

export const getMediaMetadata = async (mediaId: string): Promise<MediaMetadata> => {
  const res = await api.get(`/media/${mediaId}`);
  return res.data;
};

export const getTranscript = async (mediaId: string): Promise<TranscriptSegment[]> => {
  const res = await api.get(`/media/${mediaId}/transcript`);
  return res.data;
};

export const getChunks = async (mediaId: string) => {
  const res = await api.get(`/media/${mediaId}/chunks`);
  return res.data;
};

export const searchMedia = async (
  query: string,
  mediaId?: string,
  limit: number = 5
): Promise<SearchResponse> => {
  const res = await api.get('/search/', {
    params: { q: query, media_id: mediaId, limit },
  });
  return res.data;
};

export const deleteMedia = async (mediaId: string): Promise<void> => {
  await api.delete(`/media/${mediaId}`);
};

export const subscribeToProgress = (
  jobId: string,
  onProgress: (progress: ProcessingProgress) => void,
  onComplete: () => void,
  onError: (error: string) => void
): (() => void) => {
  const eventSource = new EventSource(`/api/media/progress/${jobId}`);
  
  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.type === 'keepalive') return;
      
      onProgress(data as ProcessingProgress);
      
      if (data.stage === 'ready') {
        onComplete();
        eventSource.close();
      } else if (data.stage === 'error') {
        onError(data.message);
        eventSource.close();
      }
    } catch (err) {
      console.error('Failed to parse progress event:', err);
    }
  };
  
  eventSource.onerror = () => {
    onError('Connection lost');
    eventSource.close();
  };
  
  return () => eventSource.close();
};

export const getHlsUrl = (hlsPath: string) => `/api${hlsPath}`;

export default api;
