import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ReactFlowProvider } from '@xyflow/react';
import { CanvasPanel } from './CanvasPanel';
import { useProjectStore } from '@drama/stores/projectStore';

// jsdom doesn't provide ResizeObserver; React Flow requires it.
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}
if (typeof globalThis.ResizeObserver === 'undefined') {
  (globalThis as { ResizeObserver: typeof ResizeObserverMock }).ResizeObserver = ResizeObserverMock;
}

function setupProject() {
  useProjectStore.setState({
    projects: [{ id: 'proj_1', title: 'Test', description: '', updatedAt: '', sceneCount: 0, duration: 0, coverColor: '#6366f1' }],
    trees: { 'proj_1': { id: 'root', type: 'project', title: 'Test', status: 'draft' as const } },
    currentProjectId: 'proj_1',
    selectedNodeId: null,
  });
}

describe('CanvasPanel — pane context menu', () => {
  beforeEach(setupProject);

  it('shows PaneContextMenu on pane right-click', () => {
    render(<ReactFlowProvider><CanvasPanel /></ReactFlowProvider>);
    const pane = document.querySelector('.react-flow__pane') as HTMLElement;
    fireEvent.contextMenu(pane, { clientX: 300, clientY: 400, button: 2 });
    expect(screen.getByTestId('pane-context-menu')).toBeInTheDocument();
  });

  it('creates a copilotCard node when "Image Generation" is clicked', () => {
    const { container } = render(<ReactFlowProvider><CanvasPanel /></ReactFlowProvider>);
    const pane = container.querySelector('.react-flow__pane') as HTMLElement;
    fireEvent.contextMenu(pane, { clientX: 300, clientY: 400, button: 2 });
    fireEvent.click(screen.getByText('Image Generation'));
    expect(screen.queryByTestId('pane-context-menu')).not.toBeInTheDocument();
    expect(container.querySelector('.react-flow__node-copilotCard')).toBeTruthy();
  });

  it('closes menu on overlay click', () => {
    render(<ReactFlowProvider><CanvasPanel /></ReactFlowProvider>);
    const pane = document.querySelector('.react-flow__pane') as HTMLElement;
    fireEvent.contextMenu(pane, { clientX: 100, clientY: 100, button: 2 });
    expect(screen.getByTestId('pane-context-menu')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('pane-context-overlay'));
    expect(screen.queryByTestId('pane-context-menu')).not.toBeInTheDocument();
  });
});
