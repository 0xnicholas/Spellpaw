# Card Copilot Popover Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 Canvas 右键菜单的 `CopilotCardNode`（卡片即提示词输入框）替换为 Portal 浮层 `CardCopilotPopover`：右键创建空占位卡片 + 自动弹出小型 copilot 工具面板，点击已有卡片切换工具面板，双击打开详情抽屉。

**Architecture:** Portal 浮层（`position: fixed`）由 `CanvasPanel` 统一管理状态；`CardCopilotPopover` 通过 `key={nodeId}` 强制 re-mount 实现 cancel-on-switch；生成逻辑从 `CopilotCardNode` 抽取到 `useCopilotGenerate` hook；`copilotCard` 全链路从 nodeTypes / types union / toolConfigs 移除；持久化层加 `migrateCopilotCards` 函数（`canvasStore.ts` persist v3→v4）。

**Tech Stack:** React 19, TypeScript, Zustand 5 + Immer, @xyflow/react 12, React Flow `useViewport()` hook, Lucide Icons

**Spec:** `docs/superpowers/specs/2026-06-25-card-copilot-popover-design.md`

---

## File Structure

| Path | Action | Purpose |
|------|--------|---------|
| `src/shared/lib/zIndex.ts` | Create | 集中管理 Canvas 浮层 z-index（drawer 20 / popover 50 / menu 60） |
| `src/shared/components/canvas/helpers/kindInference.ts` | Create | `inferKindFromCard()` + `kindToCardType()` + `defaultTitle()` 纯函数 |
| `src/shared/components/canvas/helpers/kindInference.test.ts` | Create | 上述三个函数的单元测试（~10 cases） |
| `src/shared/components/canvas/helpers/capability.ts` | Create | `inferCapability(kind, hasRef)` 纯函数（image2image/image2video 等） |
| `src/shared/components/canvas/helpers/capability.test.ts` | Create | 6 cases：image±ref、video±ref、text/upload throws |
| `src/apps/drama/lib/migrateCopilotCards.ts` | Create | 迁移纯函数：copilotCard → 对应正式类型 CanvasNode[] |
| `src/apps/drama/lib/migrateCopilotCards.test.ts` | Create | 14 cases：4 kind × 3 status + 边界 |
| `src/apps/drama/stores/canvasStore.ts` | Modify | persist `version` 3→4 + 新增 v3→v4 migrate 分支 |
| `src/apps/drama/stores/canvasStore.migrate.test.ts` | Create | 集成测试：装载 v3 状态含 copilotCard → hydrate 后转换 |
| `src/apps/drama/types/index.ts` | Modify | 从 `CanvasNodeType` union 移除 `'copilotCard'`；`CanvasNodeData` 新增 `isPlaceholder?: boolean`、`fileRef?: FileRefData` |
| `src/apps/drama/lib/toolConfigs.ts` | Modify | 从 LLM `add_card` tool schema enum 移除 `copilotCard` |
| `src/apps/drama/stores/toolRouter/cards.ts` | Modify | 从 `CARD_TYPE_ICONS` map 移除 `copilotCard` 项（弱删） |
| `src/shared/components/canvas/hooks/useCopilotGenerate.ts` | Create | 从 CopilotCardNode 抽取的生成 hook（polling、abort、cancel） |
| `src/shared/components/canvas/hooks/useCopilotGenerate.test.ts` | Create | 单元测试：4 kind 路径、capability 推断、AbortController、卸载清理（~10 cases） |
| `src/shared/components/canvas/CardCopilotPopover/CardCopilotPopover.tsx` | Create | Portal 浮层组件：Ref + Prompt + Model + Quality + Generate |
| `src/shared/components/canvas/CardCopilotPopover/CardCopilotPopover.test.tsx` | Create | 单元测试：4 kind 渲染、prompt 绑定、Generate、取消、Esc、错误（~15 cases） |
| `src/shared/components/canvas/CardCopilotPopover/index.ts` | Create | Barrel export |
| `src/shared/components/canvas/nodes/GenericCardNode.tsx` | Modify | `isPlaceholder: true` 时显示 "Output will appear here..." 占位 |
| `src/shared/components/canvas/nodes/GenericCardNode.test.tsx` | Create | 单元测试：占位 / 非占位两种渲染（~3 cases，**新文件**） |
| `src/shared/components/canvas/CanvasPanel.tsx` | Modify | `copilotTarget` state + 单/双击分离 + `useViewport` 位置重算 + resize handler + 卡片删除防御 + 移除 `copilotCard` nodeType 注册 + `handlePaneCreate` 改为创建占位卡片 |
| `src/shared/components/canvas/CanvasPanel.popover.test.tsx` | Create | 集成测试：右键创建 / 点击切换 / 双击 drawer / Esc / 空白 / 卡片删除 / viewport 跟随 / resize / self-click guard（~10 cases） |
| `src/shared/components/canvas/nodes/CopilotCardNode.tsx` | Modify (slim) | 简化为"已弃用，逻辑已迁移到 useCopilotGenerate"，或保留文件 + `.deprecated` 后缀 |
| `src/shared/components/canvas/nodes/CopilotCardNode.test.tsx` | 不变 | 现有测试文件保留验证组件隔离逻辑 |
| `src/shared/components/canvas/nodes/index.ts` | Modify | 移除 `copilotCard` 相关 export（可选保留 type export） |

总计：**新文件 14 个，修改文件 8 个，删除/弱删 0 个**。

---

## Task 1: 集中 z-index 常量

**Files:**
- Create: `src/shared/lib/zIndex.ts`

- [ ] **Step 1: 创建 zIndex.ts**

```ts
// src/shared/lib/zIndex.ts
/**
 * Canvas 浮层 z-index 集中管理。
 *
 * 作用域：仅 Canvas 浮层（drawer / popover / menu）。其他 z-50 组件
 * （Modal / Tooltip / ContextMenu）由各自模块独立维护，避免 scope 爆炸。
 */
export const Z_INDEX = {
  cardDetailDrawerMask: 10,
  cardDetailDrawer: 20,
  chatPanel: 40,
  cardCopilotPopover: 50,    // 与现有 Modal 系列（z-50）共存：DOM 后渲染者赢
  paneContextMenu: 60,       // 提升：命令级菜单优先于会话级 popover
  toast: 70,
} as const;
```

- [ ] **Step 2: 类型检查**

```bash
npx tsc --noEmit
```

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/shared/lib/zIndex.ts
git commit -m "feat(shared): add zIndex constants for Canvas overlays"
```

---

## Task 2: kindInference helper（kindToCardType / defaultTitle / inferKindFromCard）

**Files:**
- Create: `src/shared/components/canvas/helpers/kindInference.ts`
- Create: `src/shared/components/canvas/helpers/kindInference.test.ts`

- [ ] **Step 1: 写测试**

```ts
// src/shared/components/canvas/helpers/kindInference.test.ts
import { describe, it, expect } from 'vitest';
import { kindToCardType, defaultTitle, inferKindFromCard } from './kindInference';

describe('kindToCardType', () => {
  it('maps text → storyline', () => {
    expect(kindToCardType('text')).toBe('storyline');
  });
  it('maps image → art', () => {
    expect(kindToCardType('image')).toBe('art');
  });
  it('maps video → videoClip', () => {
    expect(kindToCardType('video')).toBe('videoClip');
  });
  it('maps upload → asset', () => {
    expect(kindToCardType('upload')).toBe('asset');
  });
});

describe('defaultTitle', () => {
  it('text → 新故事线', () => {
    expect(defaultTitle('text')).toBe('新故事线');
  });
  it('image → 新美术', () => {
    expect(defaultTitle('image')).toBe('新美术');
  });
  it('video → 新视频', () => {
    expect(defaultTitle('video')).toBe('新视频');
  });
  it('upload → 新素材', () => {
    expect(defaultTitle('upload')).toBe('新素材');
  });
});

describe('inferKindFromCard', () => {
  it('storyline → text', () => {
    expect(inferKindFromCard({ type: 'storyline' } as never)).toBe('text');
  });
  it('script → text', () => {
    expect(inferKindFromCard({ type: 'script' } as never)).toBe('text');
  });
  it('art → image', () => {
    expect(inferKindFromCard({ type: 'art' } as never)).toBe('image');
  });
  it('videoClip → video', () => {
    expect(inferKindFromCard({ type: 'videoClip' } as never)).toBe('video');
  });
  it('asset → upload', () => {
    expect(inferKindFromCard({ type: 'asset' } as never)).toBe('upload');
  });
  it('unknown type → text (fallback)', () => {
    expect(inferKindFromCard({ type: 'unknown' } as never)).toBe('text');
  });
});
```

- [ ] **Step 2: 运行测试验证失败**

```bash
npm test -- src/shared/components/canvas/helpers/kindInference.test.ts
```

Expected: FAIL with "Cannot find module"

- [ ] **Step 3: 实现 helper**

```ts
// src/shared/components/canvas/helpers/kindInference.ts
import type { CanvasNode, CanvasNodeType } from '@drama/types';
import type { CopilotKind } from '@shared/components/canvas/PaneContextMenu';

const KIND_TO_CARD_TYPE: Record<CopilotKind, CanvasNodeType> = {
  text: 'storyline',
  image: 'art',
  video: 'videoClip',
  upload: 'asset',
};

