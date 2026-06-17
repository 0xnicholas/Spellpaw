import type { TreeNode } from '@drama/types';
import { useTaskStore } from './taskStore';
import type { GenerationProvider } from './types';

export function buildDefaultPrompt(node: TreeNode): string {
  const m = (node.metadata ?? {}) as NonNullable<TreeNode['metadata']>;
  const parts: string[] = ['Cinematic storyboard frame for a short drama scene.'];
  if (m.description) parts.push(m.description);
  parts.push(`Scene: "${node.title}".`);
  if (m.shotType) parts.push(`Shot type: ${m.shotType}.`);
  if (m.location) parts.push(`Location: ${m.location}.`);
  if (m.timeOfDay) parts.push(`Time of day: ${m.timeOfDay}.`);
  if (m.visualStyle) parts.push(`Visual style: ${m.visualStyle}.`);
  parts.push('Vertical 9:16 aspect ratio, cinematic lighting, photorealistic, unwatermarked.');
  return parts.join(' ');
}

export function updateCardThumbnail(cardId: string, url: string) {
  import('@drama/stores/canvasStore').then(({ useCanvasStore }) => {
    useCanvasStore.getState().updateNodeData(cardId, { thumbnail: url });
  });
}

export function startPolling(taskId: string, provider: GenerationProvider, cardId: string) {
  if (!provider.poll) return;
  let attempts = 0;
  const maxAttempts = 150; // ~10 minutes at 4s intervals
  const interval = setInterval(async () => {
    attempts++;
    try {
      const task = await provider.poll!(taskId);
      if (task.status === 'done' && task.resultUrl) {
        updateCardThumbnail(cardId, task.resultUrl);
        useTaskStore.getState().removeTask(taskId);
        clearInterval(interval);
      } else if (task.status === 'failed') {
        useTaskStore.getState().removeTask(taskId);
        clearInterval(interval);
      }
    } catch {
      if (attempts >= maxAttempts) {
        useTaskStore.getState().removeTask(taskId);
        clearInterval(interval);
      }
    }
  }, 4000);
}
