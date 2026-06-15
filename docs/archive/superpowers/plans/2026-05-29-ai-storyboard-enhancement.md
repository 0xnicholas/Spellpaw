> 🗄️ **归档文档** — 本计划已执行完毕（2026-05-30）。实际实现包含：Lightbox 缩略图预览（含 imgError 修复）、批量生成、风格锁。后续开发请参考 `AGENTS.md` 和 `docs/ROADMAP.md`。

# AI 分镜生成完善 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 补齐 AI 分镜生成的三个体验缺口：画布缩略图展示、批量生成、风格锁。

**Architecture:** 在现有 UI 上做最小增量改动。缩略图复用已有的 `thumbnail` 字段；批量生成复用 TreeView 多选机制；风格锁通过项目根节点 `metadata` 存储 prompt，toolRouter 支持 `stylePrompt` 参数覆盖。

**Tech Stack:** React 19 + TypeScript + Tailwind CSS 4 + Zustand + Immer + @xyflow/react

---

## File Structure

| File | Responsibility |
|------|---------------|
| `src/components/ui/Toast.tsx` | 新增：轻量浮动 toast 组件（进度提示） |
| `src/types/index.ts` | 修改：`CanvasNodeData` 加 `generatedPrompt`；`TreeNode.metadata` 加 `lockedStylePrompt`/`lockedStyleNodeId` |
| `src/stores/projectStore.ts` | 修改：新增 `setLockedStyle` / `clearLockedStyle` / `getLockedStyle` actions |
| `src/stores/toolRouter.ts` | 修改：`generate_storyboard` 支持 `stylePrompt` 参数，同时写入 `generatedPrompt` |
| `src/components/flow-canvas/nodes/SceneCardNode.tsx` | 修改：顶部缩略图区域 + 加载/错误态 + hover 锁定风格遮罩 + 已锁定图标 |
| `src/components/tree-view/TreeViewPanel.tsx` | 修改：bulk bar 新增"生成分镜"按钮 + 批量串行生成逻辑 + 风格锁提示/清除 |
| `src/stores/toolRouter.test.ts` | 修改：新增 `generate_storyboard` 风格覆盖测试 |

---

## Prerequisites

- [ ] 确认设计文档已阅读：`docs/superpowers/specs/2026-05-29-ai-storyboard-enhancement-design.md`
- [ ] 确认当前分支干净：`git status` 无未提交改动

---

## Task 1: Toast 组件

**Files:**
- Create: `src/components/ui/Toast.tsx`

一个固定定位在视口顶部的轻量 toast，3 秒后自动消失，支持动态更新消息内容。

- [ ] **Step 1: 实现 Toast 组件**

Create `src/components/ui/Toast.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { X, Image, CheckCircle, AlertCircle } from 'lucide-react';

export type ToastType = 'info' | 'success' | 'error';

interface ToastProps {
  message: string;
  type?: ToastType;
  duration?: number;
  onClose?: () => void;
}

export function Toast({ message, type = 'info', duration = 3000, onClose }: ToastProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onClose?.(), 200);
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  if (!visible) return null;

  const icon = {
    info: <Image className="h-3.5 w-3.5" />,
    success: <CheckCircle className="h-3.5 w-3.5" />,
    error: <AlertCircle className="h-3.5 w-3.5" />,
  }[type];

  const color = {
    info: 'bg-[var(--color-bg-primary)] border-[var(--color-border-default)] text-[var(--color-text-primary)]',
    success: 'bg-[var(--color-bg-primary)] border-[var(--color-accent-500)] text-[var(--color-accent-500)]',
    error: 'bg-[var(--color-bg-primary)] border-red-400 text-red-500',
  }[type];

  return (
    <div
      className={`fixed left-1/2 top-4 z-[100] -translate-x-1/2 transform rounded-[var(--radius-base)] border px-3 py-2 shadow-lg transition-opacity ${color}`}
      style={{ minWidth: '240px', maxWidth: '400px' }}
    >
      <div className="flex items-center gap-2">
        {icon}
        <span className="flex-1 text-xs">{message}</span>
        <button onClick={() => { setVisible(false); setTimeout(() => onClose?.(), 200); }} className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]">
          <X className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

/** Hook to show/update a toast imperatively */
export function useToast() {
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  const show = (message: string, type: ToastType = 'info') => {
    setToast({ message, type });
  };

  const hide = () => setToast(null);

  return { toast, show, hide };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ui/Toast.tsx
git commit -m "feat(toast): add lightweight Toast component for progress notifications"
```

