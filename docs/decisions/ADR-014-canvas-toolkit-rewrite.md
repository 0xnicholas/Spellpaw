# ADR-014: canvasToolkit Actions Canvas-Based Rewrite

- **Status:** Proposed
- **Date:** 2026-06-27
- **Supersedes:** None (extends ADR-006 canvas-engine and ADR-010 generate-storyboard)
- **Related ADRs:** ADR-006 (Canvas Engine), ADR-010 (Generate Storyboard)

## Context

Phase 4 的 canvas-first 重构删除了整个 `TreeNode` 体系（见 `src/apps/drama/types/index.ts` 第 12 行注释："Tree removed — Phase 4 canvas-first architecture deletes TreeNode entirely"）。但 `src/apps/drama/lib/canvasToolkit/actions/` 下 4 个 actions 和 1 个 helper **没有同步重构**：

| 文件 | 当前状态 | 测试期望 |
|------|----------|----------|
| `generateAsset.ts` | 写死 `const tree = null as any` 永远早退 | "无 provider 返回错误" |
| `editAsset.ts` | 同上 | 同上 |
| `applyStyle.ts` | 同上 | 同上 |
| `batchApplyStyle.ts` | 同上 + `findNode(tree, ...)` undefined 引用 | 同上 |
| `shared.ts → buildDefaultPrompt` | 签名 `(card: CanvasNode)`，函数体用 `node.metadata.*` (TreeNode) | (无直接测试) |
| `generateVariants.ts` | **已** canvas-based，但 line 99 `title = node ?` 引用了未定义 `node` | "无 provider 返回错误" |

测试现状（`npm test`）：5 个 test 文件 / 5 个"无 provider"测试全部失败 — 实际拿到 "当前没有打开的项目"，期望含 "provider"。

**根因**：
1. 4 个 actions 在 Phase 4 之前依赖 `findNode(tree, nodeId)` 拿 scene/shot 节点
2. Phase 4 把 tree 删了，但 actions 只把 `tree` 替换成 `null as any` 占位，没真的 canvas 化
3. 5 个 test 文件在 actions 写好"无 provider 早退"路径后就再没动过 — 但代码路径被 `if (!tree)` 拦截

**意外发现**：
- `tsc --noEmit` 对 `useProjectStore` / `findNode` undefined 不报错，因为 `tsconfig.app.json` 没有 `strict: true`（无 `noImplicitAny`）
- 运行时这些调用实际抛 `ReferenceError`，但因为 `providerRegistry.select` 之前早退，从未被执行过

## Decision

**完全重写 4 个 actions + 修复 1 个 helper + 修复 1 个 broken 变体实现，所有基于 canvas-first 数据模型。**

### 设计原则

1. **以画布为唯一数据源** — 不再查 `tree` / `useProjectStore.getState().projects[].tree`
2. **API 用 `cardId` 而非 `nodeId`** — 与 `useCanvasStore` / `CanvasNode.id` 对齐
3. **保持向后兼容** — `nodeId` 作为 `cardId` 的 alias（因为 toolRouter/generation.ts 的 LLM tool 描述可能仍提 nodeId）
4. **复用 `generateVariants` 已成功的 pattern** — 它已经 canvas-based，是模板

### 目标数据流

```
用户操作（AI tool call 或 UI）
    │
    ▼
action({ cardId?, prompt?, provider?, ... })
    │
    ├─ 1. 校验当前 project（getCurrentProjectId）
    ├─ 2. 拿 source card（getCurrentNodes().find(n => n.id === cardId)）
    ├─ 3. 拼 prompt（buildDefaultPrompt(card) 或 params.prompt）
    ├─ 4. providerRegistry.select(input, provider)  ← 早退点：返回 "no provider" 错误
    ├─ 5. provider.submit(input) → GenerationTask
    ├─ 6. addEnrichedCard(cardType, { title, description, generatedPrompt, ... })
    └─ 7. task.status === "done" → updateCardThumbnail(cardId, resultUrl)
                                === "pending" → startPolling(taskId, provider, cardId)
    │
    ▼
ToolkitResult { success, message, cardIds, taskId? }
```

### 每个文件的修改

#### 1. `shared.ts → buildDefaultPrompt`

**问题**：签名是 `CanvasNode`，函数体用 `node.metadata.description` / `node.shotType` 等 TreeNode 字段。

**修复**：
```typescript
import type { CanvasNode, CardMetadata } from "@drama/types";

export function buildDefaultPrompt(card: CanvasNode): string {
  const d = card.data;
  const m: CardMetadata = d.metadata ?? {};
  const parts: string[] = [
    "Cinematic storyboard frame for a short drama scene.",
  ];
  if (d.description) parts.push(d.description);
  parts.push(`Scene: "${d.title}".`);
  // CardMetadata 字段
  if (m.shotType) parts.push(`Shot type: ${m.shotType}.`);
  if (m.location) parts.push(`Location: ${m.location}.`);
  if (m.timeOfDay) parts.push(`Time of day: ${m.timeOfDay}.`);
  if (m.cameraMovement) parts.push(`Camera movement: ${m.cameraMovement}.`);
  // CanvasNodeData 顶层 legacy 字段（与 CardMetadata 重复，保留兼容）
  if (d.shotType) parts.push(`Shot type: ${d.shotType}.`);
  parts.push(
    "Vertical 9:16 aspect ratio, cinematic lighting, photorealistic, unwatermarked.",
  );
  return parts.join(" ");
}
```

