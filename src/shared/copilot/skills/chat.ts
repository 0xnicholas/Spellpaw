/**
 * Pure utility helpers for Copilot skill integration.
 *
 * These have NO app-specific imports (no stores, no types). They only
 * produce generic ChatMessage scaffolds and return booleans.
 *
 * App-specific logic (tryRunSkill, executeSkill, formatSkillInvocation)
 * lives in each app's skills/chat.ts wrapper.
 */
import { generateId } from '@/shared/lib/utils';
import type { ChatMessage } from '@/shared/types';

/** Returns true if the input starts with a slash command. */
export function isSlashCommand(text: string): boolean {
  return text.trim().startsWith('/');
}

/** Returns the final assistant message for a completed skill run. */
export function buildSkillResultMessage(
  text: string,
  status: 'done' | 'error' = 'done',
  timestamp?: string,
): ChatMessage {
  return {
    id: generateId('msg_'),
    role: 'agent',
    content: text,
    type: 'action',
    timestamp: timestamp ?? new Date().toISOString(),
    status,
  };
}

/** Returns the pending (running) assistant message shown while a skill runs. */
export function buildSkillPendingMessage(
  _skillId: string,
  text: string,
): ChatMessage {
  return {
    id: generateId('msg_'),
    role: 'agent',
    content: text,
    type: 'action',
    timestamp: new Date().toISOString(),
    status: 'pending',
  };
}