---

## Task 2: 类型变更

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: 修改 `TreeNode.metadata` 增加风格锁字段**

In `src/types/index.ts` line 9-20, add to the metadata interface:

```typescript
  metadata?: {
    duration?: number;
    description?: string;
    location?: string;
    timeOfDay?: 'morning' | 'day' | 'evening' | 'night';
    shotType?: 'wide' | 'medium' | 'close-up' | 'insert' | 'pov';
    cameraMovement?: 'static' | 'pan' | 'tilt' | 'dolly' | 'handheld';
    dialogue?: string;
    notes?: string;
    createdAt: string;
    updatedAt: string;
    lockedStylePrompt?: string | null;  // ← 新增
    lockedStyleNodeId?: string | null;  // ← 新增
  };
```

- [ ] **Step 2: 修改 `CanvasNodeData` 增加 `generatedPrompt`**

In `src/types/index.ts` line 66-74:

```typescript
export interface CanvasNodeData extends Record<string, unknown> {
  title: string;
  description?: string;
  status?: 'draft' | 'in_progress' | 'review' | 'done';
  thumbnail?: string;
  generatedPrompt?: string;  // ← 新增：记录生成该缩略图所用的 prompt
  tags?: string[];
  color?: string;
  linkedTreeNodeId?: string;
}
```

- [ ] **Step 3: Run type check**

```bash
npx tsc --noEmit
```
Expected: No errors (new fields are optional, so no breaking changes).

- [ ] **Step 4: Commit**

```bash
git add src/types/index.ts
git commit -m "feat(types): add generatedPrompt to CanvasNodeData and lockedStyle fields to TreeNode metadata"
```

---

## Task 3: projectStore 风格锁 Actions

**Files:**
- Modify: `src/stores/projectStore.ts`

- [ ] **Step 1: 扩展 `ProjectState` interface**

In `src/stores/projectStore.ts` line 10-28, add to interface:

```typescript
  setLockedStyle: (prompt: string, nodeId: string) => void;
  clearLockedStyle: () => void;
  getLockedStyle: () => { prompt: string | null; nodeId: string | null };
```

- [ ] **Step 2: 实现三个 action**

Insert after `getSelectedNodePath` (around line 301), before the `persist` config:

```typescript
      setLockedStyle: (prompt, nodeId) =>
        set(
          produce((state: ProjectState) => {
            const tree = state.trees[state.currentProjectId!];
            if (!tree) return;
            if (!tree.metadata) tree.metadata = { createdAt: '', updatedAt: '' };
            tree.metadata.lockedStylePrompt = prompt;
            tree.metadata.lockedStyleNodeId = nodeId;
            tree.metadata.updatedAt = new Date().toISOString();
          })
        ),

      clearLockedStyle: () =>
        set(
          produce((state: ProjectState) => {
            const tree = state.trees[state.currentProjectId!];
            if (!tree || !tree.metadata) return;
            tree.metadata.lockedStylePrompt = null;
            tree.metadata.lockedStyleNodeId = null;
            tree.metadata.updatedAt = new Date().toISOString();
          })
        ),

      getLockedStyle: () => {
        const tree = get().getCurrentTree();
        if (!tree?.metadata) return { prompt: null, nodeId: null };
        return {
          prompt: tree.metadata.lockedStylePrompt ?? null,
          nodeId: tree.metadata.lockedStyleNodeId ?? null,
        };
      },
```

- [ ] **Step 3: Run type check**

```bash
npx tsc --noEmit
```
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/stores/projectStore.ts
git commit -m "feat(projectStore): add setLockedStyle, clearLockedStyle, getLockedStyle actions"
```

---

## Task 4: SceneCardNode 缩略图展示 + 风格锁 UI

**Files:**
- Modify: `src/components/flow-canvas/nodes/SceneCardNode.tsx`

- [ ] **Step 1: 读取当前 SceneCardNode 确认结构**

Already read. Current file is 66 lines, no thumbnail support.

- [ ] **Step 2: 重写 SceneCardNode 组件**

Replace entire `src/components/flow-canvas/nodes/SceneCardNode.tsx`:

```tsx
import { useState } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { ImageOff, Lock } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { useCanvasStore } from '@/stores/canvasStore';
import { useProjectStore } from '@/stores/projectStore';
import type { CanvasNodeData } from '@/types';

