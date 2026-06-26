# Skills 系统重构计划 v2

## 核心转变

```
当前：Skill = MD + TS(invoke 硬编码执行) → LLM 不参与
目标：Skill = MD(指导文本) → LLM 读指导 → 调用工具 → 画布/项目实时变化
```

新增一个 skill = 写一个 MD 文件。零 TypeScript。

## 1. 交互模型

### 用户看到什么

```
用户: "把这一幕的场景生成 3 张分镜卡，日系电影感"
                    ↓
chat:  [spinner] 正在执行 批量生成分镜...
                    ↓
画布:  [空白占位卡出现] sceneCard "开场·雨夜" (生成中...)
       [空白占位卡出现] sceneCard "追逐·天台" (生成中...)
       [空白占位卡出现] sceneCard "对峙"      (生成中...)
                    ↓
画布:  [卡片逐步加载] 雨夜卡片 → thumbnail 显示
       天台卡片 → thumbnail 显示（异步加载中...）
                     ↓
chat:  "已创建 3 张分镜场景卡。日系调色、手持运镜风格已统一施加。
        第 2 张还在生成中，预计 15 秒后完成。"
```

关键：**画布是对话的实时工作台，不只是最终结果的展示区。**

### 三个层面同时变化

| 层面 | 变化 | 触发 |
|------|------|------|
| Chat 面板 | streaming 文本、progress 提示 | SSE text_delta |
| 画布卡片 | 占位出现 → 内容填充 → thumbnail 加载 | tool_call → store mutation → React re-render |
| 项目树 | 新节点出现、状态变更 | tool_call → projectStore mutation |

## 2. LLM → Canvas 执行路径

### 2.1 上下文注入（skill 触发时）

用户输入 `/batch-storyboard 风格:"日系电影感 暖色调"`：

```
1. parseSlashCommand(text) → 匹配 batch-storyboard skill
2. parseArgTokens(remaining) → { 风格: "日系电影感 暖色调" }
3. 构建上下文消息，作为用户消息的扩展发送：
```

```typescript
// 注入 skill 上下文的格式
const augmentedMessage = {
  role: 'user',
  content: `用户使用 /batch-storyboard 触发了 skill「批量生成分镜」。
额外参数：风格=日系电影感 暖色调

## Skill 指导

当前项目是「都市奇缘」，有 3 幕 5 场景。
画布上已有 2 张卡片，其中 1 张有分镜图。

请按以下步骤执行：

1. 调用 get_tree 查看项目结构，确定哪些场景还没有分镜卡
2. 调用 get_canvas 查看画布上已有的 sceneCard，找出还没 thumbnail 的
3. 对所有缺失的场景，依次调用 add_card 创建 sceneCard（position 用 "auto"）
4. 对每张新卡片，调用 generate_storyboard 生成分镜图
5. 完成后在 chat 里总结创建了哪些卡、状态如何`, 
};
```

**接法**：不创建新的 system message。在 `tryRunSkill` 匹配到 skill 后，**改写用户原始消息**，把 skill 指导 append 到 user content 后面，然后走正常的 `sendMessage` 路径。

```
tryRunSkill(text)
  → 匹配 skill
  → 构建 augmentedContent = skill.instructions + "\n用户输入：" + text
  → 用 augmentedContent 替代原始 text
  → 正常发送 → useCopilotSSE.sendMessage(augmentedContent, projectId)
  → LLM 收到包含指导的用户消息
  → LLM 调用工具 → 画布/项目变化 → streaming 回答
```

**优点**：
- 不碰 `useCopilotSSE` 的会话创建/SSE 管道
- `sendMessage` 现有流程完全不变
- LLM 看到的就是一段 "用户说了 X，额外上下文 Y" 的消息

### 2.2 LLM 执行中的画布反馈

