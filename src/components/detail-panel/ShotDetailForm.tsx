import { useEffect, useState } from 'react';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { useDebounce } from '@/hooks/useDebounce';
import type { TreeNode } from '@/types';

interface ShotDetailFormProps {
  node: TreeNode;
  onChange: (updates: Partial<TreeNode>) => void;
}

export function ShotDetailForm({ node, onChange }: ShotDetailFormProps) {
  const [local, setLocal] = useState(node);
  const debouncedLocal = useDebounce(local, 300);

  useEffect(() => { setLocal(node); }, [node]);

  useEffect(() => {
    if (debouncedLocal === node) return;
    onChange({
      title: debouncedLocal.title !== node.title ? debouncedLocal.title : undefined,
      status: node.status,
      metadata: {
        description: debouncedLocal.metadata?.description,
        duration: debouncedLocal.metadata?.duration,
        shotType: debouncedLocal.metadata?.shotType,
        cameraMovement: debouncedLocal.metadata?.cameraMovement,
        dialogue: debouncedLocal.metadata?.dialogue,
        notes: debouncedLocal.metadata?.notes,
        createdAt: node.metadata?.createdAt ?? '',
        updatedAt: node.metadata?.updatedAt ?? '',
      },
    });
  }, [debouncedLocal]);

  const handleMeta = (field: string, value: unknown) => {
    setLocal((prev) => ({
      ...prev,
      metadata: { ...prev.metadata, createdAt: prev.metadata?.createdAt ?? '', updatedAt: prev.metadata?.updatedAt ?? '', [field]: value } as TreeNode['metadata'],
    }));
  };

  return (
    <div className="space-y-4 p-4">
      <FormField label="Title">
        <Input
          value={local.title}
          onChange={(e) => setLocal((p) => ({ ...p, title: e.target.value }))}
          className="h-7 text-xs"
        />
      </FormField>
      <FormField label="Description">
        <Textarea
          value={local.metadata?.description ?? ''}
          onChange={(e) => handleMeta('description', e.target.value)}
          rows={2}
          className="text-xs"
        />
      </FormField>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Duration (sec)">
          <Input
            type="number"
            value={local.metadata?.duration ?? 0}
            onChange={(e) => handleMeta('duration', Number(e.target.value))}
            className="h-7 text-xs"
          />
        </FormField>
        <FormField label="Shot Type">
          <select
            value={local.metadata?.shotType ?? ''}
            onChange={(e) => handleMeta('shotType', e.target.value)}
            className="h-7 w-full rounded-[var(--radius-sm)] border border-[var(--color-border-default)] bg-[var(--color-bg-primary)] px-2 text-xs"
          >
            <option value="">—</option>
            <option value="wide">Wide</option>
            <option value="medium">Medium</option>
            <option value="close-up">Close-Up</option>
            <option value="insert">Insert</option>
            <option value="pov">POV</option>
          </select>
        </FormField>
      </div>
      <FormField label="Camera Movement">
        <select
          value={local.metadata?.cameraMovement ?? ''}
          onChange={(e) => handleMeta('cameraMovement', e.target.value)}
          className="h-7 w-full rounded-[var(--radius-sm)] border border-[var(--color-border-default)] bg-[var(--color-bg-primary)] px-2 text-xs"
        >
          <option value="">—</option>
          <option value="static">Static</option>
          <option value="pan">Pan</option>
          <option value="tilt">Tilt</option>
          <option value="dolly">Dolly</option>
          <option value="handheld">Handheld</option>
        </select>
      </FormField>
      <FormField label="Dialogue">
        <Textarea
          value={local.metadata?.dialogue ?? ''}
          onChange={(e) => handleMeta('dialogue', e.target.value)}
          rows={3}
          className="text-xs"
        />
      </FormField>
      <FormField label="Notes">
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
