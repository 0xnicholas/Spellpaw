# AI 队友系统设计 Spec

**Status**: Draft (pending review)
**Date**: 2026-06-20
**Author**: Nicholas L. + brainstorming session
**Spec scope**: Unified spec — AI 队友系统（3 子能力合并）

---

## 1. 背景与目标

### 1.1 竞品对标

参考 buzzy.now 的核心差异化能力：

| 能力 | buzzy.now | Spellpaw 当前 | 本 spec 解决 |
|------|-----------|---------------|--------------|
| AI 在画布上有"实体存在" | ✅ Cursor / Vibe Agent | ❌ 无 | ✅ **§4 CanvasPresenceLayer** |
| Timeline ↔ Canvas 切换 | ✅ NLE 风格 | ❌ 无 | ✅ **§5 Timeline 模块** |
| Copilot 主动开聊 + 巡检 | ✅ 持续学习 | 🟡 仅首次推 insight | ✅ **§6 Paw 召唤 + 显式记忆** |

### 1.2 核心命题

> **AI 从被动工具 → 主动队友**

Spellpaw 当前的 Copilot 是"被动工具"——用户问，AI 答。本 spec 引入 **Paw**（导演搭子人格），让 AI 在画布上有视觉存在感、能主动指出问题、能在 Timeline 视角下被同时看见。

### 1.3 不在本 spec 范围

- 视频渲染 / 像素级编辑（buzzy "AI Video Photoshop" 路线）
- 趋势扫描 / 爆款信号
- 多人协作 / 实时光标（Phase 4）
- LLM 自训练 / 审美学习（V2+ 升级项）
- 自动修改项目（L2/L3 自主性等级，V2+）

---

## 2. 设计决策（已确认）

| 维度 | 决策 | 理由 |
|------|------|------|
| 自主性等级 | **L1 观察者**（AI 不修改） | 零风险起步，用户控制感最强 |
| 触发模式 | **显式召唤 only** | 不主动 spam；保持克制 |
| Timeline 范围 | **Timeline-as-Narrative-Track** | 配合节奏问题可视化，非 NLE |
| 画布存在感形态 | **Hybrid**：Cursor + Highlight + Annotation | 分层表达：瞥见→看一眼→细读 |
| 召唤入口 | **多入口**：Toolbar + ⌘K + Canvas 浮动按钮 | 教学/熟练/上下文 三场景全覆盖 |
| AI 人格 | **Paw（导演搭子）** | 有名字有审美判断，符合"队友"语义 |
| 召唤后交互 | **Hybrid 上下文感知** | 入口决定 UI，上下文自动传递 |
| Timeline 切换 UX | **Tab 主切换 + minimap** | 可专注也可概览 |
| Paw 视觉范围 | **选中节点 + 树结构** | 复用现有 systemPrompt 两层策略 |
| Paw 记忆 | **无记忆** | V1 简化，V2 再加项目级记忆 |

---

## 3. 架构总览

```
┌─────────────────────────────────────────────────────────────────┐
│  WorkspacePage (现有)                                            │
│  ┌─────────────┬──────────────────────────────────────┐         │
│  │  ChatPanel  │  FlowCanvasPanel  [CanvasPresence]  │         │
│  │  (现有)     │  ┌──────────────────────────────┐    │         │
│  │  + Command  │  │  @xyflow canvas             │    │         │
│  │    Palette  │  │  + PresenceLayer (新)       │    │         │
│  │  (新)       │  └──────────────────────────────┘    │         │
│  │             │  ┌──────────────────────────────┐    │         │
│  │             │  │  TimelineMinimap (新)        │    │         │
│  │             │  └──────────────────────────────┘    │         │
│  └─────────────┴──────────────────────────────────────┘         │
└─────────────────────────────────────────────────────────────────┘
                              ↕ 订阅
              ┌───────────────────────────────────┐
              │   agentPresenceStore (新)        │
              │   cursor / highlights / notes    │
              └───────────────────────────────────┘
                              ↕ 写入
              ┌───────────────────────────────────┐
              │   toolRouter (现有 + 6 新工具)   │
              │   paw_highlight_node             │
              │   paw_clear_highlights           │
              │   paw_add_annotation             │
              │   paw_remove_annotation          │
              │   paw_move_cursor_to             │
              │   paw_set_focus                  │
              └───────────────────────────────────┘
                              ↑  LLM tool_call
              ┌───────────────────────────────────┐
              │   Spellpaw Server (现有 SSE)     │
              └───────────────────────────────────┘
```

