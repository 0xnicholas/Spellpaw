# Canvas-First Architecture 设计

**Status**: Draft (rev 2 — post-review)
**Date**: 2026-06-26
**Scope**: Spellpaw Drama Studio — Phase 4：彻底删除幽灵树 + 重写所有 tree-coupling 模块为画布机制 + LLM 画布能力扩展

---

## 1. 背景与目标

### 1.1 现状（Phase 3 留下的"幽灵树"）

`AGENTS.md` 描述的是 Phase 1 / 2 状态，但**当前代码与文档不一致**。

**UI 层已经被砍**：
- `src/apps/drama/components/tree-view/` 目录不存在
- `WorkspaceLayout.tsx` 三列布局不再被引用 —— 当前 `WorkspacePage` 是 CanvasPanel 全屏 + ChatPanel 浮层
- `DetailPanel.tsx` 只剩画布卡片字段编辑，没有树结构编辑

**数据层 + LLM 层仍在用**（已通过 `git grep` 验证有 71+ 处 tree 引用）：

1. `TreeNode` 类型 + `projectStore.trees` 字段 + 6 个 tree CRUD action + `selectedNodeId`
2. `toolRouter/tree.ts` + 7 个 handler（其中 `spellpaw_move_node` 只在 handler 存在，未注册到 LLM；实际 LLM 暴露 6 个）
3. `applyTemplateCore` helper，被 `analysis.ts:kickstart_project` 调用
4. `treeUtils.ts` / `treeDiff.ts` / `projectAnalysis.ts`（节奏分析）/`migrateTreeToCards.ts`
5. `SnapshotModal.tsx` 用 `diffTrees` 做对比 + `useProjectStore.trees[id]` 序列化
6. `systemPrompt.ts` 第二参数 `treeText`（虽然 `useCopilotSSE.ts:297` 实际传的是 `canvasText`，命名遗留）
7. `linkedTreeNodeId` 字段（types/index.ts:119 deprecated，但 17+ 文件仍在用）

**Tree-coupling 模块**（删树后必然崩，必须重写）：
- **风格锁**：`setLockedStyle` / `clearLockedStyle` / `getLockedStyle` 写 `tree.metadata.lockedStylePrompt`，被 `ArtCardNode` / `SceneCardNode` / `CardDetailDrawer` 通过 `linkedTreeNodeId` 调用
- **三个 skill**：`builtIn.ts` 内的 `duplicate-project-skill` / `export-storyboard-pdf-skill` / `analyze-pacing-skill` 全部读 tree
- **主动建议**：`proactiveInsights.ts` 整个模块依赖 tree
- **快照对比**：`SnapshotModal.tsx` 用 `diffTrees` 做快照对比 UI
- **PDF/Print 导出**：`exportStoryboardPDF(project, tree)` / `exportPrint.buildScriptRows(tree)` 签名含 tree
- **numbering**：`numbering.ts` 走 tree + `linkedTreeNodeId`
- **intentRouter**：`selectedNodeId` context 字段 + `linkedTreeNodeId` 路径
- **canvasToolkit actions**：`generateAsset` / `generateVariants` / `editAsset` / `applyStyle` / `batchApplyStyle` 写 `linkedTreeNodeId`
- **detailStore**：`requestFocusCanvas(linkedTreeNodeId)` + `draftFormData: Partial<TreeNode>`
- **ChatPanel.highlightAffectedCards**：通过 `linkedTreeNodeId` 反查画布卡片

### 1.2 目标

| # | 目标 | 成功标准 |
|---|------|---------|
| 1 | 彻底删除树（数据 + tool + UI 入口） | `TreeNode` / `projectStore.trees` / 6 个 tree action / 7 个 tree tool 全部移除 |
| 2 | 模板应用改写为画布 | `applyTemplateCore` → `applyTemplateToCanvas` |
| 3 | kickstart_project 改写为画布 | `kickstart_project` 直接遍历 template 生成画布卡 |
| 4 | 节奏分析改写为画布 | `projectAnalysis.ts` 基于 CanvasNode |
| 5 | 风格锁重写为画布机制 | 锁状态迁到独立 `useStyleLockStore`（全局锁定一个卡片）；删掉 tree.metadata 上的旧锁字段 |
| 6 | 三个 skill 重写为画布 | duplicate-project / export-storyboard-pdf / analyze-pacing 全部基于画布 |
| 7 | proactiveInsights 重写 | 基于画布卡片推算建议；空画布友好降级 |
| 8 | SnapshotModal diff 重写 | `diffCanvases` 替代 `diffTrees`；保留对比 UI |
| 9 | 导出重写 | `exportStoryboardPDF(project, canvasNodes)` + `exportPrint.buildScriptRows(canvasNodes)` |
| 10 | numbering 重写 | 基于画布卡片的位置 / 类型 / CardChild |
| 11 | intentRouter 简化 | 删 `selectedNodeId` 路径 + `linkedTreeNodeId` 反查逻辑 |
| 12 | canvasToolkit actions 清理 | 全部不再写 `linkedTreeNodeId`；用 `linkedCardIds` |
| 13 | detailStore 简化 | `requestFocusCanvas(cardId: string)` |
| 14 | ChatPanel.highlightAffectedCards 简化 | 直接传 cardIds 数组 |
| 15 | LLM 画布能力扩展 | 7 个专用 add tool + 3 个 batch tool + 结构化返回 + cardId 校验前置 |
| 16 | systemPrompt 完全画布中心 | 删除 tree 段；`treeText` → `canvasText` |
| 17 | 老数据清理 | IDB schema bump v5 → v6，migrate 清空 trees |
| 18 | 现有测试不回归 | 所有 tree 相关测试删除或重写；新增 canvas 相关测试覆盖新逻辑 |

### 1.3 不在本 spec 范围

- **路线 2**（计划模式 + 撤销 / 回滚）→ 留 Phase 4.5
- **路线 3**（流式进度 + 信任工程）→ 留 Phase 4.5
- UI 层 scene card "展开镜头列表"渲染 → 数据层先支持（`CardChild` 已含 type/data），UI 渲染后续
- 模板 JSON 文件结构（`acts/scenes/suggestedShotTypes`）保持不变，仅生成逻辑改
- Spellpaw Server 端 tool registry 同步 → 由 server 仓库对应 PR 处理，本 spec §10 列出字段清单作为接口契约

---

## 2. 设计决策（已确认）

