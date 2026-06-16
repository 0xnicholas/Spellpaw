# Buzzy 借鉴开发计划

> 基于 Buzzy 分析的 5 个可借鉴方向，按实施优先级排列

**日期**: 2026-06-15
**来源**: 原 `docs/competitive-analysis-buzzy.md` 已删除（分析对象为 Buzzy.buzz，与 Spellpaw 无关）。本计划保留为历史归档。

---

## 总览

| 阶段 | 方向 | 工作量 | 依赖 |
|------|------|--------|------|
| A | 三层工作流命名 | 2h（UX copy） | 无 |
| B | 强化「语义定义」定位 | 4h（system prompt + 文案） | 无 |
| C | Figma 导出 | 2d | canvasStore 数据结构 |
| D | 共享模板/规则引擎 | 3d | builderHandlers 已就绪 |
| E | Spellpaw MCP Server | 1w | MCP 协议 |

---

## Phase A：三层工作流命名

**目标**：让用户的心智模型从「和 AI 瞎聊」升级为「Kickstart → Enhance → Extend」三段式创作。

### A.1 QuickActions 重命名

`src/apps/drama/components/chat-panel/QuickActions.tsx`

```diff
- { icon: PenLine, label: '生成下一幕' },
- { icon: Clapperboard, label: '分析剧本结构' },
- { icon: Palette, label: '生成视觉风格' },
- { icon: Scissors, label: '优化节奏' },
+ { icon: Rocket, label: '🚀 Kickstart：快速生成初稿' },
+ { icon: PenLine, label: '✨ Enhance：展开下一幕' },
+ { icon: Scissors, label: '✨ Enhance：优化节奏' },
+ { icon: Palette, label: '✨ Enhance：生成视觉风格' },
```

### A.2 CopilotChat 空状态文案

当消息列表为空时，显示三段式引导：

```tsx
<CopilotChat emptyState={
  <div className="flex flex-col items-center gap-4 px-6 py-12 text-center">
    <h3 className="text-sm font-semibold">开始创作</h3>
    <div className="grid grid-cols-1 gap-2 text-left text-xs">
      <div>🚀 <b>Kickstart</b> — 描述你的故事，AI 生成结构初稿</div>
      <div>✨ <b>Enhance</b> — 逐幕展开分镜、精调对白、优化节奏</div>
      <div>📤 <b>Extend</b> — 导出分镜图、生成拍摄脚本</div>
    </div>
  </div>
} />
```

### A.3 ChatPanel 装配层注入

`src/apps/drama/components/chat-panel/ChatPanel.tsx`：

```tsx
<CopilotChat
  messages={filteredMessages}
  streamingText={streamingMessage}
  // ...
  emptyState={<WorkflowGuide />}
/>
```

### A.4 交付物

- `QuickActions.tsx` 文案更新
- 新建 `WorkflowGuide.tsx` 空状态组件
- `ChatPanel.tsx` 注入 `emptyState`

---

## Phase B：强化「语义定义」定位

**目标**：在 system prompt 和 UI 中明确传达「Spellpaw 不生成视频，生成叙事结构 spec，你在引擎中预览、精调、导出」。

### B.1 System prompt 重写

`src/apps/drama/lib/copilot.ts` — `buildSystemPrompt()` 顶部增加定位声明：

```diff
  return [
+   `你是 Spellpaw 的 AI 叙事架构师。Spellpaw 不生成视频——它生成「叙事结构定义」：`,
+   `一份描述幕、场景、镜头、对白、节奏的声明式 spec，在 Spellpaw 引擎中预览和精调。`,
+   `你的职责是协助用户创建和优化这份定义，而不是直接生成视频内容。`,
+   ``,
    `你是 SpellPaw 的 AI 创作助手，帮助用户创作短剧/短视频。`,
    ``,
```

### B.2 工具描述对齐

`src/apps/drama/lib/toolConfigs.ts` — 更新每个 tool 的 `description`，统一用「叙事结构定义」语言：

```diff
- description: 'Add a node (act/scene/shot) to the project tree.',
+ description: '向叙事结构定义中添加一个节点（幕/场景/镜头）。',
```

### B.3 交付物

- `lib/copilot.ts` — `buildSystemPrompt()` 增加定位声明
- `lib/toolConfigs.ts` — tool descriptions 中文化 + 对齐术语

---

## Phase C：Figma 导出

**目标**：画布卡片 → Figma 兼容格式导出，让用户可以把分镜设计稿交给设计师或自己继续在 Figma 中加工。

