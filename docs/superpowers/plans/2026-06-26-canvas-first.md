# Canvas-First Architecture 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 彻底删除幽灵树（数据 + tool + UI），重写所有 tree-coupling 模块为画布机制，扩展 LLM 画布能力（7 add tool + 3 batch + 结构化返回 + 校验）

**Architecture:** 分两个阶段——A（Day 1-13）删除 tree + 重写 4 大 feature，B（Day 14-20）LLM 画布能力扩展。两个阶段串行，A 完成画布是唯一数据源后 B 才能生效。

**Tech Stack:** TypeScript 6.0 + React 19 + Zustand 5 + Immer + Vitest + React Testing Library

**Spec:** `docs/superpowers/specs/2026-06-26-canvas-first-design.md`

---

## 文件结构映射

### 删除（6 个文件）
```
src/apps/drama/stores/toolRouter/tree.ts            ✗ 7 tree tool handler
src/apps/drama/lib/treeUtils.ts                     ✗ findNode + tree walk
src/apps/drama/lib/treeDiff.ts                      ✗ tree diff 算法
src/apps/drama/lib/migrateTreeToCards.ts            ✗ tree → canvas 迁移
src/apps/drama/lib/builderHandlers.ts               ✗ dead code (tree.ts 的依赖)
src/apps/drama/data/mockTreeData.ts                 ✗ dead test fixture
```

### 新建（5 个文件）
```
src/apps/drama/lib/toolResultFormat.ts              + JSON 序列化/解析
src/apps/drama/lib/cardValidation.ts                + cardId 校验
src/apps/drama/lib/applyTemplateToCanvas.ts         + 模板 → 画布卡
src/apps/drama/lib/diffCanvases.ts                  + 画布 diff
src/shared/stores/styleLockStore.ts                 + 风格锁 store
```

### 重写（30 个文件）—— 见各 Day 任务详情

---

## 阶段 A：删除幽灵树 + 重写 tree-coupling 模块

### Task A1: 新增 CardMetadata 类型（Day 1a）

**Files:**
- Modify: `src/apps/drama/types/index.ts:1-30`

- [ ] **Step 1: 新增 CardMetadata 接口**

在 `TreeNode` 定义前插入（后续删除 TreeNode 时移除）：

```typescript
// src/apps/drama/types/index.ts
/** Canvas card metadata — replaces the now-deprecated Partial<TreeNode['metadata']> */
export interface CardMetadata {
  type?: 'act' | 'scene' | 'shot';
  duration?: number;
  location?: string;
  timeOfDay?: string;
  shotType?: string;
  cameraMovement?: string;
  dialogue?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}
```

- [ ] **Step 2: 更新 TemplateScene.metadata 类型**

```typescript
// types/index.ts line ~221
export interface TemplateScene {
  // ...
  metadata?: CardMetadata;  // was: Partial<TreeNode['metadata']>
}
```

- [ ] **Step 3: 更新 CanvasNodeData.metadata 类型**

```typescript
// types/index.ts line ~220
export interface CanvasNodeData {
  // ...
  metadata?: CardMetadata;  // was: Partial<TreeNode['metadata']>
}
```

- [ ] **Step 4: 验证编译**

Run: `npx tsc --noEmit src/apps/drama/types/index.ts --skipLibCheck 2>&1 | head -20`
Expected: 无新增类型错误（现有错误忽略）

- [ ] **Step 5: Commit**

```bash
git add src/apps/drama/types/index.ts
git commit -m "feat(types): add CardMetadata interface replacing Partial<TreeNode['metadata']>"
```

---

### Task A2: 删除 TreeNode + linkedTreeNodeId + projectStore tree 状态（Day 1b）

**Files:**
- Modify: `src/apps/drama/types/index.ts`
- Modify: `src/apps/drama/stores/projectStore.ts`

- [ ] **Step 1: 删除 TreeNode 类型定义**

在 `types/index.ts` 中删除：
- `export interface TreeNode { ... }`（整个 block）
- `export interface TreeNodeMetadata { ... }`（整个 block）
- `CanvasNodeData.linkedTreeNodeId?: string` 字段
- `CanvasNodeData.linkedStyleNodeId?: string` 字段（如果有）

**验证**：预期 TS 在 ~50 个引用点报错（正常——后续任务逐个修）

- [ ] **Step 2: 删除 projectStore 的 tree 状态 + 6 个 action**

在 `projectStore.ts` 中删除：

```typescript
// delete from ProjectState interface:
trees: Record<string, TreeNode>;       // ← 删除
selectedNodeId: string | null;         // ← 删除
getCurrentTree: () => TreeNode | null; // ← 删除
addTreeNode: (...) => void;            // ← 删除
updateTreeNode: (...) => void;         // ← 删除
deleteTreeNode: (...) => void;         // ← 删除
moveTreeNode: (...) => void;           // ← 删除
toggleExpanded: (...) => void;         // ← 删除
selectNode: (...) => void;             // ← 删除
getSelectedNodePath: () => string[];   // ← 删除

// delete from store initializer:
trees: {},                             // ← 删除
selectedNodeId: null,                  // ← 删除

// delete implementation functions:
findNodePath (整个函数)                 // ← 删除
// delete 6 action implementations     // ← 各删除
```

- [ ] **Step 3: 删除 setLockedStyle / clearLockedStyle / getLockedStyle**

删除 projectStore 中三个风格锁方法（后续 Task A10 用 styleLockStore 替代）：

```typescript
// 删除：
setLockedStyle: (prompt, nodeId) => { ... }
clearLockedStyle: () => { ... }
getLockedStyle: () => { ... }
```

- [ ] **Step 4: 更新 persist config (version 5 → 6, partialize, migrate)**

```typescript
version: 6,  // was 5

partialize: (state) => ({
  projects: state.projects,
  // 不再 partialize trees / selectedNodeId
}),

migrate: (persistedState, version) => {
  let state = persistedState as any;
  if (version < 2) { /* fillMeta 保留 */ }
  if (version < 3) { /* title translation 保留 */ }
  if (version < 5) { /* project dedup 保留 */ }
  if (version < 6) {
    delete state.trees;
    delete state.selectedNodeId;
    // lockedStyle 在 tree.metadata 里，随 trees 删除自然丢弃
  }
  return state;
},
```

- [ ] **Step 5: 删 bumpProjectUpdatedAt 中的 tree 引用（如果有）**

检查 `bumpProjectUpdatedAt` 是否引用 tree。

- [ ] **Step 6: 验证编译失败（预期大量 TS 错误）**

Run: `npx tsc --noEmit 2>&1 | grep "error TS" | head -20`
Expected: ~100+ errors（引用 TreeNode / getCurrentTree / trees / selectedNodeId 的文件还未修复）

- [ ] **Step 7: Commit**

```bash
git add src/apps/drama/types/index.ts src/apps/drama/stores/projectStore.ts
git commit -m "refactor(store): delete TreeNode, linkedTreeNodeId, projectStore trees + 6 tree actions + style lock methods

BREAKING: All tree-dependent modules will fail TS compilation until rewired."
```

