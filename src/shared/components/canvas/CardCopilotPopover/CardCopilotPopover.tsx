import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Upload } from 'lucide-react';
import { useCopilotGenerate, type FileRefData } from '@shared/components/canvas/hooks/useCopilotGenerate';
import type { CopilotKind } from '@shared/components/canvas/PaneContextMenu';
import { Z_INDEX } from '@shared/lib/zIndex';

const POPOVER_AUTOCLOSE_DELAY_MS = 1200;
const POPOVER_WIDTH = 480;
const VIEWPORT_PAD = 16;
const NAVBAR_HEIGHT = 64;

export interface CardCopilotPopoverProps {
  cardId: string;
  kind: CopilotKind;
  screenPosition: { x: number; y: number };
  onClose: () => void;
}

export function CardCopilotPopover({ cardId, kind, screenPosition, onClose }: CardCopilotPopoverProps) {
  const [prompt, setPrompt] = useState('');
  const [fileRef, setFileRef] = useState<FileRefData | null>(null);
  const { status, progress, error, generate, cancel } = useCopilotGenerate({
    cardId,
    kind,
    onSuccess: () => {
      setTimeout(onClose, POPOVER_AUTOCLOSE_DELAY_MS);
    },
  });

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (status === 'generating') cancel();
        else onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose, status, cancel]);

  const left = Math.max(
    VIEWPORT_PAD,
    Math.min(screenPosition.x - POPOVER_WIDTH / 2, window.innerWidth - POPOVER_WIDTH - VIEWPORT_PAD),
  );
  const top = Math.max(NAVBAR_HEIGHT, screenPosition.y);

  const handleGenerate = () => {
    if (kind === 'upload') {
      if (!fileRef) return;
      generate({ prompt: fileRef.name, fileRef });
      return;
    }
    if (!prompt.trim()) return;
    generate({ prompt, providerId: 'default', fileRef: fileRef ?? undefined });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result ?? '');
      let detectedKind: 'image' | 'video' | 'audio' = 'image';
      if (file.type.startsWith('video/')) detectedKind = 'video';
      else if (file.type.startsWith('audio/')) detectedKind = 'audio';
      setFileRef({ name: file.name, size: file.size, kind: detectedKind, dataUrl });
    };
    reader.readAsDataURL(file);
  };

  const isGenerating = status === 'generating';
  const canGenerate =
    !isGenerating && (kind === 'upload' ? !!fileRef : prompt.trim().length > 0);

  return createPortal(
    <div
      role="dialog"
      aria-label="Copilot tool panel"
      data-testid="card-copilot-popover"
      style={{
        position: 'fixed',
        left,
        top,
        width: POPOVER_WIDTH,
        zIndex: Z_INDEX.cardCopilotPopover,
      }}
      className="rounded-[var(--radius-base)] border border-[var(--color-border-default)] bg-[var(--color-bg-primary)] shadow-lg"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--color-border-default)] px-3 py-2">
        <span className="text-[12px] font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
          Copilot
        </span>
        <button
          onClick={onClose}
          aria-label="关闭"
          className="flex h-6 w-6 items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text-primary)]"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Body */}
      <div className="space-y-2 p-3">
        {/* Ref button (image / video / upload) */}
        {kind !== 'text' && (
          <div>
            <label
              data-testid="ref-label"
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--color-border-default)] px-2 py-1 text-[11px] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)]"
            >
              <Upload className="h-3 w-3" />
              <span>Ref</span>
              <input
                type="file"
                accept="image/*,video/*,audio/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
            {fileRef && (
              <span className="ml-2 text-[10px] text-[var(--color-text-tertiary)]">
                {fileRef.name}
              </span>
            )}
          </div>
        )}

        {/* Prompt (text/image/video) */}
        {kind !== 'upload' && (
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="输入提示词..."
            disabled={isGenerating}
            rows={3}
            data-testid="copilot-prompt"
            className="w-full resize-none rounded-[var(--radius-sm)] border border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] p-2 text-[12px] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent-500)] disabled:opacity-50"
          />
        )}

        {/* Progress */}
        {isGenerating && (
          <div data-testid="copilot-progress">
            <div className="h-1 w-full overflow-hidden rounded-full bg-[var(--color-bg-tertiary)]">
              <div
                className="h-full bg-[var(--color-accent-500)] transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="mt-1 text-[10px] text-[var(--color-text-tertiary)]">
              生成中... {progress}%
            </div>
          </div>
        )}

        {/* Error */}
        {status === 'error' && (
          <div className="rounded-[var(--radius-sm)] bg-red-500/10 p-2 text-[11px] text-red-500" data-testid="copilot-error">
            {error}
          </div>
        )}

        {/* Success */}
        {status === 'done' && (
          <div className="rounded-[var(--radius-sm)] bg-emerald-500/10 p-2 text-[11px] text-emerald-500" data-testid="copilot-success">
            ✓ 完成
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-[var(--color-border-default)] px-3 py-2">
        {isGenerating ? (
          <button
            onClick={cancel}
            data-testid="copilot-cancel"
            className="rounded-[var(--radius-sm)] border border-[var(--color-border-default)] px-3 py-1 text-[11px] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)]"
          >
            取消
          </button>
        ) : (
          <button
            onClick={handleGenerate}
            disabled={!canGenerate}
            data-testid="copilot-generate"
            className="ml-auto rounded-[var(--radius-sm)] bg-[var(--color-accent-500)] px-3 py-1 text-[11px] font-medium text-white hover:bg-[var(--color-accent-600)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            生成
          </button>
        )}
      </div>
    </div>,
    document.body,
  );
}