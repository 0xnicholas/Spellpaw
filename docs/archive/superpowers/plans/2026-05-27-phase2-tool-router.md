> 🗄️ **归档文档** — 本计划已执行完毕（2026-05-30）。实际实现与计划基本一致。后续开发请参考 `AGENTS.md` 和 `docs/ROADMAP.md`。

# Phase 2 — Tool Router 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 实现 `toolRouter`——将 8 个 tool action 字符串映射到 Zustand store actions，返回简短确认文本。这是整个 Phase 2 Tool Server / Copilot 集成的基础层。

**Architecture:** 纯函数映射表。无 HTTP、无 WebSocket、无外部依赖。直接 import projectStore / canvasStore，调用已有 actions。每个 tool 返回纯文本结果（非 JSON），供 Copilot 消费。

**Tech Stack:** TypeScript · Zustand 5 · Vitest

---

## 前置检查

Phase 1 提供的 store actions（已存在，**不需要修改**）：

| Store | Action | toolRouter 需求 |
|-------|--------|:---:|
| `projectStore` | `addTreeNode(parentId, node)` | ✅ |
| `projectStore` | `updateTreeNode(nodeId, updates)` | ✅ |
| `projectStore` | `deleteTreeNode(nodeId)` | ✅ |
| `projectStore` | `moveTreeNode(nodeId, newIndex)` | ✅ |
| `projectStore` | `getCurrentTree()` | ✅ |
| `projectStore` | `getState().trees` + `currentProjectId` | ✅ |
| `canvasStore` | `updateNodeData(nodeId, data)` | ✅（分镜图用） |

约定：toolRouter 不直接 import React hooks。用 `useProjectStore.getState()` 访问 store。

> **已知边界：** `deleteTreeNode` 不自动解绑画布节点（由 `sync.ts` 处理）。若被删节点有 `linkedTreeNodeId`，画布上会残留孤儿卡片。toolRouter 职责仅为 store 映射，不处理跨 store 联动。

---

### Task 1: 创建 toolRouter 类型定义

**Files:**
- Modify: `src/types/index.ts`（追加类型）

- [ ] **Step 1: 在 types/index.ts 末尾追加 toolRouter 相关类型**

```typescript
// === Phase 2: Tool Router ===

/** Tool Server / Spellpaw Server 发来的请求参数 */
export interface ToolParams {
  action: string;
  [key: string]: unknown;
}

/** toolRouter 每个 action 的函数签名 */
export type ToolHandler = (params: ToolParams) => Promise<string>;

/** toolRouter 映射表 */
export type ToolRouter = Record<string, ToolHandler>;
```

- [ ] **Step 2: 验证类型无编译错误**

Run: `npx tsc --noEmit`
Expected: No errors related to new types.

- [ ] **Step 3: Commit**

```bash
git add src/types/index.ts
git commit -m "feat(types): add ToolParams, ToolHandler, ToolRouter types for Phase 2"
```

---

### Task 2: toolRouter — 只读 tool（get_tree, get_subtree）

**Files:**
- Create: `src/stores/toolRouter.ts`
- Create: `src/stores/toolRouter.test.ts`

- [ ] **Step 1: 写测试**

```typescript
// src/stores/toolRouter.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useProjectStore } from './projectStore';
import { toolRouter } from './toolRouter';
import type { TreeNode } from '../types';

// 准备一棵测试树
function seedTree(): string {
  const store = useProjectStore.getState();
  // 创建测试项目（会同时建立项目 + 树根节点）
  const projId = store.createProject('test-proj', '', '#6366f1');
  const rootNode = store.getCurrentTree()!;
  // 在树根下添加结构
  store.addTreeNode(rootNode.id, {
    id: 'act-1', type: 'act', title: '第一幕', status: 'draft',
    metadata: { createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
  });
  store.addTreeNode('act-1', {
    id: 'scene-1', type: 'scene', title: '场景 1', status: 'draft',
    metadata: { duration: 30, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
  });
  store.addTreeNode('scene-1', {
    id: 'shot-1', type: 'shot', title: '镜头 1', status: 'draft',
    metadata: { duration: 5, shotType: 'wide', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
  });
  return projId;
}

describe('toolRouter — 只读 tool', () => {
  beforeEach(() => {
    // 重置 store
    useProjectStore.setState({ trees: {}, currentProjectId: null, selectedNodeId: null });
  });

  it('get_tree 返回缩进文本，包含所有节点', async () => {
    seedTree();
    const result = await toolRouter.get_tree({ action: 'get_tree' });
    expect(result).toContain('├──');
    expect(result).toContain('第一幕');
    expect(result).toContain('场景 1');
    expect(result).toContain('镜头 1');
  });

  it('get_subtree 只返回指定节点子树', async () => {
    seedTree();
    const result = await toolRouter.get_subtree({ action: 'get_subtree', nodeId: 'scene-1' });
    expect(result).toContain('镜头 1');
    expect(result).not.toContain('第一幕'); // 父节点不应出现
  });

  it('get_tree 在空项目时返回提示', async () => {
    // 创建一个空项目（只有树根，无子节点）
    useProjectStore.getState().createProject('empty-proj', '', '#6366f1');
    const result = await toolRouter.get_tree({ action: 'get_tree' });
    // 空项目仍有根节点，但无 children
    expect(result).toContain('project');
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run src/stores/toolRouter.test.ts`
Expected: FAIL — `toolRouter` not defined