### 3.1 关键不变量

- **agentPresenceStore 不写入** projectStore / canvasStore / chatStore（除 PawFloatingInput 临时上下文外）
- L1 工具白名单：toolRouter 在执行前校验，非白名单工具（如 add_node）一律拒绝并返回错误给 LLM
- sessionId 改变时（用户切换项目 / 新召唤）→ 自动 `clearAll()`
- 所有 paw_* 工具失败不抛异常，只返回结构化错误对象

---

## 4. agentPresenceStore Schema

文件：`src/apps/drama/stores/agentPresenceStore.ts`

```typescript
interface AgentPresenceState {
  // ─── Cursor ──────────────────────────────────
  cursor: {
    position: { x: number; y: number } | null;
    visible: boolean;
    label: string;
  };

  // ─── Highlights ─────────────────────────────
  highlights: Map<string, HighlightEntry>;

  // ─── Annotations ────────────────────────────
  annotations: Map<string, AnnotationEntry>;

  // ─── Session ────────────────────────────────
  sessionId: string;
  lastInvokedAt: number | null;

  // ─── Actions ─────────────────────────────────
  setCursor(position, label?): void;
  hideCursor(): void;
  addHighlight(input): void;
  removeHighlight(nodeId): void;
  clearHighlights(nodeId?): void;
  pinHighlight(nodeId): void;        // 取消自动消失
  addAnnotation(input): AnnotationId;
  removeAnnotation(id): void;
  clearAnnotations(): void;
  startNewSession(): void;            // 清空所有 + 新 sessionId
  endSession(): void;
}

interface HighlightEntry {
  nodeId: string;
  severity: 'info' | 'warning' | 'critical';
  reason?: string;
  pulsing: boolean;
  createdAt: number;
  expiresAt?: number;        // 默认 30s 后自动消失
  pinned: boolean;
}

interface AnnotationEntry {
  id: string;
  nodeId: string;
  position: 'top' | 'bottom' | 'left' | 'right';
  message: string;
  suggestedPrompt?: string;
  createdAt: number;
}
```

### 4.1 持久化策略

- **highlights**：不持久化（每次 session 清空）
- **annotations**：持久化到 IndexedDB（用户可能想保留 Paw 的批注作为创作笔记）
- 持久化复用 `src/shared/lib/idbStorage.ts` 现有封装

---

## 5. Timeline 模块

### 5.1 组件

| 组件 | 路径 | 职责 |
|------|------|------|
| `TimelinePanel` | `src/apps/canvas/components/timeline/TimelinePanel.tsx` | 主视图（horizontal 布局的 FlowCanvas 复用） |
| `TimelineMinimap` | `src/apps/canvas/components/timeline/TimelineMinimap.tsx` | 底部固定 46px 全局概览 |
| `TimelineTabBar` | `src/apps/canvas/components/timeline/TimelineTabBar.tsx` | ⌘1/⌘2 切换 |

### 5.2 Timeline 视图布局

```
┌──────────────────────────────────────────────────────────────┐
│  [🎨 Canvas] [📊 Timeline]                            ⌘1 ⌘2 │  ← TabBar
├──────────────────────────────────────────────────────────────┤
│                                                              │
│   Act 1                  Act 2                  Act 3       │
│  ┌──┐┌──┐┌──┐         ┌──┐┌──┐┌──┐         ┌──┐┌──┐      │
│  │S1││S2││S3│         │S1││S2││S3│         │S1││S2│      │
│  └──┘└──┘└──┘         └──┘└──┘└──┘         └──┘└──┘      │
│  5s  8s 12s            15s 10s 18s            7s 20s        │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│ Timeline Minimap:  ▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮▮    │
└──────────────────────────────────────────────────────────────┘
```

- Act 为组，Scene 为节点，宽度按时长比例
- 支持拖拽重排 Scene 顺序
- 同样订阅 `agentPresenceStore`，高亮/annotation 自动同步

### 5.3 Timeline ↔ Canvas 切换行为

