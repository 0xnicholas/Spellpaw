# Tool Router 领域拆分设计

**Status**: Approved
**Date**: 2026-06-24
**Scope**: Spellpaw Drama Studio — `toolRouter.ts` 拆分 + Tool 描述重写 + systemPrompt 优先级化 + 砍 alias

---

## 1. 背景与目标

### 1.1 现状

`src/apps/drama/stores/toolRouter.ts` 经过 Phase 2 多次迭代后：

- **966 行单文件**，含 25 个 tool handler + 末尾动态 skill 注册循环
- **3 个 alias tool**：`add_canvas_card` / `update_canvas_card` / `delete_canvas_card` 与 `add_card` / `update_card` / `delete_card` 行为完全等价（纯 token 浪费）
- **systemPrompt 与 toolConfigs 自相矛盾**：
  - `systemPrompt.ts` 写"❌ avoid `spellpaw_add_node` / `spellpaw_kickstart_project`"
  - 但 `toolConfigs.ts` 把 tree tools 标为 "Legacy (kept for backward compat, prefer card tools above)"
  - 两边都说对方是真相，LLM 行为不稳定
- **Tool 描述（`description`）粗放**：很多只有一句话 "Update a card"，LLM 难以判断何时用 add_card vs update_node

### 1.2 目标

| # | 目标 | 成功标准 |
|---|------|---------|
| 1 | 按领域拆分 toolRouter | 25 个 tool 分布在 4 个 domain 文件，每个文件 < 300 行 |
| 2 | 砍 3 个 alias tool | 25 → 22 tool；无外部调用方需要改 |
| 3 | systemPrompt 工具段重写 | 不再"❌ avoid"，改为按场景优先级推荐；6 个分类清晰 |
| 4 | Tool description 升级 | 每条含用途 + when-to-use + example |
| 5 | Skill 注册解耦 | `toolRouter.ts` 不再 import `skills/registry`；注册代码搬到 `skills/registry.ts` |
| 6 | 测试全过 | 现有 792 行 `toolRouter.test.ts` 不动，仅 import 路径不变 → 292+ tests passing |

### 1.3 不在本 spec 范围

- Context-aware 工具过滤（按项目状态裁剪 LLM 看到的工具列表）→ 留 Phase 4 MCP
- 工具调用分析 Dashboard → 留 Phase 4 MCP
- TreeView 复活（AGENTS.md 列了但代码不存在）→ 留作单独任务
- Phase 2 prompt engineering 微调（除工具说明段外）→ 不在本 spec

---

## 2. 设计决策（已确认）

| 维度 | 决策 | 理由 |
|------|------|------|
| 方案 | **B · 领域拆分**（5 天） | 砍 alias + 修描述 + 拆文件，单 PR 即可；不为 Phase 4 MCP 提前做智能化 |
| systemPrompt 改造 | **明确优先级** | "首选 add_card；查场景细节 / 修改元数据才用 get_subtree / update_node"，可执行而非禁止 |
| 测试策略 | **保持现有 792 行覆盖** | 拆分后测试不动，只调 import；不为 4 个新 domain 各自建 test 文件 |
| Skill 注册位置 | **收进 registry** | `toolRouter/` 不再 import `skills/registry`；打破循环依赖 |
| Tree API 保留 | **保留全部 7 个 tree tool** | Builder panel / apply_template / kickstart_project / generate_storyboard / 4 个 analysis 工具都在用，是脊柱不是 legacy |
| Alias 砍除 | **3 个 alias 全部删除** | 行为等价，无外部调用方，节省 ~150 token/turn |
| 文件组织 | **`stores/toolRouter/` 目录** | 替代单文件 `toolRouter.ts`；保持 `import { toolRouter } from '@drama/stores/toolRouter'` 公开 API 不变 |

---

## 3. 架构总览

### 3.1 当前结构（问题）