---

### Task A3: 删除 toolRouter tree domain + treeUtils/treeDiff/migrateTreeToCards（Day 2）

**Files:**
- Delete: `src/apps/drama/stores/toolRouter/tree.ts`
- Delete: `src/apps/drama/lib/treeUtils.ts`
- Delete: `src/apps/drama/lib/treeDiff.ts`
- Delete: `src/apps/drama/lib/migrateTreeToCards.ts`
- Delete: `src/apps/drama/lib/builderHandlers.ts`
- Delete: `src/apps/drama/data/mockTreeData.ts`
- Modify: `src/apps/drama/stores/toolRouter/index.ts`

- [ ] **Step 1: 删除 6 个源文件**

```bash
rm src/apps/drama/stores/toolRouter/tree.ts
rm src/apps/drama/lib/treeUtils.ts
rm src/apps/drama/lib/treeDiff.ts
rm src/apps/drama/lib/migrateTreeToCards.ts
rm src/apps/drama/lib/builderHandlers.ts
rm src/apps/drama/data/mockTreeData.ts
```

- [ ] **Step 2: 删除测试文件**

```bash
rm src/apps/drama/lib/treeUtils.test.ts 2>/dev/null
rm src/apps/drama/lib/treeDiff.test.ts 2>/dev/null
rm src/apps/drama/lib/migrateTreeToCards.test.ts 2>/dev/null
```

- [ ] **Step 3: 从 toolRouter/index.ts 删除 treeHandlers 引用**

```typescript
// src/apps/drama/stores/toolRouter/index.ts
import { treeHandlers } from './tree';   // ← 删除这行

export const toolRouter: ToolRouter = {
  ...treeHandlers,                        // ← 删除这行
  ...cardHandlers,
  ...generationHandlers,
  ...analysisHandlers,
};
```

- [ ] **Step 4: 删除 toolConfigs.ts 中 6 个 tree tool config**

删除以下 tool config entries：
- `spellpaw_add_node`
- `spellpaw_update_node`
- `spellpaw_delete_node`
- `spellpaw_get_tree`
- `spellpaw_get_subtree`
- `spellpaw_apply_template`

- [ ] **Step 5: Commit**

```bash
git add -u src/apps/drama/
git commit -m "refactor(toolRouter): delete tree domain — 7 handler file, 3 lib files, 6 tool configs, 3 test files
- Delete toolRouter/tree.ts, treeUtils, treeDiff, migrateTreeToCards, builderHandlers, mockTreeData
- Delete 6 tree tool configs from toolConfigs.ts
- Remove treeHandlers from toolRouter/index.ts
BREAKING: ~100 TS errors remain in dependent modules"
```

---

### Task A4: 重写 applyTemplateCore → applyTemplateToCanvas（Day 3）

**Files:**
- Create: `src/apps/drama/lib/applyTemplateToCanvas.ts`
- Create: `src/apps/drama/lib/applyTemplateToCanvas.test.ts`
- Modify: `src/apps/drama/stores/toolRouter/analysis.ts`（引用替换）

- [ ] **Step 1: 写 applyTemplateToCanvas 测试**

```typescript
// src/apps/drama/lib/applyTemplateToCanvas.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { applyTemplateToCanvas } from './applyTemplateToCanvas';
import { useCustomTemplateStore } from '@drama/stores/customTemplateStore';
import { useCanvasStore } from '@drama/stores/canvasStore';
import { useProjectStore } from '@drama/stores/projectStore';

describe('applyTemplateToCanvas', () => {
  beforeEach(() => {
    useProjectStore.setState({ projects: [{ id: 'p1', title: '测试', description: '', coverColor: '#000', createdAt: '', updatedAt: '' }], currentProjectId: 'p1' });
    useCustomTemplateStore.setState({ customTemplates: [{ id: 't1', name: '动作短片', category: 'action', description: '', targetDuration: 60, targetPlatform: 'portrait', structure: { acts: [{ title: '第一幕', description: '', scenes: [{ title: '场景1', description: '', suggestedShotTypes: ['wide', 'close-up'], metadata: { duration: 10 } }] }] }, tags: [], version: '1' }] });
    useCanvasStore.setState({ canvases: { p1: { nodes: [], edges: [] } }, selectedCardId: null });
  });

  it('creates storyline cards for acts and sceneCard cards for scenes', async () => {
    const result = JSON.parse(await applyTemplateToCanvas('t1'));
    expect(result.success).toBe(true);
    const cards = useCanvasStore.getState().getCurrentNodes();
    expect(cards.length).toBe(2); // 1 act + 1 scene
    expect(cards[0].type).toBe('storyline');
    expect(cards[1].type).toBe('sceneCard');
    expect(result.affectedCardIds).toHaveLength(2);
  });

  it('returns error for unknown template', async () => {
    const result = JSON.parse(await applyTemplateToCanvas('unknown'));
    expect(result.success).toBe(false);
    expect(result.error).toBe('validation_failed');
  });

  it('creates CardChild shots from suggestedShotTypes', async () => {
    const result = JSON.parse(await applyTemplateToCanvas('t1'));
    const scene = useCanvasStore.getState().getCurrentNodes().find(c => c.type === 'sceneCard');
    expect(scene!.data.children).toHaveLength(2);
    expect(scene!.data.children![0].type).toBe('shot');
  });
});
```

- [ ] **Step 2: 运行测试，验证 FAIL**

Run: `npx vitest run src/apps/drama/lib/applyTemplateToCanvas.test.ts`
Expected: FAIL — 文件不存在

- [ ] **Step 3: 实现 applyTemplateToCanvas**

