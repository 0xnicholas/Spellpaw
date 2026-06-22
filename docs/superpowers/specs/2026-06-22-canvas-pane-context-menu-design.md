# Canvas Pane 右键创建菜单设计

**Status**: Draft
**Date**: 2026-06-22
**Scope**: Spellpaw Drama Studio — Canvas 空白画布右键菜单 + 内联 Copilot 生成卡片

---

## 1. 背景与目标

### 1.1 现状

Canvas 当前已有基础右键菜单（`CanvasPanel.tsx` 第 222-240 行），但**仅在节点上**右击时出现，只有"复制/删除"两项。空白画布（pane）右击**无任何反应**。

### 1.2 目标

为空白画布右击增加一个**创建型菜单**，让用户在不打开 ChatPanel 的情况下，直接在画布上发起内容生成：

| 菜单项 | 含义 |
|--------|------|
| Upload | 上传文件创建资源/产出卡片 |
| Text Generation | 用 LLM 生成剧本/角色文本 |
| Image Generation | 用图像模型生成分镜/角色立绘 |
| Video Generation | 用视频模型生成视频片段 |

设计要点：
- **菜单项统一为同一 UI**（4 种卡片共享一个 `CopilotCard` 组件，仅配置不同）
- **生成完成后自动插入**正式卡片到画布（无需手动确认）
- **零新依赖**——保留现有手写菜单风格，仅重构结构

### 1.3 不在本 spec 范围

- 节点右键菜单增强（保留现有复制/删除）
- 快捷键绑定（用户明确不需要）
- 删除确认对话框（用户明确不要删除功能）
- 多级嵌套菜单
- AI Teammate 主动召唤（属于另一个 spec）

---

## 2. 设计决策（已确认）

| 维度 | 决策 | 理由 |
|------|------|------|
| 触发位置 | **仅空白画布（pane）** | 节点菜单已有，避免冲突 |
| 菜单风格 | **手写 + 重构** | 零新依赖、最小风险、与现有视觉一致 |
| 卡片形态 | **独立 React Flow 节点** | 可拖动、可删除、统一架构 |
| 卡片 UI | **4 类共享同一个 `CopilotCard`** | 单一组件，按 config 差异化 |
| 完成后处理 | **自动插入 + 移除 copilot 节点** | 用户确认："自动" |
| 卡片尺寸 | **240×~200px**（紧凑） | 不占大量画布空间 |
| 生成调用 | **复用现有 canvasToolkit actions** | 零重复实现 |

---

## 3. 架构总览

```
CanvasPanel.tsx (修改)
├─ ReactFlow
│   ├─ onPaneContextMenu → PaneContextMenu (新)
│   └─ onNodeContextMenu → 保留现有菜单
├─ nodeTypes 注册 (修改)
│   └─ 新增: copilotCard → CopilotCardNode (新)
└─ 创建流程:
    P 右击 pane
      → PaneContextMenu 显示
      → P 点击 "Image Generation"
      → canvasStore.addNode({ type: 'copilotCard', position, data: { kind: 'image', status: 'idle' } })
      → CopilotCardNode 渲染 (统一 UI)
      → P 输入 prompt, 点 "生成"
      → 内部调用 canvasToolkit action
      → 流式更新 status / progress
      → 完成时:
          ├─ canvasStore.addNode({ type: 'art', data: { thumbnail, prompt, ... } })
          └─ canvasStore.removeNode('copilotCard_xxx')
```

### 文件布局

```
src/shared/components/canvas/
├─ CanvasPanel.tsx                              # 修改：注册新菜单 + nodeType
├─ PaneContextMenu/                             # 新目录
│   ├─ PaneContextMenu.tsx                      # 菜单组件
│   ├─ PaneContextMenu.test.tsx
│   └─ index.ts
└─ nodes/
    ├─ CopilotCardNode.tsx                      # 统一 Copilot 卡片
    ├─ CopilotCardNode.test.tsx
    └─ index.ts                                 # 修改：导出新组件
```

