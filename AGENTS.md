# Spellpaw — AI Agent 项目上下文

> 本文档为 AI agent 提供项目全局上下文。人类开发者 → 见 `docs/ROADMAP.md`。

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
| **Phase 2** | 🔜 即将启动 — AI 创作助手（Pandaria 集成 · Tool Server · 模板系统） |
| **分支** | `main`（Phase 1 已合并） |
| **测试** | 44 tests passing / 6 files / 0 failures |
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
├── stores/              # Zustand stores（核心状态）
│   ├── projectStore.ts  # 项目列表 + 树状结构 CRUD + 节点选中
│   ├── canvasStore.ts   # 画布节点/边/视口
│   ├── chatStore.ts     # Agent 对话消息
│   ├── detailStore.ts   # Detail Panel 状态（activeTab, draftFormData）
│   ├── authStore.ts     # 认证（mock）
│   └── sync.ts          # 树 ↔ 画布双向同步
├── components/
│   ├── tree-view/       # 左栏：树状项目结构
│   ├── asset-manager/   # 左栏下区：资产管理
│   ├── chat-panel/      # 中栏：Agent 对话
│   ├── detail-panel/    # 中栏：节点详情编辑
│   ├── flow-canvas/     # 右栏：无限画布
│   ├── modals/          # 模态框（新建项目、删除确认等）
│   └── ui/              # 通用 UI 组件（TabBar, FormField, EditableTitle 等）
├── pages/
│   ├── LoginPage.tsx       # /login
│   ├── ProjectListPage.tsx # /projects
│   └── WorkspacePage.tsx   # /project/:id — 三栏布局主界面
├── types/               # TypeScript 类型定义
├── hooks/               # 自定义 hooks
├── lib/                 # 工具函数（treeUtils, utils）
└── test/                # 测试工具
```

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
  id, type: 'sceneCard'|'assetCard'|'noteCard',
  position, data: { title, description, status, linkedTreeNodeId?, ... }
}

// Agent 对话
ChatMessage {
  id, role: 'user'|'agent'|'system',
  content, type: 'text'|'code'|'suggestion'|'action',
  timestamp, context?: { nodeId, nodeType }
}
```

**关键 store actions（toolRouter 依赖）：**

| Store | Actions |
|-------|---------|
| `projectStore` | `addTreeNode(parentId, node)` · `updateTreeNode(nodeId, updates)` · `deleteTreeNode(nodeId)` · `moveTreeNode(nodeId, newIndex)` · `getActiveTree()` |
| `canvasStore` | `addNode` · `updateNodeData` · `removeNode` · `duplicateNode` |
| `detailStore` | `setActiveTab` · `setDraftFormData` |

## 6. Phase 2 关键架构决策

### 6.1 Agent 集成：Pandaria

Spellpaw **不自己跑 LLM**。Agent 能力由 Pandaria（`../pandaria`，Rust 后端）提供：

| Pandaria 端点 | Spellpaw 用途 |
|--------------|-------------|
| `POST /api/v1/sessions` | 创建 Agent 会话，注入 system_prompt + 注册 tools |
| `PATCH /api/v1/sessions/{id}` | turn 前更新 system_prompt（项目结构变化时） |
| `POST /api/v1/sessions/{id}/messages` | 发送用户消息 |
| `GET /api/v1/sessions/{id}/events` | SSE 订阅：text_delta / tool_call_started / tool_call_done / turn_end |

### 6.2 Tool Server：WebSocket 桥接

Pandaria 的 HttpProxyTool 通过 HTTP 调用 tool。但 Zustand store 在浏览器内存。解决方案：

```
Pandaria POST /tool → Vite 插件（HTTP endpoint）
                     → WebSocket 转发给浏览器
                     → toolRouter 执行 store action
                     → 结果通过 WebSocket 返回
                     → Vite 插件响应 HTTP
```

**toolRouter 路由表：**