| 维度 | 决策 | 理由 |
|------|------|------|
| 树的命运 | **彻底删除** | UI 层已无入口；保留只会让数据模型/工具表继续分裂 |
| 历史数据 | **直接丢** | 本地 SPA 无用户数据保护责任 |
| 阶段划分 | **一气吃下**（~20 天） | 删树 + 重写 4 大 feature + 能力扩展，全部合并；避免中间状态不可用 |
| Shot 存储 | **画布内子项（CardChild）** | Scene card 的 `children?: CardChild[]` |
| Template 转换 | **acts→storyline / scenes→sceneCard / shots→CardChild** | 复用现有 CanvasNodeType |
| 7 个 add tool 拆分 | **按现有 7 个 type 拆** | storyline / moodboard / videoClip / asset / task / art / character |
| 批操作覆盖 | **batch_update / batch_delete / batch_add**（3 个） | LLM 循环调用太慢 |
| 返回格式 | **单行 JSON 字符串** | LLM 看到 string；ChatPanel 解析后渲染结构化 UI |
| cardId 校验范围 | **仅 cardId** | nodeId 在删树后不存在；范围聚焦 |
| 旧 card tool 兼容 | **保留为 alias** | `add_card` / `update_card` / `delete_card` 内部转发 |
| 旧 tree tool 兼容 | **彻底删除，不留 alias** | LLM 在新 systemPrompt 引导下应优先用画布；保留 alias 会让 LLM 行为分裂 |
| 风格锁机制 | **迁到 CanvasNode.metadata** | 锁状态随卡片走，删 tree 后自然延续 |
| 三个 skill | **重写为画布** | 不接受 feature 降级 |
| SnapshotModal 对比 | **写 diffCanvases 替代** | 不接受 UX 降级 |
| IDB schema | **bump 5 → 6** | 当前 version 5；migrate 强制清空 trees + selectedNodeId + lockedStyle 字段 |
| 改造方式 | **全量重写，不分批发布** | 一次性 PR |
| 工作量估算 | **~20 天**（原 12 天低估 ~70%） | reviewer 发现的 ~50 个文件 + 14 个测试文件需要处理 |

---

## 3. 架构总览

### 3.1 删除清单（不留痕迹）

**类型 / 数据层**：
- `TreeNode` / `TreeNodeMetadata` 类型
- `projectStore.trees` / `selectedNodeId` / 6 个 tree action / `getCurrentTree` / `getSelectedNodePath` / `findNodePath`
- `linkedTreeNodeId` 字段（types/index.ts:119 deprecated）
- `setLockedStyle` / `clearLockedStyle` / `getLockedStyle` 移到新位置（见 §4.9）

**Tool 层**：
- 整个 `src/apps/drama/stores/toolRouter/tree.ts`
- `treeHandlers` 在 `toolRouter/index.ts` 的引用
- 6 个 LLM-exposed tree tool config（`spellpaw_add_node` / `update_node` / `delete_node` / `get_tree` / `get_subtree` / `apply_template`）从 `toolConfigs.ts` 删除
- `applyTemplateCore` helper

**业务逻辑层（4 个文件删除）**：
- `src/apps/drama/lib/treeUtils.ts`（+ 测试）
- `src/apps/drama/lib/treeDiff.ts`（+ 测试）
- `src/apps/drama/lib/migrateTreeToCards.ts`（+ 测试）
- `src/apps/drama/data/mockTreeData.ts`

**UI / 数据引用**（`linkedTreeNodeId` 反查）：
- `src/apps/drama/stores/detailStore.ts`：`requestFocusCanvas(linkedTreeNodeId: string)` → `requestFocusCanvas(cardId: string)`
- `src/apps/drama/stores/chatStore.ts`：`selectedNodeId` 字段移除
- `src/apps/drama/components/layouts/Navbar.tsx`：`findNodePath` / `getCurrentTree` / `selectedNodeId` / `exportStoryboardPDF(project, treeData)` 全部移除或改用画布
- `src/apps/drama/components/detail-panel/ProjectSummary.tsx`：`node: TreeNode` prop 改为 `card: CanvasNode`

**Prompt 层**：
- `systemPrompt.ts` 的 tree 段
- `buildSystemPrompt` 第二参数 `treeText` → `canvasText`

**测试（~14 个文件）**：见 §6

### 3.2 重写清单（迁移 tree-coupling 到画布）

| 模块 | 当前签名 | 新签名 | § |
|------|---------|--------|---|
| `applyTemplateCore` | `(store, templateId, parentId?)` | `applyTemplateToCanvas(templateId)` | 4.6 |
| `projectAnalysis` | 依赖 tree | 依赖 canvasNodes | 4.7 |
| `analysis.kickstart_project` | 走 tree | 走 canvas | 4.8 |
| 风格锁 | `setLockedStyle(prompt, treeNodeId)` | `setLockedStyle(prompt, canvasCardId)`；状态存 `CanvasNode.metadata` | 4.9 |
| `duplicate-project-skill` | 走 tree | 走 canvas | 4.10.1 |
| `export-storyboard-pdf-skill` | 走 tree | 走 canvas | 4.10.2 |
| `analyze-pacing-skill` | 走 tree | 走 canvas | 4.10.3 |
| `proactiveInsights` | 走 tree | 走 canvas | 4.11 |
| `SnapshotModal` 对比 | `diffTrees` | `diffCanvases`（新写） | 4.12 |
| `exportStoryboardPDF` | `(project, tree)` | `(project, canvasNodes)` | 4.13 |
| `exportPrint` | `buildScriptRows(tree)` | `buildScriptRows(canvasNodes)` | 4.13 |
| `numbering` | `computeDisplayNumbers(tree)` | `computeDisplayNumbers(canvasNodes)` | 4.14 |
| `intentRouter` | `selectedNodeId` + `linkedTreeNodeId` | 纯 `selectedCard` context | 4.15 |
| `canvasToolkit/actions/*` | 写 `linkedTreeNodeId`；参数 `nodeId` / `nodeIds` | 写 `linkedCardIds` 或不写；参数 `cardId` / `cardIds` | 4.16 |
| `detailStore` | `requestFocusCanvas(linkedTreeNodeId)` | `requestFocusCanvas(cardId)` | 4.17 |
| `ChatPanel.highlightAffectedCards` | 反查 `linkedTreeNodeId` | 直接传 `cardIds` | 4.18 |

### 3.3 目标架构

```
toolRouter/
├── index.ts            # 聚合 cards/generation/analysis（无 tree）
├── types.ts            # ToolRouter + ToolResult
├── cards.ts            # 7 add + 3 batch + get/update/delete/clear + alias（重写）
├── generation.ts       # 6 generation tool（行为不变；内部实现调 canvasToolkit 不再写 linkedTreeNodeId）
└── analysis.ts         # 5 analysis tool（含重写的 kickstart_project）

lib/
├── toolResultFormat.ts         ← 新
├── cardValidation.ts           ← 新
├── applyTemplateToCanvas.ts    ← 新（重命名自 applyTemplateCore.ts）
├── diffCanvases.ts             ← 新（替代 diffTrees.ts）
├── projectAnalysis.ts          ← 重写为基于画布
├── projectSnapshot.ts          ← 序列化画布 cards
├── proactiveInsights.ts        ← 重写为基于画布
├── numbering.ts                ← 重写为基于画布
├── intentRouter.ts             ← 简化（删 selectedNodeId 路径）
├── canvasToolkit/actions/*     ← 5 个 action 重写（不写 linkedTreeNodeId）
├── systemPrompt.ts             ← 重写为纯画布中心
├── exportPDF.ts                ← 重写 exportStoryboardPDF(project, canvasNodes)
├── exportPrint.ts              ← 重写 buildScriptRows(canvasNodes)
└── skills/builtIn.ts           ← 3 个 skill 重写

types/index.ts
├── ✗ TreeNode / TreeNodeMetadata（删）
├── ✓ CanvasNode（保留，children?: CardChild[] 保留）
├── ✓ CardChild（保留；data 新增 duration 字段语义）
├── ✓ NarrativeTemplate（保留，structure.acts/scenes 不变）
├── ✗ linkedTreeNodeId（删）
└── ✓ CanvasNodeData.metadata.lockedStylePrompt + lockedStyleCardId（新）

projectStore.ts
├── ✗ trees / selectedNodeId / 6 tree action / getCurrentTree / findNodePath（删）
├── ✓ projects 字段
└── ✓ 其他 CRUD（保留）

shared/components/canvas/
├── CanvasPanel.tsx              ← 移除 getCurrentTree 调用
├── CardDetailDrawer.tsx         ← 风格锁改用 canvasCardId
├── nodes/ArtCardNode.tsx        ← 风格锁改用 canvasCardId
├── nodes/SceneCardNode.tsx      ← 风格锁改用 canvasCardId
└── chat-panel/copilot/MessageList.tsx / MessageItem.tsx  ← 在此渲染 tool call 结果（新增 ToolCallResults 组件做折叠行）
```

