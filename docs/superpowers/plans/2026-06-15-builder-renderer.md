# Builder Renderer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 建立 LLM 驱动 UI 构建的独立通道，从 toolRouter 抽 handler 共享函数 → Zod 校验管道 → WebSocket 接收 → 角色关系图组件全链路跑通。

**Architecture:** toolRouter 和 Builder Renderer 共享 handler 纯函数。Builder Renderer 通过 WebSocket 接收 `spellpaw_build_ui` 调用，经 6 层校验后渲染预览，用户分步确认后写入 store。

**Tech Stack:** React 19, TypeScript, Zod, Zustand, @xyflow/react

---

### Task 1: 从 toolRouter 抽取共享 handler 纯函数

**Files:**
- Create: `src/apps/drama/lib/builderHandlers.ts`
- Modify: `src/apps/drama/stores/toolRouter.ts`

- [ ] **Step 1: 创建 builderHandlers.ts**

```typescript
// src/apps/drama/lib/builderHandlers.ts
import { useProjectStore } from '@drama/stores/projectStore';
import type { TreeNode, CanvasNode, CanvasNodeType } from '@drama/types';

export function createNodeHandler(
  parentId: string,
  type: TreeNode['type'],
  title: string,
  metadata?: Record<string, unknown>,
): TreeNode {
  const node: TreeNode = {
    id: crypto.randomUUID(),
    type,
    title,
    status: 'draft',
    metadata: {
      ...metadata,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  };
  useProjectStore.getState().addTreeNode(parentId, node);
  return node;
}

export function updateNodeHandler(nodeId: string, changes: Partial<TreeNode>): void {
  useProjectStore.getState().updateTreeNode(nodeId, changes);
}

export function deleteNodeHandler(nodeId: string): string {
  const store = useProjectStore.getState();
  const tree = store.getCurrentTree();
  const node = findNode(tree, nodeId);
  const label = node ? `${node.type}「${node.title}」` : nodeId;
  store.deleteTreeNode(nodeId);
  return label;
}

export function addCanvasCardHandler(
  cardType: CanvasNodeType,
  data: Record<string, unknown>,
): CanvasNode {
  const { useCanvasStore } = require('./canvasStore');
  const { generateId } = require('@/shared/lib/utils');
  const card: CanvasNode = {
    id: generateId('canvas_'),
    type: cardType,
    position: {
      x: Math.random() * 200 + 200,
      y: Math.random() * 200 + 200,
    },
    data: { title: (data.title as string) ?? '未命名', ...data },
  };
  useCanvasStore.getState().addNode(card);
  return card;
}

// Internal: 从树中查找节点（复用 toolRouter 的逻辑）
import { findNode } from './treeUtils';
```

- [ ] **Step 2: 改造 toolRouter.ts — handler 改调 builderHandlers**

将 `add_node`、`update_node`、`delete_node`、`add_canvas_card` 的 handler 内部逻辑替换为对 builderHandlers 的调用。保留返回格式不变。

- [ ] **Step 3: Commit**

```bash
git add src/apps/drama/lib/builderHandlers.ts src/apps/drama/stores/toolRouter.ts
git commit -m "refactor: extract shared handler functions from toolRouter to builderHandlers"
```

---

### Task 2: Zod 校验 + 组件注册表

**Files:**
- Create: `src/shared/lib/builderSchema.ts`
- Create: `src/shared/components/builder/registry.ts`

- [ ] **Step 1: builderSchema.ts — Zod schemas**

```typescript
// src/shared/lib/builderSchema.ts
import { z } from 'zod';

export const BuilderConfigSchema = z.object({
  version: z.literal(1),
  target: z.enum(['canvas', 'detail_panel', 'tree_placeholder']),
  component: z.enum(['character_map']),
  data: z.record(z.unknown()),
  editableFields: z.array(z.string()).optional(),
});

export type BuilderConfig = z.infer<typeof BuilderConfigSchema>;

export interface ValidationResult {
  valid: boolean;
  layer: number; // ① ②
  error?: string;
  suggestion?: string;
}
```

- [ ] **Step 2: registry.ts — 组件映射表**

```typescript
// src/shared/components/builder/registry.ts
import type { ComponentType } from 'react';
import type { BuilderConfig } from '@shared/lib/builderSchema';

export interface BuilderComponentProps {
  config: BuilderConfig;
  onConfirm: (data: Record<string, unknown>) => void;
  onChange?: (data: Record<string, unknown>) => void;
}

const COMPONENT_REGISTRY: Record<string, ComponentType<BuilderComponentProps>> = {
  // populated in Task 4
};

export function getBuilderComponent(name: string) {
  return COMPONENT_REGISTRY[name] ?? null;
}

export function registerBuilderComponent(name: string, component: ComponentType<BuilderComponentProps>) {
  COMPONENT_REGISTRY[name] = component;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/shared/lib/builderSchema.ts src/shared/components/builder/registry.ts
git commit -m "feat: add Builder Renderer Zod schemas and component registry"
```

---

### Task 3: builderStore — Builder 运行时状态

**Files:**
- Create: `src/apps/drama/stores/builderStore.ts`

- [ ] **Step 1: 创建 builderStore.ts**

