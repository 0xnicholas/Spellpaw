import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PaneContextMenu } from './PaneContextMenu';

describe('PaneContextMenu', () => {
  const flowPos = { x: 200, y: 300 };

  it('renders all 4 menu items', () => {
    render(<PaneContextMenu x={100} y={100} flowPosition={flowPos} onClose={vi.fn()} onCreate={vi.fn()} />);
    expect(screen.getByText('Upload')).toBeInTheDocument();
    expect(screen.getByText('Text Generation')).toBeInTheDocument();
    expect(screen.getByText('Image Generation')).toBeInTheDocument();
    expect(screen.getByText('Video Generation')).toBeInTheDocument();
  });

  it('positions menu at x/y (screen coords)', () => {
    const { container } = render(<PaneContextMenu x={150} y={250} flowPosition={flowPos} onClose={vi.fn()} onCreate={vi.fn()} />);
    const menu = container.querySelector('[data-testid="pane-context-menu"]') as HTMLElement;
    expect(menu.style.left).toBe('150px');
    expect(menu.style.top).toBe('250px');
  });

  it('calls onCreate with flowPosition (NOT screen x/y) when item clicked', () => {
    const onCreate = vi.fn();
    render(<PaneContextMenu x={150} y={250} flowPosition={flowPos} onClose={vi.fn()} onCreate={onCreate} />);
    fireEvent.click(screen.getByText('Image Generation'));
    expect(onCreate).toHaveBeenCalledWith('image', flowPos);
  });

  it('calls onClose when overlay is clicked', () => {
    const onClose = vi.fn();
    const { container } = render(<PaneContextMenu x={0} y={0} flowPosition={flowPos} onClose={onClose} onCreate={vi.fn()} />);
    const overlay = container.querySelector('[data-testid="pane-context-overlay"]') as HTMLElement;
    fireEvent.click(overlay);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls onClose when Escape is pressed', () => {
    const onClose = vi.fn();
    render(<PaneContextMenu x={0} y={0} flowPosition={flowPos} onClose={onClose} onCreate={vi.fn()} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('removes Escape listener on unmount', () => {
    const onClose = vi.fn();
    const { unmount } = render(<PaneContextMenu x={0} y={0} flowPosition={flowPos} onClose={onClose} onCreate={vi.fn()} />);
    unmount();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
  });
});