### 3.4 数据流（典型路径）

**LLM 添加画布卡**：
```
LLM tool_call(spellpaw_add_art_card, {title: "雨夜小巷"})
  ↓
toolRouter.cards.add_art_card({title: "雨夜小巷"})
  ├─ 校验 cardType 必填 (schema enforce)
  ├─ 计算定位
  ├─ useCanvasStore.addCard() → 自动 push 到 server
  └─ 返回 JSON: {"success":true,"affectedCardIds":["canvas_xyz"],"summary":"已添加 art 卡片「雨夜小巷」"}
  ↓
useCopilotSSE 收到 tool_call_done
  ├─ JSON.parse(result) → 渲染 affectedCardIds 缩略图
  └─ triggerHighlight([affectedCardIds]) → 画布卡片闪一下
```

**applyTemplateToCanvas**：
```
LLM tool_call(spellpaw_apply_template, {templateId: "action-chase"})
  ↓
toolRouter.analysis.apply_template({templateId})
  ├─ template = useCustomTemplateStore.getTemplateById(templateId)
  ├─ 遍历 acts → addEnrichedCard('storyline', {type: 'act', ...}) → 记录 actCardId
  ├─ 遍历 scenes → addEnrichedCard('sceneCard', {type: 'scene', children: shots, ...})
  └─ 返回 JSON: {"success":true,"affectedCardIds":[...],"summary":"已应用模板「动作追逐短片」：3 幕 8 场景"}
```

---

## 4. 详细设计

### 4.1 7 个专用 add tool

| Tool 名 | type | 必填 | 可选 |
|---|---|---|---|
| `spellpaw_add_storyline_card` | storyline | title | description, location, timeOfDay, duration |
| `spellpaw_add_moodboard_card` | moodboard | title | description, colors[], styleRef |
| `spellpaw_add_video_clip_card` | videoClip | title | description, source(ai/upload), duration |
| `spellpaw_add_asset_card` | asset | title | description, assetType, url, tags[] |
| `spellpaw_add_task_card` | task | title | description, taskType, targetCardId, dueDate |
| `spellpaw_add_art_card` | art | title | description, thumbnail, generatedPrompt |
| `spellpaw_add_character_card` | character | title | description, role, traits[], linkedCardIds[] |

Handler 实现复用 `addTypedCard` 工厂（见原 spec 4.1，此处不重复）。

### 4.2 3 个 batch tool

- `batch_update_cards({updates: [{cardId, data}]})` → 部分失败，errors 数组列出失败的 cardId
- `batch_delete_cards({cardIds: []})` → 原子：先校验所有 cardId → 单次 setState → triggerPushNow
- `batch_add_cards({cards: [{cardType, data}]})` → 自动错开位置

### 4.3 cardId 校验前置

新增 `src/apps/drama/lib/cardValidation.ts` 提供 `findCardOrError(cardId): {ok:true,card} | {ok:false,error}`。所有需要 cardId 的 handler 入口调用，失败立即返回结构化错误。

### 4.4 结构化返回格式

`ToolResult` 类型（types.ts）：

```typescript
interface ToolResult {
  success: boolean;
  affectedCardIds?: string[];
  summary: string;
  error?: 'card_not_found' | 'validation_failed' | 'unknown_card_type' | 'no_project_selected';
  cardId?: string;
  errors?: Array<{ cardId: string; error: string }>;  // batch 部分失败
  suggestion?: string;
}
```

Handler 返回 `JSON.stringify(result)`；ChatPanel 用 `parseToolResult(raw)` 解析。

### 4.5 alias 路由

仅保留 3 个画布 alias：`add_card` / `update_card` / `delete_card`。**不保留任何 tree tool alias**（LLM 在新 systemPrompt 引导下应优先用画布）。

### 4.6 applyTemplateToCanvas 重写

`src/apps/drama/lib/applyTemplateToCanvas.ts`（新文件）：

```typescript
export async function applyTemplateToCanvas(templateId: string): Promise<ToolResult> {
  const template = useCustomTemplateStore.getState().getTemplateById(templateId);
  if (!template) return { success: false, error: 'validation_failed', suggestion: `unknown template: ${templateId}`, summary: '模板不存在' };
  
  const affected: string[] = [];
  for (const [actIdx, act] of template.structure.acts.entries()) {
    const actCard = await addEnrichedCard('storyline', {
      title: act.title, description: act.description,
      status: 'draft', metadata: { type: 'act' },
    }, { x: 50 + actIdx * 420, y: 50 });
    affected.push(actCard.id);
    
    for (const [sceneIdx, scene] of act.scenes.entries()) {
      // 递归处理 TemplateScene.children（子场景嵌套，老 tree 结构支持）
      const shotChildren: CardChild[] = (scene.suggestedShotTypes ?? []).map((st, i) => ({
        id: generateId('shot_'),
        type: 'shot',
        title: `${scene.title} 镜头 ${i + 1}`,
        data: {
          shotType: st,
          duration: scene.metadata?.duration 
            ? Math.round((scene.metadata.duration / scene.suggestedShotTypes!.length) * 10) / 10 
            : undefined,
        },
      }));
      const sceneCard = await addEnrichedCard('sceneCard', {
        title: scene.title, description: scene.description,
        location: scene.metadata?.location, timeOfDay: scene.metadata?.timeOfDay,
        duration: scene.metadata?.duration,
        children: shotChildren,
        metadata: { type: 'scene', ...(scene.metadata ?? {}) },
      }, { x: 50 + actIdx * 420, y: 300 + sceneIdx * 280 });
      affected.push(sceneCard.id);
      
      // 嵌套子场景：作为 sceneCard 的孙级 CardChild
      if (scene.children?.length) {
        for (const sub of scene.children) {
          const subShots: CardChild[] = (sub.suggestedShotTypes ?? []).map((st, i) => ({
            id: generateId('shot_'),
            type: 'shot',
            title: `${sub.title} 镜头 ${i + 1}`,
            data: { shotType: st, duration: sub.metadata?.duration },
          }));
          // 追加为 sceneCard 的子项（CardChild with type: 'scene'）
          sceneCard.data.children = [
            ...(sceneCard.data.children ?? []),
            { id: generateId('subscene_'), type: 'scene', title: sub.title, data: { description: sub.description, children: subShots } },
          ];
        }
      }
    }
  }
  
  return {
    success: true, affectedCardIds: affected,
    summary: `已应用模板「${template.name}」：${template.structure.acts.length} 幕 ${affected.length - template.structure.acts.length} 场景`,
  };
}
```