---

## 4. 组件设计

### 4.1 PaneContextMenu

```tsx
interface PaneContextMenuProps {
  x: number;          // Screen coordinates (clientX) — for `position: fixed` placement
  y: number;          // Screen coordinates (clientY)
  flowPosition: { x: number; y: number };  // Flow coordinates — for `addNode`
  onClose: () => void;
  onCreate: (kind: CopilotKind, flowPosition: { x: number; y: number }) => void;
}

type CopilotKind = 'upload' | 'text' | 'image' | 'video';
```

**坐标转换契约**（修复了 review 发现的位置冲突）：

- React Flow 的 `onPaneContextMenu(event)` 提供 `clientX/Y`（屏幕坐标）
- `CanvasPanel` 收到事件后：
  1. 调用 `reactFlowInstance.screenToFlowPosition({ x: event.clientX, y: event.clientY })` 转为 flow 坐标
  2. 把 **screen 坐标**（用于 `position: fixed` 菜单定位）和 **flow 坐标**（用于节点创建）都传给 `PaneContextMenu`
- `PaneContextMenu`：
  - 用 `x/y`（screen）渲染菜单：`style={{ left: x, top: y }}`
  - 点击菜单项时，`onCreate(kind, flowPosition)` 把 flow 坐标传给 `CanvasPanel`，用于 `canvasStore.addNode`


const MENU_ITEMS: Array<{ kind: CopilotKind; label: string; icon: LucideIcon; hint: string }> = [
  { kind: 'upload', label: 'Upload',           icon: Upload,    hint: '上传文件创建卡片' },
  { kind: 'text',   label: 'Text Generation',  icon: Type,      hint: '用 LLM 生成文本' },
  { kind: 'image',  label: 'Image Generation', icon: ImageIcon, hint: '生成图片' },
  { kind: 'video',  label: 'Video Generation', icon: Video,     hint: '生成视频' },
];
```

**位置计算**：
- 菜单容器使用 `position: fixed`，`left/top` 来自 `x/y` props（screen 坐标）
- 视口边界处理：`Math.min(x, window.innerWidth - 160)` 防止菜单溢出

**关闭触发**：
- 点击菜单项（创建后自动关闭）
- 点击菜单外的 overlay 区域
- 按 Esc 键

**视觉**：完全沿用 `CanvasPanel.tsx` 第 222-240 行的现有手写菜单样式（圆角、边框、阴影、悬停背景），保持视觉一致性。

### 4.2 CopilotCardNode（统一卡片）

```tsx
interface CopilotCardNodeData {
  kind: CopilotKind;                         // 'upload' | 'text' | 'image' | 'video'
  status: 'idle' | 'generating' | 'done' | 'error';
  prompt?: string;                           // text/image/video 用
  file?: { name: string; size: number };     // upload 用
  model?: string;                            // 选中的模型
  progress?: number;                         // 0-100
  result?: {                                 // 生成完成后的结果
    thumbnail?: string;
    text?: string;
    videoUrl?: string;
    fileUrl?: string;
    duration?: number;
  };
  error?: string;
}
```

**渲染布局**（4 类共享）：

```
┌──────────────────────────────┐
│ 🎨 Image Generation  [×]    │ ← Header (icon + kind label + close)
├──────────────────────────────┤
│ ┌──────────────────────────┐ │
│ │  Prompt textarea...      │ │ ← 输入区（upload 显示文件拖放区）
│ └──────────────────────────┘ │
│ Model: [GPT-Image-2  ▼]     │ ← 模型选择
│ [   生成图片   ]             │ ← Generate 按钮
├──────────────────────────────┤
│ Status: 生成中... 60%        │ ← 进度（generating 时显示）
│ ████████░░░░                │
├──────────────────────────────┤
│ [Result preview area]        │ ← 完成时显示
└──────────────────────────────┘
```

**各 kind 的差异**（仅输入区 + 调用函数 + 自动插入的目标类型不同）：

| Kind | 输入区 | 内部实现 | 插入为 | 备注 |
|------|--------|---------|--------|------|
| upload | 文件选择/拖放 | `FileReader.readAsDataURL(file)` → dataURL | `asset`（图片/音频）或 `videoClip`（视频）| 不调外部 API，浏览器本地完成 |
| text | 提示词 textarea | 直接创建 storyline 卡片，prompt 作为 `description` | `storyline` | 不调外部 API；如需 AI 文案，用户后续在 ChatPanel 接力 |
| image | 提示词 textarea + 模型选择 | `providerRegistry.getProvider(id).submit({ type: 'image', capability: 'text2image', prompt })` + `poll(taskId)` | `art` | 直接调用 provider 绕过 `generateAsset`，避免双重创建卡片 |
| video | 提示词 textarea + 模型选择 | `providerRegistry.getProvider(id).submit({ type: 'video', capability: 'text2video', prompt })` + `poll(taskId)` | `deliverable` | 同上 |

**为什么绕过 `canvasToolkit.generateAsset`？** 它内部已调用 `addCanvasCardHandler` 自动创建画布节点（见 `generateAsset.ts:84-101`）。如果 CopilotCardNode 再调它，会**重复创建**画布卡片 + 留下 copilot 节点不清理。改为直接调用 `providerRegistry` 拿到 result URL，然后手动 `canvasStore.addNode` + `removeNode(copilotId)`。

**生成完成的去重**：

```
CopilotCardNode handleGenerate()
  → providerRegistry.getProvider(providerId).submit({...})
  → 拿到 taskId, 进入 polling
  → polling 完成拿到 resultUrl
  → updateNodeData(id, { status: 'done', result: { url: resultUrl } })
  → setTimeout(1000ms, () => {
      addNode({ type: targetType, position: offsetPosition, data: { ... } });
      removeNode(id);
    });
