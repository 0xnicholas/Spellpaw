# Spellpaw 产品路线图

> 时间跨度：Phase 2–Phase 4（6–12 个月）  
> 制定依据：竞品分析（Higgsfield AI + Topview AI）+ Topview 专项分析  
> 日期：2026-05-27（更新 2026-05-31）  
>  
> **⚠️ 2026-05-31 重大调整：** Topview 新增 Drama Studio / AI Canvas / Board / Skill / OpenAPI，直接进入短剧创作市场。  
> **路线图调整：** 竞争关键项前移、新增 Phase 2.5「竞争加固」、多语言从 Phase 4 提升至 Phase 2.5。视频/图像生成通过 Pandaria + Tokencamp 网关。  
> 详见 `docs/topview-analysis-report.md` 和 `docs/competitive-analysis-higgsfield-topview.md`（v1.1）。

---

## 竞争态势（2026-05-31）

> **Topview 已通过 Drama Studio 直接进入 Spellpaw 的核心市场。竞争窗口从 12-18 个月缩短至 6-12 个月。**

### Topview 的威胁

| 威胁 | Topview 产品 | 紧迫度 | Spellpaw 应对 |
|------|-------------|:---:|------|
| 短剧剧本生成 | **Drama Studio**（AI 编剧+导演，6语言分镜） | 🔴 高 | 强化叙事结构可编辑性 + 4级层级深度 |
| 视频生成闭环 | 12+ 模型 API 聚合，直接出片 | 🔴 高 | 通过 Pandaria + Tokencamp 网关补齐能力（不自研模型） |
| 模板丰富度 | 30+ 频道模板 | 🟡 中 | 叙事模板 5→15+，社区贡献机制 |
| 多语言 | 20 UI 语言 + 6 内容语言 | 🟡→🔴 | 英文 MVP 提升至 Phase 2.5 |
| Agent 生态 | Topview Skill（GitHub 可安装） | 🟡 中 | Phase 4 MCP Server 加速 |

### Spellpaw 的护城河

| 护城河 | 状态 | Topview 短期内能复制吗？ |
|--------|:---:|:---:|
| **4 级树状结构**（项目→幕→场景→镜头） | ✅ 坚固 | ❌ Drama Studio 仅到场景级，无止幕概念 |
| **节点级可编辑元数据** | ✅ 坚固 | ❌ AI 生成内容不可细粒度编辑 |
| **画布-树-Agent 三向联动** | ✅ 坚固 | ❌ Canvas/Drama Studio 是独立产品 |
| **本地离线 + 数据主权** | ✅ 坚固 | ❌ Topview 全云端 |
| **节奏分析 + 结构化报告** | ✅ 坚固 | ❌ 无 |
| AI 视频生成能力 | ❌ 缺失 | ✅ Topview 12+ 模型 |
| 多语言 | ❌ 缺失 | ✅ Topview 20 UI + 6 内容 |

### 路线图调整原则

1. **不自研 AI 模型** — 通过 Pandaria + Tokencamp 网关补齐生成能力
2. **强化可编辑性** — 这是 Drama Studio 无法提供的核心价值
3. **多语言加速** — 从 Phase 4 提升至 Phase 2.5（英文 MVP）
4. **模板翻倍** — 从 5 个内置模板扩展到 15+（社区贡献 + AI 生成）
5. **保持离线优先** — 这是 Topview 永远无法复制的架构优势

---

## 路线图总览（v1.2）

```
Phase 1             Phase 2                 Phase 2.5 🆕         Phase 3                 Phase 4
「本地编辑工具」     「AI 创作助手」          「竞争加固」           「云端协作平台」          「开放生态」
3 周                 8 周                    2 周                  5 周                     5 周

已完成               AI 生成能力 +           多语言 MVP +          云端同步 +               MCP 协议 +
  树状 CRUD           叙事模板系统(10+)       模板扩展(15+)         团队协作 +               全面国际化 +
  画布编辑            分步协作 Agent          英文 UI               模板市场                 第三方集成
  Detail Panel        分镜画面生成            Drama Studio 对照    版本管理                 REST API
  项目导入导出        智能推荐/节奏分析                              多语言扩展(日/韩)         CRDT 按需
  IndexedDB 持久化
```

---

## Phase 2：AI 创作助手（约 8 周）

> **核心命题：从"编辑工具"升级为"AI 辅助创作工具"**  
> **竞品借鉴：** Topview Agent 对话模式 + Higgsfield Presets 模板化思路  
> **架构决策：** Spellpaw 不跑 LLM。Agent 能力由 Pandaria（`../pandaria`）提供——通过 REST + SSE + HttpProxyTool 机制集成。Spellpaw 负责：启动本地 Tool Server、注入项目上下文到 system_prompt、消费 SSE 事件流。

### 2.1 目标与成功标准

| # | 目标 | 成功标准 |
|---|------|---------|
| 1 | Agent 接入真实 AI | 用户可通过对话生成/修改项目结构，不再是 mock |
| 2 | 叙事模板系统上线 | 内置 ≥10 个叙事模板（vs Topview 30+；质量 > 数量），用户可通过模板创建项目 |
| 3 | AI 生成分镜画面 | 用户可为场景生成参考图（storyboard），画布卡片显示缩略图 |
| 4 | 分步确认协作流 | Agent 分「大纲→确认→展开→细化」4 步协作，而非一次性黑盒输出 |

> **注：** 视频/图像生成通过 Pandaria tool（`generate_storyboard`）→ Tokencamp 网关路由至模型厂商。

### 2.2 Phase 2 功能规划

