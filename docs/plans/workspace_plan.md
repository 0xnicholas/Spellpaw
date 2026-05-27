# Spellpaw — 实施计划

> 版本: 1.1  
> 日期: 2026-05-19  
> 对应 spec: `docs/specs/workspace_spec.md`  
> 修订记录: 补充依赖（immer/react-markdown/react-hotkeys-hook/radix-ui/context-menu）、简化响应式策略、重写 canvasStore 状态边界、调整时间估算、标记 P2 功能

---

## 1. 技术选型与版本锁定

```json
{
  "dependencies": {
    "react": "^19.1.0",
    "react-dom": "^19.1.0",
    "react-router-dom": "^7.6.0",
    "zustand": "^5.0.5",
    "@xyflow/react": "^12.6.0",
    "react-resizable-panels": "^2.1.0",
    "lucide-react": "^0.511.0",
    "clsx": "^2.1.1",
    "tailwind-merge": "^3.3.0",
    "immer": "^10.1.0",
    "react-markdown": "^10.0.0",
    "react-hotkeys-hook": "^5.0.0",
    "@radix-ui/react-context-menu": "^2.2.0"
  },
  "devDependencies": {
    "@types/react": "^19.1.0",
    "@types/react-dom": "^19.1.0",
    "@vitejs/plugin-react": "^4.5.0",
    "typescript": "~5.8.0",
    "vite": "^6.3.0",
    "tailwindcss": "^4.1.0",
    "@tailwindcss/vite": "^4.1.0"
  }
}

**新增依赖说明**：
- `immer`：不可变更新树状结构，避免手动展开深层节点出错
- `react-markdown`：Agent 消息 Markdown 渲染（粗体、列表、代码块）
- `react-hotkeys-hook`：键盘快捷键（Cmd+K、Cmd+Enter 等）
- `@radix-ui/react-context-menu`：无障碍右键菜单基座（定位、焦点管理、点击外部关闭）
```

**选型说明**：
- `clsx` + `tailwind-merge`：处理条件类名和 Tailwind 类冲突
- Tailwind CSS v4：原生 CSS 配置，无需传统 `tailwind.config.js`
- React Router v7：使用 data API 风格的 `<BrowserRouter>`
- Zustand：无需 Provider，直接 import 使用

---

## 2. 项目初始化步骤

### Step 1: 脚手架
```bash
npm create vite@latest . -- --template react-ts
```

### Step 2: 安装依赖
```bash
npm install react-router-dom zustand @xyflow/react react-resizable-panels lucide-react clsx tailwind-merge immer react-markdown react-hotkeys-hook @radix-ui/react-context-menu
npm install -D @tailwindcss/vite tailwindcss
```

### Step 3: 配置文件

**vite.config.ts**
```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
})
```

**tsconfig.json**（追加 paths）
```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
```

