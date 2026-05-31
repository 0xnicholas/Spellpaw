import type { TreeNode } from '@drama/types';

export const mockTreeData: TreeNode = {
  id: 'tree_root',
  type: 'project',
  title: '都市奇缘',
  status: 'in_progress',
  expanded: true,
  metadata: {
    duration: 180,
    description: '一部都市白领爱情短剧',
    createdAt: '2026-05-01T00:00:00Z',
    updatedAt: '2026-05-18T10:30:00Z',
  },
  children: [
    {
      id: 'tree_act_1',
      type: 'act',
      title: '第一幕：相遇',
      status: 'in_progress',
      expanded: true,
      metadata: { createdAt: '2026-05-01T00:00:00Z', updatedAt: '2026-05-18T10:30:00Z' },
      children: [
        {
          id: 'tree_scene_1_1',
          type: 'scene',
          title: '场景 1-1：咖啡厅邂逅',
          status: 'done',
          expanded: true,
          metadata: { duration: 45, description: '男女主角在咖啡厅初次相遇', createdAt: '2026-05-01T00:00:00Z', updatedAt: '2026-05-10T10:30:00Z' },
          children: [
            { id: 'tree_shot_1_1_1', type: 'shot', title: '镜头 1： establishing wide', status: 'done', metadata: { duration: 5, createdAt: '2026-05-01T00:00:00Z', updatedAt: '2026-05-10T10:30:00Z' } },
            { id: 'tree_shot_1_1_2', type: 'shot', title: '镜头 2：男主特写', status: 'done', metadata: { duration: 8, createdAt: '2026-05-01T00:00:00Z', updatedAt: '2026-05-10T10:30:00Z' } },
            { id: 'tree_shot_1_1_3', type: 'shot', title: '镜头 3：女主反应', status: 'done', metadata: { duration: 6, createdAt: '2026-05-01T00:00:00Z', updatedAt: '2026-05-10T10:30:00Z' } },
          ],
        },
        {
          id: 'tree_scene_1_2',
          type: 'scene',
          title: '场景 1-2：街头重逢',
          status: 'in_progress',
          expanded: false,
          metadata: { duration: 30, description: '他们在街头再次相遇，空气中弥漫着紧张感', createdAt: '2026-05-05T00:00:00Z', updatedAt: '2026-05-15T14:20:00Z' },
          children: [
            { id: 'tree_shot_1_2_1', type: 'shot', title: '镜头 1：跟踪镜头', status: 'in_progress', metadata: { duration: 10, createdAt: '2026-05-05T00:00:00Z', updatedAt: '2026-05-15T14:20:00Z' } },
            { id: 'tree_shot_1_2_2', type: 'shot', title: '镜头 2：眼神交汇特写', status: 'draft', metadata: { duration: 8, createdAt: '2026-05-05T00:00:00Z', updatedAt: '2026-05-15T14:20:00Z' } },
          ],
        },
      ],
    },
    {
      id: 'tree_act_2',
      type: 'act',
      title: '第二幕：误会',
      status: 'draft',
      expanded: false,
      metadata: { createdAt: '2026-05-10T00:00:00Z', updatedAt: '2026-05-18T10:30:00Z' },
      children: [
        {
          id: 'tree_scene_2_1',
          type: 'scene',
          title: '场景 2-1：办公室走廊',
          status: 'draft',
          expanded: false,
          metadata: { duration: 25, description: '误会发生的关键场景', createdAt: '2026-05-10T00:00:00Z', updatedAt: '2026-05-18T10:30:00Z' },
          children: [
            { id: 'tree_shot_2_1_1', type: 'shot', title: '镜头 1：走廊全景', status: 'draft', metadata: { duration: 5, createdAt: '2026-05-10T00:00:00Z', updatedAt: '2026-05-18T10:30:00Z' } },
            { id: 'tree_shot_2_1_2', type: 'shot', title: '镜头 2：偷听到的对话', status: 'draft', metadata: { duration: 12, createdAt: '2026-05-10T00:00:00Z', updatedAt: '2026-05-18T10:30:00Z' } },
          ],
        },
        {
          id: 'tree_scene_2_2',
          type: 'scene',
          title: '场景 2-2：雨中对峙',
          status: 'draft',
          expanded: false,
          metadata: { duration: 35, description: '雨中激烈对峙，情绪爆发', createdAt: '2026-05-12T00:00:00Z', updatedAt: '2026-05-18T10:30:00Z' },
          children: [
            { id: 'tree_shot_2_2_1', type: 'shot', title: '镜头 1：雨景 wide', status: 'draft', metadata: { duration: 8, createdAt: '2026-05-12T00:00:00Z', updatedAt: '2026-05-18T10:30:00Z' } },
            { id: 'tree_shot_2_2_2', type: 'shot', title: '镜头 2：正反打对峙', status: 'draft', metadata: { duration: 15, createdAt: '2026-05-12T00:00:00Z', updatedAt: '2026-05-18T10:30:00Z' } },
            { id: 'tree_shot_2_2_3', type: 'shot', title: '镜头 3：转身离去剪影', status: 'draft', metadata: { duration: 6, createdAt: '2026-05-12T00:00:00Z', updatedAt: '2026-05-18T10:30:00Z' } },
          ],
        },
      ],
    },
    {
      id: 'tree_act_3',
      type: 'act',
      title: '第三幕：和解',
      status: 'draft',
      expanded: false,
      metadata: { createdAt: '2026-05-15T00:00:00Z', updatedAt: '2026-05-18T10:30:00Z' },
      children: [
        {
          id: 'tree_scene_3_1',
          type: 'scene',
          title: '场景 3-1：天台告白',
          status: 'draft',
          expanded: false,
          metadata: { duration: 50, description: '浪漫的天台告白，误会解开', createdAt: '2026-05-15T00:00:00Z', updatedAt: '2026-05-18T10:30:00Z' },
          children: [
            { id: 'tree_shot_3_1_1', type: 'shot', title: '镜头 1：天台全景', status: 'draft', metadata: { duration: 5, createdAt: '2026-05-15T00:00:00Z', updatedAt: '2026-05-18T10:30:00Z' } },
            { id: 'tree_shot_3_1_2', type: 'shot', title: '镜头 2：男主独白', status: 'draft', metadata: { duration: 12, createdAt: '2026-05-15T00:00:00Z', updatedAt: '2026-05-18T10:30:00Z' } },
            { id: 'tree_shot_3_1_3', type: 'shot', title: '镜头 3：女主走近', status: 'draft', metadata: { duration: 8, createdAt: '2026-05-15T00:00:00Z', updatedAt: '2026-05-18T10:30:00Z' } },
            { id: 'tree_shot_3_1_4', type: 'shot', title: '镜头 4：拥抱特写', status: 'draft', metadata: { duration: 10, createdAt: '2026-05-15T00:00:00Z', updatedAt: '2026-05-18T10:30:00Z' } },
          ],
        },
      ],
    },
  ],
};
