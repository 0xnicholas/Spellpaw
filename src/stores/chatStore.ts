import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ChatMessage } from '@/types';
import { mockChatMessages } from '@/data/mockChatData';
import { generateId } from '@/lib/utils';
import { createIDBStorage } from '@/lib/idbStorage';

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
    '生成下一幕': '我为「第一幕：邂逅」草拟了 2 个新场景：\n\n1. **场景 1-3：电话乌龙** — 男主拨错号码，引发一连串尴尬又甜蜜的互动\n2. **场景 1-4：好友助攻** — 一位共同好友暗中牵线，促成一次偶遇\n\n需要我展开其中某个场景生成分镜吗？',
    '分析剧本结构': '这是第一幕「邂逅」的当前结构：\n\n1. 咖啡馆邂逅（3 镜头）— ~45 秒\n2. 街头邂逅（2 镜头）— ~30 秒\n\n**分析：**\n- 开场建立镜头很好地快速设定了场景\n- 建议增加「错过」插曲来提升张力\n- 第一幕总时长 75 秒，符合短视频节奏',
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