const DEFAULT_TITLES: Record<CopilotKind, string> = {
  text: '新故事线',
  image: '新美术',
  video: '新视频',
  upload: '新素材',
};

export function kindToCardType(kind: CopilotKind): CanvasNodeType {
  return KIND_TO_CARD_TYPE[kind];
}

export function defaultTitle(kind: CopilotKind): string {
  return DEFAULT_TITLES[kind];
}

/** 根据已有卡片类型推断点击时应该用哪种 kind */
export function inferKindFromCard(node: CanvasNode): CopilotKind {
  switch (node.type) {
    case 'storyline':
    case 'script':
    case 'sceneCard':
    case 'character':
    case 'task':
      return 'text';
    case 'art':
      return 'image';
    case 'videoClip':
    case 'deliverable':
      return 'video';
    case 'asset':
    case 'moodboard':
      return 'upload';
    default:
      return 'text';
  }
}
```

> **注**：上面 import 用了 `@shared/...` 路径别名（项目已配置）。`CopilotKind` 从 `PaneContextMenu.tsx` 直接导出，与现有代码保持一致。

- [ ] **Step 4: 运行测试验证通过**

```bash
npm test -- src/shared/components/canvas/helpers/kindInference.test.ts
```

Expected: PASS（14 个 case）

- [ ] **Step 5: 类型检查**

```bash
npx tsc --noEmit
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/shared/components/canvas/helpers/kindInference.ts src/shared/components/canvas/helpers/kindInference.test.ts
git commit -m "feat(canvas): add kindToCardType / defaultTitle / inferKindFromCard helpers"
```

---

## Task 3: capability helper（inferCapability）

**Files:**
- Create: `src/shared/components/canvas/helpers/capability.ts`
- Create: `src/shared/components/canvas/helpers/capability.test.ts`

- [ ] **Step 1: 写测试**

```ts
// src/shared/components/canvas/helpers/capability.test.ts
import { describe, it, expect } from 'vitest';
import { inferCapability } from './capability';

describe('inferCapability', () => {
  it('image no ref → text2image', () => {
    expect(inferCapability('image', false)).toBe('text2image');
  });
  it('image with ref → image2image', () => {
    expect(inferCapability('image', true)).toBe('image2image');
  });
  it('video no ref → text2video', () => {
    expect(inferCapability('video', false)).toBe('text2video');
  });
  it('video with ref → image2video', () => {
    expect(inferCapability('video', true)).toBe('image2video');
  });
  it('text throws', () => {
    expect(() => inferCapability('text', false)).toThrow();
  });
  it('upload throws', () => {
    expect(() => inferCapability('upload', false)).toThrow();
  });
});
```

- [ ] **Step 2: 运行测试验证失败**

```bash
npm test -- src/shared/components/canvas/helpers/capability.test.ts
```

Expected: FAIL

- [ ] **Step 3: 实现**

```ts
// src/shared/components/canvas/helpers/capability.ts
import type { Capability } from '@drama/lib/canvasToolkit';
import type { CopilotKind } from '@shared/components/canvas/PaneContextMenu';

/**
 * 根据 kind 和是否上传参考图推断 GenerationInput.capability。
 *
 * 重要：doubaoProvider 在 text2image 分支会静默丢弃 referenceUrl
 * （见 providers/doubaoProvider.ts:167-189）。所以必须正确选择 capability，
 * 否则用户上传的参考图会没效果。
 */
export function inferCapability(kind: CopilotKind, hasRef: boolean): Capability {
  if (kind === 'image') return hasRef ? 'image2image' : 'text2image';
  if (kind === 'video') return hasRef ? 'image2video' : 'text2video';
  throw new Error(`unsupported kind for capability: ${kind}`);
}
```

- [ ] **Step 4: 运行测试验证通过**

```bash
npm test -- src/shared/components/canvas/helpers/capability.test.ts
```

Expected: PASS（6 cases）

- [ ] **Step 5: Commit**

```bash
git add src/shared/components/canvas/helpers/capability.ts src/shared/components/canvas/helpers/capability.test.ts
git commit -m "feat(canvas): add inferCapability helper for kind + ref → capability mapping"
```

---

## Task 4: migrateCopilotCards 纯函数

**Files:**
- Create: `src/apps/drama/lib/migrateCopilotCards.ts`
- Create: `src/apps/drama/lib/migrateCopilotCards.test.ts`

- [ ] **Step 1: 写测试**

```ts
// src/apps/drama/lib/migrateCopilotCards.test.ts
import { describe, it, expect } from 'vitest';
import { migrateCopilotCards, countCopilotCards } from './migrateCopilotCards';
import type { CanvasNode } from '@drama/types';

function makeCopilotNode(kind: string, status: string, result?: { url: string }): CanvasNode {
  return {
    id: `copilot_${kind}_${status}`,
    type: 'copilotCard',
    position: { x: 0, y: 0 },
    data: {
      title: '',
      kind,
      status,
      prompt: 'a cat',
      providerId: 'mock',
      ...(result ? { result } : {}),
    } as never,
  };
}

describe('migrateCopilotCards — image kind', () => {
  it('done + result → art card with thumbnail', () => {
    const input = [makeCopilotNode('image', 'done', { url: 'http://img.png' })];
    const out = migrateCopilotCards(input);
    expect(out[0].type).toBe('art');
    expect(out[0].data.thumbnail).toBe('http://img.png');
    expect(out[0].data.generatedPrompt).toBe('a cat');
    expect(out[0].data.isPlaceholder).toBe(false);
  });
  it('generating → art placeholder', () => {
    const out = migrateCopilotCards([makeCopilotNode('image', 'generating')]);
    expect(out[0].type).toBe('art');
    expect(out[0].data.isPlaceholder).toBe(true);
    expect(out[0].data.thumbnail).toBeUndefined();
  });
  it('idle → art placeholder', () => {
    const out = migrateCopilotCards([makeCopilotNode('image', 'idle')]);
    expect(out[0].type).toBe('art');
    expect(out[0].data.isPlaceholder).toBe(true);
  });
});

describe('migrateCopilotCards — video kind', () => {
  it('done → videoClip', () => {
    const out = migrateCopilotCards([makeCopilotNode('video', 'done', { url: 'http://v.mp4' })]);
    expect(out[0].type).toBe('videoClip');
  });
});

describe('migrateCopilotCards — text kind', () => {
  it('done → storyline', () => {
    const out = migrateCopilotCards([makeCopilotNode('text', 'done', { url: '' })]);
    expect(out[0].type).toBe('storyline');
  });
});

describe('migrateCopilotCards — upload kind', () => {
  it('done → asset', () => {
    const out = migrateCopilotCards([makeCopilotNode('upload', 'done', { url: 'data:...' })]);
    expect(out[0].type).toBe('asset');
  });
});

describe('migrateCopilotCards — pass-through', () => {
  it('non-copilotCard node passes through unchanged', () => {
    const story: CanvasNode = {
      id: 'story_1',
      type: 'storyline',
      position: { x: 0, y: 0 },
      data: { title: 'existing story' },
    };
    const out = migrateCopilotCards([story]);
    expect(out[0]).toBe(story);
  });
});

describe('migrateCopilotCards — fallback', () => {
  it('undefined kind → storyline (fallback)', () => {
    const node: CanvasNode = {
      id: 'c1',
      type: 'copilotCard',
      position: { x: 0, y: 0 },
      data: { kind: undefined, status: 'idle' } as never,
    };
    const out = migrateCopilotCards([node]);
    expect(out[0].type).toBe('storyline');
  });
});

describe('countCopilotCards', () => {
  it('counts only copilotCard nodes', () => {
    const nodes = [
      makeCopilotNode('image', 'idle'),
      makeCopilotNode('video', 'done'),
      { id: 's1', type: 'storyline', position: { x: 0, y: 0 }, data: {} } as CanvasNode,
    ];
    expect(countCopilotCards(nodes)).toBe(2);
  });
  it('empty array → 0', () => {
    expect(countCopilotCards([])).toBe(0);
  });
});
```

- [ ] **Step 2: 运行测试验证失败**

```bash
npm test -- src/apps/drama/lib/migrateCopilotCards.test.ts
```

Expected: FAIL

- [ ] **Step 3: 实现 migrateCopilotCards**

```ts
// src/apps/drama/lib/migrateCopilotCards.ts
import type { CanvasNode, CanvasNodeType } from '@drama/types';

const KIND_TO_CARD_TYPE: Record<string, CanvasNodeType> = {
  image: 'art',
  video: 'videoClip',
  text: 'storyline',
  upload: 'asset',
};

const DEFAULT_TITLES: Record<string, string> = {
  image: '新美术',
  video: '新视频',
  text: '新故事线',
  upload: '新素材',
};

/**
 * 迁移老的 copilotCard 节点到对应正式类型。
 * - status='done' + result.url → 写入 thumbnail/sourceProvider/generatedPrompt
 * - 其他状态 → isPlaceholder=true（用户可点击重新生成）
 *
 * 幂等：非 copilotCard 节点原样返回。
 */