```
toolRouter.ts (966 行)
├── handler: get_tree          ─┐
├── handler: get_subtree       │
├── handler: add_node          │
├── handler: update_node       ├── Tree (7)
├── handler: delete_node       │
├── handler: move_node         │
├── handler: apply_template    ─┘
├── handler: generate_storyboard ──── Generation/Bridge (1)
├── handler: generate_asset    ─┐
├── handler: generate_variants │
├── handler: edit_asset        ├── Generation (5)
├── handler: apply_style       │
├── handler: batch_apply_style ─┘
├── handler: analyze_structure  ─┐
├── handler: get_pacing_report  │
├── handler: match_template     ├── Analysis (4)
├── handler: optimize_pacing   ─┘
├── handler: add_canvas_card  ─┐ ALIAS（删）
├── handler: update_canvas_card│ ALIAS（删）
├── handler: delete_canvas_card┘ ALIAS（删）
├── handler: kickstart_project ──── Tree-side（分析为主）
├── handler: get_canvas       ─┐
├── handler: add_card         │
├── handler: update_card      ├── Cards (5)
├── handler: delete_card      │
└── handler: clear_canvas    ─┘
└── for-loop: 注册 skill tools (依赖 skills/registry)
```

### 3.2 目标结构

```
stores/toolRouter/
├── index.ts        # 聚合 + registerSkillTools(router)
├── types.ts        # ToolRouter, ToolHandler, ToolParams
├── tree.ts         # 7 个 handler + apply_template
├── cards.ts        # 5 个 handler（get_canvas/add/update/delete/clear）
├── generation.ts   # 6 个 handler
└── analysis.ts     # 5 个 handler（含 kickstart_project）

skills/registry.ts (+ 12 行)  # 新增 registerSkillTools(router)
```

### 3.3 聚合与公开 API

```typescript
// stores/toolRouter/index.ts
import { treeHandlers } from './tree';
import { cardHandlers } from './cards';
import { generationHandlers } from './generation';
import { analysisHandlers } from './analysis';
import { registerSkillTools } from '@drama/lib/skills/registry';
import type { ToolRouter } from './types';

export const toolRouter: ToolRouter = {
  ...treeHandlers,
  ...cardHandlers,
  ...generationHandlers,
  ...analysisHandlers,
};

registerSkillTools(toolRouter);

export default toolRouter;
```

公开 import 路径不变：
```typescript
import { toolRouter } from '@drama/stores/toolRouter';  // ✅ 仍然有效
```

---

## 4. 文件布局与职责

### 4.1 `types.ts`（新文件）

```typescript
export type ToolParams = Record<string, unknown>;

export type ToolHandler<P extends ToolParams = ToolParams> =
  (params: P) => Promise<string>;

export interface ToolRouter {
  [action: string]: ToolHandler;
}
```

### 4.2 `tree.ts`（7 个 handler）

| Tool | 职责 |
|------|------|
| `get_tree` | 返回完整项目树缩进文本 |
| `get_subtree` | 返回指定节点子树缩进文本 |
| `add_node` | 添加 act/scene/shot 节点 |
| `update_node` | 修改节点标题/元数据 |
| `delete_node` | 删除节点（不可恢复） |
| `move_node` | 同级排序 |
| `apply_template` | 套用叙事模板，批量 addTreeNode |

**依赖**：`useProjectStore`、`useCustomTemplateStore`、`@drama/lib/treeUtils`、`fetch /templates/*.json`

### 4.3 `cards.ts`（5 个 handler）

| Tool | 职责 |
|------|------|
| `get_canvas` | 返回画布全部卡片缩进文本 |
| `add_card` | 添加卡片（含自动定位） |
| `update_card` | 更新卡片 data |
| `delete_card` | 删除卡片 |
| `clear_canvas` | 原子清空（按 filter） |

**依赖**：`useCanvasStore`、`useProjectStore`、`@drama/lib/syncEngine`（triggerPushNow）

### 4.4 `generation.ts`（6 个 handler）

| Tool | 职责 |
|------|------|
| `generate_asset` | 转发 canvasToolkit.generateAsset |
| `generate_variants` | 转发 canvasToolkit.generateVariants |
| `edit_asset` | 转发 canvasToolkit.editAsset |
| `apply_style` | 转发 canvasToolkit.applyStyle |
| `batch_apply_style` | 转发 canvasToolkit.batchApplyStyle |
| `generate_storyboard` | tree 场景 → AI 图像 → 卡片（含 provider 选择 + 任务轮询） |

**依赖**：`@drama/lib/canvasToolkit`、`providerRegistry`、`@drama/lib/syncEngine`、`useTaskStore`

### 4.5 `analysis.ts`（5 个 handler）

