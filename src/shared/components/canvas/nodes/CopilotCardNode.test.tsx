import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ReactFlowProvider } from '@xyflow/react';
import { CopilotCardNode } from './CopilotCardNode';
import type { CopilotCardNodeData } from './CopilotCardNode';
import { useCanvasStore } from '@drama/stores/canvasStore';
import { useProjectStore } from '@drama/stores/projectStore';
import { providerRegistry } from '@drama/lib/canvasToolkit';
import type { GenerationProvider, GenerationTask } from '@drama/lib/canvasToolkit';
import type { NodeProps, Node } from '@xyflow/react';

function makeNodeProps(id: string, data: CopilotCardNodeData): NodeProps<Node<Record<string, unknown>>> {
  return {
    id,
    data: data as unknown as Record<string, unknown>,
    type: 'copilotCard',
  } as unknown as NodeProps<Node<Record<string, unknown>>>;
}

function renderInFlow(node: React.ReactNode) {
  return render(<ReactFlowProvider>{node}</ReactFlowProvider>);
}

function setupProjectAndAddCopilot(id: string, data: CopilotCardNodeData) {
  useProjectStore.setState({
    projects: [{ id: 'proj_1', title: 'Test', description: '', updatedAt: '', sceneCount: 0, duration: 0, coverColor: '#6366f1' }],
    currentProjectId: 'proj_1',
  });
  useCanvasStore.setState({
    canvases: {
      'proj_1': {
        nodes: [{ id, type: 'copilotCard' as never, position: { x: 100, y: 100 }, data: data as never }],
        edges: [],
        viewport: { x: 0, y: 0, zoom: 1 },
      },
    },
  });
}

describe('CopilotCardNode — text kind', () => {
  beforeEach(() => {
    setupProjectAndAddCopilot('c1', { kind: 'text', status: 'idle', prompt: 'a hero enters a cafe' });
  });

  it('renders prompt textarea and generate button disabled when prompt is empty', () => {
    // Override with empty prompt
    useCanvasStore.getState().updateNodeData('c1', { prompt: '' });
    renderInFlow(<CopilotCardNode {...makeNodeProps('c1', { kind: 'text', status: 'idle', prompt: '' })} />);
    const btn = screen.getByRole('button', { name: /生成/ });
    expect(btn).toBeDisabled();
  });

  it('creates a storyline card and removes itself when generate is clicked (text kind, no external API)', () => {
    renderInFlow(<CopilotCardNode {...makeNodeProps('c1', { kind: 'text', status: 'idle', prompt: 'a hero enters a cafe' })} />);
    const btn = screen.getByRole('button', { name: /生成/ });
    fireEvent.click(btn);
    const nodes = useCanvasStore.getState().getCurrentNodes();
    expect(nodes.find(n => n.id === 'c1')).toBeUndefined();
    expect(nodes.find(n => n.type === 'storyline')).toBeDefined();
  });
});

describe('CopilotCardNode — upload kind', () => {
  beforeEach(() => {
    setupProjectAndAddCopilot('c1', { kind: 'upload', status: 'idle' });
  });

  it('creates asset card with dataUrl after file input change', async () => {
    renderInFlow(<CopilotCardNode {...makeNodeProps('c1', { kind: 'upload', status: 'idle' })} />);
    const file = new File(['hello'], 'photo.png', { type: 'image/png' });
    const input = screen.getByLabelText(/upload/i) as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });
    await new Promise(r => setTimeout(r, 100));
    const nodes = useCanvasStore.getState().getCurrentNodes();
    expect(nodes.find(n => n.type === 'asset')).toBeDefined();
    expect(nodes.find(n => n.id === 'c1')).toBeUndefined();
  });
});

describe('CopilotCardNode — image kind', () => {
  beforeEach(() => {
    setupProjectAndAddCopilot('c1', { kind: 'image', status: 'idle', prompt: 'a cat', providerId: 'mock' });
    const mockProvider: GenerationProvider = {
      id: 'mock',
      name: 'Mock',
      supportedMedia: ['image'],
      capabilities: ['text2image'],
      requiredConfigKeys: [],
      isConfigured: () => true,
      configure: () => {},
      estimateCost: () => ({ amount: 0, unit: 'USD' }),
      submit: async () => ({ taskId: 't1', status: 'pending' }),
      poll: (async (): Promise<GenerationTask> => ({ taskId: 't1', status: 'done', resultUrl: 'https://img/x.png' })) as GenerationProvider['poll'],
    };
    providerRegistry.register(mockProvider);
  });

  it('calls provider.submit then creates art card and removes itself', async () => {
    renderInFlow(<CopilotCardNode {...makeNodeProps('c1', { kind: 'image', status: 'idle', prompt: 'a cat', providerId: 'mock' })} />);
    fireEvent.click(screen.getByRole('button', { name: /生成/ }));
    await new Promise(r => setTimeout(r, 1200));
    const nodes = useCanvasStore.getState().getCurrentNodes();
    expect(nodes.find(n => n.type === 'art')).toBeDefined();
    expect(nodes.find(n => n.id === 'c1')).toBeUndefined();
  });

  it('aborts polling on unmount and does not create art card', async () => {
    const { unmount } = renderInFlow(<CopilotCardNode {...makeNodeProps('c1', { kind: 'image', status: 'idle', prompt: 'a cat', providerId: 'mock' })} />);
    fireEvent.click(screen.getByRole('button', { name: /生成/ }));
    unmount();
    await new Promise(r => setTimeout(r, 1200));
    const nodes = useCanvasStore.getState().getCurrentNodes();
    expect(nodes.find(n => n.type === 'art')).toBeUndefined();
  });
});

describe('CopilotCardNode — error state', () => {
  beforeEach(() => {
    setupProjectAndAddCopilot('c1', { kind: 'image', status: 'idle', prompt: 'a cat', providerId: 'fail' });
    const failingProvider: GenerationProvider = {
      id: 'fail',
      name: 'Fail',
      supportedMedia: ['image'],
      capabilities: ['text2image'],
      requiredConfigKeys: [],
      isConfigured: () => true,
      configure: () => {},
      estimateCost: () => ({ amount: 0, unit: 'USD' }),
      submit: async () => { throw new Error('network down'); },
    };
    providerRegistry.register(failingProvider);
  });

  it('records error in node data when generation fails', async () => {
    renderInFlow(<CopilotCardNode {...makeNodeProps('c1', { kind: 'image', status: 'idle', prompt: 'a cat', providerId: 'fail' })} />);
    fireEvent.click(screen.getByRole('button', { name: /生成/ }));
    await new Promise(r => setTimeout(r, 100));
    const node = useCanvasStore.getState().getCurrentNodes().find(n => n.id === 'c1');
    expect(node?.data?.error).toContain('network down');
    expect(node?.data?.status).toBe('error');
  });
});
