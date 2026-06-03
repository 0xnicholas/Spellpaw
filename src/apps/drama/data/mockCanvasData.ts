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
    data: { title: '场景 1-1 分镜', prompt: '咖啡馆, 阳光, 温暖氛围, 女生靠窗', tags: ['室内', '温暖', '日系'], thumbnail: '' },
  },
  {
    id: 'cn_art_2',
    type: 'art',
    position: { x: 400, y: 280 },
    data: { title: '场景 1-2 街头', prompt: '城市街道, 黄昏, 暖色调', tags: ['室外', '黄昏'], thumbnail: '' },
  },
  {
    id: 'cn_char_1',
    type: 'character',
    position: { x: 400, y: 400 },
    data: { title: '林小夏', name: '林小夏', role: '女主', age: 25, occupation: '咖啡师', personality: '温柔坚韧，内心敏感' },
  },
  {
    id: 'cn_deliverable_img',
    type: 'deliverable',
    position: { x: 700, y: 80 },
    data: { title: '咖啡馆场景概念图', description: '场景 1-1 主视觉概念', deliverableType: 'image', resolution: '2048×1152', fileSize: 2457600 },
  },
  {
    id: 'cn_deliverable_video',
    type: 'deliverable',
    position: { x: 700, y: 260 },
    data: { title: '场景 1-1 粗剪', description: '第一幕素材粗剪版本', deliverableType: 'video', duration: 45, resolution: '1920×1080', fileSize: 52428800 },
  },
  {
    id: 'cn_deliverable_audio',
    type: 'deliverable',
    position: { x: 700, y: 420 },
    data: { title: '咖啡馆环境音', description: '背景音效：咖啡机、轻音乐、人声', deliverableType: 'audio', duration: 120, fileSize: 3145728 },
  },
];

export const mockCanvasEdges: CanvasEdge[] = [
  { id: 'e1-2', source: 'cn_script_1', target: 'cn_art_1', animated: true },
  { id: 'e2-3', source: 'cn_script_1', target: 'cn_art_2', animated: true },
  { id: 'e4-5', source: 'cn_char_1', target: 'cn_script_1' },
];
