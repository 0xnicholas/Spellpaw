import { useEffect } from 'react';
import { Upload, Type, Image as ImageIcon, Video } from 'lucide-react';
import { Z_INDEX } from '@shared/lib/zIndex';

export type CopilotKind = 'upload' | 'text' | 'image' | 'video';

export interface PaneContextMenuProps {
  x: number;          // Screen coordinates (clientX) — for position: fixed
  y: number;          // Screen coordinates (clientY)
  flowPosition: { x: number; y: number };  // Flow coordinates — for addNode
  onClose: () => void;
  onCreate: (kind: CopilotKind, flowPosition: { x: number; y: number }) => void;
}

const MENU_ITEMS: Array<{ kind: CopilotKind; label: string; icon: typeof Upload; hint: string }> = [
  { kind: 'upload', label: 'Upload',           icon: Upload,    hint: '上传文件创建卡片' },
  { kind: 'text',   label: 'Text Generation',  icon: Type,      hint: '用 LLM 生成文本' },
  { kind: 'image',  label: 'Image Generation', icon: ImageIcon, hint: '生成图片' },
  { kind: 'video',  label: 'Video Generation', icon: Video,     hint: '生成视频' },
];

export function PaneContextMenu({ x, y, flowPosition, onClose, onCreate }: PaneContextMenuProps) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  return (
    <>
      <div
        data-testid="pane-context-overlay"
        className="fixed inset-0"
        style={{ zIndex: Z_INDEX.cardCopilotPopover - 1 }}
        onClick={onClose}
      />
      <div
        data-testid="pane-context-menu"
        className="fixed min-w-[180px] rounded-lg py-1 shadow-2xl"
        style={{
          left: x,
          top: y,
          zIndex: Z_INDEX.paneContextMenu,
          backgroundColor: 'oklch(12% 0.015 250)',
          border: '1px solid oklch(28% 0.02 250)',
        }}
      >
        {MENU_ITEMS.map(({ kind, label, icon: Icon, hint }) => (
          <button
            key={kind}
            onClick={() => onCreate(kind, flowPosition)}
            title={hint}
            className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-white/80 hover:bg-white/5 hover:text-white"
          >
            <Icon className="h-3.5 w-3.5 text-[var(--color-text-tertiary)]" />
            <span>{label}</span>
          </button>
        ))}
      </div>
    </>
  );
}
