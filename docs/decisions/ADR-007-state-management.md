# ADR-007: 状态管理选型（Zustand + Immer）

- **Status:** Accepted
- **Date:** 2026-05-27

## Context

Spellpaw 需要管理多个全局状态域：
- 项目结构树（projectStore）
- 画布节点/边（canvasStore）
- Agent 对话（chatStore）
- 详情面板（detailStore）
- 自定义模板（customTemplateStore）
- 认证（authStore）
- 主题（themeStore）
- 同步状态（syncStore）

可选方案：
1. **Redux Toolkit** — 成熟的 Flux 实现
2. **Zustand** — 轻量级，基于 hook 的 API
3. **Jotai / Recoil** — 原子化状态
4. **React Context + useReducer** — 无外部依赖

## Decision

**使用 Zustand 5 + Immer 中间件。**

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useProjectStore = create<ProjectState>()(
  persist(
    (set, get) => ({
      projects: {},
      currentProjectId: null,

      addTreeNode: (parentId, node) =>
        set((state) => {
          // Immer 自动处理不可变更新
          const parent = state.projects[state.currentProjectId].tree...;
          parent.children.push(node);
        }),

      getCurrentTree: () => {
        const { projects, currentProjectId } = get();
        return currentProjectId ? projects[currentProjectId]?.tree : null;
      },
    }),
    {
      name: 'spellpaw_projects',
      storage: createIDBStorage('projectStore'),
    }
  )
);
```

**设计原则：**
- **按领域拆分 store** — project / canvas / chat / detail / auth / theme 各自独立
- **store 间通过 get() 读取** — 如 canvasStore 通过 `useProjectStore.getState().currentProjectId` 获取当前项目 ID
- **actions 封装业务逻辑** — 组件不直接操作 state，通过 store actions
- **persist 中间件 + IndexedDB** — 自动持久化

## Consequences

**Pros:**
- API 简洁——`create` + `set/get` 三函数，无 boilerplate
- Immer 内置支持，`set()` 内可直接 mutate draft
- get() 为非 hook 访问，Tool Router 等纯函数可调用
- 天然支持 React 18+ concurrent features
- Bundle 体积小（~2KB gzipped）

**Cons:**
- Store 间耦合通过 get() 隐式依赖，不如 Redux 的显式 combineReducers
- 缺少 Redux DevTools 的时间旅行调试（可用 zustand devtools 中间件补充）
- 大型 state 结构缺少规范化指导

**Mitigations:**
- Store 间依赖通过清晰的命名约定和接口文档管理
- 关键 actions 有单元测试覆盖
- Immer 冻结对象在开发模式下捕获意外 mutation

---

*See also: ADR-003 (Local-First Storage)*
