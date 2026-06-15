# 画布卡片编号系统 — 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 Spellpaw 树节点和画布卡片建立统一编号系统 —— 不可变 `internalId` + 可重算 `displayNumber`

**Architecture:** 纯函数 `computeDisplayNumbers(tree, canvasNodes)` 从树结构推导所有对象编号，在 `FlowCanvasPanel` 中通过 `useMemo` 计算后注入 `node.data._displayNumber`，卡片组件从 `data._displayNumber` 读取展示。Store / 类型 / 同步全部零改动。

**Tech Stack:** TypeScript · React 19 · Zustand 5 · @xyflow/react · Vitest

---

### Task 1: 升级 `generateId()` 函数

**Files:**
- Modify: `src/shared/lib/utils.ts`
- Test: `src/shared/lib/utils.test.ts`

- [ ] **Step 1: 添加 failing test for upgraded generateId**

在 `utils.test.ts` 末尾添加：

```typescript
describe('generateId with length param', () => {
  it('generates id with custom prefix and default length', () => {
    const id = generateId('nd_');
    expect(id).toMatch(/^nd_[a-z0-9]+_[a-z0-9]{5}$/);
  });

  it('generates id with custom prefix and custom random length', () => {
    const id = generateId('cv_', 10);
    expect(id).toMatch(/^cv_[a-z0-9]+_[a-z0-9]{10}$/);
  });

  it('generates unique ids', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId('test_', 8)));
    expect(ids.size).toBe(100);
  });

  it('preserves backward compatibility - no length param', () => {
    const id = generateId('old_');
    // Default 5-char random segment (existing behavior)
    expect(id).toMatch(/^old_[a-z0-9]+_[a-z0-9]{5}$/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/nicholasl/Documents/build-whatever/Spellpaw && npx vitest run src/shared/lib/utils.test.ts -t "length"
```

Expected: FAIL — `generateId` only accepts one param.

- [ ] **Step 3: Implement upgraded generateId**

Replace `src/shared/lib/utils.ts:22-24`:

```typescript
export function generateId(prefix: string = '', randomLength: number = 5): string {
  // Sortable timestamp prefix preserved for debugging-friendly ordering
  const timestamp = Date.now().toString(36);
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let random = '';
  for (let i = 0; i < randomLength; i++) {
    random += chars[Math.floor(Math.random() * chars.length)];
  }
  return `${prefix}${timestamp}_${random}`;
}
```

注意保留旧行为：`randomLength` 有默认值 5，现有所有 `generateId('canvas_')` 等调用完全不变。

- [ ] **Step 4: Run test to verify it passes**

```bash
cd /Users/nicholasl/Documents/build-whatever/Spellpaw && npx vitest run src/shared/lib/utils.test.ts -t "length"
```

Expected: 4 tests PASS.

- [ ] **Step 5: Run full test suite to check no regressions**

```bash
cd /Users/nicholasl/Documents/build-whatever/Spellpaw && npm test -- --run
```

Expected: all existing 116 tests still pass.

- [ ] **Step 6: Commit**

```bash
git add src/shared/lib/utils.ts src/shared/lib/utils.test.ts
git commit -m "feat: upgrade generateId with optional randomLength param"
```

---

### Task 2: 实现 `computeDisplayNumbers()` 纯函数

**Files:**
- Create: `src/apps/drama/lib/numbering.ts`
- Create: `src/apps/drama/lib/numbering.test.ts`

- [ ] **Step 1: 编写完整测试**

创建 `src/apps/drama/lib/numbering.test.ts`：

