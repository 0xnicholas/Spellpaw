# 画布四种卡片类型 — 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 将画布卡片从 sceneCard/assetCard 重构为 script/art/output/character 四种独立类型，每种不同字段和视觉表达。

**Architecture:** 更新 `CanvasNodeType`，新建 4 个 Node 组件，更新 `FlowCanvasPanel` 的 nodeTypes 映射 + 右键菜单 + 工具栏。`generate_storyboard` 改为创建 `art` 卡片。移除树↔画布双向同步（sync.ts subscribe）。

**Tech Stack:** React 19, TypeScript 6.0, @xyflow/react, Tailwind CSS 4 + OKLCH

**Refs:**
- Spec: `docs/superpowers/specs/2026-06-02-canvas-four-card-types-design.md`
- Current canvas nodes: `src/apps/drama/components/flow-canvas/nodes/SceneCardNode.tsx`, `AssetCardNode.tsx`
- FlowCanvasPanel: `src/apps/drama/components/flow-canvas/FlowCanvasPanel.tsx`

---

## File Structure

| File | Action |
|------|--------|
| `src/apps/drama/types/index.ts` | 🔄 CanvasNodeType → 'script' \| 'art' \| 'output' \| 'character' |
| `src/apps/drama/components/flow-canvas/nodes/ScriptCardNode.tsx` | 🆕 剧本卡片 |
| `src/apps/drama/components/flow-canvas/nodes/ArtCardNode.tsx` | 🆕 美术卡片 |
| `src/apps/drama/components/flow-canvas/nodes/OutputCardNode.tsx` | 🆕 产出卡片 |
| `src/apps/drama/components/flow-canvas/nodes/CharacterCardNode.tsx` | 🆕 人物角色卡片 |
| `src/apps/drama/components/flow-canvas/nodes/index.ts` | 🆕 类型→组件映射 |
| `src/apps/drama/components/flow-canvas/FlowCanvasPanel.tsx` | 🔄 nodeTypes, 工具栏, 右键菜单 |
| `src/apps/drama/stores/canvasStore.ts` | 🔄 移除 addNodeFromAsset |
| `src/apps/drama/stores/toolRouter.ts` | 🔄 add_canvas_card, 重构 generate_storyboard |
| `src/apps/drama/lib/exportPrint.ts` | 🔄 按 art 类型过滤 |
| `src/apps/drama/stores/sync.ts` | 🔄 注释 subscribe 调用 |
| `src/apps/drama/data/mockCanvasData.ts` | 🔄 新类型示例 |

---

### Task 1: Update CanvasNodeType

**Files:**
- Modify: `src/apps/drama/types/index.ts`

- [ ] **Step 1: Change type**

```typescript
// Before:
export type CanvasNodeType = 'sceneCard' | 'assetCard';

// After:
export type CanvasNodeType = 'script' | 'art' | 'output' | 'character';
```

- [ ] **Step 2: Verify compiles**

Run: `npx tsc --noEmit --project tsconfig.app.json 2>&1 | grep -c "CanvasNodeType\|canvas.*type" | head -5`
Expected: May show errors in old references — that's OK, we'll fix them in subsequent tasks.

- [ ] **Step 3: Commit**

```bash
git add src/apps/drama/types/index.ts
git commit -m "feat: update CanvasNodeType to script/art/output/character"
```

---

### Task 2: Build ScriptCardNode

**Files:**
- Create: `src/apps/drama/components/flow-canvas/nodes/ScriptCardNode.tsx`

**Context:** 纯文字卡片。蓝色顶栏。字段：title, description, dialogue, duration, location, timeOfDay, status。

- [ ] **Step 1: Create component**

