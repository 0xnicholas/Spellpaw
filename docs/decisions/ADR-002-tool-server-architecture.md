# ADR-002: Tool Server 架构（HTTP + WebSocket 桥接）

- **Status:** Accepted
- **Date:** 2026-05-28

## Context

Pandaria 的 HttpProxyTool 通过 HTTP POST 调用 tool，但 Spellpaw 的 Zustand stores 在浏览器内存中运行。HTTP server 无法直接访问浏览器端 store。

可选方案：
1. **独立 Node.js tool server** — 在服务端运行 tool handler，直接操作数据库
2. **Vite 插件内嵌 server + WebSocket 桥接** — 开发期单进程方案
3. **Electron IPC** — 生产期方案，主进程暴露 HTTP endpoint，通过 IPC 调用渲染进程

## Decision

采用 **双 transport 策略**，Tool Router 代码在两种 transport 间复用：

**开发期（Vite）：**
```
Pandaria                    Vite Dev Server (:5173)            Browser
───────                    ─────────────────────────           ───────
POST /tool ──────────────→  HTTP middleware /tool
                                │
                                ├─ WebSocket → /tool-ws ───→  toolRouter
                                │                               ↓
                                ←── WS 响应 ─────────────────  store action
←── HTTP 200 ──────────────  构造响应
```

**生产期（Electron）：**
```
Pandaria                    Electron Main Process             Renderer
───────                    ────────────────────────           ────────
POST /tool ──────────────→  HTTP server (:PORT)
                                │
                                ├─ ipcMain.handle() ────────→  toolRouter
                                │                               ↓
                                ←── IPC 返回 ─────────────────  store action
←── HTTP 200 ──────────────  构造响应
```

Tool Router 是一份纯函数映射表，不感知 transport。**注意：`generate_storyboard` 不在 Spellpaw 的 toolRouter 中——它是 Pandaria 侧的 tool，利用 Pandaria 已有的 Tokencamp 集成。Spellpaw 只需通过 `get_subtree` + `update_node` 提供场景上下文和结果回写。** 详见 ADR-010。

```typescript
const toolRouter = {
  add_node: (p) => projectStore.getState().addTreeNode(...),
  update_node: (p) => projectStore.getState().updateTreeNode(...),
  delete_node: (p) => projectStore.getState().deleteTreeNode(...),
  move_node: (p) => projectStore.getState().moveTreeNode(...),
  get_tree: () => formatTree(projectStore.getState().getCurrentTree()),
  get_subtree: (p) => formatSubtree(projectStore.getState().getNodeById(p.nodeId)),
  apply_template: (p) => { /* load + batch add */ },
};
```

**请求-响应匹配：** 使用 `tool_call_id`（由 Pandaria 生成）作为配对 key。Server 维护 `Map<callId, pendingPromise>`，30 秒超时返回 504。

## Consequences

**Pros:**
- Tool Router 代码在开发期和生产期间完全复用
- WebSocket 回退可用于本地调试，无需启动 Pandaria
- Electron IPC 不暴露网络端口，更安全
- Vite 插件方案让 Tool Server 与 Vite dev server 同进程启动

**Cons:**
- 需要维护两套 transport 适配层（WebSocket handler + IPC handler）
- WebSocket 断连时 tool 调用会失败（30s 超时）

**Mitigations:**
- transport 适配层是薄封装（~50 行），不包含业务逻辑
- WebSocket 指数退避重连（最多 3 次）
- 断连期间未发送的消息不入队列——LLM 下一次 turn 会重试 tool 调用

---

*See also: ADR-001 (Pandaria), ADR-010 (Storyboard Generation)*
