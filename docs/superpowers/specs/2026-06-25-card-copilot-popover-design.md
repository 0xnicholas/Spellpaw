# Canvas Card Copilot Popover 设计

**Status**: Draft
**Date**: 2026-06-25
**Scope**: Spellpaw Drama Studio — Canvas 卡片专属 Copilot 工具面板

---

## 1. 背景与目标

### 1.1 现状

Canvas 右键菜单（`PaneContextMenu`）现提供 4 个 AI 生成入口（Upload / Text / Image / Video Generation）。选中后通过 `handlePaneCreate` 创建 `copilotCard` 类型的 React Flow 节点（`CopilotCardNode`），节点本身就是提示词输入框 + 生成按钮。

**问题**：
1. **节点即输入框**违反"卡片 = 内容"的语义。卡片是结果容器，不应是交互工具。
2. **生成过程占用画布空间**：240px 宽的 prompt 输入框常驻在画布上，遮挡周围内容。
3. **不能独立编辑卡片**：卡片的内容（prompt）只能通过生成产生，无法先有占位内容后增量增强。
4. **生命周期耦合**：卡片必须先点生成才能"激活"，没有"空容器"状态。

### 1.2 目标（参考 buzzy.now 模式）

引入**「卡片 = 结果容器，弹窗 = 工具面板」**的解耦模型：

| 旧模型 | 新模型 |
|--------|--------|
| 卡片即输入框 | 卡片是空的内容容器（"Output will appear here..."） |
| 提示词常驻卡片内 | 提示词输入在弹窗中 |
| 生成完成自删除卡片 | 生成完成更新当前卡片 |
| 点击卡片 = 触发生成 | 点击卡片 = 打开工具面板 |

**核心改动**：把 `CopilotCardNode`（React Flow 节点）替换为 `CardCopilotPopover`（Portal 浮层），右键创建空卡片 + 自动弹出工具面板，点击已有卡片切换工具面板。

### 1.3 参考产品

`buzzy.now`（AI 视频生成平台）的画布交互：
- 卡片是占位容器（"Output will appear here..."）
- 点击卡片 → 卡片下方弹出工具面板
- 工具面板包含：Ref 按钮（参考图上传）、提示词输入、模型选择（Nano Banana Pro）、质量/比例选择（1K | 1:1）、生成按钮（带积分消耗 +28）

### 1.4 不在本 spec 范围

- `PaneContextMenu` 菜单本身的视觉改造（保留现有 4 个选项和手写菜单风格）
- CardDetailDrawer 的功能增强（仍通过双击触发）
- ChatPanel 全局 Copilot（仍可独立使用）
- 节点右键菜单（duplicate/delete/rename/copy-id，保留现有）
- 拖拽创建连线、缩略图 Lightbox 等功能
- 新增模型/Provider 的注册流程
- 积分系统（截图中的 +28 数字仅作 UI 占位，不实接）

---

## 2. 设计决策（已确认）

| 维度 | 决策 | 理由 |
|------|------|------|
| 弹窗位置 | **Portal 浮层，position: fixed** | 独立于 React Flow 节点树，位置精确可控 |
| 弹窗定位 | **卡片下方居中**，必要时偏移到不超出视口 | 参考 buzzy.now 视觉 |
| 弹窗组件 | **新建 `CardCopilotPopover`** | 单一职责，不耦合 React Flow |
| 触发方式 | **右键创建自动打开 + 点击已有卡片打开** | 用户在第 2 轮确认 |
| 同时打开 | **同一时间最多一个弹窗** | 第 3 轮确认（点击其他卡片切换，点击空白关闭） |
| 与 CardDetailDrawer 关系 | **单击 = 弹窗，双击 = 详情抽屉** | 沿用现有 250ms 防抖，区分单击/双击 |
| 卡片类型 | **保留 4 个右键选项**，但映射到正式卡片类型 | Upload→asset, Text→storyline, Image→art, Video→videoClip |
| 卡片初始状态 | **空容器 + "Output will appear here..." 占位** | buzzy.now 风格 |
| 生成结果处理 | **更新当前卡片**（不创建新卡片） | 卡片即结果容器，text→title/description, image/video→thumbnail |
| 复用代码 | **从 CopilotCardNode 抽取 `useCopilotGenerate` hook** | 复用 provider 调用、polling、取消逻辑 |
| CopilotCardNode | **保留文件但从 nodeTypes / types / toolConfigs 全链路移除** | 见 §13 完整清理清单 |
| 空状态卡片渲染 | **复用 `GenericCardNode`**，data 字段新增 `isPlaceholder: true` | 零新增节点类型 |
| 弹窗 ref 上传 | **FileReader 本地读取为 dataURL**，存入卡片 data.fileRef | 与现有 upload 流程一致，无需后端 |
| 模型/质量选择 | **ProviderRegistry 现有 provider + capability 元数据驱动** | 复用现有 registry，不新增配置 |
| Ref 按钮作用域 | **image / video / upload 都支持**（参考图/参考视频上传） | buzzy.now 截图显示 Ref 用于 image-gen，本地不可省略 |
| 切换卡片时的生成 | **取消进行中的生成**，popover 按 `nodeId` key 重新挂载 | 简化状态、避免跨卡片状态污染；用户期望"一张卡片 = 一个会话" |
| Z-index 层级 | **新增 `z-index.ts` 集中管理**：PaneContextMenu(60) > CardCopilotPopover(50) > CardDetailDrawer(20) | 避免浮层互相遮挡；popover 保持 50 以与现有 Modal 系列共存 |
| 已存在的 copilotCard 节点 | **应用加载时一次性迁移：转换为对应 kind 的正式卡片** | 旧项目持久化数据兼容，避免 React Flow "node type not found" 警告 |

---

## 3. 架构总览

