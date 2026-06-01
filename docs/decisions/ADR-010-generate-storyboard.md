# ADR-010: 视频/图像生成流程

- **Status:** Accepted
- **Date:** 2026-05-31

## Context

用户需要为场景生成 AI 分镜参考图（storyboard）。可选方案：

1. **Spellpaw 直连 Tokencamp** — Tool Server 直接调用 Tokencamp API 进行视频/图像生成
2. **通过 Pandaria tool 生成** — Pandaria 已有 Tokencamp 连接，Spellpaw 通过 `generate_storyboard` tool 触发
3. **Spellpaw 自己接第三方图像 API** — 如 DALL·E、Stability

## Decision

**Spellpaw 不直连任何模型 API。图像/视频生成全部走 Pandaria → Tokencamp 网关。**

架构：

```
用户请求分镜生成
      │
      ▼
Pandaria Agent loop
      │
      ├─ 调用 tool: spellpaw_get_subtree(sceneId)
      │    → Spellpaw Tool Server 返回场景描述、元数据
      │
      ├─ Pandaria 内部拼装 prompt（场景标题 + 描述 + 风格参数）
      │
      ├─ Pandaria → Tokencamp → 图像/视频模型
      │    ← 返回生成结果 URL
      │
      └─ SSE text_delta: "已生成分镜图: https://..."
            → Spellpaw Chat UI 展示
            → 画布卡片自动关联缩略图
```

**Spellpaw 侧的 `generate_storyboard` tool：**

这个 tool **不在 Spellpaw 的 toolRouter 中**。它是 Pandaria 侧的 tool（利用 Pandaria 已有的 Tokencamp 集成）。Spellpaw 只需提供：

- `get_subtree(sceneId)` — Pandaria 调用以获取场景上下文，拼接 prompt
- `update_node` — 生成完成后，Pandaria 通过此 tool 将图片 URL 写入场景 metadata

Tool Router 不需要 `generate_storyboard` action。

## Consequences

**Pros:**
- 模型选择、计费、配额由 Tokencamp 统一管理，Spellpaw 零成本
- Pandaria 已有 Tokencamp 集成，无需重复接入
- 新增模型只需 Tokencamp 配置，Spellpaw 无感知
- Prompt 拼装在 Pandaria 侧，可利用 session 上下文做智能增强

**Cons:**
- 图像生成延迟取决于 Pandaria→Tokencamp→模型链路的每一跳
- 批量生成时需要 Pandaria 管理并发

**Mitigations:**
- 异步 task 模式（taskId + SSE 进度事件），UI 无需阻塞等待
- 批量生成时按顺序排队，避免 Tokencamp 并发限流

---

*See also: ADR-001 (Pandaria), ADR-002 (Tool Server), ADR-004 (Context Management)*