```typescript
import { describe, it, expect } from 'vitest';
import { computeDisplayNumbers } from './numbering';
import type { TreeNode, CanvasNode } from '@drama/types';

const sampleTree: TreeNode = {
  id: 'nd_root',
  type: 'project',
  title: 'Test Project',
  status: 'draft',
  expanded: true,
  metadata: { createdAt: '', updatedAt: '' },
  children: [
    {
      id: 'nd_act1',
      type: 'act',
      title: 'Act 1',
      status: 'draft',
      metadata: { createdAt: '', updatedAt: '' },
      children: [
        {
          id: 'nd_scene1',
          type: 'scene',
          title: 'Scene 1',
          status: 'draft',
          metadata: { createdAt: '', updatedAt: '' },
          children: [
            { id: 'nd_shot1', type: 'shot', title: 'Shot 1', status: 'draft', metadata: { createdAt: '', updatedAt: '' } },
            { id: 'nd_shot2', type: 'shot', title: 'Shot 2', status: 'draft', metadata: { createdAt: '', updatedAt: '' } },
          ],
        },
        {
          id: 'nd_scene2',
          type: 'scene',
          title: 'Scene 2',
          status: 'draft',
          metadata: { createdAt: '', updatedAt: '' },
        },
      ],
    },
    {
      id: 'nd_act2',
      type: 'act',
      title: 'Act 2',
      status: 'draft',
      metadata: { createdAt: '', updatedAt: '' },
      children: [
        {
          id: 'nd_scene3',
          type: 'scene',
          title: 'Scene 3',
          status: 'draft',
          metadata: { createdAt: '', updatedAt: '' },
        },
      ],
    },
  ],
};

describe('computeDisplayNumbers - tree nodes', () => {
  it('skips project root', () => {
    const map = computeDisplayNumbers(sampleTree, []);
    expect(map.get('nd_root')).toBeUndefined();
  });

  it('numbers acts sequentially from 1', () => {
    const map = computeDisplayNumbers(sampleTree, []);
    expect(map.get('nd_act1')).toBe('1');
    expect(map.get('nd_act2')).toBe('2');
  });

  it('numbers scenes with act prefix', () => {
    const map = computeDisplayNumbers(sampleTree, []);
    expect(map.get('nd_scene1')).toBe('1-1');
    expect(map.get('nd_scene2')).toBe('1-2');
    expect(map.get('nd_scene3')).toBe('2-1');
  });

  it('numbers shots with full path', () => {
    const map = computeDisplayNumbers(sampleTree, []);
    expect(map.get('nd_shot1')).toBe('1-1-1');
    expect(map.get('nd_shot2')).toBe('1-1-2');
  });
});

describe('computeDisplayNumbers - canvas cards (mounted)', () => {
  it('numbers mounted script cards', () => {
    const cards: CanvasNode[] = [
      { id: 'cv_s1', type: 'script', position: { x: 0, y: 0 }, data: { title: 'Script 1', linkedTreeNodeId: 'nd_scene1' } },
      { id: 'cv_s2', type: 'script', position: { x: 0, y: 0 }, data: { title: 'Script 2', linkedTreeNodeId: 'nd_scene1' } },
    ];
    const map = computeDisplayNumbers(sampleTree, cards);
    expect(map.get('cv_s1')).toBe('1-1-S1');
    expect(map.get('cv_s2')).toBe('1-1-S2');
  });

  it('numbers mounted art cards', () => {
    const cards: CanvasNode[] = [
      { id: 'cv_a1', type: 'art', position: { x: 0, y: 0 }, data: { title: 'Art 1', linkedTreeNodeId: 'nd_scene1' } },
    ];
    const map = computeDisplayNumbers(sampleTree, cards);
    expect(map.get('cv_a1')).toBe('1-1-A1');
  });

  it('numbers mounted character cards', () => {
    const cards: CanvasNode[] = [
      { id: 'cv_c1', type: 'character', position: { x: 0, y: 0 }, data: { title: 'Char 1', linkedTreeNodeId: 'nd_scene2' } },
    ];
    const map = computeDisplayNumbers(sampleTree, cards);
    expect(map.get('cv_c1')).toBe('1-2-C1');
  });

  it('numbers deliverable cards by subtype', () => {
    const cards: CanvasNode[] = [
      { id: 'cv_d1', type: 'deliverable', position: { x: 0, y: 0 }, data: { title: 'Img 1', linkedTreeNodeId: 'nd_scene1', deliverableType: 'image' } },
      { id: 'cv_d2', type: 'deliverable', position: { x: 0, y: 0 }, data: { title: 'Vid 1', linkedTreeNodeId: 'nd_scene1', deliverableType: 'video' } },
      { id: 'cv_d3', type: 'deliverable', position: { x: 0, y: 0 }, data: { title: 'Aud 1', linkedTreeNodeId: 'nd_scene1', deliverableType: 'audio' } },
    ];
    const map = computeDisplayNumbers(sampleTree, cards);
    expect(map.get('cv_d1')).toBe('1-1-D-img1');
    expect(map.get('cv_d2')).toBe('1-1-D-vid1');
    expect(map.get('cv_d3')).toBe('1-1-D-aud1');
  });

  it('counts separately per tree node + type group', () => {
    const cards: CanvasNode[] = [
      { id: 'cv_s1', type: 'script', position: { x: 0, y: 0 }, data: { title: 'S1', linkedTreeNodeId: 'nd_scene1' } },
      { id: 'cv_s2', type: 'script', position: { x: 0, y: 0 }, data: { title: 'S2', linkedTreeNodeId: 'nd_scene2' } },
    ];
    const map = computeDisplayNumbers(sampleTree, cards);
    expect(map.get('cv_s1')).toBe('1-1-S1');
    expect(map.get('cv_s2')).toBe('1-2-S1');
  });
});

describe('computeDisplayNumbers - canvas cards (free)', () => {
  it('numbers cards without linkedTreeNodeId as free', () => {
    const cards: CanvasNode[] = [
      { id: 'cv_s1', type: 'script', position: { x: 0, y: 0 }, data: { title: 'Free Script' } },
    ];
    const map = computeDisplayNumbers(sampleTree, cards);
    expect(map.get('cv_s1')).toBe('Free-S1');
  });

  it('numbers cards with dangling linkedTreeNodeId as free', () => {
    const cards: CanvasNode[] = [
      { id: 'cv_s1', type: 'script', position: { x: 0, y: 0 }, data: { title: 'Ghost', linkedTreeNodeId: 'nonexistent' } },
    ];
    const map = computeDisplayNumbers(sampleTree, cards);
    expect(map.get('cv_s1')).toBe('Free-S1');
  });

  it('counts free cards per type globally', () => {
    const cards: CanvasNode[] = [
      { id: 'cv_s1', type: 'script', position: { x: 0, y: 0 }, data: { title: 'S1' } },
      { id: 'cv_s2', type: 'script', position: { x: 0, y: 0 }, data: { title: 'S2' } },
      { id: 'cv_a1', type: 'art', position: { x: 0, y: 0 }, data: { title: 'A1' } },
    ];
    const map = computeDisplayNumbers(sampleTree, cards);
    expect(map.get('cv_s1')).toBe('Free-S1');
    expect(map.get('cv_s2')).toBe('Free-S2');
    expect(map.get('cv_a1')).toBe('Free-A1');
  });
});

describe('computeDisplayNumbers - edge cases', () => {
  it('returns empty map for null tree', () => {
    const map = computeDisplayNumbers(null, []);
    expect(map.size).toBe(0);
  });

  it('handles empty canvas nodes', () => {
    const map = computeDisplayNumbers(sampleTree, []);
    // Should still have tree node entries
    expect(map.get('nd_act1')).toBe('1');
    expect(map.get('nd_scene1')).toBe('1-1');
  });

  it('ignores unknown canvas node types', () => {
    const cards: CanvasNode[] = [
      { id: 'cv_x1', type: 'script' as any, position: { x: 0, y: 0 }, data: { title: 'Unknown', linkedTreeNodeId: 'nd_scene1' } },
    ];
    const map = computeDisplayNumbers(sampleTree, cards);
    // Unknown types: type tag is '', counter is separate
    expect(map.get('cv_x1')).toBeDefined();
  });

  it('sorting is determined by canvas array index', () => {
    // Same parent + same type: array index determines S1 vs S2
    const cards: CanvasNode[] = [
      { id: 'cv_first', type: 'script', position: { x: 0, y: 0 }, data: { title: 'First', linkedTreeNodeId: 'nd_scene1' } },
      { id: 'cv_second', type: 'script', position: { x: 0, y: 0 }, data: { title: 'Second', linkedTreeNodeId: 'nd_scene1' } },
    ];
    const map = computeDisplayNumbers(sampleTree, cards);
    expect(map.get('cv_first')).toBe('1-1-S1');
    expect(map.get('cv_second')).toBe('1-1-S2');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd /Users/nicholasl/Documents/build-whatever/Spellpaw && npx vitest run src/apps/drama/lib/numbering.test.ts
```