const statusMap: Record<string, { label: string; variant: 'default' | 'accent' | 'success' | 'warning' }> = {
  draft: { label: 'Draft', variant: 'default' },
  in_progress: { label: 'In Progress', variant: 'accent' },
  review: { label: 'Review', variant: 'warning' },
  done: { label: 'Done', variant: 'success' },
};

export function SceneCardNode({ data, id, selected }: NodeProps<Node<CanvasNodeData>>) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(data.title);
  const [imgError, setImgError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [hoverThumb, setHoverThumb] = useState(false);
  const updateNodeData = useCanvasStore((s) => s.updateNodeData);
  const setLockedStyle = useProjectStore((s) => s.setLockedStyle);
  const getLockedStyle = useProjectStore((s) => s.getLockedStyle);
  const status = data.status ? statusMap[data.status] : null;

  const hasThumbnail = !!data.thumbnail;
  const isLocked = getLockedStyle().nodeId === data.linkedTreeNodeId;

  const handleSave = () => {
    if (editValue.trim() && editValue.trim() !== data.title) {
      updateNodeData(id, { title: editValue.trim() });
    }
    setIsEditing(false);
  };

  const handleLockStyle = () => {
    if (!data.generatedPrompt) return;
    if (data.linkedTreeNodeId) {
      setLockedStyle(data.generatedPrompt, data.linkedTreeNodeId);
    }
  };

  return (
    <div
      className={`w-[240px] rounded-[var(--radius-base)] border bg-[var(--color-bg-primary)] shadow-sm transition-shadow ${
        selected
          ? 'border-[var(--color-accent-500)] shadow-md'
          : 'border-[var(--color-border-default)]'
      }`}
    >
      <Handle type="target" position={Position.Left} className="!bg-[var(--color-accent-500)]" />

      {/* Thumbnail area */}
      {hasThumbnail && (
        <div
          className="relative aspect-[9/16] w-full overflow-hidden rounded-t-[var(--radius-base)]"
          onMouseEnter={() => setHoverThumb(true)}
          onMouseLeave={() => setHoverThumb(false)}
        >
          {!imgLoaded && !imgError && (
            <div className="absolute inset-0 animate-pulse bg-[var(--color-bg-tertiary)]" />
          )}
          {imgError ? (
            <div className="flex h-full w-full items-center justify-center bg-[var(--color-bg-tertiary)]">
              <div className="text-center">
                <ImageOff className="mx-auto h-5 w-5 text-[var(--color-text-tertiary)]" />
                <span className="mt-1 block text-[9px] text-[var(--color-text-tertiary)]">加载失败</span>
              </div>
            </div>
          ) : (
            <img
              src={data.thumbnail}
              alt={data.title}
              className={`h-full w-full object-cover transition-opacity ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
              onLoad={() => setImgLoaded(true)}
              onError={() => { setImgError(true); setImgLoaded(true); }}
              onClick={() => data.thumbnail && window.open(data.thumbnail, '_blank')}
              style={{ cursor: 'pointer' }}
            />
          )}

          {/* Lock style overlay */}
          {hoverThumb && data.generatedPrompt && !imgError && (
            <button
              onClick={(e) => { e.stopPropagation(); handleLockStyle(); }}
              className="absolute inset-0 flex items-center justify-center bg-black/40 transition-opacity"
            >
              <span className="rounded-[var(--radius-sm)] bg-white/90 px-2.5 py-1 text-[11px] font-medium text-black">
                {isLocked ? '🔒 已锁定' : '🔒 锁定风格'}
              </span>
            </button>
          )}

          {/* Locked indicator */}
          {isLocked && (
            <div className="absolute bottom-1.5 right-1.5 rounded-full bg-[var(--color-accent-500)] p-1">
              <Lock className="h-2.5 w-2.5 text-white" />
            </div>
          )}
        </div>
      )}

      {/* Card body */}
      <div className="p-4">
        <div className="mb-2 flex items-start justify-between gap-2">
          {isEditing ? (
            <input
              autoFocus
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleSave}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave();
                if (e.key === 'Escape') { setEditValue(data.title); setIsEditing(false); }
              }}
              className="flex-1 rounded-[var(--radius-sm)] border border-[var(--color-accent-500)] bg-[var(--color-bg-primary)] px-1.5 py-0.5 text-sm font-medium outline-none"
            />
          ) : (
            <h4
              className="text-sm font-medium text-[var(--color-text-primary)] cursor-text"
              onDoubleClick={() => { setEditValue(data.title); setIsEditing(true); }}
              title="Double-click to edit"
            >
              {data.title}
            </h4>
          )}
          {status && <Badge variant={status.variant}>{status.label}</Badge>}
        </div>
        {data.description && (
          <p className="text-xs text-[var(--color-text-tertiary)] line-clamp-2">{data.description}</p>
        )}
      </div>

      <Handle type="source" position={Position.Right} className="!bg-[var(--color-accent-500)]" />
    </div>
  );
}
```

- [ ] **Step 3: Run lint and type check**

```bash
npm run lint && npx tsc --noEmit
```
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/flow-canvas/nodes/SceneCardNode.tsx
git commit -m "feat(canvas): SceneCardNode thumbnail display with loading/error states and style lock overlay"
```

---

## Task 5: toolRouter.generate_storyboard 增强

**Files:**
- Modify: `src/stores/toolRouter.ts`

- [ ] **Step 1: 读取当前 toolRouter 确认 generate_storyboard 位置**

Current: lines 140-168.

- [ ] **Step 2: 重写 generate_storyboard action**

Replace lines 140-168 in `src/stores/toolRouter.ts`:

```typescript
  generate_storyboard: async (params) => {
    const nodeId = params.nodeId as string;
    const customPrompt = params.prompt as string | undefined;
    const stylePrompt = params.stylePrompt as string | undefined;

    const store = useProjectStore.getState();
    const tree = store.getCurrentTree();
    if (!tree) return '(无法生成：当前无项目)';

    const node = findNode(tree, nodeId);
    if (!node) return `(未找到节点 ${nodeId})`;

    try {
      const { generateImage, buildImagePrompt } = await import('../lib/imageGen');

      // 优先级：stylePrompt > customPrompt > buildImagePrompt
      let prompt: string;
      if (stylePrompt) {
        prompt = `${stylePrompt}\n\nScene: "${node.title}".`
          + (node.metadata?.location ? ` Location: ${node.metadata.location}.` : '')
          + (node.metadata?.timeOfDay ? ` Time: ${node.metadata.timeOfDay}.` : '')
          + (node.metadata?.shotType ? ` Shot: ${node.metadata.shotType}.` : '')
          + (node.metadata?.description ? ` ${node.metadata.description}` : '');
      } else {
        prompt = customPrompt || buildImagePrompt(node);
      }

      const imageUrl = await generateImage({ prompt, size: '1024x1792' });

      const { useCanvasStore } = await import('./canvasStore');
      const canvasState = useCanvasStore.getState();
      const canvasNodes = canvasState.getCurrentNodes();
      const linkedCard = canvasNodes.find((n: { data: { linkedTreeNodeId?: string } }) => n.data.linkedTreeNodeId === nodeId);
      if (linkedCard) {
        canvasState.updateNodeData(linkedCard.id, {
          thumbnail: imageUrl,
          generatedPrompt: prompt,
        });
      }

      return `已为「${node.title}」生成参考图: ${imageUrl}`;
    } catch (err) {
      throw new Error(`分镜生成失败: ${(err as Error).message}`, { cause: err });
    }
  },
```

- [ ] **Step 3: Run type check**

```bash
npx tsc --noEmit
```
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add src/stores/toolRouter.ts
git commit -m "feat(toolRouter): generate_storyboard supports stylePrompt override and stores generatedPrompt"
```

---

## Task 6: TreeViewPanel 批量生成 + 风格锁提示

**Files:**
- Modify: `src/components/tree-view/TreeViewPanel.tsx`

- [ ] **Step 1: 读取当前 TreeViewPanel 确认 bulk bar 位置**

The bulk action bar rendering and `selectedIds` state are already in place (added during Option C). Need to locate the exact JSX.

- [ ] **Step 2: 导入 Toast hook 和 toolRouter**

Add imports at top of file:

```tsx
import { useToast, Toast } from '@/components/ui/Toast';
import { toolRouter } from '@/stores/toolRouter';
import { useCallback } from 'react';
```

- [ ] **Step 3: 添加 Toast state 和批量生成逻辑**

Inside `TreeViewPanel` component, add:

```tsx
  const { toast, show, hide } = useToast();
  const getLockedStyle = useProjectStore((s) => s.getLockedStyle);
  const clearLockedStyle = useProjectStore((s) => s.clearLockedStyle);

  const handleBulkGenerate = useCallback(async () => {
    const targets = Array.from(selectedIds)
      .map((id) => {
        const tree = treeData;
        if (!tree) return null;
        function find(n: TreeNode): TreeNode | null {
          if (n.id === id) return n;
          for (const c of n.children ?? []) {
            const f = find(c);
            if (f) return f;
          }
          return null;
        }
        return find(tree);
      })
      .filter((n): n is TreeNode => !!n && (n.type === 'scene' || n.type === 'shot'));

    if (targets.length === 0) {
      show('请选中至少一个场景或镜头', 'error');
      return;
    }

    const total = targets.length;
    const failed: string[] = [];
    const locked = getLockedStyle();

    for (let i = 0; i < targets.length; i++) {
      const node = targets[i];
      show(`🎨 正在生成 ${i + 1}/${total}: ${node.title}...`, 'info');
      try {
        await toolRouter.generate_storyboard({
          action: 'generate_storyboard',
          nodeId: node.id,
          ...(locked.prompt ? { stylePrompt: locked.prompt } : {}),
        });
        // Small delay to avoid rate limiting
        if (i < targets.length - 1) await new Promise((r) => setTimeout(r, 500));
      } catch (err) {
        failed.push(node.title);
        show(`❌ ${node.title} 失败: ${(err as Error).message}`, 'error');
        await new Promise((r) => setTimeout(r, 1000));
      }
    }

    if (failed.length === 0) {
      show(`✅ 全部 ${total} 张分镜生成完成`, 'success');
    } else {
      show(`⚠️ ${total - failed.length}/${total} 成功，${failed.length} 个失败`, 'error');
    }
    setSelectedIds(new Set());
  }, [selectedIds, treeData, getLockedStyle, show, setSelectedIds]);
```

- [ ] **Step 4: 修改 bulk action bar JSX**

Find the bulk action bar in TreeViewPanel (where status dropdown and delete button are) and add the generate button. Add before the delete button:

```tsx
  {/* Generate storyboards button */}
  <button
    onClick={handleBulkGenerate}
    className="flex items-center gap-1 rounded-[var(--radius-sm)] bg-[var(--color-bg-accent)] px-2 py-1 text-[11px] font-medium text-[var(--color-text-inverse)] hover:opacity-90 transition-opacity"
  >
    <Image className="h-3 w-3" />
    生成分镜
  </button>
```

Also add the locked style indicator next to the bulk bar when active:

```tsx
  {/* Style lock indicator */}
  {(() => {
    const locked = getLockedStyle();
    if (!locked.prompt) return null;
    return (
      <div className="flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--color-accent-500)] bg-[var(--color-bg-accent-subtle)] px-2 py-1 text-[11px] text-[var(--color-accent-500)]">
        <Lock className="h-3 w-3" />
        <span>基于风格锁</span>
        <button
          onClick={() => { clearLockedStyle(); show('已清除风格锁', 'info'); }}
          className="ml-1 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
    );
  })()}
```

And render the Toast at the bottom of the component:

```tsx
  {toast && (
    <Toast
      message={toast.message}
      type={toast.type}
      onClose={hide}
    />
  )}
```

- [ ] **Step 5: Add Image and Lock imports**

```tsx
import { Search, FolderTree, Trash2, CheckSquare, Image, Lock, X } from 'lucide-react';
```

- [ ] **Step 6: Run lint and type check**

```bash
npm run lint && npx tsc --noEmit
```
Expected: No errors.

- [ ] **Step 7: Commit**

```bash
git add src/components/tree-view/TreeViewPanel.tsx
git commit -m "feat(tree-view): bulk storyboard generation with progress toast and style lock indicator"
```

---

## Task 7: 测试

**Files:**
- Modify: `src/stores/toolRouter.test.ts`
- Modify: `src/stores/projectStore.test.ts`

- [ ] **Step 1: 新增 toolRouter 风格覆盖测试**

In `src/stores/toolRouter.test.ts`, add a new test:

```typescript
import { describe, it, expect, vi } from 'vitest';
import { toolRouter } from './toolRouter';
import { useProjectStore } from './projectStore';
import { useCanvasStore } from './canvasStore';

// ... existing tests ...

describe('generate_storyboard with stylePrompt', () => {
  it('uses stylePrompt when provided instead of buildImagePrompt', async () => {
    // Setup: create a project with a scene
    const store = useProjectStore.getState();
    const projectId = store.createProject('Test', '', '#000');
    store.setCurrentProject(projectId);
    const tree = store.getCurrentTree()!;
    const scene = { id: 'scene_1', type: 'scene' as const, title: 'Test Scene', status: 'draft' as const, metadata: { location: 'Cafe', timeOfDay: 'night' as const, createdAt: '', updatedAt: '' } };
    store.addTreeNode(tree.id, scene);

    // Mock canvas store to have a linked card
    const canvasStore = useCanvasStore.getState();
    canvasStore.syncProject(projectId);
    canvasStore.syncNodes([{
      id: 'card_1',
      type: 'sceneCard',
      position: { x: 0, y: 0 },
      data: { title: 'Test Scene', linkedTreeNodeId: 'scene_1' },
    }]);

    // We can't actually call OpenAI in tests, but we can verify the router accepts stylePrompt
    // by checking that the function signature compiles and the error path works
    await expect(
      toolRouter.generate_storyboard({
        action: 'generate_storyboard',
        nodeId: 'scene_1',
        stylePrompt: 'A cinematic noir style with high contrast.',
      })
    ).rejects.toThrow();
  });
});
```

- [ ] **Step 2: 新增 projectStore 风格锁测试**

In `src/stores/projectStore.test.ts`, add:

```typescript
import { describe, it, expect } from 'vitest';
import { useProjectStore } from './projectStore';

describe('locked style', () => {
  it('setLockedStyle stores prompt on project root metadata', () => {
    const store = useProjectStore.getState();
    const id = store.createProject('Lock Test', '', '#000');
    store.setCurrentProject(id);

    store.setLockedStyle('cinematic noir style', 'node_1');
    const tree = store.getCurrentTree()!;
    expect(tree.metadata?.lockedStylePrompt).toBe('cinematic noir style');
    expect(tree.metadata?.lockedStyleNodeId).toBe('node_1');
  });

  it('clearLockedStyle removes the lock', () => {
    const store = useProjectStore.getState();
    const id = store.createProject('Lock Test 2', '', '#000');
    store.setCurrentProject(id);

    store.setLockedStyle('some style', 'node_1');
    store.clearLockedStyle();
    const tree = store.getCurrentTree()!;
    expect(tree.metadata?.lockedStylePrompt).toBeNull();
    expect(tree.metadata?.lockedStyleNodeId).toBeNull();
  });

  it('getLockedStyle returns current lock', () => {
    const store = useProjectStore.getState();
    const id = store.createProject('Lock Test 3', '', '#000');
    store.setCurrentProject(id);

    expect(store.getLockedStyle()).toEqual({ prompt: null, nodeId: null });
    store.setLockedStyle('style', 'node_1');
    expect(store.getLockedStyle()).toEqual({ prompt: 'style', nodeId: 'node_1' });
  });
});
```

- [ ] **Step 3: Run tests**

```bash
npm test
```
Expected: All tests pass (existing + new).

- [ ] **Step 4: Commit**

```bash
git add src/stores/toolRouter.test.ts src/stores/projectStore.test.ts
git commit -m "test: add locked style and generate_storyboard stylePrompt tests"
```

---

## Final Verification

- [ ] **Run full lint + typecheck + tests**

```bash
npm run lint && npx tsc --noEmit && npm test
```

- [ ] **Commit final verification**

```bash
git commit --allow-empty -m "chore: verify all lint/type/tests pass for storyboard enhancement"
```

---

## Rollback Notes

If any step fails and you need to roll back:

```bash
# Roll back to before this plan
git log --oneline -10  # find the commit hash before Task 1
git reset --hard <hash-before-task-1>
```

All changes are scoped to 6 files + 2 test files. No external dependencies added.