```

`offsetPosition` 定义：相对于 copilot 节点位置 `+40, +40` 像素：

```ts
function offsetPosition(node: Node, dx = 40, dy = 40) {
  return { x: node.position.x + dx, y: node.position.y + dy };
}
```

### 4.3 与现有架构的集成点

| 现有 | 复用方式 |
|------|---------|
| `canvasStore.addNode` | 创建 copilot 节点 + 创建最终卡片 |
| `canvasStore.removeNode` | 完成后清理 copilot 节点 |
| `canvasStore.updateNodeData` | 流式更新 status/progress/result |
| `canvasToolkit/providerRegistry` | image/video 直接调用 `submit` + `poll` |
| `canvasToolkit/types` | `GenerationInput`、`GenerationTask`、`MediaType`、`Capability` |
| `nodeTypes` 注册表 | 新增 `copilotCard`（见 §4.4）|
| 现有手写菜单样式 | 视觉风格直接复用 |

### 4.4 类型扩展（必修）

`CanvasNodeType`（`src/apps/drama/types/index.ts:60-72`）是严格 union，**必须扩展**才能新增 `copilotCard`：

```ts
// types/index.ts
export type CanvasNodeType =
  | 'storyline' | 'moodboard' | 'videoClip' | 'asset' | 'task'
  | 'art' | 'character' | 'script' | 'deliverable' | 'sceneCard'
  | 'copilotCard';   // ← 新增
```

`CanvasNodeData`（同文件）需要扩展 data 字段类型，或在 `CopilotCardNode` 内部用 `Record<string, unknown>` cast（与现有 `SceneCardNode` 一致的方式）。

`CanvasPanel.tsx` 的 `nodeTypes` 注册表新增一行：

```ts
const nodeTypes: NodeTypes = {
  // ... 现有 ...
  copilotCard: CopilotCardNode,
};
```

---

## 5. 数据流详解

### 5.1 创建流程

```
1. 用户右击 pane
   ReactFlow onPaneContextMenu(event)
   → CanvasPanel setMenuState({ x: event.clientX, y: event.clientY })