```
CanvasPanel.tsx (修改)
├─ ReactFlow
│   ├─ onPaneContextMenu → PaneContextMenu (现有, 4 选项)
│   ├─ onNodeClick → 切换/打开 CardCopilotPopover (修改)
│   ├─ onNodeDoubleClick → 打开 CardDetailDrawer (修改)
│   └─ onPaneClick → 关闭 CardCopilotPopover (修改)
└─ Portal 浮层:
    └─ CardCopilotPopover (新)
        ├─ 位置: 卡片正下方，基于 reactFlowInstance.flowToScreenPosition
        ├─ 内容: Ref + Prompt + Model + Quality + Generate
        └─ 状态: idle | generating | done | error
```

### 文件布局

```
src/shared/components/canvas/
├─ CanvasPanel.tsx                                      # 修改：注册新弹窗状态 + 单/双击分离
├─ PaneContextMenu/
│   ├─ PaneContextMenu.tsx                              # 不变：保留 4 选项
│   └─ PaneContextMenu.test.tsx                          # 不变
├─ CardCopilotPopover/                                  # 新目录
│   ├─ CardCopilotPopover.tsx                           # 新：Portal 浮层组件
│   ├─ CardCopilotPopover.test.tsx                       # 新
│   └─ index.ts                                          # 新
├─ nodes/
│   ├─ GenericCardNode.tsx                              # 修改：占位状态渲染（"Output will appear here..."）
│   ├─ CopilotCardNode.tsx                              # 保留但不注册（提取逻辑到 useCopilotGenerate）
│   └─ index.ts                                          # 修改：移除 copilotCard 导出
└─ hooks/
    └─ useCopilotGenerate.ts                             # 新：从 CopilotCardNode 抽取的 hook

src/apps/drama/
├─ lib/
│   └─ canvasToolkit/shared.ts                           # pollUntilDone（如果还没有则补齐）
├─ stores/
│   ├─ canvasStore.ts                                    # 不变（addNode / updateNodeData / removeNode 已够用）
│   └─ toolRouter/cards.ts                              # 不变（kickstart 仍可调用 addCanvasCardHandler）
└─ types/
    └─ index.ts                                          # 修改：CanvasNodeData 新增 isPlaceholder / fileRef 等
```

### 关键架构选择

**1. Portal 浮层 vs 节点内联展开**

选 Portal。理由：
- 节点内联展开会修改所有现有卡片节点组件（ScriptCardNode/ArtCardNode/CharacterCardNode 等），侵入大
- Portal 浮层可以独立演化，未来支持拖拽、记忆位置等不冲突
- buzzy.now 本身就是 Portal 模式，与参考一致

**2. 单击 vs 双击分离**

现有 `onNodeClick` 有 250ms 防抖用于避免双击误触。复用这个机制：
- 单击（debounce 内未触发第二次 click） → 打开/切换 copilot popover
- 双击（在 250ms 内第二次 click） → 打开 CardDetailDrawer（当前行为）
- 两者互斥，不会同时触发

**3. popover 位置计算**

```ts
// CanvasPanel 内
const screenPos = reactFlowRef.current.flowToScreenPosition({
  x: card.position.x + cardWidth / 2,    // 卡片中心
  y: card.position.y + cardHeight + 8,   // 卡片底部 + 8px gap
});
// 弹窗以 (screenPos.x - popoverWidth/2, screenPos.y) 定位
// 边界检查：max(popoverY, navbarHeight) + min(popoverX, viewportWidth - popoverWidth)
```

需要订阅 viewport 变化（pan/zoom）实时更新位置。React Flow 的 `onMove` 回调已有，扩展即可。

---

## 4. 组件设计

### 4.1 CanvasPanel 状态扩展

```ts
interface CopilotPopoverState {
  nodeId: string;          // 关联的卡片 id
  kind: CopilotKind;       // 'upload' | 'text' | 'image' | 'video'
  flowPosition: { x: number; y: number };  // 卡片位置（用于屏幕坐标转换）
}

// 在 CanvasPanel 内部 useState 管理
const [copilotTarget, setCopilotTarget] = useState<CopilotPopoverState | null>(null);
const [popoverScreenPos, setPopoverScreenPos] = useState<{ x: number; y: number } | null>(null);
```

**关闭触发**：
- 点击弹窗外（overlay 或画布空白）
- 按 Esc
- 点击其他卡片（切换到新卡片）
- 双击当前卡片（开 drawer，同时关闭弹窗）
- 弹窗生成完成 → 自动关闭（卡片显示结果后）

**Popover JSX 渲染**（在 CanvasPanel return JSX 中）：

```tsx
// CanvasPanel.tsx return 内部，与 <CardDetailDrawer /> 同级
{copilotTarget && popoverScreenPos && (
  <CardCopilotPopover
    key={copilotTarget.nodeId}              // ★ 必须 key：卡片切换时强制重新挂载
                                             //   触发 useCopilotGenerate 的 useEffect cleanup
                                             //   → abortRef.abort() → 取消进行中的生成
    cardId={copilotTarget.nodeId}
    kind={copilotTarget.kind}
    screenPosition={popoverScreenPos}
    onClose={() => setCopilotTarget(null)}
  />
)}
```

**为什么 `key={nodeId}` 至关重要**：这是 cancel-on-switch 机制（§5.2）的唯一钩子点。如果省略 `key`，React 会复用同一组件实例，新卡片的 popover 状态会和旧卡片的混在一起，旧卡片的 abort 也不会触发。

### 4.2 卡片类型映射

| 右键选项 (CopilotKind) | 创建的 CanvasNode.type | 自动弹窗 kind |
|------------------------|------------------------|---------------|
| upload | `asset` | `upload` |
| text | `storyline` | `text` |
| image | `art` | `image` |
| video | `videoClip` | `video` |

**点击已有卡片推断 kind**：

```ts
function inferKindFromCard(node: CanvasNode): CopilotKind {
  switch (node.type) {
    case 'storyline': case 'script': case 'sceneCard': case 'character': case 'task':
      return 'text';
    case 'art': return 'image';
    case 'videoClip': case 'deliverable': return 'video';
    case 'asset': case 'moodboard': return 'upload';
    default: return 'text';
  }
}
```

