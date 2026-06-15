# Builder Renderer 组件设计

> LLM 驱动 UI 构建的 6 层安全框架

**日期**: 2026-06-15
**状态**: Draft

---

## 1. 目标

在 Spellpaw 中建立一条独立的结构化 UI 构建通道。LLM 不仅通过 toolRouter 执行简单命令（add_node、delete_node），还能生成可交互的 UI 组件（角色关系图、节奏仪表盘、分镜网格等），经 6 层校验后由用户确认再落地到 store。

## 2. 核心原则

**LLM 不自由生成 UI，而是在严格的 Schema 和组件约束下「填空」。**

六层防御：
1. **结构化输出** — JSON Schema 约束 LLM 输出格式
2. **元数据硬校验** — Zod 逐字段验证引用是否真实存在
3. **组件注册表** — 配置到 UI 精确查表映射
4. **渐进式确认** — 分步展示 + 用户逐步确认
5. **状态同步** — Builder 内编辑 ↔ store 单向落地
6. **错误降级** — 每层失败都有明确降级路径

## 3. 架构定位

```
                         Pandaria
                            │
              ┌─────────────┼─────────────┐
              ▼                           ▼
         toolRouter               Builder Renderer
       (简单命令通道)              (结构化 UI 构建通道)
              │                           │
              │                    ┌───────┴───────┐
              │                    │  6 层校验管道   │
              │                    └───────┬───────┘
              │                            │
              └────────┬───────────────────┘
                       ▼
              共享 handler 函数
         (createNodeHandler, updateNodeHandler,
          addCanvasCardHandler, applyTemplateHandler...)
                       │
                       ▼
               projectStore / canvasStore
```

- **toolRouter** 保留：处理 `add_node`、`delete_node`、`get_tree` 等毫秒级简单命令
- **Builder Renderer** 新增：处理 `spellpaw_build_ui` → 渲染预览 → 用户确认 → 落地
- **共享 handler** 抽取：toolRouter 和 Builder Renderer 共用同一套 store 写入函数

## 4. 6 层校验管道

### 4.1 结构化输出 — Schema 约束

Pandaria tool `spellpaw_build_ui` 的参数由严格 JSON Schema 定义。LLM 输出不合法 JSON → Pandaria 拒收。

```typescript
interface BuilderConfig {
  version: 1;
  /** 渲染目标位置 */
  target: 'canvas' | 'detail_panel' | 'tree_placeholder';
  /** 组件类型（必须在注册表中） */
  component: 'character_map' | 'pacing_dashboard' | 'storyboard_grid';
  /** 组件数据 */
  data: Record<string, unknown>;
  /** 用户可编辑字段 */
  editableFields?: string[];
}
```

### 4.2 元数据校验 — Zod

逐字段验证 `data` 中的引用是否真实存在：

```typescript
const CharacterMapSchema = z.object({
  nodes: z.array(z.object({
    id: z.string(),
    label: z.string(),
    linkedTreeNodeId: z.string().optional(),  // 必须存在于当前项目树
  })),
  edges: z.array(z.object({
    from: z.string(),  // 必须匹配 nodes[].id
    to: z.string(),
    relation: z.string(),
  })),
});
```

校验失败 → `{ layer: 2, error: 'linkedTreeNodeId "xxx" 不存在', suggestion: '可用节点: ...' }`

### 4.3 组件映射表

```typescript
const COMPONENT_REGISTRY: Record<string, React.ComponentType<BuilderComponentProps>> = {
  character_map: CharacterMapBuilder,
  pacing_dashboard: PacingDashboardBuilder,
  storyboard_grid: StoryboardGridBuilder,
};
```

`component` 字段不在注册表 → 降级为纯文本展示 config JSON。

### 4.4 渐进确认

构建物在 Builder 面板中分步渲染，每步一个确认点：

```
步骤 1/3: 角色节点 [确认 ✓] [修改] [跳过]
步骤 2/3: 关系连线 [确认 ✓] [修改] [跳过]
步骤 3/3: 位置与样式 [确认 ✓] [修改] [跳过]
```

全步骤确认 → 调用共享 handler 一次性写入 store。

### 4.5 状态同步

Builder 渲染的 UI 可编辑（拖动画布卡片、改字段值）。修改后：
- Builder 内部状态更新
- emit `onChange` 事件，外层感知变化
- 确认时一次性落地，不逐次写 store