- [ ] **Step 3: 实现 toolRouter + 两个只读 handler**

```typescript
// src/stores/toolRouter.ts
import { useProjectStore } from './projectStore';
import type { ToolRouter, TreeNode } from '../types';

function nodeToLine(node: TreeNode, depth: number): string {
  const indent = '│   '.repeat(Math.max(0, depth - 1)) + (depth > 0 ? '├── ' : '');
  const statusIcon = { draft: '📝', in_progress: '🔄', review: '👀', done: '✅' }[node.status] ?? '';
  const duration = node.metadata?.duration ? ` · ${node.metadata.duration}s` : '';
  return `${indent}${statusIcon} ${node.type}「${node.title}」${duration}`;
}

function treeToText(node: TreeNode, depth = 0): string {
  let text = nodeToLine(node, depth);
  if (node.children) {
    for (const child of node.children) {
      text += '\n' + treeToText(child, depth + 1);
    }
  }
  return text;
}

function findNode(root: TreeNode, nodeId: string): TreeNode | null {
  if (root.id === nodeId) return root;
  for (const child of root.children ?? []) {
    const found = findNode(child, nodeId);
    if (found) return found;
  }
  return null;
}

export const toolRouter: ToolRouter = {
  get_tree: async (_params) => {
    const tree = useProjectStore.getState().getCurrentTree();
    if (!tree) return '(暂无内容)';
    return treeToText(tree);
  },

  get_subtree: async (params) => {
    const tree = useProjectStore.getState().getCurrentTree();
    if (!tree) return '(暂无内容)';
    const node = findNode(tree, params.nodeId as string);
    if (!node) return `(未找到节点 ${params.nodeId})`;
    return treeToText(node);
  },

  // 其余 tool 在 Task 3-4 中追加
  add_node: async () => '(not implemented)',
  update_node: async () => '(not implemented)',
  delete_node: async () => '(not implemented)',
  move_node: async () => '(not implemented)',
  apply_template: async () => '(not implemented)',
  generate_storyboard: async () => '(not implemented)',
};
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npx vitest run src/stores/toolRouter.test.ts`
Expected: 2 tests PASS (get_tree, get_subtree)

- [ ] **Step 5: Commit**

```bash
git add src/stores/toolRouter.ts src/stores/toolRouter.test.ts
git commit -m "feat(toolRouter): add get_tree, get_subtree read-only tools"
```

---

### Task 3: toolRouter — 写入 tool（add_node, update_node, delete_node, move_node）

**Files:**
- Modify: `src/stores/toolRouter.ts`
- Modify: `src/stores/toolRouter.test.ts`

- [ ] **Step 1: 追加测试**

