# ADR-001: Pandaria 作为 Agent 后端

- **Status:** Accepted
- **Date:** 2026-05-28

## Context

Spellpaw 需要 AI Agent 能力（对话式创作、项目结构操作）。可选方案：

1. **自建 Agent loop** — 在浏览器端直接调用 LLM API，自行管理 tool calling 循环
2. **Pandaria** — 团队已有的 Rust Agent 后端，提供 REST session API + SSE 事件流 + HttpProxyTool 机制
3. **第三方 Agent 平台** — 如 Topview API、LangChain Cloud 等

## Decision

**使用 Pandaria（`../pandaria`）作为唯一的 Agent 后端。** Spellpaw 不直接调用任何 LLM API，也不集成第三方 Agent 平台。

架构关系：

```
Spellpaw (Browser)          Pandaria (Rust)           Tokencamp (网关)
───────────────────         ──────────────            ────────────────
Chat UI                     /api/v1/sessions          LLM 路由
  ↕ SSE events               /messages                模型选择
Tool Server                 HttpProxyTool             计费/配额
  ↕ WebSocket               → POST /tool              结果返回
Zustand stores
```

Spellpaw 的职责：
- **创建 session** — 注入 system_prompt + 注册 tools
- **发送消息** — POST /messages
- **消费 SSE** — text_delta / tool_call_started / tool_call_done / turn_end
- **运行 Tool Server** — 响应 Pandaria 的 HttpProxyTool 调用，执行 store actions

Pandaria 的职责：
- Agent loop（LLM 调用 → tool 决策 → 结果反馈）
- 通过 Tokencamp 网关路由 LLM 请求
- 管理 session 上下文、token 用量、turn 边界

Tokencamp 的职责：
- 统一 LLM/模型网关（路由、计费、配额）
- 视频/图像生成模型接入

**视频/图像生成：** `generate_storyboard` 是 Pandaria 侧的 tool——它利用 Pandaria 已有的 Tokencamp 连接进行模型调用。Spellpaw 不需要在自己的 toolRouter 中实现它。Pandaria 通过 `get_subtree` 获取场景上下文来拼接 prompt，生成完成后通过 `update_node` 将图片 URL 回写到场景 metadata。详见 ADR-010。

## Consequences

**Pros:**
- 不维护 Agent loop 逻辑，复杂度在 Pandaria 侧
- Tokencamp 统一处理多模型接入，Spellpaw 零成本切换模型
- HttpProxyTool 机制让 Pandaria 直接调用浏览器端 store，无额外代理层
- 团队内项目联动，可共享 context/token 优化策略

**Cons:**
- Spellpaw 强依赖 Pandaria 和 Tokencamp 可用性
- session API 版本升级需要 Spellpaw 同步适配
- 离线场景下 Agent 能力受限（Pandaria 需网络）

**Mitigations:**
- Pandaria API 版本固定，Spellpaw 启动时做兼容性检查（`GET /healthz` + 版本比对）
- Phase 1 本地编辑功能不依赖 Agent，离线可独立使用
- Tool Server 与 Pandaria 之间网络断连不影响本地编辑，仅 Agent 对话不可用

---

*See also: ADR-002 (Tool Server), ADR-004 (Context Management), ADR-010 (Storyboard Generation), ADR-011 (nip.io SSRF)*
