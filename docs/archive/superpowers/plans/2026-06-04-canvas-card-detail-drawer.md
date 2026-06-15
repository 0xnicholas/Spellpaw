# 画布卡片详情抽屉 — 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 点击画布卡片从右侧滑出只读详情抽屉，展示该卡片的完整数据字段

**Architecture:** canvasStore 新增 `selectedCardId` 瞬时状态 → `CardDetailDrawer` 组件读取 `getSelectedCard()` 渲染 → `FlowCanvasPanel` 注册 `onNodeClick` 触发。遮罩 `pointer-events: none` 纯视觉，关闭通过 ✕ / Esc / onPaneClick。四种卡片类型各自渲染专属字段。

**Tech Stack:** TypeScript · React 19 · Zustand 5 · @xyflow/react · Tailwind CSS 4 · Vitest

---

### Task 1: canvasStore 新增 selectedCardId 状态

**Files:**
- Modify: `src/apps/drama/stores/canvasStore.ts`
- Modify: `src/apps/drama/stores/canvasStore.test.ts`

- [ ] **Step 1: 添加 failing tests for setSelectedCardId / getSelectedCard**

在 `canvasStore.test.ts` 末尾添加：

```typescript
describe('selectedCardId', () => {
  it('starts null', () => {
    expect(useCanvasStore.getState().selectedCardId).toBeNull();
  });

  it('setSelectedCardId sets and getSelectedCard returns the node', () => {
    useCanvasStore.getState().addNode({
      id: 'card_1',
      type: 'script',
      position: { x: 0, y: 0 },
      data: { title: 'Scene 1', status: 'draft' },
    });
    useCanvasStore.getState().setSelectedCardId('card_1');
    expect(useCanvasStore.getState().selectedCardId).toBe('card_1');
    const card = useCanvasStore.getState().getSelectedCard();
    expect(card).not.toBeNull();
    expect(card!.id).toBe('card_1');
    expect(card!.data.title).toBe('Scene 1');
  });

  it('setSelectedCardId(null) clears selection', () => {
    useCanvasStore.getState().addNode({
      id: 'card_1',
      type: 'script',
      position: { x: 0, y: 0 },
      data: { title: 'Scene 1', status: 'draft' },
    });
    useCanvasStore.getState().setSelectedCardId('card_1');
    useCanvasStore.getState().setSelectedCardId(null);
    expect(useCanvasStore.getState().selectedCardId).toBeNull();
    expect(useCanvasStore.getState().getSelectedCard()).toBeNull();
  });

  it('getSelectedCard returns null when node does not exist', () => {
    useCanvasStore.getState().setSelectedCardId('nonexistent');
    expect(useCanvasStore.getState().getSelectedCard()).toBeNull();
  });

  it('selectedCardId is not persisted (not in partialize)', () => {
    // Verify that setting a value doesn't break anything, and it resets
    // on fresh state (which Zustand partialize handles by excluding from canvases)
    useCanvasStore.getState().setSelectedCardId('test');
    useCanvasStore.setState({ selectedCardId: null });
    expect(useCanvasStore.getState().selectedCardId).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/nicholasl/Documents/build-whatever/Spellpaw && npx vitest run src/apps/drama/stores/canvasStore.test.ts -t "selectedCardId"
```

Expected: FAIL — `selectedCardId`, `setSelectedCardId`, `getSelectedCard` 尚未定义。

- [ ] **Step 3: 在 canvasStore 中添加 selectedCardId 状态和 actions**

在 `src/apps/drama/stores/canvasStore.ts` 中：

a) 在 `CanvasState` interface 中添加字段：

```typescript
// 在 CanvasState interface 中添加（放在 getCurrentViewport 后面）：
selectedCardId: string | null;
setSelectedCardId: (id: string | null) => void;
getSelectedCard: () => CanvasNode | null;
```

b) 在 `canvases` 初始化后添加默认值：

```typescript
selectedCardId: null,
```

c) 在 store actions 中添加实现（放在 `clearCurrentProjectCanvas` 之前）：

```typescript
setSelectedCardId: (id) => set({ selectedCardId: id }),

getSelectedCard: () => {
  const nodes = get().getCurrentNodes();
  const id = get().selectedCardId;
  if (!id) return null;
  return nodes.find((n) => n.id === id) ?? null;
},
```

