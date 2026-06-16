import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type ThemeMode = 'dark' | 'light' | 'system';

interface ThemeState {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
}

function applyMode(mode: ThemeMode) {
  const root = document.documentElement;
  if (mode === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    root.classList.toggle('dark', prefersDark);
  } else {
    root.classList.toggle('dark', mode === 'dark');
  }
}

export function applyDarkTheme() {
  applyMode('dark');
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      mode: 'dark',
      setMode: (mode) => {
        applyMode(mode);
        set({ mode });
      },
    }),
    {
      name: 'spellpaw_theme',
      version: 1,
      partialize: (state) => ({ mode: state.mode }),
    }
  )
);

export function initTheme() {
  const saved = localStorage.getItem('spellpaw_theme');
  let mode: ThemeMode = 'dark';
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (parsed?.state?.mode === 'light' || parsed?.state?.mode === 'system') {
        mode = parsed.state.mode;
      }
    } catch { /* ignore */ }
  }
  applyMode(mode);
}
