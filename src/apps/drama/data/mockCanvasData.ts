import type { CanvasNode, CanvasEdge } from '@/apps/drama/types';

export const mockCanvasNodes: CanvasNode[] = [
  {
    id: 'canvas_scene_1',
    type: 'sceneCard',
    position: { x: 100, y: 150 },
    data: { title: '场景 1-1', description: '咖啡厅邂逅', status: 'done' },
  },
  {
    id: 'canvas_scene_2',
    type: 'sceneCard',
    position: { x: 420, y: 150 },
    data: { title: '场景 1-2', description: '街头重逢', status: 'in_progress' },
  },
];

export const mockCanvasEdges: CanvasEdge[] = [
  { id: 'e1-2', source: 'canvas_scene_1', target: 'canvas_scene_2', animated: true },
];