### C.1 技术方案

Figma 不支持直接导入外部格式，但支持 **Figma Plugin API** 和 **FIG file format**（`.fig`）。实际可行路径：

**路径 1：生成 Figma Plugin 可读取的 JSON**
- 创建 `src/apps/drama/lib/exportFigma.ts`
- 将 `canvasStore.nodes` 转换为 Figma-compatible node tree（Frame → Rectangle → Text）
- 用户在 Figma 中安装 Spellpaw Plugin → 导入 JSON

**路径 2：导出 SVG + 元数据**
- 画布区域截图 + 节点位置 JSON
- Figma 中 paste SVG + manual layout

推荐路径 1，可行且不需要 Figma API key。

### C.2 实现

```typescript
// src/apps/drama/lib/exportFigma.ts

interface FigmaNode {
  type: 'FRAME' | 'RECTANGLE' | 'TEXT';
  name: string;
  // ...
}

export function canvasToFigma(nodes: CanvasNode[]): FigmaNode {
  // 将 SceneCard → Frame
  // ArtCard thumbnail → Rectangle with image fill
  // CharacterCard → Frame with Text children
  // DeliverableCard → Frame with metadata text
}
```

### C.3 交付物

- `src/apps/drama/lib/exportFigma.ts` — 转换函数
- `src/apps/drama/components/modals/ExportFigmaModal.tsx` — 导出 UI
- 在 WorkspacePage 工具栏注册导出按钮

---

## Phase D：共享模板/规则引擎

**目标**：跨项目共享叙事模板和风格规则，类似 Buzzy 的「统一治理引擎」。

### D.1 现状

- `customTemplateStore` 已支持自定义模板的 CRUD + 导入导出
- `builderHandlers` 已是共享执行层
- 模板按项目隔离存储（IndexedDB）

### D.2 改造

```typescript
// src/apps/drama/stores/sharedTemplateStore.ts

interface SharedTemplate extends NarrativeTemplate {
  scope: 'user' | 'project' | 'team';
  usageCount: number;
}
```

- scope: `user` = 跨项目的用户模板，`project` = 当前项目专属，`team` = 共享工作区
- usageCount: 模板使用次数，用于排序推荐

### D.3 交付物

- `sharedTemplateStore.ts` — 跨项目模板管理
- 更新 `customTemplateStore` 引用 shared store
- UI：TemplateBrowser 增加「我的模板」tab

---

## Phase E：Spellpaw MCP Server

**目标**：对外暴露 MCP 协议，让 Cursor、Claude Desktop、VS Code Copilot 等外部 AI 工具直接操作 Spellpaw 项目树。

### E.1 架构

```
Cursor / Claude Desktop
        │
        ▼ MCP Protocol (stdio)
  Spellpaw MCP Server (Node.js)
        │
        ▼ WebSocket
  Spellpaw Web App (浏览器)
        │
        ▼
  projectStore / canvasStore
```

### E.2 MCP Tools

| Tool | 对应 toolRouter action |
|------|----------------------|
| `spellpaw_get_tree` | `get_tree` |
| `spellpaw_add_node` | `add_node` |
| `spellpaw_update_node` | `update_node` |
| `spellpaw_delete_node` | `delete_node` |
| `spellpaw_apply_template` | `apply_template` |
| `spellpaw_analyze_structure` | `analyze_structure` |
| `spellpaw_export_storyboard` | 新增：导出分镜为 PDF/PNG |

### E.3 实现

```typescript
// spellpaw-mcp-server/src/index.ts

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

const server = new Server({
  name: 'spellpaw-mcp',
  version: '1.0.0',
}, {
  capabilities: { tools: {} },
});

// Register tools: spellpaw_get_tree, spellpaw_add_node, ...
// Connect to Spellpaw WebSocket bridge
```

### E.4 交付物

- `spellpaw-mcp-server/` 目录：MCP server 实现
- `package.json` scripts: `"mcp": "node spellpaw-mcp-server"`
- 文档：`docs/mcp-integration.md`

---

## 优先级建议

```
现在可做 ──→  Phase A（2h） + Phase B（4h）
             改文案 + system prompt，无技术风险，立即提升产品定位

本月可做 ──→  Phase D（3d）
             共享模板引擎，为协作打基础

下月可做 ──→  Phase C（2d）
             Figma 导出，吸引设计师用户

远期     ──→  Phase E（1w）
             MCP Server，打开 AI 工具生态
```