### 4.3 CardCopilotPopover 组件

```tsx
interface CardCopilotPopoverProps {
  cardId: string;                     // 关联卡片 id（用于读 data + 写 updateNodeData）
  kind: CopilotKind;                   // 'upload' | 'text' | 'image' | 'video'
  screenPosition: { x: number; y: number };  // 屏幕坐标（基于 flow + viewport 实时计算）
  onClose: () => void;
  onComplete?: () => void;             // 生成完成回调（外层关闭弹窗用）
}

interface PopoverLocalState {
  prompt: string;
  fileRef: { name: string; size: number; kind: 'image'|'video'|'audio'; dataUrl: string } | null;
  providerId: string;                  // 选中的模型（image/video）
  capability: Capability | null;       // 来自 provider metadata
}
```

**位置定位**：
```tsx
// 弹窗定位在卡片正下方居中
const popoverWidth = 480;
const style: React.CSSProperties = {
  position: 'fixed',
  left: Math.max(16, Math.min(screenPosition.x - popoverWidth / 2, window.innerWidth - popoverWidth - 16)),
  top: Math.max(64, screenPosition.y),  // 64 = 顶部 navbar 高度
  width: popoverWidth,
  zIndex: Z_INDEX.cardCopilotPopover,   // = 50（从 z-index.ts 导入，见 §12）
};
```

**布局（参考 buzzy.now）**：

```
┌──────────────────────────────────────────┐
│ ┌───┐                                    │
│ │ + │ ← Ref 按钮（image / video / upload 都显示）│
│ │Ref│                                    │
│ └───┘                                    │
├──────────────────────────────────────────┤
│ [textarea: 提示词]                        │
│                                          │
├──────────────────────────────────────────┤
│ 🎨 Model  ▼    1K | 1:1    [Generate]   │ ← 底部栏
└──────────────────────────────────────────┘
```

**Ref 按钮适用范围**：image / video / upload 都显示（text 不显示，因为 LLM 文本生成不需要参考）。Ref 上传后：
- image: 作为 `referenceImageUrl` 传给 provider（参考图生图）
- video: 作为 `referenceImageUrl` 传给 provider（关键帧参考）
- upload: 写入卡片 data.thumbnail + fileRef（资源入库，无 AI 调用）

**内部状态机**：

| State | UI | 转换条件 |
|-------|----|---------|
| `idle` | 输入框可用，Generate 按钮可用 | → `generating` (点击 Generate) |
| `generating` | 进度条 + 取消按钮，禁用输入 | → `done` (success) / → `error` (fail) / → `idle` (cancel) |
| `done` | ✓ 完成提示，1200ms 后自动关闭弹窗 | → 卸载 |
| `error` | 错误信息 + 重试按钮 | → `idle` (retry) |

### 4.4 useCopilotGenerate hook

从 `CopilotCardNode` 抽取共享逻辑，避免重复：

```ts
function useCopilotGenerate(opts: {
  cardId: string;          // 直接传 id，避免整个 card 对象的闭包污染
  kind: CopilotKind;
  onSuccess?: (result: GenerationResult) => void;
}) {
  const [status, setStatus] = useState<'idle' | 'generating' | 'done' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  // 不订阅 updateNodeData，避免每次 store 更新都重渲染 popover
  const updateNodeData = useCanvasStore.getState().updateNodeData;

  const generate = useCallback(async (params: {
    prompt: string;
    providerId?: string;
    fileRef?: { dataUrl: string; name: string; size: number; kind: 'image'|'video'|'audio' };
  }) => {
    abortRef.current = new AbortController();
    setStatus('generating');
    setProgress(0);
    setError(null);
    
    try {
      if (opts.kind === 'text') {
        updateNodeData(opts.cardId, {
          title: params.prompt.slice(0, 30) || '新故事线',
          description: params.prompt,
          isPlaceholder: false,
        });
        setStatus('done');
        return;
      }
      
      if (opts.kind === 'upload') {
        if (!params.fileRef) throw new Error('未选择文件');
        updateNodeData(opts.cardId, {
          title: params.fileRef.name,
          thumbnail: params.fileRef.dataUrl,
          fileSize: params.fileRef.size,
          fileRef: params.fileRef,
          isPlaceholder: false,
        });
        setStatus('done');
        return;
      }
      
      // image / video: 调用 provider
      const provider = providerRegistry.get(params.providerId ?? '');
      if (!provider) throw new Error(`Provider ${params.providerId} 未配置`);
      const capability: Capability = opts.kind === 'image' ? 'text2image' : 'text2video';
      // 参考图（Ref）目前作为额外参数透传；provider API 是否支持由各 provider 自行决定
      const task = await provider.submit({
        type: opts.kind,
        capability,
        prompt: params.prompt,
        referenceImageUrl: params.fileRef?.dataUrl,
      });
      const final = await pollUntilDone(
        provider,
        task.taskId,
        setProgress,
        abortRef.current.signal,
      );
      updateNodeData(opts.cardId, {
        thumbnail: final.resultUrl,
        generatedPrompt: params.prompt,
        sourceProvider: params.providerId,
        isPlaceholder: false,
      });
      setStatus('done');
      opts.onSuccess?.(final);
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        setStatus('idle');
        return;
      }
      setError(err instanceof Error ? err.message : String(err));
      setStatus('error');
    }
  }, [opts.cardId, opts.kind, opts.onSuccess, updateNodeData]);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  // 卸载时清理（卡片切换 / popover 关闭都会触发）
  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  return { status, progress, error, generate, cancel };
}
```

**为什么需要这个 hook？**：
- CopilotCardNode 中的 polling、cancel、status 逻辑（~50 行）需要在 `CardCopilotPopover` 中复用
- 抽到 hook 后两个组件都轻量化，且未来 toolRouter 也可以直接调用

