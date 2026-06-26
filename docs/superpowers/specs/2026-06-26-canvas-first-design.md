# Canvas-First Architecture 设计

**Status**: Draft
**Date**: 2026-06-26
**Scope**: Spellpaw Drama Studio — Phase 4：彻底删除幽灵树 + 模板改写画布 + LLM 画布能力扩展

---

## 1. 背景与目标

### 1.1 现状（Phase 3 留下的"幽灵树"）

`AGENTS.md` 描述的是 Phase 1 / 2 状态，但**当前代码与文档不一致**：

**UI 层已经被砍**：
- `src/apps/drama/components/tree-view/` 目录不存在
- `WorkspaceLayout.tsx` 三列布局不再被引用 —— 当前 `WorkspacePage` 是 CanvasPanel 全屏 + ChatPanel 浮层
- `DetailPanel.tsx` 只剩画布卡片字段编辑，没有树结构编辑
- 没有 TreeView / ProjectOutline / Outliner 等任何树渲染组件

**数据层 + LLM 层仍在用**（7 处遗留）：
1. `TreeNode` 类型 + `projectStore.trees` 字段 + 6 个 tree CRUD action
2. `toolRouter/tree.ts` + 7 个 tree tool handler（spellpaw_add_node / update_node / delete_node / move_node / get_tree / get_subtree / apply_template）
3. `applyTemplateCore` 创建树节点
4. `treeUtils.ts` / `treeDiff.ts` / `projectAnalysis.ts`（节奏分析依赖 tree）
5. `migrateTreeToCards.ts`（树 → 画布迁移）
6. `SnapshotModal.tsx` 从 tree 创建快照
7. `systemPrompt.ts` 渲染 `treeText`（虽然 `useCopilotSSE.ts` 实际传的是 `canvasText`，参数名遗留）

**结果**：
- 用户看不到树（UI 无入口）
- LLM 改树之后画布不更新（除非 migrateTreeToCards）
- 节奏分析依赖树但树无数据时为空
- 模板应用创建树，但用户看到的是空画布
- `linkedTreeNodeId` 已 deprecated（types/index.ts:119 写明"deprecated — use linkedCardIds"）

### 1.2 目标

| # | 目标 | 成功标准 |
|---|------|---------|
| 1 | 彻底删除树（数据 + tool + UI 入口） | `TreeNode` / `projectStore.trees` / 6 个 tree action / 7 个 tree tool 全部从代码库移除 |
| 2 | 模板应用改写为画布 | `applyTemplateCore` → `applyTemplateToCanvas`，template 直接生成画布卡 |
| 3 | 节奏分析改写为画布 | `projectAnalysis.ts` 基于 CanvasNode 的位置、类型、CardChild 计算 |
| 4 | LLM 画布能力扩展 | 7 个专用 add tool + 3 个 batch tool + 结构化返回 + cardId 校验前置 |
| 5 | systemPrompt 完全画布中心 | 删除 tree 段；参数 `treeText` 改名 `canvasText` |
| 6 | 老数据清理 | trees 字段直接丢弃；IDB schema bump 清空旧缓存 |
| 7 | 现有测试不回归 | 老 tree 相关测试删除；新增 canvas 相关测试覆盖新逻辑 |

### 1.3 不在本 spec 范围

- **路线 2**（计划模式 + 撤销 / 回滚）→ 留 Phase 4.5
- **路线 3**（流式进度 + 信任工程）→ 留 Phase 4.5
- UI 层 scene card "展开镜头列表"渲染 → 数据层先支持，UI 后续
- CardCopilotPopover / NodeAIActions 中可能引用 tree action 的代码 → 本 spec 范围内清理，但**不重构**这些组件本身
- Spellpaw Server 端 schema 同步更新 → 由 server 仓库对应 PR 处理，本 spec 只列字段清单
- 老数据迁移（用户已确认直接丢）→ 不实现

---

## 2. 设计决策（已确认）

