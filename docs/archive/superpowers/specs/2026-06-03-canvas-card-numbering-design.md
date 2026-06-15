# 画布卡片编号系统 — 设计文档

> 日期: 2026-06-03 · 状态: 已确认（v2，经 spec review）

---

## 1. 目标

为 Spellpaw 中所有对象（树节点 + 画布卡片）建立统一的编号系统，满足三个场景：

- **服务端交互**：ID 稳定不可变，同步时不丢对应关系
- **开发者调试**：看日志/网络请求能一眼认出对象
- **客户端逻辑**：可从树结构重建编号，无需持久化

---

## 2. 数据模型

每个对象拥有两个标识字段：

| 字段 | 用途 | 持久化 | 可变 |
|------|------|--------|------|
| `internalId` | store key、React key、sync 匹配 | ✅ IndexedDB / 服务端 | ❌ 永不变化 |
| `displayNumber` | 卡片 UI 展示 | ❌ | ✅ 树变更时重算 |

**rule: internalId 是真相来源，displayNumber 是派生数据。**

### 2.1 internalId 格式

```
树节点:    nd_xxxxxxxx   (前缀 nd_ + 10 位随机字符)
画布卡片:  cv_xxxxxxxx   (前缀 cv_ + 10 位随机字符)
```

`generateId()` 升级为 `generateId(prefix: string, length?: number)` —— 保留现有 Date.now() 时间戳以维持排序友好性，但扩展随机段长度到 10 位（字母+数字混合）。前缀 `nd_` / `cv_` 仅用于调试区分，不参与业务逻辑。

### 2.2 displayNumber 格式

**树节点** — 纯数字层级路径，`-` 分隔：

```
项目根      （不编号）
第一幕      1
  场景 1-1  1-1
    镜头 1  1-1-1
    镜头 2  1-1-2
  场景 1-2  1-2
第二幕      2
```

**画布卡片** — 继承树编号 + 类型后缀。范围覆盖全部 4 种已注册节点类型（script / art / character / deliverable）：

| 卡片类型 | 挂载卡片 | 自由卡片 |
|----------|---------|---------|
| script | `{treeNum}-S{n}` | `Free-S{n}` |
| art | `{treeNum}-A{n}` | `Free-A{n}` |
| character | `{treeNum}-C{n}` | `Free-C{n}` |
| deliverable·image | `{treeNum}-D-img{n}` | `Free-D-img{n}` |
| deliverable·video | `{treeNum}-D-vid{n}` | `Free-D-vid{n}` |
| deliverable·audio | `{treeNum}-D-aud{n}` | `Free-D-aud{n}` |

- 挂载卡片：`linkedTreeNodeId` 指向树节点时，编号 = 树节点编号 + 类型码 + 同父同类型内序号
  - `linkedTreeNodeId` 预期指向 scene 或 shot 类型节点（project/act 虽可行但非预期用途）
  - deliverable 卡片需同时检查 `node.type === 'deliverable'` 和 `node.data.deliverableType` 决定后缀
- 自由卡片：无 `linkedTreeNodeId` 或链接目标在树中不存在时，编号 = `Free-` + 类型码 + 全局自由池内序号
- 序号从 1 开始，同组独立计数
- **排序规则**：同组内卡片按 store 数组中的 index 排序（等价于创建顺序）。后续可引入 `sortOrder` 字段支持手动排序

---

## 3. 编号计算引擎

### 3.1 函数签名

```typescript
// src/apps/drama/lib/numbering.ts

function computeDisplayNumbers(
  tree: TreeNode | null,
  canvasNodes: CanvasNode[]
): Map<string, string>  // internalId → displayNumber

function getDisplayNumber(
  map: Map<string, string>,
  internalId: string,
): string
```

### 3.2 计算逻辑

1. **遍历树**（深度优先，跳过 `type === 'project'` 的根节点）：
   - 维护 `path: number[]`，每个子节点 push `index + 1`，返回时 pop
   - `displayNumber = path.join('-')`（如 `"1-2-3"`）
2. **遍历画布卡片**（按 store 数组 index 顺序以保证确定性）：
   - 若 `linkedTreeNodeId` 有效且在树 map 中 → 继承树编号 + 类型后缀（同父+同类型内顺序计数）
   - 否则 → `Free-` + 类型码 + 全局自由池计数器
   - deliverable 卡片：检查 `node.type === 'deliverable'` 且 `node.data.deliverableType` 决定后缀
3. 返回 `Map<internalId, displayNumber>`

纯函数，无副作用。输入相同则输出相同。

### 3.3 触发时机

通过 `useMemo` 在 `WorkspaceLayout` 或自定义 hook 中响应式计算：

```
[tree] ──┐
          ├── useMemo → displayNumbers Map
[nodes] ──┘
```

React 自动处理重算时机。无需手动触发。

### 3.4 性能

当前规模（<100 节点 + <100 卡片）遍历 <1ms。未来上万节点时可用脏标记增量计算。

---

## 4. 存储策略