```typescript
// src/apps/drama/lib/applyTemplateToCanvas.ts
import { useCustomTemplateStore } from '@drama/stores/customTemplateStore';
import { useCanvasStore } from '@drama/stores/canvasStore';
import { useProjectStore } from '@drama/stores/projectStore';
import { addEnrichedCard } from '@drama/stores/toolRouter/cards';
import { generateId } from '@/shared/lib/utils';
import type { CanvasNode, CardChild, ToolResult } from '@drama/types';

export async function applyTemplateToCanvas(templateId: string): Promise<string> {
  const template = useCustomTemplateStore.getState().customTemplates.find(t => t.id === templateId);
  if (!template) {
    return JSON.stringify({
      success: false, error: 'validation_failed',
      suggestion: `unknown template: ${templateId}`,
      summary: `模板 ${templateId} 不存在`,
    } as ToolResult);
  }

  const affected: string[] = [];
  for (const [actIdx, act] of template.structure.acts.entries()) {
    const actCard = await addEnrichedCard('storyline', {
      title: act.title, description: act.description,
      status: 'draft', metadata: { type: 'act' },
    }, { x: 50 + actIdx * 420, y: 50 });
    affected.push(actCard.id);

    for (const [sceneIdx, scene] of act.scenes.entries()) {
      const shotChildren: CardChild[] = (scene.suggestedShotTypes ?? []).map((st, i) => ({
        id: generateId('shot_'), type: 'shot',
        title: `${scene.title} 镜头 ${i + 1}`,
        data: {
          shotType: st,
          duration: scene.metadata?.duration
            ? Math.round((scene.metadata.duration / scene.suggestedShotTypes!.length) * 10) / 10
            : undefined,
        },
      }));

      const sceneCard = await addEnrichedCard('sceneCard', {
        title: scene.title, description: scene.description,
        location: scene.metadata?.location, timeOfDay: scene.metadata?.timeOfDay,
        duration: scene.metadata?.duration,
        children: shotChildren,
        metadata: { type: 'scene', ...(scene.metadata ?? {}) },
      }, { x: 50 + actIdx * 420, y: 300 + sceneIdx * 280 });
      affected.push(sceneCard.id);

      if (scene.children?.length) {
        for (const sub of scene.children) {
          const subShots: CardChild[] = (sub.suggestedShotTypes ?? []).map((st, i) => ({
            id: generateId('shot_'), type: 'shot',
            title: `${sub.title} 镜头 ${i + 1}`,
            data: { shotType: st, duration: sub.metadata?.duration },
          }));
          sceneCard.data.children = [
            ...(sceneCard.data.children ?? []),
            { id: generateId('subscene_'), type: 'scene', title: sub.title, data: { description: sub.description, children: subShots } },
          ];
        }
      }
    }
  }

  return JSON.stringify({
    success: true, affectedCardIds: affected,
    summary: `已应用模板「${template.name}」：${template.structure.acts.length} 幕 ${affected.length - template.structure.acts.length} 场景`,
  } as ToolResult);
}
```

- [ ] **Step 4: 运行测试，验证 PASS**

Run: `npx vitest run src/apps/drama/lib/applyTemplateToCanvas.test.ts`
Expected: 3 tests PASS

- [ ] **Step 5: 更新 analysis.ts 引用 applyTemplateToCanvas（不是 applyTemplateCore）**

```typescript
// src/apps/drama/stores/toolRouter/analysis.ts
// replace: import { applyTemplateCore } from './tree';
// with:    import { applyTemplateToCanvas } from '@drama/lib/applyTemplateToCanvas';
```

- [ ] **Step 6: 更新 analysis.ts kickstart_project handler（spec §4.8）**

重写 kickstart_project 为直接调 applyTemplateToCanvas + 返回结构化 JSON。

- [ ] **Step 7: 更新 analysis.ts apply_template handler**

改调 applyTemplateToCanvas 而不是旧 applyTemplateCore。

- [ ] **Step 8: Commit**

```bash
git add src/apps/drama/lib/applyTemplateToCanvas.ts src/apps/drama/lib/applyTemplateToCanvas.test.ts src/apps/drama/stores/toolRouter/analysis.ts
git commit -m "feat(applyTemplate): rewrite applyTemplateCore → applyTemplateToCanvas (canvas-based)

- New file: applyTemplateToCanvas.ts — generates storyLine + sceneCard cards directly
- Handles nested TemplateScene.children as CardChild recursion
- Returns structured JSON ToolResult
- analysis.ts: kickstart_project + apply_template both rewired"
```

---

### Task A5: 新建 diffCanvases + 重写 SnapshotModal（Day 4）

**Files:**
- Create: `src/apps/drama/lib/diffCanvases.ts`
- Create: `src/apps/drama/lib/diffCanvases.test.ts`
- Modify: `src/apps/drama/components/modals/SnapshotModal.tsx`
- Modify: `src/apps/drama/lib/projectSnapshot.ts`

- [ ] **Step 1: 写 diffCanvases 测试**

```typescript
// src/apps/drama/lib/diffCanvases.test.ts
import { describe, it, expect } from 'vitest';
import { diffCanvases } from './diffCanvases';
import type { CanvasNode } from '@drama/types';

const makeCard = (id: string, title: string): CanvasNode => ({
  id, type: 'art', position: { x: 0, y: 0 },
  data: { title, description: '', status: 'draft', tags: [], colors: [] },
});

describe('diffCanvases', () => {
  it('detects added cards', () => {
    const diff = diffCanvases([], [makeCard('1', 'new')]);
    expect(diff.added).toHaveLength(1);
    expect(diff.removed).toHaveLength(0);
  });

  it('detects removed cards', () => {
    const diff = diffCanvases([makeCard('1', 'old')], []);
    expect(diff.removed).toHaveLength(1);
  });

  it('detects modified cards', () => {
    const base = [makeCard('1', 'old title')];
    const current = [{ ...base[0], data: { ...base[0].data, title: 'new title' } }];
    const diff = diffCanvases(base, current);
    expect(diff.modified).toHaveLength(1);
  });
});
```

- [ ] **Step 2: 实现 diffCanvases**

```typescript
// src/apps/drama/lib/diffCanvases.ts
import type { CanvasNode } from '@drama/types';

export interface CanvasDiff {
  added: CanvasNode[];
  removed: CanvasNode[];
  modified: Array<{ base: CanvasNode; current: CanvasNode; changes: string[] }>;
}

export function diffCanvases(base: CanvasNode[], current: CanvasNode[]): CanvasDiff {
  const baseMap = new Map(base.map(c => [c.id, c]));
  const currentMap = new Map(current.map(c => [c.id, c]));
  const added: CanvasNode[] = [];
  const removed: CanvasNode[] = [];
  const modified: CanvasDiff['modified'] = [];

  for (const c of current) {
    const b = baseMap.get(c.id);
    if (!b) { added.push(c); continue; }
    const changes: string[] = [];
    if (b.data.title !== c.data.title) changes.push('title');
    if (b.data.description !== c.data.description) changes.push('description');
    if (b.data.status !== c.data.status) changes.push('status');
    if (b.position.x !== c.position.x || b.position.y !== c.position.y) changes.push('position');
    if (changes.length > 0) modified.push({ base: b, current: c, changes });
  }
  for (const b of base) {
    if (!currentMap.has(b.id)) removed.push(b);
  }

  return { added, removed, modified };
}
```

- [ ] **Step 3: 更新 projectSnapshot.ts 序列化格式**

`SnapshotData` 改为：
```typescript
interface SnapshotData {
  projectId: string;
  cards: CanvasNode[];        // was: tree
  edges: Edge[];              // 新增：保留连线
  projectMeta: { title; description; coverColor };
  createdAt: string;
}
```

保存快照时从 `useCanvasStore` 读 cards + edges，从 `useProjectStore` 读 project meta。

- [ ] **Step 4: 更新 SnapshotModal.tsx**

```typescript
// 改前: diffTrees(compareBase.data.tree, snapshot.data.tree)
// 改后: diffCanvases(compareBase.data.cards, snapshot.data.cards)
// 回滚时: useCanvasStore.setState({ canvases: { [pid]: { nodes: snapshot.data.cards, edges: snapshot.data.edges } } })
```

- [ ] **Step 5: Commit**