| 维度 | 决策 | 理由 |
|------|------|------|
| 树的命运 | **彻底删除** | UI 层已无入口；保留只会让数据模型/工具表继续分裂 |
| 历史数据 | **直接丢** | 本地 SPA 无用户数据保护责任；删除 trees 字段后 IDB 清空 |
| 阶段划分 | **一气吃下**（12 天） | A（删树）+ B（能力扩展）合并；避免中间状态代码不可用 |
| Shot 存储 | **画布内子项（CardChild）** | Scene card 的 `children?: CardChild[]`；shot 不占画布节点位 |
| Template 转换 | **acts→storyline / scenes→sceneCard / shots→CardChild** | 复用现有 CanvasNodeType；最小改动 |
| 7 个 add tool 拆分 | **按现有 7 个 type 拆** | storyline / moodboard / videoClip / asset / task / art / character 各 4-6 字段 |
| 批操作覆盖 | **batch_update / batch_delete / batch_add**（3 个） | LLM 循环调用 N 次太慢，原生批操作一次到位 |
| 返回格式 | **单行 JSON 字符串** | LLM 看到 string；ChatPanel 解析后渲染结构化 UI |
| cardId 校验范围 | **仅 cardId**（画布卡片 ID） | nodeId 在删树后不存在；linkedTreeNodeId deprecated；范围聚焦 |
| 旧 tool 兼容 | **保留为 alias，内部转调新 tool** | 不破坏老 LLM 调用；新增能力渐进可用 |
| 改造方式 | **全量重写，不分批发布** | 一次性 PR，避免中间状态破坏 LLM 协作 |
| IDB schema | **bump version + 清空旧缓存** | zustand persist 提供 `version` 字段；老版本触发 `migrate` 清空 trees |

---

## 3. 架构总览

### 3.1 删除清单（不留痕迹）

**类型 / 数据层**：
- `TreeNode` 类型（types/index.ts）
- `projectStore.trees: Record<string, TreeNode>`
- 6 个 action：`addTreeNode` / `updateTreeNode` / `deleteTreeNode` / `moveTreeNode` / `toggleExpanded` / `selectNode` / `getSelectedNodePath`
- `getCurrentTree()` getter
- `selectedNodeId` 字段
- `findNodePath` helper
- `linkedTreeNodeId?: string` 字段（deprecated，删除）

**Tool 层**：
- 整个 `src/apps/drama/stores/toolRouter/tree.ts`
- 7 个 tree tool config：`spellpaw_add_node` / `spellpaw_update_node` / `spellpaw_delete_node` / `spellpaw_move_node` / `spellpaw_get_tree` / `spellpaw_get_subtree` / `spellpaw_apply_template`

**业务逻辑层**：
- `src/apps/drama/lib/treeUtils.ts`（+ 测试）
- `src/apps/drama/lib/treeDiff.ts`（+ 测试）
- `src/apps/drama/lib/migrateTreeToCards.ts`（+ 测试）
- `applyTemplateCore` helper（重命名为 `applyTemplateToCanvas`）

**Prompt 层**：
- `systemPrompt.ts` 的 tree 段（line 124-125 等）
- `buildSystemPrompt(projectTitle, treeText, ...)` 第二参数改名为 `canvasText`

**测试 / 杂项**：
- `toolRouter.test.ts` 中 tree 相关用例
- `projectStore.test.ts` 中 tree 相关用例
- `treeUtils.test.ts` / `treeDiff.test.ts` / `migrateTreeToCards.test.ts`（3 个测试文件）
- `systemPrompt.test.ts` 中 tree 相关断言

### 3.2 新增清单

| 文件 | 用途 |
|------|------|
| `src/apps/drama/lib/toolResultFormat.ts` | JSON.stringify helper + ChatPanel 解析 helper |
| `src/apps/drama/lib/cardValidation.ts` | cardId 存在性校验 + 结构化错误返回 |

### 3.3 目标架构