**index.html**（添加 Inter 字体）
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
```

---

## 3. 文件清单与职责

### 3.1 基础设施

| 文件 | 职责 | 优先级 |
|------|------|--------|
| `src/main.tsx` | React 根挂载，RouterProvider | P0 |
| `src/App.tsx` | 路由定义，全局布局 | P0 |
| `src/index.css` | Tailwind import + CSS Variables + 全局样式 | P0 |
| `src/lib/utils.ts` | `cn()` 工具函数（clsx + tailwind-merge） | P0 |
| `src/lib/tokens.ts` | 设计令牌处理：JSON → CSS Variables 生成 | P1 |
| `src/types/index.ts` | 全局类型定义 | P0 |

### 3.2 状态管理

| 文件 | 职责 | 优先级 |
|------|------|--------|
| `src/stores/authStore.ts` | 登录态、用户信息、登录/登出 action | P0 |
| `src/stores/projectStore.ts` | 项目列表 CRUD、当前项目、树数据 | P0 |
| `src/stores/chatStore.ts` | 消息历史、发送消息、加载态 | P0 |
| `src/stores/canvasStore.ts` | react-flow 节点/边、viewport、选中态 | P0 |
| `src/stores/panelStore.ts` | 面板尺寸、折叠状态持久化 | P2 |

### 3.3 基础 UI 组件

| 文件 | Props 接口 | 职责 | 优先级 |
|------|-----------|------|--------|
| `src/components/ui/Button.tsx` | `variant`, `size`, `children`, `onClick`, `disabled`, `loading` | 按钮，4 种 variant | P0 |
| `src/components/ui/Input.tsx` | `value`, `onChange`, `placeholder`, `type` | 单行输入框 | P0 |
| `src/components/ui/Textarea.tsx` | `value`, `onChange`, `placeholder`, `rows` | 多行输入框 | P0 |
| `src/components/ui/Badge.tsx` | `variant`, `children` | 标签徽章 | P0 |
| `src/components/ui/PanelHeader.tsx` | `title`, `icon`, `actions?` | 面板标题栏 | P0 |
| `src/components/ui/Divider.tsx` | `className?` | 1px 分割线 | P0 |
| `src/components/ui/IconButton.tsx` | `icon`, `onClick`, `label`, `active?` | 图标按钮 | P1 |
| `src/components/ui/ContextMenu.tsx` | `items`, `children` | 右键菜单 | P1 |
| `src/components/ui/EmptyState.tsx` | `icon`, `title`, `description?`, `action?` | 空状态提示 | P1 |

### 3.4 页面

| 文件 | 职责 | 优先级 |
|------|------|--------|
| `src/pages/LoginPage.tsx` | 登录表单，mock 认证 | P0 |
| `src/pages/ProjectListPage.tsx` | 项目卡片网格，创建项目 | P0 |
| `src/pages/WorkspacePage.tsx` | 三栏布局容器 | P0 |

### 3.5 布局

| 文件 | 职责 | 优先级 |
|------|------|--------|
| `src/layouts/WorkspaceLayout.tsx` | ResizablePanels 三栏外壳 | P0 |
| `src/layouts/Navbar.tsx` | 顶部导航栏 | P0 |

### 3.6 左栏组件

| 文件 | 职责 | 优先级 |
|------|------|--------|
| `src/components/tree-view/TreeViewPanel.tsx` | 树状视图面板容器 | P0 |
| `src/components/tree-view/TreeNode.tsx` | 单个树节点（递归） | P0 |
| `src/components/tree-view/TreeSearch.tsx` | 树搜索框 | P1 |
| `src/components/asset-manager/AssetManagerPanel.tsx` | 资产管理器面板容器 | P0 |
| `src/components/asset-manager/AssetTabs.tsx` | 标签页切换 | P0 |
| `src/components/asset-manager/AssetList.tsx` | 文件列表 | P0 |
| `src/components/asset-manager/AssetGrid.tsx` | 网格视图（P2） | P2 |
| `src/components/asset-manager/AssetToolbar.tsx` | 顶部工具栏 | P1 |

### 3.7 中栏组件

| 文件 | 职责 | 优先级 |
|------|------|--------|
| `src/components/chat-panel/ChatPanel.tsx` | 对话面板容器 | P0 |
| `src/components/chat-panel/MessageList.tsx` | 消息列表 + 自动滚动 | P0 |
| `src/components/chat-panel/MessageItem.tsx` | 单条消息渲染 | P0 |
| `src/components/chat-panel/MessageInput.tsx` | 输入框 + 发送按钮 | P0 |
| `src/components/chat-panel/QuickActions.tsx` | 快捷操作按钮栏 | P1 |
| `src/components/chat-panel/ContextBar.tsx` | 当前上下文显示 | P1 |

### 3.8 右栏组件

| 文件 | 职责 | 优先级 |
|------|------|--------|
| `src/components/flow-canvas/FlowCanvasPanel.tsx` | react-flow 画布容器 | P0 |
| `src/components/flow-canvas/nodes/SceneCardNode.tsx` | 场景卡片节点 | P0 |
| `src/components/flow-canvas/nodes/AssetCardNode.tsx` | 素材卡片节点 | P0 |
| `src/components/flow-canvas/nodes/NoteCardNode.tsx` | 便签卡片节点 | P0 |
| `src/components/flow-canvas/NodeContextMenu.tsx` | 节点右键菜单 | P1 |
| `src/components/flow-canvas/CanvasToolbar.tsx` | 画布缩放控制 | P1 |

### 3.9 Mock 数据

| 文件 | 职责 | 优先级 |
|------|------|--------|
| `src/data/mockProjects.ts` | 项目列表 mock 数据 | P0 |
| `src/data/mockTreeData.ts` | 树状结构 mock 数据 | P0 |
| `src/data/mockChatData.ts` | 对话历史 mock 数据 | P0 |
| `src/data/mockAssets.ts` | 资产列表 mock 数据 | P0 |
| `src/data/mockCanvasData.ts` | 画布节点/边 mock 数据 | P0 |

---

## 4. 开发阶段

### Phase 0: 项目初始化（~30 分钟）
- [ ] Vite 脚手架 + 依赖安装
- [ ] 配置路径别名、Tailwind v4、字体
- [ ] 将 design tokens 转为 CSS Variables
- [ ] 创建 `src/types/index.ts`
- [ ] 创建 `src/lib/utils.ts`（cn 函数）
- [ ] 验证：`npm run dev` 可正常启动

### Phase 1: 基础 UI 组件（~45 分钟）
按依赖顺序：
1. `Divider` → `PanelHeader` → `Badge`
2. `Button`（依赖 Badge 做 loading）
3. `Input` → `Textarea`
4. `EmptyState`
5. `IconButton`
6. `ContextMenu`

每个组件：定义 Props 接口 → 实现 → 在 App.tsx 中快速 visually 验证

### Phase 2: 状态管理 + Mock 数据（~30 分钟）
1. 创建 4 个 store（auth, project, chat, canvas）
2. 创建 5 个 mock 数据文件
3. store 初始化时从 localStorage 读取，变更时写入
4. 验证：在浏览器 DevTools Console 可查看和操作 store

### Phase 3: 页面框架（~30 分钟）
1. `App.tsx` 路由配置
2. `Navbar` 组件
3. `LoginPage`（视觉完整，表单校验）
4. `ProjectListPage`（网格卡片，点击进入工作区）
5. `WorkspacePage` 外壳（仅显示三栏占位）

### Phase 4: 左栏 — 树状视图（~45 分钟）
1. `TreeNode` 递归组件
   - 缩进层级（16px * depth）
   - 展开/折叠箭头图标
   - 状态圆点（根据 status）
   - hover / selected 样式
2. `TreeViewPanel`
   - 集成搜索过滤
   - 右键菜单（新增/重命名/删除）
3. 联动：选中节点更新 chatStore 的 context
4. 树拖拽排序（同级节点间）标记为 **P2**，本次迭代暂不实现

### Phase 5: 左栏 — 资产管理器（~30 分钟）
1. `AssetTabs` 切换
2. `AssetList` 列表项渲染
3. `AssetToolbar` 搜索 + 视图切换
4. DnD：设置 `draggable=true`，`dataTransfer.setData('assetId', id)`

### Phase 6: 中栏 — Agent 对话（~60 分钟）
1. `MessageItem`
   - 角色区分样式（user 右/ agent 左）
   - Markdown 渲染（仅 bold, list, code block）
   - 代码块复制按钮
   - 时间戳格式化
2. `MessageList` + 自动滚动
3. `MessageInput` + `Cmd+Enter` 发送
4. `QuickActions` 快捷按钮
5. `ContextBar` 当前节点路径显示

### Phase 7: 右栏 — 无限画布（~90 分钟）
1. `FlowCanvasPanel`
   - 配置 ReactFlow provider
   - 背景 DotPattern
   - 迷你地图 + 控件
2. 三种节点类型实现
   - `SceneCardNode`：标题 + 描述 + 状态 badge
   - `AssetCardNode`：图标 + 文件名 + 类型标签
   - `NoteCardNode`：彩色背景 + 文本
3. 画布交互
   - 接收 DnD：drop handler 读取 assetId，创建新节点
   - 右键菜单：删除 / 复制
4. 联动：双击 sceneCard → projectStore 选中对应树节点

### Phase 8: 布局整合（~30 分钟）
1. `WorkspaceLayout`
   - 外层 ResizablePanels（水平三栏）
   - 左栏内层 ResizablePanels（垂直两区）
   - 设置 defaultSize / minSize / maxSize
2. 面板折叠按钮（中栏可收起）
3. 移动端检测（<768px 显示提示页）

### Phase 9: 联动与打磨（~75 分钟）
1. 跨栏联动实现
2. 键盘快捷键（`useHotkeys` hook）
3. 加载状态（骨架屏）
4. 空状态处理
5. 动画微调（过渡时长、缓动）
6. 滚动条样式

### Phase 10: 验证与收尾（~30 分钟）
1. TypeScript 严格检查（`npx tsc --noEmit`）
2. 清理 console.log / 调试代码
3. 验证所有验收标准
4. 更新 AGENTS.md（如有需要）

**总计预估：~9.5 小时**

---

## 5. 状态管理详细设计

### 5.1 authStore

```typescript
interface AuthState {
  isAuthenticated: boolean;
  user: { id: string; name: string; email: string; avatar?: string } | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
}
```

**实现要点**：
- `login` 始终返回 true（mock）
- localStorage key: `spellpaw_auth`
- 页面刷新时自动恢复登录态

### 5.2 projectStore

```typescript
interface ProjectState {
  projects: Project[];
  currentProjectId: string | null;
  treeData: TreeNode | null;
  selectedNodeId: string | null;
  