export function migrateCopilotCards(nodes: CanvasNode[]): CanvasNode[] {
  return nodes.map((node) => {
    if (node.type !== 'copilotCard') return node;
    const data = node.data as Record<string, unknown>;
    const kind = (data.kind as string) ?? 'text';
    const newType = KIND_TO_CARD_TYPE[kind] ?? 'storyline';
    const result = data.result as Record<string, unknown> | undefined;
    const hasResult = data.status === 'done' && result?.url;
    return {
      ...node,
      type: newType,
      data: {
        title: DEFAULT_TITLES[kind] ?? '未命名卡片',
        isPlaceholder: !hasResult,
        ...(hasResult && {
          thumbnail: result!.url as string,
          generatedPrompt: data.prompt as string | undefined,
          sourceProvider: data.providerId as string | undefined,
        }),
        status: 'draft',
      },
    };
  });
}

export function countCopilotCards(nodes: CanvasNode[]): number {
  return nodes.filter((n) => n.type === 'copilotCard').length;
}
```

- [ ] **Step 4: 运行测试验证通过**

```bash
npm test -- src/apps/drama/lib/migrateCopilotCards.test.ts
```

Expected: PASS（~14 cases）

- [ ] **Step 5: Commit**

```bash
git add src/apps/drama/lib/migrateCopilotCards.ts src/apps/drama/lib/migrateCopilotCards.test.ts
git commit -m "feat(canvas): add migrateCopilotCards for v1→v2 node type migration"
```

---

## Task 5: canvasStore persist v3→v4 集成迁移

**Files:**
- Modify: `src/apps/drama/stores/canvasStore.ts:364,366-407`
- Create: `src/apps/drama/stores/canvasStore.migrate.test.ts`

- [ ] **Step 1: 写集成测试**

```ts
// src/apps/drama/stores/canvasStore.migrate.test.ts
import { describe, it, expect } from 'vitest';
import { useCanvasStore } from './canvasStore';

describe('canvasStore persist migrate v3→v4', () => {
  // Zustand persist 直接暴露 getOptions()。这是项目现有模式
  // （见 canvasStore.test.ts:131），避免使用 __testHelpers 间接访问。
  const getMigrate = () => useCanvasStore.persist.getOptions().migrate!;

  it('converts copilotCard nodes in v3 persisted state', () => {
    const v3State = {
      canvases: {
        proj_1: {
          nodes: [
            {
              id: 'c1',
              type: 'copilotCard',
              position: { x: 0, y: 0 },
              data: { kind: 'image', status: 'done', result: { url: 'http://img.png' }, prompt: 'cat' },
            },
            {
              id: 'c2',
              type: 'copilotCard',
              position: { x: 0, y: 0 },
              data: { kind: 'video', status: 'idle', prompt: 'walk' },
            },
            {
              id: 's1',
              type: 'storyline',
              position: { x: 0, y: 0 },
              data: { title: 'existing' },
            },
          ],
          edges: [],
          viewport: { x: 0, y: 0, zoom: 1 },
        },
      },
    };
    const migrated = getMigrate()(v3State, 3) as typeof v3State;
    expect(migrated.canvases.proj_1.nodes[0].type).toBe('art');
    expect(migrated.canvases.proj_1.nodes[0].data.thumbnail).toBe('http://img.png');
    expect(migrated.canvases.proj_1.nodes[1].type).toBe('videoClip');
    expect(migrated.canvases.proj_1.nodes[1].data.isPlaceholder).toBe(true);
    expect(migrated.canvases.proj_1.nodes[2]).toEqual(v3State.canvases.proj_1.nodes[2]);
  });

  it('idempotent on v4 state (no double migration)', () => {
    const v4State = {
      canvases: {
        proj_1: {
          nodes: [
            { id: 'a1', type: 'art', position: { x: 0, y: 0 }, data: { title: 'x' } },
          ],
          edges: [],
          viewport: { x: 0, y: 0, zoom: 1 },
        },
      },
    };
    const result = getMigrate()(v4State, 4) as typeof v4State;
    expect(result.canvases.proj_1.nodes[0]).toEqual(v4State.canvases.proj_1.nodes[0]);
  });
});
```

- [ ] **Step 2: 验证测试可访问 migrate（无需额外导出）**

Zustand persist 默认暴露 `getOptions()`，测试可以直接通过 `useCanvasStore.persist.getOptions().migrate` 访问（参见 `src/apps/drama/stores/canvasStore.test.ts:131` 的现有用法）。

**无需在 `canvasStore.ts` 加任何导出代码。** 如果测试运行时找不到 `migrate`，说明 persist 配置未正确应用，按报错检查。

- [ ] **Step 3: 运行测试验证失败**

```bash
npm test -- src/apps/drama/stores/canvasStore.migrate.test.ts
```

Expected: FAIL（copilotCard 没被转换）

- [ ] **Step 4: 在 canvasStore.ts 加 v3→v4 migrate 分支**

打开 `src/apps/drama/stores/canvasStore.ts`，找到 persist 的 migrate 函数（约 366-407 行）。在现有 `if (version < 3) { ... }` 之后、`return state` 之前插入：

```ts
// canvasStore.ts migrate 函数内，version < 3 块之后
import { migrateCopilotCards } from '@drama/lib/migrateCopilotCards';
// ... 在文件顶部加 import

if (version < 4) {
  const canvases = state.canvases as Record<string, CanvasEntry> | undefined;
  if (canvases) {
    for (const key of Object.keys(canvases)) {
      const entry = canvases[key];
      const toMigrate = entry.nodes.filter((n) => n.type === 'copilotCard').length;
      if (toMigrate > 0) {
        if (import.meta.env.DEV) {
          console.info(`[canvasStore v3→v4] migrating ${toMigrate} copilotCard nodes in ${key}`);
        }
        entry.nodes = migrateCopilotCards(entry.nodes);
      }
    }
  }
}
```

并把 `version: 3` 改成 `version: 4`：

```ts
version: 4,  // ← 从 3 提升
```

- [ ] **Step 5: 运行测试验证通过**

```bash
npm test -- src/apps/drama/stores/canvasStore.migrate.test.ts
```

Expected: PASS（2 cases）

- [ ] **Step 6: 全量测试确保没回归**

```bash
npm test
```

Expected: PASS（292 个原测试 + 新增 ~2 个测试）

- [ ] **Step 7: Commit**

```bash
git add src/apps/drama/stores/canvasStore.ts src/apps/drama/stores/canvasStore.migrate.test.ts
git commit -m "feat(canvas): persist migrate v3→v4 converts copilotCard nodes to formal types"
```

---

## Task 6: 从 types/toolConfigs/toolRouter 移除 copilotCard

**Files:**
- Modify: `src/apps/drama/types/index.ts:72`
- Modify: `src/apps/drama/lib/toolConfigs.ts:85`
- Modify: `src/apps/drama/stores/toolRouter/cards.ts:163`

- [ ] **Step 1: 从 CanvasNodeType union 移除**

打开 `src/apps/drama/types/index.ts`，删除 `'copilotCard'`：

```ts
// 修改前
| 'sceneCard'
| 'copilotCard';

// 修改后
| 'sceneCard'
;
```

- [ ] **Step 2: 从 toolConfigs schema enum 移除**

打开 `src/apps/drama/lib/toolConfigs.ts`，第 85 行的 enum：

```ts
// 修改前
enum: ["storyline", "moodboard", "videoClip", "asset", "task", "art", "character", "script", "sceneCard", "deliverable", "copilotCard"],

// 修改后
enum: ["storyline", "moodboard", "videoClip", "asset", "task", "art", "character", "script", "sceneCard", "deliverable"],
```

- [ ] **Step 3: 从 CARD_TYPE_ICONS 移除**

打开 `src/apps/drama/stores/toolRouter/cards.ts`，第 163 行附近：

```ts
// 修改前
const CARD_TYPE_ICONS: Record<string, string> = {
  storyline: '📖',
  moodboard: '🎨',
  ...
  copilotCard: '🤖',  // ← 删除
};

// 修改后（删除该行即可）
```

- [ ] **Step 4: 在 CanvasNodeData 新增 isPlaceholder + fileRef**

打开 `src/apps/drama/types/index.ts`，在 `CanvasNodeData` interface 末尾（`[key: string]: unknown;` 之前）添加：

```ts
export interface CanvasNodeData {
  // ... 现有字段 ...
  
  // 占位标记（v2+）：true 时 GenericCardNode 显示 "Output will appear here..."
  isPlaceholder?: boolean;
  
  // Ref 文件引用（v2+）：用户通过 CardCopilotPopover 上传的本地预览
  fileRef?: {
    name: string;
    size: number;
    kind: 'image' | 'video' | 'audio';
    dataUrl: string;
  };
  
  // Allow arbitrary extensions
  [key: string]: unknown;
}
```

- [ ] **Step 5: 类型检查**

```bash
npx tsc --noEmit
```

Expected: PASS（若有 copilotCard 相关代码引用导致 TS 报错，按报错位置继续清理）

- [ ] **Step 6: 全量测试**

```bash
npm test
```

Expected: PASS（CopilotCardNode.test.tsx 因组件内部 import 类型仍存在可继续通过；其他测试不变）

- [ ] **Step 7: Commit**

```bash
git add src/apps/drama/types/index.ts src/apps/drama/lib/toolConfigs.ts src/apps/drama/stores/toolRouter/cards.ts
git commit -m "refactor: remove 'copilotCard' from CanvasNodeType union and tool schemas"
```

---

## Task 7: useCopilotGenerate hook

**Files:**
- Create: `src/shared/components/canvas/hooks/useCopilotGenerate.ts`
- Create: `src/shared/components/canvas/hooks/useCopilotGenerate.test.ts`

- [ ] **Step 1: 写测试**

```ts
// src/shared/components/canvas/hooks/useCopilotGenerate.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useCopilotGenerate } from './useCopilotGenerate';
import { useCanvasStore } from '@drama/stores/canvasStore';
import { useProjectStore } from '@drama/stores/projectStore';
import type { CanvasNodeType } from '@drama/types';
import { providerRegistry } from '@drama/lib/canvasToolkit';

