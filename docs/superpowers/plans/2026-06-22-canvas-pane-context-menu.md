# Canvas Pane 右键创建菜单 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 Canvas 空白画布右击时弹出 4 项创建菜单（Upload / Text / Image / Video Generation），点击后在画布创建统一 CopilotCard 节点，生成完成后自动插入正式画布卡片并移除 copilot 节点。

**Architecture:** 保留现有手写菜单风格并重构为独立 `PaneContextMenu` 组件，新增统一 `CopilotCardNode` React Flow 节点（4 种 kind 共享 UI），image/video 直接调 `providerRegistry.get(id).submit` 绕过 `generateAsset` 的内置卡片创建，AbortController 管理取消，组件卸载时自动 abort。

**Tech Stack:** React 19, TypeScript, Zustand, @xyflow/react, Lucide Icons, @radix-ui (existing)

**Spec:** `docs/superpowers/specs/2026-06-22-canvas-pane-context-menu-design.md`

---

## File Structure

| Path | Action | Purpose |
|------|--------|---------|
| `src/apps/drama/types/index.ts` | Modify | 在 `CanvasNodeType` union 新增 `'copilotCard'` |
| `src/apps/drama/lib/canvasToolkit/shared.ts` | Modify | 新增 `pollUntilDone` 工具函数（AbortSignal 支持） |
| `src/shared/components/canvas/PaneContextMenu/PaneContextMenu.tsx` | Create | 4 项菜单 UI + 屏幕坐标定位 + onCreate/flowPosition 契约 |
| `src/shared/components/canvas/PaneContextMenu/PaneContextMenu.test.tsx` | Create | 单元测试（渲染 / 点击 / Esc / overlay 关闭） |
| `src/shared/components/canvas/PaneContextMenu/index.ts` | Create | Barrel export |
| `src/shared/components/canvas/nodes/CopilotCardNode.tsx` | Create | 统一 Copilot 卡片（4 kind × 状态机） |
| `src/shared/components/canvas/nodes/CopilotCardNode.test.tsx` | Create | 单元测试（4 kind 路径 / 取消 / AbortController） |
| `src/shared/components/canvas/nodes/index.ts` | Modify | export 新组件 |
| `src/shared/components/canvas/CanvasPanel.tsx` | Modify | 注册 `copilotCard` nodeType + `onPaneContextMenu` 接线 + `screenToFlowPosition` 转换 |

---

## Task 1: 扩展 CanvasNodeType union

**Files:**
- Modify: `src/apps/drama/types/index.ts:60-72`

- [ ] **Step 1: 添加 'copilotCard' 到 CanvasNodeType union**

打开 `src/apps/drama/types/index.ts`，找到 `CanvasNodeType` 定义（约 60-72 行），在末尾添加 `'copilotCard'`：

```typescript
export type CanvasNodeType =
  | 'storyline'
  | 'moodboard'
  | 'videoClip'
  | 'asset'
  | 'task'
  | 'art'
  | 'character'
  | 'script'
  | 'deliverable'
  | 'sceneCard'
  | 'copilotCard';   // ← 新增：内联 AI 生成卡片
```

- [ ] **Step 2: 类型检查**

```bash
npx tsc --noEmit
```

预期：PASS（无类型错误）

- [ ] **Step 3: Commit**

```bash
git add src/apps/drama/types/index.ts
git commit -m "feat(types): add 'copilotCard' to CanvasNodeType union"
```

---

## Task 2: 新增 pollUntilDone 工具函数

**Files:**
- Modify: `src/apps/drama/lib/canvasToolkit/shared.ts`
- Test: `src/apps/drama/lib/canvasToolkit/shared.test.ts`（已存在，追加用例）

- [ ] **Step 1: 写测试用例**

打开 `src/apps/drama/lib/canvasToolkit/shared.test.ts`，在末尾追加：

```typescript
import { pollUntilDone } from './shared';
import type { GenerationProvider, GenerationTask } from './types';

describe('pollUntilDone', () => {
  function makeMockProvider(sequence: GenerationTask[]): GenerationProvider {
    let i = 0;
    return {
      id: 'mock',
      name: 'Mock',
      supportedMedia: ['image'],
      capabilities: ['text2image'],
      requiredConfigKeys: [],
      isConfigured: () => true,
      configure: () => {},
      estimateCost: () => ({ amount: 0, unit: 'USD' }),
      submit: async () => ({ taskId: 't1', status: 'pending' }),
      poll: async () => sequence[i++] ?? { taskId: 't1', status: 'done', resultUrl: 'https://x' },
    };
  }

  it('returns when task is done', async () => {
    const provider = makeMockProvider([{ taskId: 't1', status: 'done', resultUrl: 'https://final' }]);
    const result = await pollUntilDone(provider, 't1', () => {}, new AbortController().signal);
    expect(result.resultUrl).toBe('https://final');
  });

  it('throws on failed task', async () => {
    const provider = makeMockProvider([{ taskId: 't1', status: 'failed', error: 'oops' }]);
    await expect(pollUntilDone(provider, 't1', () => {}, new AbortController().signal)).rejects.toThrow('oops');
  });

  it('polls until done and calls onProgress', async () => {
    const provider = makeMockProvider([
      { taskId: 't1', status: 'processing' },
      { taskId: 't1', status: 'processing' },
      { taskId: 't1', status: 'done', resultUrl: 'https://x' },
    ]);
    const progresses: number[] = [];
    await pollUntilDone(provider, 't1', (p) => progresses.push(p), new AbortController().signal);
    expect(progresses.length).toBeGreaterThan(0);
  });

  it('throws AbortError when signal is aborted mid-poll', async () => {
    const provider = makeMockProvider([
      { taskId: 't1', status: 'processing' },
      { taskId: 't1', status: 'processing' },
      { taskId: 't1', status: 'done', resultUrl: 'https://x' },
    ]);
    const ac = new AbortController();
    setTimeout(() => ac.abort(), 100);
    await expect(pollUntilDone(provider, 't1', () => {}, ac.signal)).rejects.toThrow(/Aborted|Abort/);
  });
});
```

