# Spellpaw — 短剧/短视频制作工具 需求规格说明书

> 版本: 1.1  
> 日期: 2026-05-19  
> 状态: 定稿  
> 修订记录: 简化响应式策略为 2 断点、标记 P2 功能、补充 localStorage 风险提示

---

## 1. 项目概述

### 1.1 产品定位
Spellpaw 是一款面向短剧/短视频创作者的 AI 辅助制作工具。它将项目结构管理、AI Agent 对话协作与可视化卡片画布整合在一个统一界面中，帮助创作者从构思到成片的全流程高效推进。

### 1.2 核心理念
- **结构即内容**：通过树状结构显式表达短剧的幕/场景/镜头层级
- **对话即操作**：Agent 不仅是聊天对象，更是可直接修改项目结构的执行者
- **画布即工作台**：无限画布上的卡片是创作者思维的可视化延伸

### 1.3 目标用户
- 短剧编剧/导演
- 短视频内容团队
- 独立视频创作者

---

## 2. 功能需求

### 2.1 页面结构

```
┌─────────────────────────────────────────────────────────────┐
│  导航栏（Logo + 项目名称 + 用户头像）                        │
├──────────┬─────────────────────────────┬────────────────────┤
│ 左栏     │ 中栏                        │ 右栏               │
│          │                             │                    │
│ ┌──────┐ │                             │                    │
│ │树状  │ │    Agent 对话                │    无限画布         │
│ │视图  │ │                             │    (react-flow)    │
│ │      │ │    ┌─────────────┐          │                    │
│ ├──────┤ │    │ 消息列表     │          │  ┌───┐   ┌───┐   │
│ │资产  │ │    │             │          │  │场景│──→│场景│   │
│ │管理器│ │    │  输入框      │          │  └───┘   └───┘   │
│ └──────┘ │    └─────────────┘          │                    │
│          │                             │                    │
└──────────┴─────────────────────────────┴────────────────────┘
```

### 2.2 路由定义

| 路由 | 页面 | 说明 |
|------|------|------|
| `/login` | 登录页 | 邮箱+密码登录（mock） |
| `/projects` | 项目列表页 | 展示所有项目卡片 |
| `/project/:projectId` | 工作区 | 三栏布局主界面 |
| `/` | 重定向 | → `/projects` |

### 2.3 左栏 — 项目导航与资产管理

#### 2.3.1 树状画布视图（上区，占比约 55%）

**数据模型**
```typescript
interface TreeNode {
  id: string;
  type: 'project' | 'act' | 'scene' | 'shot';
  title: string;
  status: 'draft' | 'in_progress' | 'review' | 'done';
  children?: TreeNode[];
  expanded?: boolean;
  metadata?: {
    duration?: number;      // 预估时长（秒）
    description?: string;   // 描述
    createdAt: string;
    updatedAt: string;
  };
}
```

**功能清单**
- [ ] 层级展开/折叠（点击箭头图标）
- [ ] 节点选中高亮（单选）
- [ ] 节点右键菜单：重命名、新增子节点、删除、查看详情
- [ ] 拖拽排序（同级节点间） **P2**
- [ ] 状态标识：不同颜色圆点表示状态
- [ ] 选中节点同步触发中栏 Agent 上下文更新
- [ ] 搜索过滤（顶部搜索框）

**默认数据结构**
```
项目《都市奇缘》
├── 第一幕：相遇
│   ├── 场景 1-1：咖啡厅初遇（3镜头）
│   │   ├── 镜头 1：全景 establishing
│   │   ├── 镜头 2：男主特写
│   │   └── 镜头 3：女主反应 shot
│   └── 场景 1-2：街头偶遇（2镜头）
├── 第二幕：误会
│   ├── 场景 2-1：公司走廊（2镜头）
│   └── 场景 2-2：雨中对峙（3镜头）
└── 第三幕：和解
    └── 场景 3-1：天台告白（4镜头）
```