**关键设计点**：
- **只接收 `cardId` 不接收整个 `card` 对象**：避免父组件每次重渲染时 hook 内部 `useCallback` 因 opts 对象引用变化而失效
- **`updateNodeData` 用 `getState()` 而非 selector**：避免 popover 因 store 更新无谓重渲染
- **依赖数组扁平化**：`[opts.cardId, opts.kind, opts.onSuccess, updateNodeData]` 都是稳定引用（`getState()` 返回的方法引用稳定）

### 4.5 kindToCardType / defaultTitle 辅助函数

`handlePaneCreate` 用到的两个映射函数：

```ts
// src/shared/components/canvas/CanvasPanel.tsx 内部
function kindToCardType(kind: CopilotKind): CanvasNodeType {
  return ({ text: 'storyline', image: 'art', video: 'videoClip', upload: 'asset' } as const)[kind];
}

function defaultTitle(kind: CopilotKind): string {
  return ({
    text: '新故事线',
    image: '新美术',
    video: '新视频',
    upload: '新素材',
  } as const)[kind];
}
```

测试覆盖：单元测试 `kindToCardType` 4 个分支，`defaultTitle` 4 个分支（覆盖未来 i18n 抽取）。

### 4.6 占位卡片渲染（GenericCardNode 修改）

`isPlaceholder: true` 时显示 buzzy.now 风格占位：

```tsx
// GenericCardNode.tsx
const isPlaceholder = (data as Record<string, unknown>).isPlaceholder as boolean;

{isPlaceholder ? (
  <div className="flex flex-col items-center justify-center h-32 text-center">
    <span className="text-2xl text-[var(--color-text-tertiary)]">{icon}</span>
    <span className="text-[12px] text-[var(--color-text-tertiary)] mt-2">
      Output will appear here...
    </span>
  </div>
) : (
  // 现有 body 渲染
)}
```

占位状态下隐藏 description、metadata row、children、linkedCardIds 列表，只显示顶部 type header 和占位中心区域。

**假设**：所有用 `GenericCardCardNode` 渲染的卡片（storyline / moodboard / videoClip / asset / task）宽度一致为 `w-[240px]`（已在 CanvasPanel.tsx 与 GenericCardNode.tsx 验证）。其他卡片类型（Script / Art / Character / Deliverable / SceneCard）宽度也是 `w-[240px]`（已 grep 确认）。**因此 `kindToCardType` 映射只会落到 GenericCardNode，popover 位置计算可以硬编码 `cardWidth = 240`**。

### 4.7 单击 / 双击分离逻辑

```tsx
// CanvasPanel.tsx
const clickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
const pendingClickRef = useRef<{ nodeId: string; t: number } | null>(null);

const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
  // Skip if clicking interactive elements
  const target = event.target as HTMLElement;
  if (target.tagName === 'IMG' || target.tagName === 'INPUT' || target.tagName === 'BUTTON' ||
      target.closest('button') || target.closest('input')) {
    return;
  }
  
  // 同一卡片在 250ms 内重复点击 → 判定为双击
  const now = Date.now();
  if (pendingClickRef.current?.nodeId === node.id && now - pendingClickRef.current.t < 250) {
    if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
    pendingClickRef.current = null;
    setCopilotTarget(null);          // 关闭弹窗
    setSelectedCardId(node.id);      // 打开 drawer
    return;
  }
  
  pendingClickRef.current = { nodeId: node.id, t: now };
  if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
  clickTimerRef.current = setTimeout(() => {
    // 单击生效
    // Self-click guard：同一卡片的弹窗已打开时跳过，避免无谓的 re-render
    if (copilotTarget?.nodeId === node.id) {
      pendingClickRef.current = null;
      return;
    }
    const kind = inferKindFromCard(node);
    setCopilotTarget({ nodeId: node.id, kind, flowPosition: node.position });
    setSelectedCardId(null);         // 关闭 drawer（如果有）
    pendingClickRef.current = null;
  }, 250);
}, [setSelectedCardId, copilotTarget]);
```

**Self-click guard 理由**：见 review B4。同一卡片已有 popover 时，单击只是"重新定位"，无需触发 React 重渲染。节省一次 setState。

### 4.8 右键创建流程（修改后）

```tsx
// CanvasPanel.tsx
const handlePaneCreate = useCallback((kind: CopilotKind, flowPos: { x: number; y: number }) => {
  const cardType = kindToCardType(kind);                  // 见 §4.5
  const newNode: CanvasNode = {
    id: generateId(cardType + '_'),
    type: cardType,
    position: flowPos,
    data: {
      title: defaultTitle(kind),
      isPlaceholder: true,                                // 触发占位渲染
    },
  };
  useCanvasStore.getState().addNode(newNode);
  setCopilotTarget({ nodeId: newNode.id, kind, flowPosition: flowPos });  // 自动打开弹窗
  setPaneMenu(null);
}, []);
```

**Popover keyed by nodeId**（见 §4.9）：传 `key={newNode.id}` 确保卡片切换时强制重新挂载，触发 useEffect 清理 abortRef，取消前一张卡片的生成任务。

### 4.9 位置计算与 viewport 跟随