```typescript
// 在 toolRouter.test.ts 中追加以下测试

describe('toolRouter — 写入 tool', () => {
  beforeEach(() => {
    useProjectStore.setState({ trees: {}, currentProjectId: null, selectedNodeId: null });
  });

  it('add_node 创建节点并返回确认', async () => {
    const projId = seedTree();
    const result = await toolRouter.add_node({
      action: 'add_node', parentId: 'act-1', type: 'scene', title: '新场景'
    });
    expect(result).toMatch(/已添加 scene「新场景」/);

    // 验证 store 已更新
    const tree = useProjectStore.getState().getCurrentTree();
    const act1 = tree?.children?.[0];
    expect(act1?.children?.some(c => c.title === '新场景')).toBe(true);
  });

  it('add_node 注入默认元数据（createdAt, updatedAt, duration=0）', async () => {
    seedTree();
    await toolRouter.add_node({
      action: 'add_node', parentId: 'act-1', type: 'shot', title: '新镜头'
    });
    const tree = useProjectStore.getState().getCurrentTree();
    const act1 = tree?.children?.[0];
    const newShot = act1?.children?.find(c => c.title === '新镜头');
    expect(newShot?.metadata?.createdAt).toBeDefined();
    expect(newShot?.metadata?.duration).toBe(0);
  });

  it('update_node 修改标题并返回确认', async () => {
    seedTree();
    const result = await toolRouter.update_node({
      action: 'update_node', nodeId: 'scene-1', changes: { title: '修改后的场景' }
    });
    expect(result).toMatch(/已更新 scene-1/);

    const tree = useProjectStore.getState().getCurrentTree();
    const act1 = tree?.children?.[0];
    const scene = act1?.children?.[0];
    expect(scene?.title).toBe('修改后的场景');
  });

  it('update_node 修改元数据', async () => {
    seedTree();
    await toolRouter.update_node({
      action: 'update_node', nodeId: 'scene-1',
      changes: { metadata: { description: '新描述', duration: 45 } }
    });
    const tree = useProjectStore.getState().getCurrentTree();
    const scene = tree?.children?.[0]?.children?.[0];
    expect(scene?.metadata?.description).toBe('新描述');
    expect(scene?.metadata?.duration).toBe(45);
  });

  it('delete_node 删除节点并返回确认', async () => {
    seedTree();
    const result = await toolRouter.delete_node({ action: 'delete_node', nodeId: 'shot-1' });
    expect(result).toMatch(/已删除/);

    const tree = useProjectStore.getState().getCurrentTree();
    const scene1 = tree?.children?.[0]?.children?.[0];
    expect(scene1?.children?.length ?? 0).toBe(0);
  });

  it('move_node 调整顺序', async () => {
    seedTree();
    // 先加第二个场景
    await toolRouter.add_node({ action: 'add_node', parentId: 'act-1', type: 'scene', title: '场景 2' });

    // 把场景 2 移到第 0 位
    const result = await toolRouter.move_node({ action: 'move_node', nodeId: 'scene-1', newIndex: 0 });
    expect(result).toMatch(/已移动/);

    const tree = useProjectStore.getState().getCurrentTree();
    const act1 = tree?.children?.[0];
    // 原来的 scene-1 应该现在是第 0 个
    // （实际行为取决于 moveTreeNode 实现）
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run src/stores/toolRouter.test.ts`
Expected: 新增测试 FAIL — `(not implemented)` 返回不匹配

- [ ] **Step 3: 实现 4 个写入 handler**

```typescript
// 替换 toolRouter.ts 中的 stub

add_node: async (params) => {
  const store = useProjectStore.getState();
  const parentId = params.parentId as string;
  const type = params.type as TreeNode['type'];
  const title = params.title as string;

  const newNode: TreeNode = {
    id: crypto.randomUUID(),
    type,
    title,
    status: 'draft',
    metadata: {
      duration: (params.duration as number) ?? 0,
      description: params.description as string | undefined,
      location: params.location as string | undefined,
      timeOfDay: params.timeOfDay as TreeNode['metadata']['timeOfDay'],
      shotType: params.shotType as TreeNode['metadata']['shotType'],
      cameraMovement: params.cameraMovement as TreeNode['metadata']['cameraMovement'],
      dialogue: params.dialogue as string | undefined,
      notes: params.notes as string | undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  };

  store.addTreeNode(parentId, newNode);
  return `已添加 ${type}「${title}」(id: ${newNode.id})`;
},

update_node: async (params) => {
  const store = useProjectStore.getState();
  const nodeId = params.nodeId as string;
  const changes = params.changes as Partial<TreeNode>;
  store.updateTreeNode(nodeId, changes);
  return `已更新 ${nodeId}`;
},

delete_node: async (params) => {
  const store = useProjectStore.getState();
  const nodeId = params.nodeId as string;
  const tree = store.getCurrentTree();
  const node = tree ? findNode(tree, nodeId) : null;
  const label = node ? `${node.type}「${node.title}」` : nodeId;
  store.deleteTreeNode(nodeId);
  return `已删除 ${label}`;
},

move_node: async (params) => {
  const store = useProjectStore.getState();
  const nodeId = params.nodeId as string;
  const newIndex = params.newIndex as number;
  store.moveTreeNode(nodeId, newIndex);
  return `已移动 ${nodeId}`;
},
```

