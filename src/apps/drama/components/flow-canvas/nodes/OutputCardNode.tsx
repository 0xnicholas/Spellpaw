import type { NodeProps, Node } from '@xyflow/react';
import type { CanvasNodeData } from '@drama/types';

export function OutputCardNode({ data, selected }: NodeProps<Node<CanvasNodeData>>) {
  return (
    <div
      className={selected ? 'border-[var(--color-accent-500)]' : ''}
    >
      <div className="p-3">
        <h4 className="text-sm font-medium text-[var(--color-text-primary)]">{data.title}</h4>
      </div>
    </div>
  );
}
