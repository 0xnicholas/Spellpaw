# ADR-003: 本地优先存储

- **Status:** Accepted
- **Date:** 2026-05-28

## Context

Spellpaw 需要持久化项目数据（树结构、画布布局、对话历史、资产列表）。可选方案：

1. **localStorage** — 简单，但有 5-10MB 限制
2. **IndexedDB** — 更大的存储容量，支持结构化查询
3. **云端优先（Supabase / PostgreSQL）** — 天然支持协作和多端同步
4. **混合：IndexedDB 本地 + 云端可选同步**

## Decision

**IndexedDB 作为主存储，JSON 导入导出作为可迁移格式。** 云端同步在 Phase 3 作为可选功能引入。

```typescript
// src/shared/lib/idbStorage.ts
import { createIDBStorage } from '@/shared/lib/idbStorage';

// 每个 Zustand store 使用 IndexedDB 持久化
persist(store, {
  name: 'spellpaw_canvas',
  storage: createIDBStorage('canvasStore'),
  // ...
});
```

**本地优先原则：**
- 本地数据永远是可用的主版本——云端数据是副本
- 新建项目默认为本地项目，用户主动选择是否同步到云端
- 无网络时所有功能（除 Agent 对话和云端协作）正常可用
- JSON 文件导入/导出作为通用迁移格式，不锁定平台

**数据流：**
```
编辑操作 → Zustand store → IndexedDB（自动持久化）
                              ↓
                          [可选] 云端同步（手动 push/pull）
```

## Consequences

**Pros:**
- 完全离线可用——Spellpaw 核心编辑功能不需要网络
- 数据主权归用户——JSON 文件可跨平台迁移
- IndexedDB 容量远超 localStorage，支持大项目
- 云端同步是可选功能，不强制用户登录

**Cons:**
- IndexedDB API 异步，比 localStorage 复杂
- 需要数据迁移策略（localStorage → IndexedDB）
- 浏览器清除数据会丢失未同步的项目（需提醒用户导出）
- 无法实现实时多端同步（需云端方案配合）

**Mitigations:**
- `createIDBStorage` 封装了 IndexedDB 复杂性，Zustand persist 中间件兼容
- 迁移脚本 `migrateToIDB.ts` 自动将旧 localStorage 数据迁移至 IndexedDB
- 未同步数据在 UI 中标记（SyncStatusIndicator），引导用户导出或推送
- Phase 3 云端同步为 pull-based，用户主动触发

---

*See also: ADR-005 (Async Collaboration), ADR-007 (State Management), ADR-012 (Template Format)*