```
toolRouter/
├── index.ts            # 聚合 cards/generation/analysis（无 tree）
├── types.ts            # ToolRouter + ToolResult 类型
├── cards.ts            # 7 add + 3 batch + get/update/delete + clear（重写）
├── generation.ts       # 6 个 generation tool（不变，调用方不变）
└── analysis.ts         # 5 个 analysis tool（applyTemplateCore → applyTemplateToCanvas）

lib/
├── toolResultFormat.ts         ← 新
├── cardValidation.ts           ← 新
├── projectAnalysis.ts          ← 重写为基于画布
├── systemPrompt.ts             ← 重写为纯画布中心
├── snapshot.ts（or SnapshotModal 内）  ← 从画布建快照
└── templateExportImport.ts     ← 内部数据不变（acts/scenes），转换层改

types/index.ts
├── ✗ TreeNode（删）
├── ✓ CanvasNode（保留，含 children?: CardChild[]）
├── ✓ CardChild（保留）
├── ✓ NarrativeTemplate（保留，structure.acts/scenes 不变）
└── ✗ linkedTreeNodeId（删）

projectStore.ts
├── ✗ trees 字段
├── ✗ 6 个 tree action
├── ✗ selectedNodeId
├── ✗ getCurrentTree / getSelectedNodePath
├── ✓ projects 字段
├── ✓ setLockedStyle / clearLockedStyle / getLockedStyle（保留，风格锁机制独立于树）
└── ✓ 其他 CRUD（createProject / deleteProject / updateProject / deduplicateProjects）
```

### 3.4 数据流（删除树后 LLM → 画布）

```
LLM tool_call(spellpaw_add_art_card, {title: "雨夜小巷"})
  ↓
toolServer WS 转发
  ↓
toolRouter.cards.add_art_card({title: "雨夜小巷"})
  ├─ 校验 cardType 必填 (schema 已 enforce)
  ├─ 计算定位（基于现有画布卡片）
  ├─ useCanvasStore.addCard() → 自动 push 到 server
  └─ 返回 JSON 字符串:
     {"success":true,"affectedCardIds":["canvas_xyz"],"affectedTreeNodeIds":[],"summary":"已添加 art 卡片「雨夜小巷」"}
  ↓
ChatPanel 收到 tool_call_done
  ├─ JSON.parse(result) → 成功 → 渲染 affectedCardIds 缩略图
  ├─ chatStore.endToolCall('success')
  └─ triggerHighlight([affectedCardIds]) → 画布卡片闪一下
```

### 3.5 数据流（applyTemplateToCanvas）

```
LLM tool_call(spellpaw_apply_template, {templateId: "action-chase"})
  ↓
toolRouter.analysis.apply_template (重写)
  ├─ useCustomTemplateStore.getTemplateById(templateId) → NarrativeTemplate
  ├─ 遍历 template.structure.acts[]
  │   └─ 对每个 act：
  │       ├─ addEnrichedCard('storyline', {title: act.title, type: 'act', ...})
  │       └─ 记录 act cardId
  ├─ 遍历 act.scenes[]
  │   └─ 对每个 scene：
  │       ├─ addEnrichedCard('sceneCard', {title: scene.title, type: 'scene', ...})
  │       ├─ 记录 scene cardId
  │       └─ 遍历 scene.suggestedShotTypes → 生成 CardChild[]
  └─ 返回 JSON:
     {"success":true,"affectedCardIds":[...],"summary":"已应用模板「动作追逐短片」：3 幕 8 场景"}
```

---

## 4. 详细设计

### 4.1 7 个专用 add tool

| Tool 名 | type | 必填字段 | 可选字段 |
|---|---|---|---|
| `spellpaw_add_storyline_card` | storyline | title | description, location, timeOfDay, duration |
| `spellpaw_add_moodboard_card` | moodboard | title | description, colors[], styleRef |
| `spellpaw_add_video_clip_card` | videoClip | title | description, source(ai/upload), duration |
| `spellpaw_add_asset_card` | asset | title | description, assetType, url, tags[] |
| `spellpaw_add_task_card` | task | title | description, taskType, targetCardId, dueDate |
| `spellpaw_add_art_card` | art | title | description, thumbnail, generatedPrompt |
| `spellpaw_add_character_card` | character | title | description, role, traits[], linkedCardIds[] |

