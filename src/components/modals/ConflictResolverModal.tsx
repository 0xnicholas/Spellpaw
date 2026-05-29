import { useState } from 'react';
import { AlertTriangle, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { ConflictInfo } from '@/lib/projectSync';
import { resolveConflictWithRemote, resolveConflictWithLocal } from '@/lib/projectSync';
import { dismissConflicts } from '@/lib/syncEngine';

interface ConflictResolverModalProps {
  conflicts: ConflictInfo[];
  onResolved: () => void;
}

export function ConflictResolverModal({ conflicts, onResolved }: ConflictResolverModalProps) {
  const [resolving, setResolving] = useState(false);
  const [resolvedCount, setResolvedCount] = useState(0);

  if (conflicts.length === 0) return null;

  const handleUseRemote = async (conflict: ConflictInfo) => {
    setResolving(true);
    await resolveConflictWithRemote(conflict);
    setResolvedCount((c) => c + 1);
    if (resolvedCount + 1 >= conflicts.length) {
      dismissConflicts();
      onResolved();
    }
    setResolving(false);
  };

  const handleUseLocal = async (conflict: ConflictInfo) => {
    setResolving(true);
    await resolveConflictWithLocal(conflict);
    setResolvedCount((c) => c + 1);
    if (resolvedCount + 1 >= conflicts.length) {
      dismissConflicts();
      onResolved();
    }
    setResolving(false);
  };

  const current = conflicts[resolvedCount];
  if (!current) return null;

  const parsedRemote = (() => {
    try {
      return JSON.parse(current.remoteProject.data || '{}');
    } catch {
      return {};
    }
  })();

  const remoteTree = parsedRemote.tree as { title?: string } | undefined;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="w-full max-w-md rounded-[var(--radius-base)] border border-[var(--color-border-default)] bg-[var(--color-bg-primary)] p-6 shadow-lg">
        <div className="mb-4 flex items-center gap-2 text-[var(--color-text-primary)]">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          <h3 className="text-sm font-semibold">
            Sync Conflict ({resolvedCount + 1}/{conflicts.length})
          </h3>
        </div>

        <p className="mb-4 text-xs text-[var(--color-text-secondary)]">
          The project <strong>「{current.projectTitle}」</strong> was modified on the server
          (version {current.remoteVersion}) while you were editing (version {current.localVersion}).
          Choose which version to keep.
        </p>

        <div className="mb-4 grid grid-cols-2 gap-3">
          <div className="rounded-[var(--radius-sm)] border border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] p-3">
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">
              Your Version
            </div>
            <div className="text-xs text-[var(--color-text-primary)]">
              {current.projectTitle}
            </div>
            <div className="mt-1 text-[10px] text-[var(--color-text-tertiary)]">
              Version {current.localVersion}
            </div>
          </div>

          <div className="rounded-[var(--radius-sm)] border border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] p-3">
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-text-tertiary)]">
              Server Version
            </div>
            <div className="text-xs text-[var(--color-text-primary)]">
              {remoteTree?.title ?? current.projectTitle}
            </div>
            <div className="mt-1 text-[10px] text-[var(--color-text-tertiary)]">
              Version {current.remoteVersion}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={resolving}
            onClick={() => handleUseLocal(current)}
          >
            Keep Mine
          </Button>
          <Button
            size="sm"
            disabled={resolving}
            onClick={() => handleUseRemote(current)}
          >
            Use Server <ChevronRight className="ml-1 h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}