### 4.7 projectAnalysis 重写

`generatePacingReport()` 从读 tree 改为读画布：

```typescript
export function generatePacingReport(): CanvasPacingReport {
  const cards = useCanvasStore.getState().getCurrentNodes();
  const scenes = cards.filter(c => c.type === 'sceneCard');
  const shots = scenes.flatMap(s => s.data.children ?? []);
  // CV 计算、issue detection 逻辑与原版一致，仅输入换成画布卡片
}
```

`analyzeStructure` / `matchTemplate` / `optimizePacing` 同步改。

### 4.8 kickstart_project 重写

`toolRouter/analysis.ts:kickstart_project` 当前走 tree。新实现：

```typescript
kickstart_project: async ({theme, genre, targetDuration, cardType}) => {
  const template = await selectBestTemplate(theme, genre);
  if (!template) return JSON.stringify({success: false, error: 'validation_failed', suggestion: 'call match_template first', summary: '未匹配到合适模板'});
  
  const applyResult = await applyTemplateToCanvas(template.id);
  if (!applyResult.success) return JSON.stringify(applyResult);
  
  return JSON.stringify({
    success: true,
    affectedCardIds: applyResult.affectedCardIds,
    summary: `已 kickstart 项目《${theme}》：基于模板「${template.name}」创建 ${applyResult.affectedCardIds?.length} 张画布卡`,
  });
}
```

### 4.9 风格锁重写（迁移到独立 Zustand store）

**当前**：
```typescript
// projectStore
setLockedStyle: (prompt, nodeId) => { tree.metadata.lockedStylePrompt = prompt; tree.metadata.lockedStyleNodeId = nodeId; }
```

**新设计**（全局只锁一个卡片）：
- 删 `CanvasNode.metadata.lockedStylePrompt` 字段（**不在卡片上存**，保持卡上数据轻）
- 删 `projectStore` 三个方法：`setLockedStyle` / `clearLockedStyle` / `getLockedStyle`
- 新增独立 Zustand store `src/shared/stores/styleLockStore.ts`：
  ```typescript
  interface StyleLockStore {
    lockedCardId: string | null;
    lockedStylePrompt: string | null;
    lockStyle(cardId: string, prompt: string): void;  // 覆盖式锁定
    clearLock(): void;
  }
  export const useStyleLockStore = create<StyleLockStore>()(
    persist(
      (set) => ({
        lockedCardId: null, lockedStylePrompt: null,
        lockStyle: (cardId, prompt) => set({ lockedCardId: cardId, lockedStylePrompt: prompt }),
        clearLock: () => set({ lockedCardId: null, lockedStylePrompt: null }),
      }),
      { name: 'spellpaw-style-lock', version: 1 }
    )
  );
  ```
- `canvasToolkit/actions/generateAsset.ts` 等在生成前读 `useStyleLockStore.getState().lockedStylePrompt`，把 prompt 拼接到生成请求
- UI 层（`ArtCardNode` / `SceneCardNode` / `CardDetailDrawer`）改用 `useStyleLockStore` 而不是 `projectStore.getLockedStyle`

**IDB 迁移**：v5→v6 时清空 `projectStore.trees` 后，tree.metadata.lockedStylePrompt / lockedStyleNodeId 自然丢失，无需额外处理。

### 4.10 三个 skill 重写

#### 4.10.1 duplicate-project-skill

```typescript
async function duplicateProjectSkill(ctx) {
  const srcCards = useCanvasStore.getState().getCurrentNodes();
  if (srcCards.length === 0) return { success: false, message: '当前项目无内容可复制' };
  
  // 1. 创建新项目
  const newProjId = useProjectStore.getState().createProject(srcProject.title + ' (副本)', ...);
  // 2. 切到新项目（注意切换 store state）
  useProjectStore.getState().setCurrentProject(newProjId);
  // 3. 复制每张画布卡
  for (const card of srcCards) {
    await addEnrichedCard(card.type, card.data, card.position);
  }
  // 4. 复制 CardChild 引用（已通过 children 字段自动处理）
  return { success: true, message: `已复制 ${srcCards.length} 张画布卡到新项目` };
}
```

#### 4.10.2 export-storyboard-pdf-skill

```typescript
async function exportStoryboardPdfSkill(ctx) {
  const project = useProjectStore.getState().projects.find(p => p.id === ctx.projectId);
  const cards = useCanvasStore.getState().getCurrentNodes();
  await exportStoryboardPDF(project, cards);
  return { success: true, message: '已导出 PDF' };
}
```

#### 4.10.3 analyze-pacing-skill

```typescript
async function analyzePacingSkill(ctx) {
  const report = generatePacingReport();  // 已重写为画布基础
  return { success: true, message: formatPacingReport(report) };
}
```

### 4.11 proactiveInsights 重写

`proactiveInsights.ts` 当前读 tree。新实现：

```typescript
export function computeProactiveInsights(canvas: CanvasNode[]): ProactiveInsight[] {
  const insights: ProactiveInsight[] = [];
  
  // 空画布提示
  if (canvas.length === 0) {
    insights.push({ type: 'empty', severity: 'info', message: '画布为空，可以应用模板或 kickstart 一个项目' });
    return insights;
  }
  
  // 缺 act
  const acts = canvas.filter(c => c.type === 'storyline' && c.data.metadata?.type === 'act');
  if (acts.length === 0) insights.push({ type: 'missing_acts', severity: 'warning', message: '项目没有幕结构，建议用 apply_template 或 add_storyline_card 添加' });
  
  // 缺场景卡
  const scenes = canvas.filter(c => c.type === 'sceneCard');
  if (acts.length > 0 && scenes.length === 0) insights.push({ type: 'missing_scenes', severity: 'warning', message: '有幕但没场景卡' });
  
  // 缺 art 资产
  const arts = canvas.filter(c => c.type === 'art');
  if (scenes.length > 5 && arts.length === 0) insights.push({ type: 'missing_art', severity: 'info', message: '场景卡较多但没有 AI 生成的参考图' });
  
  // 节奏异常
  const report = generatePacingReport();
  if (report.pacingCV > 0.5) insights.push({ type: 'pacing_uneven', severity: 'warning', message: '节奏不均匀，CV=' + report.pacingCV.toFixed(2) });
  
  return insights;
}
```

`chatStore.pushProactiveInsights` 删 `getCurrentTree()` 调用，直接传画布卡片。