// 设置项目状态与画布节点（参照 canvasStore.test.ts:7-20 的现有模式）
function setupProjectAndCard(cardId: string, type: CanvasNodeType = 'storyline') {
  useProjectStore.setState({
    projects: [{ id: 'proj_1', title: 'Test', description: '', updatedAt: '', sceneCount: 0, duration: 0, coverColor: '#6366f1' }],
    trees: { 'proj_1': { id: 'root', type: 'project', title: 'Test', status: 'draft' as const } },
    currentProjectId: 'proj_1',
    selectedNodeId: null,
  });
  useCanvasStore.setState({
    canvases: {
      proj_1: {
        nodes: [{ id: cardId, type, position: { x: 0, y: 0 }, data: { title: 'pre-existing', isPlaceholder: true } }],
        edges: [],
        viewport: { x: 0, y: 0, zoom: 1 },
      },
    },
  });
}

beforeEach(() => {
  // 每个 test 独立环境
});

// Mock provider registry
vi.mock('@drama/lib/canvasToolkit', async () => {
  const actual = await vi.importActual('@drama/lib/canvasToolkit');
  return {
    ...actual,
    providerRegistry: {
      get: vi.fn(),
      list: vi.fn(() => []),
      ids: vi.fn(() => []),
    },
    pollUntilDone: vi.fn(async (provider, taskId) => ({
      taskId,
      status: 'done',
      resultUrl: 'http://result.png',
    })),
  };
});

describe('useCopilotGenerate — text kind', () => {
  it('updates card title/description without provider call', async () => {
    setupProjectAndCard('card_1');
    const { result } = renderHook(() =>
      useCopilotGenerate({ cardId: 'card_1', kind: 'text' })
    );
    await act(async () => {
      await result.current.generate({ prompt: 'a hero enters' });
    });
    await waitFor(() => expect(result.current.status).toBe('done'));
    const card = useCanvasStore.getState().getCurrentNodes().find((n) => n.id === 'card_1');
    expect(card?.data.description).toBe('a hero enters');
    expect(card?.data.isPlaceholder).toBe(false);
  });
});

describe('useCopilotGenerate — image kind + ref', () => {
  beforeEach(() => {
    vi.mocked(providerRegistry.get).mockReturnValue({
      id: 'mock',
      name: 'mock',
      supportedMedia: ['image'],
      capabilities: ['image2image'],
      requiredConfigKeys: [],
      isConfigured: () => true,
      configure: vi.fn(),
      estimateCost: vi.fn(() => ({ amount: 0, unit: '' })),
      submit: vi.fn(async () => ({ taskId: 't1', status: 'processing' as const })),
      poll: vi.fn(),
    } as never);
  });

  it('infers capability=image2image when ref present', async () => {
    setupProjectAndCard('card_2', 'art');
    const { result } = renderHook(() =>
      useCopilotGenerate({ cardId: 'card_2', kind: 'image' })
    );
    await act(async () => {
      await result.current.generate({
        prompt: 'a cat',
        providerId: 'mock',
        fileRef: { name: 'ref.png', size: 100, kind: 'image', dataUrl: 'data:...' },
      });
    });
    await waitFor(() => expect(result.current.status).toBe('done'));
    expect(providerRegistry.get).toHaveBeenCalledWith('mock');
  });

  it('infers capability=text2image when no ref', async () => {
    setupProjectAndCard('card_3', 'art');
    const submitSpy = vi.fn(async () => ({ taskId: 't2', status: 'processing' as const }));
    vi.mocked(providerRegistry.get).mockReturnValue({
      id: 'mock',
      name: 'mock',
      supportedMedia: ['image'],
      capabilities: ['text2image', 'image2image'],
      requiredConfigKeys: [],
      isConfigured: () => true,
      configure: vi.fn(),
      estimateCost: vi.fn(() => ({ amount: 0, unit: '' })),
      submit: submitSpy,
      poll: vi.fn(),
    } as never);
    const { result } = renderHook(() =>
      useCopilotGenerate({ cardId: 'card_3', kind: 'image' })
    );
    await act(async () => {
      await result.current.generate({ prompt: 'a cat', providerId: 'mock' });
    });
    await waitFor(() => expect(result.current.status).toBe('done'));
    expect(submitSpy).toHaveBeenCalledWith(expect.objectContaining({ capability: 'text2image' }));
  });
});

describe('useCopilotGenerate — error path', () => {
  it('sets status=error when provider throws', async () => {
    vi.mocked(providerRegistry.get).mockReturnValue({
      id: 'bad',
      name: 'bad',
      supportedMedia: ['image'],
      capabilities: ['text2image'],
      requiredConfigKeys: [],
      isConfigured: () => true,
      configure: vi.fn(),
      estimateCost: vi.fn(() => ({ amount: 0, unit: '' })),
      submit: vi.fn(async () => { throw new Error('API error'); }),
      poll: vi.fn(),
    } as never);
    setupProjectAndCard('card_4', 'art');
    const { result } = renderHook(() =>
      useCopilotGenerate({ cardId: 'card_4', kind: 'image' })
    );
    await act(async () => {
      await result.current.generate({ prompt: 'a cat', providerId: 'bad' });
    });
    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.error).toBe('API error');
  });
});

describe('useCopilotGenerate — abort', () => {
  it('cancel() resets status to idle', async () => {
    setupProjectAndCard('card_5', 'art');
    const { result } = renderHook(() =>
      useCopilotGenerate({ cardId: 'card_5', kind: 'image' })
    );
    vi.mocked(providerRegistry.get).mockReturnValue({
      id: 'slow',
      name: 'slow',
      supportedMedia: ['image'],
      capabilities: ['text2image'],
      requiredConfigKeys: [],
      isConfigured: () => true,
      configure: vi.fn(),
      estimateCost: vi.fn(() => ({ amount: 0, unit: '' })),
      submit: vi.fn(async () => ({ taskId: 't_slow', status: 'processing' as const })),
      poll: vi.fn(),
    } as never);
    act(() => {
      result.current.generate({ prompt: 'a cat', providerId: 'slow' });
    });
    await waitFor(() => expect(result.current.status).toBe('generating'));
    act(() => result.current.cancel());
    await waitFor(() => expect(result.current.status).toBe('idle'));
  });
});
```

- [ ] **Step 2: 运行测试验证失败**

```bash
npm test -- src/shared/components/canvas/hooks/useCopilotGenerate.test.tsx
```

Expected: FAIL

- [ ] **Step 3: 实现 hook**

```ts
// src/shared/components/canvas/hooks/useCopilotGenerate.ts
import { useCallback, useEffect, useRef, useState } from 'react';
import { useCanvasStore } from '@drama/stores/canvasStore';
import type { CanvasNodeType } from '@drama/types';
import { providerRegistry } from '@drama/lib/canvasToolkit';
import { pollUntilDone } from '@drama/lib/canvasToolkit/shared';
import type { CopilotKind } from '@shared/components/canvas/PaneContextMenu';
import { inferCapability } from '@shared/components/canvas/helpers/capability';

export interface FileRefData {
  name: string;
  size: number;
  kind: 'image' | 'video' | 'audio';
  dataUrl: string;
}

export interface GenerateParams {
  prompt: string;
  providerId?: string;
  fileRef?: FileRefData;
}

export type GenerateStatus = 'idle' | 'generating' | 'done' | 'error';

export interface UseCopilotGenerateResult {
  status: GenerateStatus;
  progress: number;
  error: string | null;
  generate: (params: GenerateParams) => Promise<void>;
  cancel: () => void;
}

