import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CardCopilotPopover } from './CardCopilotPopover';

vi.mock('@shared/components/canvas/hooks/useCopilotGenerate', () => ({
  useCopilotGenerate: () => ({
    submit: vi.fn(),
    isGenerating: false,
  }),
}));

beforeAll(() => {
  if (!document.getElementById('popover-root')) {
    const div = document.createElement('div');
    div.setAttribute('id', 'popover-root');
    document.body.appendChild(div);
  }
});

const baseProps = {
  cardId: 'card_1',
  kind: 'text' as const,
  screenPosition: { x: 300, y: 400 },
  onClose: vi.fn(),
};

describe('CardCopilotPopover — basic', () => {
  it('renders prompt textarea', () => {
    render(<CardCopilotPopover {...baseProps} />);
    expect(screen.getByTestId('copilot-prompt')).toBeInTheDocument();
  });

  it('send button disabled when prompt is empty', () => {
    render(<CardCopilotPopover {...baseProps} />);
    expect(screen.getByTestId('copilot-send')).toBeDisabled();
  });

  it('send button enabled when prompt is non-empty', () => {
    render(<CardCopilotPopover {...baseProps} />);
    fireEvent.change(screen.getByTestId('copilot-prompt'), { target: { value: 'hello' } });
    expect(screen.getByTestId('copilot-send')).not.toBeDisabled();
  });

  it('renders via portal at position:fixed', () => {
    const { container } = render(<CardCopilotPopover {...baseProps} />);
    const popover = document.querySelector('[data-buzzy-popover-content]') as HTMLElement;
    expect(popover).toBeInTheDocument();
    expect(popover.style.position).toBe('fixed');
    // Not inside the render container (should be in document.body via portal)
    expect(container.querySelector('[data-buzzy-popover-content]')).toBeNull();
  });

  it('calls onClose when Escape pressed', () => {
    const onClose = vi.fn();
    render(<CardCopilotPopover {...baseProps} onClose={onClose} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });

  it('popover is rendered in document body via portal', () => {
    render(<CardCopilotPopover {...baseProps} />);
    const popover = document.querySelector('[data-buzzy-popover-content]') as HTMLElement;
    expect(popover).toBeInTheDocument();
  });
});
