/**
 * CardCopilotPopover — buzzy-style inline popover.
 *
 * Appears when clicking a canvas card. Shows a compact prompt input
 * with send button. No header bar, model dropdown, or complex controls
 * (those are handled by the "Ref" button and provider auto-selection).
 *
 * Design: screenshots/buzzy-canvas.png — card-width dark block,
 * input darker than container, accent send button.
 */

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, ArrowUp, Plus } from 'lucide-react';
import { useCopilotGenerate, type FileRefData } from '@shared/components/canvas/hooks/useCopilotGenerate';
import type { CopilotKind } from '@shared/components/canvas/PaneContextMenu';
import { Z_INDEX } from '@shared/lib/zIndex';

/* ── constants ── */

const POPOVER_WIDTH = 290;  // matches card width
const POPOVER_BG = '#2e2e2e';
const INPUT_BG = '#1a1a1a';
const SEND_BG = '#e8c84a';     // yellow accent (buzzy)
const SEND_TEXT = '#000';

const PLACEHOLDERS: Record<CopilotKind, string> = {
  text: '描述你想生成的内容...',
  image: '描述你想要的画面...',
  video: '描述你想要的视频...',
  upload: '上传文件或描述...',
};

export interface Props {
  cardId: string;
  kind: CopilotKind;
  screenPosition: { x: number; y: number };
  onClose: () => void;
}

export function CardCopilotPopover({ cardId, kind, screenPosition, onClose }: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [prompt, setPrompt] = useState('');
  const [fileRef, setFileRef] = useState<FileRefData | null>(null);

  const { generate, status } = useCopilotGenerate({ cardId, kind });
  const isGenerating = status === 'generating';

  useEffect(() => {
    textareaRef.current?.focus();
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  /* ── handlers ── */

  const handleSend = async () => {
    if (!prompt.trim()) return;
    await generate({ prompt: prompt.trim(), fileRef: fileRef ?? undefined });
    setPrompt('');
    setFileRef(null);
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Read as data URL so the provider can use it as a reference image
      const reader = new FileReader();
      const kind: FileRefData['kind'] = file.type.startsWith('video/')
        ? 'video'
        : file.type.startsWith('audio/')
          ? 'audio'
          : 'image';
      reader.onload = () => {
        const dataUrl = typeof reader.result === 'string' ? reader.result : undefined;
        setFileRef({ name: file.name, size: file.size, type: file.type, kind, file, dataUrl });
      };
      reader.readAsDataURL(file);
    }
  };

  if (!screenPosition) return null;

  return createPortal(
    <div
      role="dialog"
      aria-label="Copilot tool panel"
      data-buzzy-popover-content
      data-testid="copilot-popover"
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      style={{
        position: 'fixed',
        left: screenPosition.x + 8,
        top: screenPosition.y + 8,
        width: POPOVER_WIDTH,
        zIndex: Z_INDEX.cardCopilotPopover,
        backgroundColor: POPOVER_BG,
        borderRadius: 12,
        boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
        padding: 12,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      {/* Textarea */}
      <textarea
        ref={textareaRef}
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={PLACEHOLDERS[kind]}
        disabled={isGenerating}
        rows={3}
        data-testid="copilot-prompt"
        className="w-full resize-none rounded-lg px-3 py-2.5 text-[13px] leading-relaxed outline-none disabled:opacity-50"
        style={{
          backgroundColor: INPUT_BG,
          border: 'none',
          color: '#e0e0e0',
        }}
      />

      {/* Bottom row: Ref + file name + Send */}
      <div className="flex items-center gap-2">
        <label className="flex cursor-pointer items-center justify-center w-7 h-7 rounded-md hover:bg-white/10 transition-colors"
          style={{ color: '#888' }}
        >
          <Plus className="h-4 w-4" />
          <input
            type="file"
            accept="image/*,video/*"
            onChange={handleFileChange}
            className="hidden"
          />
        </label>
        {(kind === 'image' || kind === 'video') && (
          <span data-testid="ref-label" className="text-[10px]" style={{ color: '#888' }}>
            Ref
          </span>
        )}

        {fileRef && (
          <span className="text-[11px] truncate flex-1" style={{ color: '#666' }}>
            {fileRef.name}
          </span>
        )}

        <div className="flex-1" />

        <button
          onClick={handleSend}
          disabled={isGenerating || !prompt.trim()}
          data-testid="copilot-generate"
          className="flex items-center justify-center w-8 h-8 rounded-lg transition-opacity disabled:opacity-30"
          style={{ backgroundColor: SEND_BG, color: SEND_TEXT }}
        >
          {isGenerating ? (
            <span className="inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : (
            <ArrowUp className="h-4 w-4" />
          )}
        </button>

        <button
          onClick={onClose}
          aria-label="关闭"
          className="flex items-center justify-center w-7 h-7 rounded-md hover:bg-white/10 transition-colors"
          style={{ color: '#666' }}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>,
    document.body
  );
}