每个 tool 在 `toolConfigs.ts` 中独立 entry，`type` 字段在 schema 中隐含（不再让 LLM 选）。

**handler 实现模式**：

```typescript
// src/apps/drama/stores/toolRouter/cards.ts
async function addTypedCard(
  cardType: CanvasNodeType,
  data: Record<string, unknown>,
  position?: { x: number; y: number },
): Promise<ToolResult> {
  const validation = validateCanvasCardPayload({ cardType, data, position });
  if (!validation.valid) {
    return {
      success: false,
      error: 'validation_failed',
      suggestion: validation.error,
      summary: validation.error!,
    };
  }
  const normalized = normalizeCardData(cardType, data);
  const card = await addCanvasCardHandler(cardType, normalized, { position });
  return {
    success: true,
    affectedCardIds: [card.id],
    summary: `已添加 ${cardType} 卡片「${card.data.title}」`,
  };
}

export const cardHandlers: ToolRouter = {
  add_storyline_card: (params) => addTypedCard('storyline', params),
  add_moodboard_card: (params) => addTypedCard('moodboard', params),
  // ... 7 个 add tool
  
  add_card: (params) => {                          // alias
    const type = (params.type as CanvasNodeType) || 'storyline';
    return addTypedCard(type, params);
  },
};
```

### 4.2 3 个 batch tool

```typescript
batch_update_cards({
  updates: [
    { cardId: "card_1", data: { status: "done" } },
    { cardId: "card_2", data: { status: "done" } },
  ]
})
→ 部分失败策略：返回每条的 success/fail，调用方看 affectedCardIds + errors
→ {"success":true,"affectedCardIds":["card_1"],"errors":[{"cardId":"card_2","error":"card_not_found"}],"summary":"更新 1 张成功，1 张失败"}

batch_delete_cards({ cardIds: ["card_1", "card_2", "card_3"] })
→ 原子：要么全删，要么全不删
→ 先校验所有 cardId 存在 → 校验通过后单次 setState 删除 → triggerPushNow()
→ {"success":true,"affectedCardIds":["card_1","card_2","card_3"],"summary":"已批量删除 3 张卡片"}

batch_add_cards({ cards: [{ cardType: "shot", data: {...} }, ...] })
→ 一次性创建多张同类卡片，自动错开位置（避免重叠）
→ {"success":true,"affectedCardIds":[...],"summary":"已批量添加 5 张 shot 卡片"}
```

### 4.3 cardId 校验前置

```typescript
// src/apps/drama/lib/cardValidation.ts
export function findCardOrError(cardId: string): 
  | { ok: true; card: CanvasNode }
  | { ok: false; error: ToolResult } 
{
  const cards = useCanvasStore.getState().getCurrentNodes();
  const card = cards.find((c) => c.id === cardId);
  if (!card) {
    return {
      ok: false,
      error: {
        success: false,
        error: 'card_not_found',
        cardId,
        suggestion: 'call spellpaw_get_canvas first to get valid card ids',
        summary: `未找到卡片 ${cardId}`,
      },
    };
  }
  return { ok: true, card };
}
```

所有需要 cardId 的 tool handler（update / delete / apply_style / batch_*）入口调用 `findCardOrError`，失败时立即返回 error 结果。

### 4.4 结构化返回格式

**ToolResult 类型**：

```typescript
// src/apps/drama/stores/toolRouter/types.ts
export interface ToolResult {
  success: boolean;
  affectedCardIds?: string[];
  summary: string;
  // 错误时
  error?: 'card_not_found' | 'validation_failed' | 'unknown_card_type' | 'no_project_selected';
  cardId?: string;                    // 失败时定位
  errors?: Array<{ cardId: string; error: string }>;  // batch 部分失败
  suggestion?: string;                // 引导 LLM 下一步
}

// handler 签名不变
export type ToolHandler<P extends ToolParams = ToolParams> = 
  (params: P) => Promise<string>;

// 每个 handler 内部 JSON.stringify(ToolResult) 返回
```

