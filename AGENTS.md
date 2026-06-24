# Spellpaw — AI Agent 项目上下文

> 本文档为 AI agent 提供项目全局上下文。人类开发者 → 见 `README.md` 和 `docs/ROADMAP.md`。

---

## 1. 项目是什么

Spellpaw 是面向短剧/短视频创作者的 **AI 辅助制作工具**。核心理念：

- **结构即内容** — 幕→场景→镜头的树状叙事结构是创作骨架
- **对话即操作** — AI Agent 不仅是聊天对象，可直接修改项目结构
- **画布即工作台** — 无限画布上的卡片是思维的可视化延伸

## 2. 当前状态

| 维度 | 状态 |
|------|------|
| **Phase 1** | ✅ 完成 — 本地内容编辑工具（树 CRUD · Detail Panel · 画布编辑 · 项目管理 · 双向同步） |
| **Phase 2** | ✅ 完成 — AI 创作助手（Spellpaw Copilot · Tool Server · 模板系统 · Chat SSE · 节奏分析 · 画布缩略图） |
| **Phase 3** | ✅ 完成 — 云端为主架构（Server 权威存储 · IndexedDB 只读缓存 · 即时同步 · 快照系统 · 模板市场本地版） |
| **分支** | `main` |
| **测试** | 292 tests passing / 36 files / 0 failures |
| **部署** | 本地 SPA（Vite dev server），暂无 Electron |

## 3. 技术栈

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

## 4. 项目结构

```
src/
├── main.tsx                  # 全局入口
├── App.tsx                   # 根路由（预留多 app 扩展位）
├── index.css                 # Tailwind + OKLCH 设计令牌（全局唯一）
├── shared/                   # 共享基础设施（所有 app 复用）
│   ├── components/
│   │   ├── ui/               # 通用 UI（Button, IconButton, Modal, TabBar, FormField, Lightbox...）
│   │   ├── canvas/           # 统一画布组件（FlowCanvasPanel + CardDetailDrawer + 卡片节点）
│   │   ├── chat-panel/       # 统一对话面板（ChatPanel + CopilotChat + 快捷操作 + 工作流引导）
│   │   └── builder/          # Builder 面板（AI 队友构建器）
│   ├── stores/
│   │   ├── authStore.ts      # 认证（所有 app 共用）
│   │   └── themeStore.ts     # 主题（所有 app 共用）
│   ├── lib/
│   │   ├── utils.ts          # cn, formatBytes, formatDate, generateId
│   │   └── idbStorage.ts     # IndexedDB 通用封装
│   ├── hooks/
│   │   ├── useHotkeys.ts
│   │   └── useDebounce.ts
│   ├── types/
│   │   └── index.ts          # 通用类型（User）
│   ├── i18n/                 # i18n 配置 + 翻译
│   ├── test/
│   │   └── setup.ts          # Vitest 测试环境
│   └── config.ts             # 全局配置
└── apps/
    ├── portal/               # Portal Landing（项目入口首页）
    │   ├── pages/
    │   │   └── PortalPage.tsx
    │   └── components/
    │       ├── Navbar.tsx    # 顶部导航（含主题切换）
    │       ├── HeroSection.tsx
    │       ├── AppCardsSection.tsx
    │       ├── FeaturesSection.tsx
    │       └── Footer.tsx
    └── drama/                # Drama Studio App（短剧/短视频创作）
        ├── pages/            # LoginPage, ProjectListPage, WorkspacePage, TemplateMarketPage
        ├── components/
        │   ├── tree-view/    # 左栏：树状项目结构
        │   ├── detail-panel/ # 节点详情编辑 + 节奏分析
        │   ├── asset-manager/# 资产管理
        │   ├── template-browser/
        │   └── modals/       # 模态框（含 SnapshotModal 快照管理）
        ├── layouts/
        │   ├── Navbar.tsx
        │   └── WorkspaceLayout.tsx
        ├── stores/
        │   ├── projectStore.ts
        │   ├── canvasStore.ts
        │   ├── chatStore.ts
        │   ├── detailStore.ts
        │   ├── customTemplateStore.ts
        │   └── toolRouter/      # 4 domains: tree / cards / generation / analysis
        ├── hooks/
        │   ├── useCopilotSSE.ts
        │   └── useToolBridge.ts
        ├── lib/
        │   ├── treeUtils.ts
        │   ├── treeDiff.ts
        │   ├── projectAnalysis.ts
        │   ├── syncEngine.ts
        │   ├── systemPrompt.ts
        │   └── ...
        ├── data/             # mockProjects, mockTreeData...
        └── types/
            └── index.ts      # Drama 专属类型（TreeNode, Project, NarrativeTemplate...）
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
// 树状结构
TreeNode {
  id, type: 'project'|'act'|'scene'|'shot',
  title, status: 'draft'|'in_progress'|'review'|'done',
  children?, expanded?,
  metadata?: { duration, description, location, timeOfDay, shotType,
               cameraMovement, dialogue, notes, createdAt, updatedAt }
}

// 画布节点（有 linkedTreeNodeId 时与树节点双向同步）
CanvasNode {
  id, type: 'script'|'art'|'character'|'deliverable'|'sceneCard',
  position, data: { title, description, status, linkedTreeNodeId?, thumbnail?, generatedPrompt?, tags?, ... }
}

// Agent 对话
ChatMessage {
  id, role: 'user'|'agent'|'system',
  content, type: 'text'|'code'|'suggestion'|'action',
  timestamp, context?: { nodeId, nodeType }
}

// 叙事模板（内置 / 用户自定义）
NarrativeTemplate {
  id, name, category, description,
  targetDuration, targetPlatform, structure: { acts: [...] },
  stylePresets, tags, author?, version
}
```

