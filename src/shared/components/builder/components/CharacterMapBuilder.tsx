import { useState } from 'react';
import type { BuilderComponentProps } from '../registry';

interface CharacterNode {
  id: string;
  label: string;
  role?: string;
  linkedTreeNodeId?: string;
}

interface RelationEdge {
  from: string;
  to: string;
  relation: string;
}

interface CharacterMapData {
  nodes?: CharacterNode[];
  edges?: RelationEdge[];
}

export function CharacterMapBuilder({
  config,
  currentStep,
  totalSteps,
  edits,
  onConfirmStep,
  onUpdateEdits,
}: BuilderComponentProps) {
  const data = (config.data as CharacterMapData) || {};
  const nodes = data.nodes ?? [];
  const edges = data.edges ?? [];

  // Merge edits into data
  const mergedNodes = edits.nodes ? (edits.nodes as CharacterNode[]) : nodes;
  const mergedEdges = edits.edges ? (edits.edges as RelationEdge[]) : edges;

  const [editingNode, setEditingNode] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');

  const handleEditNode = (nodeId: string) => {
    const node = mergedNodes.find((n) => n.id === nodeId);
    setEditingNode(nodeId);
    setEditLabel(node?.label ?? '');
  };

  const handleSaveEdit = () => {
    if (!editingNode || !editLabel.trim()) return;
    const updated = mergedNodes.map((n) =>
      n.id === editingNode ? { ...n, label: editLabel.trim() } : n,
    );
    onUpdateEdits({ nodes: updated });
    setEditingNode(null);
  };

  return (
    <div className="flex flex-col gap-3 p-4">
      {/* Step indicator */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-[var(--color-text-secondary)]">
          步骤 {currentStep + 1}/{totalSteps}
        </span>
      </div>

      {/* Step 1: Character nodes */}
      {currentStep === 0 && (
        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">角色节点</h3>
          <div className="grid grid-cols-3 gap-2">
            {mergedNodes.map((node) => (
              <div
                key={node.id}
                className="flex flex-col items-center gap-1 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] p-3"
              >
                {editingNode === node.id ? (
                  <input
                    className="w-full rounded border border-[var(--color-accent-300)] px-2 py-1 text-xs text-center"
                    value={editLabel}
                    onChange={(e) => setEditLabel(e.target.value)}
                    onBlur={handleSaveEdit}
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveEdit()}
                    autoFocus
                  />
                ) : (
                  <span
                    className="cursor-pointer text-xs font-medium text-[var(--color-text-primary)] hover:text-[var(--color-accent-500)]"
                    onClick={() => handleEditNode(node.id)}
                  >
                    {node.label}
                  </span>
                )}
                {node.role && (
                  <span className="text-[10px] text-[var(--color-text-tertiary)]">
                    [{node.role}]
                  </span>
                )}
              </div>
            ))}
          </div>
          <p className="text-[10px] text-[var(--color-text-tertiary)]">
            点击角色名称可编辑
          </p>
        </div>
      )}

      {/* Step 2: Relationship edges */}
      {currentStep === 1 && (
        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">关系连线</h3>
          <div className="flex flex-col gap-1.5">
            {mergedEdges.map((edge, idx) => {
              const fromNode = mergedNodes.find((n) => n.id === edge.from);
              const toNode = mergedNodes.find((n) => n.id === edge.to);
              return (
                <div
                  key={idx}
                  className="flex items-center gap-2 rounded border border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] px-3 py-2 text-xs"
                >
                  <span className="font-medium text-[var(--color-text-primary)]">
                    {fromNode?.label ?? edge.from}
                  </span>
                  <span className="text-[var(--color-accent-500)]">──{edge.relation}──</span>
                  <span className="font-medium text-[var(--color-text-primary)]">
                    {toNode?.label ?? edge.to}
                  </span>
                </div>
              );
            })}
            {mergedEdges.length === 0 && (
              <p className="text-[10px] text-[var(--color-text-tertiary)]">暂无关关系连线</p>
            )}
          </div>
        </div>
      )}

      {/* Confirm button */}
      <button
        onClick={onConfirmStep}
        className="mt-2 self-end rounded bg-[var(--color-accent-500)] px-4 py-1.5 text-xs font-medium text-white hover:bg-[var(--color-accent-600)]"
      >
        {currentStep + 1 >= totalSteps ? '全部确认 · 写入画布' : `确认步骤 ${currentStep + 1}`}
      </button>
    </div>
  );
}
