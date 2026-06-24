import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NodeContextMenu } from './NodeContextMenu';

describe('NodeContextMenu', () => {
  it('renders all 4 menu items', () => {
    render(<NodeContextMenu x={100} y={100} nodeId="n-1" onAction={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByText('Rename')).toBeInTheDocument();
    expect(screen.getByText('Copy ID')).toBeInTheDocument();
    expect(screen.getByText('Duplicate')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();
  });

  it('positions menu at x/y (screen coords)', () => {
    const { container } = render(
      <NodeContextMenu x={150} y={250} nodeId="n-1" onAction={vi.fn()} onClose={vi.fn()} />,
    );
    const menu = container.querySelector('[data-testid="node-context-menu"]') as HTMLElement;
    expect(menu.style.left).toBe('150px');
    expect(menu.style.top).toBe('250px');
  });

  it('embeds nodeId for downstream handlers', () => {
    const { container } = render(
      <NodeContextMenu x={0} y={0} nodeId="card-abc" onAction={vi.fn()} onClose={vi.fn()} />,
    );
    const menu = container.querySelector('[data-testid="node-context-menu"]') as HTMLElement;
    expect(menu.dataset.nodeId).toBe('card-abc');
  });

  it('calls onAction with correct action when item clicked', () => {
    const onAction = vi.fn();
    render(<NodeContextMenu x={0} y={0} nodeId="n-1" onAction={onAction} onClose={vi.fn()} />);
    fireEvent.click(screen.getByTestId('node-context-rename'));
    expect(onAction).toHaveBeenCalledWith('rename');
    fireEvent.click(screen.getByTestId('node-context-copy-id'));
    expect(onAction).toHaveBeenCalledWith('copy-id');
    fireEvent.click(screen.getByTestId('node-context-duplicate'));
    expect(onAction).toHaveBeenCalledWith('duplicate');
    fireEvent.click(screen.getByTestId('node-context-delete'));
    expect(onAction).toHaveBeenCalledWith('delete');
  });

  it('calls onClose when overlay is clicked', () => {
    const onClose = vi.fn();
    const { container } = render(
      <NodeContextMenu x={0} y={0} nodeId="n-1" onAction={vi.fn()} onClose={onClose} />,
    );
    const overlay = container.querySelector('[data-testid="node-context-overlay"]') as HTMLElement;
    fireEvent.click(overlay);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls onClose when Escape is pressed', () => {
    const onClose = vi.fn();
    render(<NodeContextMenu x={0} y={0} nodeId="n-1" onAction={vi.fn()} onClose={onClose} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('removes Escape listener on unmount', () => {
    const onClose = vi.fn();
    const { unmount } = render(
      <NodeContextMenu x={0} y={0} nodeId="n-1" onAction={vi.fn()} onClose={onClose} />,
    );
    unmount();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('Delete item has destructive styling (red text)', () => {
    render(<NodeContextMenu x={0} y={0} nodeId="n-1" onAction={vi.fn()} onClose={vi.fn()} />);
    const deleteBtn = screen.getByTestId('node-context-delete');
    expect(deleteBtn.className).toContain('text-red-500');
  });

  it('Non-destructive items use default text color', () => {
    render(<NodeContextMenu x={0} y={0} nodeId="n-1" onAction={vi.fn()} onClose={vi.fn()} />);
    const renameBtn = screen.getByTestId('node-context-rename');
    expect(renameBtn.className).not.toContain('text-red-500');
  });
});