```typescript
// src/apps/drama/components/flow-canvas/nodes/ScriptCardNode.tsx

import { useState } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { Badge } from '@/shared/components/ui/Badge';
import { useCanvasStore } from '@drama/stores/canvasStore';
import type { CanvasNodeData } from '@drama/types';

const statusMap: Record<string, { label: string; variant: 'default' | 'accent' | 'success' | 'warning' }> = {
  draft: { label: '草稿', variant: 'default' },
  in_progress: { label: '进行中', variant: 'accent' },
  review: { label: '审核中', variant: 'warning' },
  done: { label: '已完成', variant: 'success' },
};

export function ScriptCardNode({ data, id, selected }: NodeProps<Node<CanvasNodeData>>) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(data.title);
  const updateNodeData = useCanvasStore((s) => s.updateNodeData);
  const status = data.status ? statusMap[data.status as string] : null;
  const dialogue = data.dialogue as string | undefined;
  const location = data.location as string | undefined;
  const duration = data.duration as number | undefined;
  const timeOfDay = data.timeOfDay as string | undefined;

  const handleSave = () => {
    if (editValue.trim() && editValue.trim() !== data.title) {
      updateNodeData(id, { title: editValue.trim() });
    }
    setIsEditing(false);
  };

  return (
    <div
      className={`w-[240px] rounded-[var(--radius-base)] border bg-[var(--color-bg-secondary)] shadow-sm transition-shadow ${
        selected ? 'border-[var(--color-accent-500)] shadow-md' : 'border-[var(--color-border-default)]'
      }`}
    >
      <Handle type="target" position={Position.Left} className="!bg-[var(--color-accent-500)]" />

      {/* Blue header bar */}
      <div className="rounded-t-[var(--radius-base)] bg-[var(--color-bg-accent-subtle)] px-3 py-1.5 border-b border-[var(--color-border-default)]">
        <span className="text-[10px] font-semibold text-[var(--color-accent-500)] uppercase tracking-wider">📝 剧本</span>
      </div>

      <div className="p-3">
        {/* Title */}
        <div className="mb-2 flex items-start justify-between gap-2">
          {isEditing ? (
            <input autoFocus value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleSave}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') { setEditValue(data.title); setIsEditing(false); } }}
              className="flex-1 rounded-[var(--radius-sm)] border border-[var(--color-accent-500)] bg-[var(--color-bg-secondary)] px-1.5 py-0.5 text-sm font-medium outline-none"
            />
          ) : (
            <h4 className="text-sm font-medium text-[var(--color-text-primary)] cursor-text"
              onDoubleClick={() => { setEditValue(data.title); setIsEditing(true); }}
              title="双击编辑">
              {data.title}
            </h4>
          )}
          {status && <Badge variant={status.variant}>{status.label}</Badge>}
        </div>

        {/* Description */}
        {data.description && (
          <p className="text-xs text-[var(--color-text-tertiary)] line-clamp-3 mb-2">{data.description}</p>
        )}

        {/* Dialogue preview */}
        {dialogue && (
          <div className="mb-2 rounded-[var(--radius-sm)] bg-[var(--color-bg-tertiary)] px-2 py-1.5">
            <p className="text-[11px] text-[var(--color-text-secondary)] italic leading-relaxed line-clamp-2">💬 {dialogue}</p>
          </div>
        )}

        {/* Metadata bar */}
        <div className="flex items-center gap-2 text-[10px] text-[var(--color-text-tertiary)] border-t border-[var(--color-border-default)] pt-2">
          {duration != null && <span>⏱ {duration}s</span>}
          {location && <span>📍 {location}</span>}
          {timeOfDay && <span>🌅 {timeOfDay}</span>}
        </div>
      </div>

      <Handle type="source" position={Position.Right} className="!bg-[var(--color-accent-500)]" />
    </div>
  );
}
```

- [ ] **Step 2: Compile check**