Expected: all FAIL — module not found.

- [ ] **Step 3: Implement computeDisplayNumbers**

创建 `src/apps/drama/lib/numbering.ts`：

```typescript
import type { TreeNode, CanvasNode } from '@drama/types';

/**
 * Derive display numbers for all objects from the tree structure.
 * Pure function — same input always produces same output.
 * Tree nodes must have unique IDs. Canvas nodes must have unique IDs.
 *
 * Format:
 *   Tree nodes: "1", "1-1", "1-1-2" (depth-first, root skipped)
 *   Mounted cards: "{treeNum}-{typeCode}{n}" e.g. "1-1-S1"
 *   Free cards: "Free-{typeCode}{n}" e.g. "Free-S1"
 */
export function computeDisplayNumbers(
  tree: TreeNode | null,
  canvasNodes: CanvasNode[]
): Map<string, string> {
  const map = new Map<string, string>();

  if (!tree) return map;

  // —— Phase 1: Walk tree (skip root) ——
  function walk(node: TreeNode, path: number[]) {
    if (node.type !== 'project') {
      map.set(node.id, path.join('-'));
    }
    if (node.children) {
      node.children.forEach((child, index) => {
        walk(child, [...path, index + 1]);
      });
    }
  }
  walk(tree, []);

  // —— Phase 2: Canvas cards ——
  // Counter key: linkedTreeNodeId is used when valid; otherwise a global "free" key
  // For deliverable, the counter key also includes deliverableType
  const mountedCounters = new Map<string, number>();
  const freeCounters = new Map<string, number>();

  function getTypeCode(node: CanvasNode): string {
    const type = node.type;
    if (type === 'script') return 'S';
    if (type === 'art') return 'A';
    if (type === 'character') return 'C';
    if (type === 'deliverable') {
      const dt = (node.data.deliverableType as string) ?? 'image';
      return `D-${dt.slice(0, 3)}`;  // img / vid / aud
    }
    return '';  // unknown — will get empty type code
  }

  for (const node of canvasNodes) {
    const linkedId = node.data.linkedTreeNodeId as string | undefined;
    const treeNumber = linkedId ? map.get(linkedId) : undefined;
    const typeCode = getTypeCode(node);

    if (treeNumber) {
      // Mounted card — counter scoped to (linkedTreeNodeId + typeCode)
      const counterKey = `${linkedId}::${typeCode}`;
      const count = (mountedCounters.get(counterKey) ?? 0) + 1;
      mountedCounters.set(counterKey, count);
      map.set(node.id, `${treeNumber}-${typeCode}${count}`);
    } else {
      // Free card — counter scoped to typeCode globally
      const count = (freeCounters.get(typeCode) ?? 0) + 1;
      freeCounters.set(typeCode, count);
      map.set(node.id, `Free-${typeCode}${count}`);
    }
  }

  return map;
}

/** Convenience: get display number for a single ID from a pre-computed map. */
export function getDisplayNumber(
  map: Map<string, string>,
  internalId: string,
): string {
  return map.get(internalId) ?? '';
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd /Users/nicholasl/Documents/build-whatever/Spellpaw && npx vitest run src/apps/drama/lib/numbering.test.ts
```

