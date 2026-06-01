# 画布四种卡片类型 — 设计文档

> 日期：2026-06-02  
> 状态：设计完成，待实现  
> 关联：CanvasNode 类型系统重构

---

## 1. 概述

将画布卡片从现有的 2 种（`sceneCard`、`assetCard`）重新设计为 4 种独立类型：
**剧本**、**美术**、**产出**、**人物角色**。

每种卡片有不同的数据字段和视觉表达。卡片完全独立于项目树（移除 `linkedTreeNodeId` 双向同步），由 Agent 在任务中创建或用户手动创建。

---

## 2. 四种卡片类型

### 2.1 📝 剧本 (script)

纯文字内容卡片——场景描述、对白、大纲笔记等。

| 字段 | 类型 | 说明 |
|------|------|------|
| `title` | string | 标题（必填） |
| `description` | string? | 正文/描述 |
| `dialogue` | string? | 对白内容 |
| `duration` | number? | 时长（秒） |
| `location` | string? | 地点 |
| `timeOfDay` | string? | 时段 (morning/day/evening/night) |
| `status` | string? | draft / in_progress / review / done |

**视觉特征**：蓝色顶栏，纯文字内容区，底部元数据条（⏱时长 · 📍地点 · 🌅时段）。

### 2.2 🎨 美术 (art)

视觉资源卡片——分镜图、风格参考、角色设计等。

| 字段 | 类型 | 说明 |
|------|------|------|
| `title` | string | 标题（必填） |
| `thumbnail` | string? | 缩略图 URL |
| `prompt` | string? | 生成提示词 |
| `tags` | string[]? | 标签 |
| `styleRef` | string? | 关联的风格参考 |

**视觉特征**：黄色顶栏，9:16 大缩略图，提示词和标签显示区，hover 显示风格锁定按钮。

### 2.3 📦 产出 (output)

Agent 生成的结果——分析报告、建议、生成的场景等。

| 字段 | 类型 | 说明 |
|------|------|------|
| `title` | string | 标题（必填） |
| `outputType` | string | analysis / suggestion / generation |
| `summary` | string? | 内容摘要 |
| `sourceTaskId` | string? | 来源任务 ID |
| `actions` | OutputAction[]? | 操作按钮定义 |

```typescript
interface OutputAction {
  id: string;
  label: string;
  type: 'approve' | 'reject' | 'apply' | 'custom';
}
```

**视觉特征**：紫色顶栏，内容摘要，操作按钮（✓ 批准 / ✗ 拒绝 / + 应用）。

### 2.4 👤 人物角色 (character)

角色信息卡片。

| 字段 | 类型 | 说明 |
|------|------|------|
| `name` | string | 角色名（必填） |
| `role` | string? | 身份（男主/女主/配角） |
| `age` | number? | 年龄 |
| `occupation` | string? | 职业 |
| `personality` | string? | 性格描述 |
| `appearance` | string? | 外貌描述 |
| `avatar` | string? | 头像/立绘 URL（可选，先预留） |
| `notes` | string? | 备注 |

**视觉特征**：绿色顶栏，圆形头像占位图，角色信息表格式布局。

---

## 3. 数据模型

### 3.1 CanvasNodeType

```typescript
export type CanvasNodeType = 'script' | 'art' | 'output' | 'character';
```

替换旧的 `'sceneCard' | 'assetCard'`。

### 3.2 CanvasNodeData → 联合类型

每种类型有不同的 data 形状。使用 TypeScript 判别联合（discriminated union）或保持 `Record<string, unknown>` 基类 + 类型守卫。

为了最小化代码改动，保持 `CanvasNodeData extends Record<string, unknown>` 不动，在渲染时按 `node.type` 读取对应字段。不引入严格的 TS 判别联合（避免破坏现有 store 代码）。

### 3.3 CanvasNode

```typescript
export interface CanvasNode {
  id: string;
  type: CanvasNodeType;
  position: { x: number; y: number };
  data: CanvasNodeData;  // 基类不动，字段按 type 约定
}
```

旧字段处理：
- `linkedTreeNodeId` — 移除（不再使用）
- `generatedPrompt` — 移至 `art` 类型的 `prompt` 字段
- `thumbnail` — 仅 `art` 类型使用
- `description` — `script` 类型使用
- `tags` — `art` 类型使用

---

## 4. 组件结构

```
src/apps/drama/components/flow-canvas/nodes/
├── ScriptCardNode.tsx      🆕 剧本卡片
├── ArtCardNode.tsx          🆕 美术卡片
├── OutputCardNode.tsx       🆕 产出卡片
├── CharacterCardNode.tsx    🆕 人物角色卡片
└── index.ts                🆕 类型→组件映射表
```

`SceneCardNode.tsx` 和 `AssetCardNode.tsx` 保留不删，但从 FlowCanvasPanel 的 `nodeTypes` 映射中移除。

FlowCanvasPanel 的 `nodeTypes` 改为：

```typescript
const nodeTypes = {
  script: ScriptCardNode,
  art: ArtCardNode,
  output: OutputCardNode,
  character: CharacterCardNode,
};
```

---

## 5. 创建方式

### 5.1 Agent Tool 调用

Agent 在任务中调用 tool 创建卡片，toolRouter 新增 action：

| action | 说明 |
|--------|------|
| `add_canvas_card` | 通用卡片创建（type + data） |

已有 `add_node` / `update_node` 等 tool 不受影响。

### 5.2 用户手动创建

画布顶部新增工具栏（Toolbar），包含四种卡片类型的快捷按钮。点击后在画布中央创建对应类型的空白卡片。

右键菜单也添加"添加卡片"子菜单。

---

## 6. 与树的关系

- 完全解耦：移除 `linkedTreeNodeId`
- 树节点增删不再触发画布卡片增删
- 画布卡片增删不再影响树
- 现有双向同步逻辑（`projectStore` ↔ `canvasStore` 联动）从相关 useEffect/handler 中移除

---

## 7. 迁移策略

| 旧类型 | 迁移方式 |
|--------|----------|
| `sceneCard` | 不自动迁移。现有数据保留在 store 中但不再渲染（type 不在 nodeTypes 映射中） |
| `assetCard` | 同上 |
| `linkedTreeNodeId` | 字段保留在 data 中（不破坏现有序列化数据），但不再被读取 |

---

## 8. 边界

- ❌ 不删除 SceneCardNode / AssetCardNode 代码文件
- ❌ 不改变画布缩放、拖拽、连线逻辑
- ❌ 不做卡片间数据联动
- ❌ 任务角色头像生成（字段预留，Phase 4）
- ❌ canvasStore 的 `addNodeFromAsset` 方法移除（资产面板已移除）

---

## 9. 验收标准

1. 画布支持 4 种卡片节点类型（script / art / output / character）
2. 每种卡片有不同的视觉样式（颜色、布局、字段）
3. 卡片与项目树完全解耦（不再双向同步）
4. 用户可通过工具栏/右键菜单创建任意类型卡片
5. Agent 可通过 tool 创建卡片
6. 旧 sceneCard / assetCard 数据不再渲染（保留但不显示）
7. 所有现有测试继续通过（调整与画布卡片相关的测试）
