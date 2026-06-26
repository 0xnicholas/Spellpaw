import { useState, useEffect, useCallback } from 'react';
import { Save, RotateCcw, ExternalLink } from 'lucide-react';
import { useCanvasStore } from '@drama/stores/canvasStore';
import type { CanvasNodeData } from '@drama/types';

export function DetailPanel() {
  const selectedCard = useCanvasStore((s) => s.getSelectedCard());
  const updateNodeData = useCanvasStore((s) => s.updateNodeData);
  const triggerFocusCard = useCanvasStore((s) => s.triggerFocusCard);

  // Draft state
  const [draft, setDraft] = useState<Partial<CanvasNodeData>>({});
  const [dirty, setDirty] = useState(false);
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    setDraft({});
    setDirty(false);
    setFormKey((k) => k + 1);
  }, [selectedCard?.id]);

  const handleFieldChange = useCallback((field: string, value: unknown) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
    setDirty(true);
  }, []);

  const handleSave = useCallback(() => {
    if (!selectedCard || !dirty) return;
    const updates: Partial<CanvasNodeData> = {};
    for (const [key, val] of Object.entries(draft)) {
      if (val !== undefined && val !== (selectedCard.data as Record<string, unknown>)[key]) {
        (updates as Record<string, unknown>)[key] = val;
      }
    }
    if (Object.keys(updates).length > 0) {
      updateNodeData(selectedCard.id, updates);
    }
    setDraft({});
    setDirty(false);
    setFormKey((k) => k + 1);
  }, [selectedCard, draft, dirty, updateNodeData]);

  const handleDiscard = useCallback(() => {
    setDraft({});
    setDirty(false);
    setFormKey((k) => k + 1);
  }, []);

  if (!selectedCard) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-4 text-center">
        <p className="text-xs text-[var(--color-text-tertiary)]">点击画布上的卡片以查看详情</p>
        <p className="text-[10px] text-[var(--color-text-tertiary)]/60">或选中卡片后切换到"详情"标签</p>
      </div>
    );
  }

  const data = selectedCard.data;
  const get = (key: string) => (key in draft ? draft[key as keyof typeof draft] : (data as Record<string, unknown>)[key]);

  const typeLabel: Record<string, string> = {
    storyline: '文本', moodboard: '情绪板', videoClip: '视频片段',
    asset: '素材', task: '任务', art: '美术', character: '角色',
    script: '剧本', deliverable: '产出物', sceneCard: '场景',
  };

  const commonFields = ['title', 'description', 'status'];
  const typeSpecificFields: Record<string, string[]> = {
    storyline: ['location', 'timeOfDay', 'duration', 'sceneCount', 'shotCount'],
    moodboard: ['styleRef', 'musicRef'],
    videoClip: ['source', 'duration'],
    asset: ['assetType', 'fileSize', 'resolution'],
    task: ['taskType', 'taskStatus'],
    art: ['generatedPrompt', 'sourceProvider'],
    character: ['role', 'age', 'occupation', 'personality'],
    script: ['dialogue'],
    deliverable: ['deliverableType', 'duration', 'fileSize', 'resolution'],
    sceneCard: ['location', 'timeOfDay', 'duration', 'shotType', 'cameraMovement', 'dialogue'],
  };

  const fields = [...commonFields, ...(typeSpecificFields[selectedCard.type] ?? [])];

  const fieldLabels: Record<string, string> = {
    title: '标题', description: '描述', status: '状态',
    location: '地点', timeOfDay: '时段', duration: '时长',
    sceneCount: '场景数', shotCount: '镜头数',
    styleRef: '风格参考', musicRef: '音乐参考',
    source: '来源', assetType: '素材类型', fileSize: '文件大小', resolution: '分辨率',
    taskType: '任务类型', taskStatus: '任务状态',
    generatedPrompt: '生成提示词', sourceProvider: '生成提供商',
    role: '角色', age: '年龄', occupation: '职业', personality: '性格',
    dialogue: '对白', shotType: '镜头类型', cameraMovement: '运镜方式',
    deliverableType: '产出类型',
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-[var(--color-border-default)] px-3 py-2">
        <span className="text-xs font-medium text-[var(--color-text-primary)]">
          {typeLabel[selectedCard.type] ?? '卡片'}详情
        </span>
        <div className="flex items-center gap-1.5">
          {dirty && (
            <>
              <span className="text-[10px] text-amber-500">未保存</span>
              <button onClick={handleSave} className="flex h-6 items-center gap-1 rounded-[var(--radius-sm)] bg-[var(--color-accent-500)] px-2 text-[10px] font-medium text-white hover:bg-[var(--color-accent-600)]">
                <Save className="h-3 w-3" />保存
              </button>
              <button onClick={handleDiscard} className="flex h-6 items-center gap-1 rounded-[var(--radius-sm)] border border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] px-2 text-[10px] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-primary)]">
                <RotateCcw className="h-3 w-3" />放弃
              </button>
            </>
          )}
          <button
            onClick={() => triggerFocusCard(selectedCard.id)}
            className="flex h-6 items-center gap-1 rounded-[var(--radius-sm)] border border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] px-2 text-[10px] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-primary)]"
            title="定位到画布上的卡片"
          >
            <ExternalLink className="h-3 w-3" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-3 space-y-3" key={formKey}>
        {fields.map((field) => {
          const val = get(field);
          const label = fieldLabels[field] ?? field;

          if (field === 'status') {
            return (
              <label key={field} className="block">
                <span className="text-[10px] font-medium text-[var(--color-text-tertiary)]">{label}</span>
                <select
                  value={String(val ?? 'draft')}
                  onChange={(e) => handleFieldChange(field, e.target.value)}
                  className="mt-0.5 block w-full rounded-[var(--radius-sm)] border border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] px-2 py-1 text-xs outline-none focus:border-[var(--color-accent-500)]"
                >
                  <option value="draft">📝 草稿</option>
                  <option value="in_progress">🔄 进行中</option>
                  <option value="review">👀 审核中</option>
                  <option value="done">✅ 已完成</option>
                </select>
              </label>
            );
          }

          if (field === 'description' || field === 'dialogue' || field === 'generatedPrompt') {
            return (
              <label key={field} className="block">
                <span className="text-[10px] font-medium text-[var(--color-text-tertiary)]">{label}</span>
                <textarea
                  value={String(val ?? '')}
                  onChange={(e) => handleFieldChange(field, e.target.value)}
                  rows={3}
                  className="mt-0.5 block w-full rounded-[var(--radius-sm)] border border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] px-2 py-1 text-xs outline-none resize-none focus:border-[var(--color-accent-500)]"
                />
              </label>
            );
          }

          return (
            <label key={field} className="block">
              <span className="text-[10px] font-medium text-[var(--color-text-tertiary)]">{label}</span>
              <input
                type={field === 'duration' || field === 'age' || field === 'fileSize' || field === 'sceneCount' || field === 'shotCount' ? 'number' : 'text'}
                value={val != null ? String(val) : ''}
                onChange={(e) => handleFieldChange(field, field === 'duration' || field === 'age' ? Number(e.target.value) || undefined : e.target.value)}
                className="mt-0.5 block w-full rounded-[var(--radius-sm)] border border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] px-2 py-1 text-xs outline-none focus:border-[var(--color-accent-500)]"
              />
            </label>
          );
        })}
      </div>
    </div>
  );
}
