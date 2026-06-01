import type { CanvasNode, CanvasEdge } from '@drama/types';

export const mockCanvasNodes: CanvasNode[] = [
  {
    id: 'cn_script_1',
    type: 'script',
    position: { x: 100, y: 100 },
    data: { title: '场景 1-1 · 咖啡馆邂逅', description: '男主推开咖啡馆的门，铃铛响起。她坐在靠窗的位置，阳光透过玻璃洒在她的侧脸…', status: 'draft', duration: 15, location: '咖啡馆', timeOfDay: 'morning' },
  },
  {
    id: 'cn_art_1',
    type: 'art',
    position: { x: 400, y: 100 },
    data: { title: '场景 1-1 分镜', prompt: '咖啡馆, 阳光, 温暖氛围', tags: ['室内', '温暖'], thumbnail: '' },
  },
  {
    id: 'cn_output_v2',
    type: 'output',
    position: { x: 100, y: 400 },
    data: { title: '第一幕节奏分析', outputType: 'analysis', summary: '3 个建议：场景 1-1 偏慢 (-5s) · 缺少过渡镜头 · 高潮时机恰当', sourceTaskId: 'task_1' },
  },
  {
    id: 'cn_char_1',
    type: 'character',
    position: { x: 400, y: 400 },
    data: { title: '林小夏', name: '林小夏', role: '女主', age: 25, occupation: '咖啡师', personality: '温柔坚韧，内心敏感' },
  },
];

export const mockCanvasEdges: CanvasEdge[] = [
  { id: 'e1-2', source: 'cn_script_1', target: 'cn_art_1', animated: true },
];
