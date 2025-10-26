/**
 * API client for debAIDe backend
 */
import axios from 'axios';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Types
export interface Topic {
  id: number;
  title: string;
  description?: string;
  difficulty: string;
  category?: string;
}

export interface SessionStartResponse {
  session_id: string;
  topic_title: string;
  topic_description?: string;
  stance: string;
}

export interface SegmentUploadResponse {
  segment_id: number;
  transcript: string;
  audio_url: string;
  duration: number;
}

export interface ScoreBreakdown {
  structure: number;
  logic: number;
  delivery: number;
  time_use: number;
  total: number;
}

export interface Highlight {
  timestamp: number;
  text: string;
  reason: string;
}

export interface ScoreResponse {
  session_id: string;
  scores: ScoreBreakdown;
  feedback: {
    strengths: string[];
    improvements: string[];
    summary: string;
  };
  highlights: Highlight[];
  drills: string[];
}

// API functions
export const apiClient = {
  // Get all topics
  getTopics: async (): Promise<Topic[]> => {
    const response = await api.get('/topics');
    return response.data;
  },

  // Get daily topic
  getDailyTopic: async (): Promise<Topic> => {
    const response = await api.get('/topics/daily');
    return response.data;
  },

  // Start a new debate session
  startSession: async (topicId: number, userId?: string): Promise<SessionStartResponse> => {
    const response = await api.post('/session/start', {
      topic_id: topicId,
      user_id: userId,
    });
    return response.data;
  },

  // Upload audio segment
  uploadSegment: async (
    sessionId: string,
    kind: 'opening' | 'rebuttal' | 'closing',
    audioBlob: Blob
  ): Promise<SegmentUploadResponse> => {
    const formData = new FormData();
    formData.append('file', audioBlob, 'audio.webm');

    const response = await api.post(
      `/segment/upload?session_id=${sessionId}&kind=${kind}`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  },

  // Score a session
  scoreSession: async (sessionId: string): Promise<ScoreResponse> => {
    const response = await api.post(`/session/score?session_id=${sessionId}`);
    return response.data;
  },

  // Get session history
  getSessionHistory: async (sessionId: string) => {
    const response = await api.get(`/session/${sessionId}/history`);
    return response.data;
  },
};