```
LLM 收到消息
  → LLM: tool_call: add_card { cardType: "sceneCard", title: "开场·雨夜", position: "auto" }
  → Vite 插件解析 tool_call → POST /tool → toolRouter
  → toolRouter.add_card → canvasStore.addNode
  → Zustand re-render → React Flow 显示新卡片
  → toolRouter 返回 "已创建 sceneCard(id: sc_01)"
  → LLM 收到 tool_call_done 结果 → 继续
  → LLM: tool_call: generate_storyboard { nodeId: "sc_01", prompt: "日系电影感的雨夜街头..." }
  → toolRouter.generate_storyboard → provider 生成图片
  → 图片写入卡片 thumbnail → 画布卡片显示 loading spinner
  → 生成完成 → thumbnail 更新 → 画布卡片显示图
  → toolRouter 返回 "分镜图已生成"
  → LLM: text_delta: "完成..."
```

**画布侧的 UI 增强**：
- `add_card` 后立即显示**半透明占位卡片**（type: `sceneCard`, status: `generating`）
- `generate_storyboard` 开始后卡片上显示 **spinner 或 shimmer**
- thumbnail URL 到达后 **卡片以 fade-in 过渡** 替换占位
- 如果单个操作超过 5 秒，卡片显示 **进度百分比**（由 provider 的 progress 回调驱动）

### 2.3 工具调用结果的规范化

当前 toolRouter 返回自然语言文本：

```
// 当前
add_card → "已添加 sceneCard「开场·雨夜」(id: sc_01)"

// 目标
add_card → { cardId: "sc_01", cardType: "sceneCard", position: { x: 0, y: 240 } }
```

用**结构化返回值**替代纯文本。前端和 LLM 都能消费：

```typescript
interface ToolResult {
  summary: string;           // "已创建 sceneCard「开场·雨夜」"
  sideEffects: {
    canvas?: {
      cardsAdded: [{ id: string; type: string; position: { x: number; y: number } }];
      cardsUpdated: [{ id: string; thumbnail?: string }];
      cardsDeleted: string[];
    };
    tree?: {
      nodesAdded: [{ id: string; parentId: string; type: string; title: string }];
      nodesUpdated: [{ id: string; status?: string; duration?: number }];
      nodesDeleted: string[];
    };
  };
}
```

- **LLM 看 `summary`** 决定下一步
- **前端看 `sideEffects`** 驱动 Canvas/Tree 的动画和状态
- tool_call_done 的 SSE 事件携带完整的 sideEffects 对象

## 3. 画布工具扩展

### 3.1 新增自动布局

```typescript
// Cards domain: add_card 扩展
add_card: (params: {
  action: 'add_card';
  cardType: 'character' | 'sceneCard' | 'storyline' | 'art' | 'deliverable';
  title: string;
  description?: string;
  thumbnail?: string;
  tags?: string[];
  // 新增：
  position?: { x: number; y: number } | 'auto';  // 'auto' → 智能网格布局
  linkedTreeNodeId?: string;  // 关联树节点
})
```

`position: "auto"` 时内部使用 flow 布局算法：从左到右，每行最多 3 张卡，间距 320px，超出换行。**LLM 完全不关心像素**。

### 3.2 批量卡片操作

```typescript
// 新增 tool: batch_add_cards（一次调多张）
batch_add_cards: (params: {
  action: 'batch_add_cards';
  cards: Array<{
    cardType: string;
    title: string;
    description?: string;
    tags?: string[];
    linkedTreeNodeId?: string;
  }>;
  position?: 'auto' | 'grid';
})
```

一次 tool_call 创建多张卡。前端会：
1. 所有卡以 `generating` 状态同步显示
2. 从左上角开始自动排列（grid 布局，3 列）
3. 如果某些卡关联了 tree node，自动 linkedTreeNodeId

### 3.3 渐进式卡片更新

```typescript
// 扩展 generate_storyboard 的结果结构
generate_storyboard: (params: {
  action: 'generate_storyboard';
  nodeId: string;
  prompt?: string;
  style?: string;
}) => {
  cardId: string;           // 被更新的卡片 id
  status: 'queued' | 'generating' | 'done' | 'failed';
  progress?: number;        // 0-100
  thumbnail?: string;       // done 时
  error?: string;           // failed 时
}
```