#### 2.3.2 资产/产出资源管理器（下区，占比约 45%）

**数据模型**
```typescript
interface AssetItem {
  id: string;
  name: string;
  type: 'video' | 'image' | 'audio' | 'script' | 'subtitle' | 'other';
  size: number;           // 字节
  url?: string;           // 预览链接
  thumbnail?: string;     // 缩略图
  status: 'uploading' | 'ready' | 'processing' | 'error';
  createdAt: string;
  tags?: string[];
}

type AssetTab = 'materials' | 'outputs';
```

**功能清单**
- [ ] 标签页切换：「素材库」|「产出物」
- [ ] 文件列表：图标 + 文件名 + 类型标签 + 大小 + 日期
- [ ] 视图切换：列表视图 / 网格视图 **P2**
- [ ] 拖拽到右栏画布（DnD）
- [ ] 右键菜单：预览、重命名、删除、下载
- [ ] 顶部工具栏：上传按钮、搜索框、排序选项

**Mock 数据（素材库）**
| 名称 | 类型 | 大小 |
|------|------|------|
| `intro_bgm.mp3` | audio | 2.4 MB |
| `cafe_location.jpg` | image | 1.8 MB |
| `rain_footage_01.mp4` | video | 15.2 MB |
| `script_draft_v1.txt` | script | 12 KB |
| `character_design_A.png` | image | 3.1 MB |

### 2.4 中栏 — Agent 对话

**数据模型**
```typescript
interface ChatMessage {
  id: string;
  role: 'user' | 'agent' | 'system';
  content: string;
  type: 'text' | 'code' | 'suggestion' | 'action';
  timestamp: string;
  context?: {
    nodeId?: string;      // 关联的树节点
    nodeType?: string;
  };
  actions?: ChatAction[];  // 可执行操作按钮
}

interface ChatAction {
  id: string;
  label: string;
  type: 'insert_scene' | 'modify_script' | 'generate_storyboard' | 'custom';
  payload?: Record<string, unknown>;
}
```

**功能清单**
- [ ] 消息滚动列表（自动滚动到底部）
- [ ] 消息类型渲染：
  - 文本消息：Markdown 支持（粗体、列表、代码块）
  - 代码块：语法高亮 + 复制按钮
  - 建议卡片：可点击执行的建议操作
  - 操作卡片：带确认按钮的结构化操作
- [ ] 用户消息右对齐（浅色背景），Agent 消息左对齐（白色背景）
- [ ] 输入框：多行文本，支持 `Cmd+Enter` 发送
- [ ] 快捷操作栏：预设提示词按钮（可配置）
- [ ] 消息历史持久化（localStorage）
- [ ] 输入框上方显示当前上下文（如「正在讨论：场景 1-1」）

**Mock 对话数据**
```
Agent: 欢迎使用 Spellpaw！我已加载了《都市奇缘》的项目结构。有什么可以帮您的？

用户: 帮我扩展第一幕的场景

Agent: 已为「第一幕：相遇」构思了 2 个新场景：
      [建议卡片] 场景 1-3：电话误会
      [建议卡片] 场景 1-4：朋友助攻
      点击卡片可插入到项目结构中。

用户: 把场景 1-3 加进去

Agent: ✅ 已添加「场景 1-3：电话误会」到第一幕。
      需要我为这个场景生成分镜吗？
      [操作按钮] 生成分镜 | 写对白 | 跳过
```

**快捷操作预设**
- 「📝 生成下一幕」
- 「🎬 分析剧本结构」
- 「🎨 生成视觉风格」
- 「✂️ 优化节奏」

### 2.5 右栏 — 无限画布

