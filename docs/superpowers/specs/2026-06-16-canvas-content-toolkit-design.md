# Canvas Content Generation Toolkit Design

> **Status**: Revised after spec review — ready for implementation planning  
> **Date**: 2026-06-16  
> **Scope**: Spellpaw Drama Studio — Copilot-facing toolkit for generating and refining canvas content with a pluggable provider pool.

---

## 1. Problem Statement

Spellpaw exposes low-level canvas operations (`add_canvas_card`, `update_canvas_card`, `delete_canvas_card`) and one high-level shortcut (`kickstart_project`). The LLM is unreliable at chaining multiple low-level calls: it frequently stops after a single tool call or describes what it *would* do instead of executing.

We need a **Canvas Content Generation Toolkit** that:

- Encapsulates common "generate / edit / refine / variant" workflows behind single tool calls.
- Decouples media generation from vendors via a pluggable **Provider Pool**.
- Is discoverable by the LLM through clear tool descriptions and system-prompt guidance.
- Can be extended without bloating `toolRouter.ts`.

---

## 2. Goals & Non-Goals

### Goals

- Provide 4–5 high-level tools the LLM calls directly from natural language.
- Support image generation and video generation in the first phase; editing and style transfer in later phases.
- Allow multiple providers (OpenAI/DALL·E, Topview, future Seedance/Kling) to coexist.
- Reuse existing stores (`projectStore`, `canvasStore`) and card schema.
- Persist async generation tasks across page reloads.

### Non-Goals

- Real-time pixel-level editing UX in this phase (the provider may delegate).
- Billing / credit system (only cost estimation markers).
- Native mobile support.
- Replacing `kickstart_project`; it becomes one toolkit action.

---

## 3. Architecture

```
User Chat Input
       │
       ▼
┌─────────────────────────────────────┐
│  Copilot LLM                        │
│  (picks a toolkit tool)             │
└─────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│  toolRouter (thin adapter)          │
│  delegates to canvasToolkit actions │
└─────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│  canvasToolkit                      │
│  • kickstart_project                │
│  • generate_asset                   │
│  • edit_asset                       │
│  • generate_variants                │
│  • apply_style                      │
└─────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│  ProviderRegistry                   │
│  selects provider by capability &   │
│  configuration                      │
└─────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────┐
│  GenerationProvider implementations │
│  (openai, topview, seedance, ...)   │
└─────────────────────────────────────┘
```

### File Layout

```
src/apps/drama/lib/canvasToolkit/
├── index.ts              # public API: tool handlers + registry helpers
├── types.ts              # ToolkitAction, GenerationInput, GenerationProvider, etc.
├── registry.ts           # ProviderRegistry
├── taskStore.ts          # persisted pending async tasks
├── actions/
│   ├── kickstartProject.ts
│   ├── generateAsset.ts
│   ├── editAsset.ts
│   ├── generateVariants.ts
│   └── applyStyle.ts
└── providers/
    ├── openaiProvider.ts       # wraps existing DALL·E imageGen
    ├── topviewProvider.ts      # Topview video/image bridge
    └── seedanceProvider.ts     # placeholder / future model
```

`toolRouter.ts` imports handlers from `canvasToolkit/index.ts` and registers them under `spellpaw_*` names. `systemPrompt.ts` appends a new section via a dedicated helper.

---

## 4. Toolkit Tools (LLM-facing)

All tools are registered in `src/apps/drama/lib/toolConfigs.ts` and described in `systemPrompt.ts`.

| Tool | Intent | Key Parameters | Return |
|------|--------|----------------|--------|
| `spellpaw_kickstart_project` | Create structure + scene cards from a theme | `theme`, `genre?`, `cardType?` | `ToolkitResult` summary |
| `spellpaw_generate_asset` | Generate an image/video asset for a node | `nodeId`, `mediaType`, `prompt?`, `provider?`, `count?`, `cardType?` | `ToolkitResult` with card ids / task id |
| `spellpaw_edit_asset` | Edit an existing asset by instruction | `cardId`, `instruction`, `provider?` | `ToolkitResult` with new card id |
| `spellpaw_generate_variants` | Generate multiple style variants for a node/card | `nodeId` or `cardId`, `count`, `stylePrompts?` | `ToolkitResult` with variant card ids |
| `spellpaw_apply_style` | Apply a visual style to existing visual cards | `scope` + `style`, `provider?` | `ToolkitResult` summary |

### Common Result Type

```typescript
export type ToolkitResult =
  | { success: true; message: string; cardIds: string[]; taskId?: string }
  | { success: false; message: string; retryable: boolean };
```