```bash
git add src/apps/drama/lib/diffCanvases.ts src/apps/drama/lib/diffCanvases.test.ts src/apps/drama/lib/projectSnapshot.ts src/apps/drama/components/modals/SnapshotModal.tsx
git commit -m "feat(snapshot): diffCanvases replaces diffTrees; snapshot stores {cards, edges}"
```

---

### Task A6: 重写 projectAnalysis 基于画布（Day 5）

**Files:**
- Modify: `src/apps/drama/lib/projectAnalysis.ts`
- Modify: `src/apps/drama/lib/projectAnalysis.test.ts`

- [ ] **Step 1: 改写 generatePacingReport**

```typescript
export function generatePacingReport(): CanvasPacingReport {
  const nodes = useCanvasStore.getState().getCurrentNodes();
  const scenes = nodes.filter(n => n.type === 'sceneCard');
  const shots = scenes.flatMap(s => s.data.children ?? []);
  const totalDuration = scenes.reduce((sum, s) => sum + (Number(s.data.duration) || 0), 0);
  const avg = scenes.length > 0 ? totalDuration / scenes.length : 0;
  const cv = scenes.length > 0
    ? Math.sqrt(scenes.reduce((sum, s) => sum + Math.pow((Number(s.data.duration) || 0) - avg, 2), 0) / scenes.length) / (avg || 1)
    : 0;
  const issues: PacingIssue[] = [];
  if (cv > 0.5) issues.push({ type: 'uneven_pacing', severity: 'warning', message: `节奏不均匀，CV=${cv.toFixed(2)}` });
  if (scenes.length === 0) issues.push({ type: 'no_scenes', severity: 'warning', message: '项目没有场景卡片' });
  // ... 其余 analyzeStructure / matchTemplate / optimizePacing 同步改
  return { totalDuration, cardCount: nodes.length, sceneCount: scenes.length, shotCount: shots.length, avgSceneDuration: avg, pacingCV: cv, issues, suggestions: [] };
}
```

- [ ] **Step 2: 更新测试**

所有 test fixture 从 tree 改画布卡。example: `{ id: 's1', type: 'sceneCard', data: { title: '场景1', duration: 10, children: [...], ... }, position: { x: 0, y: 0 } }`

- [ ] **Step 3: Commit**

```bash
git add src/apps/drama/lib/projectAnalysis.ts src/apps/drama/lib/projectAnalysis.test.ts
git commit -m "refactor(analysis): rewrite projectAnalysis based on canvas cards"
```

---

### Task A7: 重写 proactiveInsights + numbering + intentRouter（Day 6-7）

**Files:**
- Modify: `src/apps/drama/lib/proactiveInsights.ts` + test
- Modify: `src/apps/drama/lib/numbering.ts` + test
- Modify: `src/apps/drama/lib/intentRouter.ts` + test
- Modify: `src/apps/drama/hooks/useCopilotSSE.ts`（line ~265 调用点）
- Modify: `src/apps/drama/stores/chatStore.ts`（pushProactiveInsights 调用）

- [ ] **Step 1: 重写 proactiveInsights**

`computeProactiveInsights` 改签名：`(canvas: CanvasNode[]) => ProactiveInsight[]`

按 spec §4.11 实现四种检测：empty / missing_acts / missing_scenes / missing_art / pacing_uneven

```typescript
export function computeProactiveInsights(canvas: CanvasNode[]): ProactiveInsight[] {
  if (canvas.length === 0) {
    return [{ type: 'empty', severity: 'info', message: '画布为空，可以应用模板或 kickstart 一个项目' }];
  }
  const insights: ProactiveInsight[] = [];
  const acts = canvas.filter(c => c.type === 'storyline' && c.data.metadata?.type === 'act');
  if (acts.length === 0) insights.push({ type: 'missing_acts', severity: 'warning', message: '项目没有幕结构' });
  // ...
  return insights;
}
```

- [ ] **Step 2: 更新 chatStore.pushProactiveInsights 调用**

```typescript
// chatStore.ts
// 改前: const tree = useProjectStore.getState().getCurrentTree();
//       computeProactiveInsights(tree, project.title, project.description);
// 改后: const canvas = useCanvasStore.getState().getCurrentNodes();
//       computeProactiveInsights(canvas);
```

- [ ] **Step 3: 重写 numbering.ts**

```typescript
export function computeDisplayNumbers(canvasNodes: CanvasNode[]): Map<string, string> {
  const acts = canvasNodes.filter(c => c.type === 'storyline' && c.data.metadata?.type === 'act').sort((a, b) => a.position.x - b.position.x);
  const sceneCards = canvasNodes.filter(c => c.type === 'sceneCard').sort((a, b) => b.position.y - a.position.y);
  const result = new Map<string, string>();
  acts.forEach((act, i) => {
    result.set(act.id, `${i + 1}`);
    // find scenes within act column
    // ...
  });
  return result;
}
```

- [ ] **Step 4: 简化 intentRouter**

```typescript
// intentRouter.ts — delete selectedNodeId from IntentContext
// useCopilotSSE.ts line ~265: remove selectedNodeId from detectIntent call
export function detectIntent(message: string, context: { selectedCard?: CanvasNode | null }): IntentResult {
  // 删所有 tree lookup 路径
}
```

- [ ] **Step 5: Commit**

```bash
git add src/apps/drama/lib/proactiveInsights.ts src/apps/drama/lib/numbering.ts src/apps/drama/lib/intentRouter.ts src/apps/drama/hooks/useCopilotSSE.ts src/apps/drama/stores/chatStore.ts
git add src/apps/drama/lib/proactiveInsights.test.ts src/apps/drama/lib/numbering.test.ts src/apps/drama/lib/intentRouter.test.ts
git commit -m "refactor(lib): rewrite proactiveInsights, numbering, intentRouter — all based on canvas"
```

---

### Task A8: 重写 exportPrint + exportPDF + exportImport（Day 8-9）

**Files:**
- Modify: `src/apps/drama/lib/exportPDF.ts`
- Modify: `src/apps/drama/lib/exportPrint.ts`
- Modify: `src/apps/drama/lib/exportImport.ts`
- Modify: `src/apps/drama/components/layouts/Navbar.tsx`（export 调用点）

- [ ] **Step 1: 重写 exportStoryboardPDF（exportPDF.ts + exportPrint.ts）**

```typescript
// exportPDF.ts: 接收 canvasNodes
export async function exportStoryboardPDF(project: Project, canvasNodes: CanvasNode[]): Promise<void> {
  const acts = canvasNodes.filter(c => c.type === 'storyline' && c.data.metadata?.type === 'act');
  const scenes = canvasNodes.filter(c => c.type === 'sceneCard');
  // render PDF pages sorted by position
}

// exportPrint.ts: 内部读 canvasStore
export async function exportStoryboardPDF(projectId: string): Promise<void> {
  const cards = useCanvasStore.getState().canvases[projectId]?.nodes ?? [];
  // render
}

// exportPrint.ts: exportDialogueScript 改读画布
export async function exportDialogueScript(projectId: string, format: 'pdf' | 'md' | 'txt'): Promise<void> {
  const cards = useCanvasStore.getState().canvases[projectId]?.nodes ?? [];
  // read dialogue from sceneCard.data.dialogue
}

// exportPrint.ts: buildScriptRows 改签名
export function buildScriptRows(canvasNodes: CanvasNode[]): ScriptRow[] {
  // expand sceneCard.children into rows
}
```