Expected: all 16 tests PASS.

- [ ] **Step 5: Run full test suite**

```bash
cd /Users/nicholasl/Documents/build-whatever/Spellpaw && npm test -- --run
```

Expected: ~136 tests (116 existing + 4 new from Task 1 + 16 new from Task 2) all pass.

- [ ] **Step 6: Commit**

```bash
git add src/apps/drama/lib/numbering.ts src/apps/drama/lib/numbering.test.ts
git commit -m "feat: add computeDisplayNumbers pure function for card numbering"
```

---

### Task 3: 在卡片 header bar 中展示编号

**Files:**
- Modify: `src/apps/drama/components/flow-canvas/nodes/ScriptCardNode.tsx`
- Modify: `src/apps/drama/components/flow-canvas/nodes/ArtCardNode.tsx`
- Modify: `src/apps/drama/components/flow-canvas/nodes/CharacterCardNode.tsx`
- Modify: `src/apps/drama/components/flow-canvas/nodes/DeliverableCardNode.tsx`

- [ ] **Step 1: Add displayNumber to ScriptCardNode header**

在 `ScriptCardNode.tsx` 中，从 `data._displayNumber` 取值，在 header bar 的 `<span>` 前插入：

```typescript
const displayNumber = (data._displayNumber as string) ?? '';
```

