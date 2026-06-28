# Spellpaw — AI Agent 项目上下文

> 本文档为 AI agent 提供项目全局上下文。人类开发者 → 见 `README.md` 和 `DEPLOY.md`。

---

## 1. 项目是什么

Spellpaw 是面向短剧/短视频创作者的 **AI 辅助制作工具**。核心理念：

- **画布即骨架** — 10 种卡片在无限画布上自由组织：storyline 串成故事线、moodboard 定调、sceneCard 拍分镜、art / videoClip 放成片
- **对话即操作** — AI Agent 不仅是聊天对象，可直接在画布上增删改卡片
- **技能即流程** — 34 个 slash command skill（节奏分析 / 批量分镜 / 导演 / 摄影等）把常用工作流打包成可重用的 prompt 模板

## 2. 当前状态

| 维度 | 状态 |
|------|------|
| **Phase 1** | ✅ 完成 — 本地内容编辑工具 |
| **Phase 2** | ✅ 完成 — AI 创作助手（Spellpaw Copilot · Tool Server · Chat SSE · 节奏分析） |
| **Phase 3** | ✅ 完成 — 云端为主架构（Server 权威存储 · IndexedDB 只读缓存 · 即时同步） |
| **Phase 4** | ✅ 完成 — per-Capability LLM routing（34 skills · 9 capability buckets · slash autocomplete · 单进程部署） |
| **分支** | `main` |
| **测试** | 487 passing / 57 files / 0 failures |
| **部署** | 单 Node process（API + 前端 SPA + Tool Server）→ [DEPLOY.md](DEPLOY.md) |

## 3. 技术栈

| 层 | 选型 |
|----|------|
| 框架 | React 19 + TypeScript 6.0 |
| 构建 | Vite 8（前端）+ tsc（后端 ESM，NodeNext 模式）|
| 状态 | Zustand 5 + Immer |
| 样式 | Tailwind CSS 4 + OKLCH 色彩空间（Linear 风格设计系统） |
| 画布 | @xyflow/react（React Flow） |
| 拖拽 | @dnd-kit/core + @dnd-kit/sortable |
| 路由 | react-router-dom 7 |
| 后端 | Express 5 + Prisma 6（SQLite）+ ws 8 |
| 测试 | Vitest + Testing Library + Playwright |
| Agent | Spellpaw Server / 可插拔 LLM 提供商（REST + SSE + Tool Calling）|

## 4. 项目结构

```
spellpaw/
├── src/                          # 前端 SPA
│   ├── main.tsx                  # 初始化 theme + skills loader
│   ├── App.tsx                   # 根路由
│   ├── index.css                 # Tailwind + OKLCH 设计令牌
│   ├── shared/                   # 跨 app 共享基础设施
│   │   ├── components/
│   │   │   ├── ui/               # Button, IconButton, Modal, Textarea, Lightbox, ProviderSelect…
│   │   │   ├── canvas/           # FlowCanvasPanel + CardDetailDrawer + 卡片节点
│   │   │   └── chat-panel/       # ChatPanel + CopilotChat + MessageInput (slash autocomplete)
│   │   ├── stores/               # authStore, themeStore
│   │   ├── lib/                  # utils, idbStorage
│   │   ├── hooks/                # useHotkeys, useDebounce
│   │   ├── copilot/skills/       # ★ Phase 4: 34 skills 运行时
│   │   │   ├── types.ts          #   Skill interface (id, name, description, slashCommand, parameters, instructions)
│   │   │   ├── loader.ts         #   fetch /skills/index.json + 各 MD，模块级缓存 + subscribeToSkills
│   │   │   ├── frontmatter.ts    #   mini YAML parser
│   │   │   ├── registry.ts       #   纯函数 (getSkillById / parseSlashCommand / skillToToolConfig)
│   │   │   ├── chat.ts           #   isSlashCommand / buildSkillResultMessage
│   │   │   ├── augment.ts        #   buildSkillPrompt (app-agnostic 通用 prompt builder)
│   │   │   ├── useSkills.ts       #   React hook (subscribe + isLoading)
│   │   │   ├── _testHelpers.ts   #   test-only fetch stub + fixture loaders
│   │   │   └── __fixtures__/      #   6 fixture MDs（与 public/skills/ 同步）
│   │   ├── i18n/
│   │   └── test/setup.ts
│   └── apps/
│       ├── portal/               # Portal Landing
│       └── drama/                # Drama Studio（短剧创作）
│           ├── pages/            # LoginPage, ProjectListPage, WorkspacePage
│           ├── components/       # detail-panel, asset-manager, modals, layouts, flow-canvas
│           ├── stores/           # projectStore, canvasStore, chatStore, detailStore, toolRouter
│           ├── hooks/            # useCopilotSSE, useToolBridge
│           ├── lib/              # projectAnalysis, systemPrompt, capabilityConfig, imageGen,
│           │                     # proactiveInsights, skillAugment
│           └── types/            # CanvasNode, ChatMessage, Project, Asset
├── server/                       # 后端 Express + Prisma + ws（单进程部署）
│   ├── src/
│   │   ├── index.ts              # REST API + 静态前端 + tool server 全部挂载
│   │   ├── toolServer.ts         # POST /tool + WS /tool-ws（生产版，原 Vite 插件的等价物）
│   │   ├── routes/               # auth, projects, chat, llm, proxy
│   │   ├── lib/                  # llmClient, logger, providers
│   │   ├── middleware.ts         # JWT auth
│   │   ├── seed.ts               # 自动 seed demo user
│   │   └── prisma/schema.prisma  # User, Project, Chat, llmConfigs (JSON)
│   └── package.json
├── public/skills/                # 34 个 skill 的 .md 文件（运行时 fetch）
├── tool-server/                  # 旧 Vite 插件版（开发用）
├── vite.config.ts                # Vite 配置（skillManifestPlugin 自动生成 index.json）
├── DEPLOY.md                     # 云服务器部署指南（5 步）
├── CHANGELOG.md                  # 版本变更日志
└── package.json
```