- [ ] **Step 2: 重写 exportImport**

```typescript
// exportImport.ts
export function exportProject(project: Project, canvasNodes: CanvasNode[]): string { ... }
export function importProject(data: string): { project: Project; canvasNodes: CanvasNode[] } { ... }
```

- [ ] **Step 3: 重写 templateExportImport**

```typescript
// templateExportImport.ts
// treeToTemplate(tree) → canvasToTemplate(canvasNodes): 从 storyline+sceneCard 逆推 template JSON
```

- [ ] **Step 4: 更新 Navbar.tsx 调用点**

```typescript
// Navbar.tsx
// 改前: exportStoryboardPDF(project, treeData)
// 改后: const cards = useCanvasStore.getState().getCurrentNodes();
//       exportStoryboardPDF(project, cards)
// 删 findNodePath / getCurrentTree / selectedNodeId 调用
```

- [ ] **Step 5: Commit**

```bash
git add src/apps/drama/lib/exportPDF.ts src/apps/drama/lib/exportPrint.ts src/apps/drama/lib/exportImport.ts src/apps/drama/lib/templateExportImport.ts src/apps/drama/components/layouts/Navbar.tsx
git commit -m "refactor(export): rewrite PDF/Print/Import — all accept canvasNodes instead of tree"
```

---

### Task A9: canvasToolkit actions 清理（Day 10）

**Files:**
- Modify: `src/apps/drama/lib/canvasToolkit/actions/generateAsset.ts`
- Modify: `src/apps/drama/lib/canvasToolkit/actions/generateVariants.ts`
- Modify: `src/apps/drama/lib/canvasToolkit/actions/editAsset.ts`
- Modify: `src/apps/drama/lib/canvasToolkit/actions/applyStyle.ts`
- Modify: `src/apps/drama/lib/canvasToolkit/actions/batchApplyStyle.ts`
- Modify: `src/apps/drama/lib/canvasToolkit/shared.ts`

- [ ] **Step 1: 新增 findCard helper to shared.ts**

```typescript
// src/apps/drama/lib/canvasToolkit/shared.ts
import { useCanvasStore } from '@drama/stores/canvasStore';
import type { CanvasNode } from '@drama/types';

export function findCard(cardId: string): CanvasNode | null {
  return useCanvasStore.getState().getCurrentNodes().find(c => c.id === cardId) ?? null;
}
```

- [ ] **Step 2: 逐个 action 重写**

| File | 改动 |
|---|---|
| `generateAsset.ts` | 参数 `nodeId` → `cardId`；`findNode(tree, nodeId)` → `findCard(cardId)`；删 `linkedTreeNodeId` 写入 |
| `generateVariants.ts` | 参数 `nodeId` → `cardId`；`findNode` → `findCard` |
| `editAsset.ts` | 删 `linkedTreeNodeId` 写入 |
| `applyStyle.ts` | 删 `import { findNode } from "@drama/lib/treeUtils"`；`findNode` → `findCard` |
| `batchApplyStyle.ts` | 参数 `nodeIds` → `cardIds` |

`buildDefaultPrompt` 改签名：`(card: CanvasNode) → string`，从 `card.data.title / description / location / timeOfDay / shotType` 拼装

- [ ] **Step 3: Commit**

```bash
git add src/apps/drama/lib/canvasToolkit/
git commit -m "refactor(canvasToolkit): remove tree dependency — nodeId→cardId, findNode→findCard"
```

---

### Task A10: 风格锁重写（styleLockStore）（Day 11）

**Files:**
- Create: `src/shared/stores/styleLockStore.ts`
- Create: `src/shared/stores/styleLockStore.test.ts`
- Modify: `src/shared/components/canvas/CardDetailDrawer.tsx`
- Modify: `src/shared/components/canvas/nodes/ArtCardNode.tsx`
- Modify: `src/shared/components/canvas/nodes/SceneCardNode.tsx`

- [ ] **Step 1: 新建 styleLockStore**

```typescript
// src/shared/stores/styleLockStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface StyleLockState {
  lockedCardId: string | null;
  lockedStylePrompt: string | null;
  lockStyle: (cardId: string, prompt: string) => void;
  clearLock: () => void;
}

export const useStyleLockStore = create<StyleLockState>()(
  persist(
    (set) => ({
      lockedCardId: null,
      lockedStylePrompt: null,
      lockStyle: (cardId, prompt) => set({ lockedCardId: cardId, lockedStylePrompt: prompt }),
      clearLock: () => set({ lockedCardId: null, lockedStylePrompt: null }),
    }),
    { name: 'spellpaw-style-lock', version: 1 }
  )
);
```

- [ ] **Step 2: 更新 ArtCardNode.tsx / SceneCardNode.tsx**

```typescript
// 改前: const { lockedStylePrompt, lockedStyleNodeId } = useProjectStore.getState().getLockedStyle();
// 改后: const { lockedCardId, lockedStylePrompt } = useStyleLockStore();
```

- [ ] **Step 3: 更新 CardDetailDrawer.tsx**

锁定按钮: `useStyleLockStore.getState().lockStyle(selectedCard.id, prompt)`
解锁按钮: `useStyleLockStore.getState().clearLock()`

- [ ] **Step 4: Commit**

```bash
git add src/shared/stores/styleLockStore.ts src/shared/stores/styleLockStore.test.ts src/shared/components/canvas/CardDetailDrawer.tsx src/shared/components/canvas/nodes/ArtCardNode.tsx src/shared/components/canvas/nodes/SceneCardNode.tsx
git commit -m "feat(style-lock): independent styleLockStore (global lock, one card at a time)"
```

---

### Task A11: 三个 skill 重写（Day 12）

**Files:**
- Modify: `src/apps/drama/skills/duplicate-project.ts`
- Modify: `src/apps/drama/skills/export-storyboard-pdf.ts`
- Modify: `src/apps/drama/skills/analyze-pacing.ts`
- Modify: `src/apps/drama/skills/chat.ts`（getProjectTree → getCurrentCanvasNodes）
- Modify: `src/apps/drama/skills/registry.ts`
- Modify: `src/apps/drama/skills/types.ts`

- [ ] **Step 1: 重写 duplicate-project skill**

```typescript
export async function duplicateProjectSkill(ctx: SkillContext): Promise<SkillResult> {
  const srcCards = useCanvasStore.getState().getCurrentNodes();
  if (srcCards.length === 0) return { success: false, message: '当前项目无内容可复制' };
  const newProjId = useProjectStore.getState().createProject(ctx.projectName + ' (副本)', '', '#000');
  useProjectStore.getState().setCurrentProject(newProjId);
  for (const card of srcCards) {
    await addEnrichedCard(card.type, card.data, card.position);
  }
  return { success: true, message: `已复制 ${srcCards.length} 张画布卡到新项目` };
}
```