然后将 header div 改为：

```tsx
<div className="rounded-t-[var(--radius-base)] bg-[var(--color-bg-secondary)] px-3 py-1.5 border-b-2 border-[var(--color-accent-300)] flex items-center gap-1.5">
  {displayNumber && (
    <span className="text-[9px] font-mono text-[var(--color-text-tertiary)] tracking-[0.02em] shrink-0">{displayNumber}</span>
  )}
  <span className="text-[10px] font-semibold text-[var(--color-accent-600)] uppercase tracking-wider">📝 剧本</span>
</div>
```

关键：`flex items-center gap-1.5` + 条件渲染 `displayNumber &&` —— 没有编号时（旧数据）不显示空标签。

- [ ] **Step 2: Add displayNumber to ArtCardNode header**

同模式。ArtCardNode header：

```typescript
const displayNumber = (data._displayNumber as string) ?? '';
```

header：

```tsx
<div className="rounded-t-[var(--radius-base)] bg-[var(--color-status-warning-bg)] px-3 py-1.5 border-b border-[var(--color-border-default)] flex items-center gap-1.5">
  {displayNumber && (
    <span className="text-[9px] font-mono text-[var(--color-text-tertiary)] tracking-[0.02em] shrink-0">{displayNumber}</span>
  )}
  <span className="text-[10px] font-semibold text-[var(--color-status-warning-text)] uppercase tracking-wider">🎨 美术</span>
</div>
```

- [ ] **Step 3: Add displayNumber to CharacterCardNode header**

同模式。CharacterCardNode header：

```typescript
const displayNumber = (data._displayNumber as string) ?? '';
```

header：

```tsx
<div className="rounded-t-[var(--radius-base)] bg-[var(--color-status-success-bg)] px-3 py-1.5 border-b border-[var(--color-border-default)] flex items-center gap-1.5">
  {displayNumber && (
    <span className="text-[9px] font-mono text-[var(--color-text-tertiary)] tracking-[0.02em] shrink-0">{displayNumber}</span>
  )}
  <span className="text-[10px] font-semibold text-[var(--color-status-success-text)] uppercase tracking-wider">👤 人物角色</span>
</div>
```

- [ ] **Step 4: Add displayNumber to DeliverableCardNode header**

DeliverableCardNode 的 header 是动态的（根据 deliverableType 变化）。在 icon 前添加编号：

```typescript
const displayNumber = (data._displayNumber as string) ?? '';
```

header：

```tsx
<div
  className="rounded-t-[var(--radius-base)] px-3 py-1.5 border-b border-[var(--color-border-default)] flex items-center gap-1.5"
  style={{ backgroundColor: config.headerBg }}
>
  {displayNumber && (
    <span className="text-[9px] font-mono text-[var(--color-text-tertiary)] tracking-[0.02em] shrink-0">{displayNumber}</span>
  )}
  <Icon className="h-3 w-3" style={{ color: config.headerText }} />
  <span
    className="text-[10px] font-semibold uppercase tracking-wider"
    style={{ color: config.headerText }}
  >
    📦 产出物 · {config.label}
  </span>
</div>
```

- [ ] **Step 5: 验证 TypeScript 编译通过**