```ts
// CanvasPanel.tsx — popover screen position 计算
const [popoverScreenPos, setPopoverScreenPos] = useState<{ x: number; y: number } | null>(null);

const CARD_WIDTH = 240;
const CARD_HEIGHT_ESTIMATE = 200;     // GenericCardNode 实际高度（约 200px）
const POPOVER_WIDTH = 480;
const POPOVER_GAP = 8;
const NAVBAR_HEIGHT = 64;             // WorkspaceLayout 顶部 navbar

useEffect(() => {
  if (!copilotTarget || !reactFlowRef.current) return;
  const rf = reactFlowRef.current;
  
  const recompute = () => {
    if (!rf || !copilotTarget) return;
    const cardCenter = rf.flowToScreenPosition({
      x: copilotTarget.flowPosition.x + CARD_WIDTH / 2,
      y: copilotTarget.flowPosition.y + CARD_HEIGHT_ESTIMATE + POPOVER_GAP,
    });
    setPopoverScreenPos({
      x: Math.max(16, Math.min(cardCenter.x - POPOVER_WIDTH / 2, window.innerWidth - POPOVER_WIDTH - 16)),
      y: Math.max(NAVBAR_HEIGHT, cardCenter.y),
    });
  };
  
  recompute();
  // 订阅 viewport 变化（pan / zoom / fitView）
  // onMove 已有（CanvasPanel.tsx:142-144）
  // 我们需要重新触发 recompute → 用 useEffect 依赖 zoom + viewport.x + viewport.y
  
}, [copilotTarget, zoom, viewport]);
```

**为什么不监听 onMove**：避免每帧都 setState（pan 期间会高频触发），只在 viewport 停止后更新。但用户体验上需要"跟手"——通过订阅 React Flow 的 `onMoveEnd` + 拖拽期间的 RAF 平滑实现（v1 简化：每次 onMove 都更新；如性能不达标再优化）。

**节点拖拽时的位置更新**：通过 React Flow 的 `onNodeDrag`（drag 期间）+ `onNodeDragStop`（drop 时）同步更新 `copilotTarget.flowPosition`：

```ts
const onNodeDrag = useCallback((_event: React.MouseEvent, node: Node) => {
  if (copilotTarget?.nodeId === node.id) {
    setCopilotTarget({ ...copilotTarget, flowPosition: node.position });
  }
}, [copilotTarget]);
```

`onNodeDrag` 在 React Flow 中每帧触发，会导致 popover 每帧重定位（可能影响性能）。v1 简化：仅在 `onNodeDragStop` 时更新（drop 瞬间跳到新位置）。如果 UX 反馈"拖拽时 popover 不跟随"再升级到 `onNodeDrag`。

### 4.10 自动关闭延迟

```ts
// CardCopilotPopover.tsx
const POPOVER_AUTOCLOSE_DELAY_MS = 1200;  // 生成成功后延迟关闭弹窗，让用户看到 ✓ 反馈
```

不用 magic number 800ms。1200ms 给用户足够时间看 ✓ 完成提示。

---

## 5. 数据流详解

### 5.1 右键创建 + 自动打开弹窗

```
1. P 右击 pane
   onPaneContextMenu(event) → setPaneMenu({ clientX, clientY, flowPos })

2. PaneContextMenu 显示（position: fixed）

3. P 点击 "Image Generation"
   handlePaneCreate('image', flowPos)
   ├─ canvasStore.addNode({ type: 'art', data: { title: '新美术', isPlaceholder: true }, position: flowPos })
   ├─ setCopilotTarget({ nodeId, kind: 'image', flowPosition: flowPos })
   └─ setPaneMenu(null)

4. CardCopilotPopover 渲染
   位置: flowToScreenPosition({ x: flowPos.x + 120, y: flowPos.y + 200 })   // 卡片底部居中
   状态: idle, prompt: '', providerId: 默认 provider

5. P 输入 prompt，点 Generate
   useCopilotGenerate.generate({ prompt, providerId })
   ├─ status → 'generating'
   ├─ provider.submit + pollUntilDone
   ├─ 进度: updateNodeData → 卡片显示?（可选）; 弹窗进度条更新
   └─ 完成: updateNodeData(id, { thumbnail: resultUrl, generatedPrompt, sourceProvider, isPlaceholder: false })
      → status → 'done'
      → setTimeout 800ms 后 setCopilotTarget(null)  // 弹窗关闭
```

### 5.2 点击已有卡片切换弹窗

```
1. P 点击已存在的 storyline 卡片
   onNodeClick → pendingClick 记录

2. 250ms 后无第二次点击 → 单击生效
   ├─ 如果当前 copilotTarget 指向不同卡片：
   │   ├─ 旧卡片的 popover 卸载（key 变化）→ useCopilotGenerate useEffect cleanup → abortRef.abort() 
   │   │   → 取消进行中的生成任务
   │   └─ 新卡片的 popover 挂载（初始 status='idle'）
   ├─ inferKindFromCard(node) → 'text'
   └─ setCopilotTarget({ nodeId: newId, kind: 'text', flowPosition: node.position })

3. 弹窗重新渲染，绑定到新卡片
   弹窗显示: text kind 的 textarea + Generate 按钮

**关键：取消进行中的生成**
- popover 用 `key={copilotTarget.nodeId}` 强制 re-mount（见 §4.8）
- 旧实例卸载触发 `useCopilotGenerate` 的 cleanup → abortRef.abort()
- pollUntilDone 抛 AbortError → catch 中 setStatus('idle')，**不写入卡片**
- 旧卡片仍保持原状态（如果之前未生成过，仍是 isPlaceholder: true）
```

### 5.3 双击打开 drawer

```
1. P 双击卡片（250ms 内两次 click）
   └─ 第二次 click 触发双击分支
       ├─ setCopilotTarget(null)        // 关闭弹窗（同时取消进行中的生成）
       └─ setSelectedCardId(node.id)    // 打开 drawer
```

### 5.4 弹窗生成中用户取消

```
1. P 在 generating 状态点击取消按钮
   useCopilotGenerate.cancel()
   ├─ abortRef.current.abort()
   ├─ pollUntilDone 抛 AbortError
   └─ status → 'idle'

2. 卡片保持占位状态（不更新 thumbnail）
   用户可重新输入 prompt 或关闭弹窗
```

### 5.5 弹窗外部点击关闭

```
1. P 点击空白画布
   onPaneClick → setCopilotTarget(null)
   
2. P 点击其他卡片（已触发 onNodeClick）
   单击逻辑会 setCopilotTarget 到新卡片
   等效于"切换"，不是关闭

3. P 按 Esc
   useHotkeys({ Escape: () => setCopilotTarget(null) })
```

