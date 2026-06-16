import { useState } from 'react';
import { Wand2 } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';

interface BatchStyleDialogProps {
  isOpen: boolean;
  count: number;
  onConfirm: (stylePrompt: string) => void;
  onCancel: () => void;
}

export function BatchStyleDialog({ isOpen, count, onConfirm, onCancel }: BatchStyleDialogProps) {
  const [stylePrompt, setStylePrompt] = useState('');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="w-full max-w-sm rounded-[var(--radius-base)] border border-[var(--color-border-default)] bg-[var(--color-bg-primary)] p-6 shadow-lg">
        <div className="mb-4 flex items-center gap-2 text-[var(--color-text-primary)]">
          <Wand2 className="h-5 w-5 text-purple-500" />
          <h3 className="text-sm font-semibold">批量风格迁移</h3>
        </div>
        <p className="mb-4 text-xs text-[var(--color-text-secondary)]">
          为选中的 {count} 个节点统一生成一张风格化参考图卡片。
        </p>
        <div className="mb-6">
          <label className="mb-1 block text-xs font-medium text-[var(--color-text-secondary)]">
            风格描述
          </label>
          <Input
            value={stylePrompt}
            onChange={(e) => setStylePrompt(e.target.value)}
            placeholder="例如：赛博朋克霓虹、水墨风、吉卜力..."
          />
          <p className="mt-1 text-[10px] text-[var(--color-text-tertiary)]">
            每张卡片会基于节点元数据生成提示词，并把风格描述前置。
          </p>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onCancel}>取消</Button>
          <Button
            size="sm"
            onClick={() => {
              if (!stylePrompt.trim()) return;
              onConfirm(stylePrompt.trim());
              setStylePrompt('');
            }}
            disabled={!stylePrompt.trim()}
          >
            开始生成
          </Button>
        </div>
      </div>
    </div>
  );
}
