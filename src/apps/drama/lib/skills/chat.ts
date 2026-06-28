/**
 * Skill integration for the Copilot chat — re-exports from the canonical
 * skills module (src/apps/drama/skills/chat.ts).
 *
 * Phase 2: skills are LLM-driven. Slash commands are augmented via
 * `augmentUserMessage` and flow through the regular sendMessage → SSE
 * pipeline. This file exists for backward compat with importers that still
 * reference `@drama/lib/skills/chat`.
 */
export {
  isSlashCommand,
  tryRunSkill,
  formatSkillInvocation,
  augmentUserMessage,
  buildSkillResultMessage,
  buildSkillPendingMessage,
} from '@drama/skills/chat';

// Re-export executeSkill signature so existing callers compile;
// Phase 1 redirects it to the LLM flow.
export { executeSkill } from '@drama/skills/chat';