  setCurrentProject: (id: string) => void;
  updateTreeNode: (nodeId: string, updates: Partial<TreeNode>) => void;
  addTreeNode: (parentId: string, node: TreeNode) => void;
  deleteTreeNode: (nodeId: string) => void;
  toggleExpanded: (nodeId: string) => void;
  selectNode: (nodeId: string | null) => void;
  
  // 计算属性
  selectedNodePath: () => string[];
}
```

**实现要点**：
- 树操作为不可变更新（immer 或手动展开）
- `selectedNodePath` 从当前节点向上回溯到根
- localStorage key: `spellpaw_project_${projectId}`

### 5.3 chatStore

```typescript
interface ChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  inputValue: string;
  
  sendMessage: (content: string) => void;
  setInputValue: (value: string) => void;
  appendMessage: (message: ChatMessage) => void;
  clearMessages: () => void;
}
```

**实现要点**：
- `sendMessage` 先添加 user 消息，再模拟延迟后添加 agent 回复
- agent 回复根据当前 context（选中节点）生成不同内容
- localStorage key: `spellpaw_chat_${projectId}`

### 5.4 canvasStore

**状态管理边界原则**：

```
Zustand (持久化层)          React Flow (运行时层)
─────────────────────       ───────────────────
persistedNodes      ←─────  onNodesChange 回调同步
persistedEdges      ←─────  onEdgesChange 回调同步
viewport            ←─────  onMoveEnd 回调同步

