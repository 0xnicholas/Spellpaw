/**
 * User-friendly label for LLM tool names shown in the chat panel.
 *
 * The LLM sees `spellpaw_apply_style` but the user should see something like
 * "Applying style..." so they understand what's happening without having to
 * memorize the internal API.
 *
 * Map covers the 23 tools from toolConfigs.ts + the dynamic
 * `spellpaw_skill_*` family. Skill names get stripped of the prefix and
 * title-cased.
 */

const STATIC_LABELS: Record<string, string> = {
  // Cards domain
  spellpaw_get_canvas: 'Reading canvas…',
  spellpaw_add_card: 'Creating card…',
  spellpaw_update_card: 'Updating card…',
  spellpaw_delete_card: 'Deleting card…',
  spellpaw_clear_canvas: 'Clearing canvas…',

  // Tree domain
  spellpaw_add_node: 'Adding node…',
  spellpaw_update_node: 'Updating node…',
  spellpaw_delete_node: 'Deleting node…',
  spellpaw_move_node: 'Reordering…',
  spellpaw_apply_template: 'Applying template…',

  // Generation domain
  spellpaw_generate_asset: 'Generating asset…',
  spellpaw_generate_variants: 'Generating variants…',
  spellpaw_edit_asset: 'Editing asset…',
  spellpaw_apply_style: 'Applying style…',
  spellpaw_batch_apply_style: 'Applying style (batch)…',
  spellpaw_generate_storyboard: 'Generating storyboard…',

  // Analysis domain
  spellpaw_analyze_structure: 'Analyzing structure…',
  spellpaw_get_pacing_report: 'Analyzing pacing…',
  spellpaw_match_template: 'Matching template…',
  spellpaw_optimize_pacing: 'Optimizing pacing…',
  spellpaw_kickstart_project: 'Bootstrapping project…',
};

/**
 * Strip the `spellpaw_` prefix and title-case. Used for skill names.
 * Examples:
 *   spellpaw_skill_character-profile  → Character Profile
 *   spellpaw_skill_brainstorm-variants → Brainstorm Variants
 */
function fromSkillName(rawName: string): string | null {
  if (!rawName.startsWith('spellpaw_skill_')) return null;
  const slug = rawName.replace('spellpaw_skill_', '');
  return slug
    .split(/[-_]/)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ');
}

/**
 * Map a tool name (as seen in SSE events) to a human-readable label.
 * Falls back to a de-prefixed title-case version for unknown tools.
 */
export function toolDisplayName(toolName: string): string {
  if (STATIC_LABELS[toolName]) return STATIC_LABELS[toolName];
  const skillLabel = fromSkillName(toolName);
  if (skillLabel) return `Running ${skillLabel}…`;
  // Fallback: strip prefix + title-case the segments
  return toolName
    .replace(/^spellpaw_/, '')
    .split('_')
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(' ');
}