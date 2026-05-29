# AI 分镜生成完善 — 设计文档

> 日期：2026-05-29
> 方案：A（现有 UI 增量增强）
> 关联：ROADMAP Phase 2.2.3 AI 分镜画面生成

---

## 1. 背景与目标

Phase 2 的 `generate_storyboard` tool 和 `imageGen.ts` 已完成基础图像生成能力，但前端体验存在断层：

- 画布卡片不显示 AI 生成的参考图缩略图
- 只能单张生成，无法批量处理
- 无法复用已生成图片的视觉风格到其他场景

本设计补齐这三个体验缺口，在现有组件上做最小增量改动。

---

## 2. 功能总览

| # | 功能 | 改动面 | 依赖 |
|---|------|--------|------|
| 1 | 画布缩略图展示 | `SceneCardNode` + 类型 | `thumbnail` 字段已存在 |
| 2 | 批量生成分镜图 | `TreeViewPanel` bulk bar | 多选机制刚完成 |
| 3 | 风格锁 | `SceneCardNode` + `projectStore` | 需新增 prompt 存储 |

---

## 3. 详细设计

### 3.1 画布缩略图展示

**组件**：`src/components/flow-canvas/nodes/SceneCardNode.tsx`

**设计：**

```
┌──────────────────────────────┐
│  [🖼️ AI 参考图 aspect-9/16]   │  ← 新增
│  加载中: shimmer 骨架屏       │
│  失败: 灰色占位 + 重试按钮    │
├──────────────────────────────┤
│  场景标题          [Draft]   │
│  场景描述…                   │
└──────────────────────────────┘
```

- **图片区域**：卡片顶部增加 `aspect-[9/16]` 容器（约 240px × 135px，适配 DALL-E 3 竖屏 9:16 比例）
  - 有 `thumbnail` 时显示 `<img>`，`object-cover`，圆角与卡片顶部一致
  - 加载中：`animate-pulse bg-[var(--color-bg-tertiary)]` shimmer
  - 加载失败：`ImageOff` icon + 灰色背景 + "点击重试"提示
  - 图片点击：在新标签页打开原图（最小实现，不做 lightbox）
- **卡片高度**：当前 `w-[240px]`，无固定高度，加图后自然增高
- **无图状态**：无 `thumbnail` 时不显示图片区域，保持现有外观

**数据流**：`thumbnail` 已存在于 `CanvasNodeData`（`src/types/index.ts`），`toolRouter.generate_storyboard` 已写入 `canvasStore.updateNodeData(linkedCard.id, { thumbnail: imageUrl })`。前端只需读取渲染。

---

### 3.2 批量生成分镜图

**触发入口**：`TreeViewPanel` 的 bulk action bar

```
[ 3 已选中 ]  [状态 ▼]  [🗑 删除]  [🎨 生成分镜]  ← 新增
```

**流程：**

1. **过滤**：只处理 `type === 'scene'` 或 `'shot'` 的选中节点。Project/Act 被选中时忽略（toast 提示"仅支持场景/镜头"）。
2. **串行执行**：`for...of` 循环逐个 `await toolRouter.generate_storyboard({ nodeId })`
   - 串行原因：避免 OpenAI 并发限流，用户能看到逐张进度
   - 每张间隔 500ms
3. **进度指示**：顶部浮动 toast（最小实现，用现有 UI 模式或新增简单 toast 组件）
   - "🎨 正在生成 1/5: 场景 1-1..."
   - "✅ 场景 1-1 完成"
   - "❌ 场景 1-2 失败: API key 未配置"
   - 全部完成后 3 秒自动消失
4. **错误处理**：单张失败不中断流程。失败节点汇总，最后提示 "3/5 成功，2 个失败"。
5. **取消**：最小实现不做取消按钮。串行总时长可控（5 张约 15–30 秒），用户刷新页面即可中断。

**数据流：**