```
Phase 2 功能全景
┌──────────────────────────────────────────────────────────────────────┐
│                                                                      │
│  ┌─────────────┐   ┌──────────────────┐   ┌──────────────────────┐  │
│  │ 叙事模板系统  │   │ Agent 分步协作     │   │ AI 分镜画面生成       │  │
│  │             │   │                  │   │                      │  │
│  │ 模板市场     │   │ 大纲→确认→展开    │   │ 场景参考图生成        │  │
│  │ 预设结构     │   │ →细化→迭代       │   │ 风格一致性控制        │  │
│  │ 风格参数     │   │ 上下文感知       │   │ 画布缩略图展示        │  │
│  │ 分发场景绑定 │   │ 结构操作执行      │   │ 批量生成              │  │
│  └─────────────┘   └──────────────────┘   └──────────────────────┘  │
│                                                                      │
│  ┌─────────────┐   ┌──────────────────┐   ┌──────────────────────┐  │
│  │ 风格迁移      │   │ 智能推荐          │   │ 导出增强              │  │
│  │             │   │                  │   │                      │  │
│  │ 参考图风格   │   │ 模板智能匹配      │   │ 分镜脚本→视频预览     │  │
│  │ → 全局应用   │   │ 结构补全建议      │   │ 一键导出到 Topview    │  │
│  │ 色调/光线    │   │ 节奏/时长分析     │   │ 模型选择 + 参数配置   │  │
│  └─────────────┘   └──────────────────┘   └──────────────────────┘  │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

#### 2.2.1 叙事模板系统（≈ 3 周）

**借鉴：** Higgsfield Viral Presets + Topview 频道模板 → Spellpaw 叙事结构模板

**模板数据模型：**

```typescript
interface NarrativeTemplate {
  id: string;
  name: string;                    // "悬疑反转短剧"
  category: 'suspense' | 'romance' | 'comedy' | 'drama' | 'action' | 'custom';
  description: string;
  thumbnail?: string;              // 模板预览图
  targetDuration: number;          // 建议时长（秒）：30 / 60 / 180 / 300
  targetPlatform: 'portrait' | 'landscape' | 'square';  // 竖屏/横屏/方形
  structure: {                     // 预设的幕/场景结构 + 智能参数
    acts: {
      title: string;               // "第一幕：表面平静"
      description: string;         // 本幕叙事目标
      scenes: {
        title: string;             // "场景 1-1：日常场景"
        description: string;       // 场景概要
        suggestedShotTypes?: string[];
        suggestedCameraMovement?: string;
        metadata: Partial<TreeNodeMetadata>;
      }[];
    }[];
  };
  stylePresets: {                  // 风格预设
    colorPalette: string[];        // 推荐色调
    pacing: 'fast' | 'moderate' | 'slow';
    visualStyle: string;           // "韩国冷色调文艺片"
  };
  tags: string[];
  author?: string;
  downloads?: number;
  version: number;
}
```

**功能清单：**

- [x] 模板浏览器：分类 + 预览 + 搜索（内置 / 社区 / 自定义三栏）
- [x] 一键从模板创建项目（填充完整树结构 + 元数据 + 风格参数）
- [x] 用户自定义模板保存（从现有项目导出为模板）
- [x] 模板分享（`.spellpaw-template.json` 格式导入/导出）
- [x] 内置模板 ≥ 5 个（悬疑反转 / 甜宠短剧 / 励志逆袭 / 喜剧反转 / 短纪录片）
- [x] 模板市场（本地 JSON 管理，`/templates` 独立页面）
- [ ] 🆕 内置模板扩展到 10+（新增：品牌微电影 / 产品种草 / 科技评测 / 时尚穿搭 / 恐怖短片）
- [ ] 🆕 AI 模板生成（Agent 根据用户项目自动生成模板结构）
- [ ] 云端模板市场（上传/下载/评价，Phase 3+）

**用户流程：**

```
新建项目 → 选择模板 → 预览结构 → 调整参数 → 确认创建
                                              │
                                    ┌─────────┴─────────┐
                                    ▼                   ▼
                              保留结构 + 元数据      替换为自定义
                              开始编辑细节           从零开始
```

#### 2.2.2 Agent 分步协作（≈ 2.5 周，从 Phase 2 Week 3-5 执行）

**借鉴：** Topview "Tell Your Agent" 模式 + Spellpaw 结构管理优势 → 分步确认式 Agent

**架构决策：** Spellpaw **不跑 LLM**。Agent 能力由 Pandaria（`../pandaria`）提供——一个完整的 Rust Agent 会话后端（REST + SSE + Tool 机制）。Spellpaw 的职责是三件事：
1. **启动本地 Tool Server** — 让 Pandaria 通过 HTTP 调用 Spellpaw 的 store actions
2. **上下文注入** — 将项目结构写入 session 的 `system_prompt`，LLM 在对话开始即了解项目全貌
3. **SSE 消费** — 监听流式事件，渲染 Chat UI，展示 tool 执行进度

```
Spellpaw                                      Pandaria
────────                                      ────────

⓪ 启动本地 tool server (:9341)

① 创建 session                               POST /api/v1/sessions
   tools: [                                    ← { tools: [
     { name: "spellpaw_add_node",                 { name: "...",
       endpoint: "localhost:9341/tool",              endpoint: "..." }] }
       parameters: {...} }]
   system_prompt: "<项目结构>"

② 订阅 SSE                                    GET /sessions/{id}/events
   ────────────────────────────────────────→

③ 发送消息                                    POST /sessions/{id}/messages
   ────────────────────────────────────────→  ← content: [用户消息]

④ 监听 SSE 流 ←────────────────────────────── Pandaria 处理中
   ┌─ text_delta        → Chat 面板流式渲染
   ├─ tool_call_started  → 显示"🔧 正在操作..."
   │                                              │
   │   POST localhost:9341/tool ──────────────→ Pandaria 调用 tool endpoint
   │   { tool_call_id, params }                  │
   │   ←── { content: [...], is_error } ─────── Spellpaw 执行 store action
   │                                              │
   ├─ tool_call_done    → 操作完成，UI 自动更新
   ├─ text_delta        → LLM 基于结果继续输出
   └─ turn_end          → 显示 token 用量
```

##### 本地 Tool Server

Spellpaw 在启动时运行轻量 HTTP server（Node.js `http` 或 Electron `net`），监听 `localhost:9341`，单一端点 `POST /tool`。

**Pandaria 发来的请求（HttpProxyTool 格式）：**

```json
{
  "tool_call_id": "call_abc123",
  "params": {
    "action": "add_node",
    "parentId": "act-2",
    "type": "scene",
    "title": "场景 2-4：反转"
  },
  "session_id": "uuid",
  "tenant_id": "test-tenant"
}
```

**Spellpaw 返回的响应：**

```json
{
  "content": [{ "type": "text", "text": "已添加场景 scene-2-4 到第二幕" }],
  "is_error": false
}
```

**Tool → Store Action 路由：**

| action 参数 | Store Action | 说明 |
|------------|-------------|------|
| `add_node` | `projectStore.addTreeNode()` | 添加子节点 |
| `update_node` | `projectStore.updateTreeNode()` | 修改标题/元数据 |
| `delete_node` | `projectStore.deleteTreeNode()` | 删除节点（不可恢复） |
| `move_node` | `projectStore.moveTreeNode()` | 同级拖拽排序 |
| `get_tree` | 只读 | 返回完整项目树 JSON |
| `get_subtree` | 只读 | 返回指定节点子树 |
| `apply_template` | 模板导入 + 批量 `addTreeNode` | 套用叙事模板 |
| `generate_storyboard` | 转发图像 API → 存入资产库 | AI 分镜画面生成 |

##### Pandaria Session 配置与上下文管理

**核心策略：A+B 结合——turn 间自动 PATCH system_prompt + 镜头细节按需 tool 获取。**

Pandaria 支持跨 turn 更新 system_prompt（`PATCH /sessions/{id}`），所以 Spellpaw 不需要把全部数据一次性塞入。采用两层上下文：

```
                    system_prompt               tool 调用
                    ─────────────               ────────
第一层（项目摘要+大纲）每次 turn 前自动 PATCH      LLM 不需要查
                    仅含 项目→幕→场景 层级        

第二层（镜头细节+元数据）不在 system_prompt 里      LLM 需要时调
                    无需维护                      get_subtree
```

**token 对比：**

| 策略 | system_prompt 大小 | 新鲜度 | tool 调用 |
|------|:---:|------|:---:|
| 全量塞入（3幕5场景12镜头） | ~3000 token | 仅创建 session 时 | 0 |
| **A+B：大纲 + turn 前 PATCH** | **~500 token** | **每次 turn 都最新** | **按需（仅查镜头）** |

**system_prompt 模板（精简版，仅含大纲）：**

```
你是 Spellpaw 的 AI 创作助手，帮助用户创作短剧/短视频。

## 项目摘要
- 名称：《{projectTitle}》
- 类型：{category} · {duration}秒 · {platform}
- 结构统计：{actCount}幕 / {sceneCount}场景 / {shotCount}镜头

## 项目结构（幕 + 场景，不含镜头）
{outlineTree}