**Path Alias：**
- `@/` → `src/`（保留兼容）
- `@shared/` → `src/shared/`
- `@drama/` → `src/apps/drama/`
- `@console/` → `src/apps/console/`
- `@canvas/` → `src/shared/components/canvas/`
- `@chat/` → `src/shared/components/chat-panel/`

## 5. 核心数据模型

```typescript
// 画布节点（项目主要内容载体 — Phase 4 canvas-first）
type CanvasNodeType =
  | 'storyline'    // 故事线卡片
  | 'moodboard'    // 情绪板
  | 'videoClip'    // 视频片段
  | 'asset'        // 素材资源
  | 'task'         // 任务/批注
  | 'art'          // AI 生成图
  | 'character'    // 角色卡
  // Legacy — 读时迁移到上面的新类型
  | 'script'       // → storyline children
  | 'deliverable'  // → videoClip | asset
  | 'sceneCard';   // → storyline

CanvasNode {
  id, type: CanvasNodeType,
  position, data: { title, description, status, thumbnail?, generatedPrompt?, tags?, colors?, ... }
  // legacy 字段: linkedTreeNodeId (保留向后兼容，但树结构已删除)
}

// Agent 对话
ChatMessage {
  id, role: 'user'|'agent'|'system',
  content, type: 'text'|'code'|'suggestion'|'action',
  timestamp, context?: { nodeId, nodeType }
}

// LLM per-capability 配置（Phase 4）
type Capability =
  | 'text2image' | 'image2image' | 'inpaint'
  | 'text2video' | 'image2video' | 'styleTransfer'
  | 'text2audio' | 'text2model' | 'image2model';

type ModelConfig = {
  provider: 'doubao' | 'openai' | 'deepseek' | 'minimax' | 'siliconflow';
  apiKey: string;
  baseUrl: string;
  model: string;
};

// Skill（Phase 4）
type Skill = {
  id: string;  // = slug = slashCommand
  name: string;
  description: string;     // LLM 看到的能力描述（指向当前 atomic tools）
  slashCommand: string;    // e.g. 'analyze-pacing'
  examples: string[];
  parameters: { type, properties, required };
  instructions: string;    // MD body（augment 时注入 LLM prompt）
};
```

**关键 store actions（toolRouter 依赖）：**

| Store | Actions |
|-------|---------|
| `projectStore` | `createProject(title, desc, coverColor)` · `updateProject(id, updates)` · `deleteProject(id)` · `setCurrentProject(id)` |
| `canvasStore` | `addNode` · `updateNodeData` · `removeNode` · `duplicateNode` |
| `detailStore` | `setActiveTab` · `setDraftFormData` |
| `chatStore` | `sendMessage` · `abortTurn` · `regenerateLast` · （含 slash command 检测 + invocation marker） |