前端监听这些状态变化：
- `generating` → 卡片显示 shimmer
- progress 更新 → 卡片显示百分比条
- `done` → 卡片 fade-in 显示图
- `failed` → 卡片显示错误占位 + 重试按钮

## 4. Skill MD 格式

### 4.1 完整示例

```markdown
---
id: batch-storyboard
name: 批量生成分镜
description: 为所有缺失分镜的场景生成场景卡 + AI 分镜图
slashCommand: batch-storyboard
examples:
  - /batch-storyboard
  - /batch-storyboard 风格:"电影感 冷色调"
tools_suggested:
  - get_tree
  - get_canvas
  - add_card
  - generate_storyboard
---

# 批量生成分镜

## 目标

为当前项目中所有**还没有分镜图的场景**创建 sceneCard 并生成 AI 分镜参考图。

## 步骤

### 1. 了解现状
调用 `get_tree` 获取项目的幕/场景列表。
调用 `get_canvas` 获取画布上已有的卡片。

找出：
- 哪些场景在树上但画布上没有对应的 sceneCard？
- 画布上已有的 sceneCard 中哪些还没有 thumbnail（分镜图）？

### 2. 创建缺失的 sceneCard
对每个缺少 sceneCard 的场景，调用 `add_card`：
- `cardType`: "sceneCard"
- `title`: 场景名称（从 tree 获取）
- `description`: 场景的 metadata.description
- `linkedTreeNodeId`: 对应 tree node 的 id
- `position`: "auto"

不要一次性创建所有（可能很多）。每次创建 3-5 张，然后为它们生成分镜图，再继续。

### 3. 生成分镜图
对每个新创建或已有但无 thumbnail 的 sceneCard，调用 `generate_storyboard`：
- `nodeId`: 卡片的 id
- `prompt`: 结合场景描述和用户指定的风格生成 prompt

如果有 `风格` 参数（用户提供的），在所有 prompt 末尾附加它。

### 4. 汇报结果
完成后用以下格式汇报：
```
✅ 已创建 X 张场景卡，Y 张分镜图已生成
🎨 风格：{使用的风格}
📋 详细清单：
  - 「场景A」→ sceneCard 已创建 + 分镜图已生成
  - 「场景B」→ sceneCard 已创建 + 分镜图生成中（如果还在进行的话）
```
```

### 4.2 格式说明

| YAML 字段 | 用途 | 给谁看 |
|-----------|------|--------|
| `id` | 唯一标识 | registry 查找 |
| `name` | 显示名 | chip 标签、spinner |
| `description` | 一句话 | chip tooltip、模型描述 |
| `slashCommand` | 触发命令 | 用户输入 |
| `examples` | 示例 | chip tooltip、自动补全 |
| `tools_suggested` | 建议使用的工具 | LLM（仅建议，LLM 可自选） |
| 正文（`instructions`） | 分步骤的执行指导 | **LLM 核心指令** |

正文就是 LLM 的工作手册 — 分步骤讲清楚：先做什么、用什么工具、参数怎么填、输出什么格式。

### 4.3 不同 skill 的指导风格

**分析类**（analyze-pacing）：
```
1. 调工具获取数据
2. 分析数据，找出问题
3. 输出报告（自然语言 + 建议列表）
```

**创建类**（character-profile, batch-storyboard）：
```
1. 理解用户意图
2. 调用 add_card / batch_add_cards 创建卡片
3. 调用 generate_storyboard 生成媒体
4. 汇报结果
```

**操作类**（duplicate-project, export-storyboard-pdf）：
```
1. 调工具完成操作
2. 返回确认信息
```

## 5. Skills 在 `public/skills/` — 内容，不是代码

### 位置

```
public/skills/
├── index.json                  ← Vite 插件自动生成（build 时 scan）
├── analyze-pacing.md
├── batch-storyboard.md
├── character-profile.md
├── brainstorm-variants.md
├── duplicate-project.md
└── export-storyboard-pdf.md
```

### 与 `public/templates/` 同类

Templates 已经是静态内容文件（`public/templates/*.spellpaw-template.json`）。`public/skills/*.md` 是同一种东西 — 静态文本资源，Vite 原样复制到 `dist/`，不编译，不 bundle。