与画布上已有卡片的关系：Builder 中的构建物是「草稿态」，确认后才创建正式卡片。

### 4.6 错误降级

| 场景 | 处理 |
|------|------|
| LLM 输出格式错误 | Zod 校验失败 → 显示「无法理解，请重新描述」 |
| LLM 引用不存在的节点 | 元数据校验失败 → 显示「节点 xxx 不存在，试试...」 |
| LLM 引用不存在的字段 | 字段校验失败 → 红色高亮 + 建议修正 |
| 组件不在注册表 | 降级渲染 config JSON（纯文本） |
| 渲染组件崩溃 | Error Boundary 捕获 → 显示「该步骤无法渲染」+ 重试/跳过 |

## 5. 文件结构

```
src/shared/
├── lib/
│   └── builderSchema.ts              # Zod schemas + BuilderConfig 类型
├── components/builder/
│   ├── BuilderPanel.tsx              # 组装层：接收 config，渲染预览 + 确认栏
│   ├── BuilderErrorBoundary.tsx      # ⑥ 错误降级
│   ├── registry.ts                   # ③ 组件映射表
│   ├── components/                   # 各构建物
│   │   ├── CharacterMapBuilder.tsx
│   │   ├── PacingDashboardBuilder.tsx
│   │   └── StoryboardGridBuilder.tsx
│   ├── hooks/
│   │   └── useBuilderConfirm.ts      # ④ 渐进确认状态机
│   └── index.ts

src/apps/drama/
├── lib/
│   └── builderHandlers.ts            # 共享 handler（toolRouter → 抽纯函数）
├── stores/
│   └── builderStore.ts               # Builder 运行时状态（config, step, edits, status）
└── hooks/
    └── useBuilderBridge.ts           # WebSocket 监听 spellpaw_build_ui
```

## 6. 数据流（一次完整调用）

```
用户: "帮我设计角色关系图"
  → Pandaria session message
  → LLM 调用 spellpaw_build_ui({ component: "character_map", data: {...} })
  → Pandaria POST /tool
  → Vite 插件 WebSocket → useBuilderBridge
  → builderStore.setConfig(config)
  → BuilderPanel 渲染:
      ① Schema 校验
      ② Zod 元数据校验
      ③ 查 component registry → CharacterMapBuilder
      ④ 分步确认（用户逐步点确认/修改）
      ⑤ 确认期间编辑 → onChange 事件
  → 全部确认 → builderHandlers.createNodeHandler() / addCanvasCardHandler()
  → store 写入 → UI 更新
  → ⑥ 任意一步失败 → 降级
```

## 7. 第一阶段交付物

- `builderSchema.ts` — Zod schemas
- `builderHandlers.ts` — 共享 handler 函数（从 toolRouter 抽）
- `builderStore.ts` — Builder 运行时状态
- `useBuilderBridge.ts` — WebSocket 监听
- `BuilderPanel.tsx` + `CharacterMapBuilder.tsx` — 首个组件，全链路跑通

## 8. 测试策略

| 对象 | 覆盖 |
|------|------|
| `builderSchema` | Zod schema 正例/反例，元数据校验 |
| `registry` | 未知 component 降级、已知 component 正确映射 |
| `CharacterMapBuilder` | 渲染节点/边、编辑回调、确认 |
| `useBuilderConfirm` | 分步确认状态机（前进、后退、跳过、修改） |
| `BuilderErrorBoundary` | 子组件崩溃渲染降级 UI |
| `builderHandlers` | 与 toolRouter 共享，已有 toolRouter 测试覆盖 |

## 9. 实施阶段

| 阶段 | 内容 | 可并行 |
|------|------|--------|
| 0 | `builderHandlers.ts` — 从 toolRouter 抽 handler 纯函数 | ✅ 可与 CopilotChat 并行 |
| 1 | `builderSchema.ts` + `registry.ts` — 校验管道骨架 | 依赖 0 |
| 2 | `builderStore.ts` — Builder 运行时状态 | 依赖 1 |
| 3 | `useBuilderBridge.ts` — WebSocket 接收 | 依赖 2 |
| 4 | `BuilderPanel.tsx` + `CharacterMapBuilder.tsx` | 依赖 3 |
| 5 | Pandaria tool config 注册 `spellpaw_build_ui` | 依赖 4 |