## 6. Phase 4 关键架构决策

### 6.1 Skill 系统：文档而非 Tool

Skills **不是** LLM-callable tools，而是写在 `public/skills/{id}.md` 的 LLM 提示模板：

```
public/skills/index.json (34 entries)
  → Vite dev/build 时 vite-plugin-skill-manifest 自动生成
  → 浏览器运行时 fetch('/skills/index.json') + fetch('/skills/{id}.md')
  → loader.ts 解析 frontmatter + body，缓存到模块作用域
```

**调用链：**
```
用户在 chat 输入 "/"                              ← MessageInput autocomplete (ProviderSelect-like)
              ↓
输入 "analyze" → autocomplete 过滤
              ↓
Enter / Tab / 点击                              ← MessageInput.applySkill
              ↓
textarea 变为 "/analyze-pacing "               ← 完整 slashCommand + 自动加空格
              ↓
Enter → chatStore.sendMessage
              ↓
isSlashCommand(content) → true
              ↓
两个并发动作:
  ① chat history 加 "🎯 调用 Skill：节奏分析（/analyze-pacing）" marker
  ② augmentUserMessage(content, projectId)      ← drama-specific wrapper
       ↓
       buildSkillPrompt(text, { contextLine, toolHint })  ← shared 通用 builder
       ↓
       parseSlashCommand → 找到 skill
       ↓
       拼 markdown prompt:
         "用户使用 /analyze-pacing 触发了 skill「节奏分析」。
          当前项目：proj_1
          ## Skill 指导
          [skill.description + skill.instructions body]
          ## 用户提供的参数
          ...
          请按上述意图，使用可用的画布工具（get_canvas / add_card / ...）完成用户请求。
          ---
          原始用户输入：/analyze-pacing"
              ↓
useCopilotSSE → 发给 LLM (or mockAgentReply in dev)
              ↓
LLM 看到 augmented prompt → 调 atomic tools
```

**系统 prompt 也更新（45c9f5b commit）：**
- 明确说 "Skills are NOT registered as tools. You cannot call spellpaw_skill_*"
- 列出现有 skills: `Available skills: /analyze-pacing (节奏分析), /art-direction (...), ...`
- 让 LLM 知道 slash command 流程

### 6.2 Tool Server：Express + ws 单进程

Phase 4 把 Tool Server 从 Vite 插件搬到 Express，实现单进程部署：

```
src/shared/copilot/skills/tool-server/spellpaw-tool-server.ts  ← 开发环境（Vite 插件）
src/shared/copilot/skills/server/src/toolServer.ts             ← 生产环境（Express + ws）
```

两者协议相同（POST /tool + WS /tool-ws），通过 `attachToolServer(app, httpServer)` 在 server/src/index.ts 挂载到同一 http.Server。

### 6.3 Per-Capability LLM Routing

LLM 配置不再用 3 个 per-provider key（openaiApiKey / doubaoApiKey / minimaxApiKey），改成单一 `llmConfigs` JSON 字段：

```prisma
model User {
  id           String  @id @default(uuid())
  email        String  @unique
  passwordHash String
  name         String
  llmConfigs   String?  // JSON: Partial<Record<Capability, ModelConfig>>
  ...
}
```

Drama canvas toolkit 通过 `capabilityConfig.getCapabilityConfig(capability: Capability)` 读取，自动注入到每个 action 的 provider.configure() 调用。

**前端**：console Integrations 页面提供 9 张独立 capability 卡 + ProviderSelect dropdown 保存。

### 6.4 上下文管理

`buildSystemPrompt` 调用 `canvasToPromptText` 把画布上所有卡片以缩进文本（`画布共 N 张卡片：...`）注入 system_prompt。返回格式全用文本（非 JSON），便于 LLM 直接理解，避免 JSON 解析 token 开销。

### 6.5 Phase 3 存储：云端为主

Server 是**唯一权威数据源**。本地 Zustand store + IndexedDB 为**读写缓存**（乐观更新 + 离线保留编辑）；冲突时与 server 合并，同 id 以本地为准。

```
编辑 → Zustand store（乐观更新）→ 500ms debounce → push 到 server
                                         ├── 成功：更新 server version
                                         └── 409 冲突：拉取 server 版本，与本地待提交编辑合并（同 id 以本地为准），然后重新 push

打开项目 → IndexedDB 缓存秒开 → 后台拉 server 最新并与本地合并
```