### 加载方式

```typescript
// shared/copilot/skills/loader.ts
// 启动时 fetch manifest，异步加载所有 skill MD

let skills: Skill[] = [];

export async function loadSkills(): Promise<Skill[]> {
  const manifest = await fetch('/skills/index.json').then(r => r.json());
  const loaded: Skill[] = [];
  for (const id of manifest.skills) {
    const res = await fetch(`/skills/${id}.md`);
    const md = await res.text();
    const { meta, body } = parseFrontmatter(md);
    loaded.push({
      id: meta.id as string,
      name: meta.name as string,
      description: meta.description as string,
      slashCommand: meta.slashCommand as string,
      examples: (meta.examples as string[]) ?? [],
      tools_suggested: (meta.tools_suggested as string[]) ?? [],
      instructions: body,
    });
  }
  skills = loaded;
  return skills;
}

export function getSkills(): Skill[] { return skills; }
```

### 新增 skill 的流程

```bash
touch public/skills/my-skill.md    # 写 YAML frontmatter + LLM 指导文本
# 重启 dev server（Vite 插件重新扫描 → 更新 index.json）
```

零 TypeScript，零 import，零注册。

### Vite 插件（自动 index.json）

新增 `vite-plugin-skill-manifest.ts`：

```typescript
export function skillManifestPlugin(): Plugin {
  return {
    name: 'skill-manifest',
    configureServer(server) {
      // Dev 模式：文件变化时重生成 index.json
      const regenerate = () => {
        const skillsDir = path.resolve(__dirname, 'public/skills');
        const files = fs.readdirSync(skillsDir).filter(f => f.endsWith('.md'));
        const ids = files.map(f => f.replace('.md', ''));
        fs.writeFileSync(path.join(skillsDir, 'index.json'), JSON.stringify({ skills: ids }));
      };
      regenerate();
      server.watcher.on('add', regenerate);
      server.watcher.on('unlink', regenerate);
    },
    generateBundle() {
      // Build 模式：构建时生成一次
      const skillsDir = path.resolve(__dirname, 'public/skills');
      const files = fs.readdirSync(skillsDir).filter(f => f.endsWith('.md'));
      const ids = files.map(f => f.replace('.md', ''));
      this.emitFile({ type: 'asset', fileName: 'skills/index.json', source: JSON.stringify({ skills: ids }) });
    },
  };
}
```

## 6. 新增 / 保留 / 删除

### 新增文件（工具扩展 + skill 基础设施）

| 文件 | 内容 |
|------|------|
| `drama/lib/canvasAutoLayout.ts` | `position: "auto"` 的网格布局算法 |
| `drama/stores/toolRouter/cards.ts` | 扩展 `add_card` 支持 auto，加 `batch_add_cards` |
| `drama/lib/toolCallEffects.ts` | 解析 toolRouter 返回的 `sideEffects`，驱动前端动画 |

### 保留并简化的文件

| 文件 | 改动 |
|------|------|
| `shared/copilot/skills/types.ts` | 删 `invoke`/`parameters`/`SkillContext`/`SkillResult`，保留 `id/name/description/slashCommand/examples/tools_suggested/instructions` |
| `shared/copilot/skills/frontmatter.ts` | 不变（YAML 解析不依赖 skill 类型变更） |
| `shared/copilot/skills/registry.ts` | 删 `skillToToolConfig`、`getAllSkillToolConfigs`。保留 lookup + parse + argTokens |
| `shared/copilot/skills/loader.ts` | 重写为 fetch-based（读 `public/skills/index.json` → 逐个 fetch MD） |
| `SkillChips.tsx` | 调 `getSkills()` from shared/copilot/skills/loader |
| `CopilotChat.tsx` / `ChatPanel.tsx` / `CopilotLabPage.tsx` | 去掉 `skills` prop（回退之前的 prop 传递链） |
| `drama/stores/chatStore.ts` | `sendMessage` 里的 slash-command 短路路径改为调用 runtime 的 `tryRunSkill` + `sendMessage` |
| `drama/hooks/useCopilotSSE.ts` | 同上 |
| `drama/lib/toolConfigs.ts` | 删 `getAllSkillToolConfigs()` spread |
| `drama/stores/toolRouter/index.ts` | 删 `registerSkillTools(toolRouter)` 调用 |

