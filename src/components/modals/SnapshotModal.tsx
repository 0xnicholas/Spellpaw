import { useState, useEffect, useCallback } from 'react';
import { X, Camera, RotateCcw, GitCompare, Trash2 } from 'lucide-react';
import { useProjectStore } from '@/stores/projectStore';
import { useCanvasStore } from '@/stores/canvasStore';
import {
  saveSnapshot,
  listSnapshots,
  deleteSnapshot,
  type ProjectSnapshot,
} from '@/lib/projectSnapshot';
import { diffTrees, type NodeDiff } from '@/lib/treeDiff';
import { DeleteConfirmDialog } from './DeleteConfirmDialog';

interface SnapshotModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SnapshotModal({ isOpen, onClose }: SnapshotModalProps) {
  const projectId = useProjectStore((s) => s.currentProjectId);
  const tree = useProjectStore((s) => (projectId ? s.trees[projectId] : null));
  const canvasNodes = useCanvasStore((s) => (projectId ? s.canvases[projectId]?.nodes ?? [] : []));
  const canvasEdges = useCanvasStore((s) => (projectId ? s.canvases[projectId]?.edges ?? [] : []));

  const [snapshots, setSnapshots] = useState<ProjectSnapshot[]>([]);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [compareBase, setCompareBase] = useState<ProjectSnapshot | null>(null);
  const [diffs, setDiffs] = useState<NodeDiff[] | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!projectId) return;
    const list = await listSnapshots(projectId);
    setSnapshots(list);
  }, [projectId]);

  useEffect(() => {
    if (isOpen) {
      refresh();
      setCompareBase(null);
      setDiffs(null);
    }
  }, [isOpen, refresh]);

  const handleSave = async () => {
    if (!projectId || !tree || !name.trim()) return;
    setLoading(true);
    await saveSnapshot(projectId, name.trim(), {
      tree,
      canvases: { nodes: canvasNodes, edges: canvasEdges },
    });
    setName('');
    await refresh();
    setLoading(false);
  };

  const handleRollback = async (snapshot: ProjectSnapshot) => {
    if (!confirm(`回滚到「${snapshot.name}」?\n当前未保存的修改将丢失。`)) return;
    useProjectStore.setState((s) => ({
      trees: { ...s.trees, [snapshot.projectId]: snapshot.data.tree },
    }));
    if (snapshot.data.canvases) {
      useCanvasStore.setState((s) => ({
        canvases: {
          ...s.canvases,
          [snapshot.projectId]: {
            ...s.canvases[snapshot.projectId],
            nodes: snapshot.data.canvases!.nodes,
            edges: snapshot.data.canvases!.edges,
          },
        },
      }));
    }
    onClose();
  };

  const handleCompare = (snapshot: ProjectSnapshot) => {
    if (!tree) return;
    if (compareBase && compareBase.id === snapshot.id) {
      setCompareBase(null);
      setDiffs(null);
      return;
    }
    if (!compareBase) {
      setCompareBase(snapshot);
      return;
    }
    // Compare selected snapshot against compareBase
    const result = diffTrees(compareBase.data.tree, snapshot.data.tree);
    setDiffs(result.nodeDiffs);
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="flex h-[80vh] w-full max-w-lg flex-col rounded-[var(--radius-base)] border border-[var(--color-border-default)] bg-[var(--color-bg-primary)] shadow-lg">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--color-border-default)] px-5 py-3">
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">项目快照</h3>
          <button onClick={onClose} className="rounded p-1 text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg-secondary)]">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Save new */}
        <div className="border-b border-[var(--color-border-default)] px-5 py-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSave()}
              placeholder="快照名称（如：大纲定稿）"
              className="flex-1 rounded-[var(--radius-sm)] border border-[var(--color-border-default)] bg-[var(--color-bg-primary)] px-2.5 py-1.5 text-xs outline-none focus:border-[var(--color-accent-500)]"
            />
            <button
              onClick={handleSave}
              disabled={loading || !name.trim()}
              className="flex items-center gap-1 rounded-[var(--radius-sm)] bg-[var(--color-accent-500)] px-3 py-1.5 text-xs font-medium text-white hover:bg-[var(--color-accent-600)] disabled:opacity-50"
            >
              <Camera className="h-3 w-3" />
              保存
            </button>
          </div>
          {compareBase && (
            <p className="mt-2 text-[10px] text-[var(--color-text-tertiary)]">
              已选择对比基准: 「{compareBase.name}」· 点击另一个快照查看差异
            </p>
          )}
        </div>

        {/* Diff view */}
        {diffs && (
          <div className="border-b border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] px-5 py-3 max-h-40 overflow-auto">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[11px] font-medium text-[var(--color-text-secondary)]">差异对比</span>
              <button onClick={() => { setCompareBase(null); setDiffs(null); }} className="text-[10px] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]">清除</button>
            </div>
            {diffs.length === 0 ? (
              <p className="text-[11px] text-[var(--color-text-tertiary)]">无差异</p>
            ) : (
              <div className="space-y-1">
                {diffs.slice(0, 20).map((d) => (
                  <div key={d.nodeId} className="text-[10px]">
                    <span className={
                      d.type === 'added' ? 'text-emerald-600' : d.type === 'removed' ? 'text-red-500' : 'text-amber-600'
                    }>
                      {d.type === 'added' ? '+ 新增' : d.type === 'removed' ? '- 删除' : '~ 修改'}
                    </span>
                    <span className="text-[var(--color-text-secondary)] ml-1">{d.nodePath}</span>
                  </div>
                ))}
                {diffs.length > 20 && <p className="text-[10px] text-[var(--color-text-tertiary)]">...还有 {diffs.length - 20} 项</p>}
              </div>
            )}
          </div>
        )}

        {/* List */}
        <div className="flex-1 overflow-auto px-5 py-3">
          {snapshots.length === 0 ? (
            <div className="py-8 text-center">
              <Camera className="mx-auto h-6 w-6 text-[var(--color-text-tertiary)]" />
              <p className="mt-2 text-xs text-[var(--color-text-secondary)]">暂无快照</p>
              <p className="text-[10px] text-[var(--color-text-tertiary)]">保存当前状态，随时回滚</p>
            </div>
          ) : (
            <div className="space-y-2">
              {snapshots.map((s) => (
                <div
                  key={s.id}
                  className={`flex items-center gap-2 rounded-[var(--radius-sm)] border px-3 py-2 ${
                    compareBase?.id === s.id
                      ? 'border-[var(--color-accent-500)] bg-[var(--color-bg-accent-subtle)]'
                      : 'border-[var(--color-border-default)]'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-[var(--color-text-primary)] truncate">{s.name}</div>
                    <div className="text-[10px] text-[var(--color-text-tertiary)]">{formatTime(s.createdAt)}</div>
                  </div>
                  <button
                    onClick={() => handleCompare(s)}
                    title={compareBase?.id === s.id ? '取消选择' : '选择为对比基准'}
                    className={`rounded p-1 ${compareBase?.id === s.id ? 'text-[var(--color-accent-500)]' : 'text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]'}`}
                  >
                    <GitCompare className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleRollback(s)}
                    title="回滚到此版本"
                    className="rounded p-1 text-[var(--color-text-tertiary)] hover:text-[var(--color-accent-500)]"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setDeleteTarget(s.id)}
                    title="删除快照"
                    className="rounded p-1 text-[var(--color-text-tertiary)] hover:text-red-500"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <DeleteConfirmDialog
        isOpen={!!deleteTarget}
        title="删除快照"
        description="此操作不可撤销。"
        onConfirm={async () => {
          if (deleteTarget) {
            await deleteSnapshot(deleteTarget);
            await refresh();
          }
          setDeleteTarget(null);
        }}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