- [ ] **Step 2: 运行测试，确认失败**

```bash
npx vitest run src/apps/drama/lib/canvasToolkit/shared.test.ts -t "pollUntilDone"
```

预期：FAIL — `pollUntilDone` is not exported from './shared'

- [ ] **Step 3: 实现 pollUntilDone**

打开 `src/apps/drama/lib/canvasToolkit/shared.ts`，在文件末尾追加：

```typescript
import type { GenerationProvider, GenerationTask } from './types';

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * Poll a generation task until done/failed/aborted.
 * Throws AbortError if signal is aborted mid-poll.
 * Throws Error if task status is 'failed'.
 */
export async function pollUntilDone(
  provider: GenerationProvider,
  taskId: string,
  onProgress: (progress: number) => void,
  signal: AbortSignal,
): Promise<GenerationTask> {
  let attempt = 0;
  while (true) {
    if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
    if (!provider.poll) throw new Error(`Provider ${provider.id} 不支持轮询`);
    const task = await provider.poll(taskId);
    if (task.status === 'done') return task;
    if (task.status === 'failed') throw new Error(task.error ?? 'Generation failed');
    attempt += 1;
    // 简单进度估计：每次 poll +20%，封顶 90%
    onProgress(Math.min(90, attempt * 20));
    await sleep(2000);
  }
}
```

- [ ] **Step 4: 运行测试，确认通过**

```bash
npx vitest run src/apps/drama/lib/canvasToolkit/shared.test.ts -t "pollUntilDone"
```

预期：PASS（4 用例全过）

- [ ] **Step 5: Commit**

```bash
git add src/apps/drama/lib/canvasToolkit/shared.ts src/apps/drama/lib/canvasToolkit/shared.test.ts
git commit -m "feat(canvasToolkit): add pollUntilDone with AbortSignal support"
```

---

## Task 3: 创建 PaneContextMenu 组件

**Files:**
- Create: `src/shared/components/canvas/PaneContextMenu/PaneContextMenu.tsx`
- Create: `src/shared/components/canvas/PaneContextMenu/PaneContextMenu.test.tsx`
- Create: `src/shared/components/canvas/PaneContextMenu/index.ts`

- [ ] **Step 1: 创建目录与 barrel**

```bash
mkdir -p src/shared/components/canvas/PaneContextMenu
```

```typescript
// src/shared/components/canvas/PaneContextMenu/index.ts
export { PaneContextMenu } from './PaneContextMenu';
export type { PaneContextMenuProps, CopilotKind } from './PaneContextMenu';
```

- [ ] **Step 2: 写组件测试**

```tsx
// src/shared/components/canvas/PaneContextMenu/PaneContextMenu.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PaneContextMenu } from './PaneContextMenu';

describe('PaneContextMenu', () => {
  const flowPos = { x: 200, y: 300 };

  it('renders all 4 menu items', () => {
    render(<PaneContextMenu x={100} y={100} flowPosition={flowPos} onClose={vi.fn()} onCreate={vi.fn()} />);
    expect(screen.getByText('Upload')).toBeInTheDocument();
    expect(screen.getByText('Text Generation')).toBeInTheDocument();
    expect(screen.getByText('Image Generation')).toBeInTheDocument();
    expect(screen.getByText('Video Generation')).toBeInTheDocument();
  });

  it('positions menu at x/y (screen coords)', () => {
    const { container } = render(<PaneContextMenu x={150} y={250} flowPosition={flowPos} onClose={vi.fn()} onCreate={vi.fn()} />);
    const menu = container.querySelector('[data-testid="pane-context-menu"]') as HTMLElement;
    expect(menu.style.left).toBe('150px');
    expect(menu.style.top).toBe('250px');
  });

  it('calls onCreate with flowPosition (NOT screen x/y) when item clicked', () => {
    const onCreate = vi.fn();
    render(<PaneContextMenu x={150} y={250} flowPosition={flowPos} onClose={vi.fn()} onCreate={onCreate} />);
    fireEvent.click(screen.getByText('Image Generation'));
    expect(onCreate).toHaveBeenCalledWith('image', flowPos);
  });

  it('calls onClose when overlay is clicked', () => {
    const onClose = vi.fn();
    const { container } = render(<PaneContextMenu x={0} y={0} flowPosition={flowPos} onClose={onClose} onCreate={vi.fn()} />);
    const overlay = container.querySelector('[data-testid="pane-context-overlay"]') as HTMLElement;
    fireEvent.click(overlay);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('calls onClose when Escape is pressed', () => {
    const onClose = vi.fn();
    render(<PaneContextMenu x={0} y={0} flowPosition={flowPos} onClose={onClose} onCreate={vi.fn()} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('removes Escape listener on unmount', () => {
    const onClose = vi.fn();
    const { unmount } = render(<PaneContextMenu x={0} y={0} flowPosition={flowPos} onClose={onClose} onCreate={vi.fn()} />);
    unmount();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: 运行测试，确认失败**

```bash
npx vitest run src/shared/components/canvas/PaneContextMenu/PaneContextMenu.test.tsx
```

预期：FAIL — `./PaneContextMenu` 模块不存在

- [ ] **Step 4: 实现 PaneContextMenu**

```tsx
// src/shared/components/canvas/PaneContextMenu/PaneContextMenu.tsx
import { useEffect } from 'react';
import { Upload, Type, Image as ImageIcon, Video } from 'lucide-react';