- [ ] **Step 2: 重写 export-storyboard-pdf skill**

```typescript
export async function exportStoryboardPdfSkill(ctx: SkillContext): Promise<SkillResult> {
  const project = useProjectStore.getState().projects.find(p => p.id === ctx.projectId);
  const cards = useCanvasStore.getState().getCurrentNodes();
  await exportStoryboardPDF(project!, cards);
  return { success: true, message: '已导出 PDF' };
}
```

- [ ] **Step 3: 重写 analyze-pacing skill**

```typescript
export async function analyzePacingSkill(ctx: SkillContext): Promise<SkillResult> {
  const report = generatePacingReport();
  return { success: true, message: formatPacingReport(report) };
}
```

- [ ] **Step 4: 更新 skills 类型**

```typescript
// skills/types.ts: SkillContext
- getProjectTree: () => TreeNode | null;
+ getCurrentCanvasNodes: () => CanvasNode[];
```

`skills/chat.ts` 和 `skills/registry.ts` 中 `ctx.getProjectTree()` → `ctx.getCurrentCanvasNodes()`

- [ ] **Step 5: Commit**

```bash
git add src/apps/drama/skills/
git commit -m "refactor(skills): rewrite 3 tree-dependent skills — all based on canvas"
```

---

### Task A12: detailStore / ChatPanel / UI cleanup（Day 13）

**Files:**
- Modify: `src/apps/drama/stores/detailStore.ts`
- Modify: `src/shared/components/chat-panel/ChatPanel.tsx`
- Modify: `src/shared/components/chat-panel/toolDisplayName.ts`
- Modify: `src/apps/drama/pages/WorkspacePage.tsx`
- Modify: `src/apps/drama/components/detail-panel/ProjectSummary.tsx`
- Modify: `src/shared/components/canvas/CanvasPanel.tsx`
- Modify: `src/shared/lib/builderSchema.ts`

- [ ] **Step 1: detailStore 简化**

```typescript
// detailStore.ts: requestFocusCanvas(linkedTreeNodeId: string) → requestFocusCanvas(cardId: string)
// draftFormData: Partial<TreeNode> → draftFormData: Partial<CanvasNodeData>
```

- [ ] **Step 2: ChatPanel.highlightAffectedCards 简化**

```typescript
// ChatPanel.tsx: highlightAffectedCards(affectedTreeNodeIds) → highlightAffectedCards(cardIds: string[])
// 删 linkedTreeNodeId 反查逻辑
```

- [ ] **Step 3: toolDisplayName 清理**

删除 7 个 tree tool label；删除 `spellpaw_move_node` dead label

- [ ] **Step 4: WorkspacePage 清理**

```typescript
// WorkspacePage.tsx: 删除 DeleteConfirmDialog 块 / deleteTreeNode / selectNode 调用
```

- [ ] **Step 5: ProjectSummary 改 prop**

```typescript
// ProjectSummary.tsx: prop node: TreeNode → card: CanvasNode
```

- [ ] **Step 6: CanvasPanel 清理**

```typescript
// CanvasPanel.tsx:140 删除 useProjectStore((s) => s.getCurrentTree()) 调用
```

- [ ] **Step 7: builderSchema 清理**

删除 `linkedTreeNodeId` 校验

- [ ] **Step 8: 全量回归**

Run: `npm test`
Expected: 核心测试通过；tree 相关测试已删除；新模块测试可能还是 FAIL（Day A3 删除 tree 后大量测试未修）

- [ ] **Step 9: Commit**

```bash
git add src/apps/drama/stores/detailStore.ts src/shared/components/chat-panel/ChatPanel.tsx src/shared/components/chat-panel/toolDisplayName.ts src/apps/drama/pages/WorkspacePage.tsx
git add src/apps/drama/components/detail-panel/ProjectSummary.tsx src/shared/components/canvas/CanvasPanel.tsx src/shared/lib/builderSchema.ts
git commit -m "refactor(ui): cleanup all remaining tree references in stores, components, and libs"
```

---

### Task A13: 系统 prompt 重写 + 全量回归（Day 14）

**Files:**
- Modify: `src/apps/drama/lib/systemPrompt.ts`
- Modify: `src/apps/drama/lib/systemPrompt.test.ts`
- Modify: `src/apps/drama/hooks/useCopilotSSE.ts`（canvasText → canvasText 命名已一致，只加 JSON.parse）

- [ ] **Step 1: 重写 buildSystemPrompt**

```typescript
// systemPrompt.ts: second param rename treeText → canvasText
// 删除 "### 2. Tree nodes — for project structure" 段
// 工具签名参考段删除 7 个 tree tool
// 标题改为 "### 2. Canvas cards — for visual content"
// 添加 7 个 add_<type>_card + 3 个 batch_* 的签名参考（预留给 B 阶段）
```

- [ ] **Step 2: 更新 useCopilotSSE 调用点（已在 Task A7 做了）**

确认 `useCopilotSSE.ts:300` 已经是 `buildSystemPrompt(projectTitle, canvasText)` —— 是，不用改。

- [ ] **Step 3: 全量回归测试**

```bash
npm test
```

目的：A 阶段核心代码全部可编译可测试。tree 相关测试已删除，canvas 相关测试已补。

- [ ] **Step 4: Commit**

```bash
git add src/apps/drama/lib/systemPrompt.ts src/apps/drama/lib/systemPrompt.test.ts
git commit -m "refactor(prompt): rewrite systemPrompt — pure canvas, no tree tools, all 7 add_<type> + 3 batch"
```

---

## 阶段 B：LLM 画布能力扩展

### Task B1: 类型定义 + 结构化返回 helper + cardId 校验（Day 15）

**Files:**
- Create: `src/apps/drama/lib/toolResultFormat.ts`
- Create: `src/apps/drama/lib/toolResultFormat.test.ts`
- Create: `src/apps/drama/lib/cardValidation.ts`
- Create: `src/apps/drama/lib/cardValidation.test.ts`
- Modify: `src/apps/drama/stores/toolRouter/types.ts`（加 ToolResult 类型）

- [ ] **Step 1: 新增 ToolResult 类型**

```typescript
// types.ts
export interface ToolResult {
  success: boolean;
  affectedCardIds?: string[];
  summary: string;
  error?: 'card_not_found' | 'validation_failed' | 'unknown_card_type' | 'no_project_selected';
  cardId?: string;
  errors?: Array<{ cardId: string; error: string }>;
  suggestion?: string;
}
```

- [ ] **Step 2: 实现 toolResultFormat**

```typescript
// toolResultFormat.ts
export function formatResult(result: ToolResult): string {
  return JSON.stringify(result);
}

export function parseToolResult(raw: string): { parsed: true; result: ToolResult } | { parsed: false; raw: string } {
  try {
    const obj = JSON.parse(raw);
    if (typeof obj.success === 'boolean' && typeof obj.summary === 'string') {
      return { parsed: true, result: obj as ToolResult };
    }
  } catch {}
  return { parsed: false, raw };
}
```

