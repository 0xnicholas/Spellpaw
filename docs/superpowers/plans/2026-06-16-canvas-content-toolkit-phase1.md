# Canvas Content Toolkit — Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the foundation of the Canvas Content Generation Toolkit: a pluggable Provider Registry, an OpenAI/DALL·E provider, async task persistence, and a `spellpaw_generate_asset` tool that the LLM can call to create image assets on the canvas.

**Architecture:** Add a new `src/apps/drama/lib/canvasToolkit/` module with a small provider interface, registry, task store, and action handlers. `toolRouter.ts` delegates to the toolkit; `toolConfigs.ts` exposes the new tool; `systemPrompt.ts` tells the LLM when to use it.

**Tech Stack:** React, TypeScript, Zustand, Immer, IndexedDB (via `createIDBStorage`), OpenAI SDK, Vitest.

---

## File Structure

| File | Responsibility |
|------|----------------|
| `src/apps/drama/types/index.ts` | Add `sourceProvider` to `CanvasNodeData`. |
| `src/apps/drama/lib/canvasToolkit/types.ts` | Toolkit and provider TypeScript contracts. |
| `src/apps/drama/lib/canvasToolkit/providers/openaiProvider.ts` | OpenAI/DALL·E provider implementation. |
| `src/apps/drama/lib/canvasToolkit/registry.ts` | ProviderRegistry: registration, selection, capability matching. |
| `src/apps/drama/lib/canvasToolkit/taskStore.ts` | Persist pending async generation tasks to IndexedDB. |
| `src/apps/drama/lib/canvasToolkit/actions/generateAsset.ts` | Handler for `spellpaw_generate_asset`. |
| `src/apps/drama/lib/canvasToolkit/index.ts` | Public API: exports handlers and registry helpers. |
| `src/apps/drama/lib/canvasCardSchema.ts` | Normalize `sourceProvider` in `normalizeCardData` / `normalizeCardUpdateData`. |
| `src/apps/drama/stores/toolRouter.ts` | Register `generate_asset` action from toolkit. |
| `src/apps/drama/lib/toolConfigs.ts` | Add `spellpaw_generate_asset` tool config. |
| `src/apps/drama/lib/systemPrompt.ts` | Add `buildCanvasToolkitSection()` and append to prompt. |
| `src/apps/drama/lib/canvasToolkit/registry.test.ts` | ProviderRegistry tests. |
| `src/apps/drama/lib/canvasToolkit/providers/openaiProvider.test.ts` | OpenAI provider tests. |
| `src/apps/drama/lib/canvasToolkit/actions/generateAsset.test.ts` | `generateAsset` action tests. |

---

### Task 1: Extend `CanvasNodeData` with `sourceProvider`

**Files:**
- Modify: `src/apps/drama/types/index.ts:62-74`

- [ ] **Step 1: Add the field**

```typescript
export interface CanvasNodeData extends Record<string, unknown> {
  title: string;
  description?: string;
  status?: 'draft' | 'in_progress' | 'review' | 'done';
  thumbnail?: string;
  generatedPrompt?: string;
  sourceProvider?: string;
  tags?: string[];
  linkedTreeNodeId?: string;
  deliverableType?: DeliverableType;
  duration?: number;
  fileSize?: number;
  resolution?: string;
}
```

- [ ] **Step 2: Run TypeScript check**

Run: `npm run lint:server` (server only; frontend lint may have pre-existing issues)
Expected: pass

- [ ] **Step 3: Commit**

```bash
git add src/apps/drama/types/index.ts
git commit -m "types: add sourceProvider to CanvasNodeData"
```

---

### Task 2: Normalize `sourceProvider` in canvas card schema

**Files:**
- Modify: `src/apps/drama/lib/canvasCardSchema.ts:171-220` and `226-272`

- [ ] **Step 1: Update `normalizeCardData`**

In the `common` object, add:

```typescript
if (typeof raw.sourceProvider === 'string') common.sourceProvider = raw.sourceProvider;
```

- [ ] **Step 2: Update `normalizeCardUpdateData`**

In the `common` object, add:

```typescript
if (typeof raw.sourceProvider === 'string') common.sourceProvider = raw.sourceProvider;
```

- [ ] **Step 3: Run tests**

Run: `npm test -- --run src/apps/drama/lib/canvasCardSchema.test.ts`
Expected: pass

