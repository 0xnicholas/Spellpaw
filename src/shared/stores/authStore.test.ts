import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useAuthStore } from './authStore';

describe('authStore', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    useAuthStore.setState({ isAuthenticated: false, user: null, token: null });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('starts unauthenticated', () => {
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().user).toBeNull();
  });

  it('logout clears state', () => {
    useAuthStore.setState({ isAuthenticated: true, user: { id: '1', name: 'Test', email: 'test@test.com' }, token: 'fake' });
    useAuthStore.getState().logout();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().token).toBeNull();
  });

  describe('login', () => {
    it('calls /api/auth/login with email and password', async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ token: 'jwt-abc', user: { id: 'u1', name: 'Ada', email: 'ada@test.com' } }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      );
      globalThis.fetch = fetchMock as unknown as typeof fetch;

      const result = await useAuthStore.getState().login('ada@test.com', 'hunter22');

      expect(result).toEqual({ success: true });
      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toMatch(/\/api\/auth\/login$/);
      expect(init?.method).toBe('POST');
      expect(JSON.parse(init?.body as string)).toEqual({ email: 'ada@test.com', password: 'hunter22' });
      expect(useAuthStore.getState().token).toBe('jwt-abc');
      expect(useAuthStore.getState().user).toEqual({ id: 'u1', name: 'Ada', email: 'ada@test.com' });
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
    });

    it('returns the server error message on 401', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: 'Invalid credentials' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        })
      ) as unknown as typeof fetch;

      const result = await useAuthStore.getState().login('ada@test.com', 'wrong');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid credentials');
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
      expect(useAuthStore.getState().token).toBeNull();
    });

    it('returns a network error when fetch throws', async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('offline')) as unknown as typeof fetch;

      const result = await useAuthStore.getState().login('ada@test.com', 'hunter22');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });
  });

  describe('register', () => {
    it('calls /api/auth/register with email and password only', async () => {
      const fetchMock = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ token: 'jwt-new', user: { id: 'u2', name: 'Bea', email: 'bea@test.com' } }),
          { status: 201, headers: { 'Content-Type': 'application/json' } }
        )
      );
      globalThis.fetch = fetchMock as unknown as typeof fetch;

      const result = await useAuthStore.getState().register('bea@test.com', 'hunter22');

      expect(result).toEqual({ success: true });
      const [url, init] = fetchMock.mock.calls[0];
      expect(url).toMatch(/\/api\/auth\/register$/);
      expect(JSON.parse(init?.body as string)).toEqual({ email: 'bea@test.com', password: 'hunter22' });
      expect(useAuthStore.getState().token).toBe('jwt-new');
      expect(useAuthStore.getState().user?.email).toBe('bea@test.com');
    });

    it('returns the server error message on 409', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: 'Email already registered' }), {
          status: 409,
          headers: { 'Content-Type': 'application/json' },
        })
      ) as unknown as typeof fetch;

      const result = await useAuthStore.getState().register('bea@test.com', 'hunter22');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Email already registered');
      expect(useAuthStore.getState().isAuthenticated).toBe(false);
    });

    it('falls back to a generic message when the error body is empty', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue(
        new Response('{}', { status: 500, headers: { 'Content-Type': 'application/json' } })
      ) as unknown as typeof fetch;

      const result = await useAuthStore.getState().register('bea@test.com', 'hunter22');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Registration failed');
    });
  });
});
