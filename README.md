# Spellpaw

面向短剧/短视频创作者的 **AI 辅助制作工具**。

- **画布即骨架** — 10 种卡片在无限画布上自由组织：storyline 串成故事线、moodboard 定调、sceneCard 拍分镜、art / videoClip 放成片
- **对话即操作** — AI Agent 不仅是聊天对象，可直接在画布上增删改卡片
- **技能即流程** — 34 个 slash command skill（节奏分析 / 批量分镜 / 导演 / 摄影等）把常用工作流打包成可重用的 prompt 模板

---

## 当前状态

| 维度 | 状态 |
|------|------|
| **Phase 1** | ✅ 完成 — 本地内容编辑工具 |
| **Phase 2** | ✅ 完成 — AI 创作助手（Copilot · Tool Server · Chat SSE · 节奏分析） |
| **Phase 3** | ✅ 完成 — 云端为主架构（Server 权威存储 · IndexedDB 只读缓存 · 即时同步） |
| **Phase 4** | ✅ 完成 — per-Capability LLM routing（[v0.4.0](CHANGELOG.md)，34 skills · 9 media buckets · slash autocomplete） |
| **测试** | 487 passing / 57 files / 0 failures |
| **部署** | 单 Node process（API + 前端 SPA + Tool Server）→ 见 [DEPLOY.md](DEPLOY.md) |

---

## 快速开始

```bash
# 安装
npm install && (cd server && npm install) && cd ..

# 开发模式（Vite :5173 + Server :3002）
npm run dev:all

# 单进程生产模式
npm run db:push && npm run build && npm start

# 运行测试
npm test

# 浏览器端到端测试
npm run test:e2e
```

详见 [DEPLOY.md](DEPLOY.md) — 云服务器 5 步部署。

---

## 技术栈

| 层 | 选型 |
|----|------|
| 框架 | React 19 + TypeScript 6.0 |
| 构建 | Vite 8（前端）+ tsc（后端）|
| 状态 | Zustand 5 + Immer |
| 样式 | Tailwind CSS 4 + OKLCH 色彩空间（Linear 风格设计系统） |
| 画布 | @xyflow/react（React Flow） |
| 拖拽 | @dnd-kit/core + @dnd-kit/sortable |
| 路由 | react-router-dom 7 |
| 后端 | Express 5 + Prisma 6（SQLite）+ ws |
| 测试 | Vitest + Testing Library + Playwright |
| Agent | Spellpaw Server / 可插拔 LLM 提供商（REST + SSE + Tool Calling）|

---

## 项目结构

```
spellpaw/
├── src/                              # 前端 SPA
│   ├── main.tsx                      # 全局入口（初始化 theme + skills loader）
│   ├── App.tsx                       # 根路由
│   ├── index.css                     # Tailwind + OKLCH 设计令牌
│   ├── shared/                       # 跨 app 共享基础设施
│   │   ├── components/
│   │   │   ├── ui/                   # Button, IconButton, Modal, Textarea, Lightbox, ProviderSelect…
│   │   │   ├── canvas/               # 统一画布（FlowCanvasPanel + CardDetailDrawer）
│   │   │   └── chat-panel/           # 统一对话面板（ChatPanel + CopilotChat + MessageInput + skill autocomplete）
│   │   ├── stores/                   # authStore, themeStore
│   │   ├── lib/                      # utils, idbStorage
│   │   ├── hooks/                    # useHotkeys, useDebounce
│   │   ├── copilot/skills/           # Skill 运行时：loader, frontmatter, registry, augment, useSkills, chat
│   │   ├── i18n/
│   │   └── test/setup.ts
│   └── apps/
│       ├── portal/                   # Portal 首页（营销 + 项目入口）
│       └── drama/                    # Drama Studio（短剧创作 app）
│           ├── pages/                # LoginPage, ProjectListPage, WorkspacePage, ConsolePage
│           ├── components/           # detail-panel, asset-manager, modals, layout, flow-canvas
│           ├── stores/               # projectStore, canvasStore, chatStore, detailStore, toolRouter
│           ├── hooks/                # useCopilotSSE, useToolBridge
│           ├── lib/                  # projectAnalysis, capabilityConfig, proactiveInsights, skillAugment…
│           └── types/                # CanvasNode, ChatMessage, Project, Asset
├── server/                           # 后端 Express + Prisma + ws
│   ├── src/
│   │   ├── index.ts                  # REST API + 静态前端 + tool server（single process）
│   │   ├── toolServer.ts             # POST /tool + WS /tool-ws (生产版，原 Vite 插件的等价物)
│   │   ├── routes/                   # auth, projects, chat, llm, proxy
│   │   ├── lib/                      # llmClient, logger, providers
│   │   ├── middleware.ts             # JWT auth
│   │   ├── seed.ts                   # 自动 seed demo user
│   │   └── prisma/schema.prisma      # User, Project, Chat, llmConfigs (JSON)
│   └── package.json
├── public/skills/                    # 34 个 skill 的 .md 文件（运行时按需 fetch）
├── tool-server/                      # 旧 Vite 插件版（开发用）
├── vite.config.ts                    # Vite 配置（含 skillManifestPlugin）
├── DEPLOY.md                         # 云服务器部署指南
├── CHANGELOG.md                      # 版本变更日志
└── package.json
```