export function useCopilotGenerate(opts: {
  cardId: string;
  kind: CopilotKind;
  onSuccess?: () => void;
}): UseCopilotGenerateResult {
  const { cardId, kind, onSuccess } = opts;
  const [status, setStatus] = useState<GenerateStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const updateNodeData = useCanvasStore.getState().updateNodeData;

  const generate = useCallback(
    async (params: GenerateParams) => {
      abortRef.current = new AbortController();
      setStatus('generating');
      setProgress(0);
      setError(null);

      try {
        if (kind === 'text') {
          updateNodeData(cardId, {
            title: params.prompt.slice(0, 30) || '新故事线',
            description: params.prompt,
            isPlaceholder: false,
          });
          setStatus('done');
          onSuccess?.();
          return;
        }

        if (kind === 'upload') {
          if (!params.fileRef) throw new Error('未选择文件');
          updateNodeData(cardId, {
            title: params.fileRef.name,
            thumbnail: params.fileRef.dataUrl,
            fileSize: params.fileRef.size,
            fileRef: params.fileRef,
            isPlaceholder: false,
          });
          setStatus('done');
          onSuccess?.();
          return;
        }

        // image / video — 调用 provider
        const provider = providerRegistry.get(params.providerId ?? '');
        if (!provider) throw new Error(`Provider ${params.providerId} 未配置`);
        const capability = inferCapability(kind, !!params.fileRef);
        const task = await provider.submit({
          type: kind,
          capability,
          prompt: params.prompt,
          referenceUrl: params.fileRef?.dataUrl,
        });
        const final = await pollUntilDone(
          provider,
          task.taskId,
          setProgress,
          abortRef.current.signal,
        );
        updateNodeData(cardId, {
          thumbnail: final.resultUrl,
          generatedPrompt: params.prompt,
          sourceProvider: params.providerId,
          isPlaceholder: false,
        });
        setStatus('done');
        onSuccess?.();
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          setStatus('idle');
          return;
        }
        setError(err instanceof Error ? err.message : String(err));
        setStatus('error');
      }
    },
    [cardId, kind, onSuccess, updateNodeData],
  );

  const cancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  // 卸载时清理
  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  return { status, progress, error, generate, cancel };
}
```

> **注**：`@shared/components/canvas/PaneContextMenu` 是已有路径别名。如果 helper 文件在 `src/shared/components/canvas/helpers/` 下，导入路径需用 `@shared/components/canvas/helpers/capability`。根据实际路径别名配置调整。

- [ ] **Step 4: 运行测试验证通过**

```bash
npm test -- src/shared/components/canvas/hooks/useCopilotGenerate.test.tsx
```

Expected: PASS（~5 cases）

- [ ] **Step 5: 类型检查**

```bash
npx tsc --noEmit
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/shared/components/canvas/hooks/useCopilotGenerate.ts src/shared/components/canvas/hooks/useCopilotGenerate.test.tsx
git commit -m "feat(canvas): add useCopilotGenerate hook extracted from CopilotCardNode"
```

---

## Task 8: GenericCardNode 占位状态渲染

**Files:**
- Modify: `src/shared/components/canvas/nodes/GenericCardNode.tsx`
- Create: `src/shared/components/canvas/nodes/GenericCardNode.test.tsx`

- [ ] **Step 1: 写测试**

```tsx
// src/shared/components/canvas/nodes/GenericCardNode.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GenericCardNode } from './GenericCardNode';
import type { NodeProps } from '@xyflow/react';

vi.mock('@xyflow/react', async () => {
  const actual = await vi.importActual('@xyflow/react');
  return { ...actual, Handle: () => null };
});

function makeProps(data: Record<string, unknown>): NodeProps {
  return {
    id: 'n1',
    data: data as never,
    type: 'storyline',
    selected: false,
    zIndex: 0,
    isConnectable: false,
    xPos: 0,
    yPos: 0,
    dragging: false,
  } as never;
}

describe('GenericCardNode — placeholder state', () => {
  it('shows "Output will appear here..." when isPlaceholder=true', () => {
    render(<GenericCardNode {...makeProps({ type: 'storyline', title: 'X', isPlaceholder: true })} />);
    expect(screen.getByText(/Output will appear here/i)).toBeInTheDocument();
  });

  it('hides description when isPlaceholder=true', () => {
    render(
      <GenericCardNode
        {...makeProps({
          type: 'storyline',
          title: 'X',
          isPlaceholder: true,
          description: 'should not show',
        })}
      />,
    );
    expect(screen.queryByText('should not show')).not.toBeInTheDocument();
  });
});