| Tool | 职责 |
|------|------|
| `analyze_structure` | 读 tree，返回结构诊断 |
| `get_pacing_report` | 读 tree，返回节奏分析 |
| `match_template` | 读 tree + 项目标题，返回模板匹配结果 |
| `optimize_pacing` | 读 tree，干预时长（dryRun 预览） |
| `kickstart_project` | apply_template + 批量 add_canvas_card（跨域，放这里因为它做"项目初始化诊断式"工作） |

**依赖**：`useProjectStore`、`useCanvasStore`、`@drama/lib/projectAnalysis`、`@drama/lib/templateMatching`、`useCustomTemplateStore`、`toolRouter`（同 module 内部引用，无需 import path）

### 4.6 跨域调用处理

`kickstart_project` 内部需要：
- `apply_template`（tree domain）
- `add_canvas_card` → **改为 `add_card`**（cards domain）

**实现方式**：因为 4 个 domain 都由 `index.ts` 聚合到同一个 `toolRouter` 对象，跨域调用通过 `this` 或模块级 `toolRouter` 引用：

```typescript
// analysis.ts
import { toolRouter } from './index';  // ⚠️ 循环风险
```

**解决方案**：把 `kickstart_project` 的 `apply_template` 内部调用改为**直接 import tree handler 函数**，避免循环：

```typescript
// analysis.ts
import { applyTemplateHandler } from './tree';
// ... internal use of applyTemplateHandler instead of toolRouter.apply_template
```

或更简单：`kickstart_project` 的 tree 部分逻辑（添加场景到 tree）直接写在 analysis.ts 里（~30 行），不调 `apply_template`。

**最终决定**：选择第二种方案——直接展开 `kickstart_project` 内的 template 应用逻辑到 analysis.ts，删除对 `toolRouter.apply_template` 的调用依赖。无循环 import 风险。

---

## 5. SPELLPAW_TOOL_CONFIGS 描述重写

### 5.1 现状问题

```typescript
{
  name: "spellpaw_add_card",
  description: "Add a new card to the canvas. Choose type based on content: storyline for narrative structure, moodboard for visual style references, videoClip for video assets, asset for materials/logos/subtitles, task for instructions/feedback, art for AI-generated images, character for character profiles.",
  // ...
}
```

问题：含 type 列表（应放 description 或 enum），缺 when-to-use 和 example。

### 5.2 重写模板

```typescript
{
  name: "spellpaw_add_card",
  description:
    "Add a card to the canvas. PREFERRED over add_node when creating visual content. " +
    "Use add_node only when modifying the project's act/scene/shot backbone. " +
    "Example: add_card({ type: 'storyline', title: '雨夜重逢', description: '...' }).",
  parameters: { /* 同现状 */ },
}
```

每条 description 包含：
1. 一句话用途
2. "PREFERRED / Use X when ... / NOT for ..."
3. 一个 example call

### 5.3 重写清单（22 条）

| Tool | 描述重点 |
|------|---------|
| `get_canvas` | 用于理解画布现状；优于 get_tree 当内容以卡片形式存在 |
| `add_card` | 添加卡片；优选 add_node 当创建视觉内容 |
| `update_card` | 更新卡片任意字段 |
| `delete_card` | 删除单卡；批量用 clear_canvas |
| `clear_canvas` | 原子清空；支持 filter；批量删除优于此 |
| `add_node` | 修改项目脊柱（act/scene/shot）；不要用于纯视觉内容 |
| `update_node` | 修改节点标题/元数据；查场景细节用 get_subtree |
| `delete_node` | 删除节点（不可恢复） |
| `move_node` | 同级排序 |
| `get_tree` | 项目结构概览 |
| `get_subtree` | 查场景级元数据（shotType / cameraMovement / dialogue） |
| `apply_template` | 引导项目从模板创建结构 |
| `generate_asset` | 生成图/视频并落画布为卡 |
| `generate_variants` | 多版本生成 |
| `edit_asset` | 编辑已有卡片的图 |
| `apply_style` | 单卡风格迁移 |
| `batch_apply_style` | 多 scene/shot 批量风格统一 |
| `generate_storyboard` | tree 场景 → AI 参考图（连接到该场景） |
| `analyze_structure` | 结构诊断 |
| `get_pacing_report` | 节奏分析 |
| `match_template` | 模板匹配 |
| `optimize_pacing` | 节奏优化（dryRun 预览） |
| `kickstart_project` | 模板引导 + 自动建场景卡 |

