# Skills 系统重构计划：从「硬编码函数」到「LLM 指导 + 工具」

## 现状分析

当前 skill 系统有三层：

```
Skill.md (metadata + 文档)
Skill.ts (invoke 函数 — 硬编码执行逻辑)
loader.ts (配对 → 注册到 toolRouter)
```

问题：
- invoke 函数里写死了调哪个 tool、怎么组合 — LLM 没参与
- 每加一个 skill 要写 3 个文件 + 改 loader + 写测试
- `export-storyboard-pdf` 的 invoke 里硬编码调 `exportStoryboardPDF(project, tree)` — 完全绕过 LLM，skill 退化成一个快捷函数调用

## 目标架构

```
Skill.md (metadata + 指导文本)
  → slash 命令触发 → 把 MD 作为上下文注入 LLM
  → LLM 读指导 → 调用 toolRouter 工具 → 返回结果
```

没有 `.ts` 文件。没有 invoke 函数。skill 回归到一个**指导性文本**。

## 执行流程对比

### 当前（硬编码 invoke）

```
用户: /analyze-pacing
  → parseSlashCommand → 匹配 analyzePacingSkill
  → executeSkill → skill.invoke(args, ctx)
  → invoke 函数内部：
      调 toolRouter.analyze_structure()
      调 toolRouter.get_pacing_report()
      检查 canvas 视觉缺口
      拼字符串返回
  → 显示结果
```

### 目标（LLM + 工具）

```
用户: /analyze-pacing
  → parseSlashCommand → 匹配 analyzePacingSkill
  → 构建上下文消息：
      system: "你是一个短剧节奏分析专家。按下面 skill 的指导分析当前项目："
      context: <analyze-pacing.md 的正文内容>
      context: "<current_tree_structure>"
  → 发送到 LLM（via useCopilotSSE）
  → LLM 读指导 → 自主调用 toolRouter 工具：
      tool_call: get_tree
      tool_call: analyze_structure
      tool_call: get_pacing_report
      tool_call: get_canvas (检查 sceneCard)
  → LLM 综合 → streaming 输出分析结果
  → 用户看到流式回答
```

## MD 文件格式变更

### 当前 frontmatter

```yaml
---
id: analyze-pacing
name: 节奏分析
slashCommand: analyze-pacing
examples: ["/analyze-pacing"]
parameters:        # ← 删掉。这是给 tool calling 的 schema
  focusArea: ...
required: []       # ← 删掉
---
```

### 目标 frontmatter

```yaml
---
id: analyze-pacing
name: 节奏分析
slashCommand: analyze-pacing
examples: ["/analyze-pacing", "/analyze-pacing 聚焦高潮段"]
description: 深入分析项目的节奏，输出修改建议
tools_suggested: [get_tree, analyze_structure, get_pacing_report, get_canvas]
---

# 节奏分析（指导文本）

## 目标
分析当前项目的节奏，输出最关键的 3 条修改建议。

## 步骤
1. 调用 `get_tree` 获取项目结构
2. 调用 `analyze_structure` 诊断结构问题
3. 调用 `get_pacing_report` 获取节奏报告
4. 调用 `get_canvas` 检查视觉缺口（sceneCard 是否都有分镜图）
5. 综合以上，输出：
   - 结构层面的问题（孤节点、不平衡的幕长）
   - 节奏层面的问题（时长分布、密度偏差）
   - 视觉缺口（多少 scene 没分镜图）
   - 最关键的 3 条具体修改建议
...
```

通用部分删掉，只保留说明性文本：步骤、要点、输出格式要求。

## 改动清单

### 删除文件（14 个）

```
src/apps/drama/skills/analyze-pacing.ts       ← 6 个 invoke 文件全部删除
src/apps/drama/skills/duplicate-project.ts
src/apps/drama/skills/batch-storyboard.ts
src/apps/drama/skills/character-profile.ts
src/apps/drama/skills/brainstorm-variants.ts
src/apps/drama/skills/export-storyboard-pdf.ts
src/apps/drama/skills/loader.ts               ← 不再需要配对 MD+TS
src/apps/drama/skills/builtIn.ts              ← 不再需要兼容层
src/apps/drama/skills/types.ts                ← 不需要 Skill 接口的 invoke 字段
```