```typescript
import { create } from 'zustand';
import { produce } from 'immer';
import type { BuilderConfig } from '@shared/lib/builderSchema';

type BuilderStatus = 'idle' | 'validating' | 'previewing' | 'confirmed' | 'error';

interface BuilderState {
  config: BuilderConfig | null;
  status: BuilderStatus;
  currentStep: number;
  totalSteps: number;
  edits: Record<string, unknown>;  // 用户修改后的数据
  error: string | null;

  setConfig: (config: BuilderConfig) => void;
  setStatus: (status: BuilderStatus) => void;
  setSteps: (current: number, total: number) => void;
  updateEdits: (data: Record<string, unknown>) => void;
  confirmStep: () => void;
  reset: () => void;
}

export const useBuilderStore = create<BuilderState>((set, get) => ({
  config: null,
  status: 'idle',
  currentStep: 0,
  totalSteps: 0,
  edits: {},
  error: null,

  setConfig: (config) =>
    set({ config, status: 'validating', currentStep: 0, edits: {}, error: null }),

  setStatus: (status) => set({ status }),

  setSteps: (current, total) => set({ currentStep: current, totalSteps: total }),

  updateEdits: (data) =>
    set(produce((s: BuilderState) => {
      Object.assign(s.edits, data);
    })),

  confirmStep: () => {
    const { currentStep, totalSteps } = get();
    if (currentStep + 1 >= totalSteps) {
      set({ status: 'confirmed' });
    } else {
      set({ currentStep: currentStep + 1 });
    }
  },

  reset: () =>
    set({ config: null, status: 'idle', currentStep: 0, totalSteps: 0, edits: {}, error: null }),
}));
```

- [ ] **Step 2: Commit**

```bash
git add src/apps/drama/stores/builderStore.ts
git commit -m "feat: add builderStore for Builder runtime state"
```

---

### Task 4: useBuilderBridge — WebSocket 监听

**Files:**
- Create: `src/apps/drama/hooks/useBuilderBridge.ts`

- [ ] **Step 1: 创建 useBuilderBridge.ts**

扩展 useToolBridge 的 WebSocket 消息处理，增加 `spellpaw_build_ui` action 的路由：

```typescript
// 在现有 useToolBridge 的 ws.onmessage handler 中增加：
if (action === 'spellpaw_build_ui') {
  const config = params as unknown as BuilderConfig;
  // ① Schema 校验
  const parsed = BuilderConfigSchema.safeParse(config);
  if (!parsed.success) {
    ws.send(JSON.stringify({
      callId,
      content: [{ type: 'text', text: '无法理解，请重新描述' }],
      is_error: true,
    }));
    return;
  }
  // 注入 builderStore
  useBuilderStore.getState().setConfig(parsed.data);
  ws.send(JSON.stringify({
    callId,
    content: [{ type: 'text', text: '正在渲染…' }],
    is_error: false,
  }));
  return;
}
```

- [ ] **Step 2: 注册 tool config 到 usePandariaSSE 和 useTaskSSE**

在 TOOL_CONFIGS 数组中增加：
```typescript
{
  name: 'spellpaw_build_ui',
  description: 'Build interactive UI components. Use when user asks for visual elements like character maps, dashboards, storyboard grids.',
  parameters: {
    type: 'object',
    properties: {
      component: { type: 'string', enum: ['character_map'] },
      data: { type: 'object' },
    },
    required: ['component', 'data'],
  },
  endpoint: TOOL_ENDPOINT,
}
```

- [ ] **Step 3: Commit**

```bash
git add src/apps/drama/hooks/useBuilderBridge.ts src/apps/drama/hooks/usePandariaSSE.ts src/apps/drama/hooks/useTaskSSE.ts
git commit -m "feat: add useBuilderBridge WebSocket listener + spellpaw_build_ui tool config"
```

---

### Task 5: BuilderPanel + CharacterMapBuilder — 全链路跑通

**Files:**
- Create: `src/shared/components/builder/BuilderPanel.tsx`
- Create: `src/shared/components/builder/BuilderErrorBoundary.tsx`
- Create: `src/shared/components/builder/hooks/useBuilderConfirm.ts`
- Create: `src/shared/components/builder/components/CharacterMapBuilder.tsx`
- Modify: `src/shared/components/builder/registry.ts` — 注册 CharacterMapBuilder
- Modify: `src/apps/drama/pages/WorkspacePage.tsx` — 挂载 BuilderPanel

- [ ] **Step 1: useBuilderConfirm hook**

- [ ] **Step 2: CharacterMapBuilder 组件（节点 + 边渲染）**

- [ ] **Step 3: BuilderPanel 组装层**

- [ ] **Step 4: BuilderErrorBoundary**

- [ ] **Step 5: WorkspacePage 挂载 useBuilderBridge + BuilderPanel**

- [ ] **Step 6: Commit**

```bash
git add src/shared/components/builder/ src/apps/drama/pages/WorkspacePage.tsx
git commit -m "feat: add BuilderPanel with CharacterMapBuilder — first Builder Renderer component"
```

---

### Task 6: 最终验证

- [ ] **Step 1: 类型检查**

```bash
npx tsc --noEmit 2>&1 | grep "error TS" | head -20
```

- [ ] **Step 2: 确认 builderHandlers 与 toolRouter 测试无回归**

- [ ] **Step 3: Commit**

```bash
git commit --allow-empty -m "verify: Builder Renderer phase 1 complete — typecheck passes, component registry operational"
```
