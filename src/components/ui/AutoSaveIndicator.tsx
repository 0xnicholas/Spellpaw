import { useDetailStore } from '@/stores/detailStore';

export function AutoSaveIndicator() {
  const draft = useDetailStore((s) => s.draftFormData);
  return (
    <div className="flex items-center gap-1.5">
      {draft ? (
        <>
          <span className="h-2 w-2 rounded-full bg-[var(--color-accent-500)] animate-pulse" />
          <span className="text-[10px] text-[var(--color-text-tertiary)]">保存中…</span>
        </>
      ) : (
        <span className="h-2 w-2 rounded-full bg-[var(--color-status-success-text)]" title="所有更改已保存" />
      )}
    </div>
  );
}
