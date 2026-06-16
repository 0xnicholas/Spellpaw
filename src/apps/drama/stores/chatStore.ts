import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ChatMessage } from '@drama/types';
import { mockChatMessages } from '@drama/data/mockChatData';
import { generateId } from '@/shared/lib/utils';
import { createIDBStorage } from '@/shared/lib/idbStorage';

interface InFlightToolCall {
  callId: string;
  name: string;
}

interface ChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  inputValue: string;

  // Phase 2: SSE streaming
  streamingMessage: string | null;        // partial assistant text being built
  streamingMessageId: string | null;
  toolCalls: InFlightToolCall[];         // in-flight tool calls

  // Phase 3: node-scoped chat filtering
  filterNodeId: string | null;

  sendMessage: (content: string) => void;
  setInputValue: (value: string) => void;
  appendMessage: (message: ChatMessage) => void;
  clearMessages: () => void;
  setFilterNodeId: (nodeId: string | null) => void;

  // Phase 2: SSE actions
  startStreaming: (messageId: string) => void;
  appendDelta: (delta: string) => void;
  startToolCall: (callId: string, name: string) => void;
  endToolCall: (callId: string) => void;
  endStreaming: (stopReason?: string) => void;
}

function mockAgentReply(userContent: string): ChatMessage {
  const replies: Record<string, string> = {
    '🚀 Kickstart：快速生成初稿': '好的，我来为你设计故事框架。首先从三幕结构开始构建：\n\n**第一幕：开端** — 建立角色和世界\n**第二幕：冲突** — 剧情推进和角色成长\n**第三幕：结局** — 高潮与解决\n\n需要我套用叙事模板快速生成初稿吗？',
    '✨ Enhance：展开下一幕': '我来分析当前结构，为下一幕展开分镜…',
    '✨ Enhance：优化节奏': '正在分析全剧节奏分布，检查时长均衡性…',
    '✨ Enhance：生成视觉风格': '正在为你的故事匹配合适的视觉风格参考…',
  };

  const content = replies[userContent] ?? '收到！我来为你处理。正在分析项目结构并制定最佳方案…';

  return {
    id: generateId('msg_'),
    role: 'agent',
    content,
    type: 'text',
    timestamp: new Date().toISOString(),
    actions: [
      { id: generateId('act_'), label: '生成分镜', type: 'generate_storyboard' },
      { id: generateId('act_'), label: '撰写对白', type: 'modify_script' },
    ],
  };
}

export const useChatStore = create<ChatState>()(
  persist(
    (set) => ({
      messages: mockChatMessages,
      isLoading: false,
      inputValue: '',
      streamingMessage: null,
      streamingMessageId: null,
      toolCalls: [],
      filterNodeId: null,

      sendMessage: (content) => {
        const userMsg: ChatMessage = {
          id: generateId('msg_'),
          role: 'user',
          content,
          type: 'text',
          timestamp: new Date().toISOString(),
        };
        set((state) => ({ messages: [...state.messages, userMsg], isLoading: true }));

        setTimeout(() => {
          const agentMsg = mockAgentReply(content);
          set((state) => ({
            messages: [...state.messages, agentMsg],
            isLoading: false,
          }));
        }, 1200);
      },

      setInputValue: (value) => set({ inputValue: value }),

      appendMessage: (message) =>
        set((state) => ({ messages: [...state.messages, message] })),

      clearMessages: () => set({ messages: [] }),
      setFilterNodeId: (nodeId) => set({ filterNodeId: nodeId }),

      // Phase 2: SSE streaming actions
      startStreaming: (messageId) =>
        set({ streamingMessageId: messageId, streamingMessage: '', isLoading: true }),

      appendDelta: (delta) =>
        set((state) => ({
          streamingMessage: (state.streamingMessage ?? '') + delta,
        })),

      startToolCall: (callId, name) =>
        set((state) => ({
          toolCalls: [...state.toolCalls, { callId, name }],
        })),

      endToolCall: (callId) =>
        set((state) => ({
          toolCalls: state.toolCalls.filter((t) => t.callId !== callId),
        })),

      endStreaming: (_stopReason) => {
        const state = useChatStore.getState();
        if (state.streamingMessage && state.streamingMessageId) {
          const finalMsg: ChatMessage = {
            id: state.streamingMessageId,
            role: 'agent',
            content: state.streamingMessage,
            type: 'text',
            timestamp: new Date().toISOString(),
          };
          set((s) => ({
            messages: [...s.messages, finalMsg],
            streamingMessage: null,
            streamingMessageId: null,
            isLoading: false,
          }));
        } else {
          set({ streamingMessage: null, streamingMessageId: null, isLoading: false });
        }
      },
    }),
    {
      name: 'spellpaw_chat',
      storage: createIDBStorage<ChatState>('chatStore'),
      partialize: (state) => ({ messages: state.messages }) as unknown as ChatState,
    }
  )
);