**注意**：移除原 `m.visualStyle` 引用（CardMetadata 没这个字段）。

#### 2. `generateVariants.ts` — 修复 `node` undefined

**问题**：line 99 `title = node ? ... : ...` 中 `node` 未定义（应改用 `card`）。

**修复**：3 行改：`const title = card ? ... : ...`

#### 3. `generateAsset.ts`

**接口变更**：
- `nodeId?: string` → `cardId?: string`（保留 `nodeId` 作为 alias）

**重写核心**：
```typescript
export async function generateAsset(params: GenerateAssetParams): Promise<ToolkitResult> {
  const projectId = useProjectStore.getState().currentProjectId;
  if (!projectId) {
    return { success: false, message: "当前没有打开的项目", retryable: false };
  }

  const targetCardId = params.cardId ?? params.nodeId;
  let card: CanvasNode | null = null;
  if (targetCardId) {
    card = useCanvasStore.getState().getCurrentNodes().find(n => n.id === targetCardId) ?? null;
    if (!card) {
      return { success: false, message: `未找到卡片: ${targetCardId}`, retryable: false };
    }
  }

  if (params.mediaType !== "image" && params.mediaType !== "video") {
    return { success: false, message: `不支持的 mediaType: ${params.mediaType}`, retryable: false };
  }

  if (!card && !params.prompt) {
    return { success: false, message: "未选择卡片时，请提供生成提示词", retryable: false };
  }

  const capability: Capability = params.mediaType === "video" ? "text2video" : "text2image";
  const batchCount = Math.max(1, Math.floor(params.count ?? 1));
  const input: GenerationInput = {
    type: params.mediaType,
    capability,
    prompt: params.prompt ?? buildDefaultPrompt(card!),
    batchCount,
  };

  const selection = providerRegistry.select(input, params.provider);
  if ("error" in selection) {
    return { success: false, message: selection.error, retryable: false };  // ← 测试命中点
  }
  // ... provider.submit / addEnrichedCard / startPolling 循环
}
```

**`addEnrichedCard` 调用**：`title` 用 `card?.title ?? input.prompt.slice(0, 20)`。

#### 4. `editAsset.ts`

**接口**：`cardId: string`（保留）。

**重写核心**：移除 `tree = null` 和 `linkedNode` 引用；`linkedTreeNodeId` 仅作 title 修饰来源：
```typescript
const linkedCardTitle = sourceCard.data.linkedCardIds?.[0]
  ? useCanvasStore.getState().getCurrentNodes().find(n => n.id === sourceCard.data.linkedCardIds![0])?.data.title
  : null;

const title = linkedCardTitle
  ? `${linkedCardTitle}（编辑版）`
  : `${sourceCard.data.title}（编辑版）`;
```

（`linkedTreeNodeId` 字段类型上仍存在，但 canvas 时代没消费方 — 直接从 source card 的 `linkedCardIds[0]` 拿更合理）

#### 5. `applyStyle.ts`

**接口**：`sourceCardId: string, stylePrompt? | styleCardId?`（保留）。

**重写核心**：与 `editAsset` 同 pattern — 移除 `tree` 死代码 + `linkedNode` 引用。

#### 6. `batchApplyStyle.ts`

**接口变更**：
- `nodeIds: string[]` → `cardIds: string[]`（保留 `nodeIds` 作为 alias）

**重写核心**：
```typescript
for (const cardId of params.cardIds) {
  const card = useCanvasStore.getState().getCurrentNodes().find(n => n.id === cardId);
  if (!card) {
    errors.push(`未找到卡片: ${cardId}`);
    continue;
  }

  // 用 card.data 拼 basePrompt
  const basePrompt = card.data.generatedPrompt
    ?? card.data.description
    ?? card.data.title;
  const styledPrompt = `Style: ${params.stylePrompt}.\n\n${basePrompt}`;

  // ... provider.submit / addEnrichedCard / startPolling
}
```

**移除**：`buildDefaultPrompt(node)` 调用（依赖 `node.metadata.*` TreeNode 字段，不适合 canvas card）。

### 测试策略

**5 个 test 文件** — 现有"无 provider"测试在 rewrite 后**自动可过**（因为 actions 走到 `providerRegistry.select` 后才会出错）。

**新增测试**（每个 action 1-2 个 happy path）：
- mock 一个 GenerationProvider（`providerRegistry.register`）
- 准备 source canvas card
- 调用 action，断言 `result.success === true` + `result.cardIds.length === 1` + 画布新增节点

**不需要新增 test runner 配置**：现有 `setup.ts` + `fake-indexeddb/auto` 已就绪。

