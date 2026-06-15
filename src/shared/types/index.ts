export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

// ── Chat ──────────────────────────────────────────────

export type MessageRole = 'user' | 'agent' | 'system';
export type MessageType = 'text' | 'code' | 'suggestion' | 'action';

export interface ChatAction {
  id: string;
  label: string;
  type: 'insert_scene' | 'modify_script' | 'generate_storyboard' | 'custom';
  payload?: Record<string, unknown>;
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  type: MessageType;
  timestamp: string;
  context?: {
    nodeId?: string;
    nodeType?: string;
  };
  actions?: ChatAction[];
}