Run: `npx tsc --noEmit --project tsconfig.app.json 2>&1 | grep "ScriptCardNode" || echo "No errors"`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/apps/drama/components/flow-canvas/nodes/ScriptCardNode.tsx
git commit -m "feat: add ScriptCardNode component"
```

---

### Task 3: Build ArtCardNode

**Files:**
- Create: `src/apps/drama/components/flow-canvas/nodes/ArtCardNode.tsx`

**Context:** 视觉资源卡片。黄色顶栏，9:16 缩略图，提示词，标签，风格锁定。

- [ ] **Step 1: Create component** — reuses thumbnail/lightbox logic from SceneCardNode

```typescript
// src/apps/drama/components/flow-canvas/nodes/ArtCardNode.tsx

import { useState, useEffect } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { ImageOff, Lock } from 'lucide-react';
import { Lightbox } from '@/shared/components/ui/Lightbox';
import { useCanvasStore } from '@drama/stores/canvasStore';
import { useProjectStore } from '@drama/stores/projectStore';
import type { CanvasNodeData } from '@drama/types';

export function ArtCardNode({ data, id, selected }: NodeProps<Node<CanvasNodeData>>) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(data.title);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [hoverThumb, setHoverThumb] = useState(false);
  const updateNodeData = useCanvasStore((s) => s.updateNodeData);
  const setLockedStyle = useProjectStore((s) => s.setLockedStyle);
  const getLockedStyle = useProjectStore((s) => s.getLockedStyle);

  const thumbnail = data.thumbnail as string | undefined;
  const prompt = data.prompt as string | undefined;
  const tags = data.tags as string[] | undefined;
  const linkedTreeNodeId = data.linkedTreeNodeId as string | undefined;
  const hasThumbnail = !!thumbnail && !imgError;
  const isLocked = getLockedStyle().nodeId === linkedTreeNodeId;

  useEffect(() => {
    setImgError(false);
    setImgLoaded(false);
  }, [thumbnail]);

  const handleSave = () => {
    if (editValue.trim() && editValue.trim() !== data.title) {
      updateNodeData(id, { title: editValue.trim() });
    }
    setIsEditing(false);
  };

  const handleLockStyle = () => {
    if (!prompt || !linkedTreeNodeId) return;
    setLockedStyle(prompt, linkedTreeNodeId);
  };

  return (
    <>
      <div
        className={`w-[240px] rounded-[var(--radius-base)] border bg-[var(--color-bg-secondary)] shadow-sm transition-shadow ${
          selected ? 'border-[var(--color-accent-500)] shadow-md' : 'border-[var(--color-border-default)]'
        }`}
      >
        <Handle type="target" position={Position.Left} className="!bg-[var(--color-accent-500)]" />

        {/* Yellow header bar */}
        <div className="rounded-t-[var(--radius-base)] bg-[var(--color-status-warning-bg)] px-3 py-1.5 border-b border-[var(--color-border-default)]">
          <span className="text-[10px] font-semibold text-[var(--color-status-warning-text)] uppercase tracking-wider">🎨 美术</span>
        </div>

        {/* Thumbnail area */}
        {hasThumbnail && (
          <div className="relative aspect-[9/16] w-full overflow-hidden"
            onMouseEnter={() => setHoverThumb(true)}
            onMouseLeave={() => setHoverThumb(false)}>
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
              <img src={thumbnail} alt={data.title}
                className={`h-full w-full object-cover ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
                onLoad={() => setImgLoaded(true)}
                onError={() => { setImgError(true); setImgLoaded(true); }}
                onClick={() => setLightboxOpen(true)}
                style={{ cursor: 'pointer' }} draggable={false} />
            )}

            {/* Lock style overlay */}
            {hoverThumb && prompt && !imgError && (
              <button onClick={(e) => { e.stopPropagation(); handleLockStyle(); }}
                className="absolute inset-0 flex items-center justify-center bg-black/40">
                <span className="rounded-[var(--radius-sm)] bg-[var(--color-bg-primary)]/90 px-2.5 py-1 text-[11px] font-medium">
                  {isLocked ? '🔒 已锁定' : '🔒 锁定风格'}
                </span>
              </button>
            )}
            {isLocked && (
              <div className="absolute bottom-1.5 right-1.5 rounded-full bg-[var(--color-accent-500)] p-1">
                <Lock className="h-2.5 w-2.5 text-white" />
              </div>
            )}
          </div>
        )}

        <div className="p-3">
          {/* Title */}
          {isEditing ? (
            <input autoFocus value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleSave}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') { setEditValue(data.title); setIsEditing(false); } }}
              className="w-full rounded-[var(--radius-sm)] border border-[var(--color-accent-500)] bg-[var(--color-bg-secondary)] px-1.5 py-0.5 text-sm font-medium outline-none"
            />
          ) : (
            <h4 className="text-sm font-medium text-[var(--color-text-primary)] cursor-text truncate"
              onDoubleClick={() => { setEditValue(data.title); setIsEditing(true); }}>
              {data.title}
            </h4>
          )}

          {/* Prompt */}
          {prompt && (
            <p className="mt-1 text-[10px] text-[var(--color-text-tertiary)] line-clamp-2">{prompt}</p>
          )}

          {/* Tags */}
          {tags && tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {tags.map((tag) => (
                <span key={tag} className="text-[8px] bg-[var(--color-bg-tertiary)] text-[var(--color-text-secondary)] px-1.5 py-0.5 rounded-full">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        <Handle type="source" position={Position.Right} className="!bg-[var(--color-accent-500)]" />
      </div>

      <Lightbox src={thumbnail ?? ''} alt={data.title} isOpen={lightboxOpen} onClose={() => setLightboxOpen(false)} />
    </>
  );
}
```

- [ ] **Step 2: Compile check**

Run: `npx tsc --noEmit --project tsconfig.app.json 2>&1 | grep "ArtCardNode" || echo "No errors"`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/apps/drama/components/flow-canvas/nodes/ArtCardNode.tsx
git commit -m "feat: add ArtCardNode component"
```

---

### Task 4: Build OutputCardNode

**Files:**
- Create: `src/apps/drama/components/flow-canvas/nodes/OutputCardNode.tsx`

- [ ] **Step 1: Create component**

```typescript
// src/apps/drama/components/flow-canvas/nodes/OutputCardNode.tsx

import { useState } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { useCanvasStore } from '@drama/stores/canvasStore';
import type { CanvasNodeData } from '@drama/types';

export function OutputCardNode({ data, id, selected }: NodeProps<Node<CanvasNodeData>>) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(data.title);
  const updateNodeData = useCanvasStore((s) => s.updateNodeData);

  const summary = data.summary as string | undefined;
  const outputType = data.outputType as string | undefined;
  const sourceTaskId = data.sourceTaskId as string | undefined;

  const handleSave = () => {
    if (editValue.trim() && editValue.trim() !== data.title) {
      updateNodeData(id, { title: editValue.trim() });
    }
    setIsEditing(false);
  };

  const typeLabel = outputType === 'analysis' ? '分析' : outputType === 'suggestion' ? '建议' : outputType === 'generation' ? '生成' : '产出';

  return (
    <div
      className={`w-[240px] rounded-[var(--radius-base)] border bg-[var(--color-bg-secondary)] shadow-sm transition-shadow ${
        selected ? 'border-[var(--color-accent-500)] shadow-md' : 'border-[var(--color-border-default)]'
      }`}
    >
      <Handle type="target" position={Position.Left} className="!bg-[var(--color-accent-500)]" />

      {/* Purple header bar */}
      <div className="rounded-t-[var(--radius-base)] bg-[var(--color-bg-accent-subtle)] px-3 py-1.5 border-b border-[var(--color-border-default)]">
        <span className="text-[10px] font-semibold text-[var(--color-accent-500)] uppercase tracking-wider">📦 产出 · {typeLabel}</span>
      </div>

      <div className="p-3">
        {/* Title */}
        {isEditing ? (
          <input autoFocus value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleSave}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') { setEditValue(data.title); setIsEditing(false); } }}
            className="w-full rounded-[var(--radius-sm)] border border-[var(--color-accent-500)] bg-[var(--color-bg-secondary)] px-1.5 py-0.5 text-sm font-medium outline-none"
          />
        ) : (
          <h4 className="text-sm font-medium text-[var(--color-text-primary)] cursor-text"
            onDoubleClick={() => { setEditValue(data.title); setIsEditing(true); }}>
            {data.title}
          </h4>
        )}

        {/* Source task info */}
        {sourceTaskId && (
          <p className="text-[9px] text-[var(--color-text-tertiary)] mt-1">来源: Agent 任务</p>
        )}

        {/* Summary */}
        {summary && (
          <p className="mt-2 text-[11px] text-[var(--color-text-secondary)] leading-relaxed line-clamp-4">{summary}</p>
        )}
      </div>

      <Handle type="source" position={Position.Right} className="!bg-[var(--color-accent-500)]" />
    </div>
  );
}
```

- [ ] **Step 2: Compile check**

Run: `npx tsc --noEmit --project tsconfig.app.json 2>&1 | grep "OutputCardNode" || echo "No errors"`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/apps/drama/components/flow-canvas/nodes/OutputCardNode.tsx
git commit -m "feat: add OutputCardNode component"
```

---

### Task 5: Build CharacterCardNode

**Files:**
- Create: `src/apps/drama/components/flow-canvas/nodes/CharacterCardNode.tsx`

- [ ] **Step 1: Create component**

```typescript
// src/apps/drama/components/flow-canvas/nodes/CharacterCardNode.tsx

import { useState } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { useCanvasStore } from '@drama/stores/canvasStore';
import type { CanvasNodeData } from '@drama/types';

export function CharacterCardNode({ data, id, selected }: NodeProps<Node<CanvasNodeData>>) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(data.title);
  const updateNodeData = useCanvasStore((s) => s.updateNodeData);

  const name = (data.name as string) || data.title;
  const role = data.role as string | undefined;
  const age = data.age as number | undefined;
  const occupation = data.occupation as string | undefined;
  const personality = data.personality as string | undefined;
  const appearance = data.appearance as string | undefined;
  const avatar = data.avatar as string | undefined;

  const handleSave = () => {
    if (editValue.trim() && editValue.trim() !== data.title) {
      updateNodeData(id, { title: editValue.trim() });
    }
    setIsEditing(false);
  };

  return (
    <div
      className={`w-[220px] rounded-[var(--radius-base)] border bg-[var(--color-bg-secondary)] shadow-sm transition-shadow ${
        selected ? 'border-[var(--color-accent-500)] shadow-md' : 'border-[var(--color-border-default)]'
      }`}
    >
      <Handle type="target" position={Position.Left} className="!bg-[var(--color-accent-500)]" />

      {/* Green header bar */}
      <div className="rounded-t-[var(--radius-base)] bg-[var(--color-status-success-bg)] px-3 py-1.5 border-b border-[var(--color-border-default)]">
        <span className="text-[10px] font-semibold text-[var(--color-status-success-text)] uppercase tracking-wider">👤 人物角色</span>
      </div>

      <div className="p-3">
        <div className="flex items-start gap-3">
          {/* Avatar placeholder */}
          <div className="w-12 h-12 rounded-full flex-shrink-0 flex items-center justify-center text-xl"
            style={{ background: avatar ? `url(${avatar}) center/cover` : 'var(--color-bg-tertiary)' }}>
            {!avatar && '👤'}
          </div>

          <div className="min-w-0 flex-1">
            {/* Name (editable via title) */}
            {isEditing ? (
              <input autoFocus value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={handleSave}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') { setEditValue(data.title); setIsEditing(false); } }}
                className="w-full rounded-[var(--radius-sm)] border border-[var(--color-accent-500)] bg-[var(--color-bg-secondary)] px-1.5 py-0.5 text-sm font-medium outline-none"
              />
            ) : (
              <h4 className="text-sm font-semibold text-[var(--color-text-primary)] cursor-text"
                onDoubleClick={() => { setEditValue(data.title); setIsEditing(true); }}>
                {name}
              </h4>
            )}

            {/* Role + Age + Occupation */}
            <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-0.5 text-[10px] text-[var(--color-text-tertiary)]">
              {role && <span>{role}</span>}
              {age != null && <span>{age}岁</span>}
              {occupation && <span>· {occupation}</span>}
            </div>

            {/* Personality */}
            {personality && (
              <p className="mt-1.5 text-[10px] text-[var(--color-text-secondary)] leading-relaxed line-clamp-2">
                {personality}
              </p>
            )}

            {/* Appearance */}
            {appearance && (
              <p className="mt-1 text-[10px] text-[var(--color-text-tertiary)] leading-relaxed line-clamp-2">
                {appearance}
              </p>
            )}
          </div>
        </div>
      </div>

      <Handle type="source" position={Position.Right} className="!bg-[var(--color-accent-500)]" />
    </div>
  );
}
```

- [ ] **Step 2: Compile check**

Run: `npx tsc --noEmit --project tsconfig.app.json 2>&1 | grep "CharacterCardNode" || echo "No errors"`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/apps/drama/components/flow-canvas/nodes/CharacterCardNode.tsx
git commit -m "feat: add CharacterCardNode component"
```

---

### Task 6: Create node index & update FlowCanvasPanel

**Files:**
- Create: `src/apps/drama/components/flow-canvas/nodes/index.ts`
- Modify: `src/apps/drama/components/flow-canvas/FlowCanvasPanel.tsx`

- [ ] **Step 1: Create node index**

```typescript
// src/apps/drama/components/flow-canvas/nodes/index.ts

export { ScriptCardNode } from './ScriptCardNode';
export { ArtCardNode } from './ArtCardNode';
export { OutputCardNode } from './OutputCardNode';
export { CharacterCardNode } from './CharacterCardNode';
```

- [ ] **Step 2: Update FlowCanvasPanel**

Changes to `FlowCanvasPanel.tsx`:

**a) Replace imports:**
```typescript
// Remove:
import { SceneCardNode } from './nodes/SceneCardNode';
import { AssetCardNode } from './nodes/AssetCardNode';

// Add:
import { ScriptCardNode, ArtCardNode, OutputCardNode, CharacterCardNode } from './nodes';
```

**b) Update nodeTypes:**
```typescript
const nodeTypes: NodeTypes = {
  script: ScriptCardNode,
  art: ArtCardNode,
  output: OutputCardNode,
  character: CharacterCardNode,
};
```

**c) Remove unused imports/features:**
- Remove `import { useDetailStore } from '@drama/stores/detailStore';`
- Remove `import { collectScenes } from '@drama/lib/treeUtils';`
- Remove `import { DeleteConfirmDialog } from '@drama/components/modals/DeleteConfirmDialog';`
- Remove `const addNodeFromAsset = useCanvasStore((s) => s.addNodeFromAsset);`
- Remove `const selectNode = useProjectStore((s) => s.selectNode);`
- Remove `const tree = useProjectStore((s) => s.getCurrentTree());`
- Remove `const deleteTreeNode = useProjectStore((s) => s.deleteTreeNode);`
- Remove `const focusCanvasLinkedId = useDetailStore((s) => s.focusCanvasLinkedId);`
- Remove `const clearFocusCanvas = useDetailStore((s) => s.clearFocusCanvas);`

**d) Remove the focus effect** (the useEffect that watches focusCanvasLinkedId)

**e) Remove tree sync features:**
- Remove `onNodeDoubleClick` handler
- Remove `deleteConfirm` state and related code
- Remove `unlinkedScenes` and "同步到树" context menu
- Remove `onDrop`/`onDragOver` handlers (asset drag from removed AssetManagerPanel)
- Remove `import { addNodeFromAsset }` usage
- Remove the `DeleteConfirmDialog` at the bottom

**f) Keep:**
- `onConnect`, `onNodeDragStop`, `syncNodes`, `syncEdges`, `onNodesChange`, `onEdgesChange`
- `reactFlowRef`, `contextMenu`, basic context menu (edit, duplicate, delete without tree link)
- Background, Controls, ReactFlow layout
- Pro options

**g) Simplify context menu:**
```typescript
const handleContextAction = (action: string) => {
  if (!contextMenu) return;
  switch (action) {
    case 'duplicate':
      duplicateNode(contextMenu.nodeId);
      break;
    case 'delete':
      removeNode(contextMenu.nodeId);
      break;
  }
  closeContextMenu();
};
```

Simplified context menu JSX (remove linked/unlinked tree logic):
```tsx
{contextMenu && (
  <>
    <div className="fixed inset-0 z-40" onClick={closeContextMenu} />
    <div className="fixed z-50 min-w-[160px] rounded-[var(--radius-base)] border border-[var(--color-border-default)] bg-[var(--color-bg-primary)] py-1 shadow-lg"
      style={{ left: contextMenu.x, top: contextMenu.y }}>
      <button onClick={() => handleContextAction('duplicate')} className="block w-full px-3 py-1.5 text-left text-xs hover:bg-[var(--color-bg-secondary)]">
        复制
      </button>
      <button onClick={() => handleContextAction('delete')} className="block w-full px-3 py-1.5 text-left text-xs text-red-500 hover:bg-[var(--color-bg-secondary)]">
        删除
      </button>
    </div>
  </>
)}
```

Also clean up unused state variables: remove `deleteConfirm`, `unlinkedScenes`, `allScenes`, `linkedIds`.

- [ ] **Step 2: Compile check**

Run: `npx tsc --noEmit --project tsconfig.app.json 2>&1 | grep -E "FlowCanvasPanel|nodeTypes" | head -10`
Expected: No new errors

- [ ] **Step 3: Commit**

```bash
git add src/apps/drama/components/flow-canvas/nodes/index.ts src/apps/drama/components/flow-canvas/FlowCanvasPanel.tsx
git commit -m "feat: update FlowCanvasPanel with four new node types and simplified context menu"
```

---

### Task 7: Update remaining files

**Files:**
- Modify: `src/apps/drama/stores/canvasStore.ts` — remove `addNodeFromAsset`
- Modify: `src/apps/drama/stores/sync.ts` — comment out subscribe calls
- Modify: `src/apps/drama/lib/exportPrint.ts` — filter by `type === 'art'`
- Modify: `src/apps/drama/data/mockCanvasData.ts` — new type examples

- [ ] **Step 1: canvasStore — remove addNodeFromAsset**

Remove `addNodeFromAsset` method and its `AssetItem` import.

- [ ] **Step 2: sync.ts — disable tree→canvas sync**

Comment out (don't delete) both `useProjectStore.subscribe` calls in `sync.ts`. Add a comment: `// Phase 3: tree/canvas decoupled — sync disabled`.

- [ ] **Step 3: exportPrint.ts — filter by art type**

Change `findThumbnail` to:
```typescript
const card = nodes.find((n) => n.type === 'art' && n.data.linkedTreeNodeId === nodeId);
```

- [ ] **Step 4: mockCanvasData.ts — new examples**

Replace mock data with examples of the 4 types:
```typescript
export const mockCanvasNodes = [
  { id: 'cn1', type: 'script', position: { x: 100, y: 100 }, data: { title: '场景 1-1 · 咖啡馆邂逅', description: '男主推开咖啡馆的门...', status: 'draft', duration: 15, location: '咖啡馆', timeOfDay: 'morning' } },
  { id: 'cn2', type: 'art', position: { x: 400, y: 100 }, data: { title: '场景 1-1 分镜', thumbnail: '', prompt: '咖啡馆, 阳光, 温暖氛围', tags: ['室内', '温暖'] } },
  { id: 'cn3', type: 'output', position: { x: 100, y: 350 }, data: { title: '第一幕节奏分析', outputType: 'analysis', summary: '3 个建议：场景 1-1 偏慢...' } },
  { id: 'cn4', type: 'character', position: { x: 400, y: 350 }, data: { title: '林小夏', name: '林小夏', role: '女主', age: 25, occupation: '咖啡师', personality: '温柔坚韧，内心敏感' } },
] as CanvasNode[];
```

- [ ] **Step 5: Compile check & tests**

```bash
npx tsc --noEmit --project tsconfig.app.json 2>&1 | grep -c "error TS"
npm test 2>&1 | tail -5
```

- [ ] **Step 6: Commit**

```bash
git add src/apps/drama/stores/canvasStore.ts src/apps/drama/stores/sync.ts src/apps/drama/lib/exportPrint.ts src/apps/drama/data/mockCanvasData.ts
git commit -m "feat: remove addNodeFromAsset, disable tree sync, filter exportPrint by art type, update mock data"
```

---

### Task 8: Update toolRouter — add_canvas_card + refactor generate_storyboard

**Files:**
- Modify: `src/apps/drama/stores/toolRouter.ts`

- [ ] **Step 1: Read current generate_storyboard**

Read `toolRouter.ts` lines ~203-247 to understand current implementation.

- [ ] **Step 2: Refactor generate_storyboard**

Change from "find linked sceneCard, update data" to "create new art card":

```typescript
generate_storyboard: async (params) => {
  const nodeId = params.nodeId as string;
  const stylePrompt = params.stylePrompt as string | undefined;
  // ... image API call (keep existing imageGen logic)
  // After image URL obtained:
  const canvasState = useCanvasStore.getState();
  const node = findNode(tree, nodeId);
  canvasState.addNode({
    id: generateId('canvas_art_'),
    type: 'art' as const,
    position: { x: Math.random() * 300 + 100, y: Math.random() * 300 + 100 },
    data: {
      title: node?.title ?? '分镜图',
      thumbnail: imageUrl,
      prompt: prompt,
      linkedTreeNodeId: nodeId,
      tags: stylePrompt ? [stylePrompt] : [],
    },
  });
  return `已为「${node?.title ?? nodeId}」生成分镜图`;
}
```

- [ ] **Step 3: Add add_canvas_card action**

```typescript
add_canvas_card: async (params) => {
  const type = params.cardType as string;
  const data = params.data as Record<string, unknown> ?? {};
  const canvasState = useCanvasStore.getState();
  canvasState.addNode({
    id: generateId('canvas_'),
    type: type as CanvasNodeType,
    position: { x: Math.random() * 200 + 200, y: Math.random() * 200 + 200 },
    data: { title: data.title ?? '未命名', ...data },
  });
  return `已创建 ${type} 卡片`;
}
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run src/apps/drama/stores/toolRouter.test.ts
```
Expected: Fix any broken tests related to canvas type changes.

- [ ] **Step 5: Commit**

```bash
git add src/apps/drama/stores/toolRouter.ts
git commit -m "feat: refactor generate_storyboard to create art cards, add add_canvas_card action"
```

---

### Task 9: Fix all tests & final verification

- [ ] **Step 1: Run full test suite**

```bash
npm test 2>&1 | tail -20
```
Expected: Fix all failing tests. Likely issues: toolRouter tests, canvasStore tests, any test referencing `sceneCard` or `assetCard`.

- [ ] **Step 2: Fix canvasStore test**

Update `canvasStore.test.ts` to use new types (`script`/`art`/`output`/`character`).

- [ ] **Step 3: Run lint**

```bash
npm run lint 2>&1 | tail -5
```

- [ ] **Step 4: Vite build**

```bash
npx vite build 2>&1 | tail -5
```

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "chore: fix tests for new canvas card types, final cleanup"
```