### 4.12 SnapshotModal diff 重写

新增 `src/apps/drama/lib/diffCanvases.ts`：

```typescript
export interface CanvasDiff {
  added: CanvasNode[];      // 新画布有，base 没有
  removed: CanvasNode[];    // base 有，新画布无
  modified: Array<{ base: CanvasNode; current: CanvasNode; changes: string[] }>;
}

export function diffCanvases(base: CanvasNode[], current: CanvasNode[]): CanvasDiff {
  // 用 Map<id, CanvasNode> 比对，返回结构化 diff
}
```

`SnapshotModal.tsx:95` `diffTrees(compareBase.data.tree, snapshot.data.tree)` → `diffCanvases(compareBase.data, snapshot.data)`。**`snapshot.data.tree` → `snapshot.data.{cards, edges}`** 同步改。

`projectSnapshot.ts` 序列化字段：
```typescript
interface SnapshotData {
  projectId: string;
  cards: CanvasNode[];          // 画布节点列表（替代原 tree 字段）
  edges: Edge[];                // 画布连线（保留，不能丢）
  projectMeta: { title; description; coverColor };
  createdAt: string;
}
```
`SnapshotModal` 回滚逻辑：同时恢复 cards + edges 到 `useCanvasStore`，原子操作。

### 4.13 PDF/Print 导出重写

**两个文件，三个函数都要改**：

`exportPDF.ts`：
- `exportStoryboardPDF(project: Project, canvasNodes: CanvasNode[]): void`
  - 按类型分组（storyline / sceneCard / art / character）渲染 PDF 页面
  - 不再走 tree 层级

`exportPrint.ts`（三个函数）：
- `exportStoryboardPDF(projectId: string): void` —— 内部读 `useCanvasStore.getState().getCurrentNodes()` 而不是 `useProjectStore.getCurrentTree()`
- `buildScriptRows(canvasNodes: CanvasNode[]): ScriptRow[]` —— 接收画布卡，按 sceneCard 的 children 展开为行
- `exportDialogueScript(projectId: string, format: 'pdf'|'md'|'txt'): void` —— 内部从画布读 dialogue 字段，不再走 tree；调用方 `ProjectListPage.tsx:389` 同步检查

调用方更新：
- `Navbar.tsx:30` `exportStoryboardPDF(project, treeData)` → 读画布 + 调新签名
- `builtIn.ts:392` `exportStoryboardPDF(project, tree)` → 同上
- `ProjectListPage.tsx:389` 调用链顺接

### 4.14 numbering 重写

`numbering.ts` 当前走 tree。新：

```typescript
export function computeDisplayNumbers(canvasNodes: CanvasNode[]): Map<string, string> {
  // 按 x 坐标排序 storyline (act) → 按 y 排序 sceneCard → 给每个 card 编号 "1.1.2" 等
  // shot 作为 sceneCard 的 children 编号 "1.1.2.1"
}
```

### 4.15 intentRouter 简化

**文件改动**：
- `intentRouter.ts`：`IntentContext` 删 `selectedNodeId?: string | null`；删 `tree` lookup 路径
- `useCopilotSSE.ts:265` 调用点同步：
  ```typescript
  // 改前
  const intentResult = detectIntent(content, {
    selectedNodeId: contextCardId,
    selectedCard: useCanvasStore.getState().getSelectedCard(),
  });
  // 改后
  const intentResult = detectIntent(content, {
    selectedCard: useCanvasStore.getState().getSelectedCard(),
  });
  ```
  其中 `contextCardId` 仍可在 systemPrompt 文本中提及，不通过 intent context

intent context 仅保留 `{selectedCard}`。

### 4.16 canvasToolkit actions 清理

**参数重命名清单**：

| File | 当前参数 | 新参数 |
|------|---------|--------|
| `actions/generateAsset.ts` | `params.nodeId` | `params.cardId` |
| `actions/generateAsset.ts` | toolConfigs 描述：`"ID of the scene or shot node"` | 改：`"ID of the canvas card to generate for"` |
| `actions/generateVariants.ts` | `params.nodeId` | `params.cardId` |
| `actions/generateVariants.ts` | toolConfigs 描述同改 |
| `actions/batchApplyStyle.ts` | `params.nodeIds: string[]` | `params.cardIds: string[]` |
| `actions/batchApplyStyle.ts` | toolConfigs 描述同改 |
| `actions/applyStyle.ts` | `params.styleCardId` | 保留（已是 cardId） |
| `actions/editAsset.ts` | `params.cardId` | 保留 |

**实现替换**：

- 删所有 `linkedTreeNodeId` 写入（替换为 `linkedCardIds: []` 或不写）
- `actions/applyStyle.ts:4` 删 `import { findNode } from "@drama/lib/treeUtils"`；改读画布
- `actions/applyStyle.ts:66` `findNode(tree, linkedNodeId)` → `findCard(canvasNodes, cardId)`
- `actions/generateVariants.ts:43,69` `findNode(tree, ...)` → 改用 `findCard(canvasNodes, cardId)`
- `shared.ts:17` `buildDefaultPrompt(node: TreeNode)` → `buildDefaultPrompt(card: CanvasNode)`；从 card.data.title / card.data.description / card.data.location / card.data.timeOfDay / card.data.shotType 拼装

**新增 helper**（如果还没有）：`findCard(canvasNodes: CanvasNode[], cardId: string): CanvasNode | null` —— 放在 `canvasToolkit/shared.ts`。

### 4.17 detailStore 简化

`detailStore.ts:2,6,9,10,20`：
- `draftFormData: Partial<TreeNode>` → `draftFormData: Partial<CanvasNodeData>`
- `requestFocusCanvas(linkedTreeNodeId: string)` → `requestFocusCanvas(cardId: string)`
- 删 `selectedNodeId` 引用

### 4.18 ChatPanel.highlightAffectedCards 简化

`ChatPanel.tsx:90,92,94`：
- 删 `highlightAffectedCards(affectedTreeNodeIds)` 通过 `linkedTreeNodeId` 反查
- 新签名 `highlightAffectedCards(cardIds: string[])`
- `tool_call_done` SSE handler 直接传 `affectedCardIds`（来自结构化 tool result）

### 4.19 systemPrompt 重写

完整删 tree 段（§2 系统 prompt 在 systemPrompt.ts:124-125 等位置）；第二参数 `treeText` → `canvasText`。`useCopilotSSE.ts:300` 已经是 `canvasText`，命名一致化。

### 4.20 类型清理

```typescript
// src/apps/drama/types/index.ts 删除：
- export interface TreeNode { ... }
- export interface TreeNodeMetadata { ... }
- CanvasNodeData.linkedTreeNodeId?: string（已 deprecated，删）

// 新增（替代 Partial<TreeNode['metadata']>，供 TemplateScene.metadata / CanvasNodeData.metadata 使用）：
+ export interface CardMetadata {
+   type?: 'act' | 'scene' | 'shot';   // 层级标记（§4.6/§4.11 使用）
+   duration?: number;
+   location?: string;
+   timeOfDay?: string;
+   shotType?: string;
+   cameraMovement?: string;
+ }

// src/apps/drama/lib/canvasCardSchema.ts 删除：
- validateLinkedTreeNodeId() 函数
- 所有引用 linkedTreeNodeId 的 validator/normalizer
```

