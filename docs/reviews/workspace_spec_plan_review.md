# 审查报告：workspace_spec.md + workspace_plan.md

> 审查日期: 2026-05-19  
> 审查人: Kimi Code CLI  
> 版本: 1.0 → 建议修订为 1.1

---

## 评分总览

| 维度 | 评分 | 说明 |
|------|------|------|
| 完整性 | B+ | 核心功能覆盖，部分边缘功能定义模糊 |
| spec/plan 一致性 | B | 大体对齐，时间估算与功能范围存在偏差 |
| 可执行性 | B | 技术选型合理，依赖有遗漏，时间偏乐观 |
| 设计系统继承 | A | tokens 映射清晰，CSS Variables 方案可行 |

---

## 一、严重问题（必须修改）

### 1. 依赖列表缺失 3 个关键库

**问题**：plan 的依赖列表缺少支撑 spec 功能的库。

| 缺失依赖 | spec 要求 | plan 现状 | 建议 |
|----------|-----------|-----------|------|
| `immer` | 5.2 节"树操作为不可变更新（immer 或手动展开）" | 未列出 | **必须添加**。手动展开深层树极易出错 |
| `react-markdown` | 2.4 节"Markdown 支持（粗体、列表、代码块）" | 未列出 | 若不引入，需将 Phase 6 延长至 90 分钟自实现 |
| `react-hotkeys-hook` | 5.2 节"Cmd/Ctrl + K 命令面板"等快捷键 | 提到 `useHotkeys` hook 但未声明库 | 添加依赖，或改为原生 `useEffect` + `keydown` |

**修改建议**：
```json
// plan 第 11-33 行 dependencies 追加
"immer": "^10.1.0",
"react-markdown": "^10.0.0",
"react-hotkeys-hook": "^5.0.0"
```

---

### 2. 响应式策略与 plan 严重脱节

**问题**：spec 4.2 定义了 4 个断点的复杂响应式行为，但 plan Phase 8 仅用一句话带过"移动端检测（<768px 显示提示页）"。

| 断点 | spec 要求 | plan 实现 | 差距 |
|------|-----------|-----------|------|
| ≥1280px | 完整三栏 | ✅ 已覆盖 | — |
| 1024-1279px | 中栏可收起为抽屉 | ❌ 未分配时间 | 需额外实现 drawer + 状态切换 |
| 768-1023px | 左栏收起为图标栏，hover 展开 | ❌ 未分配时间 | 需额外实现 sidebar collapse |
| <768px | 显示提示页 | ✅ 一句话带过 | — |

**修改建议**：
- **方案 A（推荐）**：spec 4.2 简化为只保留 ≥1280px 完整布局和 <768px 提示页，中间段标记"暂不适配"
- **方案 B**：plan 增加 Phase 11（~45 分钟）专门实现响应式适配

---

### 3. canvasStore 与 React Flow 状态边界模糊

**问题**：plan 5.4 定义了 `nodes` / `edges` / `viewport` 在 Zustand 中管理，但 `@xyflow/react` 有自己的 `useNodesState` / `useEdgesState` / `useReactFlow`。

**风险**：
- 两处同时管理 nodes/edges 会导致状态不一致
- React Flow 内部依赖引用相等性做性能优化，Zustand 的不可变更新可能破坏这一点
- viewport 在 React Flow 中是内部状态，外部同步困难

**修改建议**：

明确状态管理边界：

```
Zustand (canvasStore)          React Flow (运行时)
─────────────────────          ───────────────────
persistedNodes        ←──────  onNodesChange 时同步
persistedEdges        ←──────  onEdgesChange 时同步
selectedNodeIds       ←──────  onSelectionChange 时同步
viewport              ←──────  onMoveEnd 时同步

初始化时：Zustand 数据 → React Flow
运行时：React Flow 为主，变更回调同步回 Zustand
```

plan 5.4 应重写为：
```typescript
interface CanvasState {
  persistedNodes: CanvasNode[];      // 持久化数据
  persistedEdges: CanvasEdge[];
  viewport: { x: number; y: number; zoom: number };
  
  // 这些 setter 由 React Flow 的回调触发
  syncNodes: (nodes: CanvasNode[]) => void;
  syncEdges: (edges: CanvasEdge[]) => void;
  syncViewport: (viewport: Viewport) => void;
  
  // 业务操作
  addNodeFromAsset: (asset: AssetItem, position: XYPosition) => void;
  syncFromTreeNode: (node: TreeNode) => void;
}
```

---

### 4. localStorage 容量风险未预警

**问题**：spec 3.2 将所有数据（树结构、消息历史、画布状态、资产列表）存入 localStorage。

**风险**：
- 一个复杂项目：树结构（100KB）+ 消息历史（200KB）+ 画布状态（50KB）+ 资产元数据（50KB）= 400KB
- 10 个项目即 4MB，接近 localStorage 典型限制（5-10MB）
- localStorage 是同步 API，大量写入会阻塞主线程

**修改建议**：
- spec 3.2 增加风险提示："localStorage 为 MVP 临时方案，单项目数据建议 < 200KB，后续迭代迁移至 IndexedDB"
- plan 中引入压缩（如 `lz-string`）或按项目分 key 存储

---

## 二、中度问题（建议修改）

### 5. 时间估算偏乐观

**低估的 Phase**：

| Phase | 当前估算 | 建议估算 | 差距原因 |
|-------|----------|----------|----------|
| Phase 7 无限画布 | 60 分钟 | **90 分钟** | react-flow 自定义节点 + DnD + 迷你地图 + 联动 |
| Phase 9 联动与打磨 | 45 分钟 | **75 分钟** | 5 组跨栏联动 + 快捷键 + 动画 + 空状态 + 骨架屏 |
| Phase 6 Agent 对话 | 45 分钟 | **60 分钟** | Markdown 渲染 + 代码复制 + 快捷操作 + ContextBar |