- [ ] **Step 4: Commit**

```bash
git add src/apps/drama/lib/canvasCardSchema.ts
git commit -m "feat(canvas): normalize sourceProvider field"
```

---

### Task 3: Create toolkit type definitions

**Files:**
- Create: `src/apps/drama/lib/canvasToolkit/types.ts`

- [ ] **Step 1: Write the file**

```typescript
export type MediaType = 'image' | 'video';

export type Capability =
  | 'text2image'
  | 'image2image'
  | 'inpaint'
  | 'text2video'
  | 'image2video'
  | 'styleTransfer';

export interface GenerationInput {
  type: MediaType;
  capability: Capability;
  prompt: string;
  referenceUrl?: string;
  count?: number;
  options?: Record<string, unknown>;
}

export interface GenerationTask {
  taskId: string;
  status: 'pending' | 'processing' | 'done' | 'failed';
  resultUrl?: string;
  error?: string;
}

export interface ProviderConfig {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  [key: string]: unknown;
}

export interface GenerationProvider {
  id: string;
  name: string;
  supportedMedia: MediaType[];
  capabilities: Capability[];
  defaultConfigKeys: string[];
  isConfigured(): boolean;
  configure(config: ProviderConfig): void;
  estimateCost(input: GenerationInput): { amount: number; unit: string };
  submit(input: GenerationInput): Promise<GenerationTask>;
  poll?(taskId: string): Promise<GenerationTask>;
}

export type ToolkitResult =
  | { success: true; message: string; cardIds: string[]; taskId?: string }
  | { success: false; message: string; retryable: boolean };
```

- [ ] **Step 2: Commit**

```bash
git add src/apps/drama/lib/canvasToolkit/types.ts
git commit -m "feat(canvasToolkit): add toolkit type contracts"
```

---

### Task 4: Create the OpenAI provider

**Files:**
- Create: `src/apps/drama/lib/canvasToolkit/providers/openaiProvider.ts`

- [ ] **Step 1: Write the provider**

```typescript
import OpenAI from 'openai';
import type { GenerationProvider, GenerationInput, GenerationTask, ProviderConfig } from '../types';

const SETTINGS_KEY = 'spellpaw_settings';

function readSettings(): Record<string, unknown> {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function createOpenAIProvider(): GenerationProvider {
  let config: ProviderConfig = {};

  return {
    id: 'openai',
    name: 'OpenAI / DALL·E 3',
    supportedMedia: ['image'],
    capabilities: ['text2image'],
    defaultConfigKeys: ['openaiApiKey'],

    isConfigured() {
      if (config.apiKey) return true;
      const settings = readSettings();
      return typeof settings.openaiApiKey === 'string' && settings.openaiApiKey.length > 0;
    },

    configure(next) {
      config = { ...config, ...next };
    },

    estimateCost(_input: GenerationInput) {
      return { amount: 1, unit: 'image' };
    },

    async submit(input: GenerationInput): Promise<GenerationTask> {
      const apiKey = config.apiKey ?? (readSettings().openaiApiKey as string | undefined);
      if (!apiKey) {
        return { taskId: '', status: 'failed', error: 'OpenAI API key not configured' };
      }

      const openai = new OpenAI({ apiKey, dangerouslyAllowBrowser: true });
      const size = (input.options?.size as '1024x1024' | '1792x1024' | '1024x1792') ?? '1024x1024';

      try {
        const response = await openai.images.generate({
          model: 'dall-e-3',
          prompt: input.prompt,
          n: 1,
          size,
          style: 'vivid',
        });
        const url = response.data?.[0]?.url;
        if (!url) {
          return { taskId: '', status: 'failed', error: 'No image URL in OpenAI response' };
        }
        return { taskId: `openai_${Date.now()}`, status: 'done', resultUrl: url };
      } catch (err) {
        return { taskId: '', status: 'failed', error: (err as Error).message };
      }
    },
  };
}
```

- [ ] **Step 2: Create the test file**

Create: `src/apps/drama/lib/canvasToolkit/providers/openaiProvider.test.ts`

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createOpenAIProvider } from './openaiProvider';

const mockGenerate = vi.fn();
vi.mock('openai', () => ({
  default: class MockOpenAI {
    images = { generate: mockGenerate };
  },
}));