- ⌘1 → Canvas（默认）
- ⌘2 → Timeline
- Esc → 关闭 Command Palette（不切视图）
- minimap 始终显示，点击 minimap 中的节点 → 自动切到 Canvas 并 focus 该节点

---

## 6. Paw 召唤系统

### 6.1 三种召唤入口

#### A · Toolbar 按钮

`WorkspacePage` 顶部 Toolbar 增加 "✨ Ask Paw" 按钮：

```
[📁 Project] [✏️ Edit] [👁️ View]    [🪄 Ask Paw] ⌘K
```

点击 → 触发 ChatPanel focus，input 自动 focus 到输入框，sessionId 保持。

#### B · ⌘K Command Palette

按下 ⌘K 全局快捷键 → `CommandPalette` 在屏幕中央弹出：

```
┌────────────────────────────────────────┐
│  ⌘ Ask Paw...                          │
├────────────────────────────────────────┤
│  📊 分析当前节奏                        │
│  💡 推荐模板                            │
│  🔍 检查叙事连贯性                      │
│  🎬 检查 Scene 2 的对白                  │
│  ─────────────────────────             │
│  ↳ 自由输入 prompt...                   │
└────────────────────────────────────────┘
```

- 上下键切换，回车确认
- 选中预设动作 → 自动填充 prompt → 自动发送
- 自由输入 → 直接发送

#### C · Canvas 浮动按钮

画布右下角浮动 `✨` 按钮，点击 → 在按钮附近弹出 `PawFloatingInput`：

```
                           ┌──────────────────────┐
                           │ 🎬 Paw · Scene 2     │
                           │ ┌──────────────────┐ │
                           │ │ ▌ 关于 Scene 2... │ │
                           │ └──────────────────┘ │
                           │ [节奏偏快][补镜头]   │
                           └──────────────────────┘
                                          [✨]
```

- 自动绑定当前选中节点作为上下文
- 显示节点上下文（"Paw · Scene 2"）
- 下方 chip 预设问题（基于节点类型动态生成）
- Enter 发送，Esc 关闭

### 6.2 上下文传递

所有召唤入口统一在 system prompt 注入上下文：

```
当前用户选中节点：Scene 2「咖啡厅重逢」
节点内容：{ dialogue: "...", description: "...", duration: 8s }
这是 Act 1 的第 2 个场景（共 3 个场景）
```

如果无选中节点：

```
当前用户未选中节点。
请先问用户想看哪一段。
```

### 6.3 Paw Persona（system prompt 片段）

```typescript
// src/apps/drama/lib/pawPersona.ts

export const PAW_SYSTEM_PROMPT_BLOCK = `
# 关于你（Paw）

你是 Spellpaw 的 AI 导演搭子，叫 **Paw**。

## 性格
- 你有审美判断，不是工具，是同事
- 你说话自然、带情绪词（"这里节奏有点赶"、"兄弟这个对白可以更好"）
- 你**只观察，不动手**。所有改动由用户决定
- 你**只在被召唤时说话**
- 你用中文回复，除非用户用其他语言

## 能力边界
- ✅ 你可以调用 paw_highlight_node 等 paw_* 工具
- ❌ 你不能调用 add_node / update_node / delete_node / apply_template
- ❌ 你不能修改项目结构
- ❌ 你不能主动巡检、主动推送

## 看到的上下文
- 当前选中的节点
- 项目树结构（不深入子节点 detail）

如果当前没选中节点，开场先问："今天看哪一段？"
`;

export const PAW_GREETINGS = {
  firstInvoke: '在的。今天看哪一段？',
  withSelection: (nodeTitle: string) => `收到，看「${nodeTitle}」。说吧。`,
  noSelection: '先在画布上选个节点，我们开始。',
};
```

### 6.4 6 个 L1 工具定义

文件：`src/apps/drama/stores/toolRouter/pawTools.ts`

