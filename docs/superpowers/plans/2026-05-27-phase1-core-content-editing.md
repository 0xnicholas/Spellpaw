> 🗄️ **归档文档** — 本计划已执行完毕（2026-05-27）。Phase 1 所有功能已上线。后续开发请参考 `AGENTS.md` 和 `docs/ROADMAP.md`。

# Phase 1: Core Content Editing — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the read-only mock prototype into a fully functional content editing tool with tree CRUD, detail panel, canvas editing, project management, and bidirectional sync — all offline via localStorage.

**Architecture:** Extend existing Zustand stores with new actions; refactor stores for multi-project support; add a detail store for panel state; build new UI components (TabBar, DetailPanel, forms, modals) that integrate into the existing three-panel resizable layout; replace the implicit `canvas_{id}` linking with explicit `linkedTreeNodeId`.

**Tech Stack:** React 19 + TypeScript + Vite, Zustand (persist), Tailwind CSS, @xyflow/react, @dnd-kit/core + @dnd-kit/sortable, lucide-react, vitest

**Reference Spec:** `docs/specs/2026-05-27-phase1-core-content-editing.md`

---

## ⚠️ Execution Order

Tasks must be executed in this order:

1. **Foundation** (Tasks 1–6): Types, utilities, test setup, stores
2. **Structural Refactor** (Task 7): Multi-project store refactor — **MUST complete before any UI tasks**
3. **Base UI** (Tasks 8–10): Components that don't depend on store internals
4. **Tree CRUD** (Task 11): Tree node editing with DnD
5. **Detail Panel** (Tasks 12–13): Forms, tab layout, auto-save
6. **Canvas** (Tasks 14–15): Card editing, context menu, note creation
7. **Project Mgmt** (Tasks 16–17): Modal, import/export, metadata edit
8. **Sync & Polish** (Tasks 18–20): Bidirectional sync, shortcuts, final testing

---

## File Structure

### Modified Files
| File | Responsibility |
|------|---------------|
| `src/types/index.ts` | Expand `TreeNode.metadata`, add `linkedTreeNodeId` to `CanvasNodeData` |
| `src/stores/projectStore.ts` | Multi-project refactor, `moveTreeNode`, metadata deep-merge, `createdAt` auto-init |
| `src/stores/canvasStore.ts` | Multi-project refactor, `updateNodeData`, `duplicateNode`, sync guard |
| `src/stores/authStore.ts` | Add `version: 1` to persist config |
| `src/components/tree-view/TreeNode.tsx` | Drag handle, context menu, status click, inline edit, tooltip |
| `src/components/tree-view/TreeViewPanel.tsx` | DnD context, reorder handler |
| `src/components/chat-panel/ChatPanel.tsx` | TabBar/TabPanel, auto-switch to Details, DetailPanel |
| `src/components/flow-canvas/FlowCanvasPanel.tsx` | Note card button, context menu wiring |
| `src/components/flow-canvas/nodes/SceneCardNode.tsx` | Double-click edit, sync guard |
| `src/components/flow-canvas/nodes/NoteCardNode.tsx` | Double-click edit, color picker |
| `src/components/flow-canvas/nodes/AssetCardNode.tsx` | Double-click edit |
| `src/pages/ProjectListPage.tsx` | New Project button, import, export, context menu |
| `src/pages/WorkspacePage.tsx` | `Escape` handler, `Delete` confirm, `F2` rename trigger |
| `src/layouts/Navbar.tsx` | Inline project title edit |
| `src/test/setup.ts` | Add `localStorage` mock |

### New Files
| File | Responsibility |
|------|---------------|
| `src/stores/detailStore.ts` | `activeTab`, `draftFormData`, panel visibility |
| `src/components/ui/TabBar.tsx` | `[Chat \| Details]` tab switcher |
| `src/components/ui/TabPanel.tsx` | Tab content wrapper |
| `src/components/ui/EditableTitle.tsx` | Inline title input (tree + canvas) |
| `src/components/ui/FormField.tsx` | Reusable label + input/textarea/select |
| `src/components/ui/Tooltip.tsx` | Hover tooltip (Radix Primitive) |
| `src/components/ui/ColorPicker.tsx` | Preset color swatches (accepts `colors` prop) |
| `src/components/ui/AutoSaveIndicator.tsx` | Subtle dot in Detail Panel header |
| `src/components/detail-panel/DetailPanel.tsx` | Container: decides Scene/Shot/Project view |
| `src/components/detail-panel/SceneDetailForm.tsx` | Scene metadata form |
| `src/components/detail-panel/ShotDetailForm.tsx` | Shot metadata form |
| `src/components/detail-panel/ProjectSummary.tsx` | Read-only project/act summary |
| `src/components/modals/NewProjectModal.tsx` | Create project dialog |
| `src/components/modals/DeleteConfirmDialog.tsx` | Reusable confirmation dialog |
| `src/components/modals/ProjectSettingsModal.tsx` | Edit project title/description |
| `src/lib/treeUtils.ts` | Pure helpers: `findNode`, `findParent`, `getSiblings`, `walkTree`, `collectScenes` |
| `src/lib/exportImport.ts` | JSON export/import logic |
| `src/hooks/useDebounce.ts` | Generic debounce hook for form auto-save |

---

## Dependency Installation

```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
npm install @radix-ui/react-tooltip
```

---

## Task 1: Expand Types

**Files:**
- Modify: `src/types/index.ts`

- [ ] **Step 1: Write the type changes**

Add to `TreeNode.metadata`:
```ts
location?: string;
timeOfDay?: 'morning' | 'day' | 'evening' | 'night';
shotType?: 'wide' | 'medium' | 'close-up' | 'insert' | 'pov';
cameraMovement?: 'static' | 'pan' | 'tilt' | 'dolly' | 'handheld';
dialogue?: string;
notes?: string;
```

Add to `CanvasNodeData`:
```ts
linkedTreeNodeId?: string;
```

- [ ] **Step 2: Run TypeScript check**

```bash
npx tsc --noEmit
```
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add src/types/index.ts
git commit -m "types: expand TreeNode metadata and add linkedTreeNodeId"
```

---

## Task 2: Tree Utility Helpers

**Files:**
- Create: `src/lib/treeUtils.ts`
- Test: `src/lib/treeUtils.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
import { describe, it, expect } from 'vitest';
import { findNode, findParent, getSiblings, walkTree, collectScenes } from './treeUtils';
import type { TreeNode } from '@/types';

const tree: TreeNode = {
  id: 'root', type: 'project', title: 'Root', status: 'draft',
  children: [
    { id: 'a', type: 'act', title: 'Act 1', status: 'draft',
      children: [
        { id: 's1', type: 'scene', title: 'Scene 1', status: 'draft', metadata: { createdAt: '', updatedAt: '' } },
        { id: 's2', type: 'scene', title: 'Scene 2', status: 'draft', metadata: { createdAt: '', updatedAt: '' } }
      ]
    }
  ]
};

describe('findNode', () => {
  it('finds nested node', () => {
    expect(findNode(tree, 's1')?.title).toBe('Scene 1');
  });
  it('returns null for missing', () => {
    expect(findNode(tree, 'xxx')).toBeNull();
  });
});

describe('findParent', () => {
  it('finds parent of nested node', () => {
    expect(findParent(tree, 's1')?.id).toBe('a');
  });
});

describe('getSiblings', () => {
  it('returns sibling array including target', () => {
    expect(getSiblings(tree, 's1')).toHaveLength(2);
  });
});