export type CopilotKind = 'upload' | 'text' | 'image' | 'video';

export interface PaneContextMenuProps {
  x: number;          // Screen coordinates (clientX) — for position: fixed
  y: number;          // Screen coordinates (clientY)
  flowPosition: { x: number; y: number };  // Flow coordinates — for addNode
  onClose: () => void;
  onCreate: (kind: CopilotKind, flowPosition: { x: number; y: number }) => void;
}

const MENU_ITEMS: Array<{ kind: CopilotKind; label: string; icon: typeof Upload; hint: string }> = [
  { kind: 'upload', label: 'Upload',           icon: Upload,    hint: '上传文件创建卡片' },
  { kind: 'text',   label: 'Text Generation',  icon: Type,      hint: '用 LLM 生成文本' },
  { kind: 'image',  label: 'Image Generation', icon: ImageIcon, hint: '生成图片' },
  { kind: 'video',  label: 'Video Generation', icon: Video,     hint: '生成视频' },
];

export function PaneContextMenu({ x, y, flowPosition, onClose, onCreate }: PaneContextMenuProps) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  return (
    <>
      <div
        data-testid="pane-context-overlay"
        className="fixed inset-0 z-40"
        onClick={onClose}
      />
      <div
        data-testid="pane-context-menu"
        className="fixed z-50 min-w-[180px] rounded-[var(--radius-base)] border border-[var(--color-border-default)] bg-[var(--color-bg-primary)] py-1 shadow-lg"
        style={{ left: x, top: y }}
      >
        {MENU_ITEMS.map(({ kind, label, icon: Icon, hint }) => (
          <button
            key={kind}
            onClick={() => onCreate(kind, flowPosition)}
            title={hint}
            className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-[var(--color-text-primary)] hover:bg-[var(--color-bg-secondary)]"
          >
            <Icon className="h-3.5 w-3.5 text-[var(--color-text-tertiary)]" />
            <span>{label}</span>
          </button>
        ))}
      </div>
    </>
  );
}
```

- [ ] **Step 5: 运行测试，确认通过**

```bash
npx vitest run src/shared/components/canvas/PaneContextMenu/PaneContextMenu.test.tsx
```

预期：PASS（6 用例全过）

- [ ] **Step 6: Commit**

```bash
git add src/shared/components/canvas/PaneContextMenu/
git commit -m "feat(canvas): add PaneContextMenu with 4 creation items"
```

---

## Task 4: 创建 CopilotCardNode 组件

**Files:**
- Create: `src/shared/components/canvas/nodes/CopilotCardNode.tsx`
- Create: `src/shared/components/canvas/nodes/CopilotCardNode.test.tsx`
- Modify: `src/shared/components/canvas/nodes/index.ts`

- [ ] **Step 1: 写节点测试（覆盖 4 kind × 状态机 × 取消）**

```tsx
// src/shared/components/canvas/nodes/CopilotCardNode.test.tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { ReactFlowProvider } from '@xyflow/react';
import { CopilotCardNode } from './CopilotCardNode';
import { useCanvasStore } from '@drama/stores/canvasStore';
import { useProjectStore } from '@drama/stores/projectStore';
import { providerRegistry } from '@drama/lib/canvasToolkit';
import type { GenerationProvider, GenerationTask } from '@drama/types';
import type { NodeProps, Node } from '@xyflow/react';

function makeNodeProps<T>(id: string, data: T): NodeProps<Node<T>> {
  return { id, data, type: 'copilotCard' } as unknown as NodeProps<Node<T>>;
}

function renderInFlow(node: React.ReactNode) {
  return render(<ReactFlowProvider>{node}</ReactFlowProvider>);
}

function setupProject() {
  useProjectStore.setState({
    projects: [{ id: 'proj_1', title: 'Test', description: '', updatedAt: '', sceneCount: 0, duration: 0, coverColor: '#6366f1' }],
    trees: { 'proj_1': { id: 'root', type: 'project', title: 'Test', status: 'draft' as const } },
    currentProjectId: 'proj_1',
    selectedNodeId: null,
  });
  useCanvasStore.setState({
    canvases: { 'proj_1': { nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } } },
  });
}