**数据模型**
```typescript
interface CanvasNode {
  id: string;
  type: 'sceneCard' | 'assetCard' | 'noteCard';
  position: { x: number; y: number };
  data: {
    title: string;
    description?: string;
    status?: string;
    thumbnail?: string;
    tags?: string[];
    color?: string;         // 卡片主题色
  };
}

interface CanvasEdge {
  id: string;
  source: string;
  target: string;
  type?: 'default' | 'smoothstep';
  label?: string;
  animated?: boolean;
}
```

**功能清单**
- [ ] 节点类型：
  - `sceneCard`：场景卡片（标题 + 描述 + 状态标签 + 时长）
  - `assetCard`：素材卡片（缩略图 + 文件名 + 类型图标）
  - `noteCard`：便签卡片（彩色背景 + 自由文本）
- [ ] 画布交互：
  - 鼠标拖拽平移
  - 滚轮缩放（min 0.25x, max 2x）
  - 框选多节点
  - 右键空白处：添加节点菜单
  - 右键节点：删除 / 复制 / 编辑
- [ ] 从左栏拖拽资源生成对应类型节点
- [ ] 节点间连线（拖拽端口连接）
- [ ] 迷你地图（右下角）
- [ ] 画布缩放控制（左下角：- / 100% / + / 适应屏幕）

**默认画布数据**
- 3 个 sceneCard 节点排成水平线
- 2 条边连接表示场景顺序
- 1 个 noteCard 节点作为注释

### 2.6 顶部导航栏

- 左侧：Logo + 当前项目名称
- 中间：面包屑导航（项目 > 幕 > 场景）
- 右侧：
  - 命令面板按钮（`Cmd+K`） **P2**
  - 通知铃铛
  - 用户头像下拉（个人设置、退出登录）

---

## 3. 数据模型总览

### 3.1 核心实体关系

```
User
  └── Project[]
        ├── TreeNode[]          (树状结构，自引用)
        ├── ChatMessage[]       (对话历史)
        ├── Asset[]             (素材库)
        ├── Output[]            (产出物)
        └── CanvasState
              ├── Node[]
              └── Edge[]
```

### 3.2 状态持久化策略

| 数据 | 存储位置 | 说明 |
|------|----------|------|
| 用户信息 | localStorage | 登录态、偏好设置 |
| 项目列表 | localStorage | 元数据（不含内容） |
| 树状结构 | localStorage | 每个项目独立 key |
| 对话历史 | localStorage | 每个项目独立 key |
| 画布状态 | localStorage | 节点位置、边关系 |
| 资产列表 | localStorage | 文件元数据（实际文件 mock） |

> ⚠️ **容量风险提示**：localStorage 为 MVP 临时方案，典型浏览器限制 5–10MB。单项目建议控制数据量 < 200KB，后续迭代迁移至 IndexedDB。

---

## 4. 界面规格

### 4.1 布局参数

```
总宽度: 100vw
总高度: 100vh (减去导航栏 48px)

左栏:  min 240px, default 280px, max 400px
中栏:  min 360px, default 420px, max 600px
右栏:  剩余空间

左栏内部分割:
  树状视图: default 55%
  资产管理器: default 45%
```

### 4.2 响应式策略

| 断点 | 行为 |
|------|------|
| ≥1280px | 完整三栏，所有面板可调整 |
| <768px | 显示「请使用桌面端访问」提示页 |

> 注：768px–1279px 区间暂不适配，后续迭代补充中栏抽屉与左栏图标折叠模式。

### 4.3 动画规范

| 交互 | 时长 | 缓动 |
|------|------|------|
| 面板拖拽 | 无 | 即时 |
| 消息出现 | 150ms | ease-out |
| 节点选中 | 100ms | ease-in-out |
| 模态框打开 | 200ms | cubic-bezier(0.16, 1, 0.3, 1) |
| hover 背景 | 75ms | ease |

---

## 5. 交互设计

### 5.1 跨栏联动

