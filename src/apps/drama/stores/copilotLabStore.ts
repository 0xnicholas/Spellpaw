/**
 * Copilot Lab store — inspector 用的只读快照 + 调试写入器。
 *
 * 与 chatStore 完全分离：lab 模式下用户与 LLM 的对话消息依然走
 * chatStore（仅 projectId 换成 "__lab__"），但 system prompt、注入的
 * tools、SSE 原始事件流都落在这里给 Inspector 面板订阅。
 *
 * 设计上故意做成 "lab 内自洽"：离开 /copilot-lab 路由后这些状态没人
 * 清，但下次进入会被新的 session 覆盖——保留可追溯性。
 */
import { create } from 'zustand';
import type { SSEEvent, ToolConfig } from '@drama/lib/llm/types';

export const LAB_PROJECT_ID = '__copilot_lab__';
const MAX_EVENTS = 200;

export interface LabSessionMeta {
  /** Session 创建时使用的 system prompt */
  systemPrompt: string;
  /** 注册给 LLM 的工具列表（lab 模式下为空数组） */
  tools: ToolConfig[];
  /** 会话 ID */
  sessionId: string;
  /** 创建时间戳 */
  createdAt: string;
}

interface CopilotLabState {
  /** 当前活跃 session 的元信息；null 表示还没有创建 session */
  sessionMeta: LabSessionMeta | null;
  /** SSE 原始事件环形缓冲，最多保留 MAX_EVENTS 条 */
  events: SSEEvent[];
  /** Inspector 设定的下一个 session 要用的 system prompt 覆盖；
   *  useLabCopilotSSE 会在收到信号后重建 session 并消费这个值。 */
  pendingPromptOverride: string | null;
  /** 清空事件流（点 Clear Session 时调用） */
  clearEvents: () => void;
  /** 重置整个 lab 状态（重新进入页面 / 切 session） */
  reset: () => void;
  /** SSE 事件回调：追加一条，自动裁剪 */
  pushEvent: (event: SSEEvent) => void;
  /** 设置 session 元信息 */
  setSessionMeta: (meta: LabSessionMeta) => void;
  /** 设置 prompt 覆盖；useLabCopilotSSE 会 watch 并重建 session */
  setPendingPromptOverride: (prompt: string | null) => void;
}

export const useCopilotLabStore = create<CopilotLabState>((set) => ({
  sessionMeta: null,
  events: [],
  pendingPromptOverride: null,
  clearEvents: () => set({ events: [] }),
  reset: () => set({ sessionMeta: null, events: [], pendingPromptOverride: null }),
  pushEvent: (event) =>
    set((state) => {
      // 用 [...] 保留引用，裁掉最旧的
      const next = state.events.length >= MAX_EVENTS
        ? [...state.events.slice(state.events.length - MAX_EVENTS + 1), event]
        : [...state.events, event];
      return { events: next };
    }),
  setSessionMeta: (meta) => set({ sessionMeta: meta }),
  setPendingPromptOverride: (prompt) => set({ pendingPromptOverride: prompt }),
}));

/** 给 Inspector / 测试用的纯函数版 push（不依赖 store 实例） */
export function appendEventCapped(events: SSEEvent[], event: SSEEvent, max = MAX_EVENTS): SSEEvent[] {
  return events.length >= max
    ? [...events.slice(events.length - max + 1), event]
    : [...events, event];
}