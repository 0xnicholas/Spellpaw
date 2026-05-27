import type { TreeNode } from '@/types';

export const mockTreeData: TreeNode = {
  id: 'tree_root',
  type: 'project',
  title: 'Urban Serendipity',
  status: 'in_progress',
  expanded: true,
  metadata: {
    duration: 180,
    description: 'An urban white-collar romance short drama',
    createdAt: '2026-05-01T00:00:00Z',
    updatedAt: '2026-05-18T10:30:00Z',
  },
  children: [
    {
      id: 'tree_act_1',
      type: 'act',
      title: 'Act 1: The Encounter',
      status: 'in_progress',
      expanded: true,
      metadata: { createdAt: '2026-05-01T00:00:00Z', updatedAt: '2026-05-18T10:30:00Z' },
      children: [
        {
          id: 'tree_scene_1_1',
          type: 'scene',
          title: 'Scene 1-1: Cafe Encounter',
          status: 'done',
          expanded: true,
          metadata: { duration: 45, description: 'The leads meet for the first time at a cafe', createdAt: '2026-05-01T00:00:00Z', updatedAt: '2026-05-10T10:30:00Z' },
          children: [
            { id: 'tree_shot_1_1_1', type: 'shot', title: 'Shot 1: Establishing wide', status: 'done', metadata: { duration: 5, createdAt: '2026-05-01T00:00:00Z', updatedAt: '2026-05-10T10:30:00Z' } },
            { id: 'tree_shot_1_1_2', type: 'shot', title: 'Shot 2: Male lead close-up', status: 'done', metadata: { duration: 8, createdAt: '2026-05-01T00:00:00Z', updatedAt: '2026-05-10T10:30:00Z' } },
            { id: 'tree_shot_1_1_3', type: 'shot', title: 'Shot 3: Female lead reaction', status: 'done', metadata: { duration: 6, createdAt: '2026-05-01T00:00:00Z', updatedAt: '2026-05-10T10:30:00Z' } },
          ],
        },
        {
          id: 'tree_scene_1_2',
          type: 'scene',
          title: 'Scene 1-2: Street Encounter',
          status: 'in_progress',
          expanded: false,
          metadata: { duration: 30, description: 'They meet again on the street, tension in the air', createdAt: '2026-05-05T00:00:00Z', updatedAt: '2026-05-15T14:20:00Z' },
          children: [
            { id: 'tree_shot_1_2_1', type: 'shot', title: 'Shot 1: Tracking shot', status: 'in_progress', metadata: { duration: 10, createdAt: '2026-05-05T00:00:00Z', updatedAt: '2026-05-15T14:20:00Z' } },
            { id: 'tree_shot_1_2_2', type: 'shot', title: 'Shot 2: Eye contact close-up', status: 'draft', metadata: { duration: 8, createdAt: '2026-05-05T00:00:00Z', updatedAt: '2026-05-15T14:20:00Z' } },
          ],
        },
      ],
    },
    {
      id: 'tree_act_2',
      type: 'act',
      title: 'Act 2: The Misunderstanding',
      status: 'draft',
      expanded: false,
      metadata: { createdAt: '2026-05-10T00:00:00Z', updatedAt: '2026-05-18T10:30:00Z' },
      children: [
        {
          id: 'tree_scene_2_1',
          type: 'scene',
          title: 'Scene 2-1: Office Corridor',
          status: 'draft',
          expanded: false,
          metadata: { duration: 25, description: 'The key scene where the misunderstanding unfolds', createdAt: '2026-05-10T00:00:00Z', updatedAt: '2026-05-18T10:30:00Z' },
          children: [
            { id: 'tree_shot_2_1_1', type: 'shot', title: 'Shot 1: Corridor wide', status: 'draft', metadata: { duration: 5, createdAt: '2026-05-10T00:00:00Z', updatedAt: '2026-05-18T10:30:00Z' } },
            { id: 'tree_shot_2_1_2', type: 'shot', title: 'Shot 2: Overheard conversation', status: 'draft', metadata: { duration: 12, createdAt: '2026-05-10T00:00:00Z', updatedAt: '2026-05-18T10:30:00Z' } },
          ],
        },
        {
          id: 'tree_scene_2_2',
          type: 'scene',
          title: 'Scene 2-2: Confrontation in the Rain',
          status: 'draft',
          expanded: false,
          metadata: { duration: 35, description: 'An intense confrontation in the rain, emotions erupt', createdAt: '2026-05-12T00:00:00Z', updatedAt: '2026-05-18T10:30:00Z' },
          children: [
            { id: 'tree_shot_2_2_1', type: 'shot', title: 'Shot 1: Rainy wide shot', status: 'draft', metadata: { duration: 8, createdAt: '2026-05-12T00:00:00Z', updatedAt: '2026-05-18T10:30:00Z' } },
            { id: 'tree_shot_2_2_2', type: 'shot', title: 'Shot 2: Confrontation shot/reverse shot', status: 'draft', metadata: { duration: 15, createdAt: '2026-05-12T00:00:00Z', updatedAt: '2026-05-18T10:30:00Z' } },
            { id: 'tree_shot_2_2_3', type: 'shot', title: 'Shot 3: Turning away silhouette', status: 'draft', metadata: { duration: 6, createdAt: '2026-05-12T00:00:00Z', updatedAt: '2026-05-18T10:30:00Z' } },
          ],
        },
      ],
    },
    {
      id: 'tree_act_3',
      type: 'act',
      title: 'Act 3: Reconciliation',
      status: 'draft',
      expanded: false,
      metadata: { createdAt: '2026-05-15T00:00:00Z', updatedAt: '2026-05-18T10:30:00Z' },
      children: [
        {
          id: 'tree_scene_3_1',
          type: 'scene',
          title: 'Scene 3-1: Rooftop Confession',
          status: 'draft',
          expanded: false,
          metadata: { duration: 50, description: 'A romantic rooftop confession, the misunderstanding is resolved', createdAt: '2026-05-15T00:00:00Z', updatedAt: '2026-05-18T10:30:00Z' },
          children: [
            { id: 'tree_shot_3_1_1', type: 'shot', title: 'Shot 1: Rooftop wide', status: 'draft', metadata: { duration: 5, createdAt: '2026-05-15T00:00:00Z', updatedAt: '2026-05-18T10:30:00Z' } },
            { id: 'tree_shot_3_1_2', type: 'shot', title: 'Shot 2: Male lead monologue', status: 'draft', metadata: { duration: 12, createdAt: '2026-05-15T00:00:00Z', updatedAt: '2026-05-18T10:30:00Z' } },
            { id: 'tree_shot_3_1_3', type: 'shot', title: 'Shot 3: Female lead approaches', status: 'draft', metadata: { duration: 8, createdAt: '2026-05-15T00:00:00Z', updatedAt: '2026-05-18T10:30:00Z' } },
            { id: 'tree_shot_3_1_4', type: 'shot', title: 'Shot 4: Embrace close-up', status: 'draft', metadata: { duration: 10, createdAt: '2026-05-15T00:00:00Z', updatedAt: '2026-05-18T10:30:00Z' } },
          ],
        },
      ],
    },
  ],
};
