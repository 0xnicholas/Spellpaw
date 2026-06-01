# ADR-005: 异步协作模型（Git-like Push/Pull）

- **Status:** Accepted
- **Date:** 2026-05-29

## Context

Phase 3 引入团队协作。可选方案：

1. **CRDT 实时协作** — 类似 Figma/Notion 的实时多人编辑
2. **OT（Operational Transform）** — Google Docs 的方案
3. **Git-like 异步 push/pull** — 手动推送/拉取，冲突时展示 diff
4. **锁定编辑** — 同一时间只有一人可编辑

## Decision

**采用 Git-like 异步 push/pull 模型。不做 CRDT 实时协作。**

**协作流程：**
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
  │                                收到冲突提示                       收到 diff
```

**冲突检测粒度：节点级**（非字符级）。每个节点有 `version` 字段：

```typescript
interface ConflictResult {
  nodeId: string;
  nodePath: string;                 // "第一幕 > 场景 1-1"
  localVersion: Partial<TreeNode>;
  remoteVersion: Partial<TreeNode>;
  conflictingFields: string[];      // ["title", "description", "duration"]
}
```

**冲突解决：** 用户通过 diff UI 手动选择 local/remote/逐字段合并。

## Decision Rationale

短剧团队通常 2-5 人，工作流天然串行：
- 编剧写完一幕 → 导演 review → 摄影指导加镜头

异步 push/pull 覆盖 90% 的协作需求。CRDT 为 10% 的并发编辑场景增加数周复杂度，ROI 不成立。

## Consequences

**Pros:**
- 实现简单——节点级 version 比对 + diff 展示
- 用户完全控制冲突解决，无自动合并意外
- 离线编辑后批量 push，符合影视制作工作习惯
- 与本地优先存储策略一致

**Cons:**
- 不支持同时编辑同一节点
- 冲突频繁时需要用户手动解决
- 不如实时协作流畅

**Mitigations:**
- diff UI 已实现（`ConflictResolverModal.tsx`），支持逐字段选择
- 若实际使用中冲突率 > 10% 的 push，在 Phase 4 升级为 CRDT
- 4 级树结构天然减少冲突——编剧改镜头、导演改场景，鲜少改同一节点

---

*See also: ADR-003 (Local-First Storage)*
