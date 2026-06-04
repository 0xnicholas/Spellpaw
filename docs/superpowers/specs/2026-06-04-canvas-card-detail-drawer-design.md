# 画布卡片详情抽屉 — 设计文档

> 日期: 2026-06-04 · 状态: 设计阶段

---

## 1. 目标

点击画布上的卡片 → 从右侧滑出一个浮动抽屉面板，只读展示该卡片的完整数据。

---

## 2. 范围

- **仅画布卡片**（script / art / character / deliverable），不涉及树节点
- **仅只读**，不在此版本支持编辑
- **抽屉浮动覆盖**画布，不改变画布宽度
- 四种卡片类型各有不同的展示字段
- 关闭方式：✕ 按钮 · Esc 键 · 点击另一张卡片 · 点击画布空白区域（onPaneClick 穿透遮罩触发）

---

## 3. 数据流

```
画布卡片 onClick
  → canvasStore.setSelectedCardId(id)
  → CardDetailDrawer 调用 canvasStore.getSelectedCard() 获取卡片数据
  → 根据 card.type 渲染对应详情区块
```

所有卡片数据已在 `canvasStore.canvases[projectId].nodes` 中。抽屉不产生任何数据写入。

---

## 4. Store 变更

### 4.1 `canvasStore` 新增字段和 action

```typescript
// 新增状态字段
selectedCardId: string | null;

// 新增 actions
setSelectedCardId: (id: string | null) => void;
getSelectedCard: () => CanvasNode | null;  // 便捷 selector，抽屉内部统一使用此方法读取卡片数据，不再内联 find
```

- `selectedCardId` 不加入 `partialize`（即不持久化），选中状态是瞬时 UI 状态，刷新/切换项目后重置
- `setSelectedCardId(null)` 关闭抽屉；传 id 则打开/切换

---

## 5. 组件设计

### 5.1 `CardDetailDrawer` 组件

**位置：** `src/apps/drama/components/flow-canvas/CardDetailDrawer.tsx`

**结构：**

```
<div class="card-detail-drawer">           ← 绝对定位，右侧贴边，340px 宽
  <header>                                  ← 类型图标 + 类型名 + ✕ 按钮
  <body>                                    ← 可滚动内容区
    <section>标题</section>                  ← 字段级联展示
    <section>状态 Badge</section>
    <section>描述（如有）</section>
    <!-- 按 type 条件渲染专属字段 -->
  </body>
</div>
```

**Props：**
- 无外部 props。组件内部从 `canvasStore` 读取 `selectedCardId` 和当前节点数据。

**动画：** CSS `transform: translateX(100%)` → `translateX(0)`，`transition: transform 0.2s ease-out`。

**遮罩：** 纯视觉的半透明 `<div>` 覆盖层（`bg-black/10`），设置 `pointer-events: none`。仅创建视觉分层，不捕获鼠标事件。用户点击遮罩区域时事件穿透到 ReactFlow，触发 `onPaneClick` → `setSelectedCardId(null)` 关闭抽屉。画布拖拽/缩放同样穿透不受影响。

### 5.2 各类型展示字段

| 类型 | 字段 |
|------|------|
| **script** | 标题 · 状态 Badge · 描述 · 对白（引用块） · 时长 · 地点 · 时段 · 编号（_displayNumber） |
| **art** | 标题 · 缩略图（大尺寸，保留比例 / 占位） · 生成提示词（`data.prompt`） · 标签 `tags` · 状态（仅当 `data.status` 存在时以 Badge 展示） · 风格锁定状态 |
| **character** | 姓名（`data.name`，fallback `data.title`） · 头像 `avatar` · 角色 `role` · 年龄 `age` · 职业 `occupation` · 性格 `personality` · 外貌 `appearance` |
| **deliverable** | 标题 · 描述 · 类型（image/video/audio）· 缩略图 · 时长 `duration` · 分辨率 `resolution` · 文件大小 `fileSize` |

### 5.3 `FlowCanvasPanel` 集成

- 在 `FlowCanvasPanel` 内部的 `<div className="relative">` 中添加 `<CardDetailDrawer />`
- 卡片点击：使用 ReactFlow 的 `onNodeClick` handler → 调用 `setSelectedCardId(node.id)`
- **点击冲突处理**：Art / Deliverable 卡片的缩略图已有点击 Lightbox 逻辑。`onNodeClick` 通过检查 `event.target` 避免冲突——如果点击目标是 `<img>`、`<input>`、`<button>` 等交互元素，**不打开抽屉**，保持原有行为（Lightbox / 编辑）。
- 当前 `FlowCanvasPanel` 已有 `onPaneClick` 用于关闭右键菜单，需扩展为同时调用 `setSelectedCardId(null)`

### 5.4 Esc 键关闭

使用项目已有的 `useHotkeys` hook（`@shared/hooks/useHotkeys`），在 `CardDetailDrawer` 内注册：

```typescript
useHotkeys({ 'Escape': () => setSelectedCardId(null) }, []);
```

---

## 6. 文件变更清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/apps/drama/stores/canvasStore.ts` | 改 | 新增 `selectedCardId` + `setSelectedCardId` + `getSelectedCard` |
| `src/apps/drama/stores/canvasStore.test.ts` | 改 | 新增 `setSelectedCardId` / `getSelectedCard` 测试 |
| `src/apps/drama/components/flow-canvas/CardDetailDrawer.tsx` | 新建 | 抽屉组件 |
| `src/apps/drama/components/flow-canvas/FlowCanvasPanel.tsx` | 改 | 集成抽屉 + onNodeClick handler |

**不涉及的文件：**
- 四种 card node 组件不变（仅需 FlowCanvasPanel 层注册 `onNodeClick`）
- WorkspacePage / WorkspaceLayout 不变（抽屉在 FlowCanvasPanel 内部）

---

## 7. 边界情况

| 场景 | 处理 |
|------|------|
| 选中了不存在的 `selectedCardId`（卡片被删除） | `getSelectedCard()` 返回 null，抽屉自动关闭 |
| 切换项目 | 切换时 `selectedCardId` 自动重置（不持久化） |
| 抽屉打开时拖拽/缩放画布 | 遮罩设置 `pointer-events: none`，事件穿透到 ReactFlow；画布交互不受影响 |
| 点击卡片缩略图（Art / Deliverable） | Lightbox 正常打开，抽屉**不**打开（event.target 检查跳过 img 元素） |
| 双击卡片标题进入编辑 | 编辑模式正常触发，抽屉**不**打开（event.target 检查跳过 input 元素） |
| 卡片类型无对应字段（如 description 为空） | 跳过该 section，不展示空壳 |

---

## 8. 测试要点

- [ ] 点击四种类型卡片，抽屉正确展示
- [ ] ✕ 按钮、点击画布空白、Esc 键正常关闭
- [ ] 点击另一卡片正确切换内容
- [ ] 切换项目后 selectedCardId 清空
- [ ] 删除当前选中卡片后抽屉自动关闭
- [ ] 抽屉滑入/滑出动画流畅（0.2s ease-out）
- [ ] 点击缩略图打开 Lightbox 时，抽屉不打开
- [ ] 双击标题进入编辑时，抽屉不打开
- [ ] 点击卡片的非交互区域（body 空白处）正确打开抽屉
