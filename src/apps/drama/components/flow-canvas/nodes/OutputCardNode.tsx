import type { NodeProps, Node } from '@xyflow/react';
import type { CanvasNodeData } from '@drama/types';

export function OutputCardNode({ data, selected }: NodeProps<Node<CanvasNodeData>>) {
  return (
    <div
      className={`w-[240px] border-2 border-red-500 ${selected ? 'border-[var(--color-accent-500)]' : ''}`}
    >
      <div className="p-3">
        <h4 className="text-sm font-medium text-[var(--color-text-primary)] m-0">{data.title}</h4>
      </div>
    </div>
  );
}
