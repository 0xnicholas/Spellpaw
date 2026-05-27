# Phase 1: Core Content Editing — Spec

> Date: 2026-05-27  
> Status: Reviewed & Revised (2026-05-27)

---

## 1. Overview

Spellpaw is a desktop-first, AI-assisted short drama / video production tool. It helps creators plan scenes, shots, and manage production assets through an interactive three-panel workspace: Project Tree, AI Chat, and Visual Canvas.

**Phase 1 Goal:** Transform the current read-only mock prototype into a functional content editing tool where users can create, edit, and organize their short drama projects end-to-end without AI or backend dependencies.

---

## 2. Goals & Success Criteria

| # | Goal | Success Criteria |
|---|------|-----------------|
| 1 | Users can manage projects | Create new projects, switch between them, delete projects |
| 2 | Users can edit the project tree | CRUD on acts, scenes, and shots; reorder siblings via drag-and-drop |
| 3 | Users can edit node details | A detail panel for scene/shot metadata (description, duration, shot type, dialogue) |
| 4 | Canvas stays in sync with tree | Adding/removing scenes in tree reflects on canvas; edits are bidirectional |
| 5 | Users can edit canvas cards | In-place editing for card title, description, status, and color (notes) |
| 6 | Zero backend dependency | All data persists via `localStorage`; works offline entirely |

---

## 3. Functional Requirements

### 3.1 Project Management

**FR-1.1 Project List**
- The `/projects` page shows all existing projects in a grid.
- Each card shows: title, description, scene count, duration, last-updated timestamp.
- Clicking a card opens the workspace (`/project/:id`).

**FR-1.2 Create Project**
- A "New Project" button opens a modal.
- Fields: title (required), description (optional), cover color (picker with preset palette).
- On confirm: creates project with a default tree root node (`{ title, type: 'project', children: [] }`), persists to store, and navigates to workspace.

**FR-1.3 Delete Project**
- A context menu (right-click on project card) offers "Delete".
- Confirmation dialog before deletion.
- Removing a project also removes its tree data and canvas data.

**FR-1.4 Project Metadata Update**
- Project title and description are editable in the workspace (inline via the navbar breadcrumb or a settings modal).

**FR-1.5 Export Project to JSON**
- "Export" option in project settings (or project card context menu).
- Downloads a `.spellpaw.json` file containing: project metadata, full tree data, canvas nodes/edges.
- Format is versioned (includes `_schemaVersion`).

**FR-1.6 Import Project from JSON**
- "Import" button on the project list page.
- Validates `_schemaVersion` and required fields.
- Creates a new project with a fresh ID; does not overwrite existing projects.
- On import failure: shows error toast with human-readable message (e.g., "Invalid file format").

---

### 3.2 Tree View — Node CRUD

**FR-2.1 Add Child Node**
- Right-click on any tree node opens a context menu.
- Options:
  - For `project` / `act`: "Add Act" / "Add Scene"
  - For `scene`: "Add Shot"
  - For `shot`: no "Add child" option (leaf node)
- New node gets a default title (`New Act`, `New Scene`, `New Shot`) and `draft` status.
- New node metadata is automatically initialized with:
  - `createdAt: new Date().toISOString()`
  - `updatedAt: new Date().toISOString()`
  - `duration: 0`
  - All other optional fields omitted.
- Parent auto-expands if collapsed.

**FR-2.2 Rename Node**
- Double-click on a node title enters inline edit mode.
- Enter to save, Escape to cancel.
- Or: context menu "Rename" focuses the title.

**FR-2.3 Delete Node**
- Context menu option "Delete".
- Confirmation dialog for nodes with children: "This node has X children. Delete all?"
- On delete: remove from tree, deselect if selected, remove linked canvas node if any.

**FR-2.4 Drag-to-Reorder (Siblings Only)**
- Nodes can be dragged to reorder within the same parent.
- Visual drag handle appears on hover.
- Drop target highlights between siblings.
- Cross-parent drag is **out of scope** for Phase 1.

**FR-2.5 Status Toggle**
- Clicking the status dot cycles: `draft` → `in_progress` → `review` → `done` → `draft`.
- Visual feedback: dot color animates to new state.

