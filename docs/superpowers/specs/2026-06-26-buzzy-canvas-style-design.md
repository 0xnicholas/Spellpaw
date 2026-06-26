# Buzzy Canvas 视觉重做 — 设计文档

> 日期：2026-06-26
> 状态：✅ 设计已批准，待实施
> 范围：CanvasPanel 视觉重做 + 7 个卡片节点样式统一

## 1. 背景与目标

现有 Spellpaw canvas 是浅色背景 + 彩色 header bar + 多装饰元素（emoji 图标、状态 Badge、duration/location/timeOfDay 等元信息）的"信息密集型"风格。参考 `screenshots/buzzy-canvas.png` 等 8 张 buzzy 截图，buzzy canvas 走的是"极简暗色 + 卡片小图标 + 横向 flow"的现代风格。

**目标**：在保留所有现有功能（树链接、双击编辑、Copilot、右键菜单、Handles、MiniMap、缩略图、Lightbox、风格锁定）的前提下，把 canvas 的视觉重做为 buzzy 风格。

## 2. 设计决策（用户已确认）

| 决策 | 选定方案 |
|------|---------|
| 改造范围 | 极简复刻：纯视觉重做，保留所有功能 |
| 卡片标签语言 | 纯中文（剧本/美术/分镜/角色/资产/可交付/文本 等） |
| 状态徽章 | 保留，但改为右上角小圆点样式 |
| 元信息（⏱📍🌅） | 全部删除 |
| 代码组织 | 提取 `BuzzyCard` 共享组件，7 个节点组件都用它包装 |

## 3. 视觉令牌

### 3.1 Canvas 背景

| 元素 | 当前值 | 新值 |
|------|--------|------|
| 背景色 | `var(--color-bg-secondary)`（浅灰） | `#000000`（纯黑） |
| 网格类型 | line pattern | dot pattern |
| 网格点色 | `var(--color-border-subtle)` | `rgba(255,255,255,0.07)` |
| 网格间距 | 20px | 20px |

### 3.2 Card 边框

| 状态 | 颜色 | 备注 |
|------|------|------|
| 默认 | `oklch(22% 0.015 250)` | 1px solid，几乎看不见但能区分 |
| Hover | `oklch(35% 0.015 250)` | 1px solid |
| 选中-美术 | `oklch(70% 0.15 230)` / `#5B9EFF` | 蓝，复刻 buzzy Image 选中态 |
| 选中-视频 | `oklch(85% 0.18 95)` / `#FACC15` | 黄，复刻 buzzy Video 选中态 |
| 选中-其它 | `var(--color-accent-500)` | 紫，保留现状 |

### 3.3 Card 背景

- `oklch(8% 0.01 250)`（黑底但比纯黑亮一档，让卡片有轻微立体感）

### 3.4 Card 圆角

- `var(--radius-lg)`（8px，比当前 4px 略圆润）

### 3.5 状态点（替代 Badge）

| 状态 | 颜色 | 效果 |
|------|------|------|
| `draft` | `oklch(50% 0.01 250)` 灰 | static 6px 圆点 |
| `in_progress` | `oklch(65% 0.15 230)` 蓝 | 6px 圆点 + 脉动动画 |
| `review` | `oklch(80% 0.15 85)` 黄 | static 6px 圆点 |
| `done` | `oklch(65% 0.15 145)` 绿 | static 6px 圆点 |

## 4. Card 头部规范

**当前**：彩色 header bar（背景色 + emoji + 中文）
**新**：极简单行

```
┌─────────────────────────┐
│  ≡ 美术         ●       │  ← 28px 高，padding 6px 12px
├─────────────────────────┤
│                         │
│   [body content]        │
│                         │
└─────────────────────────┘
```

- 左侧：lucide 图标（12×12）+ 2px 间距 + 中文名（`text-[11px] text-text-tertiary`）
- 右侧：状态点（绝对定位 `top: 8px, right: 8px`）
- 头部与主体间无明显分隔（靠 padding 区分）

## 5. 类型 → 图标 / 标签 / 选中色 映射表

| `type` (CanvasNode.type) | Lucide 图标 | 中文名 | 选中色 |
|---------------------------|-------------|--------|--------|
| `script` | `FileText` | 剧本 | 紫 (accent) |
| `art` | `Image` | 美术 | 蓝 |
| `character` | `User` | 角色 | 紫 |
| `deliverable` | `Video` | 视频 | 黄 |
| `videoClip` | `Video` | 视频 | 黄 |
| `sceneCard` | `Film` | 分镜 | 蓝 |
| `asset` | `Paperclip` | 资产 | 紫 |
| `storyline` | `BookOpen` | 故事 | 紫 |
| `moodboard` | `Palette` | 情绪板 | 紫 |
| `task` | `CheckSquare` | 任务 | 紫 |
| 其它 (fallback) | `Square` | 卡片 | 紫 |

## 6. Card 主体规范

| 类型 | 无内容时（占位符） | 有内容时 |
|------|-------------------|---------|
| 美术/分镜/角色 | 居中 `ImageOff` 图标 | 缩略图 + 锁定风格 hover overlay |
| 视频/可交付 | 居中 `PlayCircle` 图标 | 缩略图 + 锁定风格 hover overlay |
| 剧本 | "等待生成剧本..." 灰色文字 | 标题（可双击编辑） + 描述 |
| 资产 | `Paperclip` 图标 | 文件名 + 大小 |
| 通用/故事/情绪板/任务 | `Square` 图标 | 标题 + 描述 |