| 触发源 | 操作 | 目标 | 效果 |
|--------|------|------|------|
| 树状视图 | 选中节点 | 中栏 | 更新 Agent 上下文，显示节点路径 |
| 树状视图 | 右键 → "在画布中查看" | 右栏 | 画布定位到对应节点并高亮 |
| 中栏 Agent | 发送"添加场景"指令 | 树状视图 + 右栏 | 同步新增树节点和画布节点 |
| 资产管理器 | 拖拽文件到右栏 | 右栏 | 在放置位置创建 assetCard 节点 |
| 画布 | 双击 sceneCard | 树状视图 | 自动展开并选中对应节点 |

### 5.2 键盘快捷键

| 快捷键 | 功能 |
|--------|------|
| `Cmd/Ctrl + K` | 打开命令面板（P2） |
| `Cmd/Ctrl + Enter` | 发送消息 |
| `Cmd/Ctrl + /` | 聚焦到对话输入框 |
| `Cmd/Ctrl + 1` | 聚焦左栏 |
| `Cmd/Ctrl + 2` | 聚焦中栏 |
| `Cmd/Ctrl + 3` | 聚焦右栏 |
| `Delete` | 删除选中的画布节点 |
| `Esc` | 关闭模态框 / 取消选择 |

---

## 6. 设计系统要求

### 6.1 已定义令牌（直接使用）

项目已包含完整的设计令牌系统（`design/dist/tokens.json`），涵盖：
- 色彩：基础灰阶 + 紫靛蓝强调色 + 语义映射
- 字体：Inter Display / Inter / SF Mono
- 间距：4px 基准的 15 级阶梯
- 圆角：极小圆角风格（2px 为主）
- 阴影：避免弥散阴影，使用边框区分层级

### 6.2 组件规范

所有 UI 组件必须严格遵循设计系统：
- 按钮：2px 圆角，无阴影，hover 背景加深 5%
- 输入框：2px 圆角，focus ring 1.5px accent-500
- 卡片：4px 圆角，1px gray-200 边框
- 分割线：1px gray-200
- 滚动条：6px 宽，gray-300 track，gray-500 thumb

### 6.3 无障碍要求

- 所有交互元素支持键盘导航
- 颜色对比度满足 WCAG 2.1 AA
- 图标按钮必须含 aria-label
- 树状视图支持屏幕阅读器层级播报

---

## 7. 非功能需求

### 7.1 性能
- 首屏加载 < 2s（在良好网络下）
- 画布节点 100+ 时拖拽保持 60fps
- 消息列表 1000+ 条时虚拟滚动

### 7.2 兼容性
- Chrome / Edge / Safari / Firefox 最新 2 个版本
- 暂不支持移动端（显示提示页）

### 7.3 扩展性
- 所有 API 调用封装为 service 层，mock 与真实实现可切换
- Agent 消息类型系统可扩展（未来支持图片、视频预览）
- 画布节点类型可注册新的自定义节点

---

## 8. 验收标准

### 8.1 功能验收

- [ ] 用户可成功登录并看到项目列表
- [ ] 可创建/打开项目进入三栏工作区
- [ ] 树状视图可完整展示项目结构，支持展开折叠
- [ ] 选中树节点后中栏显示对应上下文
- [ ] Agent 对话可正常发送接收，消息正确渲染
- [ ] 画布可正常拖拽、缩放、添加节点
- [ ] 左栏资源可拖拽到画布生成节点
- [ ] 所有面板宽度/高度可拖拽调整
- [ ] 刷新页面后数据不丢失（localStorage）

### 8.2 视觉验收

- [ ] 整体风格与 Linear 一致（简洁、精密）
- [ ] 颜色使用严格遵循设计令牌
- [ ] 动画过渡自然不拖沓
- [ ] 无视觉错位、溢出、滚动条异常

### 8.3 代码验收

- [ ] TypeScript 无 any 类型（除第三方库声明外）
- [ ] 所有组件有清晰 Props 类型定义
- [ ] store 逻辑可单元测试
- [ ] 无 console.error / warning
