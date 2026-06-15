/**
 * Shared Pandaria tool configs — single source of truth.
 * Used by usePandariaSSE (ChatPanel) and useTaskSSE (TaskChatPanel).
 */
import { config } from '@/shared/config';

const TOOL_ENDPOINT = config.toolServerEndpoint;

export const SPELLPAW_TOOL_CONFIGS = [
  {
    name: 'spellpaw_add_node',
    description: 'Add a node (act/scene/shot) to the project tree. parentId required, type/title required.',
    parameters: {
      type: 'object',
      properties: {
        parentId: { type: 'string' },
        type: { type: 'string', enum: ['act', 'scene', 'shot'] },
        title: { type: 'string' },
        description: { type: 'string' },
        duration: { type: 'number' },
      },
      required: ['parentId', 'type', 'title'],
    },
    endpoint: TOOL_ENDPOINT,
  },
  {
    name: 'spellpaw_update_node',
    description: "Update a node's title or metadata.",
    parameters: {
      type: 'object',
      properties: {
        nodeId: { type: 'string' },
        changes: { type: 'object' },
      },
      required: ['nodeId', 'changes'],
    },
    endpoint: TOOL_ENDPOINT,
  },
  {
    name: 'spellpaw_delete_node',
    description: 'Delete a node. CAREFUL: irreversible. Ask user first.',
    parameters: {
      type: 'object',
      properties: { nodeId: { type: 'string' } },
      required: ['nodeId'],
    },
    endpoint: TOOL_ENDPOINT,
  },
  {
    name: 'spellpaw_get_tree',
    description: 'Get the full project tree structure.',
    parameters: { type: 'object', properties: {} },
    endpoint: TOOL_ENDPOINT,
  },
  {
    name: 'spellpaw_get_subtree',
    description: 'Get a subtree starting from a specific node.',
    parameters: {
      type: 'object',
      properties: { nodeId: { type: 'string' } },
      required: ['nodeId'],
    },
    endpoint: TOOL_ENDPOINT,
  },
  {
    name: 'spellpaw_apply_template',
    description: 'Apply a narrative template to the current project. Creates acts, scenes, and shots from the template structure.',
    parameters: {
      type: 'object',
      properties: {
        templateId: { type: 'string' },
        parentId: { type: 'string' },
      },
      required: ['templateId'],
    },
    endpoint: TOOL_ENDPOINT,
  },
  {
    name: 'spellpaw_generate_storyboard',
    description: 'Generate a storyboard reference image for a scene or shot. Returns an image URL that is attached to the linked canvas card.',
    parameters: {
      type: 'object',
      properties: {
        nodeId: { type: 'string' },
        prompt: { type: 'string' },
      },
      required: ['nodeId'],
    },
    endpoint: TOOL_ENDPOINT,
  },
  {
    name: 'spellpaw_analyze_structure',
    description: 'Analyze the project structure health: check act/scene counts, duration distribution, and suggest completions. Returns a diagnostic report.',
    parameters: { type: 'object', properties: {} },
    endpoint: TOOL_ENDPOINT,
  },
  {
    name: 'spellpaw_get_pacing_report',
    description: 'Get a detailed pacing report with duration statistics, coefficient of variation, and specific rhythm issues. Use when user asks about pacing or timing.',
    parameters: { type: 'object', properties: {} },
    endpoint: TOOL_ENDPOINT,
  },
  {
    name: 'spellpaw_match_template',
    description: 'Match the current project against built-in narrative templates based on title, description, and scene keywords. Returns the best match with similarity score.',
    parameters: { type: 'object', properties: {} },
    endpoint: TOOL_ENDPOINT,
  },
  {
    name: 'spellpaw_optimize_pacing',
    description: 'Auto-adjust scene durations based on pacing analysis. dryRun=true (default) returns a preview plan; dryRun=false executes the changes.',
    parameters: {
      type: 'object',
      properties: {
        dryRun: { type: 'boolean', description: 'If true, returns preview only. If false, executes changes.' },
      },
    },
    endpoint: TOOL_ENDPOINT,
  },
  {
    name: 'spellpaw_build_ui',
    description: 'Build interactive UI components (character maps, dashboards, storyboard grids). Use when user asks for visual elements like character relationship diagrams.',
    parameters: {
      type: 'object',
      properties: {
        component: { type: 'string', enum: ['character_map'] },
        data: { type: 'object' },
        target: { type: 'string', enum: ['canvas', 'detail_panel', 'tree_placeholder'] },
      },
      required: ['component', 'data'],
    },
    endpoint: TOOL_ENDPOINT,
  },
] as const;
