/**
 * Intent Router — decide whether a user message should map to a canvas toolkit action.
 *
 * This is the "brain" of the client guardrail: it gives us a high-confidence
 * signal that we can use to (1) send a tool_choice hint to the LLM and
 * (2) execute the action ourselves if the LLM still replies with text only.
 */
import type { CanvasNode } from '@drama/types';
import type { MediaType } from './canvasToolkit/types';

export type ToolkitActionType =
  | 'generate_asset'
  | 'generate_variants'
  | 'edit_asset'
  | 'apply_style'
  | 'batch_apply_style';

export interface CanvasIntent {
  type: ToolkitActionType | 'unknown';
  mediaType?: MediaType;
  /** Payload ready to pass to the matching toolkit action. */
  payload: Record<string, unknown>;
}

export interface IntentContext {
  /** Currently selected tree node id, if any. */
  selectedNodeId?: string | null;
  /** Currently selected canvas card, if any. */
  selectedCard?: CanvasNode | null;
}

export interface IntentResult {
  intent: CanvasIntent;
  confidence: 'high' | 'medium' | 'low';
}

const GENERATE_IMAGE_KEYWORDS = [
  '生成', '生个', '画', '画一张', '来一张', '参考图', '分镜', '分镜图', '概念图',
  '氛围图', '场景图', '图片', '图', 'storyboard', 'concept art', 'reference image',
  'generate image', 'draw', 'create an image', 'make a picture',
];

const GENERATE_VIDEO_KEYWORDS = [
  '视频', '短片', '生成视频', 'video', 'clip', 'seedance', 'seedance video',
  'generate video', 'make a video', 'create a video',
];

const VARIANT_KEYWORDS = [
  '变体', ' variant', 'variants', '版本', '版', '几个版本', '几个选项', '多来几张', '再来几张',
  '多几个', '再来几个', '更多版本', 'more options', 'a few versions',
];

const EDIT_KEYWORDS = [
  '编辑', '改一下', '修改', '调整', '改成', 'edit', 'change', 'modify', 'alter',
  'make it', 'turn it', 'adjust',
];

const STYLE_KEYWORDS = [
  '风格', '统一风格', '风格化', '批量风格', 'style', 'styled', 'apply style',
  'in the style of', 'watercolor', 'cyberpunk', 'noir', 'oil painting',
];

function normalize(text: string): string {
  return text.toLowerCase().replace(/[，。？！,.?!]/g, ' ').trim();
}

function containsAny(text: string, keywords: string[]): boolean {
  return keywords.some((k) => text.includes(k.toLowerCase()));
}

function extractCount(text: string): number | undefined {
  const match = text.match(/(\d+)\s*(张|个|份|版|条|张图|张图片|个版本|versions?|options?|images?|videos?)/);
  if (match) return Math.max(1, Math.min(8, parseInt(match[1], 10)));
  if (/几张|几个|几个版本|多来几张|多几个|a few|several|some/.test(text)) return 3;
  return undefined;
}

function inferMediaType(text: string): MediaType {
  if (containsAny(text, GENERATE_VIDEO_KEYWORDS)) return 'video';
  return 'image';
}

function isGenerateRequest(text: string): boolean {
  return (
    containsAny(text, GENERATE_IMAGE_KEYWORDS) ||
    containsAny(text, GENERATE_VIDEO_KEYWORDS)
  );
}

function isStyleRequest(text: string): boolean {
  return containsAny(text, STYLE_KEYWORDS);
}

function isEditRequest(text: string): boolean {
  return containsAny(text, EDIT_KEYWORDS);
}

function isVariantRequest(text: string): boolean {
  return containsAny(text, VARIANT_KEYWORDS);
}

/**
 * Try to extract a free-form prompt from the message by stripping obvious verbs.
 */
const GENERIC_PROMPT_LEFTOVERS = new Set([
  '图', '图片', '一张图', '一张图片', '图图', '视频', '一个视频', '段视频', '短片',
  'image', 'picture', 'video', 'clip',
]);