**FR-2.6 Selection & Navigation**
- Clicking a node selects it.
- Selected node highlighted in tree.
- Selection triggers the Detail Panel (see §3.3) and, for scenes, syncs with canvas.

---

### 3.3 Detail Panel

A new panel in the **center column** that shares space with Chat via a tab layout `[Chat | Details]`.

**FR-3.1 Panel Visibility**
- Selecting a `scene` or `shot` switches the center column to the **Details** tab.
- Selecting `project` or `act` shows a summary read-only view in the Details tab.
- A close button or clicking the **Chat** tab returns to Chat.
- Keyboard: `Esc` switches from Details back to Chat.
- When no node is selected, only the **Chat** tab is shown.

**FR-3.2 Scene Detail Fields**
| Field | Type | Editable |
|-------|------|----------|
| Title | text input | yes |
| Description | textarea | yes |
| Duration (sec) | number input | yes |
| Status | dropdown (draft/in_progress/review/done) | yes |
| Location | text input | yes |
| Time of Day | select (morning/day/evening/night) | yes |
| Notes | textarea | yes |

**FR-3.3 Shot Detail Fields**
| Field | Type | Editable |
|-------|------|----------|
| Title | text input | yes |
| Description | textarea | yes |
| Duration (sec) | number input | yes |
| Status | dropdown | yes |
| Shot Type | select (wide/medium/close-up/insert/pov) | yes |
| Camera Movement | select (static/pan/tilt/dolly/handheld) | yes |
| Dialogue | textarea | yes |
| Notes | textarea | yes |

**FR-3.4 Auto-Save**
- All field changes auto-save to the store (debounced 300ms).
- Store persists to `localStorage`.
- No manual "Save" button.

---

### 3.4 Canvas — Card Editing

**FR-4.1 In-Place Edit**
- Double-click a canvas card enters edit mode:
  - Title: single-line input
  - Description: textarea (auto-resize)
  - Status: dropdown
- For `noteCard`: color picker swatches.
- Click outside or press `Enter` to save, `Escape` to cancel.

**FR-4.2 Context Menu on Cards**
- Right-click on canvas card:
  - "Edit"
  - "Duplicate" (creates copy offset by +40px; the copy has `linkedTreeNodeId: undefined`)
  - "Sync to Tree" (for orphan scene cards only):
    - Expands into a submenu listing all tree scene nodes **not yet** linked to any canvas card.
    - Clicking a scene binds `linkedTreeNodeId` and immediately syncs title/status/description.
    - If no unlinked scenes exist, the item is disabled with tooltip: "All scenes are already on canvas".
  - "Delete" (also removes from tree if linked)

**FR-4.3 Add Note Card**
- A floating "+" button in the canvas toolbar (bottom-right).
- Click: creates a new `noteCard` at viewport center with default title "New Note".

**FR-4.4 Add Scene Card from Tree**
- Selecting a scene in the tree that has **no linked canvas node**:
  - An "Add to Canvas" button appears in the Detail Panel.
  - Click: creates a `sceneCard` at a smart position (next to last scene card or center) with `linkedTreeNodeId` set.
- Selecting a scene that **already has** a linked canvas card:
  - Button text becomes "Focus on Canvas".
  - Click: canvas viewport animates (fitView) to center the linked card.

---

### 3.5 Tree ↔ Canvas Bidirectional Sync

**FR-5.1 Linking Philosophy**
- Canvas scene cards are **explicitly linked** to tree nodes via the `linkedTreeNodeId` field.
- The legacy `canvas_{nodeId}` ID prefix convention is **deprecated** and removed.
- Cards exist in two states:
  - **Linked**: `linkedTreeNodeId` points to a tree scene node. Title, status, and description are bidirectionally synced.
  - **Orphan**: `linkedTreeNodeId` is `undefined`. Edits are local to the card only. The user can "Sync to Tree" to create or bind to a tree node.

**FR-5.2 Tree → Canvas Sync**
- When a scene is added in the tree, **no automatic canvas card is created**. User must explicitly click "Add to Canvas" in the Detail Panel to create a linked card.
- When a linked scene is deleted from the tree, its linked canvas card is also removed.
- When a linked scene's title or status changes in the tree, the linked canvas card updates in real-time via `syncFromTreeNode`.

