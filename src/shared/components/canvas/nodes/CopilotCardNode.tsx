import { useRef, useEffect, useCallback } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { Upload, Type, Image as ImageIcon, Video, X } from 'lucide-react';
import { useCanvasStore } from '@drama/stores/canvasStore';
import { providerRegistry } from '@drama/lib/canvasToolkit';
import { pollUntilDone } from '@drama/lib/canvasToolkit/shared';
import type { Capability } from '@drama/lib/canvasToolkit';

export type CopilotKind = 'upload' | 'text' | 'image' | 'video';

export interface CopilotCardNodeData {
  kind: CopilotKind;
  status: 'idle' | 'generating' | 'done' | 'error';
  prompt?: string;
  file?: {
    name: string;
    size: number;
    kind: 'image' | 'video' | 'audio';
    dataUrl: string;
  };
  providerId?: string;
  progress?: number;
  result?: {
    url?: string;
    text?: string;
    thumbnail?: string;
    duration?: number;
  };
  error?: string;
}

const KIND_CONFIG: Record<CopilotKind, { icon: typeof Upload; label: string }> = {
  upload: { icon: Upload,    label: 'Upload' },
  text:   { icon: Type,      label: 'Text Generation' },
  image:  { icon: ImageIcon, label: 'Image Generation' },
  video:  { icon: Video,     label: 'Video Generation' },
};

function offsetPosition(node: { position: { x: number; y: number } }, dx = 40, dy = 40) {
  return { x: node.position.x + dx, y: node.position.y + dy };
}

