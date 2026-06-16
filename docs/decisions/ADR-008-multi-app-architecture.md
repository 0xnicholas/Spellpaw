# ADR-008: 多 App 架构

- **Status:** Accepted
- **Date:** 2026-05-31

## Context

Spellpaw 最初是一个单体 SPA（Drama Studio）。随着项目发展，需要支持多个独立应用：

- **Portal** — 项目入口首页（Landing page）
- **Drama Studio** — 短剧/短视频创作工具（核心 app）

未来可能扩展：
- 模板市场独立页面
- 设置/账户管理页面

可选方案：
1. **单 SPA + 路由分组** — 所有页面在一个 React app 内，通过路由区分
2. **多 SPA（微前端）** — 每个 app 独立构建/部署
3. **多 App 共享基础设施** — 单一构建入口，通过目录结构隔离

## Decision

**采用多 App 共享基础设施架构。** 单一 Vite 构建入口，通过 `src/apps/` 目录隔离各 app，`src/shared/` 提供共享层。

```
src/
├── main.tsx                  # 全局入口 + 路由
├── App.tsx                   # 根路由
├── index.css                 # 全局样式 + OKLCH 设计令牌
├── shared/                   # 共享基础设施
│   ├── components/ui/        # 通用 UI（Button, Modal, TabBar, Lightbox...）
│   ├── stores/               # 通用 stores（authStore, themeStore）
│   ├── lib/                  # 通用工具（utils, idbStorage）
│   ├── hooks/                # 通用 hooks（useHotkeys, useDebounce）
│   ├── types/                # 通用类型（User）
│   ├── i18n/                 # i18n 配置 + 翻译
│   └── test/                 # 测试环境配置
└── apps/
    ├── portal/               # Portal Landing
    │   ├── pages/PortalPage.tsx
    │   └── components/（Navbar, HeroSection, ...）
    └── drama/                # Drama Studio
        ├── pages/（LoginPage, ProjectListPage, WorkspacePage, ...）
        ├── components/（tree-view, chat-panel, flow-canvas, ...）
        ├── stores/（projectStore, canvasStore, chatStore, ...）
        ├── hooks/（useCopilotSSE, useToolBridge, ...）
        ├── lib/（treeUtils, syncEngine, systemPrompt, ...）
        └── types/index.ts
```

**Path alias：**
```typescript
// vite.config.ts
'@/'         → 'src/'
'@shared/'   → 'src/shared/'
'@drama/'    → 'src/apps/drama/'
'@portal/'   → 'src/apps/portal/'
```

**共享层原则：**
- `shared/` 只能包含**所有 app 都需要的**通用代码
- 不应包含任何 app 特有的业务逻辑
- UI 组件保持通用（不接受 app 特定 props 如 `linkedTreeNodeId`）
- 通用 stores（auth, theme）放 shared/；业务 stores（project, canvas）放各 app

## Consequences

**Pros:**
- 清晰的分层——shared 通用 / app 业务专用
- 各 app 独立演进，互不干扰
- 共享 UI 组件库统一设计语言
- 单一构建，无需微前端复杂度

**Cons:**
- 单一构建导致所有 app 打包在一起，初始加载体积大
- shared/ 变更可能影响多个 app
- 新增 app 需要维护 path alias 和路由

**Mitigations:**
- 路由级代码分割（React.lazy + Suspense）按需加载各 app
- shared/ 组件有单元测试确保向后兼容
- 不预设计未来 app——仅在实际需要时扩展

---

*See also: ADR-009 (Design System)*