describe('openaiProvider', () => {
  beforeEach(() => {
    mockGenerate.mockReset();
    localStorage.clear();
  });

  it('reports not configured when key is missing', () => {
    const provider = createOpenAIProvider();
    expect(provider.isConfigured()).toBe(false);
  });

  it('reports configured after configure()', () => {
    const provider = createOpenAIProvider();
    provider.configure({ apiKey: 'sk-test' });
    expect(provider.isConfigured()).toBe(true);
  });

  it('returns failed task when key missing', async () => {
    const provider = createOpenAIProvider();
    const result = await provider.submit({
      type: 'image',
      capability: 'text2image',
      prompt: 'test',
    });
    expect(result.status).toBe('failed');
  });

  it('returns done task with image URL', async () => {
    const provider = createOpenAIProvider();
    provider.configure({ apiKey: 'sk-test' });
    mockGenerate.mockResolvedValue({ data: [{ url: 'https://example.com/img.png' }] });

    const result = await provider.submit({
      type: 'image',
      capability: 'text2image',
      prompt: 'a dark alley',
    });

    expect(result.status).toBe('done');
    expect(result.resultUrl).toBe('https://example.com/img.png');
  });
});
```

- [ ] **Step 3: Run the tests**

Run: `npm test -- --run src/apps/drama/lib/canvasToolkit/providers/openaiProvider.test.ts`
Expected: 4 passing

- [ ] **Step 4: Commit**

```bash
git add src/apps/drama/lib/canvasToolkit/providers/
git commit -m "feat(canvasToolkit): add OpenAI/DALL·E provider"
```

---

### Task 5: Create the Provider Registry

**Files:**
- Create: `src/apps/drama/lib/canvasToolkit/registry.ts`
- Create: `src/apps/drama/lib/canvasToolkit/registry.test.ts`

- [ ] **Step 1: Write the registry**

```typescript
import type { GenerationProvider, GenerationInput, Capability, MediaType } from './types';

class ProviderRegistry {
  private providers: Map<string, GenerationProvider> = new Map();

  register(provider: GenerationProvider): void {
    this.providers.set(provider.id, provider);
  }

  get(id: string): GenerationProvider | undefined {
    return this.providers.get(id);
  }

  list(): GenerationProvider[] {
    return Array.from(this.providers.values());
  }

  ids(): string[] {
    return Array.from(this.providers.keys());
  }

  select(input: GenerationInput, preferredId?: string): { provider: GenerationProvider } | { error: string } {
    if (preferredId) {
      const provider = this.providers.get(preferredId);
      if (!provider) {
        return { error: `未找到 provider: ${preferredId}` };
      }
      if (!provider.isConfigured()) {
        return {
          error: `Provider ${preferredId} 未配置。需要设置: ${provider.defaultConfigKeys.join(', ')}`,
        };
      }
      if (!this.supports(provider, input)) {
        return { error: `Provider ${preferredId} 不支持 ${input.capability}` };
      }
      return { provider };
    }

    for (const provider of this.providers.values()) {
      if (provider.isConfigured() && this.supports(provider, input)) {
        return { provider };
      }
    }

    const configured = this.list()
      .filter((p) => p.isConfigured())
      .map((p) => p.id)
      .join(', ') || '无';
    return {
      error: `没有已配置的 provider 支持 ${input.type}/${input.capability}。已配置: ${configured}`,
    };
  }

  private supports(provider: GenerationProvider, input: GenerationInput): boolean {
    return (
      provider.supportedMedia.includes(input.type) &&
      provider.capabilities.includes(input.capability)
    );
  }
}

export const providerRegistry = new ProviderRegistry();
```

- [ ] **Step 2: Write the tests**

```typescript
import { describe, it, expect } from 'vitest';
import { providerRegistry } from './registry';
import type { GenerationProvider } from './types';

function makeProvider(overrides: Partial<GenerationProvider>): GenerationProvider {
  return {
    id: 'mock',
    name: 'Mock',
    supportedMedia: ['image'],
    capabilities: ['text2image'],
    defaultConfigKeys: ['key'],
    isConfigured: () => false,
    configure: () => {},
    estimateCost: () => ({ amount: 1, unit: 'image' }),
    submit: async () => ({ taskId: '1', status: 'done' }),
    ...overrides,
  } as GenerationProvider;
}