**ChatPanel 解析策略**：

```typescript
// src/apps/drama/lib/toolResultFormat.ts
export function parseToolResult(raw: string): 
  | { parsed: true; result: ToolResult } 
  | { parsed: false; raw: string } 
{
  try {
    const obj = JSON.parse(raw);
    if (typeof obj.success === 'boolean' && typeof obj.summary === 'string') {
      return { parsed: true, result: obj as ToolResult };
    }
  } catch {}
  return { parsed: false, raw };
}
```

`ToolCallDetails.tsx` 用 `parseToolResult` 渲染：parsed=true 时显示结构化 UI（缩略图 + 错误高亮），parsed=false 时 fallback 原始文本。

### 4.5 alias 路由

| 旧 tool | 转发到 |
|---|---|
| `add_card` | 根据 `params.type` 路由到 7 个 add tool 之一 |
| `update_card` | 内部调用 `updateTypedCard`（行为不变，加校验 + 结构化返回） |
| `delete_card` | 内部调用 `deleteTypedCard`（行为不变，加校验 + 结构化返回） |

`clear_canvas` 不再走 alias——直接保留独立 handler，因为它的"原子清空 + triggerPushNow"语义与 batch_delete 不同。

### 4.6 applyTemplateToCanvas 重写

```typescript
// src/apps/drama/lib/applyTemplateToCanvas.ts（重命名 + 重写）
export async function applyTemplateToCanvas(
  templateId: string,
  store: ProjectStore,
): Promise<ToolResult> {
  const template = useCustomTemplateStore.getState().getTemplateById(templateId);
  if (!template) {
    return { success: false, error: 'validation_failed', suggestion: `unknown template: ${templateId}`, summary: `模板 ${templateId} 不存在` };
  }
  
  const allAffected: string[] = [];
  for (const [actIdx, act] of template.structure.acts.entries()) {
    const actCard = await addEnrichedCard('storyline', {
      title: act.title,
      description: act.description,
      type: 'act',
      status: 'draft',
    }, { x: 50 + actIdx * 420, y: 50 });
    allAffected.push(actCard.id);
    
    for (const [sceneIdx, scene] of act.scenes.entries()) {
      const shotChildren: CardChild[] = (scene.suggestedShotTypes ?? []).map((st, i) => ({
        id: generateId('shot_'),
        type: 'shot',
        title: `${scene.title} 镜头 ${i + 1}`,
        data: { shotType: st, duration: scene.metadata?.duration ? scene.metadata.duration / scene.suggestedShotTypes!.length : undefined },
      }));
      
      const sceneCard = await addEnrichedCard('sceneCard', {
        title: scene.title,
        description: scene.description,
        location: scene.metadata?.location,
        timeOfDay: scene.metadata?.timeOfDay,
        duration: scene.metadata?.duration,
        children: shotChildren,
      }, { x: 50 + actIdx * 420, y: 300 + sceneIdx * 280 });
      allAffected.push(sceneCard.id);
    }
  }
  
  return {
    success: true,
    affectedCardIds: allAffected,
    summary: `已应用模板「${template.name}」：${template.structure.acts.length} 幕 ${allAffected.length - template.structure.acts.length} 场景`,
  };
}
```

`template.structure.acts[].scenes[].suggestedShotTypes` 数组展开为 CardChild。

### 4.7 projectAnalysis 重写

`projectAnalysis.ts` 当前依赖 tree 结构。改为基于 CanvasNode 推断：

```typescript
// 新接口（基于画布）
export interface CanvasPacingReport {
  totalDuration: number;
  cardCount: number;
  sceneCount: number;
  shotCount: number;            // = CardChild 总数
  avgSceneDuration: number;
  pacingCV: number;             // coefficient of variation
  issues: PacingIssue[];
  suggestions: string[];
}

export function generatePacingReport(): CanvasPacingReport {
  const cards = useCanvasStore.getState().getCurrentNodes();
  const scenes = cards.filter(c => c.type === 'sceneCard');
  const shots = scenes.flatMap(s => s.data.children ?? []);
  
  // ... CV 计算、issue detection 与原逻辑相同，输入换成画布卡片
}
```