export function CopilotCardNode({ data: rawData, id }: NodeProps<Node<Record<string, unknown>>>) {
  // CopilotCardNodeData is intentionally narrower than CanvasNodeData and uses its own
  // status enum ('idle' | 'generating' | 'done' | 'error'). We type the props against
  // the React Flow constraint (Record<string, unknown>) and cast on read/write.
  const data = rawData as unknown as CopilotCardNodeData;
  const updateNodeData = useCanvasStore((s) => s.updateNodeData);
  const addNode = useCanvasStore((s) => s.addNode);
  const removeNode = useCanvasStore((s) => s.removeNode);
  const abortRef = useRef<AbortController | null>(null);

  // Abort any in-flight generation when the component unmounts.
  useEffect(() => {
    return () => { abortRef.current?.abort(); };
  }, []);

  const handleClose = useCallback(() => {
    abortRef.current?.abort();
    removeNode(id);
  }, [id, removeNode]);

  const handleGenerate = useCallback(async () => {
    abortRef.current = new AbortController();
    // Cast status: 'generating' is not part of CanvasNodeData['status'] enum
    updateNodeData(id, { status: 'generating' as never, progress: 0, error: undefined });

    try {
      if (data.kind === 'image' || data.kind === 'video') {
        const provider = providerRegistry.get(data.providerId ?? '');
        if (!provider) throw new Error(`未找到 provider: ${data.providerId}`);
        const capability: Capability = data.kind === 'image' ? 'text2image' : 'text2video';
        const task = await provider.submit({
          type: data.kind,
          capability,
          prompt: data.prompt ?? '',
        });
        const final = await pollUntilDone(
          provider,
          task.taskId,
          (p) => updateNodeData(id, { progress: p as never }),
          abortRef.current.signal,
        );
        // Cast status: 'done' is valid in CanvasNodeData['status'], but `result` is a
        // copilot-specific field that is not in CanvasNodeData. Cast the whole payload.
        updateNodeData(id, { status: 'done' as never, result: { url: final.resultUrl } as never });
        setTimeout(() => {
          if (abortRef.current?.signal.aborted) return;
          const self = useCanvasStore.getState().getCurrentNodes().find((n) => n.id === id);
          if (!self) return;
          addNode({
            id: `${data.kind}_${Date.now()}`,
            type: data.kind === 'image' ? 'art' : 'deliverable',
            position: offsetPosition(self),
            data: {
              title: data.prompt ?? '',
              thumbnail: final.resultUrl,
              generatedPrompt: data.prompt,
              sourceProvider: data.providerId,
            },
          });
          removeNode(id);
        }, 1000);
      } else if (data.kind === 'upload') {
        const file = data.file;
        if (!file) throw new Error('未选择文件');
        const self = useCanvasStore.getState().getCurrentNodes().find((n) => n.id === id);
        if (!self) return;
        addNode({
          id: `asset_${Date.now()}`,
          type: file.kind === 'video' ? 'videoClip' : 'asset',
          position: offsetPosition(self),
          data: {
            title: file.name,
            thumbnail: file.dataUrl,
            fileSize: file.size,
          },
        });
        removeNode(id);
      } else if (data.kind === 'text') {
        const self = useCanvasStore.getState().getCurrentNodes().find((n) => n.id === id);
        if (!self) return;
        addNode({
          id: `story_${Date.now()}`,
          type: 'storyline',
          position: offsetPosition(self),
          data: {
            title: data.prompt?.slice(0, 30) ?? '新剧本',
            description: data.prompt,
          },
        });
        removeNode(id);
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      // Cast status: 'error' is not part of CanvasNodeData['status'] enum
      updateNodeData(id, {
        status: 'error' as never,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }, [data, id, updateNodeData, addNode, removeNode]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result ?? '');
      let kind: 'image' | 'video' | 'audio' = 'image';
      if (file.type.startsWith('video/')) kind = 'video';
      else if (file.type.startsWith('audio/')) kind = 'audio';
      // For upload kind, file selection is the final action — auto-create the asset/videoClip card.
      const self = useCanvasStore.getState().getCurrentNodes().find((n) => n.id === id);
      if (!self) {
        updateNodeData(id, { file: { name: file.name, size: file.size, kind, dataUrl } as never });
        return;
      }
      addNode({
        id: `asset_${Date.now()}`,
        type: kind === 'video' ? 'videoClip' : 'asset',
        position: offsetPosition(self),
        data: {
          title: file.name,
          thumbnail: dataUrl,
          fileSize: file.size,
        },
      });
      removeNode(id);
    };
    reader.readAsDataURL(file);
  }, [id, addNode, removeNode, updateNodeData]);

  const config = KIND_CONFIG[data.kind];
  const Icon = config.icon;
  const isGenerating = data.status === 'generating';

  return (
    <div className="w-[240px] rounded-[var(--radius-base)] border border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] p-3 shadow-sm">
      <Handle type="target" position={Position.Left} className="!bg-[var(--color-accent-500)]" />

      {/* Header */}
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Icon className="h-3.5 w-3.5 text-[var(--color-accent-500)]" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
            {config.label}
          </span>
        </div>
        <button
          onClick={handleClose}
          aria-label="关闭"
          className="flex h-5 w-5 items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)]"
        >
          <X className="h-3 w-3" />
        </button>
      </div>

      {/* Input area */}
      {data.kind === 'upload' ? (
        <label className="block">
          <span className="sr-only">upload</span>
          <input
            type="file"
            accept="image/*,video/*,audio/*"
            onChange={handleFileChange}
            className="block w-full text-[11px] text-[var(--color-text-tertiary)] file:mr-2 file:rounded-[var(--radius-sm)] file:border-0 file:bg-[var(--color-bg-tertiary)] file:px-2 file:py-1 file:text-[11px] file:text-[var(--color-text-primary)]"
          />
          {data.file && (
            <div className="mt-1 text-[10px] text-[var(--color-text-tertiary)]">
              {data.file.name} ({Math.round(data.file.size / 1024)} KB)
            </div>
          )}
        </label>
      ) : (
        <textarea
          value={data.prompt ?? ''}
          onChange={(e) => updateNodeData(id, { prompt: e.target.value as never })}
          placeholder="输入提示词..."
          disabled={isGenerating}
          rows={3}
          className="mb-2 w-full resize-none rounded-[var(--radius-sm)] border border-[var(--color-border-default)] bg-[var(--color-bg-primary)] p-2 text-[12px] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent-500)] disabled:opacity-50"
        />
      )}

      {/* Generate button (hidden for upload kind — file change auto-creates) */}
      {data.status !== 'done' && data.kind !== 'upload' && (
        <button
          onClick={handleGenerate}
          disabled={
            isGenerating ||
            !data.prompt?.trim()
          }
          className="w-full rounded-[var(--radius-sm)] bg-[var(--color-accent-500)] px-3 py-1.5 text-[12px] font-medium text-white hover:bg-[var(--color-accent-600)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isGenerating ? '生成中...' : '生成'}
        </button>
      )}

      {/* Status / Progress */}
      {data.status === 'generating' && (
        <div className="mt-2">
          <div className="h-1 w-full overflow-hidden rounded-full bg-[var(--color-bg-tertiary)]">
            <div
              className="h-full bg-[var(--color-accent-500)] transition-all"
              style={{ width: `${data.progress ?? 0}%` }}
            />
          </div>
          <div className="mt-1 text-[10px] text-[var(--color-text-tertiary)]">
            生成中... {data.progress ?? 0}%
          </div>
        </div>
      )}

      {data.status === 'error' && (
        <div className="mt-2 rounded-[var(--radius-sm)] bg-red-500/10 p-2 text-[11px] text-red-500">
          {data.error}
          <button
            onClick={handleGenerate}
            className="ml-2 text-[11px] underline hover:text-red-600"
          >
            重试
          </button>
        </div>
      )}

      {data.status === 'done' && data.result?.url && (
        <div className="mt-2 text-[10px] text-[var(--color-text-tertiary)]">
          ✓ 已完成，正在插入画布...
        </div>
      )}

      <Handle type="source" position={Position.Right} className="!bg-[var(--color-accent-500)]" />
    </div>
  );
}