初始化：Zustand 数据 → ReactFlowProvider
运行时：React Flow 内部状态为主，变更通过回调回写 Zustand
```

```typescript
interface CanvasState {
  // 持久化数据（localStorage 保存）
  persistedNodes: CanvasNode[];
  persistedEdges: CanvasEdge[];
  viewport: { x: number; y: number; zoom: number };
  
  // 由 React Flow 回调触发的同步 setter
  syncNodes: (nodes: CanvasNode[]) => void;
  syncEdges: (edges: CanvasEdge[]) => void;
  syncViewport: (viewport: Viewport) => void;
  
  // 业务操作（直接操作持久化数据 + 触发 React Flow 重渲染）
  addNode: (node: CanvasNode) => void;
  addNodeFromAsset: (asset: AssetItem, position: XYPosition) => void;
  removeNode: (id: string) => void;
  duplicateNode: (id: string) => void;
  addEdge: (edge: CanvasEdge) => void;
  removeEdge: (id: string) => void;
  
  // 从树节点同步
  syncFromTreeNode: (node: TreeNode) => void;
}
```

**实现要点**：
- React Flow 组件内使用 `useNodesState(persistedNodes)` 和 `useEdgesState(persistedEdges)` 初始化
- `onNodesChange` / `onEdgesChange` / `onMoveEnd` 回调中调用 `syncNodes` / `syncEdges` / `syncViewport`
- `syncFromTreeNode`：检查 `persistedNodes` 中是否已存在对应节点，无则创建、有则更新 `data`
- localStorage key: `spellpaw_canvas_${projectId}`

---

## 6. 关键组件接口定义

### 6.1 Button

```typescript
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  children: React.ReactNode;
}
```

### 6.2 TreeNode (递归)

```typescript
interface TreeNodeProps {
  node: TreeNode;
  depth: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onToggle: (id: string) => void;
  onContextMenu: (e: React.MouseEvent, node: TreeNode) => void;
}
```

### 6.3 MessageItem

```typescript
interface MessageItemProps {
  message: ChatMessage;
}
```

### 6.4 Flow Canvas Node Data

```typescript
// 统一节点 data 接口
interface NodeData {
  title: string;
  description?: string;
  status?: 'draft' | 'in_progress' | 'review' | 'done';
  thumbnail?: string;
  tags?: string[];
  color?: string;
  onDoubleClick?: () => void;
}
```

---

## 7. Mock 数据详细内容

### 7.1 项目列表

```typescript
const mockProjects = [
  {
    id: 'proj_1',
    title: '都市奇缘',
    description: '一部关于都市白领爱情的短剧',
    updatedAt: '2026-05-18T10:30:00Z',
    sceneCount: 8,
    duration: 180, // 预估总时长秒
    coverColor: '#6366f1',
  },
  {
    id: 'proj_2',
    title: '密室逃脱',
    description: '悬疑推理类短视频系列',
    updatedAt: '2026-05-15T14:20:00Z',
    sceneCount: 5,
    duration: 120,
    coverColor: '#8b5cf6',
  },
];
```

### 7.2 树状数据（见 spec.md 默认结构）

### 7.3 对话历史

```typescript
const mockChatMessages = [
  {
    id: 'msg_1',
    role: 'agent',
    content: '欢迎使用 Spellpaw！我已加载了《都市奇缘》的项目结构。目前项目包含 3 幕、8 个场景、共 18 个镜头。有什么可以帮您的？',
    type: 'text',
    timestamp: '2026-05-19T09:00:00Z',
  },
  {
    id: 'msg_2',
    role: 'user',
    content: '帮我看看第一幕的结构是否合理',
    type: 'text',
    timestamp: '2026-05-19T09:01:00Z',
  },
  {
    id: 'msg_3',
    role: 'agent',
    content: '第一幕「相遇」目前的结构如下：\n\n1. 咖啡厅初遇（3 镜头）— 时长约 45 秒\n2. 街头偶遇（2 镜头）— 时长约 30 秒\n\n**分析：**\n- 开篇 establishing shot 很好，能快速建立场景\n- 建议增加一个「错过」的小插曲，提升张力\n- 第一幕总时长 75 秒，符合短视频节奏',
    type: 'text',
    timestamp: '2026-05-19T09:01:30Z',
    actions: [
      { id: 'act_1', label: '添加「错过」场景', type: 'insert_scene' },
      { id: 'act_2', label: '优化镜头分配', type: 'custom' },
    ],
  },
];
```

### 7.4 画布初始数据

```typescript
const mockCanvasNodes = [
  {
    id: 'canvas_scene_1',
    type: 'sceneCard',
    position: { x: 100, y: 150 },
    data: { title: '场景 1-1', description: '咖啡厅初遇', status: 'done' },
  },
  {
    id: 'canvas_scene_2',
    type: 'sceneCard',
    position: { x: 400, y: 150 },
    data: { title: '场景 1-2', description: '街头偶遇', status: 'in_progress' },
  },
  {
    id: 'canvas_note_1',
    type: 'noteCard',
    position: { x: 250, y: 350 },
    data: { title: '备注', description: '第一幕需要在 90 秒内完成', color: '#fef3c7' },
  },
];

