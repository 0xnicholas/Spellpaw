/**
 * Tests for the useSkills React hook. Renders the hook in a tiny test
 * component and asserts the returned `skills` / `isLoading` flip when
 * the loader settles.
 */
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { act, render } from '@testing-library/react';
import { useSkills } from './useSkills';
import {
  ensureSkillsLoaded,
  isSkillsLoading,
  subscribeToSkills,
  _resetSkillsLoader,
} from './loader';

function Probe({ onSnapshot }: { onSnapshot: (s: ReturnType<typeof useSkills>) => void }) {
  const s = useSkills();
  onSnapshot(s);
  return null;
}

/** Install a controllable fetch stub that blocks until the test calls
 *  the returned `release()` function. */
function installBlockingFetch(): { release: () => void; restore: () => void } {
  const realFetch = global.fetch;
  let resolveIndexJson: (v: Response) => void = () => {};
  const indexJsonPromise = new Promise<Response>((resolve) => {
    resolveIndexJson = resolve;
  });
  global.fetch = vi.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input.toString();
    if (url.endsWith('/skills/index.json')) {
      return indexJsonPromise;
    }
    // Should never reach here while blocked
    return new Response('', { status: 404 });
  }) as unknown as typeof fetch;
  return {
    release: () => resolveIndexJson(new Response(JSON.stringify({ skills: [] }), { status: 200 })),
    restore: () => {
      global.fetch = realFetch;
    },
  };
}

/** Standard fetch stub that serves fixture skills synchronously. */
function installFastFetch(): () => void {
  const realFetch = global.fetch;
  const fixtures = ['analyze-pacing', 'batch-storyboard', 'brainstorm-variants',
    'character-profile', 'duplicate-project', 'export-storyboard-pdf'];
  global.fetch = vi.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input.toString();
    if (url.endsWith('/skills/index.json')) {
      return new Response(JSON.stringify({ skills: fixtures }), { status: 200 });
    }
    const m = url.match(/\/skills\/(.+)\.md$/);
    if (m && fixtures.includes(m[1]!)) {
      return new Response(`---
id: ${m[1]}
name: ${m[1]}
description: test skill ${m[1]}
slashCommand: ${m[1]}
parameters: {}
required: []
---
body
`, { status: 200 });
    }
    return new Response('', { status: 404 });
  }) as unknown as typeof fetch;
  return () => {
    global.fetch = realFetch;
  };
}

describe('useSkills hook — initial state (fast fetch)', () => {
  beforeAll(() => {
    installFastFetch();
  });

  beforeEach(() => {
    _resetSkillsLoader();
  });

  it('returns empty skills + isLoading=false when loader is idle', () => {
    expect(isSkillsLoading()).toBe(false);
    const captured: ReturnType<typeof useSkills>[] = [];
    render(<Probe onSnapshot={(s) => captured.push(s)} />);
    expect(captured[0]!.skills.length).toBe(0);
    expect(captured[0]!.isLoading).toBe(false);
  });
});

describe('useSkills hook — transitions (fast fetch)', () => {
  beforeAll(() => {
    installFastFetch();
  });

  beforeEach(() => {
    _resetSkillsLoader();
  });

  it('returns loaded skills after ensureSkillsLoaded resolves', async () => {
    const captured: ReturnType<typeof useSkills>[] = [];
    render(<Probe onSnapshot={(s) => captured.push(s)} />);
    await act(async () => {
      await ensureSkillsLoaded();
    });
    const last = captured[captured.length - 1]!;
    expect(last.skills.length).toBeGreaterThanOrEqual(6);
    expect(last.isLoading).toBe(false);
  });

  it('re-renders on subscribeToSkills notification', async () => {
    const captured: ReturnType<typeof useSkills>[] = [];
    render(<Probe onSnapshot={(s) => captured.push(s)} />);
    expect(captured[0]!.skills.length).toBe(0);
    await act(async () => {
      await ensureSkillsLoaded();
    });
    const settled = captured[captured.length - 1]!;
    expect(settled.skills.length).toBeGreaterThanOrEqual(6);
  });
});

describe('useSkills hook — captures loading state (blocking fetch)', () => {
  beforeEach(() => {
    _resetSkillsLoader();
  });

  it('shows isLoading=true while fetch is blocked', () => {
    const { release, restore } = installBlockingFetch();
    try {
      const captured: ReturnType<typeof useSkills>[] = [];
      render(<Probe onSnapshot={(s) => captured.push(s)} />);
      // Kick off the load but don't release yet
      act(() => {
        void ensureSkillsLoaded();
      });
      expect(isSkillsLoading()).toBe(true);
      // The hook should re-render with isLoading=true
      expect(captured.some((s) => s.isLoading)).toBe(true);
      // Release the fetch
      release();
    } finally {
      restore();
    }
  });
});

describe('useSkills — subscriber cleanup', () => {
  beforeAll(() => {
    installFastFetch();
  });

  beforeEach(() => {
    _resetSkillsLoader();
  });

  it('unsubscribed subscribers do not get future notifications', async () => {
    let calls = 0;
    const unsub = subscribeToSkills(() => {
      calls++;
    });
    unsub();
    await ensureSkillsLoaded();
    expect(calls).toBe(0);
  });
});