### 4.21 IDB Schema 处理

`projectStore.ts:417` 当前 `version: 5` → 改 `version: 6`。`migrate` 增加：

```typescript
migrate: (persistedState, version) => {
  let state = persistedState as any;
  if (version < 2) {
    // fillMeta (v1→v2 迁移逻辑保留)
  }
  if (version < 3) {
    // title translation (v2→v3)
  }
  if (version < 5) {
    // project dedup (v4→v5)
  }
  if (version < 6) {
    // 删除树相关状态；用 delete 真正清除 key（不是设为 undefined）
    delete state.trees;
    delete state.selectedNodeId;
    // lockedStylePrompt / lockedStyleNodeId 在 tree.metadata 里，随 trees 删除自然丢失
  }
  return state;
},
partialize: (state) => ({
  projects: state.projects,
  // 不再 partialize trees / selectedNodeId
}),
```

---

## 5. 文件改动清单（完整版）

### 5.1 删除文件（4 个）

```
src/apps/drama/stores/toolRouter/tree.ts                                    ✗
src/apps/drama/lib/treeUtils.ts (+ treeUtils.test.ts)                      ✗
src/apps/drama/lib/treeDiff.ts (+ treeDiff.test.ts)                         ✗
src/apps/drama/lib/migrateTreeToCards.ts (+ .test.ts)                       ✗
src/apps/drama/lib/builderHandlers.ts (tree.ts 删除后变成 dead code)        ✗
src/apps/drama/data/mockTreeData.ts                                         ✗
```

### 5.2 新建文件（4 个）

```
src/apps/drama/lib/toolResultFormat.ts                                      ✓
src/apps/drama/lib/cardValidation.ts                                        ✓
src/apps/drama/lib/applyTemplateToCanvas.ts (替代 applyTemplateCore.ts)     ✓
src/apps/drama/lib/diffCanvases.ts (替代 diffTrees.ts)                     ✓
src/shared/stores/styleLockStore.ts (替代 tree.metadata 上的 lock 状态)    ✓
```

### 5.3 重写文件（30 个）

**类型 + Store**：
```
src/apps/drama/types/index.ts                                              ← 删 TreeNode / linkedTreeNodeId；新增 CardMetadata 接口（替代 Partial<TreeNode['metadata']>）
src/apps/drama/stores/projectStore.ts                                      ← 删 trees / 6 action / selectedNodeId / findNodePath
src/apps/drama/stores/toolRouter/types.ts                                  ← 新增 ToolResult 类型
src/apps/drama/stores/toolRouter/cards.ts                                  ← 7 add + 3 batch + alias + 校验 + 结构化返回
src/apps/drama/stores/toolRouter/index.ts                                  ← 删 treeHandlers
src/apps/drama/stores/toolRouter/analysis.ts                               ← kickstart_project 重写 + applyTemplateToCanvas
src/apps/drama/stores/toolRouter/generation.ts                             ← generate_storyboard 重写（不写 linkedTreeNodeId；改读画布）
src/apps/drama/stores/detailStore.ts                                       ← requestFocusCanvas(cardId)
src/apps/drama/stores/chatStore.ts                                         ← 删 selectedNodeId；pushProactiveInsights 改传 canvasNodes
src/apps/drama/stores/canvasStore.ts:185                                   ← duplicateNode 清理 linkedTreeNodeId 引用
```

**业务逻辑**：
```
src/apps/drama/lib/systemPrompt.ts                                         ← 纯画布 + canvasText
src/apps/drama/lib/toolConfigs.ts                                          ← 加 10 个新 tool，删 6 个旧 tree tool；更新 generate_storyboard 描述
src/apps/drama/lib/projectAnalysis.ts                                      ← 重写基于画布
src/apps/drama/lib/proactiveInsights.ts                                    ← 重写基于画布
src/apps/drama/lib/numbering.ts                                            ← 重写基于画布
src/apps/drama/lib/intentRouter.ts                                         ← 简化（删 selectedNodeId 路径）；useCopilotSSE 调用点同步
src/apps/drama/lib/exportPDF.ts                                            ← exportStoryboardPDF(project, canvasNodes)
src/apps/drama/lib/exportPrint.ts                                          ← exportStoryboardPDF(projectId) + buildScriptRows(canvasNodes) + exportDialogueScript 全部改画布
src/apps/drama/lib/exportImport.ts                                         ← exportProject(project, canvasNodes) + importProject(canvasNodes)
src/apps/drama/lib/projectSnapshot.ts                                      ← 序列化 {cards, edges} 完整保留
src/apps/drama/lib/templateExportImport.ts                                 ← treeToTemplate / treeNodeToTemplateScene → canvasToTemplate / cardToTemplateScene
src/apps/drama/lib/canvasCardSchema.ts                                     ← 删 validateLinkedTreeNodeId
src/apps/drama/lib/canvasToolkit/shared.ts                                 ← buildDefaultPrompt(card: CanvasNode)；新增 findCard(canvasNodes, cardId)
src/apps/drama/lib/canvasToolkit/actions/generateAsset.ts                  ← 参数 nodeId → cardId；不写 linkedTreeNodeId
src/apps/drama/lib/canvasToolkit/actions/generateVariants.ts                ← 参数 nodeId → cardId；findNode 改 findCard；不写 linkedTreeNodeId
src/apps/drama/lib/canvasToolkit/actions/editAsset.ts                      ← 不写 linkedTreeNodeId
src/apps/drama/lib/canvasToolkit/actions/applyStyle.ts                     ← 不写 linkedTreeNodeId；删 import treeUtils
src/apps/drama/lib/canvasToolkit/actions/batchApplyStyle.ts                ← 参数 nodeIds → cardIds；不写 linkedTreeNodeId
src/apps/drama/lib/skills/builtIn.ts                                       ← 3 个 skill 重写（duplicate-project / export-storyboard-pdf / analyze-pacing）
src/apps/drama/lib/skills/chat.ts                                          ← getProjectTree → getCurrentCanvasNodes
src/apps/drama/lib/skills/registry.ts                                      ← getProjectTree → getCurrentCanvasNodes
src/apps/drama/lib/skills/types.ts                                         ← SkillContext.getProjectTree → getCurrentCanvasNodes: () => CanvasNode[]
```

### 5.4 UI 修正文件（~10 个）