### Parameter Examples

```json
{
  "action": "generate_asset",
  "nodeId": "scene-1-1",
  "mediaType": "image",
  "prompt": "雨夜小巷，霓虹灯反射，悬疑氛围",
  "provider": "openai"
}

{
  "action": "edit_asset",
  "cardId": "canvas_art_abc",
  "instruction": "把背景换成赛博朋克霓虹街景，保持人物光影一致"
}

{
  "action": "generate_variants",
  "nodeId": "scene-2-1",
  "count": 3,
  "stylePrompts": ["暖色调", "冷色调", "复古胶片"]
}

{
  "action": "apply_style",
  "scope": { "nodeId": "scene-2-1" },
  "style": "赛博朋克霓虹"
}
```

### `apply_style` Scope Union

```typescript
type StyleScope =
  | { nodeId: string }
  | { cardId: string }
  | { scope: 'current_project' };
```

Only visual card types (`art`, `sceneCard`, `deliverable` with `deliverableType: 'image'`) are affected.

---

## 5. Provider Interface

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
  // provider-specific extras
  [key: string]: unknown;
}

export interface GenerationProvider {
  id: string;
  name: string;
  supportedMedia: MediaType[];
  capabilities: Capability[];
  defaultConfigKeys: string[];            // e.g. ['openaiApiKey']
  isConfigured(): boolean;
  configure(config: ProviderConfig): void;
  estimateCost(input: GenerationInput): { amount: number; unit: string };
  submit(input: GenerationInput): Promise<GenerationTask>;
  poll?(taskId: string): Promise<GenerationTask>;
}
```

### Configuration

- Providers read settings from `localStorage` key `spellpaw_settings` by default.
- `defaultConfigKeys` declares which setting keys are required.
- Future server-side providers can read from `process.env` on the Spellpaw Server.

### Selection Rules

1. If `provider` parameter is provided and matches a registered provider id, use it.
2. Otherwise, pick the first registered provider that supports the requested `mediaType` and `capability` and is `isConfigured()`.
3. If no provider matches, return a `ToolkitResult` error listing the missing capability and available providers.

> Cost/quality preference ranking is out of scope for the first phase; registration order is the tie-breaker.

### Explicit Provider Selection

If the user explicitly requests a `provider`, it must still be `isConfigured()`. If it is not configured, return a `ToolkitResult` error naming the missing setting key. Do not silently fall back to another provider unless the user request is ambiguous.

---

## 6. Data Flow

### `generate_asset`

1. Resolve the target tree node from `nodeId`.
2. Build a default prompt from node metadata if `prompt` is omitted (reuse `buildImagePrompt`).
3. Pick a provider via `ProviderRegistry`.
4. Normalize `count` (default `1`): create N distinct cards. Providers may batch natively or submit sequentially.
5. Call `provider.submit(...)`.
6. If synchronous (`status === 'done'`), create canvas card(s) via `addCanvasCardHandler`.
7. If asynchronous, create a placeholder card immediately with a `processing` status and persist the pending task to `taskStore`; start polling.
8. Return `ToolkitResult` to the LLM.

### Card Types Produced

| `mediaType` | Default card type | Notes |
|-------------|-------------------|-------|
| `image` | `art` | `sceneCard` when linked to a scene and `cardType: 'sceneCard'` is requested |
| `video` | `deliverable` | `deliverableType: 'video'` |

All generated cards store `generatedPrompt` and `sourceProvider` in their data for traceability.

### Asynchronous Task Polling

- Persist pending tasks to IndexedDB via `taskStore.ts` so they survive reloads.
- Poll every 3–5 seconds via `provider.poll(taskId)`.
- On completion, update the target canvas card thumbnail / deliverable URL.
- On failure, update card status to `error` and push a system message to the chat.
- Clean up the pending task record when terminal (`done` or `failed`).

---

## 7. LLM Discoverability

Add a helper `buildCanvasToolkitSection()` in `src/apps/drama/lib/systemPrompt.ts` and append it to the system prompt.

```
## 画布内容生成工具包
当用户提到「生成参考图 / 生成分镜 / 精修图片 / 换风格 / 做几个版本」时，
直接使用下列工具，不要拆成多个 add_canvas_card 调用：
- spellpaw_generate_asset({ nodeId, mediaType: "image"|"video", prompt?, provider?, count?, cardType? })
- spellpaw_edit_asset({ cardId, instruction, provider? })
- spellpaw_generate_variants({ nodeId|cardId, count, stylePrompts? })
- spellpaw_apply_style({ scope: { nodeId } | { cardId } | { scope: "current_project" }, style, provider? })
可用 provider 值: openai, topview
```

Each tool description in `toolConfigs.ts` will include:

- A one-sentence "when to use" clause.
- Concrete parameter examples.
- The expected card type produced.
- The list of valid provider ids (dynamically from `ProviderRegistry`).

---

## 8. Error Handling

| Scenario | Behavior |
|----------|----------|
| Provider not configured | `success: false`, message: "未配置 openai Api Key，请先在设置中添加。" |
| No provider supports requested capability | `success: false`, message lists missing capability and configured providers. |
| Provider API error | `success: false`, `retryable: true`, sanitized error message. |
| Async task failed | Update card status to `error`; push system message to chat. |
| Invalid `nodeId` / `cardId` | `success: false`, validation error. |
| Network offline | Queue sync provider calls locally; retry via `taskStore` when online. |

---

## 9. Migration from Existing Code

- `src/apps/drama/lib/imageGen.ts` → wrapped into `canvasToolkit/providers/openaiProvider.ts`.
- `toolRouter.generate_storyboard` → thin wrapper:
  ```ts
  generate_storyboard: (params) => generateAsset({
    action: 'generate_asset',
    nodeId: params.nodeId as string,
    mediaType: 'image',
    cardType: 'art',
    prompt: params.prompt as string | undefined,
  })
  ```
- `toolRouter.kickstart_project` → moved to `canvasToolkit/actions/kickstartProject.ts`; `toolRouter` re-exports it.
- Existing `add_canvas_card` / `update_canvas_card` / `delete_canvas_card` remain as low-level tools.
- Add `sourceProvider?: string` to `CanvasNodeData` in `src/apps/drama/types/index.ts`.

---

## 10. Style Lock Integration

Tree metadata already contains `lockedStylePrompt` and `lockedStyleNodeId`.

- `apply_style` writes the applied style prompt to the linked tree node’s `lockedStylePrompt` when `scope` is a `nodeId`.
- `generate_asset` and `generate_variants` prepend `lockedStylePrompt` to the generation prompt when the target node has one.

---

## 11. Phased Deliverables

| Phase | Deliverables | Provider Capability |
|-------|--------------|---------------------|
| **Phase 1** | Provider registry, OpenAI provider, `generate_asset`, async task store, `CanvasNodeData.sourceProvider` | `text2image` |
| **Phase 2** | `generate_variants`, `apply_style`, style-lock integration | `text2image`, `styleTransfer` |
| **Phase 3** | `edit_asset` + image2image/inpaint provider | `image2image`, `inpaint` |
| **Phase 4** | Topview provider integration for video | `text2video` |
| **Phase 5** | Seedance / Kling / additional providers, cost/quality ranking | varies |

---

## 12. Testing Strategy

- **ProviderRegistry**: matrix tests for capability + configuration matching; missing-capability error path.
- **OpenAI provider**: mock `openai.images.generate` and assert URL parsing.
- **Toolkit actions**: mock provider registry, assert correct `canvasStore` / `projectStore` updates.
- **Async task store**: IndexedDB persistence and polling completion/failure paths.
- **Schema validation**: each tool JSON Schema validates expected inputs.
- **Backward compatibility**: `generate_storyboard` still creates an `art` card with correct metadata.
- **Smoke**: send a prompt in ChatPanel and verify `spellpaw_generate_asset` is invoked.

---

## 13. Open Questions (Resolved)

1. **Where do provider API keys live?** Browser `localStorage` (`spellpaw_settings`) for client-side providers; server env vars for server-side providers in future phases.
2. **How are async tasks persisted?** IndexedDB via `taskStore.ts`.
3. **Canonical card type for visual assets?** `art` for general reference images; `sceneCard` when explicitly requested or generated for a scene in kickstart; `deliverable` for video.
4. **Day-one provider capabilities?** OpenAI/DALL·E supports `text2image`; Topview supports `text2video` in Phase 4.
5. **`edit_asset` in-place or new card?** New `art` card by default so users can compare before/after.
6. **How does the LLM know valid provider ids?** Tool description includes the dynamic list from `ProviderRegistry`.

---

## 14. References

- `docs/competitive-analysis-buzzy-now.md`
- `src/apps/drama/stores/toolRouter.ts`
- `src/apps/drama/lib/toolConfigs.ts`
- `src/apps/drama/lib/canvasCardSchema.ts`
- `src/apps/drama/lib/imageGen.ts`
- `src/apps/drama/lib/builderHandlers.ts`