```bash
cd /Users/nicholasl/Documents/build-whatever/Spellpaw && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/apps/drama/components/flow-canvas/nodes/ScriptCardNode.tsx src/apps/drama/components/flow-canvas/nodes/ArtCardNode.tsx src/apps/drama/components/flow-canvas/nodes/CharacterCardNode.tsx src/apps/drama/components/flow-canvas/nodes/DeliverableCardNode.tsx
git commit -m "feat: display card number in header bar of all 4 card types"
```

---

### Task 4: 在 FlowCanvasPanel 中计算并注入 displayNumber

**Files:**
- Modify: `src/apps/drama/components/flow-canvas/FlowCanvasPanel.tsx`

- [ ] **Step 1: 集成 computeDisplayNumbers 到 FlowCanvasPanel**

`FlowCanvasPanel.tsx` 需要从 `projectStore` 订阅当前 tree，然后计算 `displayNumbers`，注入到传给 ReactFlow 的 nodes。

具体修改（完整变更在下面 Step 2 中以 edit 形式呈现）：

1. imports 新增：`useMemo`（已存在）、`computeDisplayNumbers` from `@drama/lib/numbering`、`useProjectStore`
2. 组件内新增：
```typescript
const currentTree = useProjectStore(s => s.getCurrentTree());
const currentNodesRaw = useCanvasStore(s => s.getCurrentNodes());

const nodesWithDisplay = useMemo(() => {
  const map = computeDisplayNumbers(currentTree, currentNodesRaw);
  return (nodes as Node[]).map(n => ({
    ...n,
    data: { ...n.data, _displayNumber: map.get(n.id) ?? '' },
  }));
}, [nodes, currentTree, currentNodesRaw]);
```
3. ReactFlow 的 `nodes` prop 从 `nodes` 改为 `nodesWithDisplay`

- [ ] **Step 2: 精确 edit 操作**

阅读当前 `FlowCanvasPanel.tsx` 确定 exact oldText 和 newText 后，使用以下变更：

**import 部分添加：**
```
import { useMemo } from 'react';  // add to existing React import if not already there
import { computeDisplayNumbers } from '@drama/lib/numbering';
import { useProjectStore } from '@drama/stores/projectStore';
```

**组件体内，在 `const persistedEdges = ...` 之后添加：**
```
const currentTree = useProjectStore(s => s.getCurrentTree());
const currentNodesRaw = getCurrentNodes();

const nodesWithDisplay = useMemo(() => {
  const map = computeDisplayNumbers(currentTree, currentNodesRaw);
  return nodes.map(n => ({
    ...n,
    data: { ...n.data, _displayNumber: map.get(n.id) ?? '' },
  }));
}, [nodes, currentTree, currentNodesRaw]);
```

**ReactFlow 的 `nodes` prop 改为 `nodesWithDisplay`：**
```
// 旧：nodes={nodes}
// 新：nodes={nodesWithDisplay}
```

- [ ] **Step 3: 验证编译**

```bash
cd /Users/nicholasl/Documents/build-whatever/Spellpaw && npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Run full test suite**

```bash
cd /Users/nicholasl/Documents/build-whatever/Spellpaw && npm test -- --run
```

Expected: all tests pass.

- [ ] **Step 5: 启动 dev server 手动验证**

```bash
npm run dev
```

打开 `http://localhost:5173/`，进入画布：
- 旧的 mock 卡片（无 `linkedTreeNodeId`）应显示 `Free-S1`、`Free-A1` 等编号
- 编号在卡片 header bar 左侧，等宽灰字
- 没有 `_displayNumber` 的卡片（理论上不会有）不显示编号

- [ ] **Step 6: Commit**

```bash
git add src/apps/drama/components/flow-canvas/FlowCanvasPanel.tsx
git commit -m "feat: compute and inject display numbers into canvas node data"
```

---

### 验证清单

全部 Task 完成后，运行：

```bash
npm test -- --run          # 全部测试通过
npx tsc --noEmit           # 零类型错误
npm run dev                # 浏览器验证卡片编号显示
```
