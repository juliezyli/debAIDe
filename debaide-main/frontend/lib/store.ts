/**
 * Global state management with Zustand
 */
import { create } from 'zustand';

interface SessionState {
  sessionId: string | null;
  topicTitle: string;
  topicDescription: string;
  stance: string;
  currentSegment: 'opening' | 'rebuttal' | 'closing' | null;
  segments: {
    opening?: { transcript: string; audioUrl: string | null };
    rebuttal?: { transcript: string; audioUrl: string | null };
    closing?: { transcript: string; audioUrl: string | null };
  };
  setSession: (data: {
    sessionId: string;
    topicTitle: string;
    topicDescription: string;
    stance: string;
  }) => void;
  setSegment: (
    kind: 'opening' | 'rebuttal' | 'closing',
    data: { transcript: string; audioUrl: string | null }
  ) => void;
  setCurrentSegment: (segment: 'opening' | 'rebuttal' | 'closing' | null) => void;
  reset: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  sessionId: null,
  topicTitle: '',
  topicDescription: '',
  stance: '',
  currentSegment: null,
  segments: {},
  setSession: (data) => set(data),
  setSegment: (kind, data) =>
    set((state) => ({
      segments: {
        ...state.segments,
        [kind]: data,
      },
    })),
  setCurrentSegment: (segment) => set({ currentSegment: segment }),
  reset: () =>
    set({
      sessionId: null,
      topicTitle: '',
      topicDescription: '',
      stance: '',
      currentSegment: null,
      segments: {},
    }),
}));

interface ThemeState {
  isDark: boolean;
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  isDark: false,
  toggleTheme: () => set((state) => ({ isDark: !state.isDark })),
}));