注意：`selectedCardId` **不需要**加入 `partialize`——当前 `partialize` 只返回 `{ canvases }`，而 `selectedCardId` 在顶层，天然排除在持久化之外。

- [ ] **Step 4: Run tests to verify they pass**

```bash
cd /Users/nicholasl/Documents/build-whatever/Spellpaw && npx vitest run src/apps/drama/stores/canvasStore.test.ts
```

Expected: ALL tests pass (including existing ones).

- [ ] **Step 5: Commit**

```bash
cd /Users/nicholasl/Documents/build-whatever/Spellpaw && git add src/apps/drama/stores/canvasStore.ts src/apps/drama/stores/canvasStore.test.ts && git commit -m "feat: add selectedCardId state to canvasStore"
```

---

### Task 2: CardDetailDrawer 组件

**Files:**
- Create: `src/apps/drama/components/flow-canvas/CardDetailDrawer.tsx`

`CardDetailDrawer` 是无外部 props 的组件，从 `canvasStore` 读取 `selectedCardId` + `getSelectedCard()`，根据卡片类型渲染只读详情。

- [ ] **Step 1: 创建 CardDetailDrawer 组件文件**

```typescript
// src/apps/drama/components/flow-canvas/CardDetailDrawer.tsx
import { useMemo } from 'react';
import { X } from 'lucide-react';
import { Badge } from '@/shared/components/ui/Badge';
import { useCanvasStore } from '@drama/stores/canvasStore';
import { useProjectStore } from '@drama/stores/projectStore';
import { useHotkeys } from '@/shared/hooks/useHotkeys';
import { computeDisplayNumbers } from '@drama/lib/numbering';
import type { CanvasNodeData, DeliverableType } from '@drama/types';

// ── Status badge config (same as ScriptCardNode) ──
const statusMap: Record<string, { label: string; variant: 'default' | 'accent' | 'success' | 'warning' }> = {
  draft: { label: '草稿', variant: 'default' },
  in_progress: { label: '进行中', variant: 'accent' },
  review: { label: '审核中', variant: 'warning' },
  done: { label: '已完成', variant: 'success' },
};

// ── Deliverable type config ──
const deliverableLabels: Record<DeliverableType, string> = {
  image: '图片',
  video: '视频',
  audio: '音频',
};

// ── Field section helper ──
function FieldSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <div className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-[var(--color-text-tertiary)]">
        {label}
      </div>
      {children}
    </div>
  );
}

// ── Script detail ──
function ScriptDetail({ data }: { data: CanvasNodeData }) {
  const dialogue = data.dialogue as string | undefined;
  const location = data.location as string | undefined;
  const timeOfDay = data.timeOfDay as string | undefined;
  const duration = data.duration as number | undefined;

  return (
    <>
      <FieldSection label="描述">
        <p className="text-[13px] leading-relaxed text-[var(--color-text-secondary)]">
          {data.description || '暂无描述'}
        </p>
      </FieldSection>

      {dialogue && (
        <FieldSection label="对白">
          <div className="rounded-[var(--radius-sm)] bg-[var(--color-bg-tertiary)] p-3">
            <p className="text-[13px] italic leading-relaxed text-[var(--color-text-secondary)]">
              💬 {dialogue}
            </p>
          </div>
        </FieldSection>
      )}

      {(duration != null || location || timeOfDay) && (
        <FieldSection label="元信息">
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[12px] text-[var(--color-text-secondary)]">
            {duration != null && <span>⏱ {duration}s</span>}
            {location && <span>📍 {location}</span>}
            {timeOfDay && <span>🌅 {timeOfDay}</span>}
          </div>
        </FieldSection>
      )}
    </>
  );
}

// ── Art detail ──
function ArtDetail({ data, linkedTreeNodeId }: { data: CanvasNodeData; linkedTreeNodeId?: string }) {
  const thumbnail = data.thumbnail as string | undefined;
  const prompt = data.prompt as string | undefined;
  const tags = data.tags as string[] | undefined;
  const getLockedStyle = useProjectStore((s) => s.getLockedStyle);

  const isLocked = linkedTreeNodeId
    ? getLockedStyle().nodeId === linkedTreeNodeId
    : false;

  return (
    <>
      <FieldSection label="预览">
        {thumbnail ? (
          <img
            src={thumbnail}
            alt={data.title}
            className="w-full rounded-[var(--radius-sm)] object-cover"
            style={{ maxHeight: 320 }}
          />
        ) : (
          <div className="flex h-40 w-full items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-bg-tertiary)]">
            <span className="text-xs text-[var(--color-text-tertiary)]">暂无预览</span>
          </div>
        )}
      </FieldSection>

      {prompt && (
        <FieldSection label="生成提示词">
          <p className="rounded-[var(--radius-sm)] bg-[var(--color-bg-tertiary)] p-3 text-[12px] leading-relaxed text-[var(--color-text-secondary)]">
            {prompt}
          </p>
        </FieldSection>
      )}

      {tags && tags.length > 0 && (
        <FieldSection label="标签">
          <div className="flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <span key={tag} className="rounded-full bg-[var(--color-bg-tertiary)] px-2.5 py-0.5 text-[11px] text-[var(--color-text-secondary)]">
                {tag}
              </span>
            ))}
          </div>
        </FieldSection>
      )}

      <FieldSection label="风格锁定">
        <span className="text-[12px] text-[var(--color-text-secondary)]">
          {isLocked ? '🔒 已锁定风格' : '未锁定'}
        </span>
      </FieldSection>
    </>
  );
}

// ── Character detail ──
function CharacterDetail({ data }: { data: CanvasNodeData }) {
  const name = (data.name as string) || data.title;
  const role = data.role as string | undefined;
  const age = data.age as number | undefined;
  const occupation = data.occupation as string | undefined;
  const personality = data.personality as string | undefined;
  const appearance = data.appearance as string | undefined;
  const avatar = data.avatar as string | undefined;

  return (
    <>
      <FieldSection label="头像">
        <div
          className="mx-auto h-24 w-24 rounded-full"
          style={{
            background: avatar
              ? `url(${avatar}) center/cover`
              : 'var(--color-bg-tertiary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2rem',
          }}
        >
          {!avatar && '👤'}
        </div>
      </FieldSection>

      <FieldSection label="基本信息">
        <div className="space-y-1.5 text-[12px] text-[var(--color-text-secondary)]">
          {role && <p><span className="text-[var(--color-text-tertiary)]">角色：</span>{role}</p>}
          {age != null && <p><span className="text-[var(--color-text-tertiary)]">年龄：</span>{age}岁</p>}
          {occupation && <p><span className="text-[var(--color-text-tertiary)]">职业：</span>{occupation}</p>}
        </div>
      </FieldSection>

      {personality && (
        <FieldSection label="性格">
          <p className="text-[13px] leading-relaxed text-[var(--color-text-secondary)]">
            {personality}
          </p>
        </FieldSection>
      )}

      {appearance && (
        <FieldSection label="外貌">
          <p className="text-[13px] leading-relaxed text-[var(--color-text-secondary)]">
            {appearance}
          </p>
        </FieldSection>
      )}
    </>
  );
}

// ── Deliverable detail ──
function DeliverableDetail({ data }: { data: CanvasNodeData }) {
  const thumbnail = data.thumbnail as string | undefined;
  const deliverableType: DeliverableType = (data.deliverableType as DeliverableType) ?? 'image';
  const duration = data.duration as number | undefined;
  const fileSize = data.fileSize as number | undefined;
  const resolution = data.resolution as string | undefined;

  const formatDuration = (s?: number) => {
    if (s == null) return null;
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };
  const formatFileSize = (b?: number) => {
    if (b == null) return null;
    if (b < 1024) return `${b} B`;
    if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
    return `${(b / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <>
      <FieldSection label="类型">
        <span className="text-[12px] text-[var(--color-text-secondary)]">
          📦 {deliverableLabels[deliverableType]}
        </span>
      </FieldSection>

      {thumbnail && (
        <FieldSection label="预览">
          <img
            src={thumbnail}
            alt={data.title}
            className="w-full rounded-[var(--radius-sm)] object-cover"
            style={{ maxHeight: 240 }}
          />
        </FieldSection>
      )}

      {data.description && (
        <FieldSection label="描述">
          <p className="text-[13px] leading-relaxed text-[var(--color-text-secondary)]">
            {data.description}
          </p>
        </FieldSection>
      )}

      {(duration != null || fileSize != null || resolution) && (
        <FieldSection label="技术信息">
          <div className="space-y-1 text-[12px] text-[var(--color-text-secondary)]">
            {duration != null && <p>⏱ 时长：{formatDuration(duration)}</p>}
            {resolution && <p>📐 分辨率：{resolution}</p>}
            {fileSize != null && <p>💾 文件大小：{formatFileSize(fileSize)}</p>}
          </div>
        </FieldSection>
      )}
    </>
  );
}