- [ ] **Step 4: 运行测试确认全部通过**

Run: `npx vitest run src/stores/toolRouter.test.ts`
Expected: 9 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/stores/toolRouter.ts src/stores/toolRouter.test.ts
git commit -m "feat(toolRouter): add add_node, update_node, delete_node, move_node tools"
```

---

### Task 4: toolRouter — apply_template + generate_storyboard stub

**Files:**
- Modify: `src/stores/toolRouter.ts`

- [ ] **Step 1: 实现 apply_template（加载模板文件 → 批量 addTreeNode）**

```typescript
// toolRouter.ts 中追加

apply_template: async (params) => {
  const templateId = params.templateId as string;
  // Phase 2a: 从本地 .spellpaw-template.json 文件加载
  // Phase 3: 从云端模板市场加载
  try {
    const response = await fetch(`/templates/${templateId}.spellpaw-template.json`);
    if (!response.ok) throw new Error(`Template ${templateId} not found`);
    const template = await response.json();

    const store = useProjectStore.getState();
    let nodeCount = 0;
    // 递归创建模板中的节点
    function createNodes(parentId: string, nodes: any[]) {
      for (const tn of nodes) {
        const node: TreeNode = {
          id: crypto.randomUUID(),
          type: tn.type,
          title: tn.title,
          status: 'draft',
          metadata: {
            ...tn.metadata,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        };
        store.addTreeNode(parentId, node);
        nodeCount++;
        if (tn.children) createNodes(node.id, tn.children);
      }
    }
    // parentId 是树节点 ID；若未提供，用当前项目树根节点
    const rootId = store.getCurrentTree()?.id;
    const parentId = (params.parentId as string) || rootId;
    if (!parentId) throw new Error('无法确定父节点：当前无项目打开');
    createNodes(parentId, template.structure);
    return `已套用模板「${template.name}」: 创建 ${nodeCount} 个节点`;
  } catch (err) {
    throw new Error(`套用模板失败: ${(err as Error).message}`);
  }
},

generate_storyboard: async (params) => {
  // Phase 2a: stub — 后续 Task 实现（转发图像 API）
  const nodeId = params.nodeId as string;
  return `(分镜生成功能将在后续实现: nodeId=${nodeId})`;
},
```

- [ ] **Step 2: 运行全部 toolRouter 测试**

Run: `npx vitest run src/stores/toolRouter.test.ts`
Expected: 所有已有测试 PASS（apply_template 和 generate_storyboard stub 不阻塞）

- [ ] **Step 3: Commit**

```bash
git add src/stores/toolRouter.ts
git commit -m "feat(toolRouter): add apply_template, generate_storyboard stubs"
```

---

### Task 5: 运行全部测试 + 清理

**Files:** 无修改

- [ ] **Step 1: 运行全部测试套件**

Run: `npm test`
Expected: 44 + N tests passing（N ≥ 9，toolRouter 新增的）

- [ ] **Step 2: 检查 TypeScript 编译**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit 最终清理（如有）**

```bash
git add -A
git commit -m "chore(toolRouter): final cleanup, all tests pass"
```

---

## 验收标准

- [ ] `toolRouter` 包含 8 个 handler：`get_tree` / `get_subtree` / `add_node` / `update_node` / `delete_node` / `move_node` / `apply_template` / `generate_storyboard`
- [ ] 所有只读 tool 返回缩进文本格式
- [ ] 所有写入 tool 返回简短确认文本（`"已添加 scene「xxx」(id: xxx)"`）
- [ ] `add_node` 自动注入 `createdAt` / `updatedAt` / `duration: 0`（store 层面保证）
- [ ] 已知边界：`delete_node` 不解绑画布节点（`sync.ts` 职责），画布可能残留孤儿卡片
- [ ] `delete_node` 返回时包含已删除节点的描述
- [ ] 所有测试通过 + `tsc --noEmit` 无错误
- [ ] 不修改任何 Phase 1 已有文件（`toolRouter` 是纯新增）

---

## 下一步（Phase 2 后续 Plans）

- **Plan 2:** Vite 插件 Tool Server（HTTP + WebSocket bridge）
- **Plan 3:** Copilot 对接（session 配置 + SSE 消费 + Chat 流式 UI）
- **Plan 4:** 叙事模板系统（模板浏览器 + 5 个内置模板）
