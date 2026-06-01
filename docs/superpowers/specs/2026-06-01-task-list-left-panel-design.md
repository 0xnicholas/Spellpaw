# 左栏任务列表 — 设计文档

> 日期：2026-06-01  
> 状态：设计完成，待实现  
> 关联：WorkspacePage 左栏重构

---

## 1. 概述

将 WorkspacePage 左栏从「项目结构树 + 资产管理」替换为「Agent 对话任务列表」。每个任务是独立的 Agent 对话线程（Cursor Composer 风格），分为三个状态阶段：**进行中**、**待审查**、**已完成**。

原始左栏的 TreeViewPanel 和 AssetManagerPanel 代码保留但不再在 WorkspacePage 中引用。中栏的 DetailPanel Tab 暂时移除。

---

## 2. 布局变更

```
Before:                          After:
┌────────┬──────────┬────────┐   ┌────────┬──────────┬────────┐
│ 项目树  │ ChatPanel│ 画布   │   │ 任务列表│ 任务对话  │ 画布   │
│        │ (含Detail│        │   │ 进行中  │ (独立线程)│        │
│        │  Panel)  │        │   │ 待审查  │          │        │
├────────┤          │        │   │ 已完成  │          │        │
│ 资产管理│          │        │   │        │          │        │
└────────┴──────────┴────────┘   └────────┴──────────┴────────┘
  20%      30%        50%          20%       30%        50%
```

三栏比例不变（20/30/50），左栏内部不再上下分屏。

---

## 3. 数据模型

### 3.1 AgentTask

```typescript
// src/apps/drama/types/index.ts

interface AgentTask {
  id: string;
  title: string;                    // Agent 根据首条消息自动生成
  status: 'in_progress' | 'pending_review' | 'completed';
  messages: ChatMessage[];          // 复用现有类型
  createdAt: string;
  updatedAt: string;
  sessionId?: string;               // Pandaria session（首次发消息后创建）
  affectedNodeIds?: string[];       // 受影响的树节点 ID
  generatedAssetIds?: string[];     // 生成的资产 ID
}
```

### 3.2 状态流转

```
新创建 ──(用户发首条消息)──→ 进行中
                              │
                    (Agent turn_end)
                              ↓
                          待审查 ──(用户继续对话)──→ 进行中
                              │
                      (用户标记完成)
                              ↓
                           已完成
```

- **新创建 → 进行中**：用户发送首条消息后自动转换
- **进行中 → 待审查**：Agent 完成工具调用（turn_end）后自动转换
- **待审查 → 进行中**：用户在对话中继续提出修改要求
- **待审查 → 已完成**：用户手动标记
- 任何状态均可删除

---

## 4. Store 设计

### 4.1 TaskStore

```typescript
// src/apps/drama/stores/taskStore.ts

interface TaskState {
  tasks: AgentTask[];
  activeTaskId: string | null;
  isLoading: boolean;

  // 任务 CRUD
  createTask: () => string;
  deleteTask: (id: string) => void;
  setActiveTask: (id: string | null) => void;
  updateTaskTitle: (id: string, title: string) => void;

  // 消息操作
  sendMessage: (taskId: string, content: string) => void;
  appendMessage: (taskId: string, msg: ChatMessage) => void;

  // SSE streaming（per-task）
  startStreaming: (taskId: string, msgId: string) => void;
  appendDelta: (taskId: string, delta: string) => void;
  endStreaming: (taskId: string, stopReason?: string) => void;

  // 工具调用
  startToolCall: (taskId: string, callId: string, name: string) => void;
  endToolCall: (taskId: string, callId: string) => void;

  // 状态流转
  markPendingReview: (taskId: string) => void;
  markCompleted: (taskId: string) => void;
  markInProgress: (taskId: string) => void;
}
```

使用 Zustand + Immer + IDB 持久化（`spellpaw_tasks` key）。

### 4.2 计算属性（derived）

```typescript
// 分组后的任务
const tasksByStatus = {
  inProgress: tasks.filter(t => t.status === 'in_progress'),
  pendingReview: tasks.filter(t => t.status === 'pending_review'),
  completed: tasks.filter(t => t.status === 'completed'),
};

// 当前活跃任务的完整对象
const activeTask = tasks.find(t => t.id === activeTaskId);
```

---

## 5. 组件结构

```
WorkspacePage
├── 左栏 (Panel 20%)
│   └── TaskListPanel              🆕 新增
│       ├── PanelHeader ("任务")
│       ├── TaskSection ("🔄 进行中")
│       │   └── TaskCard × N
│       ├── TaskSection ("👁 待审查")
│       │   └── TaskCard × N
│       └── TaskSection ("✅ 已完成", 默认折叠)
│           └── TaskCard × N
│
├── 中栏 (Panel 30%)
│   └── TaskChatPanel              🆕 新增（替代 ChatPanel）
│       ├── [空状态] 无选中任务时
│       │   ├── "✨ 新对话" 提示
│       │   └── MessageInput → 发送即创建任务
│       └── [对话状态] 有选中任务时
│           ├── TaskChatHeader (标题 + 状态标签 + 删除按钮)
│           ├── MessageList        ♻️ 复用现有组件
│           └── MessageInput       ♻️ 复用现有组件
│
└── 右栏 (Panel 50%)
    └── FlowCanvasPanel            ✅ 不变
```

