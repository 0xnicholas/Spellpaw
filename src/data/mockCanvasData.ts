import type { CanvasNode, CanvasEdge } from '@/types';

export const mockCanvasNodes: CanvasNode[] = [
  {
    id: 'canvas_scene_1',
    type: 'sceneCard',
    position: { x: 100, y: 150 },
    data: { title: 'Scene 1-1', description: 'Cafe Encounter', status: 'done' },
  },
  {
    id: 'canvas_scene_2',
    type: 'sceneCard',
    position: { x: 420, y: 150 },
    data: { title: 'Scene 1-2', description: 'Street Encounter', status: 'in_progress' },
  },
  {
    id: 'canvas_note_1',
    type: 'noteCard',
    position: { x: 260, y: 360 },
    data: { title: 'Note', description: 'Act 1 must be completed within 90 seconds', color: '#fef3c7' },
  },
];

export const mockCanvasEdges: CanvasEdge[] = [
  { id: 'e1-2', source: 'canvas_scene_1', target: 'canvas_scene_2', animated: true },
];
