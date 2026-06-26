import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BuzzyCard, getCardTypeConfig, getCardLabel } from './BuzzyCard';
import type { CanvasNodeType, CanvasNodeData } from '@drama/types';

const baseData: CanvasNodeData = {
  title: 'Test Card',
};

function renderWith(props: { type: CanvasNodeType | string; data?: Partial<CanvasNodeData>; selected?: boolean; children?: React.ReactNode }) {
  return render(
    <BuzzyCard
      type={props.type}
      data={{ ...baseData, ...(props.data ?? {}) }}
      selected={props.selected}
    >
      {props.children ?? <span>body content</span>}
    </BuzzyCard>
  );
}

describe('BuzzyCard — type config', () => {
  it('returns Chinese label for art type', () => {
    expect(getCardLabel('art')).toBe('美术');
  });

  it('returns Chinese label for deliverable type', () => {
    expect(getCardLabel('deliverable')).toBe('视频');
  });

  it('returns Chinese label for sceneCard type', () => {
    expect(getCardLabel('sceneCard')).toBe('分镜');
  });

  it('returns Chinese label for script type', () => {
    expect(getCardLabel('script')).toBe('剧本');
  });

  it('returns Chinese label for character type', () => {
    expect(getCardLabel('character')).toBe('角色');
  });

  it('returns Chinese label for asset type', () => {
    expect(getCardLabel('asset')).toBe('资产');
  });

  it('returns Chinese label for storyline type', () => {
    expect(getCardLabel('storyline')).toBe('文本');
  });

  it('returns Chinese label for moodboard type', () => {
    expect(getCardLabel('moodboard')).toBe('情绪板');
  });

  it('returns Chinese label for task type', () => {
    expect(getCardLabel('task')).toBe('任务');
  });

  it('returns fallback label for unknown type', () => {
    expect(getCardLabel('not-a-real-type')).toBe('卡片');
  });

  it('returns full config for art type with blue selection', () => {
    const config = getCardTypeConfig('art');
    expect(config.label).toBe('美术');
    expect(config.selectedColor).toBe('blue');
    // Icon should be defined
    expect(config.icon).toBeDefined();
  });

  it('returns full config for video type with yellow selection', () => {
    const config = getCardTypeConfig('videoClip');
    expect(config.label).toBe('视频');
    expect(config.selectedColor).toBe('yellow');
  });

  it('returns full config for other types with accent selection', () => {
    expect(getCardTypeConfig('script').selectedColor).toBe('accent');
    expect(getCardTypeConfig('character').selectedColor).toBe('accent');
    expect(getCardTypeConfig('storyline').selectedColor).toBe('accent');
  });
});