**FR-5.3 Canvas → Tree Sync**
- Deleting a **linked** scene card from canvas: prompts "Also delete from project tree?" (default: Yes).
- Deleting an **orphan** scene card: no prompt, removed immediately.
- Editing a **linked** scene card title or status: updates the corresponding tree node in real-time via `syncToTreeNode`.
- Editing an **orphan** card: no tree sync occurs.

---

## 4. Technical Design

### 4.1 State Architecture

Current stores:
- `authStore` — authentication
- `projectStore` — projects list + tree data + selection
- `canvasStore` — canvas nodes/edges/viewport
- `chatStore` — chat messages

**Changes:**
- Extend existing `projectStore` actions:
  - `updateTreeNode` — extend to support metadata field updates (deep merge)
  - `moveTreeNode` — **new**; drag-and-drop reorder within same parent
  - `addTreeNode` — ensure automatic `createdAt`/`updatedAt` injection
- Extend `canvasStore` with card editing actions:
  - `updateNodeData` — **new**; update any field on a card's `data` object
  - `duplicateNode` — **new**; create copy with `linkedTreeNodeId: undefined`
  - `syncToTreeNode` — **new**; push canvas card changes to linked tree node
- Add `detailStore` (or inline in `projectStore`) for:
  - `activeTab: 'chat' | 'details'`
  - `draftFormData: Partial<TreeNode>` (for auto-save debounce)

### 4.2 Data Model Changes

**TreeNode metadata expansion:**

```ts
// types/index.ts
export interface TreeNode {
  id: string;
  type: 'project' | 'act' | 'scene' | 'shot';
  title: string;
  status: 'draft' | 'in_progress' | 'review' | 'done';
  children?: TreeNode[];
  expanded?: boolean;
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
  };
}
```

**CanvasNodeData expansion:**

```ts
// types/index.ts
export interface CanvasNodeData extends Record<string, unknown> {
  title: string;
  description?: string;
  status?: 'draft' | 'in_progress' | 'review' | 'done';
  thumbnail?: string;
  tags?: string[];
  color?: string;
  linkedTreeNodeId?: string; // NEW: link to tree node
}
```

### 4.3 New Components

| Component | File | Purpose |
|-----------|------|---------|
| `TabBar` | `components/ui/TabBar.tsx` | Tab switcher for center column |
| `TabPanel` | `components/ui/TabPanel.tsx` | Tab content wrapper |
| `DetailPanel` | `components/detail-panel/DetailPanel.tsx` | Main detail view container |
| `SceneDetailForm` | `components/detail-panel/SceneDetailForm.tsx` | Scene metadata form |
| `ShotDetailForm` | `components/detail-panel/ShotDetailForm.tsx` | Shot metadata form |
| `ProjectSummary` | `components/detail-panel/ProjectSummary.tsx` | Read-only project/act summary |
| `FormField` | `components/ui/FormField.tsx` | Reusable label + input/textarea/select combo |
| `Tooltip` | `components/ui/Tooltip.tsx` | Hover tooltip wrapper |
| `NewProjectModal` | `components/modals/NewProjectModal.tsx` | Create project dialog |
| `DeleteConfirmDialog` | `components/modals/DeleteConfirmDialog.tsx` | Reusable confirm dialog |
| `AutoSaveIndicator` | `components/ui/AutoSaveIndicator.tsx` | Subtle dot in Detail Panel header (filled/blinking/hidden) |
| `ColorPicker` | `components/ui/ColorPicker.tsx` | Preset color swatches (accepts `colors` prop) |
| `EditableTitle` | `components/ui/EditableTitle.tsx` | Inline title editor (tree + canvas) |

### 4.4 Component Interactions