保留 frontmatter.test.ts 和 skills.test.ts（需要更新测试内容）。

### 新建 / 重写

| 文件 | 改动 |
|------|------|
| `src/shared/copilot/skills/types.ts` | 删 `invoke` 字段。Skill 变成纯数据接口（id/name/description/slashCommand/examples/tools_suggested/instructions） |
| `src/shared/copilot/skills/loader.ts` | 简化为：用 `import.meta.glob('./*.md')` 扫所有 `.md`，解析 frontmatter，产 `Skill[]`。**不再需要手动注册每个 skill** |
| `src/apps/drama/skills/chat.ts` | `executeSkill` 改写：不再调 `invoke`，改为构建 system+context 消息发给 LLM |
| `src/apps/drama/skills/registry.ts` | 删 `registerSkillTools`（不再需要 `spellpaw_skill_*` wrapper 注册）。删 `getAllSkillToolConfigs`。 |
| 6 个 `.md` 文件 | 改 frontmatter（删 parameters/required，加 tools_suggested）+ 改正文（从"人类文档" → "LLM 指导文本"） |

### LLM 上下文注入方式

改动 `tryRunSkill` + `executeSkill` 的执行路径：

```typescript
// 当前（drama/skills/chat.ts）
export async function executeSkill(text, projectId) {
  const parsed = parseSlashCommand(text);
  const result = await parsed.skill.invoke(args, ctx);  // ← 直接调函数
  return { finalMessage: buildSkillResultMessage(result.summary) };
}

// 目标
export async function executeSkill(text, projectId) {
  const parsed = parseSlashCommand(text);
  // 构建上下文
  const tree = useProjectStore.getState().getCurrentTree();
  const contextMessage = {
    role: 'system',
    content: `
你是一个短剧制作助手。用户想要执行 skill「${parsed.skill.name}」。

## Skill 指导

${parsed.skill.instructions}

## 当前项目上下文

${formatTreeForLlm(tree)}

请按照 skill 指导的步骤，调用可用工具完成任务。完成后给出总结。
    `.trim(),
  };
  // 发送到 LLM（复用 useCopilotSSE 的正常 messages 流）
  useChatStore.getState().sendSystemMessage(contextMessage, projectId);
  // skill 触发完成，后续由 LLM streaming 接管
}
```

### SkillChips 简化

不再需要 `skills: readonly Skill[]` prop — SkillChips 可以直接从 loader 获取（`getAllSkills()` 来自 registry）。因为 Skill 现在是纯数据（没有 invoke），没有循环依赖了。

### 工具系统保持不变

`toolRouter` 的 23 个原子工具（get_tree, add_node, analyze_structure 等）已经通过 `toolConfigs.ts` 暴露给 LLM。Skill 只是 **指导 LLM 如何使用这些工具**。

### 复杂 tool 的支持

对于无法被 LLM 调用的操作（如 `exportStoryboardPDF` 是 jsPDF 触发浏览器下载），在工具层注册一个原子 tool：

```typescript
// toolRouter 加一个 export_pdf tool
export_pdf: (params: { action: 'export_pdf' }) => {
  const project = useProjectStore.getState()...;
  exportStoryboardPDF(project, tree);
  return 'PDF 已触发下载';
}
```

这样 skill 指导里写"调用 export_pdf 工具"，LLM 就能执行 — **不需要专用 invoke 函数**。

## TypeScript 类型变更

### 当前（与可执行 invoke 绑定）

```typescript
export interface Skill {
  id: string;
  name: string;
  description: string;
  slashCommand: string;
  examples: string[];
  parameters: { type: 'object'; properties: ...; required: string[] };
  invoke: (args: ..., ctx: SkillContext) => Promise<SkillResult>;
}
```

### 目标（纯数据，LLM 消费）

```typescript
export interface Skill {
  id: string;
  name: string;
  description: string;
  slashCommand: string;
  examples: string[];
  /** 建议 LLM 使用的工具列表（只是提示，LLM 可以自行决定） */
  tools_suggested: string[];
  /** 正文内容（MD body），即写给 LLM 的指导 */
  instructions: string;
}
```

SkillContext、SkillResult、`parameters`、`invoke` 全部删除。

## 影响范围