describe('CopilotCardNode — text kind', () => {
  beforeEach(setupProject);

  it('renders prompt textarea and generate button disabled when prompt is empty', () => {
    renderInFlow(<CopilotCardNode {...makeNodeProps('c1', { kind: 'text', status: 'idle' })} />);
    const btn = screen.getByRole('button', { name: /生成/ });
    expect(btn).toBeDisabled();
  });

  it('creates a storyline card and removes itself when generate is clicked (text kind, no external API)', async () => {
    renderInFlow(<CopilotCardNode {...makeNodeProps('c1', { kind: 'text', status: 'idle', prompt: 'a hero enters a cafe' })} />);
    const btn = screen.getByRole('button', { name: /生成/ });
    fireEvent.click(btn);
    // text path is synchronous (no setTimeout for animation), so no wait needed
    const nodes = useCanvasStore.getState().getCurrentNodes();
    expect(nodes.find(n => n.id === 'c1')).toBeUndefined();
    expect(nodes.find(n => n.type === 'storyline')).toBeDefined();
  });
});

describe('CopilotCardNode — upload kind', () => {
  beforeEach(setupProject);

  it('creates asset card with dataUrl after file input change', async () => {
    renderInFlow(<CopilotCardNode {...makeNodeProps('c1', { kind: 'upload', status: 'idle' })} />);
    const file = new File(['hello'], 'photo.png', { type: 'image/png' });
    const input = screen.getByLabelText(/upload/i) as HTMLInputElement;
    fireEvent.change(input, { target: { files: [file] } });
    // wait for FileReader to complete (async)
    await new Promise(r => setTimeout(r, 50));
    const nodes = useCanvasStore.getState().getCurrentNodes();
    expect(nodes.find(n => n.type === 'asset')).toBeDefined();
    expect(nodes.find(n => n.id === 'c1')).toBeUndefined();
  });
});

describe('CopilotCardNode — image kind', () => {
  beforeEach(() => {
    setupProject();
    const mockProvider: GenerationProvider = {
      id: 'mock',
      name: 'Mock',
      supportedMedia: ['image'],
      capabilities: ['text2image'],
      requiredConfigKeys: [],
      isConfigured: () => true,
      configure: () => {},
      estimateCost: () => ({ amount: 0, unit: 'USD' }),
      submit: async () => ({ taskId: 't1', status: 'pending' }),
      poll: (async (): Promise<GenerationTask> => ({ taskId: 't1', status: 'done', resultUrl: 'https://img/x.png' })) as GenerationProvider['poll'],
    };
    providerRegistry.register(mockProvider);
  });

  it('calls provider.submit then creates art card and removes itself', async () => {
    renderInFlow(<CopilotCardNode {...makeNodeProps('c1', { kind: 'image', status: 'idle', prompt: 'a cat', providerId: 'mock' })} />);
    fireEvent.click(screen.getByRole('button', { name: /生成/ }));
    // wait for setTimeout(1000ms) to complete + small buffer
    await new Promise(r => setTimeout(r, 1100));
    const nodes = useCanvasStore.getState().getCurrentNodes();
    expect(nodes.find(n => n.type === 'art')).toBeDefined();
    expect(nodes.find(n => n.id === 'c1')).toBeUndefined();
  });

  it('aborts polling on unmount and does not create art card', async () => {
    const { unmount } = renderInFlow(<CopilotCardNode {...makeNodeProps('c1', { kind: 'image', status: 'idle', prompt: 'a cat', providerId: 'mock' })} />);
    fireEvent.click(screen.getByRole('button', { name: /生成/ }));
    // unmount before setTimeout fires
    unmount();
    await new Promise(r => setTimeout(r, 1100));
    const nodes = useCanvasStore.getState().getCurrentNodes();
    expect(nodes.find(n => n.type === 'art')).toBeUndefined();
  });
});

