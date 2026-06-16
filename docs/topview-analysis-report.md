# Topview AI 深度分析报告

> 调研日期：2026-05-31  
> 来源：topview.ai 首页、/pricing、/openapi、/topview-skill、/dashboard/home  
> 方法：HTML 抓取 + RSC payload 解析 + API 文档解构  
> 关联文档：`docs/competitive-analysis-higgsfield-topview.md`

---

## 1. 执行摘要

Topview AI 已从 2026-05-27 竞品分析文档描述的「AI Agent 视频工厂」**快速演进为多产品矩阵平台**。新增的 **Drama Studio**、**AI Canvas**、**Board** 三个产品直接进入 Spellpaw 的核心竞争领域。特别是 **Drama Studio**（定位 "Your AI Writer-Director / One-Person AI Drama Studio"）**直接对标 Spellpaw 的短剧创作场景**。

**Topview 的产品策略正在从「垂直 UGC 营销视频」向「通用 AI 创作平台」扩张。** Spellpaw 必须重新评估竞争格局和差异化策略。

---

## 2. 产品矩阵全貌

### 2.1 产品导航结构（从首页提取）

```
Topview 主导航
├── Use Cases          → 场景入口
│   ├── Advertising / Affiliate Marketing / Ecommerce / DTC Brands
│   ├── AI Live Stream / Recreate Viral Video
│   └── Ad Library
├── AI Tools           → 工具矩阵
│   ├── AI Ads / AI Video Agent / AI Ads Video / AI Product Video / AI UGC Video
│   ├── URL to Video / AI Avatar / AI Avatar Generator / Product Avatar
│   ├── Design My Avatar / AI Lip-sync
│   ├── AI Video / AI Video Generator / AI Short Video
│   ├── Video Character Swap / Video Upscale / Motion Control
│   ├── AI Image / AI Image Generator / Inpaint
│   ├── Image Character Swap / Image Face Swap / Image Upscale
│   ├── Photo Angle Editor / Virtual Try-On / Product Photography
│   └── AI Audio / Voice Over
├── Resources          → Blog, Case Studies, Affiliate Program, Learning Center
├── Models             → Video Models + Image Models
├── Skill              → Topview Skill（AI assistant 集成）
├── API                → OpenAPI 开发者平台
└── Pricing
```

### 2.2 Dashboard 主页 Quick Entries（4 个核心入口）

| 入口 | 图标 | 标题 | Slogan | 用途推测 |
|------|------|------|--------|----------|
| **Video Agent (V2)** | 🤖 | Video Agent | "Plan any-length videos with AI assistant and references" | 对话式视频 Agent，支持 @mention 引用素材 |
| **AI Canvas** | 🖼️ | AI Canvas | "Vibe create, let ideas flow naturally" | 创意画布，自由组合视觉元素 |
| **Drama Studio** | 🎬 | Drama Studio | "Your AI Writer-Director" | AI 编剧+导演，生成带分镜的剧本 |
| **Board** | 📊 | Board | "Best AI models all in one board" | 多模型聚合工作台 |

另有 **Storyboard to Video** 推广位：将分镜脚本转为视频。

### 2.3 完整产品清单（从 i18n key 解析）

**AI 视频类：**
- AI Video Agent · AI Ads Video · AI Product Video · AI UGC Video
- AI Video Generator · AI Short Video · URL to Video
- Video Character Swap · Video Upscale · Motion Control
- AI Lip-sync · Vibe Editing

**AI 形象类：**
- AI Avatar · AI Avatar Generator · Product Avatar · Design My Avatar
- AI Live Stream

**AI 图像类：**
- AI Image Generator · Inpaint · Image Character Swap · Image Face Swap
- Image Upscale · Photo Angle Editor · Virtual Try-On · AI Product Photo
- Product Photography

**AI 音频类：**
- Voice Over

**总计：30+ 独立功能入口**

---

## 3. 4 个核心产品深度分析

### 3.1 Video Agent V2

**定位：** 对话式 AI 视频创作助手

**核心交互：**
- 自然语言描述 → Agent 规划视频 → 生成
- 支持上传 1-5 张参考图/视频，`@mention` 引用
- 提供 Ad Library（广告素材库预览）
- 支持 Storyboard 分镜模式

**多语言生成示例（从首页 RSC payload 提取）：**
- 输入：一段中文/英文 prompt
- 输出：结构化的分镜脚本 + 6 种语言版本（EN, FR, DE, JA, KO, PT）
- 脚本包含：场景编号、时间戳、镜头方向、SFX、表演指导、灯光描述

**技术架构：**
- Next.js SSR（Vercel 部署）
- 异步任务模型：taskId → polling → signed URL
- 对话上下文管理（支持 reference 持久化）