**关键 store actions（toolRouter 依赖）：**

| Store | Actions |
|-------|---------|
| `projectStore` | `addTreeNode(parentId, node)` · `updateTreeNode(nodeId, updates)` · `deleteTreeNode(nodeId)` · `moveTreeNode(nodeId, newIndex)` · `getActiveTree()` |
| `canvasStore` | `addNode` · `updateNodeData` · `removeNode` · `duplicateNode` |
| `detailStore` | `setActiveTab` · `setDraftFormData` |
| `customTemplateStore` | `addTemplate` · `removeTemplate` · `updateTemplate` · `importFromFile` · `getTemplateById(id)` |

## 6. Phase 2 关键架构决策

### 6.1 Agent 集成：Spellpaw Copilot

Spellpaw **不自己跑 LLM**。Agent 能力由 Spellpaw Server 或可插拔 LLM 提供商通过 REST + SSE + Tool Calling 提供：

| Spellpaw Server 端点 | 用途 |
|--------------|-------------|
| `POST /api/v1/sessions` | 创建 Agent 会话，注入 system_prompt + 注册 tools |
| `POST /api/v1/sessions/{id}/messages` | 发送用户消息 |
| `GET /api/v1/sessions/{id}/events` | SSE 订阅：text_delta / tool_call_started / tool_call_done / turn_end |

### 6.2 Tool Server：WebSocket 桥接

Spellpaw Server 通过 HTTP 调用 tool，但 Zustand store 在浏览器内存。解决方案：

```
Spellpaw Server POST /tool → Vite 插件（HTTP endpoint）
                          → WebSocket 转发给浏览器
                          → toolRouter 执行 store action
                          → 结果通过 WebSocket 返回
                          → Vite 插件响应 HTTP
```

**toolRouter 路由表（按 domain 分组，共 23 个 tool）：**

#### Tree domain（7 个 — 维护项目幕/场景/镜头骨干）

| action | 实现 |
|--------|------|
| `get_tree` | `useProjectStore.getCurrentTree()` → `treeToText()` |
| `get_subtree` | `findNode(tree, nodeId)` → `treeToText(subtree)` |
| `add_node` | `createNodeHandler(parentId, type, title, metadata)` |
| `update_node` | `updateNodeHandler(nodeId, changes)` |
| `delete_node` | `deleteNodeHandler(nodeId)` |
| `move_node` | `useProjectStore.moveTreeNode(nodeId, newIndex)` |
| `apply_template` | 复用 `applyTemplateCore(store, templateId, parentId?)` 共享 helper |

#### Cards domain（5 个 — 画布卡片 CRUD）

| action | 实现 |
|--------|------|
| `get_canvas` | `useCanvasStore.getCurrentNodes()` → 缩进文本 |
| `add_card` | `addCanvasCardHandler()` + 自动定位 |
| `update_card` | `useCanvasStore.updateNodeData(cardId, updates)` |
| `delete_card` | `useCanvasStore.removeNode(cardId)` |
| `clear_canvas` | 原子 setState + `triggerPushNow()` 同步 |

#### Generation domain（6 个 — AI 内容生成）

| action | 实现 |
|--------|------|
| `generate_asset` / `generate_variants` / `edit_asset` | 转发 `canvasToolkit.*` |
| `apply_style` / `batch_apply_style` | 转发 `canvasToolkit.*` |
| `generate_storyboard` | `providerRegistry.select` + `submit` + 创建 `art` 卡片 |

#### Analysis domain（5 个 — 结构 / 节奏诊断 + kickstart）

| action | 实现 |
|--------|------|
| `analyze_structure` | `suggestCompletions(tree)` + `analyzePacing(tree)` |
| `get_pacing_report` | `generatePacingReport(tree)` |
| `match_template` | `scoreTemplates(corpus)` |
| `optimize_pacing` | `generatePacingReport(tree)` + 干预 `metadata.duration` |
| `kickstart_project` | 跨域：调用 `applyTemplateCore` + `addEnrichedCard`（共享 helper） |

#### 共享 helper（不在 tool 表面，供 kickstart/skills 调用）

| helper | 来源 | 用途 |
|--------|------|------|
| `applyTemplateCore(store, templateId, parentId?)` | `toolRouter/tree.ts` | 跨域被 kickstart 调用，避免 toolRouter 循环 |
| `addEnrichedCard(cardType, data, position?)` | `toolRouter/cards.ts` | 带验证+富化的卡片创建，被 kickstart + skills 调用 |