describe('providerRegistry', () => {
  it('registers and retrieves a provider', () => {
    const p = makeProvider({ id: 'p1' });
    providerRegistry.register(p);
    expect(providerRegistry.get('p1')).toBe(p);
  });

  it('selects configured provider by capability', () => {
    providerRegistry.register(makeProvider({ id: 'img', isConfigured: () => true }));
    providerRegistry.register(makeProvider({ id: 'vid', supportedMedia: ['video'], capabilities: ['text2video'], isConfigured: () => true }));

    const result = providerRegistry.select({ type: 'image', capability: 'text2image', prompt: 'x' });
    expect('provider' in result && result.provider.id).toBe('img');
  });

  it('errors when no provider matches capability', () => {
    providerRegistry.register(makeProvider({ id: 'img', isConfigured: () => true }));
    const result = providerRegistry.select({ type: 'video', capability: 'text2video', prompt: 'x' });
    expect('error' in result).toBe(true);
  });

  it('errors when preferred provider is not configured', () => {
    providerRegistry.register(makeProvider({ id: 'img', isConfigured: () => false }));
    const result = providerRegistry.select({ type: 'image', capability: 'text2image', prompt: 'x' }, 'img');
    expect('error' in result).toBe(true);
  });
});
```

- [ ] **Step 3: Run the tests**

Run: `npm test -- --run src/apps/drama/lib/canvasToolkit/registry.test.ts`
Expected: 4 passing

- [ ] **Step 4: Commit**

```bash
git add src/apps/drama/lib/canvasToolkit/registry.ts src/apps/drama/lib/canvasToolkit/registry.test.ts
git commit -m "feat(canvasToolkit): add provider registry"
```

---

### Task 6: Create async task store

**Files:**
- Create: `src/apps/drama/lib/canvasToolkit/taskStore.ts`

- [ ] **Step 1: Write the store**

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { createIDBStorage } from '@/shared/lib/idbStorage';

export interface PendingTask {
  taskId: string;
  providerId: string;
  cardId: string;
  createdAt: string;
}

interface TaskStoreState {
  tasks: PendingTask[];
  addTask(task: PendingTask): void;
  removeTask(taskId: string): void;
}

export const useTaskStore = create<TaskStoreState>()(
  persist(
    (set) => ({
      tasks: [],
      addTask: (task) => set((s) => ({ tasks: [...s.tasks, task] })),
      removeTask: (taskId) => set((s) => ({ tasks: s.tasks.filter((t) => t.taskId !== taskId) })),
    }),
    {
      name: 'spellpaw_canvas_tasks',
      version: 1,
      storage: createIDBStorage<TaskStoreState>('canvasTaskStore'),
    }
  )
);
```

- [ ] **Step 2: Commit**

```bash
git add src/apps/drama/lib/canvasToolkit/taskStore.ts
git commit -m "feat(canvasToolkit): add persisted async task store"
```

---

### Task 7: Implement `generate_asset` action

**Files:**
- Create: `src/apps/drama/lib/canvasToolkit/actions/generateAsset.ts`
- Create: `src/apps/drama/lib/canvasToolkit/actions/generateAsset.test.ts`

- [ ] **Step 1: Write the action**