- [ ] **Step 3: 实现 cardValidation**

```typescript
// cardValidation.ts
export function findCardOrError(cardId: string):
  | { ok: true; card: CanvasNode }
  | { ok: false; error: ToolResult }
{
  const cards = useCanvasStore.getState().getCurrentNodes();
  const card = cards.find(c => c.id === cardId);
  if (!card) {
    return {
      ok: false,
      error: {
        success: false, error: 'card_not_found', cardId,
        suggestion: 'call spellpaw_get_canvas first to get valid card ids',
        summary: `未找到卡片 ${cardId}`,
      },
    };
  }
  return { ok: true, card };
}
```

- [ ] **Step 4: Commit**

```bash
git add src/apps/drama/stores/toolRouter/types.ts src/apps/drama/lib/toolResultFormat.ts src/apps/drama/lib/toolResultFormat.test.ts src/apps/drama/lib/cardValidation.ts src/apps/drama/lib/cardValidation.test.ts
git commit -m "feat(tools): add ToolResult type, toolResultFormat helpers, cardValidation"
```

---

### Task B2: 7 个专用 add tool handler（Day 16）

**Files:**
- Modify: `src/apps/drama/stores/toolRouter/cards.ts`

- [ ] **Step 1: 写 addTypedCard 工厂函数**

```typescript
async function addTypedCard(cardType: CanvasNodeType, data: Record<string, unknown>, position?: { x: number; y: number }): Promise<ToolResult> {
  const validation = validateCanvasCardPayload({ cardType, data, position });
  if (!validation.valid) {
    return { success: false, error: 'validation_failed', suggestion: validation.error ?? 'unknown validation error', summary: '参数错误' };
  }
  const normalized = normalizeCardData(cardType, data);
  const card = await addCanvasCardHandler(cardType, normalized as Record<string, unknown>, position ? { position } : {});
  return { success: true, affectedCardIds: [card.id], summary: `已添加 ${cardType} 卡片「${card.data.title}」` };
}
```

- [ ] **Step 2: 注册 7 个 handler**

```typescript
export const cardHandlers: ToolRouter = {
  add_storyline_card: (params) => formatResult(await addTypedCard('storyline', params)),
  add_moodboard_card: (params) => formatResult(await addTypedCard('moodboard', params)),
  add_video_clip_card: (params) => formatResult(await addTypedCard('videoClip', params)),
  add_asset_card: (params) => formatResult(await addTypedCard('asset', params)),
  add_task_card: (params) => formatResult(await addTypedCard('task', params)),
  add_art_card: (params) => formatResult(await addTypedCard('art', params)),
  add_character_card: (params) => formatResult(await addTypedCard('character', params)),
  // ...保留现有 handler
};
```

- [ ] **Step 3: 为 update_card / delete_card 加校验 + 结构化返回**

```typescript
update_card: async (params) => {
  const cardId = params.cardId as string;
  const check = findCardOrError(cardId);
  if (!check.ok) return formatResult(check.error);
  const updates = (params.updates || params.data || {}) as Record<string, unknown>;
  useCanvasStore.getState().updateNodeData(cardId, updates as Partial<CanvasNodeData>);
  return formatResult({ success: true, affectedCardIds: [cardId], summary: `已更新卡片 ${cardId}` });
},

delete_card: async (params) => {
  const cardId = params.cardId as string;
  const check = findCardOrError(cardId);
  if (!check.ok) return formatResult(check.error);
  useCanvasStore.getState().removeNode(cardId);
  return formatResult({ success: true, affectedCardIds: [cardId], summary: `已删除卡片「${check.card.data.title ?? cardId}」` });
},
```

- [ ] **Step 4: 注册 alias 路由**

```typescript
add_card: (params) => {
  const type = (params.type as CanvasNodeType) || 'storyline';
  return addTypedCard(type, params).then(formatResult);
},
update_card: ...,  // 同上面 update_card
delete_card: ...,  // 同上面 delete_card
```

- [ ] **Step 5: Commit**

```bash
git add src/apps/drama/stores/toolRouter/cards.ts
git commit -m "feat(cards): 7 typed add handlers + 3 alias routes + cardId validation + structured JSON returns"
```

---

### Task B3: 3 个 batch tool handler（Day 17）

**Files:**
- Modify: `src/apps/drama/stores/toolRouter/cards.ts`

- [ ] **Step 1: 实现 batch_update_cards + batch_delete_cards + batch_add_cards**

```typescript
batch_update_cards: async (params) => {
  const updates = (params.updates ?? []) as Array<{ cardId: string; data: Record<string, unknown> }>;
  const affected: string[] = [];
  const errors: Array<{ cardId: string; error: string }> = [];
  for (const u of updates) {
    const check = findCardOrError(u.cardId);
    if (!check.ok) { errors.push({ cardId: u.cardId, error: check.error.error! }); continue; }
    useCanvasStore.getState().updateNodeData(u.cardId, u.data as Partial<CanvasNodeData>);
    affected.push(u.cardId);
  }
  return formatResult({
    success: errors.length === 0,
    affectedCardIds: affected,
    errors: errors.length > 0 ? errors : undefined,
    summary: `更新 ${affected.length} 张${errors.length > 0 ? `，${errors.length} 张失败` : ''}`,
  });
},

batch_delete_cards: async (params) => {
  const cardIds = (params.cardIds ?? []) as string[];
  const allCards = useCanvasStore.getState().getCurrentNodes();
  const missing = cardIds.filter(id => !allCards.find(c => c.id === id));
  if (missing.length > 0) {
    return formatResult({ success: false, error: 'card_not_found', suggestion: `missing cards: ${missing.join(', ')}`, summary: `以下卡片不存在: ${missing.join(', ')}` });
  }
  // 原子删除: 单次 setState
  const idSet = new Set(cardIds);
  useCanvasStore.setState((state) => {
    const pid = useProjectStore.getState().currentProjectId;
    if (!pid) return state;
    return { canvases: { ...state.canvases, [pid]: { ...state.canvases[pid], nodes: state.canvases[pid].nodes.filter(n => !idSet.has(n.id)), edges: state.canvases[pid].edges.filter(e => !idSet.has(e.source) && !idSet.has(e.target)) } } };
  });
  await triggerPushNow();
  return formatResult({ success: true, affectedCardIds: cardIds, summary: `已批量删除 ${cardIds.length} 张卡片` });
},

batch_add_cards: async (params) => {
  const cards = (params.cards ?? []) as Array<{ cardType: CanvasNodeType; data: Record<string, unknown> }>;
  const affected: string[] = [];
  for (let i = 0; i < cards.length; i++) {
    const result = await addTypedCard(cards[i].cardType, cards[i].data, { x: 50 + (i % 3) * 400, y: 100 + Math.floor(i / 3) * 280 });
    if (result.affectedCardIds) affected.push(...result.affectedCardIds);
  }
  return formatResult({ success: true, affectedCardIds: affected, summary: `已批量添加 ${cards.length} 张卡片` });
},
```