---

## 6. 错误处理

| 场景 | 行为 |
|------|------|
| Provider 未配置 | 弹窗 Model 下拉显示空状态，Generate disabled + tooltip "未配置 [model] API Key" |
| 生成失败（API error） | status → 'error'，显示错误信息 + Retry 按钮，**不关闭弹窗**，用户可重试 |
| 用户取消（AbortController） | status → 'idle'，输入框清空但保留卡片占位 |
| 网络中断 | 同 API error 路径（provider.poll 抛错） |
| Prompt 为空 | Generate 按钮 disabled |
| File 选择但未点 Generate | 弹窗关闭时丢弃 file 引用，不写入卡片 |
| 双击快速输入 | 250ms 防抖保证单击/双击互斥 |

---

## 7. 与现有架构的集成

### 7.1 canvasToolkit 复用

- `providerRegistry`：image/video 直接调用 `submit` + `poll`（与 CopilotCardNode 一致）
- `pollUntilDone`：从 CopilotCardNode 抽取到 `lib/canvasToolkit/shared.ts`（如果还没有）
- `formatBytes`：upload 时 fileSize 显示

### 7.2 toolRouter 影响

- `kickstart_project` 仍调用 `addCanvasCardHandler` 创建普通卡片（不变）
- `apply_template` 同上（不变）
- 唯一变化：toolRouter 创建的卡片初始状态也应该是 `isPlaceholder: true`（如果还没内容）
- 或：toolRouter 创建的卡片**默认带真实内容**（如 mock data），`isPlaceholder: false`

**决策**：toolRouter 创建的卡片不带 `isPlaceholder`（视为已有内容）。占位状态仅用于右键新建的空卡片。

**关于 LLM `add_card` tool**：`toolRouter/cards.ts:179-181` 已经把 LLM 可调用的类型限制在 `['storyline', 'moodboard', 'videoClip', 'asset', 'task', 'art', 'character']`，`copilotCard` 从一开始就不在 LLM 表面（只是 schema enum 里的死代码）。所以 §13 从 enum 移除 `copilotCard` 是安全的——不影响任何 LLM 工作流。

### 7.3 canvasStore 扩展

不需要新增 action。现有 `addNode / updateNodeData / removeNode` 完全够用。

### 7.4 类型扩展

```ts
// src/apps/drama/types/index.ts
export interface CanvasNodeData {
  // ... 现有字段
  isPlaceholder?: boolean;     // true → GenericCardNode 显示 "Output will appear here..."
  fileRef?: {                  // upload kind 的本地预览（可选，写入 thumbnail 即可）
    name: string;
    size: number;
    kind: 'image' | 'video' | 'audio';
    dataUrl: string;
  };
}
```

### 7.5 nodeTypes 注册表修改

```tsx
// CanvasPanel.tsx
const nodeTypes: NodeTypes = {
  script: ScriptCardNode,
  art: ArtCardNode,
  // ... 其他不变
  copilotCard: CopilotCardNode,  // ← 移除
};
```

**为什么保留 CopilotCardNode 文件但不再注册？**
- 现有测试 (CopilotCardNode.test.tsx) 不受影响
- toolRouter 或其他模块如果引用了 `CopilotCardNode` import，不会破坏
- 未来若需要"节点即输入框"模式（例如 CardDetailDrawer 内的 inline 编辑），可快速恢复

---

## 8. 测试策略

### 8.1 单元测试

**CardCopilotPopover.test.tsx**（新）：
- 渲染 4 种 kind 的弹窗（text/image/video/upload）
- prompt 输入框绑定本地 state
- Generate 按钮在 prompt 空时 disabled
- 点击 Generate 调用 `useCopilotGenerate.generate`
- generating 状态显示进度条 + 取消按钮
- 点击取消触发 AbortController
- error 状态显示错误信息 + 重试按钮
- Esc 键调用 onClose
- upload kind 显示 Ref 按钮，点击触发 file input

**useCopilotGenerate.test.tsx**（新）：
- text kind 直接更新卡片 title/description，不调 provider
- upload kind 写入 thumbnail/title/fileSize
- image kind 调用 providerRegistry.submit + pollUntilDone
- video kind 同 image
- 生成成功 updateNodeData 卡片的 thumbnail/prompt/provider
- 生成失败捕获错误并 setStatus('error')
- AbortController 触发后回到 idle
- 组件卸载 abortRef.abort()

**CanvasPanel 扩展**（修改现有测试）：
- 右键 pane 创建对应类型卡片 + 自动打开 popover
- 点击已有卡片切换 popover
- 双击卡片打开 drawer 并关闭 popover
- 点击空白关闭 popover
- Esc 关闭 popover
- popover 位置跟随 viewport pan/zoom 更新

**PaneContextMenu.test.tsx**（不变）：现有 4 选项 + 坐标转换测试保持。

**CopilotCardNode.test.tsx**（不变）：保留以验证组件本身的逻辑（虽然不再被画布注册）。

**GenericCardNode.test.tsx**（**新**，原不存在）：
- isPlaceholder: true 时显示 "Output will appear here..." + 隐藏 description/metadata/children
- isPlaceholder: false 时显示正常 body
- type 徽标和状态徽标在占位状态下仍正常渲染

### 8.2 集成测试

**canvasPaneCreate.test.tsx**（新或扩展）：
- 端到端: 右键 → 选 Image → 卡片出现（占位）+ 弹窗打开 → 输入 prompt → 生成 → 卡片显示结果 + 弹窗关闭
- 端到端: 点击已生成的卡片 → 弹窗重新打开（kind 推断正确）
- 端到端: 双击卡片 → drawer 打开 + 弹窗关闭

### 8.3 测试覆盖目标

