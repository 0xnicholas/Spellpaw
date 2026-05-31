import type { AssetItem } from '@drama/types';

export const mockAssets: AssetItem[] = [
  {
    id: 'asset_1',
    name: 'intro_bgm.mp3',
    type: 'audio',
    size: 2516582,
    status: 'ready',
    createdAt: '2026-05-10T08:00:00Z',
    tags: ['Music', 'Opening'],
  },
  {
    id: 'asset_2',
    name: 'cafe_location.jpg',
    type: 'image',
    size: 1887436,
    status: 'ready',
    createdAt: '2026-05-11T10:00:00Z',
    tags: ['Scene', 'Cafe'],
  },
  {
    id: 'asset_3',
    name: 'rain_footage_01.mp4',
    type: 'video',
    size: 15938355,
    status: 'ready',
    createdAt: '2026-05-12T14:00:00Z',
    tags: ['Footage', 'Rain'],
  },
  {
    id: 'asset_4',
    name: 'script_draft_v1.txt',
    type: 'script',
    size: 12288,
    status: 'ready',
    createdAt: '2026-05-08T09:00:00Z',
    tags: ['Script'],
  },
  {
    id: 'asset_5',
    name: 'character_design_A.png',
    type: 'image',
    size: 3250585,
    status: 'ready',
    createdAt: '2026-05-09T11:00:00Z',
    tags: ['Design', 'Character'],
  },
];