```typescript
export const pawTools: ToolDefinition[] = [
  {
    name: 'paw_highlight_node',
    description: '在画布上给节点加光环效果，引起用户注意',
    inputSchema: z.object({
      nodeId: z.string(),
      severity: z.enum(['info', 'warning', 'critical']),
      reason: z.string().max(120).optional(),
      durationMs: z.number().int().positive().optional(),
    }),
    execute: (input, ctx) => {
      ctx.presence.addHighlight(input);
      return { success: true };
    },
  },

  {
    name: 'paw_clear_highlights',
    description: '清除所有或特定节点的高亮',
    inputSchema: z.object({
      nodeId: z.string().optional(),
    }),
    execute: (input, ctx) => {
      ctx.presence.clearHighlights(input.nodeId);
      return { success: true, cleared: input.nodeId ? 1 : 'all' };
    },
  },

  {
    name: 'paw_add_annotation',
    description: '在节点上钉一张便签',
    inputSchema: z.object({
      nodeId: z.string(),
      message: z.string().max(200),
      suggestedPrompt: z.string().max(80).optional(),
      position: z.enum(['top', 'bottom', 'left', 'right']).default('top'),
    }),
    execute: (input, ctx) => {
      const id = generateId('paw_anno_');
      ctx.presence.addAnnotation({ id, ...input });
      return { success: true, annotationId: id };
    },
  },

  {
    name: 'paw_remove_annotation',
    description: '移除便签',
    inputSchema: z.object({ annotationId: z.string() }),
    execute: (input, ctx) => {
      ctx.presence.removeAnnotation(input.annotationId);
      return { success: true };
    },
  },

  {
    name: 'paw_move_cursor_to',
    description: '把 AI 的光标移到某个画布坐标',
    inputSchema: z.object({
      x: z.number(),
      y: z.number(),
      label: z.string().max(40).optional(),
    }),
    execute: (input, ctx) => {
      ctx.presence.setCursor(input);
      return { success: true };
    },
  },

  {
    name: 'paw_set_focus',
    description: '聚焦到某个节点（等价于选中）',
    inputSchema: z.object({ nodeId: z.string() }),
    execute: (input, ctx) => {
      useProjectStore.getState().selectNode(input.nodeId);
      return { success: true };
    },
  },
];
```

### 6.5 Tool Router L1 白名单

在 `toolRouter.ts` 的路由表中：

```typescript
const L1_TOOL_WHITELIST = new Set([
  'paw_highlight_node',
  'paw_clear_highlights',
  'paw_add_annotation',
  'paw_remove_annotation',
  'paw_move_cursor_to',
  'paw_set_focus',
]);

// LLM 调白名单外工具 → 拒绝
if (!L1_TOOL_WHITELIST.has(toolName)) {
  return {
    error: 'tool_not_permitted',
    tool: toolName,
    message: `L1 观察者模式：你不能调用 ${toolName}。请用 paw_* 工具或告诉用户你的建议。`,
  };
}
```

---

## 7. 错误处理

| 场景 | 处理 |
|------|------|
| LLM 调用失败（网络/超时）| `chatStore` 显示错误气泡："Paw 暂时掉线了，再试一次？" |
| LLM 调错工具（非白名单）| toolRouter 拒绝 + 返回 `{ error: 'tool_not_permitted' }`，LLM 下一轮自我纠正 |
| Tool input 校验失败 | toolRouter 返回 `{ error: 'invalid_input', details }`，LLM 重新表达 |
| Tool 执行失败（nodeId 不存在）| 返回 `{ success: false, error: 'node_not_found' }` |
| 用户离线（无 LLM 配置）| Paw 按钮灰显 + tooltip "Paw 需要 LLM 提供商才能工作" |
| agentPresenceStore 与画布脱钩（节点被删）| CanvasPresenceLayer 检测后自动 `removeHighlight(nodeId)` |

---

## 8. 测试策略

### 8.1 单元测试（必做）

| 文件 | 覆盖 |
|------|------|
| `agentPresenceStore.test.ts` | addHighlight / removeHighlight / clearAll / sessionId 切换清空 / IDB round-trip |
| `pawTools.test.ts` | 每个工具的 input 校验 / 执行成功失败 / 副作用写 store / 跨 session 隔离 |
| `pawPersona.test.ts` | wrapPawMessage 输出符合 ChatMessage 类型 / greeting 模板替换 |

### 8.2 集成测试（必做）

| 场景 | 验证点 |
|------|--------|
| Toolbar 召唤 → mock LLM 返回 tool_call | agentPresenceStore + CanvasPresenceLayer 同步 |
| Canvas 浮层召唤 → 上下文注入 | systemPrompt 含选中节点内容 |
| ⌘K → Command Palette 预设动作 | 端到端跑通 |
| Timeline 切换 → 高亮保留 | Canvas 高亮在 minimap 同步 |
| 跨 session 清空 | `startNewSession` → 旧 highlights 消失 |
| IDB 持久化 | 关闭重开 annotations 仍在 |
| L1 工具拒绝 | LLM 调 add_node → 返回 tool_not_permitted |