现有 292 tests passing 应**不减少**。新增测试覆盖：
- CardCopilotPopover: ~15 tests
- useCopilotGenerate: ~10 tests  
- CanvasPanel 扩展: ~5 tests
- GenericCardNode 扩展: ~3 tests（**新文件**，原不存在）
- 集成测试: ~3 tests
- migrateCopilotCards: ~12 tests（§14）

目标：总计 **≥ 340 tests passing**。

新增必测：
- popover 与 PaneContextMenu z-index 不冲突（同时打开两个，菜单在上层）
- popover 与 CardDetailDrawer 互斥（双击切换）
- 切换卡片时旧卡片的 abortRef 触发（cancel-on-switch）
- 已有 copilotCard 节点迁移（done / generating / idle 三状态）
- popover 位置在卡片拖拽后更新

---

## 9. 迁移清单

| 模块 | 现状 | 目标 | 风险 |
|------|------|------|------|
| `CanvasPanel.tsx` | onNodeClick 250ms 防抖 → setSelectedCardId | 区分单/双击：单击开 popover，双击开 drawer | 中（影响所有点击行为） |
| `handlePaneCreate` | 创建 copilotCard 节点 | 创建对应类型卡片 + setCopilotTarget | 低 |
| `GenericCardNode.tsx` | 渲染 body | 占位状态显示 "Output will appear here..." | 低 |
| `nodeTypes` | 注册 copilotCard | 移除 copilotCard | 中（如有外部引用） |
| `CopilotCardNode.tsx` | 内联生成逻辑 | 抽取 `useCopilotGenerate` hook，组件保留不删除 | 低 |
| `canvasToolkit/shared.ts` | pollUntilDone（位置待确认） | 确认导出，若无则新增 | 低 |
| `types/index.ts` | CanvasNodeData 现有字段 | 新增 isPlaceholder, fileRef 可选字段 | 低 |
| `CopilotCardNode.test.tsx` | 现有 4 kind 测试 | 不变（验证组件内部逻辑） | 无 |
| `PaneContextMenu.test.tsx` | 现有测试 | 不变 | 无 |

完整 `copilotCard` 清理点见 §13。

---

## 10. 已知限制 / 未来扩展

- **弹窗位置边界**：当卡片在视口边缘时，弹窗可能部分超出屏幕。初期简单裁剪（max 16px 边距），未来可加 flip/shift 智能定位
- **拖拽卡片时弹窗跟随**：实现 viewport 变化更新位置，但 pan 期间弹窗可能有 16ms 抖动。可后续加 RAF 平滑
- **多卡同时生成**：当前每次只能打开一个弹窗，串行生成。如需并行，可在弹窗加队列
- **历史 prompt**：弹窗内不记忆历史输入，每次新建。未来可加 localStorage 记忆最近 5 条
- **真实积分系统**：截图中的 +28 数字为占位 UI，未来接入后端积分系统
- **生成历史/重放**：toolRouter kickstart 已有此能力，popover 暂不引入

---

## 11. 参考资料

- `buzzy.now` AI 视频生成平台 — `screenshots/buzzy-canvas.png`, `screenshots/buzz-canvas-node-copilot.png`
- 现有 `PaneContextMenu` 设计：`docs/superpowers/specs/2026-06-22-canvas-pane-context-menu-design.md`
- 现有 `CopilotCardNode`：`src/shared/components/canvas/nodes/CopilotCardNode.tsx`
- 现有 `CanvasPanel`：`src/shared/components/canvas/CanvasPanel.tsx`
- Provider Registry：`src/apps/drama/lib/canvasToolkit/providerRegistry.ts`
- Canvas Tooltip 设计：`src/apps/drama/lib/canvasToolkit/`
- React Flow v12 API：`reactflow` package `general.d.ts:171` 验证 `flowToScreenPosition` 与 `onNodeDoubleClick` 均可用

---

## 12. Z-index 层级集中管理

新建 `src/shared/lib/zIndex.ts`，集中定义浮层 z-index，避免散落硬编码。**作用域限于 Canvas 浮层**（popover / menu / drawer），**不接管所有 z-50 组件**（Modal / Tooltip / ContextMenu 另有规划，避免 scope 爆炸）：

```ts
// src/shared/lib/zIndex.ts (scope: Canvas 浮层)
export const Z_INDEX = {
  cardDetailDrawerMask: 10,
  cardDetailDrawer: 20,
  chatPanel: 40,
  cardCopilotPopover: 50,    // 新增（与现有 z-50 Modal 同行，但不互相覆盖——Modal 通常用 Portal 覆盖到 body，且 Modal 不与 Canvas popover 同框出现）
  paneContextMenu: 60,       // 提升（原来 z-50，现在 60）——会话级 popover 上可以叠加命令级菜单
  toast: 70,
} as const;
```

**为什么不选 55**：会让 popover 高于现有 9 个 `z-50` Modal / Tooltip 组件（SnapshotModal / NewProjectModal / BatchStyleDialog / ProjectSettingsModal / DeleteConfirmDialog / NodeAIActions / Tooltip / ContextMenu）。当用户从 popover 状态打开 Modal 时（如点击 NewProject），Modal 会被 popover 遮挡。**解决方案：popover 保持 50，让 Modal 同样 50**——DOM 后渲染者赢（Modal 是 Portal，渲染顺序由 Modal 打开时间决定）。Canvas 内 popover 与 Modal 不会同时有交互需求。

替换点（仅 Canvas 浮层）：
- `PaneContextMenu.tsx:39` — `z-50` → `Z_INDEX.paneContextMenu`（= 60）
- `CardDetailDrawer.tsx:464,468` — `z-10` / `z-20` → `Z_INDEX.cardDetailDrawerMask` / `Z_INDEX.cardDetailDrawer`
- `CardCopilotPopover` 新组件 — 用 `Z_INDEX.cardCopilotPopover`（= 50）

**为什么 PaneContextMenu 要比 CardCopilotPopover 高**：用户在 popover 打开时右击画布，应能看到 PaneMenu 而不是被 popover 遮挡。popover 是"会话级"、菜单是"命令级"，菜单优先。

