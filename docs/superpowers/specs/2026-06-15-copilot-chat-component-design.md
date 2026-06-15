# CopilotChat 组件设计

> 将画布 Agent 对话助手抽成独立、可复用的纯 UI 组件

**日期**: 2026-06-15
**状态**: Draft

---

## 1. 目标

将当前 `ChatPanel` 中与「对话交互」直接相关的 UI（消息列表、流式渲染、tool call 指示器、输入框）抽成独立组件 `<CopilotChat />`，使其：
- 零依赖外部 store，纯 props 驱动
- 可被 drama workspace、portal、未来任何 app 复用
- 不改动现有 Agent 逻辑（chatStore、usePandariaSSE、toolRouter 等）

## 2. 核心原则

LLM 渲染 UI 安全 = **结构化输出 + 元数据校验 + 组件注册表 + 配置唯一真相源 + 渐进式确认**。

CopilotChat 是这五层中的「组件注册表」（精确映射）层 — 它只负责把结构化数据渲染为 UI，所有数据由上层（toolRouter → store）在严格约束下产生，组件自身不做任何自由解释。

## 3. 组件接口

```tsx
// src/shared/components/copilot/CopilotChat.tsx

interface ToolCall {
  callId: string;
  name: string;
}

interface CopilotChatProps {
  /** 历史消息列表 */
  messages: ChatMessage[];
  /** 正在流式输出的文本（null = 无流式输出） */
  streamingText: string | null;
  /** 正在执行中的 tool call */
  toolCalls: ToolCall[];
  /** 是否正在等待响应 */
  isLoading: boolean;
  /** 用户发送消息 */
  onSend: (content: string) => void;
  /** 输入框占位文字 */
  placeholder?: string;
  /** 空消息时的展示内容（ReactNode） */
  emptyState?: ReactNode;
  /** 消息中的 action 按钮点击回调 */
  onActionClick?: (action: ChatAction) => void;
}
```

- `isLoading` + `streamingText` + `toolCalls` 三个状态互相独立，由消费方按需组合
- 组件不调用任何 store，不发起任何网络请求

## 4. 文件结构

```
src/shared/components/copilot/
├── CopilotChat.tsx          # 组装层：接收 props，组合子组件
├── MessageList.tsx          # 消息列表 + 流式渲染 + tool call 指示器
├── MessageItem.tsx          # 单条消息气泡（user / agent 不同样式）
├── MessageInput.tsx         # 输入框 + 发送按钮
└── index.ts                 # 统一导出
```

### 类型搬迁

`ChatMessage`、`ChatAction`、`MessageRole`、`MessageType` 从 `@drama/types` 提升到 `@shared/types`，它们是通用结构，不属于 drama 专属。

## 5. 数据流

```
chatStore ──→ ChatPanel (装配层) ──props──→ CopilotChat (纯 UI)
  ↑                                              │
  │                                          onSend()
  └──────────────────────────────────────────────┘
```

- **CopilotChat**：纯展示，所有数据经 props 流入
- **ChatPanel**：装配层，从 `chatStore` 取数据，注入 `usePandariaSSE` hook，传给 CopilotChat
- node-scoped 过滤条留在 ChatPanel 外层处理（依赖 `projectStore` 的树数据）

## 6. ChatPanel 重构对照

### 重构前
```
ChatPanel ──直接 import──→ useChatStore, useProjectStore
         ──直接渲染──→ MessageList, MessageInput, MessageItem
```

### 重构后
```
ChatPanel ──import──→ useChatStore (装配数据)
         ──props──→ <CopilotChat messages={...} onSend={...} />
                        └── CopilotChat ──内部组合──→ MessageList + MessageInput + MessageItem
```

ChatPanel 保留 ContextBar、QuickActions、TabBar、DetailPanel 的装配逻辑。

## 7. 样式

沿用当前设计令牌（`var(--color-*)`），不引入新 CSS。消息气泡、输入框、流式动画全部内置。若未来需要主题化，通过外层 `className` prop 注入。

## 8. 测试策略

| 对象 | 类型 | 覆盖 |
|------|------|------|
| `CopilotChat` | 组件测试 | 渲染消息列表、流式文本动画、tool call 脉冲指示器、发送回调、空状态 |
| `MessageInput` | 组件测试 | 输入→发送→清空、Enter 快捷键、placeholder 渲染 |
| `ChatPanel` (重构后) | 保留现有集成测试 | 确认与 chatStore 的连接不被破坏 |

## 9. 迁移步骤

1. **搬类型** — `ChatMessage`, `ChatAction` 等从 `@drama/types` → `@shared/types`，更新所有 import
2. **建 copilot/ 目录** — 新写 `CopilotChat.tsx`，搬 `MessageList`、`MessageItem`、`MessageInput`
3. **重构 ChatPanel** — 去掉内部直接调 store，改为通过 props 传入 CopilotChat
4. **快照对比** — 完整交互确认 UI 不变
5. **删旧文件** — `chat-panel/MessageList.tsx`, `chat-panel/MessageItem.tsx`, `chat-panel/MessageInput.tsx`（ChatPanel、ContextBar、QuickActions 保留）

## 10. 不动项

以下模块完全不改动：
- `chatStore.ts` / `taskStore.ts`
- `usePandariaSSE.ts` / `useMockSSE.ts` / `useToolBridge.ts` / `useTaskSSE.ts`
- `toolRouter.ts`
- `lib/pandaria.ts`
- `tool-server/spellpaw-tool-server.ts`

## 11. 预留：Builder Renderer 接口

CopilotChat 预留非文本消息渲染 slot，供后续 Builder Renderer（独立 spec）通过 `messages` 中 type='builder' 的消息将结构化 UI 内联到对话流中。当前 CopilotChat 仅处理 text/code/suggestion/action 类型。