**总计建议**：7.5 小时 → **9.5 小时**

---

### 6. 树状视图拖拽排序定义不清

**问题**：spec 2.3.1 功能清单包含"拖拽排序（同级节点间）"，但：
- plan Phase 4 未提及此功能
- 依赖列表无 `@dnd-kit/core` 或 `react-beautiful-dnd`

**修改建议**：
- 方案 A：spec 中标记为 P2，移至后续迭代
- 方案 B：plan Phase 4 增加拖拽排序实现（+30 分钟），依赖添加 `@dnd-kit/core` + `@dnd-kit/sortable`

---

### 7. 命令面板有定义无实现

**问题**：spec 2.6 导航栏和 5.2 快捷键都提到"命令面板（Cmd+K）"，但 plan 中完全没有分配实现时间。

**修改建议**：
- spec 2.6 和 5.2 中命令面板标记为 **P2**
- 或 plan 新增组件：`src/components/command-palette/CommandPalette.tsx`

---

### 8. 面板折叠实现方式模糊

**问题**：spec 4.2 提到"中栏可收起为右侧抽屉按钮"，plan Phase 8 提到"面板折叠按钮（中栏可收起）"。

**歧义**：
- 是将面板宽度收缩到 0？
- 还是切换显示/隐藏（display: none）？
- react-resizable-panels 的 `collapse` 功能需要配合 `minSize={0}` 和 `collapsible` 属性

**修改建议**：plan Phase 8 明确使用 `Panel` 的 `collapsible` + `onCollapse` / `onExpand` 回调实现。

---

### 9. 文件引用路径错误

**问题**：plan 第 5 行写"对应 spec: `docs/spec.md`"，实际文件为 `docs/specs/workspace_spec.md`。

**修改建议**：更新为正确路径。

---

## 三、轻微问题（可选修改）

### 10. `MessageItem.isLast` 用途不明

plan 6.3 定义了 `isLast: boolean`，但未说明用途。推测用于自动滚动到底部，但此逻辑应在 `MessageList` 中通过 `messages.length - 1 === index` 判断，无需作为 prop。

**建议**：移除 `isLast` prop。

### 11. `AssetGrid` 标记为 P2 但 spec 未明确

plan 3.6 中 `AssetGrid.tsx` 标记 P2，但 spec 2.3.2 功能清单中的"视图切换：列表视图 / 网格视图"未标记优先级。若 P2 则列表视图即可满足 MVP。

**建议**：spec 2.3.2 功能清单中"网格视图"标记为 P2。

### 12. `ContextMenu` 实现未指定方案

plan 3.3 包含 `ContextMenu.tsx`，但无依赖库。自实现右键菜单（定位、点击外部关闭、层级）约需 30 分钟。

**建议**：添加 `@radix-ui/react-context-menu` 依赖（轻量、无障碍完善），或明确为自实现。

---

## 四、spec/plan 一致性检查表

| spec 功能 | plan 对应 | 一致性 |
|-----------|-----------|--------|
| 登录页 | Phase 3 | ✅ |
| 项目列表页 | Phase 3 | ✅ |
| 三栏工作区 | Phase 4-8 | ✅ |
| 树状展开/折叠 | Phase 4 | ✅ |
| 树节点选中高亮 | Phase 4 | ✅ |
| 树右键菜单 | Phase 4 | ✅ |
| 树拖拽排序 | Phase 4（未提及） | ❌ 遗漏 |
| 资产管理器标签页 | Phase 5 | ✅ |
| 资产 DnD 到画布 | Phase 5 + Phase 7 | ✅ |
| Agent 对话消息渲染 | Phase 6 | ✅ |
| 快捷操作栏 | Phase 6 | ✅ |
| ContextBar | Phase 6 | ✅ |
| react-flow 画布 | Phase 7 | ✅ |
| 3 种节点类型 | Phase 7 | ✅ |
| 画布迷你地图 | Phase 7 | ✅ |
| 跨栏联动 | Phase 9 | ✅ |
| 键盘快捷键 | Phase 9 | ✅ |
| 响应式 4 断点 | Phase 8（仅 2 个） | ⚠️ 不完整 |
| 命令面板 | 无对应 Phase | ❌ 遗漏 |
| 设计系统集成 | Phase 0, 8 | ✅ |
| localStorage 持久化 | Phase 2 | ✅ |

---

## 五、修改建议汇总

### 必须修改（阻塞执行）

1. **plan 依赖列表**追加 `immer`, `react-markdown`, `react-hotkeys-hook`
2. **spec 4.2 响应式策略**简化为 2 个断点（≥1280px 完整 / <768px 提示页）
3. **plan 5.4 canvasStore**重写状态边界，明确 Zustand 存持久化数据、React Flow 管运行时
4. **plan 第 5 行**修正 spec 引用路径

### 强烈建议修改

5. **plan 时间估算**：Phase 6 → 60 分钟，Phase 7 → 90 分钟，Phase 9 → 75 分钟
6. **spec 2.3.1 / plan Phase 4**：树拖拽排序标记为 P2 或明确使用 dnd-kit
7. **spec 2.6 / 5.2**：命令面板标记为 P2
8. **spec 3.2**：增加 localStorage 容量风险提示

### 可选修改

9. 移除 `MessageItem.isLast` prop
10. spec 2.3.2 "网格视图"标记为 P2
11. plan 依赖添加 `@radix-ui/react-context-menu`（可选）

---

## 六、结论

当前 spec 和 plan **可以执行**，但存在依赖遗漏、时间低估、状态边界模糊等问题。建议先按"必须修改"项修订后，再进入编码阶段。修订工作量约 **15-20 分钟**。
