import { config } from '@/shared/config';
import { authApi } from '@/shared/stores/authStore';
import type { ProfileFormData, PasswordFormData } from '@console/types';

const API_BASE = config.serverBase;

export async function updateProfile(data: ProfileFormData): Promise<{ success: boolean; error?: string }> {
  const res = await authApi.apiCall('/api/auth/profile', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return { success: false, error: err.error || 'Update failed' };
  }
  return { success: true };
}

export async function updatePassword(data: PasswordFormData): Promise<{ success: boolean; error?: string }> {
  const res = await authApi.apiCall('/api/auth/password', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return { success: false, error: err.error || 'Password update failed' };
  }
  return { success: true };
}

export async function fetchCurrentUser(): Promise<{ id: string; name: string; email: string; avatar?: string } | null> {
  const res = await authApi.apiCall('/api/auth/me');
  if (!res.ok) return null;
  return res.json();
}