| 存储层 | 存什么 |
|--------|--------|
| IndexedDB (persist) | `internalId`（即现有 `id` 字段） |
| localStorage cache | 无 |
| 服务端 JSON | `internalId`，不包含 `displayNumber` |
| React state | `displayNumbers` Map（useMemo 派生） |

`displayNumber` 每次应用启动时从树结构**重建**，保证永远与实际结构一致。

---

## 5. 集成方案

### 5.1 Store 层 — 零改动

`projectStore` 和 `canvasStore` 的 `id` 字段即 `internalId`。不需要改字段名，不需要新增 store 方法。

### 5.2 Hook 层与数据注入

`displayNumbers` Map 在 `FlowCanvasPanel` 中通过 `useMemo` 计算一次，然后写入每个 node 的 `data` 对象（非持久化字段 `_displayNumber`）再传给 React Flow。卡片组件直接从 `data._displayNumber` 读取，**不引入 React Context**：

```typescript
// FlowCanvasPanel.tsx 中
const displayNumbers = useMemo(
  () => computeDisplayNumbers(currentTree, currentNodes),
  [currentTree, currentNodes]
);

const nodesWithNumbers = nodes.map(n => ({
  ...n,
  data: { ...n.data, _displayNumber: displayNumbers.get(n.id) ?? '' },
}));

// 传给 ReactFlow 的 nodes 使用 nodesWithNumbers
```

这样每个卡片组件无需任何额外订阅，直接从 `data._displayNumber` 取编号即可。`_displayNumber` 以下划线前缀标记为派生字段，不持久化。

### 5.3 现有 ID 迁移

- 旧 mock 数据（`tree_act_1`、`cn_script_1` 等）不做迁移
- 旧 ID 当 `internalId` 直接使用，格式不统一但功能正常
- 新建对象统一用 `nd_xxxxxxxx` / `cv_xxxxxxxx` 格式
- `generateId()` 升级为 `generateId(prefix, length?)`

### 5.4 同步 — 零改动

`internalId` 已是同步匹配键。`displayNumber` 不写入 JSON payload。

---

## 6. 卡片 UI 视觉设计

### 6.1 统一原则

所有卡片类型在**左上角**展示 `displayNumber`。样式统一：

```
font-size:        9px
color:            var(--color-text-tertiary)
font-family:      ui-monospace, monospace
letter-spacing:   0.02em
```

### 6.2 有 header bar 的卡片

编号嵌入 header bar 左侧，在类型标签之前：

```
┌──────────────────────────┐
│ 1-1-S1  📝 剧本          │
│ ───────────────────────  │
│ 场景 1-1 脚本       草稿  │
│ ...                      │
└──────────────────────────┘
```

适用：ScriptCardNode、ArtCardNode、CharacterCardNode、DeliverableCardNode。

### 6.3 无 header bar 的卡片

编号作为卡片第一行，独立展示：

```
┌──────────────────────────┐
│ 1-1-S1                   │
│ [       缩略图          ] │
│ ───────────────────────  │
│ 场景 1-1 脚本       草稿  │
└──────────────────────────┘
```

适用：当前无此类型。预留规则供未来使用。

### 6.4 自由卡片

`Free-S1` 等前缀用同样样式，不特殊处理。

---

## 7. 数据类型变更

```typescript
// CanvasNodeData（src/apps/drama/types/index.ts）
// 新增字段：无。displayNumber 不作为 data 字段存在。

// TreeNode（src/apps/drama/types/index.ts）
// 新增字段：无。displayNumber 不作为 TreeNode 字段存在。
```

编号系统**不修改任何现有类型定义**。完全通过外部计算层实现。

---

## 8. 文件清单

| 文件 | 操作 | 说明 |
|------|------|------|
| `src/apps/drama/lib/numbering.ts` | **新建** | `computeDisplayNumbers()` + 辅助函数 |
| `src/apps/drama/lib/numbering.test.ts` | **新建** | 单元测试（纯函数） |
| `src/shared/lib/utils.ts` | 修改 | `generateId()` 升级为 `generateId(prefix, length?)` |
| `src/apps/drama/components/flow-canvas/nodes/*.tsx` | 修改 | 4 个卡片组件从 `data._displayNumber` 读取编号展示 |
| `src/apps/drama/components/flow-canvas/FlowCanvasPanel.tsx` | 修改 | 计算 `displayNumbers` + 注入到 node data |

## 9. 已知限制与后续工作

- **dangling linkedTreeNodeId**：删除树节点时，画布卡片上的 `linkedTreeNodeId` 不会被自动清理。编号系统将其处理为自由卡片，但引用残留存在。属于数据卫生问题，低优先级，建议后续添加清理逻辑。
- **排序规则**：当前按 store 数组 index 排序（创建顺序）。若需要用户手动排序，可后续添加 `sortOrder` 字段。
- **SceneCardNode / AssetCardNode**：这两个文件存在但不在节点类型注册表中，不纳入本次编号范围。未来注册后按"无 header bar"规则处理。

---

*最后更新：2026-06-03*