**Path Alias：** `@/` → `src/` · `@shared/` → `src/shared/` · `@drama/` → `src/apps/drama/` · `@console/` → `src/apps/console/` · `@canvas/` → `src/shared/components/canvas/` · `@chat/` → `src/shared/components/chat-panel/`

---

## 架构概览

### 单进程云部署

```
┌─────────── Node process (server/dist/index.js) ────────────┐
│                                                             │
│  Express HTTP server (PORT=3002)                            │
│  ├── /api/auth/*          REST 认证 + JWT                   │
│  ├── /api/projects/*      项目 CRUD                          │
│  ├── /api/chat/*          聊天历史持久化                     │
│  ├── /api/v1/*            LLM SSE 代理 + OpenAI 兼容          │
│  ├── /tool  (POST)        浏览器端 tool 执行                  │
│  ├── /tool-ws (WS)        浏览器 ↔ Spellpaw Server 桥接       │
│  └── /{*splat}  (GET)     SPA fallback → ../dist/index.html   │
│                                                             │
│  Prisma + SQLite (server/prisma/spellpaw.db)               │
│  ws WebSocket server (same http.Server)                      │
└─────────────────────────────────────────────────────────────┘
```

### Skill 系统（Phase 4）

Skills 是 **LLM 提示模板**，写在 `public/skills/{id}.md`：

- 用户在 chat 输入 `/`，inline autocomplete 弹出 34 个 skill
- 选中后 `/skill-name ` 插入输入框，按 Enter 提交
- `chatStore.sendMessage` 检测 slash command → `augmentUserMessage` 注入完整 skill 文档（含 description + instructions + 原始输入）
- 改写后的 prompt 发给 LLM → LLM 按指引调 atomic tools（get_canvas / generate_asset / etc.）
- Skills **不是** LLM-callable tool —— 是文档

34 个 skills 涵盖：6 个手写（节奏分析、批量分镜等）+ 18 个 research（director-briefing、storyboard-creator、video-creator 等）+ 9 个 cinematography 子 skill（shot-size、camera-movement、camera-angle、transitions、styles、fight、equipment、axis-continuity、vocabulary）+ 1 个 cinematographer 编排器。

### LLM 配置：Per-Capability Routing

`User.llmConfigs`（JSON 字段）按 Capability 键存独立配置：

```typescript
type LlmConfigs = Partial<Record<Capability, ModelConfig>>;
// Capability = 'text2image' | 'image2image' | 'inpaint' | 'text2video'
//          | 'image2video' | 'styleTransfer' | 'text2audio'
//          | 'text2model'  | 'image2model'

type ModelConfig = {
  provider: 'doubao' | 'openai' | 'deepseek' | 'minimax' | 'siliconflow';
  apiKey: string;
  baseUrl: string;
  model: string;
};
```

不同能力用不同 provider/model（如 text2image 用 doubao-seedream，image2image 用 siliconflow FLUX.2-dev）。前端 console Integrations 页面提供 9 张独立卡 + ProviderSelect dropdown 保存。

### Agent 集成

Spellpaw **不自己跑 LLM**。Agent 能力由 Spellpaw Server 或可插拔 LLM 提供商通过 REST + SSE + Tool Calling 提供：

| 端点 | 用途 |
|------|------|
| `POST /api/v1/sessions` | 创建 Agent 会话，注入 system_prompt + 注册 tools |
| `POST /api/v1/sessions/{id}/messages` | 发送用户消息 |
| `GET /api/v1/sessions/{id}/events` | SSE 订阅：text_delta / tool_call_started / tool_call_done / turn_end |
| `POST /tool` | Spellpaw Server → 浏览器执行 store action |
| `WS /tool-ws` | 浏览器订阅 tool 调用 |

### 上下文管理

`buildSystemPrompt` 调用 `canvasToPromptText` 把画布上所有卡片以缩进文本（`画布共 N 张卡片：...`）注入 system_prompt。返回格式全用文本（非 JSON），便于 LLM 直接理解，避免 JSON 解析 token 开销。

---

## 文档索引

| 文档 | 说明 |
|------|------|
| [**DEPLOY.md**](DEPLOY.md) | 云服务器部署指南（5 步：clone / edit .env / db:push / build / start）|
| [**CHANGELOG.md**](CHANGELOG.md) | 版本变更日志 |
| [docs/ROADMAP.md](docs/ROADMAP.md) | 产品路线图 + 架构决策 |
| [DESIGN.md](DESIGN.md) | OKLCH 设计系统 |
| [CLAUDE.md](CLAUDE.md) | AI agent 编码规范 |
| [docs/decisions/](docs/decisions/) | ADR 架构决策记录 |
| [docs/specs/](docs/specs/) | 需求与技术规格 |
| [docs/competitive-analysis-*.md](docs/) | 竞品分析 |
| [docs/archive/](docs/archive/) | 历史计划文档 |

---

## 版本

最新发布：**v0.4.0-phase4-llm-capabilities**（[tag](https://github.com/0xnicholas/Spellpaw/releases/tag/v0.4.0-phase4-llm-capabilities) · 2026-06-28）

变更见 [CHANGELOG.md](CHANGELOG.md)。