describe('collectScenes', () => {
  it('returns all scene nodes', () => {
    expect(collectScenes(tree)).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

```bash
npx vitest run src/lib/treeUtils.test.ts
```
Expected: Functions not defined.

- [ ] **Step 3: Implement helpers**

```ts
import type { TreeNode } from '@/types';

export function findNode(root: TreeNode | null, id: string): TreeNode | null {
  if (!root) return null;
  if (root.id === id) return root;
  if (root.children) {
    for (const child of root.children) {
      const found = findNode(child, id);
      if (found) return found;
    }
  }
  return null;
}

export function findParent(root: TreeNode | null, id: string): TreeNode | null {
  if (!root || root.id === id) return null;
  if (root.children) {
    for (const child of root.children) {
      if (child.id === id) return root;
      const found = findParent(child, id);
      if (found) return found;
    }
  }
  return null;
}

export function getSiblings(root: TreeNode | null, id: string): TreeNode[] {
  const parent = findParent(root, id);
  return parent?.children ?? [];
}

export function walkTree(root: TreeNode | null, callback: (node: TreeNode) => void) {
  if (!root) return;
  callback(root);
  root.children?.forEach((child) => walkTree(child, callback));
}

export function collectScenes(root: TreeNode | null): TreeNode[] {
  const scenes: TreeNode[] = [];
  walkTree(root, (node) => {
    if (node.type === 'scene') scenes.push(node);
  });
  return scenes;
}
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
npx vitest run src/lib/treeUtils.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/treeUtils.ts src/lib/treeUtils.test.ts
git commit -m "feat: add tree traversal utilities with tests"
```

---

## Task 3: Fix Test Setup (localStorage Mock + authStore Version)

**Files:**
- Modify: `src/test/setup.ts`
- Modify: `src/stores/authStore.ts`

- [ ] **Step 1: Add localStorage mock**

```ts
// src/test/setup.ts
class LocalStorageMock {
  store: Record<string, string> = {};
  getItem(key: string) { return this.store[key] ?? null; }
  setItem(key: string, value: string) { this.store[key] = String(value); }
  removeItem(key: string) { delete this.store[key]; }
  clear() { this.store = {}; }
}
Object.defineProperty(globalThis, 'localStorage', { value: new LocalStorageMock() });
```

- [ ] **Step 2: Add version to authStore**

```ts
// In authStore persist config:
{
  name: 'spellpaw_auth',
  version: 1,
}
```

- [ ] **Step 3: Run existing store tests**

```bash
npx vitest run src/stores/
```
Expected: Previously failing tests now pass.

- [ ] **Step 4: Commit**

```bash
git add src/test/setup.ts src/stores/authStore.ts
git commit -m "test: add localStorage mock; add authStore persist version"
```

---

## Task 4: Create detailStore

**Files:**
- Create: `src/stores/detailStore.ts`
- Test: `src/stores/detailStore.test.ts`

- [ ] **Step 1: Write failing test**

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useDetailStore } from './detailStore';

describe('detailStore', () => {
  beforeEach(() => {
    useDetailStore.setState({ activeTab: 'chat', draftFormData: null });
  });

  it('defaults to chat tab', () => {
    expect(useDetailStore.getState().activeTab).toBe('chat');
  });

  it('switches to details tab', () => {
    useDetailStore.getState().setActiveTab('details');
    expect(useDetailStore.getState().activeTab).toBe('details');
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npx vitest run src/stores/detailStore.test.ts
```

- [ ] **Step 3: Implement store**

```ts
import { create } from 'zustand';
import type { TreeNode } from '@/types';

interface DetailState {
  activeTab: 'chat' | 'details';
  draftFormData: Partial<TreeNode> | null;
  setActiveTab: (tab: 'chat' | 'details') => void;
  setDraftFormData: (data: Partial<TreeNode> | null) => void;
}

export const useDetailStore = create<DetailState>((set) => ({
  activeTab: 'chat',
  draftFormData: null,
  setActiveTab: (tab) => set({ activeTab: tab }),
  setDraftFormData: (data) => set({ draftFormData: data }),
}));
```

- [ ] **Step 4: Run test — expect PASS**

```bash
npx vitest run src/stores/detailStore.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/stores/detailStore.ts src/stores/detailStore.test.ts
git commit -m "feat: add detailStore for panel tab state"
```

---

## Task 5: Extend projectStore (Single-Project API)

**Files:**
- Modify: `src/stores/projectStore.ts`
- Test: `src/stores/projectStore.test.ts`

- [ ] **Step 1: Write failing test for moveTreeNode**

```ts
it('moves node within siblings', () => {
  useProjectStore.getState().moveTreeNode('tree_scene_1_2', 0);
  const tree = useProjectStore.getState().treeData;
  expect(tree?.children?.[0]?.children?.[0]?.id).toBe('tree_scene_1_2');
});
```

- [ ] **Step 2: Implement actions on single-project store**

Extend the existing `projectStore` with these changes:

```ts
// persist config:
{
  name: 'spellpaw_project',
  version: 2,
  migrate: (persistedState: any, version) => {
    if (version < 2) {
      function fillMeta(node: any) {
        if (!node.metadata) node.metadata = {};
        node.metadata.duration ??= 0;
        node.metadata.createdAt ??= new Date().toISOString();
        node.metadata.updatedAt ??= new Date().toISOString();
        node.children?.forEach(fillMeta);
      }
      if (persistedState.treeData) fillMeta(persistedState.treeData);
    }
    return persistedState as any;
  },
}

// addTreeNode — auto-inject metadata:
addTreeNode: (parentId, node) =>
  set(
    produce((state) => {
      const now = new Date().toISOString();
      const newNode = {
        ...node,
        metadata: {
          duration: 0,
          createdAt: now,
          updatedAt: now,
          ...node.metadata,
        },
      };
      function walk(n: TreeNode) {
        if (n.id === parentId) {
          if (!n.children) n.children = [];
          n.children.push(newNode);
          n.expanded = true;
          return true;
        }
        if (n.children) {
          for (const child of n.children) {
            if (walk(child)) return true;
          }
        }
        return false;
      }
      if (state.treeData) walk(state.treeData);
    })
  ),

// moveTreeNode — new:
moveTreeNode: (nodeId, newIndex) =>
  set(
    produce((state) => {
      function walk(n: TreeNode): boolean {
        if (!n.children) return false;
        const idx = n.children.findIndex((c) => c.id === nodeId);
        if (idx !== -1) {
          const [node] = n.children.splice(idx, 1);
          n.children.splice(newIndex, 0, node);
          return true;
        }
        for (const child of n.children) {
          if (walk(child)) return true;
        }
        return false;
      }
      if (state.treeData) walk(state.treeData);
    })
  ),

// updateTreeNode — deep-merge metadata, sync timestamp:
updateTreeNode: (nodeId, updates, source = 'ui') =>
  set(
    produce((state) => {
      function walk(node: TreeNode) {
        if (node.id === nodeId) {
          if (updates.metadata && node.metadata) {
            Object.assign(node.metadata, updates.metadata);
          }
          Object.assign(node, { ...updates, metadata: node.metadata });
          if (node.metadata) node.metadata.updatedAt = new Date().toISOString();
          return true;
        }
        if (node.children) {
          for (const child of node.children) {
            if (walk(child)) return true;
          }
        }
        return false;
      }
      if (state.treeData) walk(state.treeData);
      // Sync to canvas if not originating from canvas (handled in Task 18)
    })
  ),

// deleteTreeNode — also remove linked canvas card:
deleteTreeNode: (nodeId) =>
  set(
    produce((state) => {
      function walk(n: TreeNode): boolean {
        if (!n.children) return false;
        const idx = n.children.findIndex((c) => c.id === nodeId);
        if (idx !== -1) {
          n.children.splice(idx, 1);
          return true;
        }
        for (const child of n.children) {
          if (walk(child)) return true;
        }
        return false;
      }
      if (state.treeData && state.treeData.id !== nodeId) {
        walk(state.treeData);
      }
      if (state.selectedNodeId === nodeId) {
        state.selectedNodeId = null;
      }
      // Canvas cleanup is done by the caller or a combined hook
      // (see Task 18 for store-integrated approach)
    })
  ),
```

- [ ] **Step 3: Run projectStore tests**

```bash
npx vitest run src/stores/projectStore.test.ts
```

- [ ] **Step 4: Commit**

```bash
git add src/stores/projectStore.ts src/stores/projectStore.test.ts
git commit -m "feat: extend projectStore with moveTreeNode, metadata auto-init, migration"
```

---

## Task 6: Extend canvasStore (Single-Project API)

**Files:**
- Modify: `src/stores/canvasStore.ts`
- Test: `src/stores/canvasStore.test.ts`

- [ ] **Step 1: Write failing tests**

```ts
it('updates node data', () => {
  useCanvasStore.getState().addNode({
    id: 'test_1', type: 'sceneCard', position: { x: 0, y: 0 },
    data: { title: 'Old', status: 'draft' }
  });
  useCanvasStore.getState().updateNodeData('test_1', { title: 'New' });
  expect(useCanvasStore.getState().persistedNodes[0].data.title).toBe('New');
});

it('duplicates node as orphan', () => {
  useCanvasStore.getState().addNode({
    id: 'test_1', type: 'sceneCard', position: { x: 0, y: 0 },
    data: { title: 'Original', linkedTreeNodeId: 'tree_1' }
  });
  useCanvasStore.getState().duplicateNode('test_1');
  const dup = useCanvasStore.getState().persistedNodes[1];
  expect(dup.data.title).toBe('Original');
  expect(dup.data.linkedTreeNodeId).toBeUndefined();
});
```

- [ ] **Step 2: Implement actions**

```ts
updateNodeData: (id, data, source = 'ui') =>
  set((state) => {
    const node = state.persistedNodes.find((n) => n.id === id);
    if (!node) return state;
    const newData = { ...node.data, ...data };
    return {
      persistedNodes: state.persistedNodes.map((n) =>
        n.id === id ? { ...n, data: newData } : n
      ),
    };
  }),

duplicateNode: (id) => {
  const node = get().persistedNodes.find((n) => n.id === id);
  if (!node) return;
  const newNode = {
    ...node,
    id: generateId('canvas_'),
    position: { x: node.position.x + 40, y: node.position.y + 40 },
    data: { ...node.data, linkedTreeNodeId: undefined },
  };
  get().addNode(newNode);
},
```

Note: Bidirectional sync (canvas → tree) is handled in Task 18, not here, to avoid circular dependencies between stores during initialization.

- [ ] **Step 3: Run tests**

```bash
npx vitest run src/stores/canvasStore.test.ts
```

- [ ] **Step 4: Commit**

```bash
git add src/stores/canvasStore.ts src/stores/canvasStore.test.ts
git commit -m "feat: extend canvasStore with updateNodeData, duplicateNode"
```

---

## Task 7: Multi-Project Store Refactor

**⚠️ CRITICAL: Complete this task BEFORE Task 8 and all subsequent UI tasks.**

**Files:**
- Modify: `src/stores/projectStore.ts`
- Modify: `src/stores/canvasStore.ts`

Current stores use a single `treeData` and `persistedNodes`. For multiple projects, data must be keyed by `projectId`.

- [ ] **Step 1: Refactor projectStore**

Change state shape:
```ts
interface ProjectState {
  projects: Project[];
  trees: Record<string, TreeNode>;        // keyed by projectId
  currentProjectId: string | null;
  selectedNodeId: string | null;

  // Actions
  getCurrentTree: () => TreeNode | null;
  setCurrentProject: (id: string) => void;
  createProject: (title: string, description: string, coverColor: string) => string;
  deleteProject: (id: string) => void;
  addTreeNode: (parentId: string, node: TreeNode) => void;
  // ... (all existing tree CRUD actions now operate on getCurrentTree())
}
```

Implementation approach:
- Replace all `state.treeData` references with `state.trees[state.currentProjectId]`
- Add `getCurrentTree: () => get().currentProjectId ? get().trees[get().currentProjectId] : null`
- `createProject` generates a new project + empty tree root, returns projectId
- `deleteProject` removes project from `projects`, removes tree from `trees`, removes canvas from `canvasStore`
- Persist `projects`, `trees`, `currentProjectId` (not `selectedNodeId` — reset on load)

- [ ] **Step 2: Refactor canvasStore**

Change state shape:
```ts
interface CanvasState {
  canvases: Record<string, { nodes: CanvasNode[]; edges: CanvasEdge[]; viewport: Viewport }>;

  getCurrentNodes: () => CanvasNode[];
  getCurrentEdges: () => CanvasEdge[];
  // All actions operate on current project canvas
}
```

Use `useProjectStore.getState().currentProjectId` as the key.

- [ ] **Step 3: Update all store consumers**

In `projectStore.ts`, replace `state.treeData` with `state.trees[state.currentProjectId]` everywhere.
In `canvasStore.ts`, replace `state.persistedNodes` with `state.canvases[projectId]?.nodes ?? []`.

- [ ] **Step 4: Run tests**

```bash
npx vitest run src/stores/
```
Expected: Some tests will need updating to set `currentProjectId` before operating.

- [ ] **Step 5: Commit**

```bash
git add src/stores/projectStore.ts src/stores/canvasStore.ts
git commit -m "refactor: store tree and canvas data per-project"
```

---

## Task 8: Base UI Components

### 8a: Tooltip

**Files:**
- Create: `src/components/ui/Tooltip.tsx`

- [ ] **Step 1: Implement**

```tsx
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { cn } from '@/lib/utils';

export function Tooltip({ children, content }: { children: React.ReactNode; content: string }) {
  return (
    <TooltipPrimitive.Provider>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            className={cn(
              'z-50 rounded-[var(--radius-sm)] bg-[var(--color-base-gray-900)] px-2 py-1 text-xs text-white shadow-sm'
            )}
            sideOffset={4}
          >
            {content}
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ui/Tooltip.tsx
git commit -m "feat: add Tooltip component"
```

### 8b: EditableTitle

**Files:**
- Create: `src/components/ui/EditableTitle.tsx`

- [ ] **Step 1: Implement**

```tsx
import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { cn } from '@/lib/utils';

export interface EditableTitleRef {
  startEdit: () => void;
}

interface EditableTitleProps {
  value: string;
  onSave: (value: string) => void;
  className?: string;
  inputClassName?: string;
}

export const EditableTitle = forwardRef<EditableTitleRef, EditableTitleProps>(
  ({ value, onSave, className, inputClassName }, ref) => {
    const [isEditing, setIsEditing] = useState(false);
    const [draft, setDraft] = useState(value);
    const inputRef = useRef<HTMLInputElement>(null);

    useImperativeHandle(ref, () => ({
      startEdit: () => {
        setDraft(value);
        setIsEditing(true);
      },
    }));

    useEffect(() => {
      if (isEditing) {
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    }, [isEditing]);

    const handleSave = () => {
      if (draft.trim() && draft.trim() !== value) {
        onSave(draft.trim());
      }
      setIsEditing(false);
      setDraft(value);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') handleSave();
      if (e.key === 'Escape') {
        setIsEditing(false);
        setDraft(value);
      }
    };

    if (isEditing) {
      return (
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          className={cn(
            'rounded-[var(--radius-sm)] border border-[var(--color-accent-500)] bg-[var(--color-bg-primary)] px-1.5 py-0.5 text-xs outline-none',
            inputClassName
          )}
        />
      );
    }

    return (
      <span
        onDoubleClick={() => { setDraft(value); setIsEditing(true); }}
        className={cn('cursor-text', className)}
        title="Double-click to edit"
      >
        {value}
      </span>
    );
  }
);
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ui/EditableTitle.tsx
git commit -m "feat: add EditableTitle component with imperative startEdit"
```

### 8c: FormField

**Files:**
- Create: `src/components/ui/FormField.tsx`

- [ ] **Step 1: Implement**

```tsx
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface FormFieldProps {
  label: string;
  children: ReactNode;
  className?: string;
}

export function FormField({ label, children, className }: FormFieldProps) {
  return (
    <div className={cn('space-y-1', className)}>
      <label className="text-[11px] font-medium text-[var(--color-text-secondary)]">{label}</label>
      {children}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ui/FormField.tsx
git commit -m "feat: add FormField component"
```

### 8d: ColorPicker (with `colors` prop)

**Files:**
- Create: `src/components/ui/ColorPicker.tsx`

- [ ] **Step 1: Implement**

```tsx
import { cn } from '@/lib/utils';

const DEFAULT_COLORS = [
  '#fef3c7', '#fde68a', '#fed7aa', '#fecaca',
  '#e9d5ff', '#ddd6fe', '#c7d2fe', '#bfdbfe',
  '#a5f3fc', '#99f6e4', '#bbf7d0', '#dcfce7',
];

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  colors?: string[];
}

export function ColorPicker({ value, onChange, colors = DEFAULT_COLORS }: ColorPickerProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {colors.map((color) => (
        <button
          key={color}
          onClick={() => onChange(color)}
          className={cn(
            'h-6 w-6 rounded-[var(--radius-sm)] border transition-all',
            value === color
              ? 'border-[var(--color-accent-500)] ring-1 ring-[var(--color-accent-500)]'
              : 'border-[var(--color-border-default)] hover:border-[var(--color-text-secondary)]'
          )}
          style={{ backgroundColor: color }}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ui/ColorPicker.tsx
git commit -m "feat: add ColorPicker component with customizable palette"
```

### 8e: TabBar / TabPanel

**Files:**
- Create: `src/components/ui/TabBar.tsx`
- Create: `src/components/ui/TabPanel.tsx`

- [ ] **Step 1: Implement**

```tsx
// TabBar.tsx
import { cn } from '@/lib/utils';

interface TabBarProps {
  tabs: { id: string; label: string }[];
  activeTab: string;
  onChange: (id: string) => void;
}

export function TabBar({ tabs, activeTab, onChange }: TabBarProps) {
  return (
    <div className="flex border-b border-[var(--color-border-default)]">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            'flex-1 py-2 text-xs font-medium transition-colors',
            activeTab === tab.id
              ? 'border-b-2 border-[var(--color-accent-500)] text-[var(--color-accent-500)]'
              : 'text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]'
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

// TabPanel.tsx
import { cn } from '@/lib/utils';

interface TabPanelProps {
  children: React.ReactNode;
  isActive: boolean;
  className?: string;
}

export function TabPanel({ children, isActive, className }: TabPanelProps) {
  if (!isActive) return null;
  return <div className={cn('h-full overflow-auto', className)}>{children}</div>;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ui/TabBar.tsx src/components/ui/TabPanel.tsx
git commit -m "feat: add TabBar and TabPanel components"
```

### 8f: AutoSaveIndicator

**Files:**
- Create: `src/components/ui/AutoSaveIndicator.tsx`

- [ ] **Step 1: Implement**

```tsx
import { useDetailStore } from '@/stores/detailStore';

export function AutoSaveIndicator() {
  const draft = useDetailStore((s) => s.draftFormData);
  return (
    <div className="flex items-center gap-1.5">
      {draft ? (
        <>
          <span className="h-2 w-2 rounded-full bg-[var(--color-accent-500)] animate-pulse" />
          <span className="text-[10px] text-[var(--color-text-tertiary)]">Saving...</span>
        </>
      ) : (
        <span className="h-2 w-2 rounded-full bg-green-500" title="All changes saved" />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ui/AutoSaveIndicator.tsx
git commit -m "feat: add AutoSaveIndicator component"
```

### 8g: useDebounce Hook

**Files:**
- Create: `src/hooks/useDebounce.ts`

- [ ] **Step 1: Implement**

```ts
import { useState, useEffect } from 'react';

export function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useDebounce.ts
git commit -m "feat: add useDebounce hook"
```

---

## Task 9: DeleteConfirmDialog

**Files:**
- Create: `src/components/modals/DeleteConfirmDialog.tsx`

- [ ] **Step 1: Implement**

```tsx
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface DeleteConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteConfirmDialog({
  isOpen, title, description, confirmLabel = 'Delete', onConfirm, onCancel
}: DeleteConfirmDialogProps) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="w-full max-w-sm rounded-[var(--radius-base)] border border-[var(--color-border-default)] bg-[var(--color-bg-primary)] p-6 shadow-lg">
        <div className="mb-4 flex items-center gap-2 text-[var(--color-text-primary)]">
          <AlertTriangle className="h-5 w-5 text-amber-500" />
          <h3 className="text-sm font-semibold">{title}</h3>
        </div>
        <p className="mb-6 text-xs text-[var(--color-text-secondary)]">{description}</p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
          <Button variant="danger" size="sm" onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/modals/DeleteConfirmDialog.tsx
git commit -m "feat: add DeleteConfirmDialog component"
```

---

## Task 10: Tree Node CRUD Integration

**Files:**
- Modify: `src/components/tree-view/TreeNode.tsx`
- Modify: `src/components/tree-view/TreeViewPanel.tsx`

### 10a: TreeNode — Inline Edit + Status Toggle + Drag Handle + Tooltip

- [ ] **Step 1: Modify TreeNode.tsx**

Key changes:
1. Import `EditableTitle`, `Tooltip`, `GripVertical`
2. Replace static title with `<EditableTitle ref={titleRef} value={node.title} onSave={...} />`
3. Add `onStatusChange` prop; status dot cycles on click
4. Add drag handle with `GripVertical` (visible on hover)
5. Wrap status dot with `Tooltip` showing full label
6. Add `onAddChild`, `onDelete` props for context menu

```tsx
import { forwardRef, useRef } from 'react';
import { ChevronRight, ChevronDown, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EditableTitle, type EditableTitleRef } from '@/components/ui/EditableTitle';
import { Tooltip } from '@/components/ui/Tooltip';
import type { TreeNode as TreeNodeType } from '@/types';

interface TreeNodeProps {
  node: TreeNodeType;
  depth: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
  onStatusChange?: (id: string, status: TreeNodeType['status']) => void;
  onTitleChange?: (id: string, title: string) => void;
  onAddChild?: (parentId: string, type: TreeNodeType['type']) => void;
  onDelete?: (id: string, childCount: number) => void;
  dragHandleProps?: Record<string, any>;
}

const statusColors: Record<string, string> = {
  draft: 'bg-[var(--color-base-gray-400)]',
  in_progress: 'bg-[var(--color-accent-500)]',
  review: 'bg-amber-400',
  done: 'bg-green-500',
};

const statusLabels: Record<string, string> = {
  draft: 'Draft',
  in_progress: 'In Progress',
  review: 'Review',
  done: 'Done',
};

const nextStatus = {
  draft: 'in_progress' as const,
  in_progress: 'review' as const,
  review: 'done' as const,
  done: 'draft' as const,
};

const typeLabels: Record<string, string> = {
  project: 'Project',
  act: 'Act',
  scene: 'Scene',
  shot: 'Shot',
};

export const TreeNodeItem = forwardRef<HTMLDivElement, TreeNodeProps>(
  ({ node, depth, selectedId, onSelect, onToggle, onStatusChange, onTitleChange, dragHandleProps }, ref) => {
    const hasChildren = node.children && node.children.length > 0;
    const isSelected = selectedId === node.id;
    const titleRef = useRef<EditableTitleRef>(null);

    return (
      <div ref={ref}>
        <button
          onClick={() => onSelect(node.id)}
          className={cn(
            'group flex w-full items-center gap-1.5 py-1 pr-2 text-left transition-colors',
            isSelected
              ? 'bg-[var(--color-accent-50)] text-[var(--color-accent-700)]'
              : 'hover:bg-[var(--color-bg-tertiary)] text-[var(--color-text-primary)]'
          )}
          style={{ paddingLeft: `${depth * 16 + 4}px` }}
        >
          {/* Drag handle */}
          <span
            className="flex h-4 w-4 shrink-0 cursor-grab items-center justify-center text-[var(--color-text-tertiary)] opacity-0 group-hover:opacity-100"
            {...(dragHandleProps ?? {})}
          >
            <GripVertical className="h-3 w-3" />
          </span>

          {/* Expand toggle */}
          {hasChildren ? (
            <span
              onClick={(e) => { e.stopPropagation(); onToggle(node.id); }}
              className="flex h-4 w-4 shrink-0 cursor-pointer items-center justify-center rounded-sm text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg-secondary)]"
            >
              {node.expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            </span>
          ) : (
            <span className="h-4 w-4 shrink-0" />
          )}

          {/* Status dot with tooltip */}
          <Tooltip content={statusLabels[node.status]}>
            <span
              onClick={(e) => {
                e.stopPropagation();
                onStatusChange?.(node.id, nextStatus[node.status]);
              }}
              className={cn('h-1.5 w-1.5 shrink-0 rounded-full cursor-pointer', statusColors[node.status])}
            />
          </Tooltip>

          {/* Editable title */}
          <span className="truncate text-xs">
            <EditableTitle
              ref={titleRef}
              value={node.title}
              onSave={(newTitle) => onTitleChange?.(node.id, newTitle)}
            />
          </span>

          {/* Type label */}
          <span className="ml-auto shrink-0 text-[10px] text-[var(--color-text-tertiary)] opacity-0 group-hover:opacity-100 transition-opacity">
            {typeLabels[node.type]}
          </span>
        </button>

        {/* Children */}
        {hasChildren && node.expanded && (
          <div>
            {node.children!.map((child) => (
              <TreeNodeItem
                key={child.id}
                node={child}
                depth={depth + 1}
                selectedId={selectedId}
                onSelect={onSelect}
                onToggle={onToggle}
                onStatusChange={onStatusChange}
                onTitleChange={onTitleChange}
              />
            ))}
          </div>
        )}
      </div>
    );
  }
);
```

- [ ] **Step 2: Commit**

```bash
git add src/components/tree-view/TreeNode.tsx
git commit -m "feat: integrate EditableTitle, status toggle, drag handle, tooltip into TreeNode"
```

### 10b: TreeNode Context Menu

- [ ] **Step 1: Modify TreeViewPanel.tsx to pass context menu callbacks**

The context menu is triggered via right-click on the tree node. Use the existing `ContextMenu` component from `@/components/ui/ContextMenu`.

```tsx
// In TreeViewPanel, pass these to TreeNodeItem:
onAddChild={(parentId, type) => {
  const childType = type === 'project' ? 'act' : type === 'act' ? 'scene' : 'shot';
  const newNode: TreeNode = {
    id: generateId(`tree_${childType}_`),
    type: childType,
    title: `New ${childType.charAt(0).toUpperCase() + childType.slice(1)}`,
    status: 'draft',
  };
  addTreeNode(parentId, newNode);
}}

onDelete={(id, childCount) => {
  if (childCount > 0) {
    setDeleteTarget({ id, childCount });
  } else {
    deleteTreeNode(id);
  }
}}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/tree-view/TreeViewPanel.tsx
git commit -m "feat: add context menu actions to tree nodes"
```

### 10c: TreeViewPanel — DnD Integration with @dnd-kit

**Important:** `@dnd-kit/sortable` requires a flat list. For tree siblings-only reorder, wrap each parent's children in a separate `SortableContext`.

- [ ] **Step 1: Implement per-parent SortableContext**

```tsx
import { DndContext, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { getSiblings } from '@/lib/treeUtils';

// In TreeViewPanel:
const sensors = useSensors(
  useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
);

const handleDragEnd = (event: DragEndEvent) => {
  const { active, over } = event;
  if (!over || active.id === over.id) return;
  const tree = getCurrentTree();
  if (!tree) return;
  const siblings = getSiblings(tree, active.id as string);
  const oldIndex = siblings.findIndex((n) => n.id === active.id);
  const newIndex = siblings.findIndex((n) => n.id === over.id);
  if (oldIndex !== -1 && newIndex !== -1) {
    moveTreeNode(active.id as string, newIndex);
  }
};

// TreeNodeItem with useSortable:
const TreeNodeItem = forwardRef<HTMLDivElement, TreeNodeProps>(
  ({ node, depth, ...props }, forwardedRef) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: node.id });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.5 : 1,
    };

    return (
      <div ref={setNodeRef} style={style}>
        {/* ... existing node rendering ... */}
        {/* Pass listeners/attributes to drag handle */}
        {hasChildren && node.expanded && (
          <SortableContext
            items={node.children!.map((c) => c.id)}
            strategy={verticalListSortingStrategy}
          >
            {node.children!.map((child) => (
              <TreeNodeItem key={child.id} node={child} depth={depth + 1} {...props} />
            ))}
          </SortableContext>
        )}
      </div>
    );
  }
);
```

- [ ] **Step 2: Commit**

```bash
git add src/components/tree-view/TreeViewPanel.tsx src/components/tree-view/TreeNode.tsx
git commit -m "feat: add drag-to-reorder for tree siblings via @dnd-kit"
```

---

## Task 11: Detail Panel Components

### 11a: SceneDetailForm (with debounced save)

**Files:**
- Create: `src/components/detail-panel/SceneDetailForm.tsx`

- [ ] **Step 1: Implement**

```tsx
import { useEffect, useState } from 'react';
import { FormField } from '@/components/ui/FormField';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { useDebounce } from '@/hooks/useDebounce';
import type { TreeNode } from '@/types';

interface SceneDetailFormProps {
  node: TreeNode;
  onChange: (updates: Partial<TreeNode>) => void;
}

export function SceneDetailForm({ node, onChange }: SceneDetailFormProps) {
  const [local, setLocal] = useState(node);
  const debouncedLocal = useDebounce(local, 300);

  useEffect(() => { setLocal(node); }, [node]);

  // Auto-save to store when debounced value changes
  useEffect(() => {
    onChange({
      title: debouncedLocal.title !== node.title ? debouncedLocal.title : undefined,
      metadata: {
        description: debouncedLocal.metadata?.description,
        duration: debouncedLocal.metadata?.duration,
        location: debouncedLocal.metadata?.location,
        timeOfDay: debouncedLocal.metadata?.timeOfDay,
        notes: debouncedLocal.metadata?.notes,
      },
    });
  }, [debouncedLocal]);

  const handleChange = (field: string, value: any) => {
    setLocal((prev) => ({
      ...prev,
      metadata: { ...prev.metadata, [field]: value },
    }));
  };

  return (
    <div className="space-y-4 p-4">
      <FormField label="Title">
        <Input
          value={local.title}
          onChange={(e) => setLocal((p) => ({ ...p, title: e.target.value }))}
          className="h-7 text-xs"
        />
      </FormField>
      <FormField label="Description">
        <Textarea
          value={local.metadata?.description ?? ''}
          onChange={(e) => handleChange('description', e.target.value)}
          rows={3}
          className="text-xs"
        />
      </FormField>
      <div className="grid grid-cols-2 gap-3">
        <FormField label="Duration (sec)">
          <Input
            type="number"
            value={local.metadata?.duration ?? 0}
            onChange={(e) => handleChange('duration', Number(e.target.value))}
            className="h-7 text-xs"
          />
        </FormField>
        <FormField label="Time of Day">
          <select
            value={local.metadata?.timeOfDay ?? ''}
            onChange={(e) => handleChange('timeOfDay', e.target.value)}
            className="h-7 w-full rounded-[var(--radius-sm)] border border-[var(--color-border-default)] bg-[var(--color-bg-primary)] px-2 text-xs"
          >
            <option value="">—</option>
            <option value="morning">Morning</option>
            <option value="day">Day</option>
            <option value="evening">Evening</option>
            <option value="night">Night</option>
          </select>
        </FormField>
      </div>
      <FormField label="Location">
        <Input
          value={local.metadata?.location ?? ''}
          onChange={(e) => handleChange('location', e.target.value)}
          className="h-7 text-xs"
        />
      </FormField>
      <FormField label="Notes">
        <Textarea
          value={local.metadata?.notes ?? ''}
          onChange={(e) => handleChange('notes', e.target.value)}
          rows={3}
          className="text-xs"
        />
      </FormField>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/detail-panel/SceneDetailForm.tsx

git commit -m "feat: add SceneDetailForm with debounced auto-save"
```

### 11b: ShotDetailForm

**Files:**
- Create: `src/components/detail-panel/ShotDetailForm.tsx`

- [ ] **Step 1: Implement** (same pattern as SceneDetailForm with shot-specific fields)

Fields: Title, Description, Duration, Shot Type (`wide`/`medium`/`close-up`/`insert`/`pov`), Camera Movement (`static`/`pan`/`tilt`/`dolly`/`handheld`), Dialogue (textarea), Notes (textarea).

Use `useDebounce(local, 300)` for auto-save.

- [ ] **Step 2: Commit**

```bash
git add src/components/detail-panel/ShotDetailForm.tsx
git commit -m "feat: add ShotDetailForm with debounced auto-save"
```

### 11c: ProjectSummary

**Files:**
- Create: `src/components/detail-panel/ProjectSummary.tsx`

- [ ] **Step 1: Implement**

```tsx
import { walkTree } from '@/lib/treeUtils';
import type { TreeNode } from '@/types';

interface ProjectSummaryProps {
  node: TreeNode;
}

export function ProjectSummary({ node }: ProjectSummaryProps) {
  const counts = { act: 0, scene: 0, shot: 0 };
  walkTree(node, (n) => {
    if (n.type === 'act') counts.act++;
    if (n.type === 'scene') counts.scene++;
    if (n.type === 'shot') counts.shot++;
  });

  return (
    <div className="p-4 space-y-3">
      <h3 className="text-sm font-medium text-[var(--color-text-primary)]">{node.title}</h3>
      <p className="text-xs text-[var(--color-text-secondary)]">
        {node.metadata?.description ?? 'No description'}
      </p>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-[var(--radius-sm)] bg-[var(--color-bg-secondary)] p-2">
          <div className="text-lg font-semibold text-[var(--color-text-primary)]">{counts.act}</div>
          <div className="text-[10px] text-[var(--color-text-tertiary)]">Acts</div>
        </div>
        <div className="rounded-[var(--radius-sm)] bg-[var(--color-bg-secondary)] p-2">
          <div className="text-lg font-semibold text-[var(--color-text-primary)]">{counts.scene}</div>
          <div className="text-[10px] text-[var(--color-text-tertiary)]">Scenes</div>
        </div>
        <div className="rounded-[var(--radius-sm)] bg-[var(--color-bg-secondary)] p-2">
          <div className="text-lg font-semibold text-[var(--color-text-primary)]">{counts.shot}</div>
          <div className="text-[10px] text-[var(--color-text-tertiary)]">Shots</div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/detail-panel/ProjectSummary.tsx
git commit -m "feat: add ProjectSummary component"
```

### 11d: DetailPanel Container

**Files:**
- Create: `src/components/detail-panel/DetailPanel.tsx`

- [ ] **Step 1: Implement**

```tsx
import { findNode, collectScenes } from '@/lib/treeUtils';
import { useProjectStore } from '@/stores/projectStore';
import { useCanvasStore } from '@/stores/canvasStore';
import { useDetailStore } from '@/stores/detailStore';
import { AutoSaveIndicator } from '@/components/ui/AutoSaveIndicator';
import { SceneDetailForm } from './SceneDetailForm';
import { ShotDetailForm } from './ShotDetailForm';
import { ProjectSummary } from './ProjectSummary';
import type { TreeNode } from '@/types';

export function DetailPanel() {
  const selectedNodeId = useProjectStore((s) => s.selectedNodeId);
  const tree = useProjectStore((s) => s.getCurrentTree());
  const updateTreeNode = useProjectStore((s) => s.updateTreeNode);
  const canvasNodes = useCanvasStore((s) => s.getCurrentNodes());
  const addNode = useCanvasStore((s) => s.addNode);
  const setDraftFormData = useDetailStore((s) => s.setDraftFormData);

  const node = selectedNodeId && tree ? findNode(tree, selectedNodeId) : null;

  if (!node) {
    return (
      <div className="flex h-full items-center justify-center p-4 text-xs text-[var(--color-text-tertiary)]">
        Select a scene or shot to edit
      </div>
    );
  }

  const handleChange = (updates: Partial<TreeNode>) => {
    setDraftFormData(updates);
    updateTreeNode(node.id, updates);
    setDraftFormData(null);
  };

  const hasLinkedCard = canvasNodes.some((n) => n.data.linkedTreeNodeId === node.id);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-[var(--color-border-default)] px-3 py-2">
        <span className="text-xs font-medium text-[var(--color-text-primary)]">
          {node.type === 'scene' ? 'Scene Details' : node.type === 'shot' ? 'Shot Details' : 'Project'}
        </span>
        <AutoSaveIndicator />
      </div>
      <div className="flex-1 overflow-auto">
        {node.type === 'scene' && <SceneDetailForm node={node} onChange={handleChange} />}
        {node.type === 'shot' && <ShotDetailForm node={node} onChange={handleChange} />}
        {(node.type === 'project' || node.type === 'act') && <ProjectSummary node={node} />}
      </div>
      {node.type === 'scene' && (
        <button
          onClick={() => {
            if (hasLinkedCard) {
              // Focus on canvas — handled by FlowCanvasPanel via selectedNodeId
            } else {
              // Add to canvas
              addNode({
                id: generateId('canvas_scene_'),
                type: 'sceneCard',
                position: { x: 100 + Math.random() * 300, y: 100 + Math.random() * 200 },
                data: {
                  title: node.title,
                  description: node.metadata?.description ?? '',
                  status: node.status,
                  linkedTreeNodeId: node.id,
                },
              });
            }
          }}
          className="m-3 rounded-[var(--radius-sm)] bg-[var(--color-accent-500)] px-3 py-2 text-xs font-medium text-white hover:bg-[var(--color-accent-600)]"
        >
          {hasLinkedCard ? 'Focus on Canvas' : 'Add to Canvas'}
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/detail-panel/DetailPanel.tsx
git commit -m "feat: add DetailPanel container with auto-save and Add to Canvas"
```

---

## Task 12: Integrate Tab Layout into ChatPanel

**Files:**
- Modify: `src/components/chat-panel/ChatPanel.tsx`

- [ ] **Step 1: Modify with auto-switch effect**

```tsx
import { useEffect } from 'react';
import { TabBar } from '@/components/ui/TabBar';
import { TabPanel } from '@/components/ui/TabPanel';
import { DetailPanel } from '@/components/detail-panel/DetailPanel';
import { useDetailStore } from '@/stores/detailStore';
import { useProjectStore } from '@/stores/projectStore';
import { ContextBar } from './ContextBar';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { QuickActions } from './QuickActions';
import { useChatStore } from '@/stores/chatStore';

export function ChatPanel() {
  const sendMessage = useChatStore((s) => s.sendMessage);
  const activeTab = useDetailStore((s) => s.activeTab);
  const setActiveTab = useDetailStore((s) => s.setActiveTab);
  const selectedNodeId = useProjectStore((s) => s.selectedNodeId);

  // Auto-switch to Details when a node is selected
  useEffect(() => {
    if (selectedNodeId) {
      setActiveTab('details');
    }
  }, [selectedNodeId, setActiveTab]);

  const showDetailsTab = !!selectedNodeId;
  const tabs = showDetailsTab
    ? [
        { id: 'chat', label: 'Chat' },
        { id: 'details', label: 'Details' },
      ]
    : [{ id: 'chat', label: 'Chat' }];

  return (
    <div className="flex h-full flex-col bg-[var(--color-bg-primary)]">
      <TabBar tabs={tabs} activeTab={activeTab} onChange={setActiveTab} />
      <div className="flex-1 overflow-hidden">
        <TabPanel isActive={activeTab === 'chat'}>
          <ContextBar />
          <QuickActions onAction={(label) => sendMessage(label)} />
          <MessageList />
          <MessageInput />
        </TabPanel>
        <TabPanel isActive={activeTab === 'details'}>
          <DetailPanel />
        </TabPanel>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/chat-panel/ChatPanel.tsx
git commit -m "feat: integrate TabBar and DetailPanel with auto-switch to Details"
```

---

## Task 13: Canvas Card Editing (All Types)

### 13a: SceneCardNode In-Place Edit

**Files:**
- Modify: `src/components/flow-canvas/nodes/SceneCardNode.tsx`

- [ ] **Step 1: Add double-click edit with local state**

```tsx
import { useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Badge } from '@/components/ui/Badge';
import { useCanvasStore } from '@/stores/canvasStore';

const statusMap: Record<string, { label: string; variant: 'default' | 'accent' | 'success' | 'warning' }> = {
  draft: { label: 'Draft', variant: 'default' },
  in_progress: { label: 'In Progress', variant: 'accent' },
  review: { label: 'Review', variant: 'warning' },
  done: { label: 'Done', variant: 'success' },
};

export function SceneCardNode({ data, id, selected }: NodeProps<any>) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(data.title);
  const updateNodeData = useCanvasStore((s) => s.updateNodeData);
  const status = data.status ? statusMap[data.status] : null;

  const handleSave = () => {
    if (editValue.trim() && editValue.trim() !== data.title) {
      updateNodeData(id, { title: editValue.trim() });
    }
    setIsEditing(false);
  };

  return (
    <div
      className={`w-[240px] rounded-[var(--radius-base)] border bg-[var(--color-bg-primary)] p-4 shadow-sm transition-shadow ${
        selected ? 'border-[var(--color-accent-500)] shadow-md' : 'border-[var(--color-border-default)]'
      }`}
    >
      <Handle type="target" position={Position.Left} className="!bg-[var(--color-accent-500)]" />
      <div className="mb-2 flex items-start justify-between gap-2">
        {isEditing ? (
          <input
            autoFocus
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={handleSave}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') { setEditValue(data.title); setIsEditing(false); } }}
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
      <Handle type="source" position={Position.Right} className="!bg-[var(--color-accent-500)]" />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/flow-canvas/nodes/SceneCardNode.tsx
git commit -m "feat: add in-place title editing to SceneCardNode"
```

### 13b: NoteCardNode In-Place Edit

**Files:**
- Modify: `src/components/flow-canvas/nodes/NoteCardNode.tsx`

- [ ] **Step 1: Add double-click edit with color picker**

```tsx
import { useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useCanvasStore } from '@/stores/canvasStore';
import { ColorPicker } from '@/components/ui/ColorPicker';

export function NoteCardNode({ data, id, selected }: NodeProps<any>) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(data.title);
  const [editDesc, setEditDesc] = useState(data.description ?? '');
  const updateNodeData = useCanvasStore((s) => s.updateNodeData);

  const handleSave = () => {
    updateNodeData(id, {
      title: editTitle.trim() || data.title,
      description: editDesc.trim(),
    });
    setIsEditing(false);
  };

  return (
    <div
      className={`w-[200px] rounded-[var(--radius-base)] border p-4 shadow-sm transition-shadow ${
        selected ? 'border-[var(--color-accent-500)] shadow-md' : 'border-[var(--color-border-default)]'
      }`}
      style={{ backgroundColor: data.color ?? '#fef3c7' }}
    >
      <Handle type="target" position={Position.Top} className="!bg-[var(--color-accent-500)]" />
      {isEditing ? (
        <div className="space-y-2">
          <input
            autoFocus
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            className="w-full rounded-[var(--radius-sm)] border border-[var(--color-accent-500)] bg-white/80 px-1.5 py-0.5 text-sm font-medium outline-none"
          />
          <textarea
            value={editDesc}
            onChange={(e) => setEditDesc(e.target.value)}
            rows={2}
            className="w-full rounded-[var(--radius-sm)] border border-[var(--color-accent-500)] bg-white/80 px-1.5 py-0.5 text-xs outline-none resize-none"
          />
          <ColorPicker
            value={data.color ?? '#fef3c7'}
            onChange={(color) => updateNodeData(id, { color })}
          />
          <div className="flex justify-end gap-1">
            <button onClick={() => { setEditTitle(data.title); setEditDesc(data.description ?? ''); setIsEditing(false); }} className="text-[10px] px-2 py-1 rounded">Cancel</button>
            <button onClick={handleSave} className="text-[10px] px-2 py-1 rounded bg-[var(--color-accent-500)] text-white">Save</button>
          </div>
        </div>
      ) : (
        <>
          <h4
            className="mb-1.5 text-sm font-medium text-[var(--color-text-primary)] cursor-text"
            onDoubleClick={() => { setEditTitle(data.title); setEditDesc(data.description ?? ''); setIsEditing(true); }}
          >
            {data.title}
          </h4>
          {data.description && (
            <p className="text-xs text-[var(--color-text-secondary)]">{data.description}</p>
          )}
        </>
      )}
      <Handle type="source" position={Position.Bottom} className="!bg-[var(--color-accent-500)]" />
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/flow-canvas/nodes/NoteCardNode.tsx
git commit -m "feat: add in-place editing and color picker to NoteCardNode"
```

### 13c: AssetCardNode In-Place Edit

**Files:**
- Modify: `src/components/flow-canvas/nodes/AssetCardNode.tsx`

- [ ] **Step 1: Add double-click title edit**

Same pattern as SceneCardNode but with only title editing (no status).

- [ ] **Step 2: Commit**

```bash
git add src/components/flow-canvas/nodes/AssetCardNode.tsx
git commit -m "feat: add in-place title editing to AssetCardNode"
```

---

## Task 14: Canvas Context Menu

**Files:**
- Modify: `src/components/flow-canvas/FlowCanvasPanel.tsx`

- [ ] **Step 1: Implement context menu on nodes**

Use `@/components/ui/ContextMenu` to wrap each node type. The menu items:

| Item | Action |
|------|--------|
| Edit | Trigger in-place edit mode on the node |
| Duplicate | Call `duplicateNode(id)` |
| Sync to Tree | Submenu: list unlinked scenes (from `collectScenes` - filter out already linked). On click: set `linkedTreeNodeId` and sync title/status. |
| Delete | If linked: show confirm "Also delete from project tree?". If orphan: delete immediately. |

```tsx
// In FlowCanvasPanel, wrap the ReactFlow or handle node-level context menu:
// Use ReactFlow's onNodeContextMenu prop:

const onNodeContextMenu = useCallback((event: React.MouseEvent, node: Node) => {
  event.preventDefault();
  // Show custom context menu at event.clientX, event.clientY
  setContextMenu({ x: event.clientX, y: event.clientY, nodeId: node.id });
}, []);
```

- [ ] **Step 2: Commit**

```bash
git add src/components/flow-canvas/FlowCanvasPanel.tsx

git commit -m "feat: add context menu to canvas cards (Edit/Duplicate/Sync to Tree/Delete)"
```

---

## Task 15: Add Note Card Button

**Files:**
- Modify: `src/components/flow-canvas/FlowCanvasPanel.tsx`

- [ ] **Step 1: Add floating + button**

```tsx
<button
  onClick={() => {
    const viewport = reactFlowInstance.getViewport();
    addNode({
      id: generateId('canvas_note_'),
      type: 'noteCard',
      position: {
        x: -viewport.x + 200,
        y: -viewport.y + 150,
      },
      data: { title: 'New Note', color: '#fef3c7' },
    });
  }}
  className="absolute bottom-4 right-4 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-accent-500)] text-white shadow-md hover:bg-[var(--color-accent-600)]"
>
  <Plus className="h-4 w-4" />
</button>
```

- [ ] **Step 2: Commit**

```bash
git add src/components/flow-canvas/FlowCanvasPanel.tsx
git commit -m "feat: add floating button to create note cards on canvas"
```

---

## Task 16: NewProjectModal + Project Create Flow

**Files:**
- Create: `src/components/modals/NewProjectModal.tsx`
- Modify: `src/pages/ProjectListPage.tsx`

### 16a: NewProjectModal

- [ ] **Step 1: Implement**

```tsx
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ColorPicker } from '@/components/ui/ColorPicker';

const PRESET_COVER_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
  '#f97316', '#f59e0b', '#10b981', '#14b8a6',
  '#06b6d4', '#0ea5e9', '#3b82f6', '#64748b',
];

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (title: string, description: string, coverColor: string) => void;
}

export function NewProjectModal({ isOpen, onClose, onCreate }: NewProjectModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(PRESET_COVER_COLORS[0]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="w-full max-w-sm rounded-[var(--radius-base)] border border-[var(--color-border-default)] bg-[var(--color-bg-primary)] p-6 shadow-lg">
        <h3 className="mb-4 text-sm font-semibold text-[var(--color-text-primary)]">New Project</h3>
        <div className="space-y-3">
          <Input placeholder="Project title" value={title} onChange={(e) => setTitle(e.target.value)} className="text-xs" />
          <Input placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} className="text-xs" />
          <div>
            <span className="mb-1.5 block text-[11px] font-medium text-[var(--color-text-secondary)]">Cover Color</span>
            <ColorPicker colors={PRESET_COVER_COLORS} value={color} onChange={setColor} />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button size="sm" disabled={!title.trim()} onClick={() => { onCreate(title, description, color); onClose(); }}>
            Create
          </Button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/modals/NewProjectModal.tsx
git commit -m "feat: add NewProjectModal with color picker"
```

### 16b: ProjectListPage Integration

- [ ] **Step 1: Add modal state, create handler, import/export buttons**

```tsx
// In ProjectListPage:
const [isModalOpen, setIsModalOpen] = useState(false);
const createProject = useProjectStore((s) => s.createProject);
const navigate = useNavigate();

const handleCreate = (title: string, description: string, coverColor: string) => {
  const projectId = createProject(title, description, coverColor);
  navigate(`/project/${projectId}`);
};

// Add Export button on each card:
// Add Import button in header
```

- [ ] **Step 2: Commit**

```bash
git add src/pages/ProjectListPage.tsx
git commit -m "feat: wire NewProjectModal into project list with import/export buttons"
```

---

## Task 17: Project Metadata Update (FR-1.4)

**Files:**
- Create: `src/components/modals/ProjectSettingsModal.tsx`
- Modify: `src/layouts/Navbar.tsx`

- [ ] **Step 1: Create ProjectSettingsModal**

Simple modal with title and description fields, pre-filled with current project data.

- [ ] **Step 2: Modify Navbar**

Add a small pencil/edit icon next to the project title in the navbar breadcrumb. Click opens `ProjectSettingsModal`.

- [ ] **Step 3: Commit**

```bash
git add src/components/modals/ProjectSettingsModal.tsx src/layouts/Navbar.tsx
git commit -m "feat: add inline project title/description editing in navbar"
```

---

## Task 18: Tree ↔ Canvas Bidirectional Sync

**Files:**
- Modify: `src/stores/projectStore.ts`
- Modify: `src/stores/canvasStore.ts`

### Sync Guard Design

To prevent infinite loops, both stores accept a `source` parameter:
- `source = 'ui'` — user interaction, normal sync applies
- `source = 'tree'` — update originated from tree sync, don't sync back to tree
- `source = 'canvas'` — update originated from canvas sync, don't sync back to canvas

- [ ] **Step 1: Modify projectStore.updateTreeNode**

```ts
updateTreeNode: (nodeId, updates, source = 'ui') =>
  set(
    produce((state) => {
      function walk(node: TreeNode) {
        if (node.id === nodeId) {
          if (updates.metadata && node.metadata) {
            Object.assign(node.metadata, updates.metadata);
          }
          if (updates.title !== undefined) node.title = updates.title;
          if (updates.status !== undefined) node.status = updates.status;
          if (node.metadata) node.metadata.updatedAt = new Date().toISOString();
          return true;
        }
        if (node.children) {
          for (const child of node.children) {
            if (walk(child)) return true;
          }
        }
        return false;
      }
      const tree = state.trees[state.currentProjectId];
      if (tree) walk(tree);

      // Sync to canvas (only if not originating from canvas)
      if (source !== 'canvas') {
        const canvasStore = useCanvasStore.getState();
        const nodes = canvasStore.getCurrentNodes();
        const linkedCard = nodes.find((n) => n.data.linkedTreeNodeId === nodeId);
        if (linkedCard) {
          canvasStore.updateNodeData(
            linkedCard.id,
            {
              title: updates.title,
              status: updates.status,
              description: updates.metadata?.description,
            },
            'tree' // mark as originating from tree
          );
        }
      }
    })
  ),
```

- [ ] **Step 2: Modify canvasStore.updateNodeData**

```ts
updateNodeData: (id, data, source = 'ui') =>
  set((state) => {
    const projectId = useProjectStore.getState().currentProjectId;
    if (!projectId) return state;
    const nodes = state.canvases[projectId]?.nodes ?? [];
    const node = nodes.find((n) => n.id === id);
    if (!node) return state;

    const newData = { ...node.data, ...data };

    // Sync to tree (only if linked and not originating from tree)
    if (source !== 'tree' && newData.linkedTreeNodeId) {
      const projectStore = useProjectStore.getState();
      projectStore.updateTreeNode(
        newData.linkedTreeNodeId,
        {
          title: data.title,
          status: data.status,
          metadata: data.description !== undefined ? { description: data.description } : undefined,
        },
        'canvas' // mark as originating from canvas
      );
    }

    return {
      canvases: {
        ...state.canvases,
        [projectId]: {
          ...state.canvases[projectId],
          nodes: nodes.map((n) => (n.id === id ? { ...n, data: newData } : n)),
        },
      },
    };
  }),
```

- [ ] **Step 3: Modify projectStore.deleteTreeNode to clean up canvas**

```ts
deleteTreeNode: (nodeId) =>
  set(
    produce((state) => {
      const tree = state.trees[state.currentProjectId];
      function walk(n: TreeNode): boolean {
        if (!n.children) return false;
        const idx = n.children.findIndex((c) => c.id === nodeId);
        if (idx !== -1) {
          n.children.splice(idx, 1);
          return true;
        }
        for (const child of n.children) {
          if (walk(child)) return true;
        }
        return false;
      }
      if (tree && tree.id !== nodeId) walk(tree);
      if (state.selectedNodeId === nodeId) state.selectedNodeId = null;
    })
  );
// After delete, also remove linked canvas card (in component or separate effect)
```

- [ ] **Step 4: Run tests**

```bash
npx vitest run src/stores/
```

- [ ] **Step 5: Commit**

```bash
git add src/stores/projectStore.ts src/stores/canvasStore.ts
git commit -m "feat: implement bidirectional tree-canvas sync with source guard"
```

---

## Task 19: Keyboard Shortcuts

**Files:**
- Modify: `src/pages/WorkspacePage.tsx`
- Modify: `src/components/tree-view/TreeViewPanel.tsx`

- [ ] **Step 1: Add global shortcuts in WorkspacePage**

```tsx
useHotkeys({
  'Cmd+Enter': () => {
    // Focus chat input — handled by MessageInput component
  },
  Delete: () => {
    if (selectedNodeId) {
      const tree = getCurrentTree();
      const node = tree ? findNode(tree, selectedNodeId) : null;
      if (node) {
        setDeleteTarget({ id: selectedNodeId, childCount: node.children?.length ?? 0 });
      }
    }
  },
  Escape: () => {
    if (activeTab === 'details') {
      setActiveTab('chat');
    } else {
      selectNode(null);
    }
  },
});
```

- [ ] **Step 2: Add F2 / Cmd+R rename in TreeViewPanel**

Expose `EditableTitle` refs and trigger rename on the selected node:

```tsx
// In TreeViewPanel, maintain a ref map of EditableTitle instances:
const titleRefs = useRef<Map<string, EditableTitleRef>>(new Map());

useEffect(() => {
  const handler = (e: KeyboardEvent) => {
    if ((e.key === 'F2' || (e.metaKey && e.key === 'r')) && selectedNodeId) {
      e.preventDefault();
      titleRefs.current.get(selectedNodeId)?.startEdit();
    }
  };
  window.addEventListener('keydown', handler);
  return () => window.removeEventListener('keydown', handler);
}, [selectedNodeId]);
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/WorkspacePage.tsx src/components/tree-view/TreeViewPanel.tsx
git commit -m "feat: add keyboard shortcuts (Delete, Escape, F2/Cmd+R)"
```

---

## Task 20: Final Integration & Testing

**Files:**
- All modified files

- [ ] **Step 1: Run full test suite**

```bash
npx vitest run
```
Expected: All tests pass.

- [ ] **Step 2: Run TypeScript check**

```bash
npx tsc --noEmit
```
Expected: No errors.

- [ ] **Step 3: Build check**

```bash
npm run build
```
Expected: Build succeeds.

- [ ] **Step 4: Manual QA checklist**

- [ ] Create 3+ projects, verify isolation (tree/canvas data don't leak)
- [ ] Add act → scene → shot hierarchy
- [ ] Drag reorder siblings at each level
- [ ] Edit all detail fields, refresh page, verify persistence
- [ ] Delete node with children → confirm dialog → verify cascade to canvas
- [ ] Edit canvas card title → verify tree sync (and vice versa)
- [ ] Edit canvas card status → verify tree sync (and vice versa)
- [ ] Duplicate scene card → verify orphan, no tree sync
- [ ] Add note card, edit, change color, delete
- [ ] "Add to Canvas" / "Focus on Canvas" button states
- [ ] "Sync to Tree" on orphan card
- [ ] JSON export → file downloads
- [ ] JSON import → new project created with fresh ID
- [ ] Keyboard shortcuts work (F2, Escape, Delete)
- [ ] Inline project title edit in navbar

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat: complete Phase 1 — core content editing"
```

---

## Summary

| # | Task | Focus |
|---|------|-------|
| 1 | Expand Types | `TreeNode.metadata`, `linkedTreeNodeId` |
| 2 | Tree Utilities | `findNode`, `findParent`, `getSiblings`, `walkTree`, `collectScenes` |
| 3 | Test Setup | `localStorage` mock, `authStore` version |
| 4 | detailStore | Tab state, draft form data |
| 5 | projectStore (single-project) | `moveTreeNode`, metadata auto-init, migration |
| 6 | canvasStore (single-project) | `updateNodeData`, `duplicateNode` |
| 7 | **Multi-Project Refactor** | `trees: Record`, `canvases: Record`, `getCurrentTree()` |
| 8 | Base UI | Tooltip, EditableTitle, FormField, ColorPicker, TabBar, TabPanel, AutoSaveIndicator, useDebounce |
| 9 | DeleteConfirmDialog | Reusable confirm modal |
| 10 | Tree CRUD | Inline edit, status toggle, drag handle, tooltip, DnD reorder |
| 11 | Detail Panel Forms | SceneDetailForm, ShotDetailForm, ProjectSummary (all debounced) |
| 12 | Tab Layout | ChatPanel with auto-switch to Details |
| 13 | Canvas Edit | SceneCardNode, NoteCardNode, AssetCardNode in-place editing |
| 14 | Canvas Context Menu | Edit, Duplicate, Sync to Tree submenu, Delete with confirm |
| 15 | Note Card Button | Floating + button |
| 16 | New Project Modal | Create project with color picker |
| 17 | Project Metadata | Navbar inline edit, settings modal |
| 18 | Bidirectional Sync | Store-embedded sync with `source` guard |
| 19 | Keyboard Shortcuts | Delete, Escape, F2/Cmd+R |
| 20 | Final Integration | Tests, TS check, build, manual QA |

**Estimated time: 8–12 hours** (excluding review and iteration)
