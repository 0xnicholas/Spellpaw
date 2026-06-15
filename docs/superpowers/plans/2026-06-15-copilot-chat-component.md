# CopilotChat 组件实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 ChatPanel 中的对话 UI 层（消息列表、流式渲染、tool call 指示器、输入框）抽成纯 props 驱动的 `<CopilotChat />` 组件，零依赖外部 store。

**Architecture:** CopilotChat 是纯展示组件，所有数据通过 props 流入。ChatPanel 变成装配层，从 chatStore 取数据注入 CopilotChat。ChatMessage/ChatAction 类型从 @drama/types 提升到 @shared/types。

**Tech Stack:** React 19, TypeScript, Tailwind CSS, react-markdown

---

## 文件变更总览

| 操作 | 文件 |
|------|------|
| 修改 | `src/shared/types/index.ts` — 添加 ChatMessage, ChatAction, MessageRole, MessageType |
| 修改 | `src/apps/drama/types/index.ts` — 改为从 @shared/types re-export |
| 新建 | `src/shared/components/copilot/CopilotChat.tsx` |
| 新建 | `src/shared/components/copilot/MessageList.tsx` |
| 移动 | `chat-panel/MessageItem.tsx` → `copilot/MessageItem.tsx` + 改 import |
| 移动 | `chat-panel/MessageInput.tsx` → `copilot/MessageInput.tsx` + 去 store 依赖 |
| 新建 | `src/shared/components/copilot/index.ts` |
| 修改 | `src/apps/drama/components/chat-panel/ChatPanel.tsx` — 装配层 |
| 删除 | `chat-panel/MessageItem.tsx`, `chat-panel/MessageInput.tsx`, `chat-panel/MessageList.tsx` |
| 修改 | `src/apps/drama/data/mockChatData.ts` — import 路径 |
| 修改 | `src/apps/drama/data/mockTaskData.ts` — import 路径 |

---

### Task 1: 搬移 Chat 类型定义到 shared

**Files:**
- Modify: `src/shared/types/index.ts`
- Modify: `src/apps/drama/types/index.ts`
- Modify: `src/apps/drama/stores/chatStore.ts`
- Modify: `src/apps/drama/stores/taskStore.ts`
- Modify: `src/apps/drama/data/mockChatData.ts`
- Modify: `src/apps/drama/data/mockTaskData.ts`

- [ ] **Step 1: 在 shared/types 添加 Chat 类型**

`src/shared/types/index.ts` 当前只有 `User`。在文件末尾追加：

```typescript
// ── Chat ──────────────────────────────────────────────

export type MessageRole = 'user' | 'agent' | 'system';
export type MessageType = 'text' | 'code' | 'suggestion' | 'action';

export interface ChatAction {
  id: string;
  label: string;
  type: 'insert_scene' | 'modify_script' | 'generate_storyboard' | 'custom';
  payload?: Record<string, unknown>;
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  type: MessageType;
  timestamp: string;
  context?: {
    nodeId?: string;
    nodeType?: string;
  };
  actions?: ChatAction[];
}
```

- [ ] **Step 2: drama/types 改为 re-export**

`src/apps/drama/types/index.ts` 中找到 ChatMessage/ChatAction/MessageRole/MessageType 的定义块（约第 42-64 行），替换为：

```typescript
// Re-exported from shared
export type { MessageRole, MessageType, ChatAction, ChatMessage } from '@shared/types';
```

- [ ] **Step 3: 检查所有文件仍可通过 @drama/types 导入**

```bash
npx tsc --noEmit 2>&1 | head -20
```

预期：无新增类型错误（原有错误不计）。

- [ ] **Step 4: Commit**

```bash
git add src/shared/types/index.ts src/apps/drama/types/index.ts
git commit -m "refactor: move ChatMessage/ChatAction types to shared"
```

---

### Task 2: 创建 CopilotChat 组装组件

**Files:**
- Create: `src/shared/components/copilot/CopilotChat.tsx`

- [ ] **Step 1: 创建 CopilotChat.tsx**

