/**
 * Tests for MessageInput — slash-command autocomplete behavior.
 * The plain-text send path is trivial and not covered here.
 */
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { render, fireEvent, act } from '@testing-library/react';
import { MessageInput } from './MessageInput';
import { _resetSkillsLoader, ensureSkillsLoaded } from '@shared/copilot/skills/loader';
import { installFetchStub } from '@shared/copilot/skills/_testHelpers';

beforeAll(() => {
  installFetchStub();
});

beforeEach(async () => {
  _resetSkillsLoader();
  // Pre-load skills so the hook returns data on first render
  await ensureSkillsLoaded();
});

async function setup(onSend = vi.fn()) {
  let result!: ReturnType<typeof render>;
  await act(async () => {
    result = render(<MessageInput onSend={onSend} />);
  });
  return { ...result, onSend };
}

function setCaret(textarea: HTMLTextAreaElement, pos: number) {
  textarea.focus();
  textarea.setSelectionRange(pos, pos);
}

describe('MessageInput — slash autocomplete', () => {
  it('opens the dropdown when the user types "/" at the start', async () => {
    const { container } = await setup();
    const ta = container.querySelector('textarea')!;
    fireEvent.change(ta, { target: { value: '/' } });
    setCaret(ta, 1);
    fireEvent.select(ta);
    await act(async () => {});
    expect(container.querySelector('[data-testid="skill-autocomplete"]')).toBeTruthy();
  });

  it('does NOT open the dropdown for plain text without a slash', async () => {
    const { container } = await setup();
    const ta = container.querySelector('textarea')!;
    fireEvent.change(ta, { target: { value: 'hello world' } });
    await act(async () => {});
    expect(container.querySelector('[data-testid="skill-autocomplete"]')).toBeNull();
  });

  it('filters suggestions as the user types more chars', async () => {
    const { container } = await setup();
    const ta = container.querySelector('textarea')!;
    fireEvent.change(ta, { target: { value: '/anal' } });
    setCaret(ta, 5);
    fireEvent.select(ta);
    await act(async () => {});
    const options = container.querySelectorAll('[role="option"]');
    expect(options.length).toBeGreaterThan(0);
    // All options should match the filter
    Array.from(options).forEach((o) => {
      expect(o.textContent).toContain('analyze-pacing');
    });
  });

  it('shows "no match" empty state when filter has zero results', async () => {
    const { container } = await setup();
    const ta = container.querySelector('textarea')!;
    fireEvent.change(ta, { target: { value: '/zzz-no-such-skill' } });
    setCaret(ta, 20);
    fireEvent.select(ta);
    await act(async () => {});
    expect(container.querySelector('[data-testid="skill-autocomplete-empty"]')).toBeTruthy();
  });

  it('ArrowDown / ArrowUp navigate; Enter selects', async () => {
    const onSend = vi.fn();
    const { container } = await setup(onSend);
    const ta = container.querySelector('textarea')!;
    fireEvent.change(ta, { target: { value: '/c' } });
    setCaret(ta, 2);
    fireEvent.select(ta);
    await act(async () => {});

    // Should have multiple options starting with c (character-asset-extraction,
    // character-costume-designer, character-profile, cinematography-*)
    const options = container.querySelectorAll('[role="option"]');
    expect(options.length).toBeGreaterThan(1);

    // First selected
    expect(options[0]!.getAttribute('aria-selected')).toBe('true');

    // ArrowDown → second selected
    fireEvent.keyDown(ta, { key: 'ArrowDown' });
    await act(async () => {});
    expect(options[1]!.getAttribute('aria-selected')).toBe('true');

    // Enter picks it (does NOT submit)
    fireEvent.keyDown(ta, { key: 'Enter' });
    await act(async () => {});
    expect(onSend).not.toHaveBeenCalled();
    expect(ta.value).toMatch(/^\/\S+ $/);
  });

  it('Tab also picks the highlighted suggestion', async () => {
    const { container } = await setup();
    const ta = container.querySelector('textarea')!;
    fireEvent.change(ta, { target: { value: '/direc' } });
    setCaret(ta, 6);
    fireEvent.select(ta);
    await act(async () => {});
    const options = container.querySelectorAll('[role="option"]');
    expect(options.length).toBeGreaterThan(0);
    fireEvent.keyDown(ta, { key: 'Tab' });
    await act(async () => {});
    expect(ta.value).toMatch(/^\/director-briefing /);
  });

  it('clicking a suggestion picks it', async () => {
    const { container } = await setup();
    const ta = container.querySelector('textarea')!;
    fireEvent.change(ta, { target: { value: '/analyze' } });
    setCaret(ta, 8);
    fireEvent.select(ta);
    await act(async () => {});
    const option = container.querySelector('[data-testid="skill-option-analyze-pacing"]')!;
    expect(option).toBeTruthy();
    fireEvent.mouseDown(option);
    await act(async () => {});
    expect(ta.value).toBe('/analyze-pacing ');
  });

  it('Escape closes the dropdown by appending a space', async () => {
    const { container } = await setup();
    const ta = container.querySelector('textarea')!;
    fireEvent.change(ta, { target: { value: '/a' } });
    setCaret(ta, 2);
    fireEvent.select(ta);
    await act(async () => {});
    expect(container.querySelector('[data-testid="skill-autocomplete"]')).toBeTruthy();
    fireEvent.keyDown(ta, { key: 'Escape' });
    await act(async () => {});
    expect(container.querySelector('[data-testid="skill-autocomplete"]')).toBeNull();
    expect(ta.value).toBe('/a ');
  });

  it('does not open dropdown for "/" preceded by non-whitespace (mid-word)', async () => {
    const { container } = await setup();
    const ta = container.querySelector('textarea')!;
    fireEvent.change(ta, { target: { value: 'http://example' } });
    setCaret(ta, 17);
    fireEvent.select(ta);
    await act(async () => {});
    // Cursor is right after 'example' which is mid-text — the last `/`
    // is preceded by 'p' (not whitespace), so no slash context.
    expect(container.querySelector('[data-testid="skill-autocomplete"]')).toBeNull();
  });

  it('opens dropdown for "/" preceded by a space', async () => {
    const { container } = await setup();
    const ta = container.querySelector('textarea')!;
    fireEvent.change(ta, { target: { value: 'try /a' } });
    setCaret(ta, 6);
    fireEvent.select(ta);
    await act(async () => {});
    expect(container.querySelector('[data-testid="skill-autocomplete"]')).toBeTruthy();
  });

  it('does not open dropdown when the partial has whitespace after /', async () => {
    const { container } = await setup();
    const ta = container.querySelector('textarea')!;
    fireEvent.change(ta, { target: { value: '/analyze pacing' } });
    setCaret(ta, 16);
    fireEvent.select(ta);
    await act(async () => {});
    // Cursor is right after 'pacing' but '/' is followed by 'analyze' then
    // a space, so no slash context at the cursor.
    expect(container.querySelector('[data-testid="skill-autocomplete"]')).toBeNull();
  });

  it('Enter without dropdown submits', async () => {
    const onSend = vi.fn();
    const { container } = await setup(onSend);
    const ta = container.querySelector('textarea')!;
    fireEvent.change(ta, { target: { value: 'hello' } });
    fireEvent.keyDown(ta, { key: 'Enter' });
    await act(async () => {});
    expect(onSend).toHaveBeenCalledWith('hello');
    expect(ta.value).toBe('');
  });
});