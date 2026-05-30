import { useEffect, useState, useRef } from 'react';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import type { TreeNode } from '@/types';

interface SceneDetailFormProps {
  node: TreeNode;
  onChange: (updates: Partial<TreeNode>) => void;
}

export function SceneDetailForm({ node, onChange }: SceneDetailFormProps) {
  const [local, setLocal] = useState(node);
  const isExternalChange = useRef(false);

  useEffect(() => {
    isExternalChange.current = true;
    setLocal(node);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [node.id]);

  useEffect(() => {
    if (isExternalChange.current) {
      isExternalChange.current = false;
      return;
    }
    // Immediate change — no debounce
    onChange({
      title: local.title !== node.title ? local.title : undefined,
      status: local.status !== node.status ? local.status : undefined,
      metadata: {
        description: local.metadata?.description,
        duration: local.metadata?.duration,
        location: local.metadata?.location,
        timeOfDay: local.metadata?.timeOfDay,
        notes: local.metadata?.notes,
        createdAt: node.metadata?.createdAt ?? '',
        updatedAt: node.metadata?.updatedAt ?? '',
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [local]);

  const handleMeta = (field: string, value: unknown) => {
    setLocal((prev) => {
      const meta = prev.metadata ?? { createdAt: '', updatedAt: '' };
      return { ...prev, metadata: { ...meta, [field]: value } };
    });
  };

  return (
    <div className="space-y-4 p-4">
      <FormField label="标题">
        <Input
          value={local.title}
          onChange={(e) => setLocal((p) => ({ ...p, title: e.target.value }))}
          className="h-7 text-xs"
        />
      </FormField>
      <FormField label="状态">
        <select
          value={local.status}
          onChange={(e) => setLocal((p) => ({ ...p, status: e.target.value as TreeNode['status'] }))}
          className="h-7 w-full rounded-[var(--radius-sm)] border border-[var(--color-border-default)] bg-[var(--color-bg-primary)] px-2 text-xs"
        >
          <option value="draft">草稿</option>
          <option value="in_progress">进行中</option>
          <option value="review">审核中</option>
          <option value="done">已完成</option>
        </select>
      </FormField>
      <FormField label="描述">
        <Textarea
          value={local.metadata?.description ?? ''}
          onChange={(e) => handleMeta('description', e.target.value)}
          rows={3}
          className="text-xs"
        />
      </FormField>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="时长（秒）">
          <Input
            type="number"
            value={local.metadata?.duration ?? 0}
            onChange={(e) => handleMeta('duration', Number(e.target.value))}
            className="h-7 text-xs"
          />
        </FormField>
        <FormField label="时间段">
          <select
            value={local.metadata?.timeOfDay ?? ''}
            onChange={(e) => handleMeta('timeOfDay', e.target.value)}
            className="h-7 w-full rounded-[var(--radius-sm)] border border-[var(--color-border-default)] bg-[var(--color-bg-primary)] px-2 text-xs"
          >
            <option value="">—</option>
            <option value="morning">早晨</option>
            <option value="day">白天</option>
            <option value="evening">傍晚</option>
            <option value="night">夜晚</option>
          </select>
        </FormField>
      </div>
      <FormField label="地点">
        <Input
          value={local.metadata?.location ?? ''}
          onChange={(e) => handleMeta('location', e.target.value)}
          className="h-7 text-xs"
        />
      </FormField>
      <FormField label="备注">
        <Textarea
          value={local.metadata?.notes ?? ''}
          onChange={(e) => handleMeta('notes', e.target.value)}
          rows={3}
          className="text-xs"
        />
      </FormField>
    </div>
  );
}
