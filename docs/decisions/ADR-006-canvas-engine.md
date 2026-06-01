# ADR-006: 画布引擎选型（@xyflow/react）

- **Status:** Accepted
- **Date:** 2026-05-27

## Context

Spellpaw 需要无限画布来可视化项目结构，支持：
- 自由拖拽卡片（场景卡、素材卡）
- 连线表示叙事关系
- 缩放/平移视口
- 右键菜单操作
- 自定义节点渲染（缩略图、状态标记）

可选方案：
1. **@xyflow/react（React Flow）** — 成熟的 React 流程图库
2. **自研 Canvas** — 用 HTML5 Canvas 从零实现
3. **React Arborist + 自定义布局** — 更适合树状结构的库
4. **Excalidraw** — 手绘风格的白板库

## Decision

**使用 @xyflow/react（React Flow）作为画布引擎。**

**节点类型：**
```typescript
const nodeTypes = {
  sceneCard: SceneCardNode,   // 240px 宽卡片，含缩略图/标题/状态/描述
  assetCard: AssetCardNode,   // 200px 宽卡片，含图标/类型/缩略图
};
```

**自定义渲染：** 每个节点是 React 组件，支持：
- 内联标题编辑（双击 → input → Enter 保存）
- 缩略图展示（`aspect-[9/16]`）+ Lightbox 点击放大
- 状态 Badge（草稿/进行中/审核中/已完成）
- 风格锁定覆盖层
- Handle 连接点（左/右 source/target）

**自动布局：** 从项目树自动生成画布布局（`canvasLayout.ts`）：
- 每个 Act 占一列（列宽 420px）
- Scene 在列内竖排（行高 220px）
- 非树节点（素材卡、便签）保留用户手工位置

## Consequences

**Pros:**
- React 原生集成，节点即组件，开发效率高
- 内置 Controls（缩放/居中）、Background（网格）、fitView
- 拖拽、连线、选择等交互开箱即用
- 活跃社区，文档完善

**Cons:**
- 对大量节点（100+）性能下降
- 自定义节点需遵循 React Flow 的渲染约束
- 内置样式需覆盖以匹配设计系统

**Mitigations:**
- 单项目画布节点数预计 < 100（3 幕 × 10 场景 + 素材），在 React Flow 性能边界内
- 通过 `className` 覆盖 + CSS 自定义属性统一设计令牌
- `proOptions={{ hideAttribution: true }}` 去除水印

---

*See also: ADR-009 (Design System)*
