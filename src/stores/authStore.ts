import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/types';

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      user: null,
      login: async (_email, _password) => {
        const mockUser: User = {
          id: 'u_1',
          name: 'Creator',
          email: 'creator@spellpaw.app',
        };
        set({ isAuthenticated: true, user: mockUser });
        return true;
      },
      logout: () => set({ isAuthenticated: false, user: null }),
    }),
    {
      name: 'spellpaw_auth',
    }
  )
);