```
TreeNode (right-click) → ContextMenu → projectStore action
  │
  ├── "Add child" → projectStore.addTreeNode() → re-render tree
  ├── "Delete" → DeleteConfirmDialog → projectStore.deleteTreeNode()
  │              → canvasStore.removeNode() if linked
  ├── "Rename" → EditableTitle inline → projectStore.updateTreeNode()
  └── "Status click" → cycle status → projectStore.updateTreeNode(source='ui')
                         → finds linked canvas card → canvasStore.updateNodeData(source='tree')

TreeNode (click) → projectStore.selectNode()
  → useEffect auto-switches activeTab to 'details'
  → DetailPanel renders (scene/shot)
    → SceneDetailForm / ShotDetailForm
      → field change → debounced 300ms → projectStore.updateTreeNode(source='ui')

Canvas (double-click) → EditableTitle / form inputs
  → canvasStore.updateNodeData(source='ui')
    → if linkedTreeNodeId exists → projectStore.updateTreeNode(source='canvas')

Canvas (right-click) → ContextMenu → canvasStore action
  → "Delete" → prompt (if linked) → canvasStore.removeNode()
    → if linked → projectStore.deleteTreeNode() → also removes linked canvas card
```

### 4.5 Persistence Strategy

All stores use Zustand's `persist` middleware with `localStorage`:
- `spellpaw_project` — projects list + tree data
- `spellpaw_canvas` — nodes, edges, viewport
- `spellpaw_chat` — messages
- `spellpaw_auth` — auth state

**Migration note:**
- All persisted stores include a `version` field (e.g., `version: 2`).
- On hydration, if stored version < current version, run a migration function that:
  - Fills missing `TreeNode.metadata` fields with defaults (`duration: 0`, `createdAt: now`, etc.)
  - Converts old `canvas_{nodeId}` IDs to the new `linkedTreeNodeId` field
    - For each canvas node: if `id.startsWith('canvas_')` and no `linkedTreeNodeId`, extract `treeId = id.replace('canvas_', '')` and set `linkedTreeNodeId: treeId`
    - Then reassign `id` to a fresh `generateId()` so IDs no longer carry semantics
  - Updates `updatedAt` timestamps
- If `localStorage` is empty, seed with mock data for the first project.
- Users can create additional real projects alongside the mock seed.

---

## 5. UI/UX Design

### 5.1 Layout Changes

Current center column is Chat-only. With Detail Panel:

```
┌─────────────────┬─────────────────┬─────────────────┐
│  Tree + Assets  │  Chat / Detail  │     Canvas      │
│   (18-28%)      │   (22-45%)      │   (30-54%)      │
├─────────────────┼─────────────────┼─────────────────┤
│ When node        │ [Chat|Details]  │                 │
│ selected:        │ tab bar at top  │  Visual cards   │
│  - highlight     │ Default: Chat   │  + editable     │
│  - context menu  │ Scene selected: │  + context menu │
│  - drag handle   │ auto→Details    │  + add-note btn │
└─────────────────┴─────────────────┴─────────────────┘
```

- Center column uses a **tab layout** with `[ Chat | Details ]`.
- Default active tab is **Chat**.
- Selecting a scene/shot auto-switches to **Details**.
- `Esc` switches from **Details** back to **Chat**.
- The tab bar remembers the user's last manual tab choice per session.

### 5.2 Visual Polish

- **Drag handle**: 6-dot grip icon (`GripVertical`) appears on tree node hover.
- **Drop indicator**: 2px accent-colored line between siblings.
- **Inline edit**: Input field replaces text with subtle border animation.
- **Auto-save indicator**: A subtle dot in the Detail Panel header.  
  - Filled = unsaved changes (debounced 300ms)  
  - Blinking = saving in progress  
  - Hidden = fully synced. No toast spam.
- **Status dot tooltip**: Shows full status label on hover.

### 5.3 Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Enter` | Confirm inline edit / form save |
| `Escape` | Cancel edit / close Detail Panel |
| `F2` / `Cmd/Ctrl + R` | Rename selected tree node |
| `Delete` | Delete selected tree node (with confirm) |
| `Cmd/Ctrl + N` | New project (from project list) |
| `Cmd/Ctrl + Enter` | Send chat message (unchanged) |

---

## 6. Implementation Plan

### Week 1: Foundation + Tree CRUD

| Day | Task |
|-----|------|
| 1 | Extend `TreeNode` metadata types; add `detailStore` skeleton |
| 2 | Context menu on tree nodes (Add/Rename/Delete) + `DeleteConfirmDialog` |
| 3 | Extend `addTreeNode` with auto `createdAt`; extend `updateTreeNode` for metadata; add `moveTreeNode` skeleton |
| 4 | Inline title editing (`EditableTitle` component) |
| 5 | Drag-to-reorder siblings (`@dnd-kit/core` + `@dnd-kit/sortable`)
| 6 | Status dot click-to-cycle |
| 7 | Polish, `Esc` / `Enter` / `Delete` shortcuts, tests |