`generatePacingReport` / `analyzeStructure` / `matchTemplate` / `optimizePacing` 4 个 analysis tool 全部改为基于画布。

### 4.8 SnapshotModal 重写

```typescript
// src/apps/drama/components/modals/SnapshotModal.tsx
export function SnapshotModal({ open, onClose }: ...) {
  const cards = useCanvasStore((s) => s.getCurrentNodes());
  const createSnapshot = useProjectStore((s) => s.createSnapshot);  // 新增
  // createSnapshot 序列化 cards + project metadata，不依赖 trees
}
```

`projectSnapshot.ts` 同步改：序列化字段改为 `cards: CanvasNode[]` + `projectMeta`，不再包含 `tree`。

### 4.9 systemPrompt 重写

```typescript
// src/apps/drama/lib/systemPrompt.ts
export function buildSystemPrompt(
  projectTitle: string,
  canvasText: string,           // ← 重命名（原 treeText）
  templateCategory?: string,
): string {
  return [
    `你是 SpellPaw 的 AI 叙事架构师。`,
    `SpellPaw 是一个无限画布创作工具，所有内容以 CanvasCard 形式存在。`,
    ``,
    `## Tools (priority order)`,
    ``,
    `### 1. Canvas cards — primary`,
    `add_<type>_card (7 种) · batch_add_cards · update_card · batch_update_cards · delete_card · batch_delete_cards · get_canvas · clear_canvas`,
    // ... 不再有 "### 2. Tree nodes" 段
    ``,
    `## 当前项目`,
    `- 名称：《${projectTitle}》`,
    ``,
    `## 画布内容`,
    canvasText || "(画布为空)",
    ``,
    // ... 工具签名参考段删 tree 工具
  ].join('\n');
}
```

### 4.10 类型清理

```typescript
// src/apps/drama/types/index.ts
// 删除：
- export interface TreeNode { ... }
- export interface TreeNodeMetadata { ... }