#### Skill tools（N — 动态注册）

| action | 实现 |
|--------|------|
| `spellpaw_skill_*` | `skills/registry.ts` 的 `registerSkillTools(router)` 运行时注册 |

### 6.3 上下文管理：两层策略

```
system_prompt（~500 token）
  ├── 第一层：项目摘要 + 结构大纲（仅幕+场景，不含镜头）
  └── 第二层：镜头细节通过 get_subtree tool 按需获取
```

返回格式全部用**缩进文本或简短确认**（非 JSON），token 效率提升 40-60%。

### 6.4 Phase 3 存储：云端为主

Server 是**唯一权威数据源**。本地 Zustand store + IndexedDB 为**只读缓存**（加速二次打开）。

```
编辑 → Zustand store（乐观更新）→ 500ms debounce → push 到 server
                                         ├── 成功：更新 server version
                                         └── 409 冲突：server wins，拉取覆盖本地

打开项目 → IndexedDB 缓存秒开 → 后台拉 server 最新覆盖
```

不做 CRDT 实时协作。无离线编辑模式。网络异常时 toast 提示，修改在下次连接时重试推送。

## 7. 开发指引

### 常用命令

```bash
npm run dev           # 启动 Vite dev server（:5173）
npm run dev:server    # 启动后端 dev server（端口由 server/.env 的 PORT 决定）
npm run dev:all       # 同时启动前后端
npm test              # 运行全部测试（Vitest）
npm run test:watch    # 监听模式
npm run build         # 生产构建
npm run lint          # ESLint（前端）
npm run lint:server   # tsc --noEmit（server 目录）
```

### Phase 2 开发顺序（已全部完成）

```
✅ 阶段 1: toolRouter（纯函数，无外部依赖）
  → src/apps/drama/stores/toolRouter.ts + toolRouter.test.ts

✅ 阶段 2: Vite 插件 Tool Server（HTTP + WebSocket bridge）
  → tool-server/spellpaw-tool-server.ts

✅ 阶段 3: Copilot 对接（session 配置 + SSE 消费）
  → src/apps/drama/hooks/useCopilotSSE.ts + src/apps/drama/lib/systemPrompt.ts
  → ChatPanel 已切换为真实 SSE

✅ 阶段 4: 叙事模板系统
  → src/apps/drama/types/index.ts (NarrativeTemplate)
  → src/apps/drama/components/template-browser/TemplateBrowser.tsx
  → public/templates/*.spellpaw-template.json (5 个内置模板)

✅ 阶段 5: 模板系统完善（自定义模板导出/导入 + 模板市场本地版）
  → src/apps/drama/stores/customTemplateStore.ts
  → src/apps/drama/lib/templateExportImport.ts
  → src/apps/drama/pages/TemplateMarketPage.tsx

✅ 阶段 6: AI 分镜画布体验（缩略图 lightbox + 批量生成 + 风格锁）
  → src/shared/components/ui/Lightbox.tsx
  → src/apps/drama/components/flow-canvas/nodes/SceneCardNode.tsx（thumbnail 展示）

✅ 阶段 7: 智能分析与推荐（节奏分析）
  → src/apps/drama/lib/projectAnalysis.ts + projectAnalysis.test.ts
  → src/apps/drama/components/detail-panel/AnalysisReport.tsx
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
- Phase 2 新增：`src/apps/drama/stores/toolRouter.ts`、`tool-server/`
- Phase 3 新增：`src/shared/lib/idbStorage.ts`、`src/apps/drama/lib/syncEngine.ts`、`src/apps/drama/lib/migrateToIDB.ts`、`src/apps/drama/lib/treeDiff.ts`、`src/apps/drama/lib/projectSync.ts`、`src/apps/drama/lib/projectSnapshot.ts`、`src/apps/drama/stores/customTemplateStore.ts`

### 代码风格

- 遵循 CLAUDE.md 的简洁原则。不引入多余抽象，不预设计
- 设计令牌严格使用 OKLCH 值 + CSS 自定义属性（不可用 HEX）
- 所有组件显式定义 Props 类型
- Store actions 使用 Immer 进行不可变更新

## 8. 关键文档索引

| 文档 | 路径 |
|------|------|
| 项目 README（人类入口） | `README.md` |
| 产品路线图（Phase 1-4） | `docs/ROADMAP.md` |
| 竞品分析 | `docs/competitive-analysis-higgsfield-topview.md` |
| Topview 深度分析 | `docs/topview-analysis-report.md` |
| Phase 1 需求规格 | `docs/specs/workspace_spec.md` |
| Phase 1 技术 spec | `docs/specs/2026-05-27-phase1-core-content-editing.md` |
| 设计系统 | `DESIGN.md` |
| 行为准则 | `CLAUDE.md` |
| 架构决策记录（ADR） | `docs/decisions/ADR-003.md` ~ `ADR-012.md` |
| 历史归档（Phase 0-1 计划） | `docs/archive/` |

---

*最后更新：2026-06-20（Phase 3 完成：云端为主架构，去除离线模式）*
