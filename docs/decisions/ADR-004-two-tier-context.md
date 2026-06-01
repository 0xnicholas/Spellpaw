# ADR-004: 两层上下文管理

- **Status:** Accepted
- **Date:** 2026-05-29

## Context

Agent 对话需要项目结构作为上下文。全量塞入 system_prompt 会导致：

- 大型项目 token 膨胀（3幕5场景12镜头 ≈ 3000+ token）
- 每次树结构变更需重建 session（或 PATCH 大量文本）
- LLM 被大量信息干扰，输出质量下降

可选方案：
1. **全量注入** — 每次 turn 将完整项目树写入 system_prompt
2. **仅大纲注入 + tool 按需获取** — 两层上下文策略
3. **RAG 检索** — 每次 turn 根据用户问题检索相关节点

## Decision

**两层上下文策略：system_prompt 仅含大纲 + tool 按需获取镜头细节。**

```
                    system_prompt               tool 调用
                    ─────────────               ────────
第一层（大纲层）     项目摘要 + 幕+场景结构       LLM 不需要查
                    每次 turn 前自动 PATCH       ~500 token

第二层（细节层）     不在 system_prompt 里        LLM 需要时调用
                    无需维护                     get_subtree(sceneId)
```

**system_prompt 模板（精简版）：**
```
你是 Spellpaw 的 AI 创作助手。

## 项目摘要
- 名称：《密室来电》· 悬疑 · 60秒 · 竖屏
- 结构：3幕 / 5场景 / 12镜头

## 项目结构（仅幕+场景，不含镜头）
项目：密室来电
├── 第一幕：困局 [in_progress]
│   ├── 场景 1-1：醒来 [draft] · 30s · 📍咖啡厅
│   └── 场景 1-2：发现纸条 [draft] · 30s
├── 第二幕：博弈 [draft]
│   └── ...

要查看场景的镜头详情，使用 get_subtree(sceneId)
```

**Turn 前自动 PATCH：** 每次用户发送消息前，若项目树有变更，自动 `PATCH /sessions/{id}` 更新 system_prompt 的大纲部分。同一 turn 内不更新（不影响正确性——当前 turn 的 tool 返回结果 LLM 已持有）。

## Consequences

**Pros:**
- system_prompt 固定 ~500 token，不受项目规模影响
- 每次 turn 自动更新大纲，LLM 始终看到最新结构
- 镜头细节按需获取，token 效率提升 40-60%
- LLM 先了解全局再深入细节，输出更结构化

**Cons:**
- 增加 tool 调用次数（LLM 需主动查询镜头细节）
- system_prompt 更新有延迟（同一 turn 内不反映最新编辑）
- 需要维护 `buildOutlinePrompt()` 逻辑

**Mitigations:**
- system_prompt 规则引导 LLM「先看全局，再查细节」
- 单 turn 内用户不太可能同时对话和编辑树——延迟不显著
- `get_subtree` 返回缩进文本（非 JSON），比 JSON 格式节省 40-60% token

---

*See also: ADR-001 (Pandaria), ADR-002 (Tool Server)*
