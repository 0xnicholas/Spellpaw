# 二次审查报告：workspace_spec.md + workspace_plan.md（修订版）

> 审查日期: 2026-05-19  
> 审查人: Kimi Code CLI  
> 对应审查: `docs/reviews/workspace_spec_plan_review.md`

---

## 修订项验证

### ✅ 已正确修改（8/8 项）

| 原始审查项 | 验证位置 | 状态 |
|-----------|----------|------|
| 依赖列表追加 immer + react-markdown + react-hotkeys-hook | plan 第 23-25 行 | ✅ |
| 响应式策略简化为 2 断点 | spec 第 310-317 行 | ✅ |
| canvasStore 重写状态边界 | plan 第 369-413 行 | ✅ |
| spec 引用路径修正 | plan 第 5 行 | ✅ |
| 时间估算上调（总计 9.5h） | plan 第 254, 265, 287, 301 行 | ✅ |
| 树拖拽排序标记 P2 | spec 第 83 行 + plan Phase 4 第 246 行 | ✅ |
| 命令面板标记 P2 | spec 第 256, 347 行 | ✅ |
| localStorage 容量风险提示 | spec 第 289 行 | ✅ |
| 网格视图标记 P2 | spec 第 126 行 | ✅ |

---

## 新发现的问题

### 🔴 严重：npm install 命令未同步更新

**位置**：plan 第 61-62 行

```bash
# 当前内容（缺少 3 个新增依赖）
npm install react-router-dom zustand @xyflow/react react-resizable-panels lucide-react clsx tailwind-merge
npm install -D @tailwindcss/vite tailwindcss
```

**问题**：Step 2 的安装命令没有包含新增的 `immer`、`react-markdown`、`react-hotkeys-hook`。按此命令执行会导致编码时找不到模块。

**建议修改为**：
```bash
npm install react-router-dom zustand @xyflow/react react-resizable-panels lucide-react clsx tailwind-merge immer react-markdown react-hotkeys-hook
npm install -D @tailwindcss/vite tailwindcss
```

---

### 🟡 中度：spec / plan 版本号未同步更新

**位置**：
- spec 第 3 行：`> 版本: 1.0`
- plan 第 3 行：`> 版本: 1.0`

**问题**：文档已做实质性修订（依赖变更、响应式策略变更、状态边界重写），但版本号仍为 1.0，不利于后续变更追踪。

**建议**：同步更新为 `1.1`，并在版本历史下方增加修订记录：

```markdown
> 版本: 1.1
> 修订日期: 2026-05-19
> 修订内容: 补充依赖、简化响应式策略、重写 canvasStore 状态边界、调整时间估算
```

---

### 🟡 中度：plan 风险表 localStorage 表述与 spec 不一致

**位置**：plan 第 719 行

**当前内容**：
> `localStorage 数据量过大` → `当前项目规模不会超过限制`

**问题**：spec 第 289 行已明确添加容量风险提示（"典型浏览器限制 5–10MB"），但 plan 风险表中仍写"不会超过限制"，两者表述矛盾。

**建议修改为**：
> `localStorage 数据量过大` → `单项目控制 < 200KB，长期迁移至 IndexedDB`

---

### 🟢 轻微：MessageItem.isLast prop 仍存在

**位置**：plan 第 447-449 行

```typescript
interface MessageItemProps {
  message: ChatMessage;
  isLast: boolean;
}
```

**问题**：用途未说明。自动滚动逻辑应在 MessageList 中通过 index 判断，无需作为 prop 传入。

**建议**：移除 `isLast`，改为：
```typescript
interface MessageItemProps {
  message: ChatMessage;
}
```

---

### 🟢 轻微：ContextMenu 实现方案仍不明确

**位置**：plan 第 138 行

**问题**：`ContextMenu.tsx` 标记 P1，但未指定是自实现还是引入库。自实现（定位、点击外部关闭、无障碍）约需 30 分钟。

**建议**：
- 方案 A：添加 `@radix-ui/react-context-menu` 到依赖（推荐，无障碍完善）
- 方案 B：明确标记为自实现，Phase 1 增加 15 分钟

---

### 🟢 轻微：Phase 1 未包含 ContextMenu

**位置**：plan Phase 1（第 213-221 行）

**问题**：ContextMenu 标记 P1，但 Phase 1 的组件列表中没有它。Phase 1 只包含 Divider、PanelHeader、Badge、Button、Input、Textarea、EmptyState、IconButton。

**建议**：Phase 1 增加 `ContextMenu`（或明确将其移至使用它的 Phase 4/5/7 中一并实现）。

---

## 一致性复核

| spec 功能 | plan 对应 | 一致性 |
|-----------|-----------|--------|
| 登录页 | Phase 3 | ✅ |
| 项目列表页 | Phase 3 | ✅ |
| 三栏工作区 | Phase 4-8 | ✅ |
| 树状展开/折叠 | Phase 4 | ✅ |
| 树节点选中高亮 | Phase 4 | ✅ |
| 树右键菜单 | Phase 4 | ✅ |
| 树拖拽排序（P2） | Phase 4 第 246 行 | ✅ 已标记暂不实现 |
| 资产管理器标签页 | Phase 5 | ✅ |
| 资产 DnD 到画布 | Phase 5 + Phase 7 | ✅ |
| Agent 对话 Markdown | Phase 6 | ✅ |
| 快捷操作栏 | Phase 6 | ✅ |
| ContextBar | Phase 6 | ✅ |
| react-flow 画布 | Phase 7 | ✅ |
| 3 种节点类型 | Phase 7 | ✅ |
| 画布迷你地图 | Phase 7 | ✅ |
| 跨栏联动 | Phase 9 | ✅ |
| 键盘快捷键 | Phase 9 | ✅ |
| 响应式 2 断点 | Phase 8 | ✅ 已对齐 |
| 命令面板（P2） | 无对应 Phase | ✅ 已标记 P2 |
| 设计系统集成 | Phase 0, 8 | ✅ |
| localStorage 持久化 | Phase 2 | ✅ |

---

## 修改建议汇总

### 强烈建议修改（阻塞执行）

1. **plan 第 61-62 行**：`npm install` 命令追加 `immer react-markdown react-hotkeys-hook`

### 建议修改

2. **spec 第 3 行 + plan 第 3 行**：版本号更新为 `1.1`，增加修订记录
3. **plan 第 719 行**：风险表 localStorage 条目与 spec 保持一致（"单项目 < 200KB，迁移 IndexedDB"）
4. **plan 第 447-449 行**：移除 `MessageItem.isLast` prop

### 可选修改

5. **plan 依赖**：添加 `@radix-ui/react-context-menu` 或明确自实现
6. **plan Phase 1**：将 ContextMenu 纳入组件清单

---

## 结论

修订版 spec 和 plan **核心问题已解决**，仅剩 **1 个阻塞项**（npm install 命令缺失依赖）。修复该问题后（约 2 分钟），文档可直接进入编码执行阶段。