```tsx
import type { ReactNode } from 'react';
import type { ChatMessage, ChatAction } from '@shared/types';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';

export interface ToolCall {
  callId: string;
  name: string;
}

export interface CopilotChatProps {
  messages: ChatMessage[];
  streamingText: string | null;
  toolCalls: ToolCall[];
  isLoading: boolean;
  onSend: (content: string) => void;
  placeholder?: string;
  emptyState?: ReactNode;
  onActionClick?: (action: ChatAction) => void;
}

export function CopilotChat({
  messages,
  streamingText,
  toolCalls,
  isLoading,
  onSend,
  placeholder = '输入消息…（Cmd + Enter 发送）',
  emptyState,
  onActionClick,
}: CopilotChatProps) {
  return (
    <div className="flex h-full flex-col">
      <MessageList
        messages={messages}
        streamingMessage={streamingText}
        isLoading={isLoading}
        toolCalls={toolCalls}
        emptyState={emptyState}
        onActionClick={onActionClick}
      />
      <MessageInput
        onSend={onSend}
        disabled={isLoading}
        placeholder={placeholder}
      />
    </div>
  );
}
```

- [ ] **Step 2: 验证编译**

```bash
npx tsc --noEmit src/shared/components/copilot/CopilotChat.tsx 2>&1
```

预期：仅提示 MessageList/MessageInput 模块缺失（下一步创建）。无语法错误。

- [ ] **Step 3: Commit**

```bash
git add src/shared/components/copilot/CopilotChat.tsx
git commit -m "feat: add CopilotChat shell component"
```

---

### Task 3: 迁移 MessageItem（纯搬移，改 import）

**Files:**
- Create: `src/shared/components/copilot/MessageItem.tsx`
- Delete later: `src/apps/drama/components/chat-panel/MessageItem.tsx`

- [ ] **Step 1: 复制 MessageItem + 改 import 路径**

`src/shared/components/copilot/MessageItem.tsx` — 从 `chat-panel/MessageItem.tsx` 复制全部内容，只改第 5 行 import：

```diff
- import type { ChatMessage, ChatAction } from '@drama/types';
+ import type { ChatMessage, ChatAction } from '@shared/types';
```

其余代码完全相同。

- [ ] **Step 2: 验证编译**

```bash
npx tsc --noEmit src/shared/components/copilot/MessageItem.tsx 2>&1
```

预期：无错误。

- [ ] **Step 3: Commit**

```bash
git add src/shared/components/copilot/MessageItem.tsx
git commit -m "refactor: copy MessageItem to copilot/ with shared types import"
```

---

### Task 4: 重构 MessageInput（去掉 store 依赖）

当前 `MessageInput` 有 fallback 逻辑：如果 `onSend` prop 未传，则回退到 `useChatStore.sendMessage`。Copilot 版本必须去掉这个回退 — 纯 props 驱动。

**Files:**
- Create: `src/shared/components/copilot/MessageInput.tsx`

- [ ] **Step 1: 创建纯 props 版 MessageInput**

```tsx
import { useState } from 'react';
import { Send } from 'lucide-react';
import { Textarea } from '@/shared/components/ui/Textarea';
import { IconButton } from '@/shared/components/ui/IconButton';

interface MessageInputProps {
  onSend: (content: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function MessageInput({
  onSend,
  disabled = false,
  placeholder = '输入消息…（Cmd + Enter 发送）',
}: MessageInputProps) {
  const [value, setValue] = useState('');

  const handleSubmit = () => {
    if (!value.trim() || disabled) return;
    onSend(value.trim());
    setValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="border-t border-[var(--color-border-default)] bg-[var(--color-bg-primary)] p-3">
      <div className="relative">
        <Textarea
          placeholder={placeholder}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={2}
          className="pr-10"
        />
        <div className="absolute bottom-2 right-2">
          <IconButton
            icon={<Send className="h-4 w-4" />}
            label="发送"
            size="sm"
            onClick={handleSubmit}
            disabled={!value.trim() || disabled}
          />
        </div>
      </div>
    </div>
  );
}
```

与旧版差异：
- 去掉了 `useChatStore` import 和 `storeSendMessage` / `storeLoading` fallback
- `onSend` 变成 required prop（不再可选）
- 新增 `placeholder` prop 支持自定义

