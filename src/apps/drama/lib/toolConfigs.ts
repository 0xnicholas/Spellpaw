/**
 * Shared Copilot tool configs — single source of truth.
 * Used by useCopilotSSE (ChatPanel).
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
    name: 'spellpaw_generate_asset',
    description: 'Generate an image or video asset for a tree node and add it to the canvas as a card. Use when the user asks to generate a storyboard, reference image, scene visual, or video for a scene/shot. Valid providers: openai.',
    parameters: {
      type: 'object',
      properties: {
        nodeId: { type: 'string', description: 'ID of the scene or shot node to generate for' },
        mediaType: { type: 'string', enum: ['image', 'video'], description: 'Type of media to generate' },
        prompt: { type: 'string', description: 'Optional generation prompt; if omitted, built from node metadata' },
        provider: { type: 'string', enum: ['openai'], description: 'Optional provider id' },
        count: { type: 'number', description: 'Number of variants to generate (default 1)' },
        cardType: { type: 'string', enum: ['art', 'sceneCard', 'deliverable'], description: 'Canvas card type to create (default art for image, deliverable for video)' },
      },
      required: ['nodeId', 'mediaType'],
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
  {
    name: 'spellpaw_add_canvas_card',
    description: 'Add a card to the flow canvas. Use when the user asks to create a visual card for a scene, character, art reference, or deliverable. cardType must be one of script/sceneCard/art/character/deliverable.',
    parameters: {
      type: 'object',
      properties: {
        cardType: {
          type: 'string',
          enum: ['script', 'sceneCard', 'art', 'character', 'deliverable'],
          description: 'Canvas card type',
        },
        data: {
          type: 'object',
          description: 'Card content. Must include title. Optional: description, status, tags, linkedTreeNodeId, duration, dialogue, deliverableType, thumbnail, generatedPrompt, etc.',
        },
        position: {
          type: 'object',
          properties: {
            x: { type: 'number' },
            y: { type: 'number' },
          },
          description: 'Optional fixed position. If omitted, auto-layout is applied.',
        },
      },
      required: ['cardType', 'data'],
    },
    endpoint: TOOL_ENDPOINT,
  },
  {
    name: 'spellpaw_update_canvas_card',
    description: 'Update an existing canvas card by cardId. Can change title, description, status, thumbnail, generatedPrompt, tags, or linkedTreeNodeId.',
    parameters: {
      type: 'object',
      properties: {
        cardId: { type: 'string', description: 'ID of the canvas card to update' },
        data: {
          type: 'object',
          description: 'Fields to update. Same optional fields as add_canvas_card.',
        },
      },
      required: ['cardId', 'data'],
    },
    endpoint: TOOL_ENDPOINT,
  },
  {
    name: 'spellpaw_delete_canvas_card',
    description: 'Delete a canvas card by cardId. CAREFUL: irreversible. Ask user first if not explicitly requested.',
    parameters: {
      type: 'object',
      properties: {
        cardId: { type: 'string', description: 'ID of the canvas card to delete' },
      },
      required: ['cardId'],
    },
    endpoint: TOOL_ENDPOINT,
  },
];
