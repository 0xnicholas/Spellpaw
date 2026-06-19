# 计划：将画布拆分为独立 App

## 目标
把当前 Drama Studio 工作区里的画布能力拆成独立的 `src/apps/canvas/`，通过独立路由 `/canvas/:projectId` 访问，并与 Drama Studio 共享 `projectStore` / `canvasStore` 数据。

## 采用方案
**独立路由 + 共享状态 + 复用 ChatPanel**

- 新建 `src/apps/canvas/`，把 `FlowCanvasPanel` 及节点组件从 `src/apps/drama/components/flow-canvas/` 迁移过去
- 新建 `CanvasPage`，布局与当前 WorkspacePage 一致：左侧 Copilot（复用 Drama 的 `ChatPanel`），右侧画布
- `App.tsx` 同时注册 `/project/:projectId` 和 `/canvas/:projectId`，都渲染 `CanvasPage`
- 原 `WorkspacePage` 简化为 `<CanvasPage />` 的薄包装或删除
- 项目列表增加「打开画布」入口，方便直接进画布 app

## 为什么这样设计
- 用户已确认要「独立路由」「共享数据」「保留左栏 Copilot + 右栏画布」
- 共享 store 保证 Drama Studio 和 Canvas App 之间数据实时一致
- 让 `/canvas/:projectId` 可作为直达链接，同时保留 `/project/:projectId` 兼容旧入口
- ChatPanel 目前非常 Drama 业务相关，先不复用为 shared，由 Canvas App 从 `@drama/components/chat-panel` 导入；为避免循环依赖，Drama 的 `WorkspacePage` 不再反向导入 Canvas App，而是统一由 `App.tsx` 直接路由到 `CanvasPage`

## 具体步骤

### 1. 新建目录结构
```
src/apps/canvas/
├── pages/
│   └── CanvasPage.tsx      # 左侧 ChatPanel + 右侧 FlowCanvasPanel
└── components/
    └── flow-canvas/
        ├── FlowCanvasPanel.tsx
        ├── CardDetailDrawer.tsx
        └── nodes/
            ├── index.ts
            ├── ScriptCardNode.tsx
            ├── SceneCardNode.tsx
            ├── ArtCardNode.tsx
            ├── CharacterCardNode.tsx
            └── DeliverableCardNode.tsx
```

### 2. 迁移 FlowCanvasPanel
- 将 `src/apps/drama/components/flow-canvas/` 整体移动到 `src/apps/canvas/components/flow-canvas/`
- 更新内部 import：例如 `useProjectStore` / `useCanvasStore` 等路径不变（仍来自 `@drama/stores/*`）

### 3. 新增 CanvasPage
- 从当前 `WorkspacePage.tsx` 复制布局逻辑（`MobileGuard`、Navbar、resize panels、ChatPanel / FlowCanvasPanel 组合、`useEffect` 同步 `projectId` 到 store）
- 导入路径改为 `@drama/components/chat-panel/ChatPanel` 和 `@canvas/components/flow-canvas/FlowCanvasPanel`

### 4. 添加 `@canvas` path alias
- `vite.config.ts`：` '@canvas': '/src/apps/canvas'`
- `tsconfig.app.json`：` "@canvas/*": ["src/apps/canvas/*"]`

### 5. 更新 App.tsx 路由
```tsx
import { CanvasPage } from '@canvas/pages/CanvasPage';

<Route path="/project/:projectId" element={<RequireAuth><CanvasPage /></RequireAuth>} />
<Route path="/canvas/:projectId" element={<RequireAuth><CanvasPage /></RequireAuth>} />
```

### 6. 简化/移除原 WorkspacePage
- 方案 A（推荐）：删除 `src/apps/drama/pages/WorkspacePage.tsx`，`App.tsx` 直接引用 `CanvasPage`
- 方案 B（保守）：保留 `WorkspacePage.tsx` 作为 `<CanvasPage />` 的薄包装，仅为了最小化改动

### 7. 更新 Drama 内部引用
- 搜索所有引用 `@drama/components/flow-canvas` 的代码（包括 `toolRouter.ts` 里生成 storyboard 时可能用到 art 节点逻辑等）
- 改为 `@canvas/components/flow-canvas`

### 8. 项目列表增加「打开画布」入口
- 在 `ProjectListPage.tsx` 每个项目卡片上增加一个画布/布局图标按钮
- 点击后 `navigate(/canvas/${projectId})`

### 9. 测试与验证
- 更新 `toolRouter.test.ts` 中任何依赖旧路径的 import
- 运行 `npx tsc --noEmit` 前后端类型检查
- 运行 `npm run lint`
- 运行 `npx vitest run` 全量测试
- 手动验证：
  - `/project/:projectId` 仍可正常打开
  - `/canvas/:projectId` 可独立打开，且左栏 Copilot、右栏画布工作正常
  - 在 Canvas App 中修改卡片后切换回 Drama Studio，数据一致

## 风险与注意事项
- **循环依赖风险**：Canvas App 导入 ChatPanel（来自 Drama），Drama 不应再导入 Canvas App。`WorkspacePage` 要么删除要么只做薄包装，不能引用 Canvas App 的深层组件。
- **路由语义**：`/project/:projectId` 和 `/canvas/:projectId` 将渲染同一页面；如需以后区分（例如 Drama Studio 显示树状结构、Canvas App 全屏画布），可再拆分。
- **Tool Server**：`FlowCanvasPanel` 依赖的 tool-server 桥接逻辑（`useToolBridge`）由父页面调用，需在 `CanvasPage` 中保留。
