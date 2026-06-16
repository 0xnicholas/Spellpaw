# ADR-010: 视频/图像生成流程

- **Status:** Accepted
- **Date:** 2026-05-31

## Context

用户需要为场景生成 AI 分镜参考图（storyboard）。可选方案：

1. **Spellpaw 直连 Tokencamp** — Tool Server 直接调用 Tokencamp API 进行视频/图像生成
2. **通过外部 Agent 后端生成** — 由外部系统拼装 prompt 并调用图像模型
3. **Spellpaw 自己接第三方图像 API** — 如 DALL·E、Stability

## Decision

**`generate_storyboard` 由 Spellpaw 自己的 `toolRouter` 实现，直接调用第三方图像 API（当前为 DALL·E 3）。**

架构：

```
用户请求分镜生成
      │
      ▼
Copilot Agent loop
      │
      ├─ 调用 tool: spellpaw_generate_storyboard(sceneId)
      │    → Spellpaw Tool Server 路由到浏览器
      │    → toolRouter.generate_storyboard 读取场景节点
      │    → 调用 imageGen.generateImage()（DALL·E 3）
      │    ← 返回图片 URL
      │
      ├─ 在画布创建 art 卡片并关联 linkedTreeNodeId
      │
      └─ SSE text_delta: "已为「场景名」生成参考图: https://..."
            → Chat UI 展示
            → 画布卡片自动关联缩略图
```

**Spellpaw 侧的 `generate_storyboard` tool：**

- 位于 `src/apps/drama/stores/toolRouter.ts`
- 使用 `src/apps/drama/lib/imageGen.ts` 生成图片
- 生成后创建 `art` 类型画布卡片，设置 `thumbnail` 和 `linkedTreeNodeId`

## Consequences

**Pros:**
- 不依赖外部 Agent 后端，部署简单
- Prompt 拼装可在 Spellpaw 侧根据场景元数据定制
- 生成结果直接落到画布，用户体验闭环

**Cons:**
- 需要自行管理图像 API key 和配额
- 当前只接入 DALL·E 3，切换模型需要修改 `imageGen.ts`

**Mitigations:**
- 异步 task 模式（taskId + SSE 进度事件），UI 无需阻塞等待
- 批量生成时按顺序排队，避免 API 并发限流

---

*See also: ADR-004 (Context Management)*