### 5.1 TaskCard

- 显示：状态图标 + 标题 + 消息数/时间
- 点击 → `setActiveTask(card.id)`
- 无批准/拒绝按钮（审查在对话内完成）
- 进行中任务如果有 tool call 进行中，显示加载指示器
- 待审查任务左侧有紫色边线
- 已完成任务半透明显示

### 5.2 TaskChatPanel

两种状态：

| 状态 | 条件 | 展示 |
|------|------|------|
| 空状态 | `activeTaskId === null` | 居中大图标 + "新对话" + 输入框。用户发送消息后自动 `createTask()` |
| 对话中 | `activeTaskId !== null` | 任务标题栏 + 消息列表 + 输入框。与当前 ChatPanel 布局一致 |

### 5.3 TaskChatHeader

- 任务标题（可点击编辑）
- 状态标签（进行中 / 待审查 / 已完成）
- 删除按钮（右对齐）

---

## 6. 数据流

### 6.1 创建任务 & 发送消息

```
用户在空状态输入框发送消息
  → taskStore.createTask()         // 状态: in_progress
  → taskStore.sendMessage(taskId, content)
  → POST /api/v1/sessions          // 创建 Pandaria session
  → 保存 sessionId 到 task
  → POST /api/v1/sessions/{id}/messages
  → 订阅 SSE（该 session 的事件流）
```

### 6.2 SSE 事件处理

```
text_delta → taskStore.appendDelta(taskId, delta)
tool_call_started → taskStore.startToolCall(taskId, callId, name)
tool_call_done → taskStore.endToolCall(taskId, callId)
turn_end → taskStore.endStreaming(taskId)
          → taskStore.markPendingReview(taskId)   // 自动转为待审查
```

### 6.3 Agent Tool 调用

Agent 通过 toolRouter 调用本地 store。与现有机制完全一致——Agent 在任务对话中调用 tool 直接修改 projectStore 和 canvasStore。不需要额外适配。

### 6.4 任务对话与画布联动

- 当 Agent 创建/修改了树节点或画布节点，右栏画布实时反映变更（已有双向同步）
- `affectedNodeIds` 和 `generatedAssetIds` 字段记录任务产出物，用于后续"跳转到画布"功能

---

## 7. SSE 连接管理

### 7.1 策略

每个活跃任务对应一个 Pandaria session。同一时间只有一个任务是"活跃"的（activeTaskId）。切换任务时：

1. 关闭旧任务的 SSE 连接
2. 如果有未完成的 streaming，先 flush（通过 endStreaming 保存）
3. 新任务如果已有 sessionId，恢复 SSE 连接；否则等待用户发消息

### 7.2 useTaskSSE Hook

```typescript
// src/apps/drama/hooks/useTaskSSE.ts

function useTaskSSE() {
  const activeTaskId = useTaskStore(s => s.activeTaskId);
  // 订阅当前活跃 task 的 SSE
  // 根据 activeTaskId 变化自动切换连接
}
```

---

## 8. 文件变更清单

| 操作 | 文件 |
|------|------|
| 🆕 新增 | `src/apps/drama/stores/taskStore.ts` |
| 🆕 新增 | `src/apps/drama/stores/taskStore.test.ts` |
| 🆕 新增 | `src/apps/drama/components/task-list/TaskListPanel.tsx` |
| 🆕 新增 | `src/apps/drama/components/task-list/TaskCard.tsx` |
| 🆕 新增 | `src/apps/drama/components/task-chat/TaskChatPanel.tsx` |
| 🆕 新增 | `src/apps/drama/components/task-chat/TaskChatHeader.tsx` |
| 🆕 新增 | `src/apps/drama/hooks/useTaskSSE.ts` |
| 🔄 修改 | `src/apps/drama/pages/WorkspacePage.tsx` |
| 🔄 修改 | `src/apps/drama/types/index.ts` |
| 🗑 保留 | `TreeViewPanel`, `AssetManagerPanel`, `ChatPanel`, `DetailPanel`（代码不动，只解引用） |

---

## 9. 边界 & 不做的事

- ❌ 不删除任何现有组件代码
- ❌ 不改动右栏画布逻辑
- ❌ 不改 toolRouter
- ❌ 不引入实时协作
- ❌ DetailPanel 暂时移除（后续 Phase 4 重新设计分镜编辑器）
- ❌ 不做任务拖拽排序（Phase 1 只做基础列表）
- ❌ 不做任务搜索/筛选（Phase 1 最小可用）

---

## 10. 验收标准

1. 左栏显示任务列表，按「进行中 / 待审查 / 已完成」分组
2. 点击任务卡片 → 中栏切换为该任务的独立对话
3. 无选中任务时 → 中栏显示空状态，发送消息自动创建新任务
4. Agent 在对话中可直接调用 toolRouter 修改项目
5. Agent 完成工具调用后任务自动变为「待审查」
6. 用户可在对话中标记任务为「已完成」
7. 任务数据持久化到 IndexedDB
8. 原有 TreeViewPanel、AssetManagerPanel 功能不受影响（代码保留）
9. 所有现有测试继续通过
