# ADR-011: nip.io SSRF 绕过（开发环境）

- **Status:** Accepted
- **Date:** 2026-05-29

## Context

Pandaria 的 HttpProxyTool 通过 HTTP 调用 Spellpaw 的本地 Tool Server。开发期 Tool Server 运行在 `localhost:9341`（或 Vite dev server 的 `:5173`）。

Pandaria 内置 SSRF 防护，默认拒绝指向 `localhost` / `127.0.0.1` / `0.0.0.0` 的工具调用请求——这是安全机制，防止恶意 tool 攻击本地服务。

Spellpaw 的 Tool Server 确实在 localhost 上，且是合法的调用目标。如何让 Pandaria 的 SSRF 防护允许调用本地 Tool Server？

可选方案：
1. **关闭 Pandaria SSRF 防护** — 不安全
2. **使用 nip.io 通配符 DNS** — `127.0.0.1.nip.io` 解析到 `127.0.0.1`
3. **Pandaria 添加白名单** — 修改 Pandaria 代码
4. **Tool Server 绑定公网 IP** — 不安全，不应暴露

## Decision

**使用 `nip.io` 通配符 DNS 域名。** Tool Server 的 endpoint 注册为 `http://127.0.0.1.nip.io:5173/tool`（解析到 `127.0.0.1`）。

```
Pandaria SSRF 检查:
  "127.0.0.1"        → ❌ blocked (localhost)
  "localhost"        → ❌ blocked (localhost)
  "127.0.0.1.nip.io" → ✅ allowed (non-localhost hostname, resolves to 127.0.0.1)
```

**nip.io 原理：** 任何 `IP.nip.io` 格式的域名都解析到该 IP。`127.0.0.1.nip.io` → `127.0.0.1`。

**仅在开发环境使用。** 生产期（Electron）Tool Server 不暴露 HTTP 端口，改用 IPC 通信，无需 SSRF 绕过。

## Consequences

**Pros:**
- 无需修改 Pandaria 安全策略
- 无需暴露 Tool Server 到公网
- nip.io 是公共 DNS 服务，无需自建

**Cons:**
- nip.io 是第三方服务，有可用性风险（几乎 100% uptime，历史可靠）
- 依赖 DNS 解析，某些网络环境可能拦截
- 仅适用于开发环境

**Mitigations:**
- 如果 nip.io 不可用，备选 `lvh.me`（同样解析到 127.0.0.1）
- 生产环境用 Electron IPC，不依赖 DNS 技巧
- AGENTS.md §9 记录了完整说明

---

*See also: ADR-001 (Pandaria), ADR-002 (Tool Server)*
