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
  {
    id: 'task_proj1_e',
    title: '设计女主角人物弧光',
    status: 'pending_review',
    projectId: 'proj_1',
    createdAt: '2026-06-01T20:30:00.000Z',
    updatedAt: '2026-06-01T22:00:00.000Z',
    messages: [
      ...msgs(['帮我设计女主角的人物成长线，她应该从内向变成坚强'], 'user'),
      ...msgs([
        '已为女主角「林小夏」设计完整人物弧光：\n\n**第一幕：退缩**\n- 性格内向，害怕社交\n- 在咖啡馆打工，避免与人深交\n- 关键场景：面对客人刁难选择忍让\n\n**第二幕：觉醒**\n- 遇到男主后开始尝试表达自己\n- 在职场上第一次说"不"\n- 发现自己的咖啡天赋\n\n**第三幕：蜕变**\n- 参加咖啡师大赛\n- 当众讲述自己的故事\n- 成为独立自信的女性\n\n需要我为每个阶段生成具体台词吗？',
      ], 'agent'),
    ],
  },
  {
    id: 'task_proj1_f',
    title: '生成场景 2-1 分镜',
    status: 'completed',
    projectId: 'proj_1',
    createdAt: '2026-06-01T14:00:00.000Z',
    updatedAt: '2026-06-01T14:45:00.000Z',
    messages: [
      ...msgs(['给场景 2-1「争吵爆发」生成 4 张分镜图'], 'user'),
      ...msgs(['✅ 场景 2-1 分镜已全部生成！\n\n1. 镜头 1：男主推门质问 — 中景，手持镜头\n2. 镜头 2：女主转身回避 — 特写，静态\n3. 镜头 3：两人对峙 — 双人中景，缓慢推近\n4. 镜头 4：女主摔门离去 — 全景，跟拍\n\n分镜图已保存到画布。'], 'agent'),
    ],
  },
  {
    id: 'task_proj1_g',
    title: '第三幕结尾重写',
    status: 'in_progress',
    projectId: 'proj_1',
    createdAt: '2026-06-02T08:25:00.000Z',
    updatedAt: '2026-06-02T08:28:00.000Z',
    messages: [
      ...msgs(['第三幕现在的结尾太平淡了，帮我重写一个更有冲击力的'], 'user'),
      ...msgs(['好的，让我先看看你现在的第三幕结构…\n\n发现第三幕的结尾场景时长只有 20 秒，确实太仓促。正在设计更有层次感的结尾方案——会包含情感爆发点 + 反转 + 开放式结局三个层次。'], 'agent'),
    ],
  },
  {
    id: 'task_proj1_h',
    title: '匹配叙事模板',
    status: 'completed',
    projectId: 'proj_1',
    createdAt: '2026-06-01T12:00:00.000Z',
    updatedAt: '2026-06-01T12:10:00.000Z',
    messages: [
      ...msgs(['根据我的项目推荐合适的叙事模板'], 'user'),
      ...msgs(['根据你的项目《咖啡馆邂逅》分析：\n\n**最佳匹配：都市情感短剧模板** (92%)\n- 3 幕结构，每幕 2-3 场景\n- 总时长建议 3-5 分钟\n- 适合竖屏短视频平台\n\n**备选：反转悬疑模板** (78%)\n- 如果你的故事包含反转元素\n\n已自动应用都市情感模板的基础结构。'], 'agent'),
    ],
  },
];
