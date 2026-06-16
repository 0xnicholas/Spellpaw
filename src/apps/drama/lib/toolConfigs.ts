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
    name: 'spellpaw_generate_asset',
    description: 'Generate an image or video asset for a tree node and add it to the canvas as a card. Use when the user asks to generate a storyboard, reference image, scene visual, or video for a scene/shot. Valid providers: openai, doubao.',
    parameters: {
      type: 'object',
      properties: {
        nodeId: { type: 'string', description: 'ID of the scene or shot node to generate for' },
        mediaType: { type: 'string', enum: ['image', 'video'], description: 'Type of media to generate' },
        prompt: { type: 'string', description: 'Optional generation prompt; if omitted, built from node metadata' },
        provider: { type: 'string', enum: ['openai', 'doubao'], description: 'Optional provider id' },
        count: { type: 'number', description: 'Number of variants to generate (default 1)' },
        cardType: { type: 'string', enum: ['art', 'sceneCard', 'deliverable'], description: 'Canvas card type to create (default art for image, deliverable for video)' },
      },
      required: ['nodeId', 'mediaType'],
    },
    endpoint: TOOL_ENDPOINT,
  },
  {
    name: 'spellpaw_generate_variants',
    description: 'Generate multiple variant images of an existing scene or canvas card. Useful when the user wants "more options", "a few versions", or "variations of this shot".',
    parameters: {
      type: 'object',
      properties: {
        nodeId: { type: 'string', description: 'ID of the scene/shot node to generate variants for (alternative to cardId)' },
        cardId: { type: 'string', description: 'ID of an existing canvas card to generate variants from (alternative to nodeId)' },
        mediaType: { type: 'string', enum: ['image', 'video'], description: 'Type of media to generate' },
        prompt: { type: 'string', description: 'Optional override prompt; if omitted, inherits from card or node metadata' },
        provider: { type: 'string', enum: ['openai', 'doubao'], description: 'Optional provider id' },
        count: { type: 'number', description: 'Number of variants to generate (default 1)' },
      },
    },
    endpoint: TOOL_ENDPOINT,
  },
  {
    name: 'spellpaw_edit_asset',
    description: 'Edit an existing image canvas card based on a text instruction (e.g. "make it rain", "change the color grading to noir"). If no dedicated image-editing provider is available, falls back to generating a new edited-version art card.',
    parameters: {
      type: 'object',
      properties: {
        cardId: { type: 'string', description: 'ID of the canvas card to edit' },
        prompt: { type: 'string', description: 'Text instruction describing the desired edit' },
        provider: { type: 'string', enum: ['openai', 'doubao'], description: 'Optional provider id' },
      },
      required: ['cardId', 'prompt'],
    },
    endpoint: TOOL_ENDPOINT,
  },
  {
    name: 'spellpaw_apply_style',
    description: 'Create a new styled version of an existing image card. Provide either a stylePrompt (e.g. "watercolor", "cyberpunk neon") or a styleCardId referencing an existing style reference card.',
    parameters: {
      type: 'object',
      properties: {
        sourceCardId: { type: 'string', description: 'ID of the source image card' },
        stylePrompt: { type: 'string', description: 'Text description of the desired style' },
        styleCardId: { type: 'string', description: 'ID of an existing style reference card (alternative to stylePrompt)' },
        provider: { type: 'string', enum: ['openai', 'doubao'], description: 'Optional provider id' },
      },
      required: ['sourceCardId'],
    },
    endpoint: TOOL_ENDPOINT,
  },
  {
    name: 'spellpaw_batch_apply_style',
    description: 'Batch apply a visual style to multiple scene/shot nodes. Creates a styled art card for each selected node. Use when the user wants "unify the style of selected scenes" or "apply this style to all selected shots".',
    parameters: {
      type: 'object',
      properties: {
        nodeIds: {
          type: 'array',
          items: { type: 'string' },
          description: 'IDs of scene/shot nodes to style',
        },
        stylePrompt: { type: 'string', description: 'Text description of the desired visual style' },
        provider: { type: 'string', enum: ['openai', 'doubao'], description: 'Optional provider id' },
      },
      required: ['nodeIds', 'stylePrompt'],
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
    description: 'Match the current project against built-in narrative templates based on title, description, and scene keywords. Returns the best match with similarity score and templateId. After calling this, continue by calling spellpaw_apply_template with the returned templateId.',
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
    name: 'spellpaw_kickstart_project',
    description: 'Create a complete narrative structure (acts, scenes, shots) from a theme and generate canvas cards for every scene. Use this whenever the user asks to create a project structure and generate scene cards in one go.',
    parameters: {
      type: 'object',
      properties: {
        theme: { type: 'string', description: 'Theme or title of the project, e.g. "密室逃脱"' },
        genre: { type: 'string', description: 'Optional genre hint, e.g. "悬疑" or "romance"' },
        targetDuration: { type: 'number', description: 'Optional total target duration in seconds' },
        cardType: { type: 'string', enum: ['sceneCard', 'script'], description: 'Type of canvas card to create for each scene. Defaults to sceneCard.' },
      },
      required: ['theme'],
    },
    endpoint: TOOL_ENDPOINT,
  },
  {
    name: 'spellpaw_add_canvas_card',
    description: 'Add a card to the flow canvas. Use when the user asks to create a visual card for a scene, character, art reference, or deliverable, or when generating scene cards after creating project structure. For scene cards, use cardType=sceneCard and set linkedTreeNodeId to the corresponding scene node id.',
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
