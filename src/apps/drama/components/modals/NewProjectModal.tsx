import { useState } from 'react';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { ColorPicker } from '@/shared/components/ui/ColorPicker';
import { TemplateBrowser } from '@/apps/drama/components/template-browser/TemplateBrowser';
import type { NarrativeTemplate } from '@/apps/drama/types';

const PRESET_COVER_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
  '#f97316', '#f59e0b', '#10b981', '#14b8a6',
  '#06b6d4', '#0ea5e9', '#3b82f6', '#64748b',
];

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (title: string, description: string, coverColor: string) => void;
  onCreateFromTemplate?: (template: NarrativeTemplate) => void;
}

export function NewProjectModal({ isOpen, onClose, onCreate, onCreateFromTemplate }: NewProjectModalProps) {
  const [mode, setMode] = useState<'blank' | 'template'>('blank');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(PRESET_COVER_COLORS[0]);

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!title.trim()) return;
    onCreate(title, description, color);
    reset();
    onClose();
  };

  const handleTemplateSelect = (template: NarrativeTemplate) => {
    onCreateFromTemplate?.(template);
    reset();
    onClose();
  };

  const reset = () => {
    setTitle('');
    setDescription('');
    setColor(PRESET_COVER_COLORS[0]);
    setMode('blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="w-full max-w-lg rounded-[var(--radius-base)] border border-[var(--color-border-default)] bg-[var(--color-bg-primary)] p-5 shadow-lg">
        {/* Mode switcher */}
        {onCreateFromTemplate && (
          <div className="mb-4 flex gap-1 rounded-[var(--radius-sm)] bg-[var(--color-bg-tertiary)] p-0.5">
            <button
              onClick={() => setMode('blank')}
              className={`flex-1 rounded-[var(--radius-sm)] py-1 text-[11px] font-medium transition-colors ${
                mode === 'blank'
                  ? 'bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] shadow-sm'
                  : 'text-[var(--color-text-tertiary)]'
              }`}
            >
              空白项目
            </button>
            <button
              onClick={() => setMode('template')}
              className={`flex-1 rounded-[var(--radius-sm)] py-1 text-[11px] font-medium transition-colors ${
                mode === 'template'
                  ? 'bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] shadow-sm'
                  : 'text-[var(--color-text-tertiary)]'
              }`}
            >
              从模板创建
            </button>
          </div>
        )}

        {mode === 'blank' ? (
          <>
            <h3 className="mb-3 text-sm font-semibold text-[var(--color-text-primary)]">新建项目</h3>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-[11px] font-medium text-[var(--color-text-secondary)]">标题</label>
                <Input
                  placeholder="项目名称"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="text-xs"
                  autoFocus
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium text-[var(--color-text-secondary)]">描述（可选）</label>
                <Input
                  placeholder="简要描述你的项目"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="text-xs"
                />
              </div>
              <div>
                <span className="mb-1.5 block text-[11px] font-medium text-[var(--color-text-secondary)]">封面颜色</span>
                <ColorPicker colors={PRESET_COVER_COLORS} value={color} onChange={setColor} />
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={onClose}>取消</Button>
              <Button size="sm" disabled={!title.trim()} onClick={handleSubmit}>
                创建
              </Button>
            </div>
          </>
        ) : (
          <>
            <h3 className="mb-3 text-sm font-semibold text-[var(--color-text-primary)]">选择模板</h3>
            <TemplateBrowser onSelect={handleTemplateSelect} />
            <div className="mt-4 flex justify-end">
              <Button variant="ghost" size="sm" onClick={onClose}>取消</Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
