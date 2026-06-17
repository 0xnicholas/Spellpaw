/**
 * LLM Provider abstraction — decouple Copilot from any single backend.
 *
 * Spellpaw Server exposes the session/messages/events API consumed by the front-end.
 */

import type { LLMProviderType } from '@shared/lib/providers';

export interface ToolConfig {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  endpoint: string;
}

export interface Session {
  id: string;
  title: string;
  model: string;
}

export type SSEEvent = Record<string, unknown>;

export type ToolChoice =
  | 'auto'
  | 'required'
  | { type: 'function'; function: { name: string } };

export interface SSESubscription {
  close: () => void;
}

export interface LLMProvider {
  /** Create a new chat/session with system prompt and available tools. */
  createSession(
    title: string,
    systemPrompt: string,
    tools?: ToolConfig[],
    toolChoice?: ToolChoice
  ): Promise<Session>;

  /** Send a user message to an existing session. */
  sendMessage(sessionId: string, content: string, toolChoice?: ToolChoice): Promise<void>;

  /** Subscribe to server-sent events for a session. */
  subscribeSSE(sessionId: string, onEvent: (event: SSEEvent) => void): SSESubscription;
}

// Supported back-end models. The front-end currently routes all of them through the
// Spellpaw Server proxy (`spellpawProvider`).
export type LLMProviderName = 'spellpaw' | LLMProviderType;