### 3.2 AI Canvas 🆕

**定位：** "Vibe create, let ideas flow naturally"

**已知信息：**
- 首页有独立产品入口和 demo 视频
- 图标为 frame（取景框），暗示视觉化编辑
- 对应 URL 路由：`/gen/ai-creation?type=aiVideo&ref_tab=videoEdit`
- 有一个产品 banner 图（CloudFront CDN 托管）

**推测功能（基于 URL 参数和产品定位）：**
- 可视化的 AI 视频/图像编辑界面
- 组合多片段、时间轴编排
- 自由拖拽布局（"let ideas flow naturally"）
- 与 Video Agent 协同（对话产出 → 画布编排）

### 3.3 Drama Studio 🆕🚨

**定位：** "Your AI Writer-Director" / "One-Person AI Drama Studio"

**这是对 Spellpaw 威胁最大的产品。** 从首页数据可确认：

**生成内容格式（从 demo 数据提取）：**
```
"10-second vertical (9:16) satisfying ASMR unboxing of 'FROGGY PRINCE'
Product: @Image 1

Scene 1 — Box Tap + Open (0–3s):
[镜头方向 + 表演指导 + SFX 标注]

Scene 2 — Tissue Peel + Figure Reveal (3–6s):
[镜头方向 + 表演指导 + SFX 标注]

Scene 3 — Inspection + Close (6–10s):
[镜头方向 + 表演指导 + SFX 标注]"
```

**关键能力：**
- ✅ 结构化场景分解（Scene 1 / 2 / 3 + 时间轴）
- ✅ 镜头方向描述（whip pan, static lock-off, close-up）
- ✅ 表演指导（acting direction）
- ✅ SFX 标注（sound effects）
- ✅ 灯光/视觉风格描述（chiaroscuro, warm golden glow, dramatic shadows）
- ✅ **6 语言自动翻译**（EN, FR, DE, JA, KO, PT）
- ✅ @mention 素材引用
- ✅ 纵横比适配（9:16 / 16:9）

**与 Spellpaw Drama Studio 的关系：**
- Topview 直接用「Drama Studio」这个名字，说明短剧/剧本是明确的战略方向
- 功能覆盖了 Spellpaw 的「场景结构 + 元数据」核心能力
- 优势：有 AI 视频生成后端，脚本可直接出片
- 劣势（vs Spellpaw）：未见 4 级树状结构、无画布双向同步、无本地离线

### 3.4 Board 🆕

**定位：** "Best AI models all in one board"

**已知信息：**
- 多模型聚合工作台
- Storyboard 工具入口：`/board/my-first-board?tool-type=storyboard-to-video`
- Storyboard 流程：GPT-Image-2 → Seedance 2，分镜图 → 视频

**推测功能：**
- 类似 Notion / Miro 风格的板块工作台
- 可在同一 Board 上调用不同 AI 模型
- 串联工作流：图像模型 → 视频模型
- 团队协作空间（可能）

---

## 4. Topview API（OpenAPI）详细解构

### 4.1 定位

> "One API for Every AI Video & Image Model"

统一的 REST API 层，封装所有主流 AI 视频/图像模型，开发者只需一个 API key。

### 4.2 接入的第三方模型

**视频模型（8 个）：**

| 模型 | 来源 | 描述 |
|------|------|------|
| Veo 3.2 | Google | 旗舰级电影视频模型，原生音频 |
| Sora 2 | OpenAI | 叙事级文生视频 |
| Seedance 2.0 | ByteDance | 多镜头视频 + 原生音频同步 |
| Wan 2.7 | Alibaba | 高保真图生视频 |
| Kling 2 | Kuaishou | 真实感视频 + 精准镜头控制 |
| Higgsfield | Higgsfield AI | 电影级运镜（Bullet Time, Crash Zoom, Dolly Zoom） |
| Vidu Q3 | Shengshu | 角色一致性视频 |
| Happy Horse 1 | — | 风格化短视频/广告 |

**图像模型（4 个）：**

| 模型 | 来源 | 描述 |
|------|------|------|
| GPT Image 2 | OpenAI | 指令遵循 + 文字渲染 |
| Nano Banana | — | 多参考图一致性产品图 |
| Flux | Black Forest Labs | 真实感/高 prompt 还原度 |
| Ideogram | Ideogram | 排版 + 品牌安全海报 |

### 4.3 Topview 自有 API（4 个）