### Call Sites 同步

`src/apps/drama/stores/toolRouter/generation.ts` 的 `generate_storyboard` 是 tree-based 入口，需要单独 rewrite（不在本 ADR 范围）。但 `toolRouter` 的 tool 描述（LLM 看的）需要更新：

```typescript
// 旧
description: "...场景节点..."
// 新
description: "...画布上的 storyboard 卡片 (storyline / moodboard / videoClip)..."
```

## Consequences

**Pros:**
- 让 4 个 actions 真正可用（之前所有调用都会得到"没有打开项目"）
- 5 个 broken test 全部恢复 passing
- 修复 `buildDefaultPrompt` 让 `batchApplyStyle` / `generateVariants` 的 prompt 拼接正确
- 数据流统一到 canvas store — 不再是 tree + canvas 双数据源
- 删除 `findNode(tree, ...)` 死代码引用（之前运行时 ReferenceError 风险）

**Cons:**
- `nodeId` → `cardId` API 改名 — 任何外部调用方需更新
- `batchApplyStyle` 语义从"对 scene 树节点应用风格"变成"对画布卡片应用风格"
- `linkedTreeNodeId` 字段从 source card 读取的兼容路径保留，但新生成的卡片不再设置此字段
- 实施需同步更新 `toolRouter/generation.ts` 描述 + 任何 store/UI 调用方

**Mitigations:**
- 保留 `nodeId` / `nodeIds` 作为 alias，文档明示"deprecated, use cardId"
- 增量 PR：先 1 个 action（如 `generateVariants` 修复）→ 验证 pattern → 复制到其他 3 个
- 在 `applyStyle` / `editAsset` 中保留 `linkedTreeNodeId` 读取（向后兼容）

## Implementation Steps

按依赖顺序：

1. **Phase A — 基础设施**
   - 修 `shared.ts → buildDefaultPrompt`（CanvasNode 字段 + CardMetadata）
   - 修 `generateVariants.ts` `node` undefined

2. **Phase B — 单 action 重写**（每个独立 PR）
   - `generateAsset.ts`
   - `editAsset.ts`
   - `applyStyle.ts`
   - `batchApplyStyle.ts`

3. **Phase C — 集成**
   - 更新 `toolRouter/generation.ts` tool 描述
   - 检查所有 `import { generateAsset }` 等的调用方，更新参数名
   - 跑完整 `npm test` + `npm run lint` 验证

4. **Phase D — 可选**（不在本 ADR 必需）
   - 重写 `toolRouter/generation.ts → generate_storyboard`（独立的 canvas-based AI 分镜）
   - 重新设计 `buildDefaultPrompt`（是否应支持 CardChild inline elements）
   - 加 4 个 actions 的 happy path 测试

## Risks & Open Questions

- **Q1**: `applyStyle` 在 source card **无 thumbnail** 时如何处理？当前是 `referenceUrl: sourceCard.data.thumbnail`（可能 undefined） — provider 决定是否支持。
- **Q2**: 4 个 actions 当前都用 `addEnrichedCard("art", ...)` — 视频生成应不应该用 `videoClip`？`generateAsset` 的 `cardType` 参数已支持但 `editAsset` / `applyStyle` 没有。
- **Q3**: `linkedTreeNodeId` 字段从 `CanvasNodeData` 中删除是否安全？一些 UI 可能还在读。
- **Q4**: 失败时是否要 delete 已创建的 draft card？当前 `addEnrichedCard` 在 `provider.submit` 失败前创建，失败时留 orphan。

## Related Code

- `src/apps/drama/lib/canvasToolkit/shared.ts` — `buildDefaultPrompt` (Phase A)
- `src/apps/drama/lib/canvasToolkit/actions/generateVariants.ts` (Phase A)
- `src/apps/drama/lib/canvasToolkit/actions/generateAsset.ts` (Phase B.1)
- `src/apps/drama/lib/canvasToolkit/actions/editAsset.ts` (Phase B.2)
- `src/apps/drama/lib/canvasToolkit/actions/applyStyle.ts` (Phase B.3)
- `src/apps/drama/lib/canvasToolkit/actions/batchApplyStyle.ts` (Phase B.4)
- `src/apps/drama/stores/toolRouter/generation.ts` (Phase C)
- `src/apps/drama/stores/canvasStore.ts` (只读 — 提供 `getCurrentNodes`, `getCurrentEdges`, `addNode`, `updateNodeData`)
- `src/apps/drama/types/index.ts` (只读 — `CanvasNode`, `CanvasNodeData`, `CardMetadata`)
- `src/apps/drama/stores/toolRouter/cards.ts` (只读 — `addEnrichedCard`)

## Verification

实施完成后应验证：
- `npm run lint` 仍 0 problems
- `npm test` 至少新增 5 passing（"无 provider"测试），目标 424 → 429 passing
- 手动：在 dev server 打开画布 → 选 card → trigger generate/edit/apply-style → 验证 card 创建
- 手动：故意不配置 provider → 验证错误 message 含 "provider"
