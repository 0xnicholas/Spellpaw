/**
 * CardCopilotPopover — buzzy-style integrated popover.
 *
 * Design ref: screenshots/buzzy-canvas-*.png
 *   - No "Copilot" title bar (header is integrated)
 *   - Single dark floating block with: + Ref button, textarea, model info, yellow send button
 *   - Send button shows credit cost "+N" (yellow pill, matches buzzy)
 *   - aria-label still says "Copilot" for accessibility + test compatibility
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Upload, X, Plus, ChevronDown } from 'lucide-react';
import { useCopilotGenerate, type FileRefData } from '@shared/components/canvas/hooks/useCopilotGenerate';
import { listProviders, providerRegistry } from '@drama/lib/canvasToolkit';
import type { CopilotKind } from '@shared/components/canvas/PaneContextMenu';
import { Z_INDEX } from '@shared/lib/zIndex';

const POPOVER_AUTOCLOSE_DELAY_MS = 1200;
const POPOVER_WIDTH = 480;
const VIEWPORT_PAD = 16;
const NAVBAR_HEIGHT = 64;

const SEND_BG = 'oklch(85% 0.18 95)';      // buzzy yellow
const SEND_BG_HOVER = 'oklch(80% 0.20 95)';
const SEND_TEXT = 'oklch(20% 0.05 95)';    // dark text on yellow
const POPOVER_BG = 'oklch(12% 0.015 250)';
const POPOVER_BORDER = 'oklch(28% 0.02 250)';

const PLACEHOLDERS: Record<CopilotKind, string> = {
  text: 'Ask Buzzy to generate or edit and try @ to mention elements...',
  image: 'Describe the imagination in your mind, use @ to refer to uploaded ref images',
  video: 'Upload references, describe ideas and use @ to refer to uploaded assets. For example: reference @video and swap subject to @image',
  upload: '',
};

const KIND_LABELS: Record<CopilotKind, string> = {
  text: 'Text',
  image: 'Image',
  video: 'Video',
  upload: 'Upload',
};

// Default model / cost config per kind (mock — real wiring would query providerRegistry)
const KIND_DEFAULT_MODEL: Record<CopilotKind, string> = {
  text: 'Gemini 3.1 Pro',
  image: 'Nano Banana Pro',
  video: 'Seedance 2.0',
  upload: '—',
};

const KIND_DEFAULT_COST: Record<CopilotKind, number> = {
  text: 4,
  image: 28,
  video: 40,
  upload: 0,
};

const KIND_DEFAULT_FORMAT: Record<CopilotKind, string> = {
  text: '',
  image: '1K | 1:1',
  video: '480p · 4s · 21:9',
  upload: '',
};

export interface CardCopilotPopoverProps {
  cardId: string;
  kind: CopilotKind;
  screenPosition: { x: number; y: number };
  onClose: () => void;
}

export function CardCopilotPopover({ cardId, kind, screenPosition, onClose }: CardCopilotPopoverProps) {
  const [prompt, setPrompt] = useState('');
  const [fileRef, setFileRef] = useState<FileRefData | null>(null);
  const [modelOpen, setModelOpen] = useState(false);
  const [currentModel, setCurrentModel] = useState<string>(KIND_DEFAULT_MODEL[kind]);
  // Track auto-close timeout so re-generation can cancel it (I-1 fix).
  const autoCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { status, progress, error, generate, cancel } = useCopilotGenerate({
    cardId,
    kind,
    onSuccess: () => {
      // Clear any previous auto-close timer to avoid race with re-generation.
      if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current);
      autoCloseTimerRef.current = setTimeout(() => {
        autoCloseTimerRef.current = null;
        onClose();
      }, POPOVER_AUTOCLOSE_DELAY_MS);
    },
  });

  // Cleanup auto-close timer on unmount.
  useEffect(() => {
    return () => {
      if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current);
    };
  }, []);

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

  // Available models from registered providers
  const availableModels = useMemo(() => {
    const providers = listProviders();
    return providers.map((p) => p.name ?? p.id);
  }, []);

  const defaultProviderId = useMemo(() => {
    const providers = listProviders();
    return providers[0]?.id;
  }, []);

  // Cost — use provider estimateCost if available, fallback to default
  const creditCost = useMemo(() => {
    if (!defaultProviderId) return KIND_DEFAULT_COST[kind];
    const provider = providerRegistry.get(defaultProviderId);
    if (!provider) return KIND_DEFAULT_COST[kind];
    try {
      const est = provider.estimateCost({ prompt: prompt || 'placeholder' } as never);
      return Math.max(1, Math.round(est.amount));
    } catch {
      return KIND_DEFAULT_COST[kind];
    }
  }, [defaultProviderId, kind, prompt]);

  const handleGenerate = () => {
    if (kind === 'upload') {
      if (!fileRef) return;
      generate({ prompt: fileRef.name, fileRef });
      return;
    }
    if (!prompt.trim()) return;
    generate({ prompt, providerId: defaultProviderId, fileRef: fileRef ?? undefined });
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleGenerate();
    }
  };

  const isGenerating = status === 'generating';
  const canGenerate =
    !isGenerating && (kind === 'upload' ? !!fileRef : prompt.trim().length > 0);
  const formatInfo = KIND_DEFAULT_FORMAT[kind];

  return createPortal(
    <div
      role="dialog"
      aria-label="Copilot tool panel"
      data-testid="card-copilot-popover"
      // 阻止冒泡到 canvas pane，避免误关弹窗 (M-8 fix)
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      style={{
        position: 'fixed',
        left,
        top,
        width: POPOVER_WIDTH,
        zIndex: Z_INDEX.cardCopilotPopover,
        backgroundColor: POPOVER_BG,
        border: `1px solid ${POPOVER_BORDER}`,
        borderRadius: 16,
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 2px 8px rgba(0, 0, 0, 0.2)',
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      {/* Top row: Ref button (left) + close (right) */}
      {kind !== 'text' && (
        <div className="flex items-center gap-2">
          <label
            data-testid="ref-label"
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1.5 transition-colors hover:bg-white/5"
            style={{
              border: `1px solid ${POPOVER_BORDER}`,
              color: 'var(--color-text-secondary)',
            }}
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="text-[12px]">Ref</span>
            <input
              type="file"
              accept="image/*,video/*,audio/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
          {fileRef && (
            <span className="text-[11px] text-[var(--color-text-tertiary)] truncate flex-1">
              {fileRef.name}
            </span>
          )}
          <button
            onClick={onClose}
            aria-label="关闭"
            className="ml-auto flex h-6 w-6 items-center justify-center rounded-md text-[var(--color-text-tertiary)] hover:bg-white/5 hover:text-[var(--color-text-primary)]"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* For text kind: only show close button at top */}
      {kind === 'text' && (
        <div className="flex items-center justify-between">
          <span className="text-[11px] uppercase tracking-wider text-[var(--color-text-tertiary)]">
            {KIND_LABELS[kind]}
          </span>
          <button
            onClick={onClose}
            aria-label="关闭"
            className="flex h-6 w-6 items-center justify-center rounded-md text-[var(--color-text-tertiary)] hover:bg-white/5 hover:text-[var(--color-text-primary)]"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Main: prompt textarea (text/image/video) or upload UI (upload) */}
      {kind === 'upload' ? (
        <div>
          <label
            data-testid="ref-label"
            className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md py-6 transition-colors hover:bg-white/5"
            style={{
              border: `1px dashed ${POPOVER_BORDER}`,
              color: 'var(--color-text-tertiary)',
            }}
          >
            <Upload className="h-5 w-5" />
            <span className="text-[12px]">点击上传或拖拽文件</span>
            <input
              type="file"
              accept="image/*,video/*,audio/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
          {fileRef && (
            <div className="mt-2 text-[11px] text-[var(--color-text-tertiary)]">
              {fileRef.name} ({(fileRef.size / 1024).toFixed(0)} KB)
            </div>
          )}
        </div>
      ) : (
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={PLACEHOLDERS[kind]}
          disabled={isGenerating}
          rows={4}
          data-testid="copilot-prompt"
          className="w-full resize-none rounded-md px-3 py-2.5 text-[13px] outline-none disabled:opacity-50"
          style={{
            backgroundColor: 'oklch(8% 0.01 250)',
            border: `1px solid ${POPOVER_BORDER}`,
            color: 'var(--color-text-primary)',
          }}
        />
      )}

      {/* Status displays (generating / error / done) */}
      {isGenerating && (
        <div data-testid="copilot-progress" className="space-y-1">
          <div className="h-1 w-full overflow-hidden rounded-full" style={{ backgroundColor: 'oklch(20% 0.015 250)' }}>
            <div
              className="h-full transition-all"
              style={{ width: `${progress}%`, backgroundColor: 'var(--color-accent-500)' }}
            />
          </div>
          <div className="text-[10px] text-[var(--color-text-tertiary)]">
            生成中... {progress}%
          </div>
        </div>
      )}

      {status === 'error' && (
        <div
          className="rounded-md p-2 text-[11px]"
          data-testid="copilot-error"
          style={{ backgroundColor: 'oklch(20% 0.08 25)', color: 'oklch(80% 0.15 25)' }}
        >
          {error}
        </div>
      )}

      {status === 'done' && (
        <div
          className="rounded-md p-2 text-[11px]"
          data-testid="copilot-success"
          style={{ backgroundColor: 'oklch(20% 0.08 145)', color: 'oklch(80% 0.15 145)' }}
        >
          ✓ 完成
        </div>
      )}

      {/* Bottom row: model + format info + send button */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {/* Model selector (dropdown trigger) */}
          <button
            onClick={() => setModelOpen(!modelOpen)}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-[12px] transition-colors hover:bg-white/5"
            style={{ color: 'var(--color-text-secondary)' }}
            aria-haspopup="listbox"
            aria-expanded={modelOpen}
          >
            <span className="truncate">{currentModel}</span>
            <ChevronDown className="h-3 w-3 shrink-0" />
          </button>

          {/* Format info (resolution / ratio / duration) */}
          {formatInfo && (
            <span className="text-[11px] text-[var(--color-text-tertiary)] truncate">
              {formatInfo}
            </span>
          )}
        </div>

        {/* Generate / Cancel button */}
        {isGenerating ? (
          <button
            onClick={cancel}
            data-testid="copilot-cancel"
            className="rounded-md px-3 py-1.5 text-[12px] transition-colors hover:bg-white/5"
            style={{
              border: `1px solid ${POPOVER_BORDER}`,
              color: 'var(--color-text-secondary)',
            }}
          >
            取消
          </button>
        ) : (
          <button
            onClick={handleGenerate}
            disabled={!canGenerate}
            data-testid="copilot-generate"
            className="inline-flex items-center gap-1 rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition-all hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
            style={{
              backgroundColor: SEND_BG,
              color: SEND_TEXT,
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = SEND_BG_HOVER; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = SEND_BG; }}
            aria-label="生成"
          >
            <span>+{creditCost}</span>
          </button>
        )}
      </div>

      {/* Model dropdown (open) */}
      {modelOpen && availableModels.length > 0 && (
        <div
          role="listbox"
          className="absolute z-10 mt-1 max-h-48 w-[200px] overflow-auto rounded-md py-1"
          style={{
            top: 'auto',
            left: 16,
            backgroundColor: 'oklch(10% 0.01 250)',
            border: `1px solid ${POPOVER_BORDER}`,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
          }}
        >
          {availableModels.map((m) => (
            <button
              key={m}
              role="option"
              aria-selected={m === currentModel}
              onClick={() => { setCurrentModel(m); setModelOpen(false); }}
              className="block w-full px-3 py-1.5 text-left text-[12px] text-[var(--color-text-secondary)] transition-colors hover:bg-white/5 hover:text-[var(--color-text-primary)]"
            >
              {m}
            </button>
          ))}
        </div>
      )}
    </div>,
    document.body,
  );
}