| API | 端点 | 描述 |
|-----|------|------|
| Video Avatar | `POST /v1/video_avatar/task/submit` | 30+ 语言数字人播报，支持从 30s 视频克隆 |
| Product Avatar | `POST /v1/product_avatar/task/submit` | 数字人手持/展示实物产品 |
| URL-to-Video | `POST /v1/url2video/task/submit` | 产品 URL → 广告视频 |
| Product Anyshoot | `POST /v1/product_anyshoot/task/submit` | 产品嵌入任意场景/虚拟试穿 |

### 4.4 技术架构

```
认证：Authorization: Bearer + Topview-Uid header
任务模型：POST → taskId → poll /task/query (每 3-5s)
输出：signed URL (MP4/PNG/JPEG)
规格：480p / 720p / 1080p，比例 16:9 / 9:16 / 1:1 / 4:3 / 3:4 / 21:9
计费：统一 credit 系统，按模型和分辨率定价
```

### 4.5 定价

| 层级 | 价格 | 说明 |
|------|------|------|
| Free | $0 | 无信用卡，测试所有端点 |
| Pay-as-you-go | ~$0.04/sec 视频起 | 按模型差异化定价 |
| 月付档位 | $7, $9, $10, $13, $17, $29, $75, $150, $348, $900, $1800 | 预设 credit 包 |
| Enterprise | Custom | 专属容量/SLA/白标 |

**参考：** Seedance Standard ≈ 1.2 credits/sec @ 720p

---

## 5. Topview Skill — AI Agent 集成生态

### 5.1 定位

> "Plug Topview Skill into your AI assistant and unlock video generation, image creation and editing, talking avatars, and voice capabilities in one unified toolkit."

### 5.2 安装方式

```bash
# GitHub 仓库
https://github.com/topviewai/skill.git
```

面向 ClawHub / OpenClaw 生态（类似 Cursor/Copilot 的 agent skill 市场）。

### 5.3 能力矩阵

| 类别 | 能力 |
|------|------|
| 电商视频 | 产品展示视频、营销视频 |
| 营销图片 | 产品主图、场景图 |
| 视频生成 | 文生视频、图生视频 |
| 视频编辑 | — |
| 数字人 | Talking Avatar |
| 图片生成 | 文生图、图片编辑 |
| 图片编辑 | 背景移除、产品模型图 |
| 音频 | Voiceover 生成 |

---

## 6. 技术栈与部署

| 维度 | 详情 |
|------|------|
| 框架 | Next.js（App Router，SSR） |
| 部署 | Vercel |
| CDN | CloudFront（`d1735p3aqhycef.cloudfront.net` + `dj5nb01yl89hl.cloudfront.net`） |
| 样式 | Tailwind CSS，暗色主题 |
| 国际化 | 20 种语言页面（en, pt-br, es, fr, pt, it, ja, th, pl, ko, de, ru, da, ar, nb, nl, id, tw, zh, tr） |
| API | REST，`api.topview.ai` |
| 认证 | Bearer token + User ID header |
| 视频模型 | 12+ 接入（8 视频 + 4 图像 + 4 自有） |
| 状态管理 | React Server Components（推测） |

---

## 7. 与 Spellpaw 的竞争对比（更新版）

### 7.1 战略定位对比

```
Topview:   AI 媒体创作平台 → 「全栈 AI 视频生产基础设施」
           - 底层：API 聚合 12+ 模型
           - 中层：Agent 对话 + Canvas + Board + Drama Studio
           - 上层：30+ 场景化 AI 工具

Spellpaw:  叙事驱动的 AI 辅助制作工具 → 「短剧/短视频创作工作台」
           - 底层：本地优先 + IndexedDB
           - 中层：树状结构 + 画布 + Agent 对话
           - 上层：模板系统 + 节奏分析
```

### 7.2 直接竞争领域

| 领域 | Topview 产品 | Spellpaw 对应 | 竞争程度 |
|------|-------------|--------------|:---:|
| **短剧剧本生成** | Drama Studio | 树状结构 + Agent | 🔴 高 |
| **创意画布** | AI Canvas | FlowCanvas | 🟡 中 |
| **多模型工作台** | Board | — | 🟢 低 |
| **AI 对话协作** | Video Agent V2 | ChatPanel + Spellpaw Copilot | 🟡 中 |
| **分镜脚本** | Storyboard to Video | 画布 SceneCard + 分镜图 | 🟡 中 |
| **模板系统** | 频道模板（30+ 类型） | 叙事模板系统 | 🟡 中 |
| **多语言** | 20 语言 UI + 6 语言内容 | 中文为主 | 🔴 高 |

### 7.3 功能逐项对比