| action | store 调用 |
|--------|-----------|
| `add_node` | `projectStore.addTreeNode()` |
| `update_node` | `projectStore.updateTreeNode()` |
| `delete_node` | `projectStore.deleteTreeNode()` |
| `move_node` | `projectStore.moveTreeNode()` |
| `get_tree` | 只读返回缩进文本 |
| `get_subtree` | 只读返回子树缩进文本 |
| `apply_template` | 模板导入 → 批量 addTreeNode |
| `generate_storyboard` | 转发图像 API → 存入资产库 |

### 6.3 上下文管理：两层策略

```
system_prompt（~500 token，turn 前自动 PATCH）
  ├── 第一层：项目摘要 + 结构大纲（仅幕+场景，不含镜头）
  └── 第二层：镜头细节通过 get_subtree tool 按需获取
```

返回格式全部用**缩进文本或简短确认**（非 JSON），token 效率提升 40-60%。

### 6.4 Phase 3 协作：异步 push/pull

不做 CRDT 实时协作。短剧团队 2-5 人，工作流天然串行。用 Git-like 异步 push/pull + 节点级冲突检测 + diff 对比 UI。CRDT 按需在 Phase 4 升级。

## 7. 开发指引

### 常用命令

```bash
npm run dev           # 启动 Vite dev server（:5173）
npm test              # 运行全部测试（Vitest）
npm run test:watch    # 监听模式
npm run build         # 生产构建
```

### Phase 2 开发顺序

```
阶段 1: toolRouter（纯函数，无外部依赖，可立即开始）
  → src/stores/toolRouter.ts + toolRouter.test.ts

阶段 2: Vite 插件 Tool Server（HTTP + WebSocket bridge）
  → tool-server/spellpaw-tool-server.ts
  → 用 curl 自测

阶段 3: Pandaria 对接（session 配置 + SSE 消费）
  → 依赖本地 Pandaria 实例
  → Chat UI 用 mock SSE 先行开发

阶段 4: 叙事模板系统
  → 新增 NarrativeTemplate 类型 + 模板浏览器 UI
```

### 文件命名约定

- Store 文件：`src/stores/{name}Store.ts`，测试 `{name}Store.test.ts`
- 组件目录：`src/components/{feature-name}/`，含 `index.ts`
- 工具函数：`src/lib/{name}.ts`
- Phase 2 新增：`src/stores/toolRouter.ts`、`tool-server/`

### 代码风格

- 遵循 CLAUDE.md 的简洁原则。不引入多余抽象，不预设计
- 设计令牌严格使用 OKLCH 值 + CSS 自定义属性（不可用 HEX）
- 所有组件显式定义 Props 类型
- Store actions 使用 Immer 进行不可变更新

## 8. 关键文档索引

| 文档 | 路径 |
|------|------|
| 产品路线图（Phase 1-4） | `docs/ROADMAP.md` |
| 竞品分析 | `docs/competitive-analysis-higgsfield-topview.md` |
| Phase 1 需求规格 | `docs/specs/workspace_spec.md` |
| Phase 1 技术 spec | `docs/specs/2026-05-27-phase1-core-content-editing.md` |
| 设计系统 | `DESIGN.md` |
| Pandaria API 文档 | `../pandaria/docs/openapi.yaml` |
| 行为准则 | `CLAUDE.md` |

## 9. 与 Pandaria 的关系

- Pandaria 是独立项目（`../pandaria`），Rust 编写
- Spellpaw 是 Pandaria 的 **客户端**：创建 session、发送消息、消费 SSE
- Pandaria 的 HttpProxyTool 调用 Spellpaw 的本地 Tool Server
- 开发期：Pandaria 可本地启动（`../pandaria`），工具调用通过 `localhost:5173/tool`
- Pandaria 的完整 API 规格见 `../pandaria/docs/openapi.yaml`

---

*最后更新：2026-05-27*