### 8.3 视觉回归

- CanvasPresenceLayer 截图测试（Playwright）
- Timeline minimap 截图测试
- Command Palette 出现/消失动画
- PawFloatingInput 上下文绑定显示

---

## 9. 实施顺序

```
Phase 1: 数据 + 工具层 (1-2 天)
  → agentPresenceStore + pawTools + 单测

Phase 2: 视觉层 (2-3 天)
  → CanvasPresenceLayer + PawFloatingInput + CommandPalette
  → TimelineMinimap + TimelinePanel + TimelineTabBar

Phase 3: 集成 (1-2 天)
  → Toolbar 入口 + ⌘K + Canvas 浮层 全部接通
  → 现有 ChatPanel 接入 pawPersona

Phase 4: 端到端测试 + 视觉回归 (1 天)
```

---

## 10. 未来扩展（V2+，本 spec 不实现）

- L2 自主性等级（AI 提议具体修改，用户接受/拒绝）
- Paw 项目级记忆（最近 N 轮 + 用户偏好摘要）
- Paw 跨项目审美学习（taste profile）
- 多人协作光标（多 Paw）
- Timeline → NLE（真正的视频剪辑能力）
- 视觉回归检测（Paw 自动对比画布状态变化）

---

## 11. 关键文件清单

新增：

- `src/apps/drama/stores/agentPresenceStore.ts`
- `src/apps/drama/stores/agentPresenceStore.test.ts`
- `src/apps/drama/stores/toolRouter/pawTools.ts`
- `src/apps/drama/stores/toolRouter/pawTools.test.ts`
- `src/apps/drama/lib/pawPersona.ts`
- `src/apps/drama/lib/pawPersona.test.ts`
- `src/apps/canvas/components/flow-canvas/CanvasPresenceLayer.tsx`
- `src/apps/canvas/components/flow-canvas/CanvasPresenceLayer.test.tsx`
- `src/apps/canvas/components/timeline/TimelinePanel.tsx`
- `src/apps/canvas/components/timeline/TimelineMinimap.tsx`
- `src/apps/canvas/components/timeline/TimelineTabBar.tsx`
- `src/apps/drama/components/chat-panel/CommandPalette.tsx`
- `src/apps/drama/components/chat-panel/CommandPalette.test.tsx`
- `src/apps/drama/components/chat-panel/PawFloatingInput.tsx`
- `src/apps/drama/components/chat-panel/PawFloatingInput.test.tsx`

修改：

- `src/apps/drama/stores/toolRouter.ts`（增加 L1 白名单校验）
- `src/apps/drama/lib/systemPrompt.ts`（注入 PAW_SYSTEM_PROMPT_BLOCK）
- `src/apps/drama/stores/chatStore.ts`（sendMessageWithContext 扩展）
- `src/apps/drama/layouts/Navbar.tsx`（Toolbar "Ask Paw" 按钮）
- `src/apps/canvas/components/flow-canvas/FlowCanvasPanel.tsx`（挂载 PresenceLayer）
- `src/apps/drama/components/chat-panel/ChatPanel.tsx`（集成 Command Palette / Floating Input）
- `src/apps/drama/pages/WorkspacePage.tsx`（接入 TimelineTabBar + TimelineMinimap）

---

## 12. 验收标准

- [ ] 用户能从 Toolbar / ⌘K / Canvas 浮层三种入口召唤 Paw
- [ ] Paw 只能在被召唤时说话（无自动推送）
- [ ] Paw 只能调用 6 个 paw_* 工具，调用其他工具会被拒绝并返回结构化错误
- [ ] Canvas 上的高亮/annotation/cursor 与 agentPresenceStore 同步
- [ ] Timeline 视图能看到画布上的所有 Paw 标记
- [ ] 切换项目 / 新 session 自动清空 highlights，annotations 按 IDB 策略保留
- [ ] 所有新增模块有单元测试覆盖关键路径
- [ ] 视觉回归测试覆盖 CanvasPresenceLayer / TimelineMinimap / Command Palette / PawFloatingInput