describe('CopilotCardNode — error state', () => {
  beforeEach(setupProject);

  it('shows error message and retry button when generation fails', async () => {
    // Register a provider that fails
    const failingProvider: GenerationProvider = {
      id: 'fail',
      name: 'Fail',
      supportedMedia: ['image'],
      capabilities: ['text2image'],
      requiredConfigKeys: [],
      isConfigured: () => true,
      configure: () => {},
      estimateCost: () => ({ amount: 0, unit: 'USD' }),
      submit: async () => { throw new Error('network down'); },
    };
    providerRegistry.register(failingProvider);

    renderInFlow(<CopilotCardNode {...makeNodeProps('c1', { kind: 'image', status: 'idle', prompt: 'a cat', providerId: 'fail' })} />);
    fireEvent.click(screen.getByRole('button', { name: /生成/ }));
    await new Promise(r => setTimeout(r, 50));
    expect(screen.getByText(/network down/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 运行测试，确认失败**

```bash
npx vitest run src/shared/components/canvas/nodes/CopilotCardNode.test.tsx
```

预期：FAIL — `./CopilotCardNode` 模块不存在

- [ ] **Step 3: 实现 CopilotCardNode**

```tsx
// src/shared/components/canvas/nodes/CopilotCardNode.tsx
import { useState, useRef, useEffect, useCallback } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { Upload, Type, Image as ImageIcon, Video, X } from 'lucide-react';
import { useCanvasStore } from '@drama/stores/canvasStore';
import { providerRegistry, pollUntilDone } from '@drama/lib/canvasToolkit';
import type { Capability } from '@drama/lib/canvasToolkit';

export type CopilotKind = 'upload' | 'text' | 'image' | 'video';

export interface CopilotCardNodeData {
  kind: CopilotKind;
  status: 'idle' | 'generating' | 'done' | 'error';
  prompt?: string;
  file?: {
    name: string;
    size: number;
    kind: 'image' | 'video' | 'audio';
    dataUrl: string;
  };
  providerId?: string;
  progress?: number;
  result?: {
    url?: string;
    text?: string;
    thumbnail?: string;
    duration?: number;
  };
  error?: string;
}

const KIND_CONFIG: Record<CopilotKind, { icon: typeof Upload; label: string }> = {
  upload: { icon: Upload,    label: 'Upload' },
  text:   { icon: Type,      label: 'Text Generation' },
  image:  { icon: ImageIcon, label: 'Image Generation' },
  video:  { icon: Video,     label: 'Video Generation' },
};

function offsetPosition(node: { position: { x: number; y: number } }, dx = 40, dy = 40) {
  return { x: node.position.x + dx, y: node.position.y + dy };
}

export function CopilotCardNode({ data, id }: NodeProps<Node<CopilotCardNodeData>>) {
  const updateNodeData = useCanvasStore((s) => s.updateNodeData);
  const addNode = useCanvasStore((s) => s.addNode);
  const removeNode = useCanvasStore((s) => s.removeNode);
  const abortRef = useRef<AbortController | null>(null);

  // Abort any in-flight generation when the component unmounts.
  useEffect(() => {
    return () => { abortRef.current?.abort(); };
  }, []);

  const handleClose = useCallback(() => {
    abortRef.current?.abort();
    removeNode(id);
  }, [id, removeNode]);

  const handleGenerate = useCallback(async () => {
    abortRef.current = new AbortController();
    updateNodeData(id, { status: 'generating', progress: 0, error: undefined });

    try {
      if (data.kind === 'image' || data.kind === 'video') {
        const provider = providerRegistry.get(data.providerId ?? '');
        if (!provider) throw new Error(`未找到 provider: ${data.providerId}`);
        const capability: Capability = data.kind === 'image' ? 'text2image' : 'text2video';
        const task = await provider.submit({
          type: data.kind,
          capability,
          prompt: data.prompt ?? '',
        });
        const final = await pollUntilDone(
          provider,
          task.taskId,
          (p) => updateNodeData(id, { progress: p }),
          abortRef.current.signal,
        );
        updateNodeData(id, { status: 'done', result: { url: final.resultUrl } });
        setTimeout(() => {
          if (abortRef.current?.signal.aborted) return;
          const self = useCanvasStore.getState().getCurrentNodes().find((n) => n.id === id);
          if (!self) return;
          addNode({
            id: `${data.kind}_${Date.now()}`,
            type: data.kind === 'image' ? 'art' : 'deliverable',
            position: offsetPosition(self),
            data: {
              title: data.prompt ?? '',
              thumbnail: final.resultUrl,
              generatedPrompt: data.prompt,
              sourceProvider: data.providerId,
            },
          });
          removeNode(id);
        }, 1000);
      } else if (data.kind === 'upload') {
        const file = data.file;
        if (!file) throw new Error('未选择文件');
        const self = useCanvasStore.getState().getCurrentNodes().find((n) => n.id === id);
        if (!self) return;
        addNode({
          id: `asset_${Date.now()}`,
          type: file.kind === 'video' ? 'videoClip' : 'asset',
          position: offsetPosition(self),
          data: {
            title: file.name,
            thumbnail: file.dataUrl,
            fileSize: file.size,
          },
        });
        removeNode(id);
      } else if (data.kind === 'text') {
        const self = useCanvasStore.getState().getCurrentNodes().find((n) => n.id === id);
        if (!self) return;
        addNode({
          id: `story_${Date.now()}`,
          type: 'storyline',
          position: offsetPosition(self),
          data: {
            title: data.prompt?.slice(0, 30) ?? '新剧本',
            description: data.prompt,
          },
        });
        removeNode(id);
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      updateNodeData(id, {
        status: 'error',
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }, [data, id, updateNodeData, addNode, removeNode]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result ?? '');
      let kind: 'image' | 'video' | 'audio' = 'image';
      if (file.type.startsWith('video/')) kind = 'video';
      else if (file.type.startsWith('audio/')) kind = 'audio';
      updateNodeData(id, {
        file: { name: file.name, size: file.size, kind, dataUrl },
      });
    };
    reader.readAsDataURL(file);
  }, [id, updateNodeData]);

  const config = KIND_CONFIG[data.kind];
  const Icon = config.icon;
  const isGenerating = data.status === 'generating';

  return (
    <div className="w-[240px] rounded-[var(--radius-base)] border border-[var(--color-border-default)] bg-[var(--color-bg-secondary)] p-3 shadow-sm">
      <Handle type="target" position={Position.Left} className="!bg-[var(--color-accent-500)]" />

      {/* Header */}
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Icon className="h-3.5 w-3.5 text-[var(--color-accent-500)]" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
            {config.label}
          </span>
        </div>
        <button
          onClick={handleClose}
          aria-label="关闭"
          className="flex h-5 w-5 items-center justify-center rounded-[var(--radius-sm)] text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg-tertiary)] hover:text-[var(--color-text-primary)]"
        >
          <X className="h-3 w-3" />
        </button>
      </div>

      {/* Input area */}
      {data.kind === 'upload' ? (
        <label className="block">
          <span className="sr-only">upload</span>
          <input
            type="file"
            accept="image/*,video/*,audio/*"
            onChange={handleFileChange}
            className="block w-full text-[11px] text-[var(--color-text-tertiary)] file:mr-2 file:rounded-[var(--radius-sm)] file:border-0 file:bg-[var(--color-bg-tertiary)] file:px-2 file:py-1 file:text-[11px] file:text-[var(--color-text-primary)]"
          />
          {data.file && (
            <div className="mt-1 text-[10px] text-[var(--color-text-tertiary)]">
              {data.file.name} ({Math.round(data.file.size / 1024)} KB)
            </div>
          )}
        </label>
      ) : (
        <textarea
          value={data.prompt ?? ''}
          onChange={(e) => updateNodeData(id, { prompt: e.target.value })}
          placeholder="输入提示词..."
          disabled={isGenerating}
          rows={3}
          className="mb-2 w-full resize-none rounded-[var(--radius-sm)] border border-[var(--color-border-default)] bg-[var(--color-bg-primary)] p-2 text-[12px] text-[var(--color-text-primary)] outline-none focus:border-[var(--color-accent-500)] disabled:opacity-50"
        />
      )}

      {/* Generate button */}
      {data.status !== 'done' && (
        <button
          onClick={handleGenerate}
          disabled={
            isGenerating ||
            (data.kind !== 'upload' && !data.prompt?.trim()) ||
            (data.kind === 'upload' && !data.file)
          }
          className="w-full rounded-[var(--radius-sm)] bg-[var(--color-accent-500)] px-3 py-1.5 text-[12px] font-medium text-white hover:bg-[var(--color-accent-600)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isGenerating ? '生成中...' : data.kind === 'upload' ? '上传' : '生成'}
        </button>
      )}

      {/* Status / Progress */}
      {data.status === 'generating' && (
        <div className="mt-2">
          <div className="h-1 w-full overflow-hidden rounded-full bg-[var(--color-bg-tertiary)]">
            <div
              className="h-full bg-[var(--color-accent-500)] transition-all"
              style={{ width: `${data.progress ?? 0}%` }}
            />
          </div>
          <div className="mt-1 text-[10px] text-[var(--color-text-tertiary)]">
            生成中... {data.progress ?? 0}%
          </div>
        </div>
      )}

      {data.status === 'error' && (
        <div className="mt-2 rounded-[var(--radius-sm)] bg-red-500/10 p-2 text-[11px] text-red-500">
          {data.error}
          <button
            onClick={handleGenerate}
            className="ml-2 text-[11px] underline hover:text-red-600"
          >
            重试
          </button>
        </div>
      )}

      {data.status === 'done' && data.result?.url && (
        <div className="mt-2 text-[10px] text-[var(--color-text-tertiary)]">
          ✓ 已完成，正在插入画布...
        </div>
      )}

      <Handle type="source" position={Position.Right} className="!bg-[var(--color-accent-500)]" />
    </div>
  );
}
```

- [ ] **Step 4: 运行测试，确认通过**

```bash
npx vitest run src/shared/components/canvas/nodes/CopilotCardNode.test.tsx
```

预期：PASS（6 用例全过）

- [ ] **Step 5: 在 nodes/index.ts 导出新组件**

打开 `src/shared/components/canvas/nodes/index.ts`，在末尾追加：

```typescript
export { CopilotCardNode } from './CopilotCardNode';
export type { CopilotCardNodeData, CopilotKind } from './CopilotCardNode';
```

- [ ] **Step 6: Commit**

```bash
git add src/shared/components/canvas/nodes/CopilotCardNode.tsx src/shared/components/canvas/nodes/CopilotCardNode.test.tsx src/shared/components/canvas/nodes/index.ts
git commit -m "feat(canvas): add CopilotCardNode with 4-kind support + AbortController"
```

---

## Task 5: 在 CanvasPanel 接线

**Files:**
- Modify: `src/shared/components/canvas/CanvasPanel.tsx`
- Modify: `src/shared/components/canvas/CanvasPanel.tsx`（test — 追加）

- [ ] **Step 1: 写集成测试**

在 `src/shared/components/canvas/CanvasPanel.test.tsx`（**新增**）写入：

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ReactFlowProvider } from '@xyflow/react';
import { CanvasPanel } from './CanvasPanel';
import { useProjectStore } from '@drama/stores/projectStore';

function setupProject() {
  useProjectStore.setState({
    projects: [{ id: 'proj_1', title: 'Test', description: '', updatedAt: '', sceneCount: 0, duration: 0, coverColor: '#6366f1' }],
    trees: { 'proj_1': { id: 'root', type: 'project', title: 'Test', status: 'draft' as const } },
    currentProjectId: 'proj_1',
    selectedNodeId: null,
  });
}

describe('CanvasPanel — pane context menu', () => {
  beforeEach(setupProject);

  it('shows PaneContextMenu on pane right-click', () => {
    render(<ReactFlowProvider><CanvasPanel /></ReactFlowProvider>);
    const pane = document.querySelector('.react-flow__pane') as HTMLElement;
    fireEvent.contextMenu(pane, { clientX: 300, clientY: 400, button: 2 });
    expect(screen.getByTestId('pane-context-menu')).toBeInTheDocument();
  });

  it('creates a copilotCard node when "Image Generation" is clicked', () => {
    // Need a way to read canvas store — render CanvasPanel and trigger menu, then click item
    const { container } = render(<ReactFlowProvider><CanvasPanel /></ReactFlowProvider>);
    const pane = container.querySelector('.react-flow__pane') as HTMLElement;
    fireEvent.contextMenu(pane, { clientX: 300, clientY: 400, button: 2 });
    fireEvent.click(screen.getByText('Image Generation'));
    // Verify the menu closes (handler should call onClose → setMenuState(null))
    expect(screen.queryByTestId('pane-context-menu')).not.toBeInTheDocument();
    // Verify a copilotCard node was added — we read from the React Flow store via DOM
    expect(container.querySelector('[data-id^="copilot_"]') || container.querySelector('.react-flow__node-copilotCard')).toBeTruthy();
  });

  it('closes menu on overlay click', () => {
    render(<ReactFlowProvider><CanvasPanel /></ReactFlowProvider>);
    const pane = document.querySelector('.react-flow__pane') as HTMLElement;
    fireEvent.contextMenu(pane, { clientX: 100, clientY: 100, button: 2 });
    expect(screen.getByTestId('pane-context-menu')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('pane-context-overlay'));
    expect(screen.queryByTestId('pane-context-menu')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: 运行测试，确认失败**

```bash
npx vitest run src/shared/components/canvas/CanvasPanel.test.tsx
```

预期：FAIL — `./CanvasPanel` 模块不存在（或方法未挂载）

- [ ] **Step 3: 修改 CanvasPanel.tsx — 注册 nodeType**

打开 `src/shared/components/canvas/CanvasPanel.tsx`，找到 `nodeTypes` 定义（约 30-40 行），在末尾添加：

```typescript
import { ScriptCardNode, ArtCardNode, CharacterCardNode, DeliverableCardNode, SceneCardNode } from './nodes';
import { GenericCardNode } from './nodes/GenericCardNode';
import { CopilotCardNode } from './nodes/CopilotCardNode';   // ← 新增
import { CardDetailDrawer } from './CardDetailDrawer';
import { PaneContextMenu } from './PaneContextMenu';           // ← 新增
import { generateId } from '@/shared/lib/utils';

const nodeTypes: NodeTypes = {
  script: ScriptCardNode,
  art: ArtCardNode,
  character: CharacterCardNode,
  deliverable: DeliverableCardNode,
  sceneCard: SceneCardNode,
  storyline: GenericCardNode,
  moodboard: GenericCardNode,
  videoClip: GenericCardNode,
  asset: GenericCardNode,
  task: GenericCardNode,
  copilotCard: CopilotCardNode,   // ← 新增
};
```

- [ ] **Step 4: 修改 CanvasPanel.tsx — 添加 pane 右键菜单状态**

找到 `interface ContextMenuState` 定义，添加 flowPosition 字段：

```typescript
interface ContextMenuState {
  x: number;
  y: number;
  nodeId: string;
  data: Record<string, unknown>;
}

interface PaneMenuState {
  x: number;
  y: number;
  flowPosition: { x: number; y: number };
}
```

- [ ] **Step 5: 修改 CanvasPanel.tsx — 添加 pane 右键处理**

在现有 `contextMenu` state 后追加：

```typescript
const [paneMenu, setPaneMenu] = useState<PaneMenuState | null>(null);
```

在 `onNodeContextMenu` callback 后追加：

```typescript
const onPaneContextMenu = useCallback(
  (event: React.MouseEvent | MouseEvent) => {
    event.preventDefault();
    if (!reactFlowRef.current) return;
    const flowPos = reactFlowRef.current.screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    });
    setPaneMenu({ x: event.clientX, y: event.clientY, flowPosition: flowPos });
  },
  []
);

const handlePaneCreate = useCallback(
  (kind: 'upload' | 'text' | 'image' | 'video', flowPos: { x: number; y: number }) => {
    const copilotNode: CanvasNode = {
      id: generateId('copilot_'),
      type: 'copilotCard',
      position: flowPos,
      data: { kind, status: 'idle' },
    };
    useCanvasStore.getState().addNode(copilotNode);
    setPaneMenu(null);
  },
  []
);

const closePaneMenu = useCallback(() => setPaneMenu(null), []);
```

- [ ] **Step 6: 修改 CanvasPanel.tsx — ReactFlow 接入**

找到 `<ReactFlow ...>` JSX，在 `onNodeContextMenu={onNodeContextMenu}` 后追加：

```tsx
onPaneContextMenu={onPaneContextMenu}
```

- [ ] **Step 7: 修改 CanvasPanel.tsx — 渲染 PaneContextMenu**

找到 `onPaneClick` 的现有 `{/* Context Menu */}` 块（节点菜单），在其**之前**插入：

```tsx
{/* Pane Context Menu */}
{paneMenu && (
  <PaneContextMenu
    x={paneMenu.x}
    y={paneMenu.y}
    flowPosition={paneMenu.flowPosition}
    onClose={closePaneMenu}
    onCreate={handlePaneCreate}
  />
)}
```

- [ ] **Step 8: 运行测试，确认通过**

```bash
npx vitest run src/shared/components/canvas/CanvasPanel.test.tsx
```

预期：PASS（3 用例全过）

- [ ] **Step 9: 运行全量测试，确认无回归**

```bash
npm test
```

预期：所有现有测试仍 PASS，新测试也 PASS

- [ ] **Step 10: Commit**

```bash
git add src/shared/components/canvas/CanvasPanel.tsx src/shared/components/canvas/CanvasPanel.test.tsx
git commit -m "feat(canvas): wire PaneContextMenu on right-click + register copilotCard nodeType"
```

---

## Task 6: 端到端手动验证

**Files:** 无代码改动

- [ ] **Step 1: 启动 dev server**

```bash
npm run dev
```

预期：`Vite dev server started at http://localhost:5173`

- [ ] **Step 2: 在浏览器中打开任意 Drama Studio 项目**

导航至 `/drama/projects/<id>/workspace`，确认画布加载。

- [ ] **Step 3: 验证 pane 右键菜单**

- 在空白画布（无节点的区域）右击
- 验证菜单显示在右击点附近
- 验证包含 4 项：Upload / Text Generation / Image Generation / Video Generation
- 验证点击 overlay 或按 Esc 能关闭菜单
- 验证点击节点右击仍显示现有"复制/删除"菜单（不受影响）

- [ ] **Step 4: 验证 Text Generation**

- 右击 pane → 点击 "Text Generation"
- 验证画布上出现 copilotCard 节点（含 textarea + 生成按钮）
- 输入提示词如 "a hero enters a cafe"
- 点击 "生成"
- 验证：copilot 节点消失，画布上出现 `storyline` 卡片（含标题"a hero enters a cafe"作为 description）

- [ ] **Step 5: 验证 Upload**

- 右击 pane → 点击 "Upload"
- 选择任意 PNG/JPG 图片
- 验证：copilot 节点消失，画布上出现 `asset` 卡片（含文件名 + 缩略图）

- [ ] **Step 6: 验证 Image Generation**

- 确保 Spellpaw Settings 中已配置 OpenAI 或其他 image provider
- 右击 pane → 点击 "Image Generation"
- 输入提示词 + 选择 provider
- 点击 "生成"
- 验证：进度条出现 → 完成后短暂显示"已完成" → copilot 节点消失 → `art` 卡片出现在右击点附近（含缩略图）

- [ ] **Step 7: 验证取消（生成中关闭）**

- 启动一次 image generation
- 生成中（进度条进行时）点击卡片右上角 X
- 验证：卡片立即消失，控制台无 unhandled error（polling 已 abort）

- [ ] **Step 8: 最终 lint + type check**

```bash
npm run lint
npx tsc --noEmit
```

预期：两个都 PASS

- [ ] **Step 9: 最终全量测试**

```bash
npm test
```

预期：所有测试 PASS

- [ ] **Step 10: Commit（如果有任何手动修改）**

如果步骤 1-9 没有触发代码改动，则无需 commit。如果发现问题修复了代码：

```bash
git add -A
git commit -m "fix(canvas): manual e2e fixes"
```

---

## 总览：执行顺序

1. **Task 1** — 扩展类型 union（前置依赖）
2. **Task 2** — pollUntilDone 工具（Task 4 依赖）
3. **Task 3** — PaneContextMenu 组件（Task 5 依赖）
4. **Task 4** — CopilotCardNode 组件（Task 5 依赖）
5. **Task 5** — CanvasPanel 接线（依赖 3 + 4）
6. **Task 6** — E2E 手动验证（最后）

**任务依赖图**：

```
Task 1 → Task 2 → Task 3 → Task 5
            ↓        ↓
         Task 4 ────┘
            ↓
         Task 6
```

---

## 关键风险与缓解

| 风险 | 缓解 |
|------|------|
| `pollUntilDone` 在 vitest fake timers 下行为异常 | 测试用真实 timers（20ms sleep）验证 |
| React Flow `onPaneContextMenu` 在 jsdom 下不触发 | 用 `fireEvent.contextMenu(pane, { button: 2 })` 直接触发 DOM 事件 |
| `FileReader` 在 jsdom 下不可用 | jsdom 提供 FileReader polyfill；如失败，集成测试用 upload 流程手动验证 |
| CopilotCardNode 的 `providerId` 在测试中未注入 | Task 4 测试用 mock provider 注册到 `providerRegistry` |
| AbortController 在 vitest 中需要 polyfill | Node 18+ 原生支持，无需 polyfill |

---

**End of plan**