describe('BuzzyCard — render', () => {
  it('renders the Chinese label in header', () => {
    renderWith({ type: 'art' });
    expect(screen.getByText('美术')).toBeInTheDocument();
  });

  it('renders the body children', () => {
    renderWith({ type: 'art', children: <span>art body</span> });
    expect(screen.getByText('art body')).toBeInTheDocument();
  });

  it('sets data-buzzy-card attribute', () => {
    const { container } = renderWith({ type: 'art' });
    const card = container.querySelector('[data-buzzy-card]');
    expect(card).toBeInTheDocument();
  });

  it('sets data-card-type to the given type', () => {
    const { container } = renderWith({ type: 'deliverable' });
    const card = container.querySelector('[data-card-type]');
    expect(card?.getAttribute('data-card-type')).toBe('deliverable');
  });

  it('sets data-selected=false when not selected', () => {
    const { container } = renderWith({ type: 'art', selected: false });
    const card = container.querySelector('[data-buzzy-card]');
    expect(card?.getAttribute('data-selected')).toBe('false');
  });

  it('sets data-selected=true when selected', () => {
    const { container } = renderWith({ type: 'art', selected: true });
    const card = container.querySelector('[data-buzzy-card]');
    expect(card?.getAttribute('data-selected')).toBe('true');
  });

  it('uses accent (purple) border when selected and type is script', () => {
    const { container } = renderWith({ type: 'script', selected: true });
    const card = container.querySelector('[data-buzzy-card]') as HTMLElement;
    expect(card.style.borderColor).toContain('accent-500');
  });

  it('uses blue border when selected and type is art', () => {
    const { container } = renderWith({ type: 'art', selected: true });
    const card = container.querySelector('[data-buzzy-card]') as HTMLElement;
    // Blue: oklch(70% 0.15 230) — browser normalizes to oklch(0.7 0.15 230)
    expect(card.style.borderColor).toMatch(/oklch\(0?\.?7\b.*230\)/);
  });

  it('uses yellow border when selected and type is deliverable', () => {
    const { container } = renderWith({ type: 'deliverable', selected: true });
    const card = container.querySelector('[data-buzzy-card]') as HTMLElement;
    // Yellow: oklch(85% 0.18 95) — browser normalizes to oklch(0.85 0.18 95)
    expect(card.style.borderColor).toMatch(/oklch\(0?\.?85\b.*95\)/);
  });

  it('uses yellow border when selected and type is videoClip', () => {
    const { container } = renderWith({ type: 'videoClip', selected: true });
    const card = container.querySelector('[data-buzzy-card]') as HTMLElement;
    expect(card.style.borderColor).toMatch(/oklch\(0?\.?85\b.*95\)/);
  });

  it('uses default dark border when not selected', () => {
    const { container } = renderWith({ type: 'art', selected: false });
    const card = container.querySelector('[data-buzzy-card]') as HTMLElement;
    // Default: oklch(22% 0.015 250) — browser normalizes to oklch(0.22 0.015 250)
    expect(card.style.borderColor).toMatch(/oklch\(0?\.?22\b.*250\)/);
  });

  it('applies highlighted accent border when highlighted and not selected', () => {
    const { container } = renderWith({ type: 'art', data: { _highlighted: true } });
    const card = container.querySelector('[data-buzzy-card]') as HTMLElement;
    expect(card.style.borderColor).toContain('accent-500');
  });
});

describe('BuzzyCard — status dot', () => {
  it('does not render dot when no status', () => {
    const { container } = renderWith({ type: 'art' });
    const dot = container.querySelector('[aria-label^="status:"]');
    expect(dot).toBeNull();
  });

  it('renders status dot for draft', () => {
    const { container } = renderWith({ type: 'art', data: { status: 'draft' } });
    const dot = container.querySelector('[aria-label="status: draft"]');
    expect(dot).toBeInTheDocument();
  });

  it('renders status dot for in_progress with pulse animation', () => {
    const { container } = renderWith({ type: 'art', data: { status: 'in_progress' } });
    const dot = container.querySelector('[aria-label="status: in_progress"]');
    expect(dot).toBeInTheDocument();
    expect(dot?.className).toContain('animate-status-pulse');
  });

  it('renders status dot for done', () => {
    const { container } = renderWith({ type: 'art', data: { status: 'done' } });
    const dot = container.querySelector('[aria-label="status: done"]');
    expect(dot).toBeInTheDocument();
  });

  it('renders status dot for review', () => {
    const { container } = renderWith({ type: 'art', data: { status: 'review' } });
    const dot = container.querySelector('[aria-label="status: review"]');
    expect(dot).toBeInTheDocument();
  });
});

describe('BuzzyCard — custom className & style', () => {
  it('merges custom className', () => {
    const { container } = render(
      <BuzzyCard type="art" data={baseData} className="w-[300px] mt-4">
        body
      </BuzzyCard>
    );
    const card = container.querySelector('[data-buzzy-card]') as HTMLElement;
    expect(card.className).toContain('w-[300px]');
    expect(card.className).toContain('mt-4');
  });

  it('merges custom style', () => {
    const { container } = render(
      <BuzzyCard type="art" data={baseData} style={{ marginTop: 16 }}>
        body
      </BuzzyCard>
    );
    const card = container.querySelector('[data-buzzy-card]') as HTMLElement;
    expect(card.style.marginTop).toBe('16px');
  });
});