const mockCanvasEdges = [
  { id: 'e1-2', source: 'canvas_scene_1', target: 'canvas_scene_2', animated: true },
];
```

---

## 8. 设计系统集成细节

### 8.1 CSS Variables 生成

从 `design/dist/tokens.json` 提取并展开为：

```css
:root {
  /* 基础色 */
  --color-base-white: oklch(100% 0 250);
  --color-base-gray-50: oklch(98% 0.005 250);
  /* ... 共 12 个灰阶 */
  
  /* 强调色 */
  --color-accent-50: oklch(95% 0.05 275);
  --color-accent-500: oklch(55% 0.2 275);
  /* ... 共 10 个等级 */
  
  /* 语义映射 */
  --color-bg-primary: var(--color-base-white);
  --color-bg-secondary: var(--color-base-gray-50);
  --color-bg-tertiary: var(--color-base-gray-100);
  --color-text-primary: var(--color-base-gray-900);
  --color-text-secondary: var(--color-base-gray-600);
  --color-border-default: var(--color-base-gray-200);
  
  /* 字体 */
  --font-family-display: 'Inter Display', 'Inter', system-ui, sans-serif;
  --font-family-body: 'Inter', system-ui, sans-serif;
  --font-family-mono: 'SF Mono', 'Fira Code', monospace;
  
  /* 字号 */
  --font-size-xs: 0.75rem;
  --font-size-sm: 0.875rem;
  --font-size-base: 1rem;
  --font-size-lg: 1.125rem;
  --font-size-xl: 1.25rem;
  --font-size-2xl: 1.5rem;
  
  /* 间距 */
  --spacing-1: 4px;
  --spacing-2: 8px;
  --spacing-3: 12px;
  --spacing-4: 16px;
  /* ... */
  
  /* 圆角 */
  --radius-sm: 2px;
  --radius-base: 4px;
  --radius-lg: 8px;
}
```

### 8.2 Tailwind v4 配置

在 `src/index.css` 中使用 `@theme` 指令：

```css
@import "tailwindcss";