- [ ] **Step 2: 验证编译**

```bash
npx tsc --noEmit src/shared/components/copilot/MessageInput.tsx 2>&1
```

- [ ] **Step 3: Commit**

```bash
git add src/shared/components/copilot/MessageInput.tsx
git commit -m "refactor: create pure MessageInput component with required onSend prop"
```

---

### Task 5: 重构 MessageList（去掉 store 依赖）

当前 MessageList 支持外部 props 和 store fallback 双数据源。Copilot 版本需要去掉 store fallback，纯 props 驱动。同时去掉 node-scoped 过滤条（那是 ChatPanel 装配层的职责）。

**Files:**
- Create: `src/shared/components/copilot/MessageList.tsx`

- [ ] **Step 1: 创建纯 props 版 MessageList**

```tsx
import { useRef, useEffect, type ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import { MessageItem } from './MessageItem';
import type { ChatMessage, ChatAction } from '@shared/types';
import type { ToolCall } from './CopilotChat';

interface MessageListProps {
  messages: ChatMessage[];
  streamingMessage: string | null;
  isLoading: boolean;
  toolCalls: ToolCall[];
  onActionClick?: (action: ChatAction) => void;
  emptyState?: ReactNode;
}

export function MessageList({
  messages,
  streamingMessage,
  isLoading,
  toolCalls,
  onActionClick,
  emptyState,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingMessage, toolCalls]);

  return (
    <div className="flex-1 overflow-y-auto">
      {messages.length === 0 && emptyState}

      {messages.map((msg) => (
        <MessageItem key={msg.id} message={msg} onActionClick={onActionClick} />
      ))}

      {/* Streaming message */}
      {streamingMessage !== null && (
        <div className="px-3 py-2">
          <div className="flex items-start gap-2">
            <span className="mt-0.5 text-[10px] font-medium text-[var(--color-text-accent)]">🤖</span>
            <div className="flex-1 text-xs text-[var(--color-text-primary)] leading-relaxed">
              <ReactMarkdown
                components={{
                  p: ({ children }) => <p className="my-0">{children}</p>,
                  strong: ({ children }) => (
                    <strong className="font-semibold text-[var(--color-text-primary)]">{children}</strong>
                  ),
                }}
              >
                {streamingMessage || '▊'}
              </ReactMarkdown>
            </div>
          </div>
        </div>
      )}

      {/* Tool call indicators */}
      {toolCalls.map((tc) => (
        <div key={tc.callId} className="px-3 py-1">
          <div className="flex items-center gap-1.5 text-[10px] text-[var(--color-text-tertiary)]">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--color-bg-accent)] animate-pulse" />
            🔧 {tc.name}
          </div>
        </div>
      ))}

      {/* Loading indicator (fallback when no streaming) */}
      {isLoading && streamingMessage === null && toolCalls.length === 0 && (
        <div className="px-3 py-2 text-[10px] text-[var(--color-text-tertiary)]">
          🤖 思考中…
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}
```

与旧版差异：
- 去掉了 `useChatStore` 和 `useProjectStore` 依赖
- `messages` 不再是可选的（不放 undefined）
- 去掉了 node-scoped 过滤条（Filter + X 按钮），由调用方（ChatPanel）在传入 messages 前自己过滤
- 去掉了 `storeStreaming` / `storeLoading` / `storeToolCalls` fallback
- `externalMessages` / `externalStreaming` / `externalLoading` / `externalToolCalls` 等双数据源模式全部移除

- [ ] **Step 2: 验证编译**

```bash
npx tsc --noEmit src/shared/components/copilot/MessageList.tsx 2>&1
```

- [ ] **Step 3: Commit**

```bash
git add src/shared/components/copilot/MessageList.tsx
git commit -m "refactor: create pure MessageList component without store dependencies"
```

---

### Task 6: 创建 copilot/index.ts 统一导出

**Files:**
- Create: `src/shared/components/copilot/index.ts`

- [ ] **Step 1: 写 index.ts**

