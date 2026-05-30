import type { Project } from '@/types';

export const mockProjects: Project[] = [
  {
    id: 'proj_1',
    title: '都市奇缘',
    description: '一部关于都市白领爱情的短剧',
    updatedAt: '2026-05-18T10:30:00Z',
    sceneCount: 8,
    duration: 180,
    coverColor: '#6366f1',
    version: 1,
  },
  {
    id: 'proj_2',
    title: '密室逃脱',
    description: '悬疑解谜短视频系列',
    updatedAt: '2026-05-15T14:20:00Z',
    sceneCount: 5,
    duration: 120,
    coverColor: '#8b5cf6',
    version: 1,
  },
];