---

## 6. systemPrompt 工具段重写

### 6.1 当前段落（节选）

```
## ⚠️ 重要：优先使用画布卡片工具
SpellPaw 的项目结构是**画布卡片**，不是树。
- ✅ 优先：spellpaw_add_card / spellpaw_update_card / spellpaw_delete_card / spellpaw_get_canvas
- ❌ 避免：spellpaw_add_node / spellpaw_update_node / spellpaw_get_tree / spellpaw_get_subtree
- ❌ 避免：spellpaw_kickstart_project
```

### 6.2 重写后

```
## Tools (priority order)

### 1. Canvas cards — primary for visual content
add_card / update_card / delete_card / get_canvas / clear_canvas.
Use these first when the user wants to create, edit, or inspect canvas content.

### 2. Tree nodes — for project structure
add_node / update_node / delete_node / move_node / get_tree / get_subtree.
Use these when modifying the act/scene/shot backbone or when you need
scene-level metadata (shotType / cameraMovement / dialogue).

### 3. Templates & kickstart
apply_template(templateId) — bootstrap a project from a narrative template.
kickstart_project(theme, genre?) — pick best template + create scenes + generate scene cards.
After kickstart, use canvas tools to refine.

### 4. Canvas content generation
generate_asset / generate_variants / edit_asset — image & video generation.
apply_style / batch_apply_style — visual consistency across cards.
generate_storyboard — reference image for a tree scene (bridges tree → canvas).

### 5. Analysis (read-only)
analyze_structure / get_pacing_report / match_template / optimize_pacing.
All read the tree. Use when user asks about structure or pacing.

### 6. Skills (composite workflows)
spellpaw_skill_* — multi-step workflows. Prefer when user names a skill.
```

**关键变化：**
- 删除 "❌ 避免" 措辞（之前禁止调用 kickstart_project 是错的——它是合法 tool）
- 6 级分类替代之前的 2 段（"✅ 优先 / ❌ 避免"）
- 每个分类附"何时用"场景
- 砍掉破损注释 `（这些是旧的树 API，）`

### 6.3 题材判断段（保留 + 小修）

`inferGenre` 中英文判断逻辑保留，但补 i18n：
- 中文项目标题用现有中文正则
- 英文项目标题用英文关键词正则（新增 ~10 行）
- 都失败时回退 "剧情 / Drama"

`genreGuidance` 文案改为英文为主（与 LLM 工作语言一致），中文作为 fallback。

`buildScenePrompt` / `buildDefaultPrompt` 不在本 spec 改动范围。

---

## 7. Skill 注册迁移

### 7.1 当前实现（toolRouter.ts 第 924-960 行）

```typescript
// toolRouter.ts 末尾
import { getAllSkillToolConfigs } from '@drama/lib/skills/registry';
import { getSkillById } from '@drama/lib/skills/registry';

for (const cfg of getAllSkillToolConfigs()) {
  if ((toolRouter as Record<string, unknown>)[cfg.name]) continue;
  (toolRouter as Record<string, (params: unknown) => Promise<string>>)[cfg.name] = async (params: unknown) => {
    const skillId = cfg.name.replace(/^spellpaw_skill_/, '');
    const skill = getSkillById(skillId);
    if (!skill) return `Unknown skill: ${skillId}`;
    const input = (params as { input?: Record<string, unknown> })?.input ?? {};
    const ctx = {
      projectId: useProjectStore.getState().currentProjectId ?? '',
      getProjectTree: () => useProjectStore.getState().getCurrentTree(),
      getCanvasCardCount: () => useCanvasStore.getState().getCurrentNodes().length,
    };
    if (!ctx.projectId) return `Skill「${skill.name}」失败：当前没有打开的项目。`;
    const result = await skill.invoke(input, ctx);
    return result.summary;
  };
}
```

### 7.2 迁移后

**新增** `src/apps/drama/lib/skills/registry.ts` 导出：