```typescript
import { useProjectStore } from '@drama/stores/projectStore';
import { addCanvasCardHandler } from '@drama/lib/builderHandlers';
import { providerRegistry } from '../registry';
import { useTaskStore } from '../taskStore';
import type { ToolkitResult, GenerationInput, Capability, MediaType } from '../types';
import type { CanvasNodeType } from '@drama/types';

export interface GenerateAssetParams {
  action: 'generate_asset';
  nodeId: string;
  mediaType: MediaType;
  prompt?: string;
  provider?: string;
  count?: number;
  cardType?: CanvasNodeType;
}

function buildDefaultPrompt(node: NonNullable<ReturnType<typeof useProjectStore.getState>['getCurrentTree']>): string {
  const m = node.metadata ?? {};
  const parts: string[] = [`Cinematic storyboard frame for "${node.title}".`];
  if (m.description) parts.push(m.description as string);
  if (m.shotType) parts.push(`Shot type: ${m.shotType}.`);
  if (m.location) parts.push(`Location: ${m.location}.`);
  if (m.timeOfDay) parts.push(`Time of day: ${m.timeOfDay}.`);
  parts.push('Vertical 9:16, cinematic lighting, photorealistic.');
  return parts.join(' ');
}

export async function generateAsset(params: GenerateAssetParams): Promise<ToolkitResult> {
  const store = useProjectStore.getState();
  const tree = store.getCurrentTree();
  if (!tree) {
    return { success: false, message: '当前没有打开的项目', retryable: false };
  }

  const node = findNode(tree, params.nodeId);
  if (!node) {
    return { success: false, message: `未找到节点: ${params.nodeId}`, retryable: false };
  }

  const capability: Capability = params.mediaType === 'video' ? 'text2video' : 'text2image';
  const input: GenerationInput = {
    type: params.mediaType,
    capability,
    prompt: params.prompt ?? buildDefaultPrompt(node),
    count: params.count ?? 1,
  };

  const selection = providerRegistry.select(input, params.provider);
  if ('error' in selection) {
    return { success: false, message: selection.error, retryable: false };
  }

  const provider = selection.provider;
  const cardType = params.cardType ?? (params.mediaType === 'video' ? 'deliverable' : 'art');
  const cardIds: string[] = [];

  for (let i = 0; i < (input.count ?? 1); i++) {
    const card = await addCanvasCardHandler(cardType, {
      title: `${node.title}${input.count && input.count > 1 ? ` 变体 ${i + 1}` : ''}`,
      description: input.prompt,
      linkedTreeNodeId: node.id,
      status: 'draft',
      sourceProvider: provider.id,
    });
    cardIds.push(card.id);

    const task = await provider.submit(input);
    if (task.status === 'done' && task.resultUrl) {
      updateCardThumbnail(card.id, task.resultUrl);
    } else if (task.status === 'pending' || task.status === 'processing') {
      useTaskStore.getState().addTask({
        taskId: task.taskId,
        providerId: provider.id,
        cardId: card.id,
        createdAt: new Date().toISOString(),
      });
      startPolling(task.taskId, provider);
    } else {
      return { success: false, message: task.error ?? '生成失败', retryable: true };
    }
  }

  return {
    success: true,
    message: `已使用 ${provider.name} 生成 ${cardIds.length} 张${cardType === 'deliverable' ? '视频' : '图片'}卡片`,
    cardIds,
  };
}

function findNode(node: ReturnType<typeof useProjectStore.getState>['getCurrentTree'], nodeId: string) {
  if (!node) return null;
  if (node.id === nodeId) return node;
  for (const child of node.children ?? []) {
    const found = findNode(child, nodeId);
    if (found) return found;
  }
  return null;
}

function updateCardThumbnail(cardId: string, url: string) {
  import('@drama/stores/canvasStore').then(({ useCanvasStore }) => {
    useCanvasStore.getState().updateNodeData(cardId, { thumbnail: url });
  });
}

function startPolling(taskId: string, provider: Awaited<ReturnType<typeof providerRegistry.select>> extends { provider: infer P } ? P : never) {
  if (!provider.poll) return;
  const interval = setInterval(async () => {
    const task = await provider.poll!(taskId);
    if (task.status === 'done' && task.resultUrl) {
      const pending = useTaskStore.getState().tasks.find((t) => t.taskId === taskId);
      if (pending) {
        updateCardThumbnail(pending.cardId, task.resultUrl);
        useTaskStore.getState().removeTask(taskId);
      }
      clearInterval(interval);
    } else if (task.status === 'failed') {
      useTaskStore.getState().removeTask(taskId);
      clearInterval(interval);
    }
  }, 4000);
}
```

- [ ] **Step 2: Write tests**

Use a mock provider and assert store updates. Keep tests focused; mock `addCanvasCardHandler` and `providerRegistry`.

- [ ] **Step 3: Run tests**

Run: `npm test -- --run src/apps/drama/lib/canvasToolkit/actions/generateAsset.test.ts`
Expected: pass

- [ ] **Step 4: Commit**

```bash
git add src/apps/drama/lib/canvasToolkit/actions/
git commit -m "feat(canvasToolkit): add generate_asset action"
```

---

### Task 8: Wire toolkit into `toolRouter`

**Files:**
- Modify: `src/apps/drama/stores/toolRouter.ts`
- Create: `src/apps/drama/lib/canvasToolkit/index.ts`

- [ ] **Step 1: Create `index.ts`**