describe('GenericCardNode — normal state', () => {
  it('shows title when isPlaceholder=false', () => {
    render(<GenericCardNode {...makeProps({ type: 'storyline', title: 'My Story' })} />);
    expect(screen.getByText('My Story')).toBeInTheDocument();
  });

  it('shows description when isPlaceholder=false', () => {
    render(
      <GenericCardNode
        {...makeProps({ type: 'storyline', title: 'My Story', description: 'A great story' })}
      />,
    );
    expect(screen.getByText('A great story')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 运行测试验证失败**

```bash
npm test -- src/shared/components/canvas/nodes/GenericCardNode.test.tsx
```

Expected: FAIL

- [ ] **Step 3: 修改 GenericCardNode 支持占位**

打开 `src/shared/components/canvas/nodes/GenericCardNode.tsx`。在组件内部，约 25-27 行的解构下面添加：

```tsx
const isPlaceholder = (data as Record<string, unknown>).isPlaceholder as boolean | undefined;
```

然后**包住现有的 body 渲染**（约 38-100 行），改成条件渲染：

```tsx
{isPlaceholder ? (
  <div className="flex flex-col items-center justify-center py-6 text-center">
    <span className="text-2xl text-[var(--color-text-tertiary)]">{v.icon}</span>
    <span className="mt-2 text-[12px] text-[var(--color-text-tertiary)]">
      Output will appear here...
    </span>
  </div>
) : (
  <>
    {/* 现有的 Body 内容（h4 / description / meta row） */}
  </>
)}
```

并**条件渲染 children + linkedCardIds**：

```tsx
{!isPlaceholder && data.children && data.children.length > 0 && (
  <div className={`border-t ${v.headerBorder} px-3 py-2`}>
    {/* ... 现有 children 渲染 ... */}
  </div>
)}

{!isPlaceholder && data.linkedCardIds && data.linkedCardIds.length > 0 && (
  <div className="border-t border-[var(--color-border-default)] px-3 py-1.5">
    {/* ... 现有 linkedCardIds 渲染 ... */}
  </div>
)}
```

- [ ] **Step 4: 运行测试验证通过**

```bash
npm test -- src/shared/components/canvas/nodes/GenericCardNode.test.tsx
```

Expected: PASS（4 cases）

- [ ] **Step 5: Commit**

```bash
git add src/shared/components/canvas/nodes/GenericCardNode.tsx src/shared/components/canvas/nodes/GenericCardNode.test.tsx
git commit -m "feat(canvas): GenericCardNode renders 'Output will appear here...' placeholder"
```

---

## Task 9: CardCopilotPopover 组件

**Files:**
- Create: `src/shared/components/canvas/CardCopilotPopover/CardCopilotPopover.tsx`
- Create: `src/shared/components/canvas/CardCopilotPopover/CardCopilotPopover.test.tsx`
- Create: `src/shared/components/canvas/CardCopilotPopover/index.ts`

- [ ] **Step 1: 写测试**

```tsx
// src/shared/components/canvas/CardCopilotPopover/CardCopilotPopover.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CardCopilotPopover } from './CardCopilotPopover';
import type { CanvasNode } from '@drama/types';

// Mock portal target so we can query elements
beforeAll(() => {
  const div = document.createElement('div');
  div.setAttribute('id', 'popover-root');
  document.body.appendChild(div);
});

const baseProps = {
  cardId: 'card_1',
  kind: 'text' as const,
  screenPosition: { x: 300, y: 400 },
  onClose: vi.fn(),
};

describe('CardCopilotPopover — text kind', () => {
  it('renders textarea for prompt', () => {
    render(<CardCopilotPopover {...baseProps} />);
    expect(screen.getByPlaceholderText(/提示词|enter.*prompt/i)).toBeInTheDocument();
  });

  it('Generate button disabled when prompt is empty', () => {
    render(<CardCopilotPopover {...baseProps} />);
    expect(screen.getByRole('button', { name: /生成|generate/i })).toBeDisabled();
  });

  it('Generate button enabled when prompt is non-empty', () => {
    render(<CardCopilotPopover {...baseProps} />);
    const textarea = screen.getByPlaceholderText(/提示词/i) as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'a hero' } });
    expect(screen.getByRole('button', { name: /生成/i })).not.toBeDisabled();
  });

  it('does NOT show Ref button for text kind', () => {
    render(<CardCopilotPopover {...baseProps} />);
    expect(screen.queryByText(/^Ref$/)).not.toBeInTheDocument();
  });
});

describe('CardCopilotPopover — image kind', () => {
  it('renders Ref button + prompt + generate', () => {
    render(<CardCopilotPopover {...baseProps} kind="image" />);
    expect(screen.getByText(/^Ref$/)).toBeInTheDocument();
  });
});

describe('CardCopilotPopover — Esc close', () => {
  it('calls onClose when Escape pressed', () => {
    const onClose = vi.fn();
    render(<CardCopilotPopover {...baseProps} onClose={onClose} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
  });
});

describe('CardCopilotPopover — portal mount', () => {
  it('renders via portal at position:fixed', () => {
    const { container } = render(<CardCopilotPopover {...baseProps} />);
    // 弹窗不应该在 container 里（应该在 portal 里）
    expect(container.innerHTML).toBe('');
  });
});
```

- [ ] **Step 2: 运行测试验证失败**

```bash
npm test -- src/shared/components/canvas/CardCopilotPopover/CardCopilotPopover.test.tsx
```

Expected: FAIL

- [ ] **Step 3: 实现 CardCopilotPopover**

```tsx
// src/shared/components/canvas/CardCopilotPopover/CardCopilotPopover.tsx
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Upload } from 'lucide-react';
import { useCopilotGenerate, type FileRefData } from '@shared/components/canvas/hooks/useCopilotGenerate';
import type { CopilotKind } from '@shared/components/canvas/PaneContextMenu';
import { Z_INDEX } from '@shared/lib/zIndex';

const POPOVER_AUTOCLOSE_DELAY_MS = 1200;

export interface CardCopilotPopoverProps {
  cardId: string;
  kind: CopilotKind;
  screenPosition: { x: number; y: number };
  onClose: () => void;
}

const POPOVER_WIDTH = 480;
const VIEWPORT_PAD = 16;
const NAVBAR_HEIGHT = 64;

export function CardCopilotPopover({ cardId, kind, screenPosition, onClose }: CardCopilotPopoverProps) {
  const [prompt, setPrompt] = useState('');
  const [fileRef, setFileRef] = useState<FileRefData | null>(null);
  const { status, progress, error, generate, cancel } = useCopilotGenerate({
    cardId,
    kind,
    onSuccess: () => {
      setTimeout(onClose, POPOVER_AUTOCLOSE_DELAY_MS);
    },
  });

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (status === 'generating') cancel();
        else onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose, status, cancel]);

  const left = Math.max(
    VIEWPORT_PAD,
    Math.min(screenPosition.x - POPOVER_WIDTH / 2, window.innerWidth - POPOVER_WIDTH - VIEWPORT_PAD),
  );
  const top = Math.max(NAVBAR_HEIGHT, screenPosition.y);

  const handleGenerate = () => {
    if (!prompt.trim()) return;
    generate({ prompt, providerId: 'default', fileRef: fileRef ?? undefined });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result ?? '');
      let kind: 'image' | 'video' | 'audio' = 'image';
      if (file.type.startsWith('video/')) kind = 'video';
      else if (file.type.startsWith('audio/')) kind = 'audio';
      setFileRef({ name: file.name, size: file.size, kind, dataUrl });
    };
    reader.readAsDataURL(file);
  };

  const isGenerating = status === 'generating';
  const canGenerate = !isGenerating && (kind === 'upload' ? !!fileRef : prompt.trim().length > 0);

  return createPortal(
    <div
      role="dialog"
      aria-label="Copilot tool panel"
      style={{
        position: 'fixed',
        left,
        top,
        width: POPOVER_WIDTH,
        zIndex: Z_INDEX.cardCopilotPopover,
      }}
      className="rounded-[var(--radius-base)] border border-[var(--color-border-default)] bg-[var(--color-bg-primary)] shadow-lg"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[var(--color-border-default)] px-3 py-2">
        <span className="text-[12px] font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
          Copilot
        </span>
        <button
          onClick={onClose}
          aria-label="关闭"
          className="flex h-6 w-6 items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text-primary)]"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Body */}
      <div className="space-y-2 p-3">
        {/* Ref button (image / video / upload) */}
        {kind !== 'text' && (
          <div>
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--color-border-default)] px-2 py-1 text-[11px] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)]">
              <Upload className="h-3 w-3" />
              <span>Ref</span>
              <input
                type="file"
                accept="image/*,video/*,audio/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
            {fileRef && (
              <span className="ml-2 text-[10px] text-[var(--color-text-tertiary)]">
                {fileRef.name}
              </span>
            )}
          </div>
        )}

        {/* Prompt */}
        {kind !== 'upload' && (
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="输入提示词..."
            disabled={isGenerating}
            rows={3}
            className="w-full resize-none rounded-[var(--radius-sm)] border border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] p-2 text-[12px] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent-500)] disabled:opacity-50"
          />
        )}

        {/* Progress */}
        {isGenerating && (
          <div>
            <div className="h-1 w-full overflow-hidden rounded-full bg-[var(--color-bg-tertiary)]">
              <div
                className="h-full bg-[var(--color-accent-500)] transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="mt-1 text-[10px] text-[var(--color-text-tertiary)]">
              生成中... {progress}%
            </div>
          </div>
        )}

        {/* Error */}
        {status === 'error' && (
          <div className="rounded-[var(--radius-sm)] bg-red-500/10 p-2 text-[11px] text-red-500">
            {error}
          </div>
        )}

        {/* Success */}
        {status === 'done' && (
          <div className="rounded-[var(--radius-sm)] bg-emerald-500/10 p-2 text-[11px] text-emerald-500">
            ✓ 完成
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-[var(--color-border-default)] px-3 py-2">
        {isGenerating ? (
          <button
            onClick={cancel}
            className="rounded-[var(--radius-sm)] border border-[var(--color-border-default)] px-3 py-1 text-[11px] text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)]"
          >
            取消
          </button>
        ) : (
          <button
            onClick={handleGenerate}
            disabled={!canGenerate}
            className="ml-auto rounded-[var(--radius-sm)] bg-[var(--color-accent-500)] px-3 py-1 text-[11px] font-medium text-white hover:bg-[var(--color-accent-600)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            生成
          </button>
        )}
      </div>
    </div>,
    document.body,
  );
}
```

- [ ] **Step 4: 创建 barrel export**

```ts
// src/shared/components/canvas/CardCopilotPopover/index.ts
export { CardCopilotPopover } from './CardCopilotPopover';
export type { CardCopilotPopoverProps } from './CardCopilotPopover';
```

- [ ] **Step 5: 运行测试验证通过**

```bash
npm test -- src/shared/components/canvas/CardCopilotPopover/CardCopilotPopover.test.tsx
```

Expected: PASS（~7 cases）。如果失败，根据具体错误调整（注意 portal 检测依赖 test setup，可能需要在 setup.ts 中允许 `document.body.appendChild`）。

- [ ] **Step 6: Commit**

```bash
git add src/shared/components/canvas/CardCopilotPopover/
git commit -m "feat(canvas): add CardCopilotPopover Portal overlay component"
```

---

## Task 10: CanvasPanel 集成（单/双击分离 + 弹窗渲染 + 删除防御）

**Files:**
- Modify: `src/shared/components/canvas/CanvasPanel.tsx`
- Create: `src/shared/components/canvas/CanvasPanel.popover.test.tsx`

- [ ] **Step 1: 写集成测试**

```tsx
// src/shared/components/canvas/CanvasPanel.popover.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CanvasPanel } from './CanvasPanel';
import { useCanvasStore } from '@drama/stores/canvasStore';

import { useProjectStore } from '@drama/stores/projectStore';
// Mock React Flow viewport + screenToFlowPosition
vi.mock('@xyflow/react', async () => {
  const actual = await vi.importActual('@xyflow/react');
  return {
    ...actual,
    useViewport: () => ({ x: 0, y: 0, zoom: 1 }),
    ReactFlow: ({ children, onNodeClick, onPaneClick, onPaneContextMenu, nodes }: any) => {
      // Render each node as a clickable div + a "pane" area
      return (
        <div>
          <div data-testid="pane" onClick={onPaneClick} onContextMenu={onPaneContextMenu}>
            Pane
          </div>
          {(nodes || []).map((n: any) => (
            <div
              key={n.id}
              data-testid={`node-${n.id}`}
              data-node-type={n.type}
              onClick={(e) => onNodeClick?.(e, n)}
              onDoubleClick={() => {
                // simulate dblclick — clear pending + open drawer
                if (onNodeClick) {
                  // First click
                  onNodeClick({} as any, n);
                }
              }}
            >
              {n.data?.title || n.id}
            </div>
          ))}
        </div>
      );
    },
  };
});

beforeEach(() => {
  // 必须设置 currentProjectId + project + tree，否则 getCurrentNodes() 返回空数组
  // （参照 canvasStore.test.ts:7-20 的现有项目设置模式）
  useProjectStore.setState({
    projects: [{ id: 'proj_1', title: 'Test', description: '', updatedAt: '', sceneCount: 0, duration: 0, coverColor: '#6366f1' }],
    trees: { 'proj_1': { id: 'root', type: 'project', title: 'Test', status: 'draft' as const } },
    currentProjectId: 'proj_1',
    selectedNodeId: null,
  });
  useCanvasStore.setState({
    canvases: {
      proj_1: { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } },
    },
  });
});

describe('CanvasPanel — right-click creates card + opens popover', () => {
  it('right-click pane → context menu shows', async () => {
    render(<CanvasPanel />);
    fireEvent.contextMenu(screen.getByTestId('pane'), { clientX: 100, clientY: 200 });
    expect(screen.getByText('Upload')).toBeInTheDocument();
    expect(screen.getByText('Text Generation')).toBeInTheDocument();
  });
});

describe('CanvasPanel — single click opens popover', () => {
  beforeEach(() => {
    useCanvasStore.setState({
      canvases: {
        proj_1: {
          nodes: [
            { id: 'card_1', type: 'storyline', position: { x: 0, y: 0 }, data: { title: 'Story' } },
          ],
          edges: [],
          viewport: { x: 0, y: 0, zoom: 1 },
        },
      },
    });
  });

  it('clicking existing card opens copilot popover', async () => {
    render(<CanvasPanel />);
    fireEvent.click(screen.getByTestId('node-card_1'));
    await waitFor(() => expect(screen.getByRole('dialog', { name: /copilot/i })).toBeInTheDocument());
  });

  it('self-click guard: clicking same card twice does not re-trigger', async () => {
    render(<CanvasPanel />);
    fireEvent.click(screen.getByTestId('node-card_1'));
    await waitFor(() => screen.getByRole('dialog'));
    // Click again — should not cause error, dialog still visible
    fireEvent.click(screen.getByTestId('node-card_1'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});

describe('CanvasPanel — target card deleted → popover closes', () => {
  it('when card is removed from store, popover closes', async () => {
    useCanvasStore.setState({
      canvases: {
        proj_1: {
          nodes: [
            { id: 'card_1', type: 'storyline', position: { x: 0, y: 0 }, data: { title: 'Story' } },
          ],
          edges: [],
          viewport: { x: 0, y: 0, zoom: 1 },
        },
      },
    });
    render(<CanvasPanel />);
    fireEvent.click(screen.getByTestId('node-card_1'));
    await waitFor(() => screen.getByRole('dialog'));

    // Delete the card
    act(() => {
      useCanvasStore.getState().removeNode('card_1');
    });

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});

describe('CanvasPanel — Esc closes popover', () => {
  it('Escape key closes the popover', async () => {
    useCanvasStore.setState({
      canvases: {
        proj_1: {
          nodes: [
            { id: 'card_1', type: 'storyline', position: { x: 0, y: 0 }, data: { title: 'Story' } },
          ],
          edges: [],
          viewport: { x: 0, y: 0, zoom: 1 },
        },
      },
    });
    render(<CanvasPanel />);
    fireEvent.click(screen.getByTestId('node-card_1'));
    await waitFor(() => screen.getByRole('dialog'));
    fireEvent.keyDown(window, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});
```

- [ ] **Step 2: 运行测试验证失败**

```bash
npm test -- src/shared/components/canvas/CanvasPanel.popover.test.tsx
```

Expected: FAIL（当前 CanvasPanel 没有 popover）

- [ ] **Step 3: 修改 CanvasPanel.tsx**

打开 `src/shared/components/canvas/CanvasPanel.tsx`。

**a) 在顶部 imports 添加**：

```tsx
import { useViewport, type Node as RFNode } from '@xyflow/react';
import { CardCopilotPopover } from './CardCopilotPopover';
import { kindToCardType, defaultTitle, inferKindFromCard } from './helpers/kindInference';
import { Z_INDEX } from '@shared/lib/zIndex';
import { generateId } from '@/shared/lib/utils';
```

**b) 修改 PaneContextMenu onCreate 行为**：

在 CanvasPanel 内部 `handlePaneCreate`（约 184-201 行）改为：

```tsx
const handlePaneCreate = useCallback(
  (kind: CopilotKind, flowPos: { x: number; y: number }) => {
    const cardType = kindToCardType(kind);
    const newNode: CanvasNode = {
      id: generateId(cardType + '_'),
      type: cardType,
      position: flowPos,
      data: {
        title: defaultTitle(kind),
        isPlaceholder: true,
      },
    };
    useCanvasStore.getState().addNode(newNode);
    setCopilotTarget({ nodeId: newNode.id, kind, flowPosition: flowPos });
    setPaneMenu(null);
  },
  [],
);
```

**c) 在组件顶部添加 popover state 和 viewport hook**：

```tsx
const [copilotTarget, setCopilotTarget] = useState<{
  nodeId: string;
  kind: CopilotKind;
  flowPosition: { x: number; y: number };
} | null>(null);
const [popoverScreenPos, setPopoverScreenPos] = useState<{ x: number; y: number } | null>(null);
const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
const pendingClickRef = useRef<{ nodeId: string; t: number } | null>(null);
const { x: vpX, y: vpY, zoom } = useViewport();
const nodes = useCanvasStore((s) => s.getCurrentNodes());

// 卡片删除防御
useEffect(() => {
  if (!copilotTarget) return;
  if (!nodes.some((n) => n.id === copilotTarget.nodeId)) {
    setCopilotTarget(null);
  }
}, [nodes, copilotTarget]);

// resize 监听：手动重算（useViewport 在 v12 不响应 resize）
// 提取为 helper 以避免重复逻辑
const recomputePopoverPosition = useCallback(() => {
  if (!copilotTarget || !reactFlowRef.current) return;
  const CARD_WIDTH = 240;
  const CARD_HEIGHT_ESTIMATE = 200;
  const POPOVER_WIDTH = 480;
  const POPOVER_GAP = 8;
  const NAVBAR_HEIGHT = 64;
  const rf = reactFlowRef.current;
  const cardCenter = rf.flowToScreenPosition({
    x: copilotTarget.flowPosition.x + CARD_WIDTH / 2,
    y: copilotTarget.flowPosition.y + CARD_HEIGHT_ESTIMATE + POPOVER_GAP,
  });
  setPopoverScreenPos({
    x: Math.max(16, Math.min(cardCenter.x - POPOVER_WIDTH / 2, window.innerWidth - POPOVER_WIDTH - 16)),
    y: Math.max(NAVBAR_HEIGHT, cardCenter.y),
  });
}, [copilotTarget]);

useEffect(() => {
  if (!copilotTarget) return;
  window.addEventListener('resize', recomputePopoverPosition);
  return () => window.removeEventListener('resize', recomputePopoverPosition);
}, [copilotTarget, recomputePopoverPosition]);

// 同时在 viewport 变化（pan/zoom）时重算
useEffect(() => {
  recomputePopoverPosition();
}, [copilotTarget, vpX, vpY, zoom, recomputePopoverPosition]);
```

> **说明**：`useViewport` 内部已经处理 viewport 变化。如果 resize 不触发 viewport 变化（它不会），上述手动 listener 用 spread 触发 popoverScreenPos 重算会让现有 useEffect 因为依赖未变而不跑。可改为在 resize 中调用 reactFlowRef.current.flowToScreenPosition 重新计算并 setPopoverScreenPos（避免依赖变更）。简化方案：v1 不强求 resize 完美跟随。

**d) 修改 onNodeClick（单击/双击分离）**：

找到现有的 `onNodeClick`（约 234-260 行附近），替换为：

```tsx
const onNodeClick = useCallback(
  (event: React.MouseEvent, node: RFNode) => {
    // Skip if clicking interactive elements
    const target = event.target as HTMLElement;
    if (target.tagName === 'IMG' || target.tagName === 'INPUT' || target.tagName === 'BUTTON' ||
        target.closest('button') || target.closest('input')) {
      return;
    }
    
    const now = Date.now();
    if (pendingClickRef.current?.nodeId === node.id && now - pendingClickRef.current.t < 250) {
      // Double-click detected
      if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
      pendingClickRef.current = null;
      setCopilotTarget(null);
      setSelectedCardId(node.id);
      return;
    }
    
    pendingClickRef.current = { nodeId: node.id, t: now };
    if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
    clickTimerRef.current = setTimeout(() => {
      // Self-click guard
      if (copilotTarget?.nodeId === node.id) {
        pendingClickRef.current = null;
        return;
      }
      const kind = inferKindFromCard(node as CanvasNode);
      setCopilotTarget({ nodeId: node.id, kind, flowPosition: node.position });
      setSelectedCardId(null);
      pendingClickRef.current = null;
    }, 250);
  },
  [setSelectedCardId, copilotTarget],
);
```

**e) 修改 onPaneClick 关闭 popover**：