```typescript
import type { ToolRouter } from '@drama/stores/toolRouter/types';
import { useProjectStore } from '@drama/stores/projectStore';
import { useCanvasStore } from '@drama/stores/canvasStore';

export function registerSkillTools(router: ToolRouter): void {
  for (const cfg of getAllSkillToolConfigs()) {
    if (router[cfg.name]) continue;
    router[cfg.name] = async (params) => {
      // ... 同样的实现逻辑 ...
    };
  }
}
```

**`toolRouter/index.ts` 调用**：
```typescript
registerSkillTools(toolRouter);  // 注册 skill tools
```

### 7.3 循环依赖检查

```
toolRouter/index.ts
  ├── import tree.ts (no cross import)
  ├── import cards.ts (no cross import)
  ├── import generation.ts (no cross import)
  ├── import analysis.ts (no cross import)
  └── import skills/registry.ts
        └── import stores/toolRouter/types.ts (type only, no value)
              ✓ 无循环
```

---

## 8. AGENTS.md 更新

### 8.1 Section 6.2 "Tool Server 桥接" — Tool Router 路由表

**原内容**（节选）：
```
| `add_node` | `projectStore.addTreeNode()` |
| `update_node` | `projectStore.updateTreeNode()` |
| `delete_node` | `projectStore.deleteTreeNode()` |
| `move_node` | `projectStore.moveTreeNode()` |
| `get_tree` | 只读返回缩进文本 |
| `get_subtree` | 只读返回子树缩进文本 |
| `apply_template` | 自定义模板优先查找 → 内置模板 fetch → 批量 addTreeNode |
| `generate_storyboard` | 调用图像 API → 创建 `art` 卡片 + 写入 `generatedPrompt` |
| `add_canvas_card` | `canvasStore.addNode()` |
| `update_canvas_card` | `canvasStore.updateNodeData()` |
| `delete_canvas_card` | `canvasStore.removeNode()` |
```

**新内容**：按 4 个 domain 重排 + 删除 3 个 alias + 删除"legacy"措辞：

```
### Tree domain (7)
| Tool | 实现 |
|------|------|
| `get_tree` | `useProjectStore.getCurrentTree()` → `treeToText()` |
| `get_subtree` | `findNode(tree, nodeId)` → `treeToText(subtree)` |
| `add_node` | `useProjectStore.addTreeNode(parentId, node)` |
| `update_node` | `useProjectStore.updateTreeNode(nodeId, changes)` |
| `delete_node` | `useProjectStore.deleteTreeNode(nodeId)` |
| `move_node` | `useProjectStore.moveTreeNode(nodeId, newIndex)` |
| `apply_template` | 自定义模板优先查找 → 内置模板 fetch → 批量 addTreeNode |

### Cards domain (5)
| Tool | 实现 |
|------|------|
| `get_canvas` | `useCanvasStore.getCurrentNodes()` → 缩进文本 |
| `add_card` | `addCanvasCardHandler()` + auto-position |
| `update_card` | `useCanvasStore.updateNodeData(cardId, updates)` |
| `delete_card` | `useCanvasStore.removeNode(cardId)` |
| `clear_canvas` | 原子 setState + triggerPushNow() |

### Generation domain (6)
| Tool | 实现 |
|------|------|
| `generate_asset` / `generate_variants` / `edit_asset` | 转发 `canvasToolkit.*` |
| `apply_style` / `batch_apply_style` | 转发 `canvasToolkit.*` |
| `generate_storyboard` | providerRegistry.select + submit + 创建 art 卡片 |

### Analysis domain (5)
| Tool | 实现 |
|------|------|
| `analyze_structure` | `suggestCompletions(tree)` + `analyzePacing(tree)` |
| `get_pacing_report` | `generatePacingReport(tree)` |
| `match_template` | `scoreTemplates(corpus)` |
| `optimize_pacing` | `generatePacingReport(tree)` + 干预 metadata.duration |
| `kickstart_project` | 套模板 + 批量 add_card（场景卡/剧本卡） |

### Skill tools (N)
| Tool | 实现 |
|------|------|
| `spellpaw_skill_*` | `skills/registry.ts` 的 `registerSkillTools(router)` 注册 |
```

---

## 9. 风险与缓解

