import { useState } from 'react';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';

const DEFAULT_COVER_COLOR = '#6366f1';

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (title: string, description: string, coverColor: string) => void;
}

export function NewProjectModal({ isOpen, onClose, onCreate }: NewProjectModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!title.trim()) return;
    onCreate(title, description, DEFAULT_COVER_COLOR);
    reset();
    onClose();
  };

  const reset = () => {
    setTitle('');
    setDescription('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="w-full max-w-lg rounded-[var(--radius-base)] border border-[var(--color-border-default)] bg-[var(--color-bg-primary)] p-5 shadow-lg">
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
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>取消</Button>
          <Button size="sm" disabled={!title.trim()} onClick={handleSubmit}>
            创建
          </Button>
        </div>
      </div>
    </div>
  );
}