```typescript
export { CopilotChat } from './CopilotChat';
export type { CopilotChatProps, ToolCall } from './CopilotChat';
export { MessageItem } from './MessageItem';
export { MessageList } from './MessageList';
export { MessageInput } from './MessageInput';
```

- [ ] **Step 2: Commit**

```bash
git add src/shared/components/copilot/index.ts
git commit -m "feat: add copilot barrel export"
```

---

### Task 7: 重构 ChatPanel 为装配层

**Files:**
- Modify: `src/apps/drama/components/chat-panel/ChatPanel.tsx`

- [ ] **Step 1: 改写 ChatPanel.tsx**

当前 ChatPanel.tsx 的完整新版本：

```tsx
import { useCallback } from 'react';
import { TabBar } from '@/shared/components/ui/TabBar';
import { TabPanel } from '@/shared/components/ui/TabPanel';
import { DetailPanel } from '@drama/components/detail-panel/DetailPanel';
import { CopilotChat } from '@/shared/components/copilot';
import { ContextBar } from './ContextBar';
import { QuickActions } from './QuickActions';
import { useChatStore } from '@drama/stores/chatStore';
import { useDetailStore } from '@drama/stores/detailStore';
import { useProjectStore } from '@drama/stores/projectStore';
import { usePandariaSSE } from '@drama/hooks/usePandariaSSE';
import { findNode, findParent } from '@drama/lib/treeUtils';
import { generateId } from '@/shared/lib/utils';
import { toolRouter } from '@drama/stores/toolRouter';
import type { ChatAction } from '@shared/types';
import type { TreeNode } from '@drama/types';

export function ChatPanel() {
  const sendMessage = useChatStore((s) => s.sendMessage);
  const messages = useChatStore((s) => s.messages);
  const streamingMessage = useChatStore((s) => s.streamingMessage);
  const toolCalls = useChatStore((s) => s.toolCalls);
  const isLoading = useChatStore((s) => s.isLoading);
  const filterNodeId = useChatStore((s) => s.filterNodeId);
  const setFilterNodeId = useChatStore((s) => s.setFilterNodeId);

  const activeTab = useDetailStore((s) => s.activeTab);
  const setActiveTab = useDetailStore((s) => s.setActiveTab);
  const selectedNodeId = useProjectStore((s) => s.selectedNodeId);
  const tree = useProjectStore((s) => s.getCurrentTree());
  const addTreeNode = useProjectStore((s) => s.addTreeNode);

  // Phase 2: connect to Pandaria for real-time AI collaboration
  usePandariaSSE();

  const filteredMessages = filterNodeId
    ? messages.filter((m) => m.context?.nodeId === filterNodeId || m.role === 'agent')
    : messages;

  const handleActionClick = useCallback(
    (action: ChatAction) => {
      const node = selectedNodeId && tree ? findNode(tree, selectedNodeId) : null;

      switch (action.type) {
        case 'generate_storyboard': {
          if (!selectedNodeId) {
            sendMessage('请帮我为当前场景生成分镜图');
            return;
          }
          void toolRouter.generate_storyboard({
            action: 'generate_storyboard',
            nodeId: selectedNodeId,
          });
          break;
        }
        case 'insert_scene': {
          const parentId =
            node?.type === 'act' ? selectedNodeId : findParent(tree, selectedNodeId ?? '')?.id;
          if (parentId) {
            addTreeNode(parentId, {
              id: generateId('tree_scene_'),
              type: 'scene',
              title: action.label || '新场景',
              status: 'draft',
            });
          }
          break;
        }
        case 'modify_script': {
          if (selectedNodeId) {
            setActiveTab('details');
          }
          break;
        }
        case 'custom': {
          if (action.payload?.followUp) {
            sendMessage(action.payload.followUp as string);
          } else {
            sendMessage(action.label);
          }
          break;
        }
      }
    },
    [selectedNodeId, tree, sendMessage, addTreeNode, setActiveTab]
  );

  const showDetailsTab = !!selectedNodeId;
  const tabs = showDetailsTab
    ? [
        { id: 'chat', label: '对话' },
        { id: 'details', label: '详情' },
      ]
    : [{ id: 'chat', label: '对话' }];

  return (
    <div className="flex h-full flex-col bg-[var(--color-bg-primary)]">
      <TabBar
        tabs={tabs}
        activeTab={activeTab}
        onChange={(id) => setActiveTab(id as 'chat' | 'details')}
      />
      <div className="flex-1 overflow-hidden">
        <TabPanel
          isActive={activeTab === 'chat' || !showDetailsTab}
          className="flex flex-col overflow-hidden"
        >
          <ContextBar onClick={() => selectedNodeId && setFilterNodeId(selectedNodeId)} />
          <QuickActions onAction={(label) => sendMessage(label)} />
          <CopilotChat
            messages={filteredMessages}
            streamingText={streamingMessage}
            toolCalls={toolCalls}
            isLoading={isLoading}
            onSend={sendMessage}
            onActionClick={handleActionClick}
            placeholder="输入创作想法…"
          />
        </TabPanel>
        <TabPanel isActive={activeTab === 'details' && showDetailsTab}>
          <DetailPanel />
        </TabPanel>
      </div>
    </div>
  );
}
```