在 `onPaneClick` 回调（约 261 行附近）添加 `setCopilotTarget(null)`：

```tsx
onPaneClick={() => {
  closeContextMenu();
  setSelectedCardId(null);
  setCopilotTarget(null);   // ← 新增
}}
```

**f) 从 nodeTypes 移除 copilotCard**（约 41 行）：

```tsx
// 修改前
copilotCard: CopilotCardNode,

// 修改后（删除该行）
```

删除 `import { CopilotCardNode } from './nodes/CopilotCardNode';`（约 24 行）。

**g) 修改 MiniMap 颜色映射**（约 296 行）：删除 `copilotCard: '#a3a3a3',` 行。

**h) 在 return JSX 中渲染 popover**：

在 `<CardDetailDrawer />` 之后渲染：

```tsx
{copilotTarget && popoverScreenPos && (
  <CardCopilotPopover
    key={copilotTarget.nodeId}
    cardId={copilotTarget.nodeId}
    kind={copilotTarget.kind}
    screenPosition={popoverScreenPos}
    onClose={() => setCopilotTarget(null)}
  />
)}
```

**i) 修改 PaneContextMenu z-index**（约 313 行）：

```tsx
// 修改前
className="fixed z-50 min-w-[180px] ..."

// 修改后
className="fixed min-w-[180px] ..."
style={{ left: x, top: y, zIndex: Z_INDEX.paneContextMenu }}
```

实际 z-index 修改需要修改 `PaneContextMenu.tsx` 而非 `CanvasPanel.tsx`（见 Task 11）。

**j) 修改 CardDetailDrawer mask + drawer z-index**（实际在 CardDetailDrawer.tsx，约 464、468 行）：

```tsx
// mask: z-10 → zIndex: Z_INDEX.cardDetailDrawerMask
// drawer: z-20 → zIndex: Z_INDEX.cardDetailDrawer
```

实际由 Task 11 处理。

- [ ] **Step 4: 运行测试验证通过**

```bash
npm test -- src/shared/components/canvas/CanvasPanel.popover.test.tsx
```

Expected: PASS（~5 cases）。如果 react-flow mock 不够，调整 mock 让 ReactFlow 的 onPaneContextMenu / onNodeClick 能从 props 传递到 div 元素。

- [ ] **Step 5: 全量测试**

```bash
npm test
```

Expected: PASS（原 292 + 新增 ~5 = ~297）。如果现有 PaneContextMenu.test.tsx 或 CardDetailDrawer 相关测试失败，根据具体错误调整。

- [ ] **Step 6: Commit**

