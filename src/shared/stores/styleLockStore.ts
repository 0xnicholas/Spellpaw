import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface StyleLockState {
  lockedCardId: string | null;
  lockedStylePrompt: string | null;
  lockStyle: (cardId: string, prompt: string) => void;
  clearLock: () => void;
}

export const useStyleLockStore = create<StyleLockState>()(
  persist(
    (set) => ({
      lockedCardId: null,
      lockedStylePrompt: null,
      lockStyle: (cardId, prompt) => set({ lockedCardId: cardId, lockedStylePrompt: prompt }),
      clearLock: () => set({ lockedCardId: null, lockedStylePrompt: null }),
    }),
    { name: 'spellpaw-style-lock', version: 1 },
  ),
);