// 修改：
- export interface CanvasNode {
-   ...rest,
-   children?: CardChild[];     // 保留
-   linkedCardIds?: string[];   // 保留
-   linkedTreeNodeId?: string;  // ✗ 删除（deprecated）
- }
```

### 4.11 IDB Schema 处理

`projectStore.ts` 用 `zustand/middleware` 的 `persist`：

```typescript
export const useProjectStore = create<ProjectState>()(
  persist(
    (set, get) => ({ ... }),
    {
      name: 'spellpaw-project-store',
      version: 3,                        // ← bump from current 2 → 3
      storage: createIDBStorage(),
      migrate: (persistedState, version) => {
        if (version < 3) {
          // 老版本：清空 trees 字段
          return { 
            ...(persistedState as object),
            trees: undefined,             // 强制删除
            selectedNodeId: undefined,
          };
        }
        return persistedState;
      },
      partialize: (state) => ({ 
        projects: state.projects,
        // 不再 partialize trees
      }),
    }
  )
);
```

---

## 5. 文件改动清单

### 5.1 删除（4 个文件 + 多个测试）

```
src/apps/drama/stores/toolRouter/tree.ts        ✗
src/apps/drama/lib/treeUtils.ts                 ✗ (+ treeUtils.test.ts)
src/apps/drama/lib/treeDiff.ts                  ✗ (+ treeDiff.test.ts)
src/apps/drama/lib/migrateTreeToCards.ts        ✗ (+ migrateTreeToCards.test.ts)
```

### 5.2 新建（2 个文件）

```
src/apps/drama/lib/toolResultFormat.ts          ✓
src/apps/drama/lib/cardValidation.ts            ✓
```

### 5.3 重写（6 个文件）

```
src/apps/drama/lib/projectAnalysis.ts           ← 基于画布
src/apps/drama/stores/toolRouter/analysis.ts    ← applyTemplateToCanvas
src/apps/drama/lib/systemPrompt.ts              ← 纯画布 + canvasText
src/apps/drama/lib/toolConfigs.ts               ← 删 7 加 10
src/apps/drama/components/modals/SnapshotModal.tsx  ← 画布快照
src/apps/drama/types/index.ts                   ← 删 TreeNode + linkedTreeNodeId
src/apps/drama/stores/projectStore.ts           ← 删 trees / actions / selectedNodeId
src/apps/drama/stores/toolRouter/cards.ts       ← 7 add + 3 batch + 校验 + alias + 结构化
src/apps/drama/stores/toolRouter/types.ts       ← 新增 ToolResult 类型
src/apps/drama/stores/toolRouter/index.ts       ← 去掉 treeHandlers 引用
```

### 5.4 修正（5+ 个文件）

```
src/apps/drama/hooks/useCopilotSSE.ts           ← JSON.parse + tool 名更新
src/shared/components/chat-panel/ToolCallDetails.tsx  ← JSON 解析 + affectedCardIds 渲染
src/apps/drama/hooks/useToolBridge.ts           ← 检查 tree 引用
src/apps/drama/components/copilot-lab/*          ← 检查 tree 引用
src/apps/drama/components/builder/*             ← 检查 tree 引用
src/apps/drama/components/card-detail/*         ← 检查 tree 引用
src/apps/drama/lib/proactiveInsights.ts         ← 检查 tree 引用
src/apps/drama/lib/projectSnapshot.ts           ← 序列化画布 cards
src/apps/drama/stores/chatStore.ts              ← 检查 tree 引用
src/apps/drama/stores/canvasStore.ts            ← 检查 tree 引用
src/apps/drama/lib/skills/*                     ← 检查 tree 引用（kickstart 可能用到 applyTemplateCore）
```

### 5.5 估算

- 删除：~1500-2000 行
- 改写：~500 行
- 新增：~500-800 行（含测试）

---

## 6. 测试

| 文件 | 类型 | 用例 |
|---|---|---|
| `cards.test.ts`（新建） | 单测 | 7 add tool 各 1-2 例（成功 + 校验失败）；3 batch tool（成功 + 部分失败 + 全回滚）；3 alias 路由；旧 add_card 仍可调 |
| `cardValidation.test.ts`（新建） | 单测 | 存在 / 不存在 / 跨项目；error 返回含 suggestion |
| `toolResultFormat.test.ts`（新建） | 单测 | JSON.stringify 格式；parse 成功 / 失败 fallback |
| `applyTemplateToCanvas.test.ts`（新建） | 单测 | acts / scenes / shots 三层；空 template；未知 templateId |
| `projectAnalysis.test.ts`（重写） | 单测 | 基于画布卡片的节奏分析；空画布边界 |
| `SnapshotModal.test.tsx`（新建/更新） | 组件测 | 创建 / 恢复快照，画布内容序列化 |
| `systemPrompt.test.ts`（更新） | 单测 | 无 tree 段；canvasText 渲染 |
| `toolRouter.test.ts`（删 tree 段） | 单测 | 删除 tree 相关用例 |
| `projectStore.test.ts`（删 tree 段） | 单测 | 删除 tree 相关用例；IDB migrate v2→v3 清空 trees |

---

## 7. 实施顺序（12 天）

### 阶段 A：删除幽灵树（Day 1-6）

| Day | 任务 | 提交粒度 |
|---|---|---|
| 1 | types/index.ts 删 TreeNode + linkedTreeNodeId；projectStore 删 trees / 6 action / selectedNodeId / getCurrentTree | commit 1 |
| 2 | toolRouter/tree.ts 删除；toolConfigs.ts 删 7 个 tree tool；treeUtils/treeDiff/migrateTreeToCards 4 文件删除（含测试） | commit 2 |
| 3 | applyTemplateCore → applyTemplateToCanvas 重写 + 测试 + analysis.ts 调用替换 | commit 3 |
| 4 | projectAnalysis 重写基于画布 + 测试 | commit 4 |
| 5 | SnapshotModal 重写画布快照 + projectSnapshot.ts 序列化 | commit 5 |
| 6 | systemPrompt 重写纯画布 + canvasText 重命名 + IDB schema bump v3 | commit 6 |

### 阶段 B：能力扩展（Day 7-12）

| Day | 任务 | 提交粒度 |
|---|---|---|
| 7 | types.ts 新增 ToolResult；toolResultFormat.ts；cardValidation.ts | commit 7 |
| 8 | cards.ts 重写：7 个 add handler + 校验集成 + 结构化返回 | commit 8 |
| 9 | cards.ts 扩展：3 个 batch handler + alias 路由（add_card / update_card / delete_card） | commit 9 |
| 10 | toolConfigs.ts 加 10 个新 tool + 删 7 个 tree tool（早删过，此处确认）+ useCopilotSSE JSON.parse | commit 10 |
| 11 | ToolCallDetails.tsx 升级 JSON 渲染 + 全链路回归测试 | commit 11 |
| 12 | 测试补全 + 老测试清理 + Playwright 端到端冒烟（如果有） | commit 12 |

每个 commit 后跑 `npm test` + `npm run lint`，确保绿灯才进下一步。

---

## 8. 兼容性 / 风险

| 维度 | 风险 | 缓解 |
|---|---|---|
| LLM 行为变化 | 删 7 个 tree tool 后，LLM 失去直接改树能力 | systemPrompt 全面重写引导 LLM 走画布 tool；alias 路由保留向后兼容 |
| 老用户 trees 数据 | 项目中残留 trees 字段 | IDB schema bump v3 + migrate 强制清除；用户已接受数据丢失 |
| Server 端 schema | tool registry 同步更新 | server 仓库对应 PR；本 spec 列出字段清单作为接口契约 |
| 模板数据结构 | acts/scenes 嵌套结构保留，但不再映射到 tree | applyTemplateToCanvas 直接生成画布卡，模板 JSON 格式不变 |
| IDB 缓存 | 老 IDB 缓存可能保留 trees | version bump + partialize 排除 trees + migrate 清空 |
| `CardChild` 兼容性 | shot 之前是 TreeNode，现在转 CardChild；老 CardChild 字段是否够用 | CardChild 已有 `type: 'shot'` + `data: { duration, shotType, cameraMovement, dialogue }`，足够 |
| 测试删除 | 删除 4 个 tree 测试文件 | 不影响 292 个测试总数（新测试补齐） |

---

## 9. 验收标准

阶段 A 完成：
- `git grep "TreeNode\|treeHandlers\|getCurrentTree\|projectStore.trees"` 无结果（除历史文档）
- `npm test` 绿灯
- `npm run build` 通过
- Server tool registry 同步 PR 已开

阶段 B 完成：
- LLM 调用 `spellpaw_add_art_card` 等新 tool 可成功生成画布卡
- LLM 调用旧 `spellpaw_add_card` 仍可用（alias 路由）
- tool result 包含 `affectedCardIds`，画布卡片对应位置闪一下高亮
- cardId 不存在时返回 `card_not_found` 错误 + suggestion
- 292+ 测试通过，新增 30+ 测试
- Playwright e2e（如果有）通过：输入"添加一张雨夜小巷 art 卡" → 画布出现新卡 → ChatPanel ToolCallDetails 显示 affectedCardIds

---

## 10. 参考文档

- `docs/superpowers/specs/2026-06-24-tool-router-domain-split-design.md` — 当前 toolRouter 结构
- `docs/superpowers/specs/2026-06-20-ai-teammate-system-design.md` — Builder panel
- `docs/superpowers/specs/2026-06-25-card-copilot-popover-design.md` — 卡片 AI 操作 popover
- `src/apps/drama/lib/systemPrompt.ts` — 当前 system prompt（含 tree 段，待删除）
- `src/apps/drama/stores/toolRouter/cards.ts` — 当前 cards domain（待重写）

---

*最后更新：2026-06-26*