```
TreeViewPanel 多选
  ↓ 点击"🎨 生成分镜"
过滤出 scene/shot 节点
  ↓
for (const [index, node] of nodes.entries()) {
  显示进度 toast(index + 1 / total)
  await toolRouter.generate_storyboard({ nodeId: node.id })
  // toolRouter 内部自动把 thumbnail 写入 canvasStore
}
  ↓
汇总 toast("完成 X/Y")
```

---

### 3.3 风格锁

**概念**：保存某张参考图的生成 prompt，后续批量生成其他场景时复用该风格。

**状态存储**：项目根节点 `TreeNode.metadata` 新增字段

> 注：`Project` 类型仅用于项目列表页，工作区的实际项目数据通过 `TreeNode` 管理。`lockedStylePrompt` 必须跟随项目，因此存到项目根节点（`type === 'project'`）的 `metadata` 中。

```typescript
// TreeNode.metadata 扩展
interface TreeNodeMetadata {
  // ... 现有字段
  lockedStylePrompt?: string | null;  // ← 新增：锁定的风格 prompt
  lockedStyleNodeId?: string | null;  // ← 新增：来源节点 ID
}
```

**生成时存储 prompt**：`toolRouter.generate_storyboard` 修改

- 增加可选参数 `stylePrompt?: string`，传入时优先使用而非 `buildImagePrompt(node)`
- 生成完成后，同时写入 `thumbnail` + `generatedPrompt`

```typescript
export const toolRouter: ToolRouter = {
  generate_storyboard: async (params) => {
    const nodeId = params.nodeId as string;
    const customPrompt = params.prompt as string | undefined;
    const stylePrompt = params.stylePrompt as string | undefined;  // ← 新增

    // ... 查找 node ...

    const { generateImage, buildImagePrompt } = await import('../lib/imageGen');

    // 优先级：stylePrompt > customPrompt > buildImagePrompt
    let prompt: string;
    if (stylePrompt) {
      prompt = `${stylePrompt}\n\nScene: "${node.title}".`
        + (node.metadata?.location ? ` Location: ${node.metadata.location}.` : '')
        + (node.metadata?.timeOfDay ? ` Time: ${node.metadata.timeOfDay}.` : '')
        + (node.metadata?.shotType ? ` Shot: ${node.metadata.shotType}.` : '')
        + (node.metadata?.description ? ` ${node.metadata.description}` : '');
    } else {
      prompt = customPrompt || buildImagePrompt(node);
    }

    const imageUrl = await generateImage({ prompt, size: '1024x1792' });

    // 同时写入 thumbnail + generatedPrompt
    canvasState.updateNodeData(linkedCard.id, {
      thumbnail: imageUrl,
      generatedPrompt: prompt,
    });

    return `已为「${node.title}」生成参考图: ${imageUrl}`;
  },
};
```

**UI 交互**：`SceneCardNode` 缩略图 hover 遮罩

```
┌──────────────────────────────┐
│  [🖼️ 场景参考图]              │
│  ┌────────────────────────┐  │
│  │      🔒 锁定风格        │  │  ← hover 显示
│  └────────────────────────┘  │
├──────────────────────────────┤
│  场景 1-1：醒来               │
│  ...                         │
└──────────────────────────────┘
```

- **点击"🔒 锁定风格"**：
  - 读取 `canvasNode.data.generatedPrompt`
  - `projectStore.setLockedStyle(prompt, nodeId)` → 写入项目根节点的 `metadata.lockedStylePrompt` / `metadata.lockedStyleNodeId`
  - toast："✅ 已锁定「场景 1-1」的风格"
- **已锁定状态**：被锁定风格的卡片缩略图右下角显示小锁图标 🔒
- **全局提示**：`TreeViewPanel` bulk bar 旁显示 "🔒 基于「场景 1-1」的风格"（当 `lockedStylePrompt` 存在时）
- **解除锁定**：再次点击同一张卡片的 🔒，或 bulk bar 上新增"清除风格锁"按钮 → `projectStore.clearLockedStyle()` 清除项目根节点的 `metadata.lockedStylePrompt` / `metadata.lockedStyleNodeId`