```
src/apps/drama/components/layouts/Navbar.tsx                               ← 删 findNodePath / exportStoryboardPDF 调
src/apps/drama/components/detail-panel/ProjectSummary.tsx                  ← prop 改 card: CanvasNode
src/apps/drama/components/modals/SnapshotModal.tsx                         ← diffCanvases + snapshot.data.cards
src/shared/components/canvas/CanvasPanel.tsx                               ← 删 getCurrentTree 调用
src/shared/components/canvas/CardDetailDrawer.tsx                          ← 风格锁改用 canvasCardId
src/shared/components/canvas/nodes/ArtCardNode.tsx                         ← 风格锁改用 canvasCardId
src/shared/components/canvas/nodes/SceneCardNode.tsx                       ← 风格锁改用 canvasCardId
src/shared/components/chat-panel/MessageList.tsx                           ← JSON.parse + affectedCardIds 渲染（旧 ToolCallDetails 实际在此）
src/shared/components/chat-panel/MessageItem.tsx                           ← 同上
src/shared/components/chat-panel/ChatPanel.tsx                             ← highlightAffectedCards(cardIds)
src/shared/components/chat-panel/toolDisplayName.ts                        ← 删 tree tool labels
src/shared/components/builder/components/CharacterMapBuilder.tsx           ← 删 dead linkedTreeNodeId 字段
src/shared/lib/builderSchema.ts                                            ← 删 linkedTreeNodeId 校验
```

### 5.5 估算

- 删除：~1500 行（实际含 reviewer 发现的 71+ 处 tree 引用，约 2000-2500 行）
- 改写：~800 行
- 新增：~700-1000 行（含测试）
- 总工作量：**~20 天**（原 12 天低估 70%）

---

## 6. 测试

### 6.1 新建 / 重写测试

| 文件 | 类型 | 用例 |
|---|---|---|
| `cards.test.ts`（新建） | 单测 | 7 add tool 各 1-2 例；3 batch tool；alias 路由；校验失败 |
| `cardValidation.test.ts`（新建） | 单测 | 存在 / 不存在 / 跨项目；error 含 suggestion |
| `toolResultFormat.test.ts`（新建） | 单测 | JSON.stringify 格式；parse 成功 / fallback |
| `applyTemplateToCanvas.test.ts`（新建） | 单测 | acts / scenes / shots 三层；空 template；未知 id |
| `diffCanvases.test.ts`（新建） | 单测 | added / removed / modified 三种情况 |
| `projectAnalysis.test.ts`（重写） | 单测 | 基于画布卡片的节奏分析 |
| `proactiveInsights.test.ts`（重写） | 单测 | 各种空 / 缺 / 异常情况 |
| `numbering.test.ts`（重写） | 单测 | 基于画布的编号 |
| `intentRouter.test.ts`（重写） | 单测 | 删 selectedNodeId 路径 |
| `exportPDF.test.ts`（重写） | 单测 | project + canvasNodes 入参 |
| `exportPrint.test.ts`（重写） | 单测 | buildScriptRows 改 canvas 入参 |
| `SnapshotModal.test.tsx`（更新） | 组件测 | diffCanvases 路径 |
| `MessageList.test.tsx` / `MessageItem.test.tsx`（更新） | 组件测 | JSON.parse + affectedCardIds 渲染 |
| `systemPrompt.test.ts`（更新） | 单测 | 无 tree 段；canvasText 渲染 |
| `styleLockStore.test.ts`（新建） | 单测 | lockStyle / clearLock / 全局只锁一个 |
| `skills.test.ts`（重写） | 单测 | 3 个 skill 重写后行为 |
| `chatStore.test.ts`（更新） | 单测 | 删 selectedNodeId 初始化 |
| `canvasStore.test.ts`（更新） | 单测 | 删 linkedTreeNodeId 相关 |
| `clearCanvas.test.ts`（更新） | 单测 | kickstart 不再依赖 linkedTreeNodeId |
| `CopilotCardNode.test.tsx` / `CanvasPanel.popover.test.tsx` / `useCopilotGenerate.test.tsx` / `CardCopilotPopover.test.tsx`（更新） | 组件测 | stub 移除 trees: {} |
| `detailStore.test.ts`（更新） | 单测 | requestFocusCanvas(cardId) |
| `toolDisplayName.test.ts`（更新） | 单测 | 删 tree labels |
| `canvasToolkit/actions/*.test.ts`（重写 5 个） | 单测 | 不再写 linkedTreeNodeId；参数 nodeId→cardId / nodeIds→cardIds |
| `toolRouter.test.ts`（重写，752 行） | 单测 | 删除 tree handler 测试；保留 cards/generation/analysis；新增 applyTemplateToCanvas / 7 add tool / 3 batch |
| `canvasCardSchema.test.ts`（更新） | 单测 | 删 seedTree helper；删 validateLinkedTreeNodeId 测试 |
| `useCopilotSSE.test.ts`（更新） | 单测 | 删 selectedNodeId 初始化；新增 selectedCard-only intent context 测试 |
| `syncEngine.test.ts`（更新） | 单测 | 删 selectedNodeId 初始化 |
| `templateExportImport.test.ts`（重写） | 单测 | tree fixture → canvas fixture；新 canvasToTemplate / cardToTemplateScene |
| `exportImport.test.ts`（重写） | 单测 | exportProject(project, canvasNodes) / importProject(canvasNodes) |
| `exportDialogueScript.test.ts`（更新） | 单测 | 新 exportDialogueScript(projectId, format) 路径 |

### 6.2 IDB migrate 测试

新增 `projectStore.migrate.test.ts`：

```typescript
describe('IDB migrate v5 → v6', () => {
  it('清除 trees 字段', () => { ... });
  it('清除 selectedNodeId 字段', () => { ... });
  it('保留 projects 字段', () => { ... });
  it('保留 canvasStore 数据', () => { ... });
});
```

---

## 7. 实施顺序（20 天）

### 阶段 A：删树 + 重写 tree-coupling 模块（Day 1-13）

| Day | 任务 | 提交粒度 |
|---|---|---|
| 1a | types/index.ts **新增 CardMetadata 接口**（替代 `Partial<TreeNode['metadata']>`），同步刷新 `TemplateScene.metadata` / `CanvasNodeData.metadata` 类型 | commit 1 |
| 1b | types/index.ts 删 TreeNode + linkedTreeNodeId；projectStore 删 trees / 6 action / selectedNodeId；projectStore version 5→6 + migrate | commit 2 |
| 2 | toolRouter/tree.ts 删除；toolConfigs.ts 删 6 个 tree tool；treeUtils/treeDiff/migrateTreeToCards 4 文件删除（含测试） | commit 2 |
| 3 | 新建 applyTemplateToCanvas.ts + 重写 analysis.kickstart_project + analysis.apply_template | commit 3 |
| 4 | 新建 diffCanvases.ts + SnapshotModal 改 + projectSnapshot.ts 序列化 cards | commit 4 |
| 5 | projectAnalysis 重写基于画布 + 测试 | commit 5 |
| 6 | proactiveInsights 重写 + chatStore.pushProactiveInsights 调用替换 + 测试 | commit 6 |
| 7 | numbering 重写 + intentRouter 简化 + 测试 | commit 7 |
| 8 | exportPDF/exportPrint 重写签名 + Navbar 调用替换 + 测试 | commit 8 |
| 9 | canvasToolkit/actions/ 5 个 action 清理（不写 linkedTreeNodeId） + 测试 | commit 9 |
| 10 | 风格锁重写：新建 styleLockStore + ArtCardNode/SceneCardNode/CardDetailDrawer 改用 canvasCardId + 测试 | commit 10 |
| 11 | 3 个 skill 重写（duplicate-project / export-storyboard-pdf / analyze-pacing）+ 测试 | commit 11 |
| 12 | detailStore / ChatPanel.highlightAffectedCards / toolDisplayName / CharacterMapBuilder / builderSchema 清理 | commit 12 |
| 13 | 系统 prompt 重写 canvasText + 测试；A 阶段全量回归 | commit 13 |

