import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User } from '@/types';
import { config } from '@/config';

const API_BASE = config.serverBase;

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string, name: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

async function apiCall(path: string, options: RequestInit = {}) {
  const token = useAuthStore.getState().token;
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(options.headers as Record<string, string> || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return fetch(`${API_BASE}${path}`, { ...options, headers });
}

export const authApi = { apiCall };

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      user: null,
      token: null,

      login: async (email, password) => {
        try {
          const res = await fetch(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
          });
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            return { success: false, error: err.error || 'Login failed' };
          }
          const data = await res.json();
          set({
            isAuthenticated: true,
            user: { id: data.user.id, name: data.user.name, email: data.user.email, avatar: data.user.avatar },
            token: data.token,
          });
          return { success: true };
        } catch {
          return { success: false, error: 'Network error' };
        }
      },

      register: async (email, password, name) => {
        try {
          const res = await fetch(`${API_BASE}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, name }),
          });
          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            return { success: false, error: err.error || 'Registration failed' };
          }
          const data = await res.json();
          set({
            isAuthenticated: true,
            user: { id: data.user.id, name: data.user.name, email: data.user.email },
            token: data.token,
          });
          return { success: true };
        } catch {
          return { success: false, error: 'Network error' };
        }
      },

      logout: () => set({ isAuthenticated: false, user: null, token: null }),
    }),
    {
      name: 'spellpaw_auth',
      version: 1,
      partialize: (state) => ({ token: state.token, user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);
