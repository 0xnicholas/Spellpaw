import { useCallback, useEffect, useRef, useState } from 'react';
import { useCanvasStore } from '@drama/stores/canvasStore';
import { providerRegistry } from '@drama/lib/canvasToolkit';
import { pollUntilDone } from '@drama/lib/canvasToolkit/shared';
import type { CopilotKind } from '@shared/components/canvas/PaneContextMenu';
import { inferCapability } from '@shared/components/canvas/helpers/capability';

export interface FileRefData {
  name: string;
  size: number;
  /** MIME type (e.g. "image/png"). Optional — used for display + provider hints. */
  type?: string;
  kind: 'image' | 'video' | 'audio';
  /** Base64 data URL — required when the provider needs an inline reference image. */
  dataUrl?: string;
  /** The original File object. Optional — kept for callers that need to re-read the file. */
  file?: File;
}

export interface GenerateParams {
  prompt: string;
  providerId?: string;
  fileRef?: FileRefData;
}

export type GenerateStatus = 'idle' | 'generating' | 'done' | 'error';

export interface UseCopilotGenerateResult {
  status: GenerateStatus;
  progress: number;
  error: string | null;
  generate: (params: GenerateParams) => Promise<void>;
  cancel: () => void;
}

export function useCopilotGenerate(opts: {
  cardId: string;
  kind: CopilotKind;
  onSuccess?: () => void;
}): UseCopilotGenerateResult {
  const { cardId, kind, onSuccess } = opts;
  const [status, setStatus] = useState<GenerateStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  // 用 getState() 取函数，避免因 store 更新触发重渲染
  const updateNodeData = useCanvasStore.getState().updateNodeData;

  const generate = useCallback(
    async (params: GenerateParams) => {
      abortRef.current = new AbortController();
      setStatus('generating');
      setProgress(0);
      setError(null);

      try {
        if (kind === 'text') {
          updateNodeData(cardId, {
            title: params.prompt.slice(0, 30) || '新文本',
            description: params.prompt,
            isPlaceholder: false,
          });
          setStatus('done');
          onSuccess?.();
          return;
        }

        if (kind === 'upload') {
          if (!params.fileRef) throw new Error('未选择文件');
          updateNodeData(cardId, {
            title: params.fileRef.name,
            thumbnail: params.fileRef.dataUrl,
            fileSize: params.fileRef.size,
            fileRef: params.fileRef,
            isPlaceholder: false,
          });
          setStatus('done');
          onSuccess?.();
          return;
        }

        // image / video
        const provider = providerRegistry.get(params.providerId ?? '');
        if (!provider) throw new Error(`Provider ${params.providerId} 未配置`);
        const capability = inferCapability(kind, !!params.fileRef);
        const task = await provider.submit({
          type: kind,
          capability,
          prompt: params.prompt,
          referenceUrl: params.fileRef?.dataUrl,
        });
        const final = await pollUntilDone(
          provider,
          task.taskId,
          setProgress,
          abortRef.current.signal,
        );
        updateNodeData(cardId, {
          thumbnail: final.resultUrl,
          generatedPrompt: params.prompt,
          sourceProvider: params.providerId,
          isPlaceholder: false,
        });
        setStatus('done');
        onSuccess?.();
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          setStatus('idle');
          return;
        }
        setError(err instanceof Error ? err.message : String(err));
        setStatus('error');
      }
    },
    [cardId, kind, onSuccess, updateNodeData],
  );

  const cancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  // 卸载时清理
  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  return { status, progress, error, generate, cancel };
}
