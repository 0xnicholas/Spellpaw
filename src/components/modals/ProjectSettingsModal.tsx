import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { Project } from '@/types';

interface ProjectSettingsModalProps {
  isOpen: boolean;
  project: Project | null;
  onClose: () => void;
  onSave: (id: string, updates: { title: string; description: string }) => void;
}

export function ProjectSettingsModal({ isOpen, project, onClose, onSave }: ProjectSettingsModalProps) {
  const [title, setTitle] = useState(project?.title ?? '');
  const [description, setDescription] = useState(project?.description ?? '');

  if (!isOpen || !project) return null;

  const handleSubmit = () => {
    if (!title.trim()) return;
    onSave(project.id, { title, description });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="w-full max-w-sm rounded-[var(--radius-base)] border border-[var(--color-border-default)] bg-[var(--color-bg-primary)] p-6 shadow-lg">
        <h3 className="mb-4 text-sm font-semibold text-[var(--color-text-primary)]">项目设置</h3>
        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-[11px] font-medium text-[var(--color-text-secondary)]">标题</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-xs"
              onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit(); }}
            />
          </div>
          <div>
            <label className="mb-1 block text-[11px] font-medium text-[var(--color-text-secondary)]">描述</label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="text-xs"
            />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>取消</Button>
          <Button size="sm" disabled={!title.trim()} onClick={handleSubmit}>保存</Button>
        </div>
      </div>
    </div>
  );
}