2. PaneContextMenu 渲染
   菜单以 `position: fixed` 定位：style={{ left: clientX, top: clientY }}
   同时缓存 flow 坐标：screenToFlowPosition({ x: clientX, y: clientY })

3. 用户点击 "Image Generation"
   onCreate('image', flowPosition)
   → canvasStore.addNode({
       id: 'copilot_xxx',
       type: 'copilotCard',
       position: flowPosition,        // flow 坐标
       data: { kind: 'image', status: 'idle' }
     })
   → 关闭菜单

4. CopilotCardNode 渲染
   初始状态：输入区 + 生成按钮（disabled until prompt）

5. 用户输入 prompt, 点 "生成"
   onClick → setStatus('generating')
   → 直接调用 providerRegistry（image/video）或本地逻辑（upload/text）

6. 流式更新
   provider.poll 或 FileReader 进度回调
   → updateNodeData(id, { status: 'generating', progress: 60 })

7. 完成
   onComplete(result)
   → updateNodeData(id, { status: 'done', result })
   → 延迟 1s 后（让用户看到结果）:
       ├─ canvasStore.addNode({ type: targetType, data: result.data, position: offsetPosition(self) })
       └─ canvasStore.removeNode(id)         // 移除 copilot 节点
```

### 5.2 失败流程

```
generation error
→ updateNodeData(id, { status: 'error', error: message })
→ UI 显示错误信息 + "重试" 按钮
→ 用户点击重试 → 重新调用 generation
```

### 5.3 取消流程

```
用户点击卡片右上角 × 关闭按钮
→ canvasStore.removeNode(id)
```

---

## 6. 错误处理

| 场景 | 行为 |
|------|------|
| API 未配置 | 菜单项 disabled + tooltip "未配置 [model] API Key" |
| 生成失败 | `status: 'error'` + 错误信息 + 重试按钮 |
| 用户取消 | 关闭卡片（移除节点） |
| 网络中断 | `status: 'error'` + "网络错误，请重试" |
| Prompt 为空 | 生成按钮 disabled |
| 文件过大 | 文件选择时校验，显示错误 toast |

---

## 7. 测试策略

### 7.1 单元测试

**PaneContextMenu.test.tsx**：
- 渲染 4 个菜单项
- 点击菜单项触发 `onCreate(kind, position)`
- 点击 overlay 触发 `onClose`
- 按 Esc 关闭

**CopilotCardNode.test.tsx**：
- 4 种 kind 渲染正确的输入区
- 初始状态 `idle`，生成按钮 disabled 当 prompt 为空
- 模拟生成：updateNodeData 状态从 `idle` → `generating` → `done`
- 完成后自动调用 addNode + removeNode
- 错误状态显示错误信息
- 关闭按钮触发 removeNode

### 7.2 集成测试

**CanvasPanel.test.tsx**（新增）：
- 右击 pane → 菜单显示在正确位置
- 点击菜单项 → 创建对应 kind 的 copilot 节点
- 完成后画布上出现正式卡片，copilot 节点消失

### 7.3 测试覆盖目标

按现有项目标准：所有新组件 + 集成测试，**292+ tests passing** 不应减少。

---

## 8. 风险与权衡

### 风险

| 风险 | 缓解 |
|------|------|
| Copilot 卡片占画布空间 | 紧凑布局（240×200px），完成后自动移除 |
| 多卡片同时生成互相干扰 | 每个卡片独立的 React Flow 节点，状态隔离 |
| 与现有节点右键菜单的视觉混淆 | 菜单位置不同（pane 居中 vs 节点跟随） |

### 权衡

| 选择 | 取舍 |
|------|------|
| 4 类共用同一 UI 而非 4 个组件 | 节省维护成本，但配置逻辑稍复杂 |
| 自动插入 vs 手动确认 | 一步到位，但用户无"撤销前最后审视"机会（copilot 卡片上仍可见结果 1s） |
| 完成后保留 1s 再移除 | 让用户看到生成结果，但短暂视觉冗余 |

---

## 9. 未来扩展（不在本 spec）

- 节点右键菜单增加 "AI 操作" 子菜单（重新生成 / 改写）
- Copilot 卡片支持多文件上传（Upload 类型）
- 卡片历史记录（最近 N 次生成可恢复）
- 拖拽文件到 pane 直接触发 Upload 流程
- 全局快捷键唤起菜单（如 ⌘⇧N 新建卡片）

---

## 附录 A：关键代码骨架

### A.1 PaneContextMenu 组件骨架

```tsx
export function PaneContextMenu({ x, y, onClose, onCreate }: PaneContextMenuProps) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className="fixed z-50 min-w-[180px] rounded-[var(--radius-base)] border ..."
        style={{ left: x, top: y }}
      >
        {MENU_ITEMS.map(({ kind, label, icon: Icon, hint }) => (
          <button
            key={kind}
            onClick={() => onCreate(kind, { x, y })}
            className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs hover:bg-..."
          >
            <Icon className="h-3.5 w-3.5" />
            <span>{label}</span>
          </button>
        ))}
      </div>
    </>
  );
}
```

### A.2 CopilotCardNode 组件骨架

```tsx
export function CopilotCardNode({ data, id }: NodeProps<Node<CopilotCardNodeData>>) {
  const updateNodeData = useCanvasStore(s => s.updateNodeData);
  const addNode = useCanvasStore(s => s.addNode);
  const removeNode = useCanvasStore(s => s.removeNode);
  const nodes = useCanvasStore(s => s.getCurrentNodes());

  const handleGenerate = async () => {
    updateNodeData(id, { status: 'generating', progress: 0 });
    try {
      // image/video: 直接调 providerRegistry，绕过 generateAsset 的内置卡片创建
      if (data.kind === 'image' || data.kind === 'video') {
        const provider = providerRegistry.getProvider(data.providerId!);
        const capability: Capability = data.kind === 'image' ? 'text2image' : 'text2video';
        const task = await provider.submit({
          type: data.kind,
          capability,
          prompt: data.prompt!,
        });
        const final = await pollUntilDone(provider, task.taskId, (p) => {
          updateNodeData(id, { progress: p });
        });
        updateNodeData(id, { status: 'done', result: { url: final.resultUrl } });
        setTimeout(() => {
          const self = nodes.find(n => n.id === id)!;
          addNode({
            type: data.kind === 'image' ? 'art' : 'deliverable',
            position: offsetPosition(self),
            data: { title: data.prompt ?? '', thumbnail: final.resultUrl, generatedPrompt: data.prompt, sourceProvider: data.providerId },
          });
          removeNode(id);
        }, 1000);
      } else if (data.kind === 'upload') {
        // FileReader 已在外层转 dataURL；这里直接添加
        const self = nodes.find(n => n.id === id)!;
        addNode({
          type: data.file!.kind === 'video' ? 'videoClip' : 'asset',
          position: offsetPosition(self),
          data: { title: data.file!.name, thumbnail: data.file!.dataUrl, fileSize: data.file!.size },
        });
        removeNode(id);
      } else if (data.kind === 'text') {
        // 直接创建 storyline 卡片，不调外部 API
        const self = nodes.find(n => n.id === id)!;
        addNode({
          type: 'storyline',
          position: offsetPosition(self),
          data: { title: data.prompt?.slice(0, 30) ?? '新剧本', description: data.prompt },
        });
        removeNode(id);
      }
    } catch (err) {
      updateNodeData(id, { status: 'error', error: err instanceof Error ? err.message : String(err) });
    }
  };

  return <div className="w-[240px] ...">{/* Header + Input + Generate + Status + Result */}</div>;
}

function offsetPosition(node: Node, dx = 40, dy = 40) {
  return { x: node.position.x + dx, y: node.position.y + dy };
}
```

---

**End of spec**