| 能力 | Topview | Spellpaw | 优势方 |
|------|:---:|:---:|:---:|
| 叙事结构管理（4 级层级） | ❌（仅 Scene 级） | ✅ 项目→幕→场景→镜头 | Spellpaw |
| 画布-树双向同步 | ❌ | ✅ | Spellpaw |
| AI 分镜图缩略图 | ❓ | ✅ Lightbox + 风格锁 | Spellpaw |
| 节奏分析报告 | ❌ | ✅ | Spellpaw |
| 本地离线 + JSON 迁移 | ❌（全云端） | ✅ IndexedDB + 导入导出 | Spellpaw |
| 数据主权 | 平台持有 | 用户本地持有 | Spellpaw |
| AI 视频生成 | ✅ 12+ 模型 | ❌ 依赖外部 | Topview |
| 数字人播报 | ✅ Video Avatar | ❌ | Topview |
| URL→视频 | ✅ URL-to-Video | ❌ | Topview |
| 多语言 | ✅ 20 UI + 6 内容 | ❌ | Topview |
| API/SDK | ✅ REST API | ❌ | Topview |
| Agent Skill 生态 | ✅ GitHub 可安装 | ❌ | Topview |
| AI 广告素材 | ✅ 全链路 | ❌ | Topview |
| 模板数量 | ✅ 30+ 频道类型 | 🟡 5 个内置 | Topview |

### 7.4 Spellpaw 护城河再评估

**仍然坚固的护城河：**

1. **叙事深度管理**：Topview Drama Studio 提供场景级结构，但 Spellpaw 的**4 级层级**（项目→幕→场景→镜头）和**元数据丰富度**（镜头类型/机位/对白/备注/状态流转）仍是差异化壁垒
2. **画布-树-Agent 三向联动**：Topview 的 Canvas 和 Drama Studio 是独立产品，未见树与画布的双向同步
3. **本地离线 + 数据主权**：影视制作行业对隐私敏感，Spellpaw 的离线-first 策略是独特价值

**正在被侵蚀的护城河：**

1. **AI 编剧/导演**：Drama Studio 直接以 "AI Writer-Director" 切入，且能直接产出视频
2. **多语言**：Topview 已支持 20+ 语言 UI + 6 语言内容生成，Spellpaw 仅支持中文
3. **生态整合**：Topview Skill 允许其他 AI agent 调用其能力，形成网络效应

---

## 8. 战略建议

### 8.1 紧迫行动（Phase 2 内必须完成）

| 优先级 | 行动 | 理由 |
|:---:|------|------|
| 🔴 P0 | 加速 AI 生成能力接入 | Drama Studio 的核心优势是「生成+出片」闭环 |
| 🔴 P0 | 叙事模板系统上线 | Topview 30+ 频道模板 vs Spellpaw 仅有 5 个 |
| 🟡 P1 | Agent 分步协作模式 | Topview 的 Video Agent 分步确认体验需要匹配 |
| 🟡 P1 | 多语言最小可用版 | 至少先支持英文 UI + 英文内容生成 |

### 8.2 中期差异化（Phase 3）

| 策略 | 说明 |
|------|------|
| **强化叙事结构深度** | 增加镜头->帧的 5 级层级，场景转场标注 |
| **协作工作流** | 聚焦短剧团队的异步 push/pull 流程，区别于 Topview 的纯云端 |
| **模板市场** | 用户分享 `.spellpaw-template.json`，形成创作者社区 |
| **MCP 集成** | 让外部 Agent 能读写 Spellpaw 项目结构，建立开放生态 |

### 8.3 应避免的方向

| ❌ 不做 | 理由 |
|--------|------|
| 自研 AI 视频模型 | Topview 用 API 聚合 12+ 模型，自研时机不成熟 |
| 纯云端化 | 离线是 Spellpaw 核心差异化，不应放弃 |
| 泛化为通用视频工具 | 聚焦短剧叙事是唯一清晰定位 |
| 直接生成视频成片 | Spellpaw 价值在「叙事结构 + 创意过程」，最终成片可由 Topview/Higgsfield API 输出 |

---

## 9. 未确认项（需要进一步调研）

| 项目 | 重要性 | 调研方式 |
|------|:---:|------|
| AI Canvas 具体交互细节 | 🟡 中 | 注册账号、或获取产品截图 |
| Drama Studio 是否支持幕（Act）层级 | 🔴 高 | 注册测试 |
| Board 的具体工作流 | 🟡 中 | 注册测试 |
| 用户规模/付费数据 | 🟢 低 | 第三方数据平台 |
| 是否支持节点级内容编辑（非仅生成） | 🔴 高 | 注册测试 |
| Canvas/Drama Studio/Board 之间是否联动 | 🟡 中 | 注册测试 |

---

*文档版本：v1.0*  
*下次更新：Product Hunt / 社交媒体出现 Topview 重大更新时，或注册测试完成后*
