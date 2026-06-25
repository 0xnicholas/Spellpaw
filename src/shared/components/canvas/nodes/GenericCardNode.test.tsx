import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GenericCardNode } from './GenericCardNode';
import type { CanvasNodeData } from '@drama/types';

vi.mock('@xyflow/react', async () => {
  const actual = await vi.importActual('@xyflow/react');
  return { ...actual, Handle: () => null };
});

type LooseNodeProps = {
  id: string;
  data: Record<string, unknown> & Partial<CanvasNodeData>;
  type?: string;
  selected?: boolean;
  zIndex?: number;
  isConnectable?: boolean;
  xPos?: number;
  yPos?: number;
  dragging?: boolean;
  width?: number;
  height?: number;
};

function makeProps(data: Record<string, unknown>): LooseNodeProps {
  return {
    id: 'n1',
    data: data as LooseNodeProps['data'],
    type: 'storyline',
    selected: false,
    zIndex: 0,
    isConnectable: false,
    xPos: 0,
    yPos: 0,
    dragging: false,
    width: 240,
    height: 100,
  };
}

// Cast at the call site to bypass strict NodeProps type check
const renderCard = (data: Record<string, unknown>) =>
  render(<GenericCardNode {...(makeProps(data) as unknown as Parameters<typeof GenericCardNode>[0])} />);

describe('GenericCardNode — placeholder state', () => {
  it('shows "Output will appear here..." when isPlaceholder=true', () => {
    renderCard({ type: 'storyline', title: 'X', isPlaceholder: true });
    expect(screen.getByText(/Output will appear here/i)).toBeInTheDocument();
  });

  it('hides description when isPlaceholder=true', () => {
    renderCard({
      type: 'storyline',
      title: 'X',
      isPlaceholder: true,
      description: 'should not show',
    });
    expect(screen.queryByText('should not show')).not.toBeInTheDocument();
  });
});

describe('GenericCardNode — normal state', () => {
  it('shows title when isPlaceholder=false', () => {
    renderCard({ type: 'storyline', title: 'My Story' });
    expect(screen.getByText('My Story')).toBeInTheDocument();
  });

  it('shows description when isPlaceholder=false', () => {
    renderCard({ type: 'storyline', title: 'My Story', description: 'A great story' });
    expect(screen.getByText('A great story')).toBeInTheDocument();
  });
});