示例：
项目：密室来电
├── 第一幕：困局 [in_progress]
│   ├── 场景 1-1：醒来 [draft] · 30s · 📍咖啡厅 · 🌅morning
│   └── 场景 1-2：发现纸条 [draft] · 30s
├── 第二幕：博弈 [draft]
│   └── ...

要查看场景的镜头详情，使用 get_subtree(sceneId)

## 可用工具
- spellpaw_add_node (parentId, type, title, description, duration)
- spellpaw_update_node (nodeId, changes)
- spellpaw_delete_node (nodeId) ⚠️ 先征求用户同意
- spellpaw_get_subtree (nodeId) — 查看子树
- spellpaw_get_tree — 查看完整项目
- spellpaw_apply_template (templateId)
- spellpaw_generate_storyboard (nodeId, prompt?)

## 节点结构
项目 → 幕(act) → 场景(scene) → 镜头(shot)
场景元数据: status, description, duration, location, timeOfDay
镜头元数据: status, description, duration, shotType, cameraMovement, dialogue

## 协作规则
1. 每次只做一个逻辑操作，分步执行
2. 需要镜头详情时调用 get_subtree，不要猜测
3. 删除操作前先征求用户同意
4. 回复简洁、结构化
5. 展开分镜时逐幕进行
```

**Turn 前自动 PATCH（`useSystemPromptSync`）：**

Spellpaw 监听 Zustand store 的项目树版本号。每次用户发送消息前，若树有变更，自动 `PATCH /sessions/{id}` 更新 system_prompt 中的大纲部分。

```typescript
// src/hooks/useSystemPromptSync.ts
function useSystemPromptSync(sessionId: string) {
  const treeVersion = useStore(s => s.treeVersion);

  useEffect(() => {
    const outline = buildOutlinePrompt();   // 仅幕+场景，不含镜头
    const prompt = buildSystemPrompt(outline);

    fetch(`${PANDARIA}/api/v1/sessions/${sessionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ system_prompt: prompt })
    });
  }, [treeVersion, sessionId]);
}
```

> **限制：** 同一 turn 内不更新 system_prompt。若用户在对话中手动编辑了树，下次发消息前才 PATCH。但这不影响正确性——当前 turn 的 tool 返回结果 Agent 已经持有。

**Tool 返回格式：** 全部使用缩进文本或简短确认文本（非 JSON），token 效率高 40-60%：

| Tool | 返回格式 |
|------|---------|
| `get_tree` / `get_subtree` | 缩进文本（含节点标题、状态、时长、关键元数据） |
| `add_node` | `"已添加 {type}「{title}」(id: {id})"` |
| `update_node` | `"已更新 {nodeId} 的 {changed fields}"` |
| `delete_node` | `"已删除 {type}「{title}」"` |
| `move_node` | `"已移动 {nodeId}"` |
| `apply_template` | `"已套用模板「{name}」: 创建 X 幕 Y 场景"` |
| `generate_storyboard` | `"已生成参考图: {url}"` |

##### SSE 事件处理

Spellpaw 通过 `GET /sessions/{id}/events` 订阅 SSE，处理以下事件：

| SSE Event | Spellpaw 行为 |
|-----------|-------------|
| `message_start` | 创建新的 assistant 消息气泡 |
| `text_delta` | 追加文本到当前气泡（流式打字效果） |
| `thinking_delta` | 折叠区域展示思考过程（可选） |
| `tool_call_started` | 显示 tool 调用指示器 |
| `tool_call_done` | tool 执行完毕：成功 → 静默；`is_error` → 红色错误提示 |
| `state_changed` | 更新状态指示（idle/running/error） |
| `turn_end` | 当前轮次结束 |
| `error` | 显示错误 + 重试按钮 |

##### 分步确认：不是技术，是 Prompt Engineering

分步协作不靠前端卡片 UI 控制——它不需要。Pandaria 的 tool 一旦被调用，结果已经持久化到 store 了。分步的节奏由 **system_prompt 规则**驱动：

> "每次只做一个逻辑操作。先告诉用户你打算做什么，等用户确认后再调用 tool。"

Agent 自然形成「分析 → 提案 → 用户确认 → 调用 tool → 展示结果」的协作流。用户体验类似：

```
User: "帮我写一个 60 秒的悬疑短片，密室场景"

🤖: 给你构思了一版大纲：
    📋 《密室来电》3 幕 5 场景 / 60 秒
    第一幕：困局（2 场景）
    第二幕：博弈（2 场景）
    第三幕：真相（1 场景）
    确认后我帮你搭建项目结构。

User: "确认"

🤖: 🔧 正在创建项目结构...
    ✅ 已创建 3 幕 5 场景
    要展开第一幕的具体分镜吗？
```

**Agent 操作能力总结：**

| 操作 | Tool | 何时确认 |
|------|------|---------|
| 新增节点 | `add_node` | 展示方案后用户确认 |
| 修改元数据 | `update_node` | 直接执行（建议类） |
| 删除节点 | `delete_node` | ⚠️ 必须先征求用户同意 |
| 重新排序 | `move_node` | 直接执行 |
| 套用模板 | `apply_template` | 展示模板结构后确认 |
| 生成分镜图 | `generate_storyboard` | 告知后直接执行 |

#### 2.2.3 AI 分镜画面生成（≈ 1.5 周，从 Phase 2 Week 6-7 执行）

**借鉴：** Higgsfield 的 AI 图像生成能力 + Spellpaw 的画布展示

通过 `generate_storyboard` tool 实现——tool endpoint 内部转发到图像 API（DALL·E / Stability），结果 URL 存入资产库，画布卡片显示缩略图。

**功能清单：**
- [x] 为选中的场景/镜头生成参考图（storyboard frame）
- [x] 画布卡片显示 AI 缩略图 + Lightbox 点击放大预览
- [x] 批量生成（TreeViewPanel bulk bar 串行生成 + 进度 toast）
- [x] 风格锁（选中一张图的 prompt，应用到其他场景）
- [ ] 生成的图片存入资产库，可拖拽到画布

#### 2.2.4 🆕 Topview API 桥接（≈ 1 周，Phase 2 Week 6 执行）

**策略：** 不自研 AI 视频模型，通过 Topview REST API 快速补齐视频生成能力。

> **为什么选 Topview API：** 单 API 封装 12+ 视频模型（Veo, Sora, Seedance 等），免费 tier，统一 credit 计费。用户可自备 API key，Spellpaw 仅做桥接层。

**功能：**

| 功能 | 说明 |
|------|------|
| API Key 配置 | 用户在设置页填入 Topview API Key + User ID（可选，无 key 时功能隐藏） |
| 一键导出分镜 | 选中场景 → 「生成视频预览」→ 自动构造 prompt → 调用 Topview text2video |
| 任务轮询 | taskId → 每 3s 轮询 → 完成时展示视频 URL + 缩略图 |
| 进度显示 | Chat 面板展示生成进度（提交 → 排队 → 生成中 → 完成） |
| 结果回写 | 生成的视频 URL 存入场景 metadata + 资产库 |

**技术设计：**

```typescript
// src/apps/drama/lib/topviewBridge.ts
interface TopviewConfig {
  apiKey: string;
  userId: string;
}

async function submitText2Video(
  config: TopviewConfig,
  prompt: string,
  options?: { aspectRatio?: string; resolution?: number; duration?: number }
): Promise<{ taskId: string }> {
  // POST https://api.topview.ai/v1/common_task/text2video/task/submit
}

async function pollTask(
  config: TopviewConfig,
  taskId: string
): Promise<{ status: string; videoUrl?: string }> {
  // GET/POST https://api.topview.ai/v1/common_task/task/query
}
```

**Prompt 构造策略：** 从 Spellpaw 项目树自动提取场景信息拼接 prompt：

```
场景标题: {scene.title}
描述: {scene.metadata.description}
地点: {scene.metadata.location}
时间: {scene.metadata.timeOfDay}
镜头类型: {scene.metadata.shotType}
机位: {scene.metadata.cameraMovement}
风格: {project.lockedStylePrompt}
```

**风险缓解：** Topview API 可能随时变更或收费。Spellpaw 的桥接层设计为**可插拔 provider 模式**——用户也可选择其他视频生成 API（如 Runway, Pika），或通过 Pandaria 的 generate_storyboard tool 生成静态分镜图（fallback）。

| 功能 | 说明 | 状态 | 借鉴来源 |
|------|------|:---:|---------|
| 模板智能匹配 | 根据用户已编辑的项目结构，推荐匹配的叙事模板 | ⬜ | Higgsfield trending 算法思路 |
| 结构补全建议 | 当用户只建了 2 幕时，Agent 建议「通常短剧需要 3 幕，是否补全？」 | ⬜ | Topview 模板补全 |
| 节奏分析 | 分析各场景时长分布，标记节奏问题（CV、前重后重、建议拆分） | ✅ | 自研 |
| 分镜 PDF 导出 | 导出为竖版分镜表 PDF（含 AI 参考图、镜头描述、时长） | ⬜ | 自研 |

#### 2.2.5 智能推荐与导出增强（≈ 1 周收尾，Phase 2 Week 8）

| 功能 | 说明 | 状态 | 借鉴来源 |
|------|------|:---:|---------|
| 模板智能匹配 | 根据用户已编辑的项目结构，推荐匹配的叙事模板 | ⬜ | Higgsfield trending 算法思路 |
| 结构补全建议 | 当用户只建了 2 幕时，Agent 建议「通常短剧需要 3 幕，是否补全？」 | ⬜ | Topview 模板补全 |
| 节奏分析 | 分析各场景时长分布，标记节奏问题（CV、前重后重、建议拆分） | ✅ | 自研 |
| 🆕 Drama Studio 对照 | 对比分析：Spellpaw 可编辑性 vs Drama Studio AI 生成限制 | ⬜ | 竞争差异化 |

### 2.3 Phase 2 里程碑（v1.2 更新）

```
Week 1-2:   叙事模板系统（10+ 模板）
            ├── Week 1: 数据模型 + 模板浏览器 UI
            └── Week 2: 内置模板扩展到 10+ + AI 模板生成

Week 3-4:   Tool Server + Agent 分步协作（提前）
            ├── Week 3: Vite 插件骨架（HTTP /tool + WebSocket /tool-ws）
            │          + call_id 匹配 + 超时处理 + toolRouter 全部 action
            └── Week 4: Pandaria session 配置 + system_prompt 注入
                        + SSE 事件消费基础通

Week 5:     Chat 流式 UI
            ├── text_delta 流式打字 + Markdown 渲染
            └── tool_call_started/done 进度指示 + 端到端集成测试

Week 6:     AI 分镜 + 🆕 Topview 桥接（并行）
            ├── generate_storyboard tool + 画布缩略图 + 风格锁
            └── Topview API 桥接（text2video + 任务轮询 + 进度展示）

Week 7:     协作流验证 + system_prompt 调优
            ├── 分步确认效果验证
            └── 异常路径：断连 / 超时 / tool 失败

Week 8:     智能推荐 + 导出 + 集成测试
            ├── 模板智能匹配 + 结构补全建议
            ├── 🆕 Drama Studio 对照导出
            └── 集成测试 + 性能优化
```

### 2.4 Phase 2 技术选型（v1.2 更新）

| 决策点 | 选型 | 理由 |
|--------|------|------|
| Agent 后端 | Pandaria（Rust，`../pandaria`） | 项目内已有；REST + SSE + HttpProxyTool 机制完备 |
| Tool Server 开发期 | Vite 插件（embedded middleware） | 单进程，与 Vite dev 并发启动 |
| Tool Server 生产期 | Electron `ipcMain.handle()` / `ipcRenderer.invoke()` | 无端口暴露，更安全 |
| WebSocket 库 | `ws`（服务端，Vite 插件内） + 浏览器原生 `WebSocket` | 轻量 |
| Chat 流式渲染 | SSE `text_delta` + `tool_call_*` 事件 | Pandaria 原生 SSE |
| 图像生成 | Tool endpoint 内部转发到 DALL·E / Stability API | Pandaria 不负责图像 |
| 🆕 视频生成 | **Topview REST API 桥接**（可插拔 provider） | 不自研模型；免费 tier；单 API 12+ 模型 |
| 模板存储 | `.spellpaw-template.json`（本地文件） | 与项目 JSON 格式统一 |

### 2.5 Tool Server 架构

**核心矛盾：** Pandaria 的 HttpProxyTool 通过 HTTP POST 调用 tool，但 Zustand store 在浏览器内存。HTTP server 无法直接访问 store。

**方案：** Vite 插件内嵌 HTTP server + WebSocket bridge。Tool Server 作为 HTTP ↔ WebSocket 的消息转发层，不碰业务逻辑。

```
Pandaria                      Vite Dev Server (:5173)            Browser
───────                      ─────────────────────────           ───────

POST /tool ────────────────→  Vite middleware /tool
  { tool_call_id,                │
    params: {                    ├─ WebSocket 转发 ──────────→  /tool-ws 消息
      action, parentId,          │   { callId, params }          │
      ... } }                    │                              ├─ toolRouter[action]
                                 │                              ├─ store action 执行
                                 │   ← WS 响应 ────────────────┤
                                 │   { callId, content,         │
                                 │     is_error }               │
←── { content, is_error } ─────  构造 HTTP 响应
```

**请求-响应匹配：** 用 `call_id` 天然配对。Server 维护 `Map<callId, { resolve, timer }>`，浏览器响应时携带同一 `callId`，Server 取出 pending promise 后 resolve。30s 超时返回 504。

**Tool Router（浏览器端）：** 一份纯函数映射表，将 action 字符串路由到 store actions。开发期通过 WebSocket 调用，Electron 期通过 IPC 调用——transport 可插拔：

```
                   Dev                          Electron
                   ───                          ────────
Transport:    WebSocket message            ipcMain.handle() /
             /tool-ws                      ipcRenderer.invoke()
                  │                              │
                  └──────────┬───────────────────┘
                             ▼
                    toolRouter (同一份代码)
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
         add_node     update_node    delete_node  ...
              │              │              │
              └──────────────┼──────────────┘
                             ▼
                     Zustand store
```

**toolRouter 结构：**

```typescript
// src/stores/toolRouter.ts
type ToolParams = { action: string } & Record<string, unknown>;

const toolRouter: Record<string, (params: ToolParams) => Promise<string>> = {
  add_node: async (p) => {
    const node = projectStore.getState().addTreeNode(p.parentId, {
      title: p.title, type: p.type, /* ... */
    });
    return `已添加 ${p.type}「${p.title}」(id: ${node.id})`;
  },
  update_node: async (p) => { /* ... */ },
  delete_node: async (p) => { /* ... */ },
  move_node:   async (p) => { /* ... */ },
  get_tree:    async ()   => { /* 只读返回 JSON */ },
  get_subtree: async (p)  => { /* 只读返回 JSON */ },
  apply_template:       async (p) => { /* 加载模板 → 批量 add */ },
  generate_storyboard:  async (p) => { /* 转发图像 API */ },
};
```

**Vite 插件（vite.config.ts 示意）：**

```typescript
function spellpawToolServer(): Plugin {
  return {
    name: 'spellpaw-tool-server',
    configureServer(server) {
      const wss = new WebSocketServer({ noServer: true });
      const clients = new Set<WebSocket>();
      const pendingCalls = new Map<string, { resolve: Function; timer: NodeJS.Timeout }>();

      // HTTP: Pandaria 的 tool call 入口
      server.middlewares.use('/tool', async (req, res) => {
        if (req.method !== 'POST') { res.statusCode = 405; res.end(); return; }
        const body = await parseBody(req);
        const { tool_call_id, params } = body;

        const result = await new Promise((resolve, reject) => {
          const timer = setTimeout(() => reject(new Error('TIMEOUT')), 30000);
          pendingCalls.set(tool_call_id, { resolve, timer });
          broadcast(clients, JSON.stringify({ type: 'tool_call', callId: tool_call_id, params }));
        });

        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(result));
      });

      // WebSocket: 浏览器连接
      server.httpServer?.on('upgrade', (req, socket, head) => {
        if (req.url === '/tool-ws') {
          wss.handleUpgrade(req, socket, head, (ws) => {
            clients.add(ws);
            ws.on('message', (data) => {
              const { callId, content, is_error } = JSON.parse(data.toString());
              pendingCalls.get(callId)?.resolve({ content, is_error });
              pendingCalls.delete(callId);
            });
            ws.on('close', () => clients.delete(ws));
          });
        }
      });
    }
  };
}
```

**异常处理：**

| 场景 | 处理 |
|------|------|
| 浏览器未连接 | HTTP 返回 503 `{ is_error: true }` |
| store action 执行抛错 | 浏览器 catch → WS 返回 `{ is_error: true }` → Tool Server 透传 |
| 30s 超时 | Tool Server 返回 504 + 清理 `pendingCalls` |
| WebSocket 断连 | 浏览器指数退避重连（最多 3 次，每次递增延迟） |
| Tool Server 未启动 | Pandaria HttpProxyTool 连接拒绝 → SSE `error` 事件 → Chat 面板提示 |

### 2.6 Electron 过渡

Phase 3 引入 Electron 后，transport 层替换为 IPC，Tool Router 零改动：

```typescript
// Dev transport (WebSocket)
const handleToolCall = (msg: ToolCallMessage) => { /* toolRouter → ws.send */ };

// Electron transport (IPC)
ipcMain.handle('tool-call', async (_event, msg: ToolCallMessage) => {
  return toolRouter[msg.params.action](msg.params);
});
```

Pandaria 的 tool endpoint 指向 `http://localhost:PORT/tool`（Electron main process 上的 HTTP server），其余不变。

### 2.7 开发与测试策略

Phase 2 各模块必须能独立开发，不等 Pandaria 就绪。依赖关系决定开发顺序：

```
模板系统 ────────────────────── 无依赖，纯 UI + store，最先开发
    │
Tool Server ─────────────────── 无外部依赖，用 curl 自测
    │
    ├── toolRouter ──────────── 依赖 store actions（Phase 1 完成）
    │                            直接 import store 单元测试
    │
    ├── Vite 插件 ────────────── 依赖 ws 库
    │                            用 curl POST /tool 集成测试
    │
    └── Pandaria 对接 ───────── 最后一块，可用本地 Pandaria 实例

Chat UI ────────────────────── mock SSE 先行，Pandaria 就绪后切真实流
```

**开发顺序——最大化并行：**

```
阶段 1（Week 1-2）          阶段 2（Week 3-4）          阶段 3（Week 5-6）
─────────────────          ─────────────────          ─────────────────
模板系统 ─────────────→
  store actions 就绪
  可直接给 toolRouter 用
                            Tool Server ─────────→
                              curl 自测通
                                                        Pandaria 对接 ──→
                                                          本地 Pandaria
                                                          实例 + 集成测试
                                                        
                                                        Chat UI ──────────→
                                                          mock SSE 先行，
                                                          就绪后切真实 SSE
```

#### toolRouter — 纯函数单元测试

无需 HTTP、无需 WebSocket。直接 import store，调 action，断言结果和返回文本。

```typescript
// src/stores/toolRouter.test.ts
import { toolRouter } from './toolRouter';
import { useProjectStore } from './projectStore';

test('add_node creates scene and returns confirmation', async () => {
  const result = await toolRouter['add_node']({
    parentId: 'act-1', type: 'scene', title: '新场景'
  });
  expect(result).toMatch(/已添加 scene「新场景」/);
  expect(useProjectStore.getState().getChildren('act-1').length).toBe(1);
});

test('delete_node with children returns confirmation', async () => {
  // 先建一个带子节点的场景
  const parent = useProjectStore.getState().addTreeNode('act-1', { type: 'scene', title: '待删除' });
  useProjectStore.getState().addTreeNode(parent.id, { type: 'shot', title: '子镜头' });
  
  const result = await toolRouter['delete_node']({ nodeId: parent.id });
  expect(result).toMatch(/已删除/);
  expect(useProjectStore.getState().getNodeById(parent.id)).toBeUndefined();
});

test('get_tree returns indented text', async () => {
  const result = await toolRouter['get_tree']({});
  expect(result).toContain('├──');
  expect(result).toContain('项目');
});
```

#### Tool Server — curl 集成测试

Vite 插件启动后，在浏览器打开并连接 `/tool-ws` 的前提下，用 curl 模拟 Pandaria：

```bash
# tool-server/test-scripts/test-all-tools.sh
BASE="http://localhost:5173/tool"
HEADER="Content-Type: application/json"

# 测试 get_tree
echo "=== get_tree ==="
curl -s -X POST $BASE -H "$HEADER" -d '{
  "tool_call_id":"t1","params":{"action":"get_tree"},
  "session_id":"test","tenant_id":"test"
}' | jq .

# 测试 add_node
echo "=== add_node ==="
curl -s -X POST $BASE -H "$HEADER" -d '{
  "tool_call_id":"t2","params":{"action":"add_node","parentId":"act-1",
    "type":"scene","title":"curl 测试"},
  "session_id":"test","tenant_id":"test"
}' | jq .

# 更多 tool ...
```

#### Chat UI — mock SSE

Pandaria 就绪前，用事件序列模拟 SSE 流，开发和调试 `text_delta` 打字动画、`tool_call_*` 进度指示、`error` 处理：

```typescript
// src/test/mockSSE.ts
const MOCK_TURN: ServerEvent[] = [
  { type: 'message_start', message_index: 1 },
  { type: 'text_delta', delta: '好的，我来为你构思。' },
  { type: 'text_delta', delta: '\n\n📋 《密室来电》\n' },
  { type: 'text_delta', delta: '第一幕：困局（2 场景）\n' },
  { type: 'tool_call_started', call_id: 'c1', name: 'spellpaw_get_tree' },
  { type: 'tool_call_done', call_id: 'c1', result: '项目：...', is_error: false },
  { type: 'text_delta', delta: '\n确认后我帮你搭建结构。' },
  { type: 'turn_end', stop_reason: 'stop', usage: { input_tokens: 200, output_tokens: 150 } },
];

function useMockSSE(onEvent: (e: ServerEvent) => void) {
  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      if (i < MOCK_TURN.length) onEvent(MOCK_TURN[i++]);
      else clearInterval(interval);
    }, 400); // 模拟流式延迟
    return () => clearInterval(interval);
  }, []);
}
```

#### Pandaria 端到端集成测试

Pandaria 就绪后，跑完整链路验证：

```typescript
// e2e/pandaria-integration.test.ts
// 前提：Pandaria :8080，Spellpaw :5173
test('full turn: message → agent → tool → store', async () => {
  const session = await createSession(projectTree, toolConfigs);
  await sendMessage(session.id, '帮我加一个场景');
  const events = await collectSSE(session.id, 10000);

  expect(events).toContainEqual({ type: 'text_delta' });
  expect(events).toContainEqual({ type: 'tool_call_started', name: 'spellpaw_add_node' });
  expect(events).toContainEqual({ type: 'tool_call_done', is_error: false });
  expect(events).toContainEqual({ type: 'turn_end' });
  expect(useProjectStore.getState().getChildren('act-1').length).toBeGreaterThan(0);
});
```

---

## Phase 2.5 🆕：竞争加固（约 2 周）

> **核心命题：在 Phase 2 AI 能力上线后，快速补齐与 Topview 的差距项**  
> **触发原因：** Topview Drama Studio 直接竞争 + 20 语言 + 30 模板 + API 生态  
> **策略：** 不做大功能，做「竞争差异化的加固」

### 2.5.1 目标

| # | 目标 | 成功标准 |
|---|------|---------|
| 1 | 英文 UI MVP | 用户可切换中/英文界面，覆盖所有主要 UI 文案 |
| 2 | 模板扩展至 15+ | 社区贡献机制上线，模板总量 ≥15（内置 + 社区 + AI 生成） |
| 3 | Topview 桥接完善 | 支持多模型选择，增加参数配置 |
| 4 | Drama Studio 对照导出 | 一键导出项目结构与 Drama Studio 的对照分析 |

### 2.5.2 英文 UI MVP（≈ 1 周）

**范围：** 仅中/英双语，用最简单 key-value 翻译表覆盖核心 UI。

- [ ] 翻译表：`src/shared/i18n/` 下 `zh.json` + `en.json`
- [ ] 语言切换：Navbar 下拉菜单（中/英），存入 `localStorage`
- [ ] 覆盖范围：导航、树视图、画布、Chat、Detail Panel、模板浏览器
- [ ] 不包括：模板内容翻译、Agent 对话翻译、帮助文档

**为什么先做英文：** Topview 的英文市场优势明显。Spellpaw 即使只有英文 UI（内容仍可为中文），也能降低海外创作者尝试门槛。同时验证 i18n 架构，为 Phase 4 全面国际化铺路。

### 2.5.3 模板扩展 15+（≈ 0.5 周）

- [ ] 新增内置模板：品牌微电影、产品种草、科技评测、时尚穿搭、恐怖短片（5 个新增）
- [ ] AI 模板生成：Agent 一键导出当前项目为模板
- [ ] 社区贡献入口：`/templates` 增加「提交模板」→ 生成 `.spellpaw-template.json` → 复制分享

### 2.5.4 Topview 桥接完善（≈ 0.5 周）

- [ ] 模型选择器：Veo 3.2 / Sora 2 / Seedance 2.0 / Kling 2
- [ ] 参数配置面板：aspect ratio (16:9 / 9:16 / 1:1)、resolution (720p / 1080p)、duration
- [ ] Fallback：Topview API 不可用时降级为静态分镜图生成

### 2.5.5 Drama Studio 对照导出

**定位：** 展示 Spellpaw 相较 Drama Studio 的「可编辑性」优势。帮助用户理解为什么 Spellpaw 的叙事结构管理比 AI 生成更有价值。

导出 Markdown / PDF 包含：
- 结构深度对比（4 级层级 vs 场景级）
- 元数据可编辑性对比
- 节点状态流转 vs 无状态
- 节奏分析 vs 无分析

---

## Phase 3：云端协作与内容生态（约 5 周）

> **核心命题：从"单人本地工具"升级为"可协作、可分享的平台"**  
> **竞品借鉴：** Higgsfield Community 画廊 + Higgsfield Collab（简化版）  
> **协作策略：** 异步 push/pull（Git-like），不做 CRDT 实时协作。短剧团队 2-5 人，冲突概率低，没必要为 5% 场景引入 CRDT 复杂度

### 3.1 目标与成功标准

| # | 目标 | 成功标准 |
|---|------|---------|
| 1 | 云端同步 | 用户登录后可跨设备推送/拉取项目，冲突时展示 diff 供手动选择 |
| 2 | 团队协作 | 多人可异步编辑同一项目（push/pull 模式），非同时编辑 |
| 3 | 模板市场 | 用户可上传/下载模板，形成内容飞轮 |
| 4 | 🆕 多语言扩展 | 英文 UI 完善 + 新增 2 语言（日/韩），Agent 对话支持多语言理解 |

> **注：** 英文 MVP 已在 Phase 2.5 完成。Phase 3 扩展至日/韩，并让 Agent 支持多语言对话。

### 3.2 Phase 3 功能规划

```
Phase 3 功能全景
┌──────────────────────────────────────────────────────────────────────┐
│                                                                      │
│  ┌─────────────────┐   ┌──────────────────┐   ┌────────────────┐   │
│  │ 云端基础设施      │   │ 异步协作（Git-like）│   │ 内容生态        │   │
│  │                 │   │                  │   │                │   │
│  │ 用户认证        │   │ push / pull      │   │ 模板市场        │   │
│  │ 项目云存储      │   │ 冲突检测 + diff   │   │ 项目分享画廊    │   │
│  │ IndexedDB 本地  │   │ 手动合并冲突      │   │ 模板评价/下载   │   │
│  │ 多端同步        │   │ 协作状态指示      │   │ Trending 算法   │   │
│  └─────────────────┘   └──────────────────┘   └────────────────┘   │
│                                                                      │
│  ┌─────────────────┐   ┌──────────────────┐                        │
│  │ 版本管理          │   │ 🆕 多语言扩展       │                        │
│  │                 │   │                  │                        │
│  │ 自动版本快照     │   │ 日/韩 UI 语言     │                        │
│  │ 版本对比/回滚    │   │ Agent 多语言对话   │                        │
│  │                 │   │ 模板本地化        │                        │
│  └─────────────────┘   └──────────────────┘                        │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

#### 3.2.1 云端基础设施

- **后端选型：** Node.js + PostgreSQL（或 Supabase 快速上线）
- **认证：** Email + Google OAuth（初期可选）
- **存储迁移：** localStorage → IndexedDB（本地缓存） + 云端同步
- **同步策略：** 离线优先（本地编辑 → 手动推送），本地永远是主版本

#### 3.2.2 异步协作设计（Git-like）

**为什么不用 CRDT：** Spellpaw 的协作场景与 Figma/Notion 不同——团队 2-5 人，工作流是「编剧写完一幕 → 导演 review → 摄影指导加镜头」，天然串行。异步 push/pull 覆盖 90% 需求，CRDT 为 10% 的场景增加数周复杂度。

**协作模型：**

```
用户 A                             云端                              用户 B
─────                             ────                              ─────
编辑项目
  │
  ├─ push ──────────────────────→ 存储版本 v1
  │                                │
  │                                ←──── pull ───────────────────────┤
  │                                                                   编辑项目
  │                                                                     │
  ├─ push ──────────────────────→ 存储版本 v2 ←── 冲突！──────┤
  │                                节点 s1-1 被 A 和 B 都改了            │
  │                                                                    │
  │                                ←──── pull ───────────────────────┤
  │                                收到冲突提示                       收到 diff：
  │                                │                                  s1-1 有两个版本
  │                                │                                  [用 A 的] [用 B 的] [手动合并]
```

**冲突检测粒度：节点级（非字符级）**

```typescript
interface ConflictResult {
  nodeId: string;
  nodePath: string;                 // "第一幕 > 场景 1-1"
  localVersion: Partial<TreeNode>;  // 你的修改
  remoteVersion: Partial<TreeNode>; // 云端的修改
  conflictingFields: string[];      // ["title", "description", "duration"]
}
```

**diff 对比 UI（已落地）：**

```
┌─────────────────────────────────────────────────────┐
│ ⚠️ 冲突：场景 1-1「醒来」                             │
│                                                     │
│  你的版本            │  云端版本（@director_lee）     │
│  ───────────────────│────────────────────           │
│  标题：昏迷苏醒       │  标题：醒来                    │
│  时长：25s           │  时长：30s                     │
│  描述：主角缓缓睁眼...│  描述：主角从昏迷中醒来...       │
│                                                     │
│  [使用我的]  [使用云端的]  [逐字段选择]               │
└─────────────────────────────────────────────────────┘
```

> ✅ 已实现：`src/lib/treeDiff.ts`（`diffTrees` + `mergeTrees`）+ `src/components/modals/ConflictResolverModal.tsx`（逐节点选择 local/remote + 批量快捷键）+ `src/lib/projectSync.ts`（`resolveConflictWithMerge`）。

**同步协议：** 每个节点有 `version` 字段。push 时比较本地 version 和云端 version：
- 相同 → 直接覆盖
- 云端更高 → 冲突，展示 diff

#### 3.2.3 模板市场（已砍掉云端版）

> **决策（2026-05-30）：云端模板市场上传/下载/评价/Trending 功能砍掉。** 5 个内置模板 + 用户本地自定义模板已覆盖创作需求，内容生态 ROI 低于预期。
>
> 保留：`/templates` 页面仅管理**内置模板 + 本地自定义模板**（导入/导出/编辑/删除）。
>
> 砍掉：云端上传、社区浏览、下载计数、Trending、付费模板。

#### 3.2.4 项目分享画廊（已砍掉）

> **决策（2026-05-30）：项目分享画廊砍掉。** 非 Spellpaw 核心创作路径，与 AI 辅助工具定位不符。
>
> 后端 `/api/gallery` 路由和 `GalleryItem` Prisma 模型已移除。

### 3.3 Phase 3 里程碑

```
Week 1-2:   云端基础设施
            ├── 用户认证（Email + OAuth）
            ├── 项目云存储 + IndexedDB 本地缓存层        ✅ 已完成
            └── 数据迁移脚本（localStorage → IndexedDB + 云端）

Week 3-4:   异步协作
            ├── push / pull 协议 + 节点级 version 管理
            ├── 冲突检测 + diff 对比 UI                  ✅ 前端已就绪（treeDiff + ConflictResolverModal）
            └── 协作状态指示（队友在线 / 最后推送时间）

Week 5:     ~~模板市场~~（已砍掉云端版，仅保留本地模板管理）

Week 6:     画廊 + 版本管理 + 集成
            ├── 项目分镜集公开分享
            ├── 自动版本快照 + 版本对比 / 回滚
            └── 集成测试
```

---

## Phase 4：开放生态（约 5 周）

> **核心命题：从"封闭平台"升级为"协议级基础设施"**  
> **竞品借鉴：** Higgsfield MCP 协议 + Topview 全面多语言  
> **Phase 3 后移项：** CRDT 实时协作（按需从异步升级）

> **注：** 国际化已在 Phase 2.5（英文 MVP）+ Phase 3（日/韩）启动，Phase 4 完成剩余语言。

### 4.1 目标与成功标准

| # | 目标 | 成功标准 |
|---|------|---------|
| 1 | MCP Server 上线 | 外部 AI agent 可通过 MCP 协议读/写 Spellpaw 项目结构 |
| 2 | 第三方集成 | ≥1 个外部应用接入（如 Claude 直接操作 Spellpaw 项目） |
| 3 | 全面国际化 | 支持 ≥5 种语言（中/英/日/韩/西），含 prompt 级别多语言生成 |
| 4 | API 文档 | 完整的 REST API + MCP 文档，开发者可自行集成 |
| 5 | 实时协作升级（可选） | 若异步 push/pull 不够用，升级为 CRDT 实时协作 |

> **注：** 英文 MVP（Phase 2.5）+ 日/韩（Phase 3）已完成，Phase 4 补齐西语 + prompt 多语言生成。

### 4.2 Phase 4 功能规划

```
Phase 4 功能全景
┌──────────────────────────────────────────────────────────────────────┐
│                                                                      │
│  ┌─────────────────┐   ┌──────────────────┐   ┌────────────────┐   │
│  │ MCP Server       │   │ 全面国际化          │   │ 第三方集成      │   │
│  │                 │   │                  │   │                │   │
│  │ 项目结构读写     │   │ UI 5 语言          │   │ REST API       │   │
│  │ Agent 操作触发   │   │ 内容生成多语言     │   │ Webhook        │   │
│  │ 素材引用         │   │ 模板本地化        │   │ Partner 接入   │   │
│  │ 生成事件回调     │   │ 日期/货币/格式     │   │ API 文档       │   │
│  └─────────────────┘   └──────────────────┘   └────────────────┘   │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

#### 4.2.1 双模式集成：MCP Server + Agent 客户端

Phase 2 实现了**模式 B**（Spellpaw 作为 Agent 客户端，通过 HTTP/JSON 调用外部 Agent）。
Phase 4 补齐**模式 A**（Spellpaw 作为 MCP Server，被外部 AI 工具调用）。两者互补：

```
模式 B（Phase 2 已实现）              模式 A（Phase 4 新增）
───────────────────────              ───────────────────────
Spellpaw → Agent API                 Claude Desktop → Spellpaw MCP
（用户在 Spellpaw 对话）              （用户在 Claude 中操作 Spellpaw）
```

**MCP Server 与 Agent 协议的关系：**

Phase 2 定义的 JSON AgentAction（add_node / update_node / delete_node 等）在 Phase 4 可以直接映射为 MCP Tools。核心操作是同一套 store actions，只是入口不同：

| 协议层 | Phase 2（Agent API） | Phase 4（MCP Server） |
|--------|---------------------|----------------------|
| 入口 | Chat 面板 → HTTP POST /chat | Claude → MCP stdio/SSE |
| 指令格式 | AgentAction (JSON) | MCP Tool 参数 |
| 底层执行 | 同一套 store actions（addNode / updateNode / ...） | 同左 |
| 确认机制 | Spellpaw Chat 面板的卡片 UI | MCP 协议的 requires_confirmation 字段 |

**MCP Server 场景示例：**

```
用户（在 Claude Desktop 中）:
  "帮我把 Spellpaw 里《密室来电》第三幕的所有场景时间改为夜景"

Claude → Spellpaw MCP:
  tool: spellpaw__list_nodes(project_id="xxx", parent_id="act-3")
  → returns [scene-1, scene-2]

  tool: spellpaw__batch_update_metadata(nodes=[
    {id: "scene-1", timeOfDay: "night"},
    {id: "scene-2", timeOfDay: "night"}
  ])
  → returns success

Claude → 用户:
  "已将《密室来电》第三幕的 2 个场景时间改为夜景"
```

**MCP Tool 设计（直接映射 AgentAction）：**

| MCP Tool | AgentAction type | 功能 |
|------|---------|------|
| `spellpaw__list_projects` | — | 列出所有项目 |
| `spellpaw__get_project` | — | 获取项目结构 + 元数据 |
| `spellpaw__add_node` | `add_node` | 添加子节点 |
| `spellpaw__update_node` | `update_node` | 更新节点标题/元数据 |
| `spellpaw__delete_node` | `delete_node` | 删除节点（返回子树供撤销） |
| `spellpaw__move_node` | `move_node` | 重新排序同级节点 |
| `spellpaw__apply_template` | `apply_template` | 套用模板 |
| `spellpaw__generate_storyboard` | `generate_storyboard` | 触发 AI 分镜生成 |
| `spellpaw__get_assets` | — | 获取资产列表 |

#### 4.2.2 全面国际化（借鉴 Topview 多语言）

**UI 层面：** i18n 框架（`react-intl`），覆盖全部 UI 文案。

**内容层面（关键借鉴）：** prompt 级别多语言生成：

```
Phase 2:  用户用中文对话 → Agent 生成中文内容
Phase 4:  用户用中文对话 → Agent 在后台同时生成
          ✅ 中文版（默认）
          ✅ 英文版
          ✅ 日文版
          ✅ 韩文版
          ✅ 西班牙文版
          用户可在项目设置中选择需要的语言版本
```

**模板本地化：** 模板市场的模板标题/描述自动翻译为本地语言。

### 4.3 Phase 4 里程碑

```
Week 1-2:   MCP Server 开发 + Claude 集成验证
Week 3-4:   全面国际化（UI i18n + prompt 多语言生成）
Week 5:     REST API + Webhook + 文档
Week 6:     第三方合作伙伴接入 + 集成测试
```

---

## 路线图全景时间线（v1.2）

```
Month 1            Month 2            Month 3            Month 4
├─ Phase 1 ────────┤                                       │
│ 本地内容编辑      │                                       │
│                   ├─ Phase 2 ────────────────────────────┤
│                   │ AI 创作助手                            │
│                   │  模板(10+) · ToolServer · Pandaria    │
│                   │  Chat · Topview桥接 · 分镜生成        │
│                   │                                       │
├───────────────────┼───────────────────────────────────────┤
Month 5            Month 6            Month 7            Month 8
├─ Phase 2.5 ──────┤                                      │
│ 竞争加固           │                                      │
│  英文UI · 模板15+  │                                      │
│  对照导出          │                                      │
├───────────────────┤                                      │
│ ├──────── Phase 3 ────────────────────┤                  │
│ │ 云端协作 + 内容生态                   │                  │
│ │  异步push/pull · 模板市场 · 多语言    │                  │
│ │                                      ├─ Phase 4 ──────┤
│ │                                      │ 开放生态         │
│ │                                      │  MCP · i18n    │
│ │                                      │  REST API      │
├─┴──────────────────────────────────────┼────────────────┤
```

---

## 竞品借鉴映射总表（v1.2 更新）

| 借鉴来源 | 借鉴内容 | 落地 Phase | 优先级 | 落地方式 |
|---------|---------|:---:|:---:|---------|
| Higgsfield Viral Presets | 叙事模板系统 | Phase 2 | 🔴 高 | 内置模板 10+ + 本地 JSON 导入导出 |
| Topview 频道模板 | 剧本类型模板（结构+场景绑定） | Phase 2 | 🔴 高 | 合入叙事模板，类型作为模板 meta |
| Topview Agent 对话 | 分步确认式 Agent 协作 | Phase 2 | 🔴 高 | Pandaria + Tool Server + SSE |
| Higgsfield 文生图 | AI 分镜画面生成 | Phase 2 | 🟡 中 | 先接入第三方 API |
| 🆕 Topview API 聚合 | **Topview API 桥接（不自研模型）** | Phase 2 | 🔴 高 | 可插拔 provider 模式 |
| Higgsfield Community | 模板市场 + 项目分享画廊 | Phase 3 | 🟡 中 | 云端平台 + trending 算法 |
| Higgsfield Collab | 异步 push/pull 协作（Git-like） | Phase 3 | 🟡 中 | 节点级 version + diff 对比 UI |
| 🆕 Topview 多语言 | **多语言 MVP（英文 Phase 2.5 + 日/韩 Phase 3）** | Phase 2.5+3 | 🔴 高 | i18n 框架 + 翻译表 |
| Topview Drama Studio 警示 | **Drama Studio 对照导出 + 可编辑性强化** | Phase 2.5 | 🔴 高 | Markdown/PDF 对比报告 |
| Higgsfield MCP | MCP Server（互补模式 A）+ REST API | Phase 4 | 🟢→🟡 | 复用 Phase 2 AgentAction 映射为 MCP Tools |
| Topview Skill 生态 | Spellpaw MCP 加速 | Phase 4 | 🟡 中 | 标准化 MCP Tools |

---

## 风险与依赖

| 风险 | 影响 Phase | 严重度 | 缓解措施 |
|------|:---:|:---:|---------|
| AI 生成质量不稳定（Agent 输出不靠谱） | Phase 2 | 🔴 高 | system_prompt 规则约束（分步操作、先征求同意）；每次关键操作前要求用户确认 |
| 🆕 Topview API 不可用或收费变更 | Phase 2 | 🟡 中 | 可插拔 provider 模式；fallback 到 Pandaria 静态分镜图生成 |
| Tool Server WebSocket 断连 | Phase 2 | 🟡 中 | 浏览器自动重连（指数退避，最多 3 次） |
| system_prompt token 膨胀 | Phase 2 | 🟡 中 | 两层上下文（大纲层 ~500 token + 细节层 tool 按需获取） |
| Pandaria 版本不兼容 | Phase 2 | 🟡 中 | 固定 API 版本号；启动时兼容性检查 |
| 🆕 Drama Studio 用户心智占领 | Phase 2.5 | 🔴 高 | 加速上线 + 对照导出展示差异化 + 英文 MVP 抢海外市场 |
| IndexedDB 迁移 | Phase 3 | 🟡 中 | 渐进迁移（先做可选同步）；迁移脚本 + 回滚能力 |
| 异步协作冲突频率高于预期 | Phase 3 | 🟡 中 | diff UI 已覆盖；若冲突 > 10% 的 push，升级到 Phase 4 CRDT |
| MCP 协议生态未成熟 | Phase 4 | 🟢 低 | Phase 4 距离较远；备选：自有 REST API + Webhook |

---

*文档版本：v1.2*  
*更新日期：2026-05-31（重大调整：Topview Drama Studio 竞争响应）*  
*上次版本：v1.1（2026-05-30）*  
*下次审视：Phase 2 完成时，或 Topview 重大产品发布后*  
*关联文档：`docs/topview-analysis-report.md` · `docs/competitive-analysis-higgsfield-topview.md`*
