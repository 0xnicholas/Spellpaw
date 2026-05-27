import type { ChatMessage } from '@/types';

export const mockChatMessages: ChatMessage[] = [
  {
    id: 'msg_1',
    role: 'agent',
    content: 'Welcome to Spellpaw! I\'ve loaded the project structure for "Urban Serendipity". The project currently has 3 acts, 8 scenes, and 18 shots. How can I help you?',
    type: 'text',
    timestamp: '2026-05-19T09:00:00Z',
  },
  {
    id: 'msg_2',
    role: 'user',
    content: 'Check if Act 1\'s structure makes sense',
    type: 'text',
    timestamp: '2026-05-19T09:01:00Z',
  },
  {
    id: 'msg_3',
    role: 'agent',
    content: 'Here is the current structure of Act 1 "The Encounter":\n\n1. Cafe Encounter (3 shots) — ~45 seconds\n2. Street Encounter (2 shots) — ~30 seconds\n\n**Analysis:**\n- The opening establishing shot works well to quickly set the scene\n- Consider adding a "missed connection" interlude to raise tension\n- Act 1 total duration of 75 seconds fits the short-video pacing',
    type: 'text',
    timestamp: '2026-05-19T09:01:30Z',
    actions: [
      { id: 'act_1', label: 'Add "Missed Connection" scene', type: 'insert_scene' },
      { id: 'act_2', label: 'Optimize shot distribution', type: 'custom' },
    ],
  },
];
