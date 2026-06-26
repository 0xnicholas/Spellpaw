/* eslint-disable */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import React from 'react';
import { CanvasPanel } from './CanvasPanel';
import { useCanvasStore } from '@drama/stores/canvasStore';
import { useProjectStore } from '@drama/stores/projectStore';
import { ReactFlowProvider } from '@xyflow/react';

// Mock @xyflow/react with a simplified ReactFlow component that we can drive.
// Keep ReactFlowProvider, useViewport, and other hooks functional so
// CanvasPanel's internal useViewport works.
vi.mock('@xyflow/react', async () => {
  const actual = await vi.importActual('@xyflow/react');
  return {
    ...actual,
    useViewport: () => ({ x: 0, y: 0, zoom: 1 }),
    ReactFlow: ({
      children,
      onNodeClick,
      onPaneClick,
      onPaneContextMenu,
      nodes,
      onNodeDrag,
    }: {
      children?: React.ReactNode;
      onNodeClick?: (e: React.MouseEvent, n: { id: string; type?: string; position: { x: number; y: number }; data: Record<string, unknown> }) => void;
      onPaneClick?: (e: React.MouseEvent) => void;
      onPaneContextMenu?: (e: React.MouseEvent) => void;
      nodes?: Array<{ id: string; type?: string; position: { x: number; y: number }; data: Record<string, unknown> }>;
      onNodeDrag?: (e: React.MouseEvent, n: { id: string }) => void;
    }) => {
      return (
        <div>
          <div
            data-testid="pane"
            onClick={onPaneClick}
            onContextMenu={(e) => {
              e.preventDefault?.();
              onPaneContextMenu?.(e);
            }}
          >
            Pane
          </div>
          {(nodes || []).map((n) => (
            <div
              key={n.id}
              data-testid={`node-${n.id}`}
              data-node-type={n.type}
              onClick={(e) => onNodeClick?.(e, n)}
              onMouseDown={(e) => onNodeDrag?.(e as never, n)}
            >
              {String(n.data?.title ?? n.id)}
            </div>
          ))}
          {children}
        </div>
      );
    },
  };
});

// Wrap all renders in ReactFlowProvider so CanvasPanel's internal useViewport
// hook has the required zustand store context.
const WrapWithProvider = ({ children }: React.PropsWithChildren) => (
  <ReactFlowProvider>{children}</ReactFlowProvider>
);

function setupProject() {
  useProjectStore.setState({
    projects: [
      {
        id: 'proj_1',
        title: 'Test',
        description: '',
        updatedAt: '',
        sceneCount: 0,
        duration: 0,
        coverColor: '#6366f1',
      },
    ],
    },
    currentProjectId: 'proj_1',
  });
  useCanvasStore.setState({
    canvases: {
      proj_1: { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } },
    },
  });
}

beforeEach(() => {
  setupProject();
});

function renderPanel() {
  return render(<CanvasPanel />, { wrapper: WrapWithProvider });
}

describe('CanvasPanel — right-click creates card + opens popover', () => {
  it('right-click pane → context menu shows', () => {
    renderPanel();
    fireEvent.contextMenu(screen.getByTestId('pane'), { clientX: 100, clientY: 200 });
    expect(screen.getByText('Upload')).toBeInTheDocument();
    expect(screen.getByText('Text Generation')).toBeInTheDocument();
    expect(screen.getByText('Image Generation')).toBeInTheDocument();
    expect(screen.getByText('Video Generation')).toBeInTheDocument();
  });

  it('selecting Text Generation creates a storyline card with placeholder', async () => {
    renderPanel();
    fireEvent.contextMenu(screen.getByTestId('pane'), { clientX: 100, clientY: 200 });
    fireEvent.click(screen.getByText('Text Generation'));
    await waitFor(() => {
      const nodes = useCanvasStore.getState().getCurrentNodes();
      expect(nodes.length).toBe(1);
      expect(nodes[0].type).toBe('storyline');
      expect(nodes[0].data.isPlaceholder).toBe(true);
    });
  });
});

describe('CanvasPanel — single click opens popover', () => {
  beforeEach(() => {
    useCanvasStore.setState({
      canvases: {
        proj_1: {
          nodes: [
            {
              id: 'card_1',
              type: 'storyline',
              position: { x: 0, y: 0 },
              data: { title: 'Story' },
            },
          ],
          edges: [],
          viewport: { x: 0, y: 0, zoom: 1 },
        },
      },
    });
  });

  it('clicking existing card opens copilot popover', async () => {
    renderPanel();
    fireEvent.click(screen.getByTestId('node-card_1'));
    await waitFor(
      () => expect(screen.getByRole('dialog', { name: /copilot/i })).toBeInTheDocument(),
      { timeout: 3000 },
    );
  });

  it('self-click guard: clicking same card twice does not duplicate popover', async () => {
    renderPanel();
    fireEvent.click(screen.getByTestId('node-card_1'));
    await waitFor(() => screen.getByRole('dialog'), { timeout: 3000 });
    fireEvent.click(screen.getByTestId('node-card_1'));
    expect(screen.getAllByRole('dialog', { name: /copilot/i }).length).toBe(1);
  });
});

describe('CanvasPanel — target card deleted → popover closes', () => {
  it('when card is removed from store, popover closes', async () => {
    useCanvasStore.setState({
      canvases: {
        proj_1: {
          nodes: [
            {
              id: 'card_1',
              type: 'storyline',
              position: { x: 0, y: 0 },
              data: { title: 'Story' },
            },
          ],
          edges: [],
          viewport: { x: 0, y: 0, zoom: 1 },
        },
      },
    });
    renderPanel();
    fireEvent.click(screen.getByTestId('node-card_1'));
    await waitFor(() => screen.getByRole('dialog'), { timeout: 3000 });

    act(() => {
      useCanvasStore.getState().removeNode('card_1');
    });

    await waitFor(
      () => expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
      { timeout: 3000 },
    );
  });
});

describe('CanvasPanel — Esc closes popover', () => {
  it('Escape key closes the popover', async () => {
    useCanvasStore.setState({
      canvases: {
        proj_1: {
          nodes: [
            {
              id: 'card_1',
              type: 'storyline',
              position: { x: 0, y: 0 },
              data: { title: 'Story' },
            },
          ],
          edges: [],
          viewport: { x: 0, y: 0, zoom: 1 },
        },
      },
    });
    renderPanel();
    fireEvent.click(screen.getByTestId('node-card_1'));
    await waitFor(() => screen.getByRole('dialog'), { timeout: 3000 });
    fireEvent.keyDown(window, { key: 'Escape' });
    await waitFor(
      () => expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
      { timeout: 3000 },
    );
  });
});

describe('CanvasPanel — pane click closes popover', () => {
  it('clicking pane closes popover', async () => {
    useCanvasStore.setState({
      canvases: {
        proj_1: {
          nodes: [
            {
              id: 'card_1',
              type: 'storyline',
              position: { x: 0, y: 0 },
              data: { title: 'Story' },
            },
          ],
          edges: [],
          viewport: { x: 0, y: 0, zoom: 1 },
        },
      },
    });
    renderPanel();
    fireEvent.click(screen.getByTestId('node-card_1'));
    await waitFor(() => screen.getByRole('dialog'), { timeout: 3000 });
    fireEvent.click(screen.getByTestId('pane'));
    await waitFor(
      () => expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
      { timeout: 3000 },
    );
  });
});