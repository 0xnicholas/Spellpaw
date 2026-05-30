import { useState, useMemo } from 'react';
import { AlertTriangle, Check, ChevronDown, ChevronUp, GitMerge } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useProjectStore } from '@/stores/projectStore';
import type { ConflictInfo } from '@/lib/projectSync';
import { resolveConflictWithRemote, resolveConflictWithLocal, resolveConflictWithMerge } from '@/lib/projectSync';
import { dismissConflicts } from '@/lib/syncEngine';
import {
  diffTrees,
  diffTypeConfig,
  diffDisplayLabel,
  formatDiffValue,
} from '@/lib/treeDiff';
import type { TreeNode } from '@/types';

interface ConflictResolverModalProps {
  conflicts: ConflictInfo[];
  onResolved: () => void;
}

type ChoiceMap = Record<string, 'local' | 'remote'>;

export function ConflictResolverModal({ conflicts, onResolved }: ConflictResolverModalProps) {
  const [resolving, setResolving] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [choices, setChoices] = useState<ChoiceMap>({});
  const [expandedDiffs, setExpandedDiffs] = useState<Set<string>>(new Set());
  const [diffFilter, setDiffFilter] = useState<'all' | 'modified' | 'added' | 'removed'>('all');

  const current = conflicts[currentIndex];

  const parsedRemote = useMemo(() => {
    if (!current) return {};
    try {
      return JSON.parse(current.remoteProject.data || '{}');
    } catch {
      return {};
    }
  }, [current]);

  const remoteTree = parsedRemote.tree as TreeNode | undefined;

  const localTree = useMemo(() => {
    if (!current) return null;
    return useProjectStore.getState().trees[current.projectId];
  }, [current]);

  const treeDiff = useMemo(() => {
    if (!localTree || !remoteTree) return null;
    return diffTrees(localTree, remoteTree);
  }, [localTree, remoteTree]);

  const filteredDiffs = useMemo(() => {
    if (!treeDiff) return [];
    if (diffFilter === 'all') return treeDiff.nodeDiffs;
    return treeDiff.nodeDiffs.filter((d) => d.type === diffFilter);
  }, [treeDiff, diffFilter]);

  const setChoice = (nodeId: string, choice: 'local' | 'remote') => {
    setChoices((prev) => ({ ...prev, [nodeId]: choice }));
  };

  const setAll = (choice: 'local' | 'remote') => {
    if (!treeDiff) return;
    const next: ChoiceMap = {};
    for (const diff of treeDiff.nodeDiffs) {
      next[diff.nodeId] = choice;
    }
    setChoices(next);
  };

  const toggleExpand = (nodeId: string) => {
    setExpandedDiffs((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  };

  const advance = () => {
    setChoices({});
    setExpandedDiffs(new Set());
    if (currentIndex + 1 >= conflicts.length) {
      dismissConflicts();
      onResolved();
    } else {
      setCurrentIndex((i) => i + 1);
    }
  };

  const handleUseRemote = async () => {
    if (!current) return;
    setResolving(true);
    await resolveConflictWithRemote(current);
    advance();
    setResolving(false);
  };

  const handleUseLocal = async () => {
    if (!current) return;
    setResolving(true);
    await resolveConflictWithLocal(current);
    advance();
    setResolving(false);
  };

  const handleMerge = async () => {
    if (!current || !treeDiff) return;
    setResolving(true);
    await resolveConflictWithMerge(current, choices);
    advance();
    setResolving(false);
  };

  if (!current) return null;

  const resolvedCount = currentIndex;
  const totalCount = conflicts.length;
  const hasTreeData = !!localTree && !!remoteTree;
  const pendingChoices = treeDiff ? treeDiff.nodeDiffs.filter((d) => !choices[d.nodeId]).length : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="flex h-[85vh] w-full max-w-2xl flex-col rounded-[var(--radius-base)] border border-[var(--color-border-default)] bg-[var(--color-bg-primary)] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--color-border-default)] px-5 py-3">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <div>
              <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
                同步冲突 ({resolvedCount + 1}/{totalCount})
              </h3>
              <p className="text-[10px] text-[var(--color-text-tertiary)]">
                「{current.projectTitle}」本地 v{current.localVersion} → 云端 v{current.remoteVersion}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={resolving} onClick={handleUseLocal}>
              全部保留本地
            </Button>
            <Button variant="outline" size="sm" disabled={resolving} onClick={handleUseRemote}>
              全部使用云端
            </Button>
          </div>
        </div>

        {!hasTreeData ? (
          <div className="flex flex-1 items-center justify-center p-8 text-center">
            <div>
              <p className="text-sm text-[var(--color-text-secondary)]">无法解析项目数据，请选择一种方式覆盖</p>
              <div className="mt-4 flex justify-center gap-2">
                <Button variant="outline" size="sm" disabled={resolving} onClick={handleUseLocal}>
                  保留本地
                </Button>
                <Button size="sm" disabled={resolving} onClick={handleUseRemote}>
                  使用云端
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Stats bar */}
            <div className="flex items-center gap-4 border-b border-[var(--color-border-default)] px-5 py-2 bg-[var(--color-bg-secondary)]">
              <span className="text-[11px] text-[var(--color-text-secondary)]">
                差异: <strong className="text-[var(--color-text-primary)]">{treeDiff?.nodeDiffs.length ?? 0}</strong> 项
              </span>
              <span className="text-[11px] text-[var(--color-success-600)]">
                新增: {treeDiff?.nodeDiffs.filter((d) => d.type === 'added').length ?? 0}
              </span>
              <span className="text-[11px] text-[var(--color-error-600)]">
                删除: {treeDiff?.nodeDiffs.filter((d) => d.type === 'removed').length ?? 0}
              </span>
              <span className="text-[11px] text-[var(--color-warning-600)]">
                修改: {treeDiff?.nodeDiffs.filter((d) => d.type === 'modified').length ?? 0}
              </span>
              {pendingChoices > 0 && (
                <span className="ml-auto text-[11px] text-amber-600">
                  待选择: {pendingChoices} 项
                </span>
              )}
            </div>

            {/* Filter tabs */}
            <div className="flex gap-1 border-b border-[var(--color-border-default)] px-5 py-1.5">
              {(['all', 'added', 'removed', 'modified'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setDiffFilter(f)}
                  className={`rounded-[var(--radius-sm)] px-2.5 py-0.5 text-[11px] font-medium transition-colors ${
                    diffFilter === f
                      ? 'bg-[var(--color-bg-accent)] text-[var(--color-text-inverse)]'
                      : 'text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg-secondary)]'
                  }`}
                >
                  {f === 'all' ? '全部' : f === 'added' ? '新增' : f === 'removed' ? '删除' : '修改'}
                </button>
              ))}
              <div className="ml-auto flex gap-1">
                <button
                  onClick={() => setAll('local')}
                  className="rounded-[var(--radius-sm)] px-2 py-0.5 text-[10px] text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg-secondary)]"
                >
                  默认保留本地
                </button>
                <button
                  onClick={() => setAll('remote')}
                  className="rounded-[var(--radius-sm)] px-2 py-0.5 text-[10px] text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg-secondary)]"
                >
                  默认使用云端
                </button>
              </div>
            </div>

            {/* Diff list */}
            <div className="flex-1 overflow-y-auto px-5 py-3 space-y-2">
              {filteredDiffs.length === 0 && (
                <div className="py-8 text-center text-[11px] text-[var(--color-text-tertiary)]">
                  该分类下无差异
                </div>
              )}
              {filteredDiffs.map((diff) => {
                const cfg = diffTypeConfig(diff.type);
                const choice = choices[diff.nodeId];
                const isExpanded = expandedDiffs.has(diff.nodeId);
                return (
                  <div
                    key={`${diff.nodeId}-${diff.field}`}
                    className={`rounded-[var(--radius-sm)] border transition-colors ${
                      choice === 'remote'
                        ? 'border-[var(--color-accent-300)] bg-[var(--color-accent-50)]'
                        : 'border-[var(--color-border-default)] bg-[var(--color-bg-primary)]'
                    }`}
                  >
                    <div className="flex items-center gap-2 px-3 py-2">
                      {/* Type badge */}
                      <span className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${cfg.bg} ${cfg.color} ${cfg.border} border`}>
                        {cfg.label}
                      </span>

                      {/* Description */}
                      <span className="flex-1 text-xs text-[var(--color-text-primary)] truncate">
                        {diffDisplayLabel(diff)}
                      </span>

                      {/* Expand toggle for modified */}
                      {diff.type === 'modified' && (
                        <button
                          onClick={() => toggleExpand(diff.nodeId)}
                          className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]"
                        >
                          {isExpanded ? (
                            <ChevronUp className="h-3.5 w-3.5" />
                          ) : (
                            <ChevronDown className="h-3.5 w-3.5" />
                          )}
                        </button>
                      )}

                      {/* Choice buttons */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setChoice(diff.nodeId, 'local')}
                          className={`flex h-6 items-center gap-1 rounded-[var(--radius-sm)] px-2 text-[10px] font-medium transition-colors ${
                            choice === 'local' || choice === undefined
                              ? 'bg-[var(--color-bg-secondary)] text-[var(--color-text-primary)]'
                              : 'text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg-secondary)]'
                          }`}
                        >
                          {choice === 'local' && <Check className="h-3 w-3" />}
                          本地
                        </button>
                        <button
                          onClick={() => setChoice(diff.nodeId, 'remote')}
                          className={`flex h-6 items-center gap-1 rounded-[var(--radius-sm)] px-2 text-[10px] font-medium transition-colors ${
                            choice === 'remote'
                              ? 'bg-[var(--color-accent-500)] text-white'
                              : 'text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg-secondary)]'
                          }`}
                        >
                          {choice === 'remote' && <Check className="h-3 w-3" />}
                          云端
                        </button>
                      </div>
                    </div>

                    {/* Expanded detail for modified */}
                    {diff.type === 'modified' && isExpanded && (
                      <div className="border-t border-[var(--color-border-default)] px-3 py-2">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="rounded-[var(--radius-sm)] bg-[var(--color-bg-secondary)] px-2.5 py-1.5">
                            <div className="text-[10px] text-[var(--color-text-tertiary)] mb-0.5">本地</div>
                            <div className="text-[11px] text-[var(--color-text-primary)] break-all">
                              {formatDiffValue(diff.localValue)}
                            </div>
                          </div>
                          <div className="rounded-[var(--radius-sm)] bg-[var(--color-bg-secondary)] px-2.5 py-1.5">
                            <div className="text-[10px] text-[var(--color-text-tertiary)] mb-0.5">云端</div>
                            <div className="text-[11px] text-[var(--color-text-primary)] break-all">
                              {formatDiffValue(diff.remoteValue)}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Preview for added/removed */}
                    {(diff.type === 'added' || diff.type === 'removed') && (
                      <div className="border-t border-[var(--color-border-default)] px-3 py-1.5">
                        <div className="text-[10px] text-[var(--color-text-tertiary)]">
                          {diff.type === 'added'
                            ? `将添加 ${diff.nodeType}「${diff.remoteTitle}」到 ${diff.path.join(' → ') || '根节点'}`
                            : `将删除 ${diff.nodeType}「${diff.localTitle}」及其所有子节点`}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-[var(--color-border-default)] px-5 py-3">
              <div className="text-[11px] text-[var(--color-text-tertiary)]">
                {pendingChoices > 0
                  ? `还有 ${pendingChoices} 项未选择，未选项将默认保留本地`
                  : '所有差异已选择'}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={resolving}
                  onClick={handleUseLocal}
                >
                  保留本地并跳过
                </Button>
                <Button
                  size="sm"
                  disabled={resolving}
                  onClick={handleMerge}
                  className="gap-1"
                >
                  <GitMerge className="h-3.5 w-3.5" />
                  确认合并
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