**后续规划**（不属本 spec）：把 Modal / Tooltip 的 z-50 也纳入 zIndex.ts。当前项目 z-50 散落问题是独立重构，本 spec 只动 Canvas 相关 3 处。

---

## 13. `copilotCard` 全链路清理清单

`grep -rn "copilotCard" src/` 验证出以下清理点（不限于测试）：

| 文件 | 行 | 现状 | 清理动作 |
|------|----|----|---------|
| `src/shared/components/canvas/CanvasPanel.tsx` | 24, 41, 186-192, 296 | 运行时引用 | 删 import + nodeTypes entry + MiniMap color map |
| `src/shared/components/canvas/nodes/CopilotCardNode.tsx` | 全文 | 运行时组件 | **保留文件**（测试仍引用），仅从 nodeTypes 移除 |
| `src/shared/components/canvas/nodes/index.ts` | 6-7 | re-export | 可选保留（如果外部 import）或删除（如果零外部引用） |
| `src/shared/components/canvas/nodes/CopilotCardNode.test.tsx` | 全文 | 测试文件 | **保留不变**（隔离测试，不依赖注册） |
| `src/apps/drama/types/index.ts` | 72 | `'copilotCard'` union | **必须删除**，否则 TypeScript 允许但不存在的类型 |
| `src/apps/drama/stores/toolRouter/cards.ts` | 163 | `CARD_TYPE_ICONS.copilotCard` | 可删除（死代码），或保留以防御 |
| `src/apps/drama/lib/toolConfigs.ts` | 85 | LLM tool schema enum | **必须删除**，否则 LLM 可能生成 copilotCard 类型，运行时无 handler |

**强删 vs 弱删**：
- 强删（必须）：types union、CanvasPanel 注册、toolConfigs schema enum
- 弱删（推荐但非必需）：toolRouter 图标、nodes/index.ts re-export

---

## 14. 已有 `copilotCard` 节点迁移

**问题**：旧版本生成的 `copilotCard` 节点会持久化在 canvasStore（IDB + Zustand persist middleware）。新版本启动时，`copilotCard` 已从 `nodeTypes` 移除，React Flow 会输出 "node type not found" 警告，节点无法渲染。

**迁移方案**：应用启动时一次性转换。

```ts
// src/apps/drama/lib/migrateCopilotCards.ts
import type { CanvasNode } from '@drama/types';

const kindToCardType = (kind: string): CanvasNode['type'] => {
  switch (kind) {
    case 'image': return 'art';
    case 'video': return 'videoClip';
    case 'text':  return 'storyline';
    case 'upload': return 'asset';
    default: return 'storyline';
  }
};

const defaultTitleByKind = (kind: string): string => {
  return ({ image: '新美术', video: '新视频', text: '新故事线', upload: '新素材' } as Record<string, string>)[kind] ?? '未命名卡片';
};

/**
 * 迁移老的 copilotCard 节点：
 * - 如果有已完成的结果（status='done'）→ 转换为对应正式类型 + 写入结果数据
 * - 如果在生成中（status='generating'）→ 转换为对应正式类型 + 状态变为 'draft' + isPlaceholder=true（用户需要手动重试）
 * - 如果 idle / error → 转换为对应正式类型 + isPlaceholder=true
 *
 * 这样用户不会丢失任何已开始的工作，只是从内嵌生成节点变成普通占位卡片 + 可点击重新生成。
 */
export function migrateCopilotCards(nodes: CanvasNode[]): CanvasNode[] {
  return nodes.map((node) => {
    if (node.type !== 'copilotCard') return node;
    const data = node.data as Record<string, unknown>;
    const kind = (data.kind as string) ?? 'text';
    const newType = kindToCardType(kind);
    const hasResult = data.status === 'done' && data.result;
    return {
      ...node,
      type: newType,
      data: {
        title: defaultTitleByKind(kind),
        isPlaceholder: !hasResult,
        ...(hasResult && {
          thumbnail: (data.result as Record<string, unknown>)?.url,
          generatedPrompt: data.prompt,
          sourceProvider: data.providerId,
        }),
        // 清掉 copilotCard 特有字段
        status: 'draft',
      },
    };
  });
}

/** 统计需要迁移的节点数（仅用于日志与 dev 警告） */
export function countCopilotCards(nodes: CanvasNode[]): number {
  return nodes.filter((n) => n.type === 'copilotCard').length;
}
```

**调用时机**：`CanvasPanel` 挂载时（或更早，在 WorkspaceLayout 加载项目时）。一次性执行，之后不再需要：

```ts
// CanvasPanel.tsx useEffect
useEffect(() => {
  const current = useCanvasStore.getState().getCurrentNodes();
  const toMigrate = countCopilotCards(current);
  if (toMigrate === 0) return;                                  // 快路径：无需迁移
  if (import.meta.env.DEV) {
    console.info(`[migrateCopilotCards] converting ${toMigrate} legacy copilotCard nodes`);
  }
  const migrated = migrateCopilotCards(current);                // 返回 CanvasNode[]
  useCanvasStore.getState().syncNodes(migrated);
}, [currentProjectId]);                                         // 切换项目时也跑一次（防御性）
```

**幂等性**：`migrateCopilotCards` 检查 `type !== 'copilotCard'` 直接返回原节点，所以重复执行也是安全的。

**测试**：单测 `migrateCopilotCards` 4 种 kind × 3 种状态（idle / generating / done）+ 边界（非 copilotCard pass-through、undefined kind 兜底）= ~14 个 case。

---

## 15. 设计文档历史

- v1 (2026-06-22): `2026-06-22-canvas-pane-context-menu-design.md` — 内嵌 CopilotCardNode 方案
- v2 (2026-06-25): 当前文档 — Portal 浮层 + 占位卡片 + 工具面板解耦模型

---

**Author**: AI Agent (via brainstorming flow)
**Reviewers**: TBD