- [ ] **Step 2: Commit**

```bash
git add src/apps/drama/stores/toolRouter/cards.ts
git commit -m "feat(cards): 3 batch handlers — batch_update_cards, batch_delete_cards (atomic), batch_add_cards"
```

---

### Task B4: toolConfigs + useCopilotSSE JSON.parse + MessageList 升级（Day 18）

**Files:**
- Modify: `src/apps/drama/lib/toolConfigs.ts`
- Modify: `src/apps/drama/hooks/useCopilotSSE.ts`
- Create: `src/shared/components/chat-panel/copilot/ToolCallResults.tsx`
- Modify: `src/shared/components/chat-panel/copilot/MessageList.tsx`

- [ ] **Step 1: 更新 toolConfigs 加 10 个新 tool**

在 `SPELLPAW_TOOL_CONFIGS` 数组中加 10 个 entry：
- 7 个 `spellpaw_add_<type>_card`（每个独立 schema，type 隐含在 name）
- 3 个 `spellpaw_batch_*`

Schema 参考 spec §4.1 / §4.2。

- [ ] **Step 2: 更新 useCopilotSSE JSON parse**

```typescript
// useCopilotSSE.ts — tool_call_done handler 中：
case 'tool_call_done':
  const raw = event.content as string || '';
  const parsed = parseToolResult(raw);
  if (parsed.parsed && parsed.result.affectedCardIds?.length) {
    triggerHighlight(parsed.result.affectedCardIds.slice(-3)); // 最多高亮 3 张
  }
  endToolCall(event.call_id, parsed.parsed ? (parsed.result.success ? 'success' : 'error') : 'success', errorText);
```

- [ ] **Step 3: 新增 ToolCallResults 组件**

```tsx
// copilot/ToolCallResults.tsx — 折叠行 + 展开详情
export function ToolCallResults({ toolCall }: { toolCall: ToolCall }) {
  const [expanded, setExpanded] = useState(false);
  const parsed = parseToolResult(toolCall.result || '');
  return (
    <div className={cn('tool-call-result', { expanded, error: !parsed.parsed || !parsed.result.success })}>
      <button onClick={() => setExpanded(!expanded)}>
        {toolCall.name} · {parsed.parsed ? (parsed.result.success ? '✅' : '❌') : '⚙️'}
      </button>
      {expanded && (
        <div className="detail">
          <code>{toolCall.args}</code>
          <p>{parsed.parsed ? parsed.result.summary : toolCall.result}</p>
          {parsed.result?.affectedCardIds && <ThumbnailStrip ids={parsed.result.affectedCardIds} />}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: MessageList.tsx 中使用 ToolCallResults**

替换现有 `toolDisplayName(tc.name)` 渲染为 `<ToolCallResults toolCall={tc} />`

- [ ] **Step 5: Commit**

```bash
git add src/apps/drama/lib/toolConfigs.ts src/apps/drama/hooks/useCopilotSSE.ts src/shared/components/chat-panel/copilot/
git commit -m "feat(chat): 10 new LLM tools + JSON parse in useCopilotSSE + ToolCallResults component"
```

---

### Task B5: 测试全量回归 + 收尾（Day 19-20）

**Files:** 所有新建/重写/修正的测试文件

- [ ] **Step 1: cards.test.ts 全覆盖**

新建 `src/apps/drama/stores/toolRouter/cards.test.ts`：
- 7 个 add tool 各 1 成功 + 1 校验失败
- 3 个 batch tool 成功 + 部分失败 + 全回滚
- 3 个 alias 路由
- cardId 校验错误

- [ ] **Step 2: toolRouter.test.ts 重写**

原 752 行，删除 tree handler 测试段，保留 cards/generation/analysis 测试（并更新为新行为）

- [ ] **Step 3: 清理遗漏的测试文件**

删 `src/apps/drama/lib/treeUtils.test.ts`、`treeDiff.test.ts`、`migrateTreeToCards.test.ts`（已在 A3 删除）

更新：
- `canvasCardSchema.test.ts`（删 seedTree + validateLinkedTreeNodeId）
- `useCopilotSSE.test.ts`（删 selectedNodeId）
- `syncEngine.test.ts`（删 selectedNodeId）
- `templateExportImport.test.ts`（tree → canvas fixture）
- `chatStore.test.ts`（删 selectedNodeId + tree）
- `canvasStore.test.ts`（删 linkedTreeNodeId）
- `clearCanvas.test.ts`（kickstart 测试更新）
- `detailStore.test.ts`（requestFocusCanvas 参数改）
- `toolDisplayName.test.ts`（删 tree labels）
- `CopilotCardNode.test.tsx` / `CanvasPanel.popover.test.tsx` / `useCopilotGenerate.test.tsx` / `CardCopilotPopover.test.tsx`（stub 移除 trees: {}）
- `canvasToolkit/actions/*.test.ts`（参数 nodeId → cardId）

- [ ] **Step 4: 全量回归**

```bash
npm test
```

Expected: 292+ tests passing（tree 测试已删除，新增 50+ 测试覆盖新行为）

- [ ] **Step 5: Commit**

```bash
git add -u src/
git commit -m "test(canvas-first): complete test suite — all tree tests removed, 50+ new canvas tests added

Full regression: 292+ tests passing, 0 failures"
```

---

## 实施总结

| 阶段 | Day | 提交数 | 关键动作 |
|---|---|---|---|
| A1 | 1a-1b | 2 | CardMetadata 类型 + 删 TreeNode / projectStore trees |
| A2 | 2 | 1 | 删 6 个 tree 源文件 + 3 个测试 + 6 个 tool config |
| A3 | 3 | 1 | applyTemplateToCanvas 重写 + analysis 重写 |
| A4 | 4 | 1 | diffCanvases + SnapshotModal 改写 |
| A5 | 5 | 1 | projectAnalysis 基于画布 |
| A6 | 6-7 | 1 | proactiveInsights + numbering + intentRouter |
| A7 | 8-9 | 1 | exportPrint + exportPDF + exportImport 改写 |
| A8 | 10 | 1 | canvasToolkit actions 参数清洗 |
| A9 | 11 | 1 | styleLockStore 新建 + UI 替换 |
| A10 | 12 | 1 | 3 个 skill 重写 |
| A11 | 13 | 1 | detailStore / ChatPanel / UI cleanup |
| A12 | 14 | 1 | systemPrompt 重写 + A 阶段全量回归 |
| B1 | 15 | 1 | ToolResult 类型 + toolResultFormat + cardValidation |
| B2 | 16 | 1 | 7 个 add handler + alias |
| B3 | 17 | 1 | 3 个 batch handler |
| B4 | 18 | 1 | toolConfigs 加 10 个 tool + useCopilotSSE JSON + ToolCallResults |
| B5 | 19-20 | 1 | 测试全量回归 |
| **总计** | **20 天** | **16 commits** | ~50 个文件改动 |