### 阶段 B：LLM 能力扩展（Day 14-20）

| Day | 任务 | 提交粒度 |
|---|---|---|
| 14 | types.ts 新增 ToolResult；toolResultFormat.ts；cardValidation.ts；canvasCardSchema 删 validateLinkedTreeNodeId | commit 14 |
| 15 | cards.ts 重写：7 个 add handler + 校验集成 + 结构化返回 + alias 路由 | commit 15 |
| 16 | cards.ts 扩展：3 个 batch handler | commit 16 |
| 17 | toolConfigs.ts 加 10 个新 tool + useCopilotSSE JSON.parse + MessageList/MessageItem 升级 | commit 17 |
| 18 | cards.test.ts / cardValidation.test.ts / toolResultFormat.test.ts / diffCanvases.test.ts 新建测试 | commit 18 |
| 19-20 | B 阶段回归 + 老测试清理 + 全量 292+ 测试通过 | commit 19 |

---

## 8. 兼容性 / 风险

| 维度 | 风险 | 缓解 |
|---|---|---|
| LLM 行为变化 | 删 6 个 tree tool | systemPrompt 全面重写引导 LLM 走画布 tool；alias 保留 add_card/update_card/delete_card |
| 老用户 trees 数据 | IDB 残留 | version 5→6 + migrate 强制清空 |
| 风格锁迁移 | tree.metadata → CanvasNode.metadata | styleLockStore 独立 + UI 调用替换 + IDB migrate 清空 tree 锁定字段 |
| 三个 skill | tree → canvas 语义差异 | 重写为枚举画布卡；duplicate 仍复制所有 card；export-storyboard 改 PDF；analyze-pacing 调新 projectAnalysis |
| 主动建议 | 当前依赖 tree 推算 | 重写后基于画布卡片类型分布；空画布友好 |
| 快照对比 | diffTrees 不再存在 | 写 diffCanvases 替代；UX 不降级 |
| PDF/Print 导出 | 签名变化 | 调用方同步更新；UI 层无差异 |
| number 编号 | 改基于画布 | UI 不变；底层算法适配 |
| intentRouter 简化 | 删 selectedNodeId 路径 | 现有 LLM 调用几乎不依赖 selectedNodeId；可能小幅降低 guardrail 准确率，监控修复 |
| canvasToolkit | 不写 linkedTreeNodeId | 已有 linkedCardIds 替代；不影响生成功能 |
| Server 端 schema | tool registry 同步 | server 仓库对应 PR（§10 字段清单） |
| 在飞 LLM 会话 | 旧 tool schema 仍有 session | 客户端检测到老 tool 名称调用 → 返回 `tool_not_found` 错误 |
| Mock 数据 | mockTreeData.ts 删 | 不影响（已 dead code） |
| 工作量低估 | 12 天→20 天 | 按 20 天排期；前 13 天 A 阶段先稳定 |

---

## 9. 验收标准

阶段 A 完成：
- `git grep "TreeNode\|getCurrentTree\|treeHandlers\|linkedTreeNodeId"` 无结果（除 spec/AGENTS 历史文档）
- `git grep "projectStore.trees\|selectedNodeId"` 无结果
- `npm test` 绿灯
- `npm run build` 通过
- 视觉检查：Workspace / ChatPanel / SnapshotModal / Navbar 导出按钮 全部正常工作
- Server tool registry 同步 PR 已开

阶段 B 完成：
- LLM 调用 `spellpaw_add_art_card` 等新 tool 可成功生成画布卡
- LLM 调用旧 `spellpaw_add_card` 仍可用（alias 路由）
- tool result 含 `affectedCardIds`，画布卡片对应位置闪一下高亮
- cardId 不存在时返回 `card_not_found` 错误 + suggestion
- 292+ 测试通过，新增 50+ 测试（覆盖新写的所有 helper）

---

## 10. Server 端 Schema 同步清单

Spellpaw Server 需要同步的 tool registry 变化：

**删除 6 个 tree tool**：
```
spellpaw_add_node
spellpaw_update_node
spellpaw_delete_node
spellpaw_get_tree
spellpaw_get_subtree
spellpaw_apply_template
```

**新增 10 个 tool**：
```
spellpaw_add_storyline_card       (parameters: title, description?, location?, timeOfDay?, duration?)
spellpaw_add_moodboard_card       (parameters: title, description?, colors[]?, styleRef?)
spellpaw_add_video_clip_card      (parameters: title, description?, source?, duration?)
spellpaw_add_asset_card           (parameters: title, description?, assetType?, url?, tags[]?)
spellpaw_add_task_card            (parameters: title, description?, taskType?, targetCardId?, dueDate?)
spellpaw_add_art_card             (parameters: title, description?, thumbnail?, generatedPrompt?)
spellpaw_add_character_card       (parameters: title, description?, role?, traits[]?, linkedCardIds[]?)

spellpaw_batch_update_cards       (parameters: updates: [{cardId, data}])
spellpaw_batch_delete_cards       (parameters: cardIds: [string])
spellpaw_batch_add_cards          (parameters: cards: [{cardType, data}])
```

**保留 3 个 alias**：`spellpaw_add_card` / `spellpaw_update_card` / `spellpaw_delete_card`（保持现有 schema，内部行为变）。

**描述更新**（不改 schema，只改 description）：
- `spellpaw_generate_storyboard` 描述从 `"reference image for a tree scene (bridges tree → canvas)"` 改为 `"reference image for a canvas card (e.g., a sceneCard); generates an art card linked back to the source"`
- `toolDisplayName` 中所有 tree tool label 删除（包括 `spellpaw_move_node`，虽然 handler 存在但 LLM 未注册）

**systemPrompt 同步**：服务端注入的 systemPrompt 字符串需要同步更新为纯画布版（不含 tree 段）。

---

## 11. 参考文档

- `docs/superpowers/specs/2026-06-24-tool-router-domain-split-design.md` — 当前 toolRouter 结构
- `docs/superpowers/specs/2026-06-20-ai-teammate-system-design.md` — Builder panel / skill 注册
- `docs/superpowers/specs/2026-06-25-card-copilot-popover-design.md` — 卡片 AI 操作 popover
- `src/apps/drama/lib/systemPrompt.ts` — 当前 system prompt
- `src/apps/drama/stores/toolRouter/cards.ts` — 当前 cards domain
- `src/apps/drama/stores/toolRouter/tree.ts` — 待删除的 tree domain

---

*最后更新：2026-06-26 (rev 2 — 纳入 reviewer 发现的 11 blocker + 8 minor)*