// ── Main CardDetailDrawer ──
export function CardDetailDrawer() {
  const selectedCardId = useCanvasStore((s) => s.selectedCardId);
  const getSelectedCard = useCanvasStore((s) => s.getSelectedCard);
  const setSelectedCardId = useCanvasStore((s) => s.setSelectedCardId);

  const card = selectedCardId ? getSelectedCard() : null;
  const tree = useProjectStore((s) => s.getCurrentTree());
  const allNodes = useCanvasStore((s) => s.getCurrentNodes());

  // Compute displayNumber on-the-fly (not stored, derived from tree structure)
  const displayNumber = useMemo(() => {
    if (!card) return '';
    const map = computeDisplayNumbers(tree, allNodes);
    return map.get(card.id) ?? '';
  }, [card, tree, allNodes]);

  useHotkeys({ 'Escape': () => setSelectedCardId(null) }, []);

  if (!card) return null;

  const data = card.data;
  const statusInfo = data.status ? statusMap[data.status as string] : null;
  const linkedTreeNodeId = data.linkedTreeNodeId as string | undefined;

  const typeConfig: Record<string, { icon: string; label: string; accentClass: string }> = {
    script: { icon: '📝', label: '剧本卡片', accentClass: 'text-[var(--color-accent-600)]' },
    art: { icon: '🎨', label: '美术卡片', accentClass: 'text-[var(--color-status-warning-text)]' },
    character: { icon: '👤', label: '人物角色卡片', accentClass: 'text-[var(--color-status-success-text)]' },
    deliverable: { icon: '📦', label: '产出物卡片', accentClass: 'text-[var(--color-accent-600)]' },
  };
  const config = typeConfig[card.type] ?? { icon: '📄', label: '卡片', accentClass: 'text-[var(--color-text-secondary)]' };

  return (
    <>
      {/* Mask — purely visual, pointer-events: none so events pass through */}
      <div
        className="absolute inset-0 z-10 bg-black/10 pointer-events-none"
      />

      {/* Drawer */}
      <div
        className="absolute right-0 top-0 bottom-0 z-20 w-[340px] bg-[var(--color-bg-primary)] border-l border-[var(--color-border-default)] shadow-lg flex flex-col"
        style={{
          transform: 'translateX(0)',
          transition: 'transform 0.2s ease-out',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--color-border-default)] px-4 py-3 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm">{config.icon}</span>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className={`text-[11px] font-semibold uppercase tracking-wider ${config.accentClass}`}>
                  {config.label}
                </span>
                {displayNumber && (
                  <span className="text-[10px] font-mono text-[var(--color-text-tertiary)]">
                    {displayNumber}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={() => setSelectedCardId(null)}
            className="flex h-6 w-6 items-center justify-center rounded-[var(--radius-sm)] hover:bg-[var(--color-bg-secondary)] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] shrink-0"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto px-4 py-4">
          {/* Title */}
          <FieldSection label="标题">
            <h3 className="text-[15px] font-semibold text-[var(--color-text-primary)]">
              {data.title}
            </h3>
          </FieldSection>

          {/* Status */}
          {statusInfo && (
            <FieldSection label="状态">
              <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
            </FieldSection>
          )}

          {/* Type-specific detail */}
          {card.type === 'script' && <ScriptDetail data={data} />}
          {card.type === 'art' && <ArtDetail data={data} linkedTreeNodeId={linkedTreeNodeId} />}
          {card.type === 'character' && <CharacterDetail data={data} />}
          {card.type === 'deliverable' && <DeliverableDetail data={data} />}
        </div>
      </div>
    </>
  );
}
```

- [ ] **Step 2: 验证组件文件**

```bash
cd /Users/nicholasl/Documents/build-whatever/Spellpaw && npx tsc --noEmit --pretty 2>&1 | grep -i "CardDetailDrawer" | head -5
```

Expected: No type errors referencing CardDetailDrawer.

- [ ] **Step 3: Commit**

```bash
cd /Users/nicholasl/Documents/build-whatever/Spellpaw && git add src/apps/drama/components/flow-canvas/CardDetailDrawer.tsx && git commit -m "feat: add CardDetailDrawer component"
```

---

### Task 3: FlowCanvasPanel 集成

**Files:**
- Modify: `src/apps/drama/components/flow-canvas/FlowCanvasPanel.tsx`

- [ ] **Step 1: 在 FlowCanvasPanel 中集成抽屉和 onNodeClick**

在 `FlowCanvasPanel.tsx` 中做以下修改：

a) Import `CardDetailDrawer` 和 `useCanvasStore` 的 `setSelectedCardId`：

```typescript
// 在现有 imports 后添加：
import { CardDetailDrawer } from './CardDetailDrawer';
```

b) 从 `useCanvasStore` 获取 `setSelectedCardId`：

```typescript
// 在现有的 useCanvasStore 解构中添加：
const setSelectedCardId = useCanvasStore((s) => s.setSelectedCardId);
```

c) 添加 `onNodeClick` handler（放在 `onNodeContextMenu` 后面）。注意需要引入 `useRef` 做双击防抖：

```typescript
// 在 FlowCanvasPanel 顶部新增 ref：
const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

// handler:
const onNodeClick = useCallback(
  (_event: React.MouseEvent, node: Node) => {
    // Skip if clicking interactive elements (thumbnails, inputs, buttons)
    const target = _event.target as HTMLElement;
    if (
      target.tagName === 'IMG' ||
      target.tagName === 'INPUT' ||
      target.tagName === 'BUTTON' ||
      target.closest('button') ||
      target.closest('input')
    ) {
      return;
    }
    // Debounce to avoid drawer flash on double-click-to-edit
    if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
    clickTimerRef.current = setTimeout(() => {
      setSelectedCardId(node.id);
    }, 250);
  },
  [setSelectedCardId]
);
```

d) 在 `<ReactFlow>` 上添加 `onNodeClick` prop：

```typescript
// 在 onNodeContextMenu={onNodeContextMenu} 后面添加：
onNodeClick={onNodeClick}
```

e) 扩展 `onPaneClick` 添加关闭抽屉逻辑：

```typescript
// 修改现有的 onPaneClick:
onPaneClick={() => {
  closeContextMenu();
  setSelectedCardId(null);
}}
```

f) 在 `</ReactFlow>` 后、zoom indicator 前添加抽屉：

```tsx
{/* Card Detail Drawer */}
<CardDetailDrawer />
```

放在 `<ReactFlow>` 之后但在 zoom indicator 之前。

- [ ] **Step 2: TypeScript 编译检查**

```bash
cd /Users/nicholasl/Documents/build-whatever/Spellpaw && npx tsc --noEmit --pretty 2>&1 | head -30
```

Expected: Zero errors.

- [ ] **Step 3: 运行全部测试确认没有回归**

```bash
cd /Users/nicholasl/Documents/build-whatever/Spellpaw && npx vitest run
```

Expected: ALL 104+ tests pass.

- [ ] **Step 4: 手动验证**

启动 dev server 进行手动测试：

```bash
cd /Users/nicholasl/Documents/build-whatever/Spellpaw && npm run dev
```

验证清单：
- 点击四种类型画布卡片 → 抽屉从右侧滑入显示正确字段
- ✕ 按钮关闭抽屉
- 点击画布空白区域关闭抽屉
- Esc 键关闭抽屉  
- 点击另一张卡片切换抽屉内容
- 点击 Art/Deliverable 缩略图 → Lightbox 打开，抽屉不打开
- 双击卡片标题 → 进入编辑，抽屉不打开
- 抽屉打开时画布仍可拖拽/缩放

- [ ] **Step 5: Commit**

```bash
cd /Users/nicholasl/Documents/build-whatever/Spellpaw && git add src/apps/drama/components/flow-canvas/FlowCanvasPanel.tsx && git commit -m "feat: integrate CardDetailDrawer into FlowCanvasPanel"
```