```typescript
export * from './types';
export { providerRegistry } from './registry';
export { useTaskStore } from './taskStore';
export { generateAsset } from './actions/generateAsset';
```

- [ ] **Step 2: Add `generate_asset` to `toolRouter`**

Import at top:

```typescript
import { generateAsset } from '@drama/lib/canvasToolkit';
```

Add handler inside `toolRouter`:

```typescript
generate_asset: async (params) => {
  const result = await generateAsset(params as Parameters<typeof generateAsset>[0]);
  if (!result.success) throw new Error(result.message);
  return result.message;
},
```

- [ ] **Step 3: Run tests**

Run: `npm test -- --run src/apps/drama/stores/toolRouter.test.ts`
Expected: pass

- [ ] **Step 4: Commit**

```bash
git add src/apps/drama/lib/canvasToolkit/index.ts src/apps/drama/stores/toolRouter.ts
git commit -m "feat(toolRouter): wire generate_asset from canvasToolkit"
```

---

### Task 9: Expose `spellpaw_generate_asset` to the LLM

**Files:**
- Modify: `src/apps/drama/lib/toolConfigs.ts`

- [ ] **Step 1: Add tool config after `kickstart_project`**

```typescript
{
  name: 'spellpaw_generate_asset',
  description: 'Generate an image or video asset for a tree node and add it to the canvas as a card. Use when the user asks to generate a storyboard, reference image, scene visual, or video for a scene/shot. Valid providers: openai.',
  parameters: {
    type: 'object',
    properties: {
      nodeId: { type: 'string', description: 'ID of the scene or shot node to generate for' },
      mediaType: { type: 'string', enum: ['image', 'video'], description: 'Type of media to generate' },
      prompt: { type: 'string', description: 'Optional generation prompt; if omitted, built from node metadata' },
      provider: { type: 'string', enum: ['openai'], description: 'Optional provider id' },
      count: { type: 'number', description: 'Number of variants to generate (default 1)' },
      cardType: { type: 'string', enum: ['art', 'sceneCard', 'deliverable'], description: 'Canvas card type to create (default art for image, deliverable for video)' },
    },
    required: ['nodeId', 'mediaType'],
  },
  endpoint: TOOL_ENDPOINT,
},
```

- [ ] **Step 2: Commit**

```bash
git add src/apps/drama/lib/toolConfigs.ts
git commit -m "feat(toolConfigs): expose spellpaw_generate_asset to LLM"
```

---

### Task 10: Update system prompt

**Files:**
- Modify: `src/apps/drama/lib/systemPrompt.ts`

- [ ] **Step 1: Add helper function**

After `genreGuidance`, add:

```typescript
function buildCanvasToolkitSection(): string {
  return [
    `## 画布内容生成工具包`,
    `当用户提到「生成参考图 / 生成分镜 / 为场景生成图片 / 生成视频」时，直接调用下列工具，不要拆成多个 add_canvas_card：`,
    `- spellpaw_generate_asset({ nodeId, mediaType: "image"|"video", prompt?, provider?, count?, cardType? })`,
    `可用 provider: openai`,
  ].join('\n');
}
```

- [ ] **Step 2: Append section to prompt**

In the array returned by `buildSystemPrompt`, add a call after the canvas card spec section:

```typescript
buildCanvasToolkitSection(),
```

- [ ] **Step 3: Commit**

```bash
git add src/apps/drama/lib/systemPrompt.ts
git commit -m "feat(systemPrompt): add canvas toolkit section"
```

---

### Task 11: Full test run and lint

- [ ] **Step 1: Run all tests**

Run: `npm test -- --run`
Expected: all pass

- [ ] **Step 2: Run server lint**

Run: `npm run lint:server`
Expected: pass

- [ ] **Step 3: Final commit**

```bash
git add docs/superpowers/specs/2026-06-16-canvas-content-toolkit-design.md
git commit -m "docs: canvas content toolkit phase 1 spec and plan"
```

---

## Plan Review Gate

After completing the plan, dispatch a plan-document-reviewer subagent with:
- Plan path: `docs/superpowers/plans/2026-06-16-canvas-content-toolkit-phase1.md`
- Spec path: `docs/superpowers/specs/2026-06-16-canvas-content-toolkit-design.md`

Fix any blockers, then proceed to execution handoff.