### Week 2: Detail Panel + Canvas Edit

| Day | Task |
|-----|------|
| 8 | `DetailPanel` shell with tab switcher (Chat / Details) |
| 9 | `SceneDetailForm` with all fields |
| 10 | `ShotDetailForm` with all fields |
| 11 | Auto-save debounce + persistence |
| 12 | Canvas in-place editing (title, description, status, color) |
| 13 | Canvas context menu (Edit/Duplicate/Delete) + `Cmd/Ctrl + N` shortcut |
| 14 | Add Note Card button + `Cmd/Ctrl + R` rename shortcut |

### Week 3: Project Management + Bidirectional Sync

| Day | Task |
|-----|------|
| 15 | `NewProjectModal` + create project flow |
| 16 | Project delete with cleanup + Zustand persist schema migration |
| 17 | "Add to Canvas" from Detail Panel + orphan card "Sync to Tree" |
| 18 | Tree ↔ Canvas bidirectional sync (`syncToTreeNode`) |
| 19 | JSON project export/import (backup/restore) |
| 20 | End-to-end integration tests + localStorage stress test |
| 21 | Final polish, accessibility pass, store test fixes |

---

## 7. Testing Strategy

### Unit Tests
- `projectStore`: add/rename/delete/move nodes, metadata updates
- `canvasStore`: update node data, duplicate, remove with tree sync
- `detailStore`: panel visibility, draft state management

### Integration Tests
- Tree node add → tree renders new node
- Tree scene edit → canvas card updates
- Canvas card delete → optional tree node removal
- Detail form edit → auto-save → localStorage persistence

### Manual QA Checklist
- [ ] Create 3+ projects, verify isolation
- [ ] Add act → scene → shot hierarchy
- [ ] Drag reorder siblings at each level
- [ ] Edit all detail fields, refresh page, verify persistence
- [ ] Delete node with children → confirm → verify cascade
- [ ] Edit canvas card → verify tree sync
- [ ] Add note card, edit, change color, delete
- [ ] Keyboard shortcuts work (F2, Escape, Delete)

---

## 8. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Tree drag-and-drop complexity | Medium | High | Use `@dnd-kit/core` + `@dnd-kit/sortable`; simplify to siblings-only |
| localStorage size limits | Low | Medium | Warn at >5MB; compress tree data; future Phase 3 moves to backend |
| Zustand persist schema mismatch | High | High | Add `version` field to persist config; migration layer fills missing metadata with defaults |
| Canvas ↔ Tree sync bugs | Medium | High | Single source of truth is `projectStore`; canvas is derived view; exhaustive unit tests |
| Detail Panel vs Chat layout shift | Low | Medium | Animate transitions; remember user preference per session |

---

## 9. Out of Scope (Phase 1)

The following are **explicitly deferred** to later phases:

- Real AI/LLM integration (Phase 2)
- Backend, authentication, cloud sync (Phase 3)
- File upload and real asset management (Phase 3)
- Cross-parent drag-and-drop in tree
- Full-text search across metadata fields (description, location, dialogue, notes)
- Real-time collaboration
- Export to PDF/Excel/Final Draft
- Mobile support
- Undo/redo history

---

## 10. Decisions (Reviewed)

| # | Question | Decision |
|---|----------|----------|
| 1 | Detail Panel layout — replace Chat or tab layout? | **Tab layout** `[Chat | Details]`; Details auto-activates on scene/shot selection; `Esc` returns to Chat. |
| 2 | Delete tree scene → auto-delete canvas card? | **Prompt**: "Also remove from Canvas?" (default: Yes). Orphan cards delete immediately. |
| 3 | Add "Undo" for destructive actions? | **Defer to Phase 2**. Adds significant complexity for marginal gain at this stage. |
| 4 | Preset cover colors — how many, which? | **12 colors**: indigo, violet, pink, red, orange, amber, emerald, teal, cyan, sky, blue, slate. |

---

*Spec written: 2026-05-27*  
*Author: Spellpaw Team*