function extractPrompt(text: string): string | undefined {
  const stripped = text
    .replace(/(给我|帮我|请|可以|能不能|能不能帮|请帮|生成|生个|画|画一张|来一张|做|做一个|创建|给我画|生成一张|给我生成)/g, '')
    .replace(/(编辑|修改|改一下|调整|改成|edit|change|modify|alter)/g, '')
    .replace(/(风格化|统一风格|批量风格|应用风格|apply style|in the style of)/g, '')
    .replace(/(变体|variant|versions|options)/g, '')
    .trim();
  if (stripped.length <= 2) return undefined;
  if (GENERIC_PROMPT_LEFTOVERS.has(stripped)) return undefined;
  return stripped;
}

export function detectIntent(message: string, context: IntentContext): IntentResult {
  const text = normalize(message);

  // 1. Style batch / single style migration
  if (isStyleRequest(text)) {
    if (context.selectedNodeId) {
      const stylePrompt = extractPrompt(text);
      if (stylePrompt) {
        return {
          intent: {
            type: 'batch_apply_style',
            payload: {
              action: 'batch_apply_style',
              nodeIds: [context.selectedNodeId],
              stylePrompt,
            },
          },
          confidence: 'high',
        };
      }
    }

    if (context.selectedCard) {
      const stylePrompt = extractPrompt(text);
      if (stylePrompt) {
        return {
          intent: {
            type: 'apply_style',
            payload: {
              action: 'apply_style',
              sourceCardId: context.selectedCard.id,
              stylePrompt,
            },
          },
          confidence: 'high',
        };
      }
    }

    return {
      intent: { type: 'unknown', payload: {} },
      confidence: 'medium',
    };
  }

  // 2. Edit existing image card
  if (isEditRequest(text) && context.selectedCard) {
    const prompt = extractPrompt(text) ?? message;
    return {
      intent: {
        type: 'edit_asset',
        payload: {
          action: 'edit_asset',
          cardId: context.selectedCard.id,
          prompt,
        },
      },
      confidence: 'high',
    };
  }

  // 3. Variants of an existing card or node
  if (isVariantRequest(text)) {
    if (context.selectedCard) {
      return {
        intent: {
          type: 'generate_variants',
          mediaType: inferMediaType(text),
          payload: {
            action: 'generate_variants',
            cardId: context.selectedCard.id,
            mediaType: inferMediaType(text),
            count: extractCount(text),
          },
        },
        confidence: 'high',
      };
    }

    if (context.selectedNodeId) {
      return {
        intent: {
          type: 'generate_variants',
          mediaType: inferMediaType(text),
          payload: {
            action: 'generate_variants',
            nodeId: context.selectedNodeId,
            mediaType: inferMediaType(text),
            count: extractCount(text),
          },
        },
        confidence: 'high',
      };
    }

    return {
      intent: { type: 'unknown', payload: {} },
      confidence: 'medium',
    };
  }

  // 4. Generate new asset for a selected node/card or from a free-form prompt.
  // A selected canvas card can act as context: if it links to a tree node,
  // use that node; otherwise fall back to the prompt.
  if (isGenerateRequest(text)) {
    const mediaType = inferMediaType(text);
    const prompt = extractPrompt(text);
    const linkedNodeId = context.selectedCard?.data.linkedTreeNodeId;
    const targetNodeId = context.selectedNodeId ?? linkedNodeId;
    const hasTarget = Boolean(targetNodeId);
    const confidence: 'high' | 'medium' = hasTarget || Boolean(prompt) ? 'high' : 'medium';
    return {
      intent: {
        type: 'generate_asset',
        mediaType,
        payload: {
          action: 'generate_asset',
          ...(targetNodeId ? { nodeId: targetNodeId } : {}),
          mediaType,
          prompt,
          count: extractCount(text),
        },
      },
      confidence,
    };
  }

  return {
    intent: { type: 'unknown', payload: {} },
    confidence: 'low',
  };
}

/**
 * Convert a detected intent to an LLM tool_choice value.
 */
export function intentToToolChoice(
  intent: CanvasIntent
): { type: 'function'; function: { name: string } } | undefined {
  if (intent.type === 'unknown') return undefined;
  const toolMap: Record<ToolkitActionType, string> = {
    generate_asset: 'spellpaw_generate_asset',
    generate_variants: 'spellpaw_generate_variants',
    edit_asset: 'spellpaw_edit_asset',
    apply_style: 'spellpaw_apply_style',
    batch_apply_style: 'spellpaw_batch_apply_style',
  };
  return { type: 'function', function: { name: toolMap[intent.type] } };
}
