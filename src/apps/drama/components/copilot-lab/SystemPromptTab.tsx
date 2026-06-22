/**
 * SystemPromptTab — 显示 + 编辑当前 lab session 的 system prompt。
 *
 * 两种模式：
 *  - view：只读 <pre>，右上角有"编辑"按钮
 *  - edit：可写 <textarea> + "Save & Restart" / "Cancel" 按钮
 *
 * 保存时把新 prompt 写进 copilotLabStore.pendingPromptOverride，
 * useLabCopilotSSE 会自动 watch 并重建 session。
 */
import { useEffect, useState } from 'react';
import { Pencil, RotateCcw, Save, X } from 'lucide-react';
import { useCopilotLabStore } from '@drama/stores/copilotLabStore';
import { IconButton } from '@/shared/components/ui/IconButton';
import { Button } from '@/shared/components/ui/Button';

/** 粗略中英混合 token 估算：1 字符 ≈ 0.6 token，仅供调试参考 */
function estimateTokens(text: string): number {
  return Math.ceil(text.length * 0.6);
}

export function SystemPromptTab() {
  const meta = useCopilotLabStore((s) => s.sessionMeta);
  const setOverride = useCopilotLabStore((s) => s.setPendingPromptOverride);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  // meta 变化时同步 draft（仅在 view 模式）
  useEffect(() => {
    if (!editing && meta) setDraft(meta.systemPrompt);
  }, [meta, editing]);

  if (!meta) {
    return (
      <div className="flex h-full items-center justify-center px-6 text-center text-xs text-[var(--color-text-tertiary)]">
        还没有 session。<br />发一条消息让 Copilot 初始化。
      </div>
    );
  }

  const tokens = estimateTokens(meta.systemPrompt);
  const draftTokens = estimateTokens(draft);
  const isDirty = editing && draft !== meta.systemPrompt;

  const startEdit = () => {
    setDraft(meta.systemPrompt);
    setEditing(true);
  };

  const cancel = () => {
    setDraft(meta.systemPrompt);
    setEditing(false);
  };

  const save = () => {
    if (!isDirty) {
      setEditing(false);
      return;
    }
    setOverride(draft); // SSE hook 会重建 session
    setEditing(false);
  };

  const resetToDefault = () => {
    // 这里直接走 buildSystemPrompt 的默认路径 —— 通过 store 触发重建。
    // 真正的"默认 prompt"由 useLabCopilotSSE 第一次创建时生成，
    // 我们这里只是清空当前 draft，让用户重新输入。
    setDraft('');
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center justify-between border-b border-[var(--color-border-default)] px-3 py-2 text-xs">
        <span className="text-[var(--color-text-tertiary)]">
          Session <code className="font-mono text-[10px]">{meta.sessionId.slice(0, 12)}…</code>
        </span>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[var(--color-text-secondary)]">
            ~{editing ? draftTokens : tokens} tokens
            {editing && isDirty && <span className="ml-1 text-[var(--color-accent-500)]">· 改动</span>}
          </span>
          {!editing && (
            <IconButton
              icon={<Pencil className="h-3.5 w-3.5" />}
              label="编辑"
              size="sm"
              onClick={startEdit}
            />
          )}
        </div>
      </div>

      {editing ? (
        <>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            spellCheck={false}
            className="m-0 flex-1 resize-none whitespace-pre-wrap break-words border-0 bg-transparent p-3 font-mono text-[11px] leading-relaxed text-[var(--color-text-primary)] outline-none focus:outline-none"
          />
          <div className="flex shrink-0 items-center justify-between gap-2 border-t border-[var(--color-border-default)] px-3 py-2">
            <Button variant="ghost" size="sm" onClick={resetToDefault}>
              <RotateCcw className="mr-1 h-3 w-3" />
              清空
            </Button>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={cancel}>
                <X className="mr-1 h-3 w-3" />
                取消
              </Button>
              <Button variant="primary" size="sm" onClick={save} disabled={!isDirty}>
                <Save className="mr-1 h-3 w-3" />
                保存并重启 Session
              </Button>
            </div>
          </div>
        </>
      ) : (
        <pre className="m-0 flex-1 overflow-auto whitespace-pre-wrap break-words p-3 font-mono text-[11px] leading-relaxed text-[var(--color-text-secondary)]">
          {meta.systemPrompt}
        </pre>
      )}
    </div>
  );
}