### 删除

| 文件 | 原因 |
|------|------|
| `src/apps/drama/skills/` 整个目录 | skills 搬到 `public/skills/` 了 |
| `src/shared/copilot/skills/chat.ts` | `isSlashCommand` / `buildSkillResultMessage` 保留需要的几个函数，其余删除 |
| 6 个 `.ts` invoke 文件 | 不存在了 |
| `loader.ts` / `builtIn.ts` (drama) | 不存在了 |
| `drama/skills/types.ts` | shared 的够用 |

## 6. 实现阶段

### Phase 1：删 invoke 体系（直接可上线）

1. 删 6 个 `.ts` invoke 文件 + `loader.ts` + `builtIn.ts` + `types.ts` + drama `chat.ts` + `registry.ts`
2. `Skill` 接口简化（删 `invoke`，加 `instructions`）
3. 重写 `drama/skills/chat.ts` 的 `tryRunSkill` + `executeSkill`：
   ```typescript
   export async function executeSkill(text, projectId) {
     const parsed = parseSlashCommand(text);
     const augmentedContent = appendSkillContext(text, parsed.skill, parsed.args);
     // 走正常 sendMessage 路径
     useChatStore.getState().sendMessage(augmentedContent, projectId);
     // 不再返回 ChatMessage — 后续由 LLM 的 SSE streaming接管
   }
   ```
4. `SkillChips` 恢复 `getAllSkills()` import（无依赖违规）
5. 测试适配（测匹配逻辑而非 invoke 结果）

### Phase 2：工具返回值结构化

1. 给 toolRouter 的 cards/tree 工具返回值加 `sideEffects` 字段
2. SSE `tool_call_done` 事件携带 `sideEffects`
3. 画布监听 sideEffects → 卡片状态变化
4. 卡片的 loading/shimmer/fade-in 动画

### Phase 3：画布实时反馈

1. `position: "auto"` + 网格布局
2. `batch_add_cards` tool
3. 画布占位卡片 + 进度指示
4. 工具执行期间的状态管理（queued → generating → done）

### Phase 4：Skill MD 内容深化

1. 将 6 个 skill 的正文从"人类文档"重写为"LLM 指导文本"
2. 每个 skill 测试能否被模型正确理解和执行
3. 调整指导文本的语气和详细程度

## 7. 风险与缓解

| 风险 | 缓解 |
|------|------|
| LLM 不按 skill 指导执行，或忽略关键步骤 | skill 指导文本写得具体、分步骤、给格式模板；可以在系统提示中增加 "你必须严格遵循 skill 指导" 的指令 |
| LLM 创建的卡片与项目脱节 | `linkedTreeNodeId` 确保卡片关联 tree node；add_card 时自动填充场景信息 |
| LLM 过度创建卡片 | skill 指导里明确"每批 3-5 张"、"仅对缺失的" |
| 异步生成（分镜图、视频）导致 LLM 等待超时 | generate_storyboard 返回 `queued` 状态，不等待完成；后续轮次确认 |
| Token 消耗 | skill 指导文本控制在 500 token 内（当前 6 个 skill 的指导约 200-400 tokens）；项目上下文用缩进文本格式（已有的 `treeToText` 很省 token） |

## 8. 整体收益

| 维度 | 当前 | 目标 |
|------|------|------|
| 新增 skill | MD + TS + loader 注册 + 测试（4 步，20 分钟） | MD（1 步，5 分钟） |
| 代码行数 | invoke 层 ~1200 行 TS | 全部删除 |
| 画布交互 | LLM 文本回答，用户手动操作画布 | LLM 直接操作画布，实时反馈 |
| LLM 能力利用 | 零（invoke 绕过 LLM） | 全部（LLM 决定步骤和工具调用） |
| 适应性 | 改逻辑 = 改 TS + 重新构建 | 改 MD = 刷新页面（HMR 自动加载） |