```bash
git add src/shared/components/canvas/CanvasPanel.tsx src/shared/components/canvas/CanvasPanel.popover.test.tsx
git commit -m "feat(canvas): CanvasPanel integrates CardCopilotPopover with single/double-click split"
```

---

## Task 11: z-index 集成到 PaneContextMenu 和 CardDetailDrawer

**Files:**
- Modify: `src/shared/components/canvas/PaneContextMenu/PaneContextMenu.tsx`
- Modify: `src/shared/components/canvas/CardDetailDrawer.tsx`

- [ ] **Step 1: 修改 PaneContextMenu z-index**

打开 `src/shared/components/canvas/PaneContextMenu/PaneContextMenu.tsx`。替换：

```tsx
// 修改前（约 39 行）
className="fixed z-50 min-w-[180px] ..."

// 修改后
import { Z_INDEX } from '@shared/lib/zIndex';
// ...
className="fixed min-w-[180px] ..."
style={{ left: x, top: y, zIndex: Z_INDEX.paneContextMenu }}
```

同时把 overlay 的 `z-40` 改为 `Z_INDEX.cardCopilotPopover - 1 = 49`（或保留 z-40 = `Z_INDEX.chatPanel`）。简化方案：overlay 保留 `z-40`，只在 menu 本身上改。

- [ ] **Step 2: 修改 CardDetailDrawer z-index**

打开 `src/shared/components/canvas/CardDetailDrawer.tsx`，在顶部添加：

```tsx
import { Z_INDEX } from '@shared/lib/zIndex';
```

然后替换：

```tsx
// 修改前
{/* Mask */}
<div className="absolute inset-0 z-10 bg-black/10 pointer-events-none" />

{/* Drawer */}
<div className="absolute right-0 top-0 bottom-0 z-20 w-[340px] ..." />

// 修改后
<div
  className="absolute inset-0 bg-black/10 pointer-events-none"
  style={{ zIndex: Z_INDEX.cardDetailDrawerMask }}
/>

<div
  className="absolute right-0 top-0 bottom-0 w-[340px] ..."
  style={{ zIndex: Z_INDEX.cardDetailDrawer, ...其他内联样式 }}
/>
```

- [ ] **Step 3: 全量测试**

```bash
npm test
```

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/shared/components/canvas/PaneContextMenu/PaneContextMenu.tsx src/shared/components/canvas/CardDetailDrawer.tsx
git commit -m "refactor(canvas): use Z_INDEX constants in PaneContextMenu and CardDetailDrawer"
```

---

## Task 12: 简化 CopilotCardNode 为弃用标记

**Files:**
- Modify: `src/shared/components/canvas/nodes/CopilotCardNode.tsx`

- [ ] **Step 1: 评估是否需要保留文件**

CopilotCardNode 不再被注册，但 `CopilotCardNode.test.tsx` 仍引用。两种选择：

**Option A（保留 + 标记弃用）**：在文件顶部添加 deprecation 注释，逻辑保留。

**Option B（删除 + 删除测试）**：如果未来确定不再需要，彻底删除两个文件。

按 spec 决策（§13 弱删），推荐 **Option A**：

打开 `src/shared/components/canvas/nodes/CopilotCardNode.tsx`，在文件顶部添加：

```tsx
/**
 * @deprecated Since 2026-06-25. Generation logic moved to `useCopilotGenerate` hook
 * and `CardCopilotPopover` component. This component is no longer registered in
 * `nodeTypes` (see CanvasPanel.tsx). The file is kept for the existing test suite
 * (`CopilotCardNode.test.tsx`) which validates the isolated component logic.
 *
 * TODO: Remove this file and its test in v3 cleanup.
 */
```

- [ ] **Step 2: 类型检查**

```bash
npx tsc --noEmit
```

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/shared/components/canvas/nodes/CopilotCardNode.tsx
git commit -m "docs(canvas): mark CopilotCardNode as deprecated, retained for tests"
```

---

## Task 13: nodes/index.ts 移除 copilotCard export

**Files:**
- Modify: `src/shared/components/canvas/nodes/index.ts`

- [ ] **Step 1: 移除 export**

打开 `src/shared/components/canvas/nodes/index.ts`，删除（如果存在）：

```ts
// 删除前
export { CopilotCardNode } from './CopilotCardNode';
export type { CopilotCardNodeData, CopilotKind } from './CopilotCardNode';
```

如果 `narrow` 类型的 CopilotKind 从 nodes/index 导出且 PaneContextMenu 不再导出，需要在 `kindInference.ts` / `capability.ts` 内部 import 或在 `helpers/` 新建 `copilot.ts` 导出 `CopilotKind` 类型。

- [ ] **Step 2: 类型检查**

```bash
npx tsc --noEmit
```

Expected: PASS。如果出现 "CopilotKind not found" 错误，按报错位置加 import。

- [ ] **Step 3: 全量测试**

```bash
npm test
```

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/shared/components/canvas/nodes/index.ts
git commit -m "refactor(canvas): remove copilotCard export from nodes/index"
```

---

## Task 14: 端到端集成测试 + 构建验证

**Files:**
- Create: `src/shared/components/canvas/integration.test.tsx`（可选，简单端到端）

- [ ] **Step 1: 写端到端测试**

```tsx
// src/shared/components/canvas/integration.test.tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CanvasPanel } from './CanvasPanel';
import { useCanvasStore } from '@drama/stores/canvasStore';
import { useProjectStore } from '@drama/stores/projectStore';

beforeEach(() => {
  useProjectStore.setState({
    projects: [{ id: 'proj_1', title: 'Test', description: '', updatedAt: '', sceneCount: 0, duration: 0, coverColor: '#6366f1' }],
    trees: { 'proj_1': { id: 'root', type: 'project', title: 'Test', status: 'draft' as const } },
    currentProjectId: 'proj_1',
    selectedNodeId: null,
  });
});

describe('end-to-end: right-click → card → popover → close', () => {
  it('full flow', async () => {
    useCanvasStore.setState({
      canvases: { proj_1: { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } } },
    });
    render(<CanvasPanel />);
    
    // Right-click pane
    fireEvent.contextMenu(screen.getByTestId('pane'), { clientX: 200, clientY: 300 });
    
    // Click "Text Generation"
    fireEvent.click(screen.getByText('Text Generation'));
    
    // Card created with isPlaceholder: true
    await waitFor(() => {
      const nodes = useCanvasStore.getState().getCurrentNodes();
      expect(nodes.length).toBe(1);
      expect(nodes[0].type).toBe('storyline');
      expect(nodes[0].data.isPlaceholder).toBe(true);
    });
    
    // Popover auto-opens
    await waitFor(() => screen.getByRole('dialog', { name: /copilot/i }));
    
    // Close via Esc
    fireEvent.keyDown(window, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});
```

- [ ] **Step 2: 运行端到端测试**

```bash
npm test -- src/shared/components/canvas/integration.test.tsx
```

Expected: PASS

- [ ] **Step 3: 完整测试 + lint + build**

```bash
npm test
npm run lint
npm run build
```

Expected: 全 PASS / 无 error

- [ ] **Step 4: Commit（如有新增）**

```bash
git add src/shared/components/canvas/integration.test.tsx
git commit -m "test(canvas): add end-to-end right-click → popover flow test"
```

---

## Task 15: 文档与最终验证

**Files:**
- Modify: `docs/ROADMAP.md`（如需）
- Modify: `README.md`（如需）

- [ ] **Step 1: 更新 ROADMAP（如有 Phase 4 引用 CopilotCardNode）**

```bash
grep -rn "CopilotCardNode" docs/ README.md 2>/dev/null
```

如果有引用，更新为 CardCopilotPopover。

- [ ] **Step 2: 最终验证**

```bash
npm test
npm run lint
npx tsc --noEmit
npm run build
```

全部应通过。

- [ ] **Step 3: Commit（doc 更新）**

```bash
git add docs/ README.md
git commit -m "docs: update references from CopilotCardNode to CardCopilotPopover"
```

---

## Summary

| Phase | Tasks | New files | Modified files | New tests |
|-------|-------|-----------|----------------|-----------|
| Foundation | 1-3 | 4 helpers + tests | — | ~26 tests |
| Migration | 4-6 | 1 migration lib + tests | 3 stores/types | ~19 tests |
| Core | 7-9 | 1 hook + 1 component + tests | — | ~25 tests |
| Integration | 10-13 | 1 CanvasPanel test | 4 component files | ~5 tests |
| Polish | 14-15 | 1 e2e test | docs | ~1 test |

**总计**: 14 个新文件, 8 个修改文件, ~76 个新测试, 全部任务预计 2-3 小时内可完成（按熟练工程师 2-5 分钟每步估算）。

**关键风险点**：
1. React Flow `useViewport` 在测试环境的 mock（可能需要在 `setup.ts` 中添加 mock）
2. portal 测试需要 `document.body` 作为 target（已在 setup.ts 中确认可用）
3. `migrateCopilotCards` 集成测试需要导出 `__testHelpers`（或重构为纯函数导出）

**后续优化（v2 范畴）**：
- `useViewport()` 性能优化（pan 期间高频重渲染 → requestAnimationFrame 节流）
- `onNodeDrag` 期间实时更新 popover 位置
- Modal / Tooltip z-index 集中管理（独立重构）
- `'inpaint'` / `'styleTransfer'` capability UI 暴露
- 多卡并行生成