不做 CRDT 实时协作。无离线编辑模式。网络异常时 toast 提示，修改在下次连接时重试推送。

## 7. Skill 文件迁移与拆分

`public/skills/*.md` 是 34 个 skill 的运行时源，**git tracked**。两个迁移脚本维护它：

| 脚本 | 用途 |
|------|------|
| `scripts/migrate-research-skills.mjs` | 从 `skills/{SLUG}/SKILL.md`（含 references/）拼成单文件 runtime .md，写到 public/skills/ + __fixtures__/ |
| `scripts/split-cinematography.mjs` | 把 cinematography-strategy-designer 的 9 个 reference 拆成独立 sub-skill |
| `scripts/skill-descriptions.mjs` | 18 个迁移 skill 的 curated Copilot-tool-aligned descriptions |

**修改 skill 后流程：**
1. 编辑 `skills/{slug}/SKILL.md`（源）
2. `node scripts/migrate-research-skills.mjs` 重新生成 public/skills/{slug}.md + __fixtures__/{slug}.md
3. commit

## 8. 开发指引

### 常用命令

```bash
npm run dev           # 启动 Vite dev server（:5173）
npm run dev:server    # 启动后端 dev server（tsx watch，端口由 server/.env 的 PORT 决定）
npm run dev:all       # 同时启动前后端

npm test              # 运行全部测试（Vitest）
npm run test:watch    # 监听模式
npm run test:e2e      # Playwright 端到端

npm run build         # vite build (frontend) + tsc (server) → dist/
npm start             # node server/dist/index.js（生产模式）
npm run db:push       # Prisma schema → SQLite

npm run lint          # ESLint（前端 + 自动 lint server/src/toolServer.ts）
npm run lint:server   # tsc --noEmit（server 目录）
```

### 文件命名约定

- **Shared 层**（所有 app 复用）
  - UI 组件：`src/shared/components/ui/{Name}.tsx`
  - 通用 stores：`src/shared/stores/{name}Store.ts`
  - 通用 lib：`src/shared/lib/{name}.ts`
- **App 层**（drama 及未来 app）
  - Store 文件：`src/apps/{app}/stores/{name}Store.ts`，测试 `{name}Store.test.ts`
  - 组件目录：`src/apps/{app}/components/{feature-name}/`，含 `index.ts`
  - 工具函数：`src/apps/{app}/lib/{name}.ts`，测试 `{name}.test.ts`
- **Skill 运行时**：`src/shared/copilot/skills/{module}.ts`

### 代码风格

- 遵循 CLAUDE.md 的简洁原则。不引入多余抽象，不预设计
- 设计令牌严格使用 OKLCH 值 + CSS 自定义属性（不可用 HEX）
- 所有组件显式定义 Props 类型
- Store actions 使用 Immer 进行不可变更新

### Cloud 部署

单进程部署：编辑 `server/.env` → `npm run db:push && npm run build && npm start`。
详见 [DEPLOY.md](DEPLOY.md)。需要 nginx/Caddy 做 TLS + WebSocket upgrade headers 转发。

## 9. 关键文档索引

| 文档 | 路径 |
|------|------|
| 项目 README（人类入口） | [README.md](README.md) |
| 云部署指南 | [DEPLOY.md](DEPLOY.md) |
| 版本变更日志 | [CHANGELOG.md](CHANGELOG.md) |
| 设计系统 | [DESIGN.md](DESIGN.md) |
| 行为准则 | [CLAUDE.md](CLAUDE.md) |
| 产品路线图 | [docs/ROADMAP.md](docs/ROADMAP.md) |
| Phase 4 spec | [docs/superpowers/specs/2026-06-22-console-text-image-video-categories-design.md](docs/superpowers/specs/2026-06-22-console-text-image-video-categories-design.md) |
| 架构决策记录（ADR） | [docs/decisions/](docs/decisions/) |
| Phase 1 需求规格 | [docs/specs/workspace_spec.md](docs/specs/workspace_spec.md) |
| 历史归档（Phase 0-3 计划） | [docs/archive/](docs/archive/) |

---

*最后更新：2026-06-28（Phase 4 完成：per-Capability LLM routing + 34 skills + 单进程云部署）*