---

## 4. 类型变更

### 4.1 CanvasNodeData

```typescript
// src/types/index.ts
interface CanvasNodeData {
  title: string;
  description?: string;
  status?: TreeNode['status'];
  linkedTreeNodeId?: string;
  thumbnail?: string;        // ← 已存在
  generatedPrompt?: string;  // ← 新增：记录生成该缩略图所用的 prompt
  // ...
}
```

### 4.2 Toast 组件

新增 `src/components/ui/Toast.tsx` — 轻量进度提示组件，不引入第三方库：

```typescript
interface ToastProps {
  message: string;
  type?: 'info' | 'success' | 'error';
  onClose?: () => void;
}

// 使用方式：固定定位在视口顶部居中，3 秒后自动消失
// 支持动态更新内容（进度文本变化时替换消息）
```

---

## 5. 组件改动清单

| 文件 | 改动内容 |
|------|---------|
| `src/types/index.ts` | `CanvasNodeData` 增加 `generatedPrompt`；`TreeNodeMetadata` 增加 `lockedStylePrompt`、`lockedStyleNodeId` |
| `src/stores/projectStore.ts` | 新增 `setLockedStyle(prompt, nodeId)` / `clearLockedStyle()` action；读写项目根节点的 metadata |
| `src/stores/toolRouter.ts` | `generate_storyboard` 同时写入 `thumbnail` + `generatedPrompt`；支持 `lockedStylePrompt` 覆盖 |
| `src/components/flow-canvas/nodes/SceneCardNode.tsx` | 顶部增加缩略图区域（含加载/错误态）；hover 显示"锁定风格"遮罩；已锁定状态图标 |
| `src/components/tree-view/TreeViewPanel.tsx` | bulk action bar 新增"🎨 生成分镜"按钮；串行生成逻辑 + 进度 toast；显示/清除风格锁提示 |
| `src/components/ui/Toast.tsx` | 新增（或复用现有）简单的进度 toast 组件 |

---

## 6. 错误处理

| 场景 | 行为 |
|------|------|
| 无 API Key | 首图生成时即失败，toast 提示"请在 Settings 中配置 OpenAI API Key"，停止剩余生成 |
| 单张生成超时/失败 | 记录失败，toast 提示该场景失败原因，继续下一张 |
| 全部失败 | toast 提示"全部分镜生成失败"，展示最后一条错误信息 |
| 锁定风格但源卡片被删除 | 保留 `lockedStylePrompt`，仅清除 `lockedStyleNodeId`（项目根节点 metadata 更新）。提示"原场景已删除，风格 prompt 仍保留" |
| 网络中断 | 串行执行自然中断，已生成的保留，未生成的不执行 |

---

## 7. 测试策略

| 测试 | 方式 |
|------|------|
| SceneCardNode 渲染缩略图 | 组件测试：传入 `thumbnail` 断言 `<img>` 存在；无 `thumbnail` 断言无图片区域 |
| 加载/错误态 | 组件测试：模拟 `onError` 事件断言占位图显示 |
| 批量生成过滤 | 集成测试：选中 project + scene，断言仅 scene 被提交 |
| 风格锁存储 | store 测试：`setLockedStyle` → 断言 `lockedStylePrompt` 更新；`clearLockedStyle` → 断言为 null |
| toolRouter 风格覆盖 | 单元测试：`generate_storyboard` 在 `lockedStylePrompt` 存在时使用锁定 prompt |

---

## 8. 限制与后续扩展

- **风格锁仅支持单一样式**：覆盖 80% 短剧场景（整集统一视觉风格）。后续可扩展为"风格预设列表"。
- **缩略图无 lightbox**：点击直接开新标签页。后续可升级为图片预览弹窗。
- **批量生成无取消按钮**：串行总时长可控，刷新页面即可中断。后续如场景数 > 20 时考虑增加取消。

---

*文档版本：v1.0*  
*关联：ROADMAP Phase 2.2.3*