@theme {
  --color-bg-primary: var(--color-bg-primary);
  --color-bg-secondary: var(--color-bg-secondary);
  --color-bg-tertiary: var(--color-bg-tertiary);
  --color-text-primary: var(--color-text-primary);
  --color-text-secondary: var(--color-text-secondary);
  --color-text-tertiary: var(--color-text-tertiary);
  --color-border-default: var(--color-border-default);
  --color-accent-50: var(--color-accent-50);
  --color-accent-100: var(--color-accent-100);
  --color-accent-500: var(--color-accent-500);
  --color-accent-600: var(--color-accent-600);
  
  --font-family-display: var(--font-family-display);
  --font-family-body: var(--font-family-body);
  --font-family-mono: var(--font-family-mono);
  
  --font-size-xs: var(--font-size-xs);
  --font-size-sm: var(--font-size-sm);
  --font-size-base: var(--font-size-base);
  
  --spacing-1: var(--spacing-1);
  --spacing-2: var(--spacing-2);
  --spacing-3: var(--spacing-3);
  --spacing-4: var(--spacing-4);
  
  --radius-sm: var(--radius-sm);
  --radius-base: var(--radius-base);
  --radius-lg: var(--radius-lg);
}
```

### 8.3 全局样式补充

```css
body {
  font-family: var(--font-family-body);
  color: var(--color-text-primary);
  background: var(--color-bg-primary);
  -webkit-font-smoothing: antialiased;
}

/* 自定义滚动条 */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: var(--color-base-gray-300);
  border-radius: 3px;
}
::-webkit-scrollbar-thumb:hover {
  background: var(--color-base-gray-400);
}

/* 数字等宽 */
.tabular-nums {
  font-feature-settings: "tnum";
}
```

---

## 9. 构建输出

### 9.1 开发命令

```bash
npm run dev      # Vite 开发服务器 localhost:5173
npm run build    # 生产构建 → dist/
npm run preview  # 预览生产构建
npx tsc --noEmit # TypeScript 类型检查
```

### 9.2 生产构建产物

```
dist/
├── index.html
├── assets/
│   ├── index-*.js
│   ├── index-*.css
│   └── vendor-*.js
└── favicon.ico
```

---

## 10. 风险与应对

| 风险 | 影响 | 应对 |
|------|------|------|
| Tailwind v4 与某些库兼容性 | 样式异常 | 如遇到问题，回退到 Tailwind v3 |
| react-resizable-panels 与 react-flow 滚动冲突 | 画布缩放异常 | 确保 ResizablePanel 的 `style` 设置 `overflow: hidden`，react-flow 内部处理滚动 |
| 树状数据深层更新性能 | 操作卡顿 | 使用 immer 或确保不可变更新只影响目标分支 |
| localStorage 数据量过大 | 存储失败 | 单项目控制 < 200KB，长期迁移至 IndexedDB |

---

## 11. 后续迭代建议

1. **真实 API 接入**：替换 mock service，接入 LLM API
2. **协作功能**：多用户实时同步（WebSocket / Yjs）
3. **媒体预览**：视频播放器、图片灯箱
4. **导出功能**：项目结构导出为 PDF/Excel
5. **画布增强**：节点分组、自定义节点模板
