# Buzzy 竞品分析

> 参照项目：AI 驱动的声明式应用交付平台

**日期**: 2026-06-15
**来源**: https://www.buzzy.buzz/

---

## 1. Buzzy 是什么

AI 驱动的无代码应用交付平台。核心理念：**不生成代码，生成「语义应用定义」** — 一份描述 UI、逻辑、数据、安全的声明式 spec，运行在统一治理引擎上。

## 2. 核心工作流

```
Kickstart          →    Enhance          →    Extend
Prompt/设计稿      →    AI + 可视化编辑器   →    生产级部署
生成原型             精调应用                扩展运行
```

AI 生成不是一步到位，而是需要「策略、纪律、理解何时用 AI prompt、何时用可视化编辑器」的迭代过程。

## 3. 关键特征

| 特征 | 说明 |
|------|------|
| **Prompt → App** | 描述需求，AI 生成应用定义（页面、表单、工作流、数据库结构） |
| **Figma → App** | Automarkup 插件，设计稿直接转可运行应用 |
| **MCP 支持** | Buzzy Builder MCP 允许从 Codex/Claude Code/Cursor 等 AI 编程助手创建企业应用 |
| **统一治理引擎** | 所有应用共享同一核心引擎，中心化升级、安全合规 |
| **声明式定义** | 一份语义 spec 生成 Web + 原生移动端 |
| **定价** | $17/月起，免费试用 1500 AI tokens |

## 4. 架构核心

Buzzy 的差异化在于 **应用定义与执行引擎分离**：

```
Prompt / Figma / API
        ↓
  语义应用定义 (UI + 逻辑 + 数据 + 安全)
        ↓
  统一治理核心引擎 ──→ Web App + Mobile App
        ↓
  中心化升级、安全、合规
```

vs 传统 AI 代码生成（每生成一个 app = 新代码库 = 新技术债）。

## 5. 与 Spellpaw 的映射

| 概念 | Buzzy | Spellpaw |
|------|-------|----------|
| **声明式定义** | 语义应用定义（pages, forms, DB） | 叙事树结构（幕→场景→镜头） |
| **核心引擎** | Governed core engine | projectStore + toolRouter |
| **AI 入口** | Prompt → 生成应用结构 | Copilot 对话 → toolRouter 写树 |
| **可视化编辑** | Figma 设计稿转应用 | 无限画布卡片 |
| **分阶段构建** | Kickstart → Enhance → Extend | 对话生成 → Builder Renderer 预览确认 → 落地 |
| **共享执行层** | 中心化引擎统一升级 | builderHandlers 共享 handler |
| **MCP/AI Agent** | MCP 支持外部 AI 工具调用 | Pandaria SSE + HttpProxyTool |

## 6. Spellpaw 可借鉴的方向

### 6.1 「语义定义」替代「代码生成」
Buzzy 的核心洞察：AI 生成代码 = 技术债。改成生成声明式 spec 由引擎解释执行。Spellpaw 已经走在这条路上 — 树结构就是 spec，Builder Renderer 是解释引擎。**可更明确地强化这一定位**：Spellpaw 不生成视频，生成叙事结构 spec，用户在引擎中预览、精调、导出。

### 6.2 三层工作流命名
Spellpaw 当前是「对话→生成→确认」。借鉴 Buzzy 的三层命名：
- **Kickstart**：AI 快速生成初稿（树 + 画布卡片）
- **Enhance**：Builder Renderer 逐项精调
- **Extend**：导出/发布

### 6.3 MCP 集成方向
Buzzy Builder MCP 允许外部 AI 工具治理式创建应用。Spellpaw 的 Pandaria + toolRouter 已实现了类似模式，但可以**对外暴露 Spellpaw MCP** 让 Cursor/Claude Desktop 等工具直接操作项目树。

### 6.4 统一治理 vs 项目隔离
Buzzy 所有应用共享引擎。Spellpaw 的项目是独立 store。短期不需要改，但多项目协作（Phase 3-4）可能需要借鉴共享模板/规则引擎。

### 6.5 Figma 集成
Buzzy 有 Figma → App。Spellpaw 的画布是类似定位 — 可视化的结构编辑器。未来可考虑：
- 画布导出为 Figma 格式（分镜设计稿）
- Figma 导入为分镜结构

## 7. 关键差异

| | Buzzy | Spellpaw |
|---|-------|----------|
| 领域 | 通用企业应用 | 短剧/短视频创作 |
| 输出 | Web + 原生 App | 叙事结构 + 分镜图 + 资产 |
| AI 模型 | 自有 + MCP 多模型 | Pandaria（Rust 后端） |
| 协作 | 企业级治理 | 个人创作者 + Git-like 异步 push/pull |
| 商业化 | SaaS 订阅 ($17/mo) | 未定 |

## 8. 结论

Buzzy 的「声明式定义 + 统一引擎」架构与 Spellpaw 的「树结构 + toolRouter + Builder Renderer」本质同构。Spellpaw 已经在做同一件事，只是领域不同。Buzzy 验证了这条路线的商业可行性（$17/mo 定价 + MCP 企业级支持），Spellpaw 可将其三层工作流命名、MCP 集成、Figma 互操作作为参考方向。
