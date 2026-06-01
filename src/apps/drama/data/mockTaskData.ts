import type { AgentTask, ChatMessage } from '@drama/types';

const now = '2026-06-02T08:00:00.000Z';
const msgs = (texts: string[], role: 'user' | 'agent'): ChatMessage[] =>
  texts.map((content, i) => ({
    id: `mock_msg_${role}_${i}`,
    role,
    content,
    type: 'text' as const,
    timestamp: new Date(Date.parse(now) + i * 60000).toISOString(),
  }));

export const mockTasks: AgentTask[] = [
  {
    id: 'task_proj1_a',
    title: '生成第二幕分镜',
    status: 'pending_review',
    projectId: 'proj_1',
    createdAt: '2026-06-02T07:55:00.000Z',
    updatedAt: '2026-06-02T08:05:00.000Z',
    messages: [
      ...msgs(['帮我为第二幕的三个场景生成分镜图'], 'user'),
      ...msgs([
        '好的！第二幕「冲突升级」包含以下场景：\n\n1. **场景 2-1：争吵爆发** — 男女主因误会激烈争吵（4 镜头）\n2. **场景 2-2：独自反思** — 女主独处回顾过往（2 镜头）\n3. **场景 2-3：意外线索** — 男主发现关键证据（3 镜头）\n\n已为你生成第一张场景 2-1 的分镜图。需要继续为后续场景生成吗？',
      ], 'agent'),
    ],
  },
  {
    id: 'task_proj1_b',
    title: '优化场景 1-2 对白',
    status: 'in_progress',
    projectId: 'proj_1',
    createdAt: '2026-06-02T07:58:00.000Z',
    updatedAt: '2026-06-02T08:02:00.000Z',
    messages: [
      ...msgs(['场景 1-2 的对白太生硬了，帮我改得自然一些'], 'user'),
      ...msgs(['我来分析一下场景 1-2「街头重逢」的当前对白…\n\n发现 3 个可以改进的地方：\n- 开场问候过于正式\n- 中间缺少情感递进\n- 结尾台词重复\n\n正在为你生成优化版本…'], 'agent'),
    ],
  },
  {
    id: 'task_proj1_c',
    title: '第一幕节奏分析',
    status: 'completed',
    projectId: 'proj_1',
    createdAt: '2026-06-01T15:00:00.000Z',
    updatedAt: '2026-06-01T18:00:00.000Z',
    messages: [
      ...msgs(['分析第一幕的整体节奏'], 'user'),
      ...msgs([
        '第一幕「邂逅」节奏分析完成！\n\n**时长分布：**\n- 场景 1-1（咖啡馆邂逅）：45s — 偏慢\n- 场景 1-2（街头重逢）：30s — 适中\n\n**建议：**\n1. 场景 1-1 缩短 5 秒，加快开场节奏\n2. 两个场景之间增加 1 个过渡镜头\n3. 高潮点在 45 秒处，时机恰当\n\n**总体评分：** 7.5/10',
      ], 'agent'),
    ],
  },
  {
    id: 'task_proj1_d',
    title: '添加悬念元素',
    status: 'in_progress',
    projectId: 'proj_1',
    createdAt: '2026-06-02T08:10:00.000Z',
    updatedAt: '2026-06-02T08:10:00.000Z',
    messages: [
      ...msgs(['我觉得第一幕缺少悬念，帮我想想可以加什么'], 'user'),
      ...msgs(['好建议！悬疑元素可以大大提升观众的期待感。正在分析当前结构…'], 'agent'),
    ],
  },
];
