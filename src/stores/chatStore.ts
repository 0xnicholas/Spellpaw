import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ChatMessage } from '@/types';
import { mockChatMessages } from '@/data/mockChatData';
import { generateId } from '@/lib/utils';

interface ChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  inputValue: string;

  sendMessage: (content: string) => void;
  setInputValue: (value: string) => void;
  appendMessage: (message: ChatMessage) => void;
  clearMessages: () => void;
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
    }),
    {
      name: 'spellpaw_chat',
      partialize: (state) => ({ messages: state.messages }),
    }
  )
);
