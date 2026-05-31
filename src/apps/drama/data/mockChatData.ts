import type { ChatMessage } from '@/apps/drama/types';

export const mockChatMessages: ChatMessage[] = [
  {
    id: 'msg_1',
    role: 'agent',
    content: '欢迎来到 Spellpaw！我已加载项目「都市奇缘」的结构。该项目目前有 3 幕、8 场景、18 镜头。有什么可以帮你的？',
    type: 'text',
    timestamp: '2026-05-19T09:00:00Z',
  },
  {
    id: 'msg_2',
    role: 'user',
    content: '检查第一幕的结构是否合理',
    type: 'text',
    timestamp: '2026-05-19T09:01:00Z',
  },
  {
    id: 'msg_3',
    role: 'agent',
    content: '这是第一幕「邂逅」的当前结构：\n\n1. 咖啡馆邂逅（3 镜头）— ~45 秒\n2. 街头邂逅（2 镜头）— ~30 秒\n\n**分析：**\n- 开场建立镜头很好地快速设定了场景\n- 建议增加「错过」插曲来提升张力\n- 第一幕总时长 75 秒，符合短视频节奏',
    type: 'text',
    timestamp: '2026-05-19T09:01:30Z',
    actions: [
      { id: 'act_1', label: '添加「错过」场景', type: 'insert_scene' },
      { id: 'act_2', label: '优化镜头分布', type: 'custom' },
    ],
  },
];