| 模块 | 影响 |
|------|------|
| `shared/copilot/skills/types.ts` | 改接口，删 `invoke` + `parameters` + `SkillContext` + `SkillResult` |
| `shared/copilot/skills/loader.ts` | glob 加载 `.md` 文件，不需要手动注册 |
| `shared/copilot/skills/registry.ts` | 删 `skillToToolConfig`、`getAllSkillToolConfigs`、`registerSkillTools`、`parseArgTokens` |
| `shared/copilot/skills/chat.ts` | 删掉 — 这些 helper 变得不必要（只有 `isSlashCommand` 留下来） |
| `drama/skills/chat.ts` | `executeSkill` 重写：构建 system context 发给 LLM |
| `drama/skills/registry.ts` | 删所有 tool-calling 的 wrapper |
| `drama/skills/loader.ts` | 删 |
| `drama/skills/builtIn.ts` | 删 |
| `drama/skills/types.ts` | 删（shared 的类型已经够用） |
| 6 个 `.ts` invoke 文件 | 删 |
| 6 个 `.md` 文件 | 改 frontmatter + 正文 |
| `drama/lib/toolConfigs.ts` | 删 `getAllSkillToolConfigs()` 的 spread |
| `drama/stores/toolRouter/index.ts` | 删 `registerSkillTools(toolRouter)` |
| `SkillChips.tsx` | 去掉 `skills` prop，直接从 registry 拿（纯数据，无 deps 问题） |
| `CopilotChat.tsx` | 去掉 `skills` prop |
| `ChatPanel.tsx` | 去掉 `getAllSkills()` import + `skills` prop |
| `CopilotLabPage.tsx` | 同上 |
| 测试 | 重写 skills.test.ts + chatStore.test.ts 中相关部分 |

## 删除量估算

| 删 | 数量 |
|----|------|
| `.ts` invoke 文件 | 6 个 |
| `loader.ts` / `builtIn.ts` / `drama/chat.ts` / `drama/registry.ts` / `drama/types.ts` | 5 个 |
| `shared/copilot/skills/chat.ts` | 1 个 |
| frontmatter.ts 移到 shared 后的副本（drama 侧）| 0（已删） |
| **净删除行数** | **~1200 行 TS 代码** |

| 留 | 数量 |
|----|------|
| `.md` 文件（重写为指导文本） | 6 个 |
| `shared/copilot/skills/types.ts`（简化接口） | 1 个 |
| `shared/copilot/skills/loader.ts`（glob 加载） | 1 个 |
| `shared/copilot/skills/registry.ts`（简化） | 1 个 |
| `shared/copilot/skills/frontmatter.ts`（不变） | 1 个 |
| `drama/skills/chat.ts`（executeSkill 重写） | 1 个 |
| 测试 | 2 个 |

## 关键风险

1. **LLM 指令遵循不确定** — 当前 invoke 是确定性的（每次返回相同结构），换成 LLM 后结果不可控
   - 缓解：skill 指导文本写清楚"输出格式要求"；可以用 `response_format` 约束 JSON 结构
2. **Token 消耗增加** — skill 指导文本 + 项目上下文 + 多次 tool_call 比直接函数调用贵很多
   - 缓解：小项目还好；大项目可以只传当前幕的 subtree（已有 `get_subtree`）
3. **Slash command 变成异步 LLM 调用** — 用户等 LLM 输出，不再是瞬间返回
   - 缓解：当前体验几乎一样（slash command 本来就显示 loading spinner）

## 执行顺序（建议分 3 个 commit）

1. **删 invoke 体系**：删所有 `.ts` invoke 文件、loader、builtIn、参数系统、tool config。Skill 类型简化。测试适配。
2. **重写 6 个 MD**：改 frontmatter 格式 + 正文转为 LLM 指导文本。
3. **接 LLM 上下文**：改写 `executeSkill` 为 system context 注入；删 `SkillChips` 的 prop 传递链。

## 预期收益

- **新增 skill = 只写一个 MD 文件**（≈ 写一篇小作文，零代码，零注册）
- **~1200 行 TS 代码删除**（整个 invoke 执行层消失）
- **LLM 可以利用全部 23 个 toolRouter 工具**（不被硬编码 invoke 限制）
- **Skill 随模型能力升级**（不依赖我们写死的逻辑）