| # | 风险 | 概率 | 影响 | 缓解 |
|---|------|:---:|:---:|------|
| 1 | 砍 alias 后，LLM 在已有 session 缓存老 tool 名 | 低 | 低 | LLM 每 turn 重读 toolConfigs，无持久化；下次新建 session 即生效 |
| 2 | 4 个 domain 拆分后跨域调用（kickstart_project 调 apply_template） | 中 | 中 | 在 analysis.ts 内展开 kickstart_project 的 template 应用逻辑，不调 toolRouter.apply_template |
| 3 | Skill 注册移到 registry 后引入新的循环依赖 | 低 | 高 | type-only import stores/toolRouter/types，无运行时循环；build 时 `npm run lint:server` 验证 |
| 4 | systemPrompt 工具段重写让 LLM 行为微妙变化 | 中 | 中 | 5 类手工复测高频 query；保留 5 分钟可回滚 |
| 5 | toolRouter.test.ts 792 行测试在新结构下失败 | 低 | 高 | 测试只改 import 路径（无需改）；拆分前后跑一遍验证 |
| 6 | AGENTS.md 更新遗漏导致文档继续误导 | 低 | 低 | Section 6.2 全段重写，删 alias 行，加 domain 分组表 |
| 7 | 9.5KB 单文件测试运行时间增加 | 低 | 低 | 仍单文件运行；如未来需要可拆 |

---

## 10. 工作分解（5 天）

| Day | 工作 | 验证 |
|-----|------|------|
| 1 | 建 `stores/toolRouter/` 目录：types.ts + 4 个 domain 文件 + index.ts；删除 `toolRouter.ts` 旧文件 | `npm test` 全过 |
| 1 | 跨域处理：analysis.ts 内展开 `kickstart_project` 的 template 应用逻辑 | 单元测试过 |
| 2 | 重写 `SPELLPAW_TOOL_CONFIGS` 22 条 description（含 when-to-use + example） | 视觉检查 |
| 2 | 砍 3 个 alias tool；扫描所有调用点更新 | grep `add_canvas_card` / `update_canvas_card` / `delete_canvas_card` 返回 0 匹配 |
| 3 | 重写 `systemPrompt.ts` 工具说明段（按 6 级优先级） | 长度变化检查 |
| 3 | Skill 注册迁移到 `skills/registry.ts`；toolRouter/index.ts 调用 `registerSkillTools` | 无 TS 错 |
| 4 | AGENTS.md Section 6.2 更新；写 commit message | 文档一致性 |
| 5 | 集成测试 + 手动验证：开项目 → 与 Agent 对话 5 个高频 query → 确认 tool 选择符合预期 | 5 个 query 全过 |

### 5 个高频 query（手动验证清单）

1. "帮我加一张场景卡：雨夜小巷" → 期望调用 `add_card`（不是 `add_canvas_card`）
2. "把第一幕第三场的时长改成 25 秒" → 期望调用 `update_node` 或 `update_card`（按实现）
3. "分析一下这个项目的节奏" → 期望调用 `get_pacing_report`
4. "生成一个分镜参考图" → 期望调用 `generate_asset` 或 `generate_storyboard`（按选中节点）
5. "清空画布" → 期望调用 `clear_canvas`

---

## 11. 验收清单（Definition of Done）

- [ ] `src/apps/drama/stores/toolRouter.ts` 已删除
- [ ] `src/apps/drama/stores/toolRouter/{index,types,tree,cards,generation,analysis}.ts` 全部存在
- [ ] `toolRouter/index.ts` 聚合所有 domain + 调用 `registerSkillTools`
- [ ] `src/apps/drama/lib/skills/registry.ts` 导出 `registerSkillTools(router)`
- [ ] `SPELLPAW_TOOL_CONFIGS` 22 条（不含 skill），每条 description 含 when-to-use + example
- [ ] 0 处 `add_canvas_card` / `update_canvas_card` / `delete_canvas_card` 引用（grep 验证）
- [ ] `systemPrompt.ts` 工具段已重写为 6 级优先级
- [ ] `AGENTS.md` Section 6.2 已更新（4 domain + 无 legacy 措辞）
- [ ] `npm test` 全过：292+ tests passing
- [ ] `npm run lint` 全过（前端）
- [ ] `npm run build` 全过
- [ ] 5 个高频 query 手动验证通过

---

*Spec 版本：v1.0*
*最后更新：2026-06-24*
*关联：Phase 4 MCP Server 设计（待写）— Phase 4 将基于本 spec 的 4-domain 工具注册表生成 MCP Tool 描述*