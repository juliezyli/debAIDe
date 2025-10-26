/**
 * Theme configuration for dark and light modes
 */
import { create } from 'zustand';

export const lightTheme = {
  background: '#f9fafb',
  surface: '#ffffff',
  primary: '#6366f1',
  primaryDark: '#4f46e5',
  text: '#111827',
  textSecondary: '#6b7280',
  border: '#e5e7eb',
  error: '#ef4444',
  success: '#10b981',
  warning: '#fbbf24',
  disabled: '#d1d5db',
};

export const darkTheme = {
  background: '#111827',
  surface: '#1f2937',
  primary: '#818cf8',
  primaryDark: '#6366f1',
  text: '#f9fafb',
  textSecondary: '#9ca3af',
  border: '#374151',
  error: '#f87171',
  success: '#34d399',
  warning: '#fbbf24',
  disabled: '#4b5563',
};

export type Theme = typeof lightTheme;

interface ThemeState {
  isDark: boolean;
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (isDark: boolean) => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  isDark: false,
  theme: lightTheme,
  toggleTheme: () =>
    set((state) => ({
      isDark: !state.isDark,
      theme: !state.isDark ? darkTheme : lightTheme,
    })),
  setTheme: (isDark: boolean) =>
    set({
      isDark,
      theme: isDark ? darkTheme : lightTheme,
    }),
}));