关键变化：
- 不再直接 `import MessageList / MessageInput / MessageItem`，改为 `import CopilotChat`
- `filteredMessages` 在 ChatPanel 层计算，传入 CopilotChat
- ChatAction 类型从 `@shared/types` 导入
- 保留 `usePandariaSSE()` 挂载
- 保留 ContextBar、QuickActions、TabBar、DetailPanel 逻辑

- [ ] **Step 2: 验证全项目编译**

```bash
npx tsc --noEmit 2>&1 | grep -v "node_modules" | head -30
```

预期：无新增类型错误。

- [ ] **Step 3: Commit**

```bash
git add src/apps/drama/components/chat-panel/ChatPanel.tsx
git commit -m "refactor: ChatPanel as assembly layer using CopilotChat"
```

---

### Task 8: 删除旧文件

**Files:**
- Delete: `src/apps/drama/components/chat-panel/MessageList.tsx`
- Delete: `src/apps/drama/components/chat-panel/MessageItem.tsx`
- Delete: `src/apps/drama/components/chat-panel/MessageInput.tsx`

- [ ] **Step 1: 确认没有其他文件引用这些旧路径**

```bash
grep -r "chat-panel/MessageList\|chat-panel/MessageItem\|chat-panel/MessageInput" src/ --include="*.ts" --include="*.tsx"
```

预期：无输出（这些文件不再被任何地方 import）。

- [ ] **Step 2: 删除旧文件**

```bash
rm src/apps/drama/components/chat-panel/MessageList.tsx
rm src/apps/drama/components/chat-panel/MessageItem.tsx
rm src/apps/drama/components/chat-panel/MessageInput.tsx
```

- [ ] **Step 3: 再次确认编译**

```bash
npx tsc --noEmit 2>&1 | grep "error TS" | head -10
```

预期：无新增错误。

- [ ] **Step 4: Commit**

```bash
git add -u src/apps/drama/components/chat-panel/
git commit -m "refactor: remove old chat-panel MessageList/MessageItem/MessageInput replaced by CopilotChat"
```

---

### Task 9: 最终验证

- [ ] **Step 1: 全项目类型检查**

```bash
npx tsc --noEmit 2>&1 | grep "error TS" | wc -l
```

确认错误数量与重构前一致（不引入新错误）。

- [ ] **Step 2: 运行 Vite dev server 冒烟**

```bash
npm run dev &
sleep 3
curl -s http://localhost:5173 | head -20
kill %1
```

预期：页面正常返回 HTML，无 500 错误。

- [ ] **Step 3: 检查未跟踪文件**

```bash
git status
```

确认只有 copilot/ 目录为新增，chat-panel/ 下只删除了 MessageList/MessageItem/MessageInput 三个文件（ChatPanel/ContextBar/QuickActions 保留不动）。

- [ ] **Step 4: Commit final verification**

```bash
git commit --allow-empty -m "verify: CopilotChat refactor complete — typecheck & dev server smoke test pass"
```
