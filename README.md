# Spellpaw

面向短剧/短视频创作者的 **AI 辅助制作工具**。

- **结构即内容** — 幕→场景→镜头的树状叙事结构是创作骨架
- **对话即操作** — AI Agent 不仅是聊天对象，可直接修改项目结构
- **画布即工作台** — 无限画布上的卡片是思维的可视化延伸

---

## 当前状态

| 维度 | 状态 |
|------|------|
| **Phase 1** | ✅ 完成 — 本地内容编辑工具 |
| **Phase 2** | ✅ 完成 — AI 创作助手（Spellpaw Copilot · Tool Server · 模板系统 · Chat SSE · 节奏分析） |
| **Phase 3** | 🔄 进行中 — 云端基础设施（IndexedDB 缓存 · 自动同步引擎 · 冲突检测 UI · 模板市场） |
| **测试** | 104 tests passing / 10 files / 0 failures |
| **部署** | 本地 SPA（Vite dev server），暂无 Electron |

---

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器（:5173）
npm run dev

# 同时启动前后端
npm run dev:all

# 运行测试
npm test
```

---

## 技术栈

| 层 | 选型 |
|----|------|
| 框架 | React 19 + TypeScript 6.0 |
| 构建 | Vite 8 |
| 状态 | Zustand 5 + Immer |
| 样式 | Tailwind CSS 4 + OKLCH 色彩空间（Linear 风格设计系统） |
| 画布 | @xyflow/react（React Flow） |
| 拖拽 | @dnd-kit/core + @dnd-kit/sortable |
| 路由 | react-router-dom 7 |
| 测试 | Vitest + Testing Library + Playwright |
| Agent 后端 | Spellpaw Server / 可插拔 LLM 提供商 |

---

## 项目结构

```
src/
├── main.tsx                  # 全局入口
├── App.tsx                   # 根路由
├── index.css                 # Tailwind + OKLCH 设计令牌
├── shared/                   # 共享基础设施
│   ├── components/ui/        # 通用 UI 组件
│   ├── stores/               # 认证、主题
│   ├── lib/                  # 工具函数、IndexedDB 封装
│   ├── hooks/                # useHotkeys、useDebounce
│   └── types/                # 通用类型
└── apps/
    ├── portal/               # Portal 首页
    │   ├── pages/
    │   └── components/
    └── drama/                # Drama Studio（短剧创作）
        ├── pages/            # 页面（登录、项目列表、工作区、模板市场）
        ├── components/       # tree-view · chat-panel · flow-canvas · detail-panel ...
        ├── stores/           # projectStore · canvasStore · chatStore · toolRouter ...
        ├── hooks/            # useCopilotSSE · useToolBridge
        ├── lib/              # treeUtils · treeDiff · syncEngine · projectAnalysis ...
        └── types/            # TreeNode · CanvasNode · NarrativeTemplate ...
```

**Path Alias：** `@/` → `src/` · `@shared/` → `src/shared/` · `@drama/` → `src/apps/drama/`

---

## 架构概览

### Tool Server：WebSocket 桥接

Spellpaw Server 通过 HTTP 调用 tool，但 Zustand store 在浏览器内存。Vite 插件作为 HTTP ↔ WebSocket 转发层，不碰业务逻辑。

### 上下文管理：两层策略

| 层级 | 策略 | token 开销 |
|------|------|:---:|
| 第一层（项目大纲） | 每次 turn 前 PATCH system_prompt（仅幕+场景） | ~500 |
| 第二层（镜头细节） | LLM 按需调用 `get_subtree` tool | 按需 |

---

## 文档索引

| 文档 | 说明 |
|------|------|
| [`docs/ROADMAP.md`](docs/ROADMAP.md) | 产品路线图（Phase 1-4）、竞品分析、架构决策 |
| [`docs/competitive-analysis-buzzy-now.md`](docs/competitive-analysis-buzzy-now.md) | Buzzy.now 竞品对照分析（AI 视频编辑 / 对话式精修） |
| [`docs/competitive-analysis-higgsfield-topview.md`](docs/competitive-analysis-higgsfield-topview.md) | Higgsfield AI · Topview AI 竞品分析 |
| [`docs/topview-analysis-report.md`](docs/topview-analysis-report.md) | Topview AI 深度分析报告 |
| [`DESIGN.md`](DESIGN.md) | OKLCH 设计系统（色彩、排版、间距令牌） |
| [`CLAUDE.md`](CLAUDE.md) | 行为准则（AI agent 编码规范） |
| [`docs/decisions/`](docs/decisions/) | 架构决策记录（ADR-003 ~ ADR-012） |
| [`docs/specs/`](docs/specs/) | Phase 1 需求与技术规格 |
| [`docs/archive/`](docs/archive/) | 历史计划文档（Phase 0-2 任务计划） |
