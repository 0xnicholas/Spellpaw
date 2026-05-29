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
    'Generate next act': 'I\'ve drafted 2 new scenes for "Act 1: The Encounter":\n\n1. **Scene 1-3: Phone Mix-up** — The male lead dials the wrong number, sparking a chain of awkward yet sweet exchanges\n2. **Scene 1-4: Friend\'s Nudge** — A mutual friend secretly plays matchmaker, engineering a chance meeting\n\nWould you like me to expand one of these scenes into detailed storyboards?',
    'Analyze script structure': 'Here is the current structure of Act 1 "The Encounter":\n\n1. Cafe Encounter (3 shots) — ~45 seconds\n2. Street Encounter (2 shots) — ~30 seconds\n\n**Analysis:**\n- The opening establishing shot works well to quickly set the scene\n- Consider adding a "missed connection" interlude to raise tension\n- Act 1 total duration of 75 seconds fits the short-video pacing',
  };

  const content = replies[userContent] ?? 'Got it! Let me work on that for you. I\'m analyzing the project structure and generating the best approach...';

  return {
    id: generateId('msg_'),
    role: 'agent',
    content,
    type: 'text',
    timestamp: new Date().toISOString(),
    actions: [
      { id: generateId('act_'), label: 'Generate storyboard', type: 'generate_storyboard' },
      { id: generateId('act_'), label: 'Write dialogue', type: 'modify_script' },
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