**保留的交互**：
- ✅ 双击标题编辑
- ✅ 缩略图点击 → Lightbox
- ✅ 缩略图 hover → 锁定风格按钮（仅 linkedTreeNodeId + generatedPrompt 同时存在时）
- ✅ 右键菜单（复制/删除/重命名/复制ID）
- ✅ 拖拽移动 + 边连接
- ✅ 单击 → Copilot 弹窗
- ✅ 节点高亮 pulse 动画（高亮选中/同步来源）

**删除的元信息**（per 用户决策）：
- ❌ `⏱ 5s`（duration）
- ❌ `📍 室内`（location）
- ❌ `🌅 黄昏`（timeOfDay）
- ❌ `💬 dialogue` 对话块（保留 data.dialogue 字段但默认不渲染——剧本类型可后续作为 body 内容渲染）
- ❌ 状态 Badge（替换为状态点）

## 7. 文件清单

### 7.1 新建

| 文件 | 作用 |
|------|------|
| `src/shared/components/canvas/BuzzyCard.tsx` | 共享包装器：负责头部 + 状态点 + 边框/选中态 |
| `src/shared/components/canvas/BuzzyCard.test.tsx` | 单元测试：覆盖 8 种 type 的图标/标签/选中色 |

### 7.2 修改

| 文件 | 改动 |
|------|------|
| `src/shared/components/canvas/CanvasPanel.tsx` | 背景 `bg-black`；`<Background variant="dots" .../>` |
| `src/index.css` | `.react-flow__node` dark 样式覆盖（背景透明，去掉原浅色 box） |
| `src/shared/components/canvas/nodes/ScriptCardNode.tsx` | 替换彩色 header + Badge + 元信息为 `<BuzzyCard>` |
| `src/shared/components/canvas/nodes/ArtCardNode.tsx` | 同上 |
| `src/shared/components/canvas/nodes/CharacterCardNode.tsx` | 同上 |
| `src/shared/components/canvas/nodes/DeliverableCardNode.tsx` | 同上 |
| `src/shared/components/canvas/nodes/SceneCardNode.tsx` | 同上（保留缩略图/锁定风格/lightbox 逻辑） |
| `src/shared/components/canvas/nodes/AssetCardNode.tsx` | 同上 |
| `src/shared/components/canvas/nodes/GenericCardNode.tsx` | 同上 |

### 7.3 保留不动

- React Flow `Handle`（连接点）
- `MiniMap` / `Controls` 工具栏
- `CopilotCardNode.tsx`（已 deprecated，保留测试）
- 所有 store 行为（projectStore / canvasStore / chatStore）
- 所有右键菜单、弹窗、Drawer

## 8. BuzzyCard Props 设计

```ts
interface BuzzyCardProps {
  type: CanvasNodeType;             // 决定图标/标签/选中色
  data: CanvasNodeData;             // 用于状态点判定
  selected?: boolean;               // 来自 NodeProps.selected
  highlighted?: boolean;            // 来自 data._highlighted
  hasThumbnail?: boolean;           // 是否渲染缩略图区
  children?: ReactNode;             // body 内容
  onTitleDoubleClick?: () => void;  // 触发编辑
  onThumbnailClick?: () => void;    // 打开 Lightbox
  onLockStyleClick?: () => void;    // 锁定风格
  showLockOverlay?: boolean;        // 是否显示锁定风格 hover overlay
  isLocked?: boolean;               // 已锁定指示器
  className?: string;
}
```

## 9. 验收标准

1. ✅ Canvas 背景为纯黑，点阵网格可见但极淡
2. ✅ 7 个节点组件都用 `BuzzyCard` 包装，渲染中文极简头部
3. ✅ 美术卡片选中时显示蓝色边框，视频卡片选中时显示黄色边框
4. ✅ 状态以右上角小圆点呈现，`in_progress` 状态有脉动
5. ✅ 缩略图、双击编辑、Lightbox、锁定风格、右键菜单、Copilot 弹窗、拖拽、Handles 全部正常工作
6. ✅ `npm test` 通过（已有 292 个测试 + 新增 BuzzyCard 测试）
7. ✅ 没有引入新的依赖

## 10. 风险与缓解

| 风险 | 缓解 |
|------|------|
| 改 header 结构可能影响现有节点的视觉差异 | 7 个节点都统一为 BuzzyCard，单点修改 |
| 卡片背景变深，缩略图周围对比度可能变化 | 缩略图 area 内部用透明背景，外层用 `oklch(8%...)` 衬托 |
| 浅色主题下 `bg-black` 可能冲突 | 当前 app 默认深色（已设置 `html.dark`），风险低 |
| 现有 8 个节点的测试断言可能依赖 header bar 文本 | 检查并更新 `CopilotCardNode.test.tsx` 等；新 BuzzyCard 单测覆盖 8 种 type |

## 11. 实施顺序

1. **BuzzyCard.tsx + .test.tsx**（新建，先实现并测试）
2. **CanvasPanel.tsx**（改背景 + 网格）
3. **index.css**（react-flow 节点 dark 样式）
4. **7 个节点组件**（逐个替换为 BuzzyCard 包装）
5. **运行 `npm test`** 确保全绿
6. **可选 Playwright 截图** 对比 buzzy 风格
