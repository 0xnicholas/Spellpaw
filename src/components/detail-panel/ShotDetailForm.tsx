import { useEffect, useState, useRef } from 'react';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import type { TreeNode } from '@/types';

interface ShotDetailFormProps {
  node: TreeNode;
  onChange: (updates: Partial<TreeNode>) => void;
}

export function ShotDetailForm({ node, onChange }: ShotDetailFormProps) {
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
    onChange({
      title: local.title !== node.title ? local.title : undefined,
      status: local.status !== node.status ? local.status : undefined,
      metadata: {
        description: local.metadata?.description,
        duration: local.metadata?.duration,
        shotType: local.metadata?.shotType,
        cameraMovement: local.metadata?.cameraMovement,
        dialogue: local.metadata?.dialogue,
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
          rows={2}
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
        <FormField label="镜头类型">
          <select
            value={local.metadata?.shotType ?? ''}
            onChange={(e) => handleMeta('shotType', e.target.value)}
            className="h-7 w-full rounded-[var(--radius-sm)] border border-[var(--color-border-default)] bg-[var(--color-bg-primary)] px-2 text-xs"
          >
            <option value="">—</option>
            <option value="wide">全景</option>
            <option value="medium">中景</option>
            <option value="close-up">特写</option>
            <option value="insert">插入</option>
            <option value="pov">主观视角</option>
          </select>
        </FormField>
      </div>
      <FormField label="镜头运动">
        <select
          value={local.metadata?.cameraMovement ?? ''}
          onChange={(e) => handleMeta('cameraMovement', e.target.value)}
          className="h-7 w-full rounded-[var(--radius-sm)] border border-[var(--color-border-default)] bg-[var(--color-bg-primary)] px-2 text-xs"
        >
          <option value="">—</option>
          <option value="static">固定</option>
          <option value="pan">摇镜头</option>
          <option value="tilt">俯仰</option>
          <option value="dolly">推轨</option>
          <option value="handheld">手持</option>
        </select>
      </FormField>
      <FormField label="对白">
        <Textarea
          value={local.metadata?.dialogue ?? ''}
          onChange={(e) => handleMeta('dialogue', e.target.value)}
          rows={3}
          className="text-xs"
        />
      </FormField>
      <FormField label="备注">
        <Textarea
          value={local.metadata?.notes ?? ''}
          onChange={(e) => handleMeta('notes', e.target.value)}
          rows={2}
          className="text-xs"
        />
      </FormField>
    </div>
  );
}
