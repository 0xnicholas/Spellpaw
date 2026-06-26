import type { CanvasNode } from '@drama/types';

export function computeDisplayNumbers(canvasNodes: CanvasNode[]): Map<string, string> {
  const acts = canvasNodes
    .filter((c) => c.type === 'storyline' && c.data.metadata?.type === 'act')
    .sort((a, b) => a.position.x - b.position.x);
  const sceneCards = canvasNodes
    .filter((c) => c.type === 'sceneCard')
    .sort((a, b) => a.position.y - b.position.y);

  const result = new Map<string, string>();
  acts.forEach((act, i) => result.set(act.id, `${i + 1}`));
  sceneCards.forEach((scene, i) => result.set(scene.id, `S${i + 1}`));
  return result;
}
