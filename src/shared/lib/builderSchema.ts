/**
 * Builder Renderer validation schemas
 * 
 * Defines the structure LLM must output for spellpaw_build_ui.
 * Uses manual validation (dependency-free) — can be upgraded to Zod later.
 */

export type BuilderComponent = 'character_map';

export interface BuilderConfig {
  version: 1;
  target: 'canvas' | 'detail_panel' | 'tree_placeholder';
  component: BuilderComponent;
  data: Record<string, unknown>;
  editableFields?: string[];
}

const VALID_TARGETS = ['canvas', 'detail_panel', 'tree_placeholder'];
const VALID_COMPONENTS = ['character_map'];

export interface ValidationResult {
  valid: boolean;
  layer: number; // ① = schema, ② = metadata
  error?: string;
  suggestion?: string;
}

/**
 * ① Structured output — validate top-level config shape.
 */
export function validateBuilderConfig(input: unknown): ValidationResult {
  if (typeof input !== 'object' || input === null) {
    return { valid: false, layer: 1, error: '无法理解，请重新描述' };
  }

  const obj = input as Record<string, unknown>;

  if (obj.version !== 1) {
    return { valid: false, layer: 1, error: `不支持的版本: ${obj.version}` };
  }

  if (typeof obj.target !== 'string' || !VALID_TARGETS.includes(obj.target)) {
    return {
      valid: false,
      layer: 1,
      error: `无效的渲染目标: ${obj.target}`,
      suggestion: `可用目标: ${VALID_TARGETS.join(', ')}`,
    };
  }

  if (typeof obj.component !== 'string' || !VALID_COMPONENTS.includes(obj.component)) {
    return {
      valid: false,
      layer: 1,
      error: `不支持的组件类型: ${obj.component}`,
      suggestion: `可用组件: ${VALID_COMPONENTS.join(', ')}`,
    };
  }

  if (typeof obj.data !== 'object' || obj.data === null) {
    return { valid: false, layer: 1, error: '缺少 data 字段' };
  }

  return { valid: true, layer: 1 };
}

/**
 * ② Metadata validation — check referenced entities exist.
 * Each component defines its own metadata schema.
 */
export function validateMetadata(
  config: BuilderConfig,
  _context: { treeNodes?: string[] },
): ValidationResult {
  switch (config.component) {
    case 'character_map': {
      const data = config.data as { nodes?: Array<{ id?: string; linkedTreeNodeId?: string }> };
      if (!data.nodes || !Array.isArray(data.nodes)) {
        return { valid: false, layer: 2, error: '缺少 nodes 数组' };
      }
      // Validate linkedTreeNodeId references against actual tree
      for (const node of data.nodes) {
        if (node.linkedTreeNodeId && !_context.treeNodes?.includes(node.linkedTreeNodeId)) {
          return {
            valid: false,
            layer: 2,
            error: `节点引用不存在: ${node.linkedTreeNodeId}`,
            suggestion: `可用节点: ${_context.treeNodes?.join(', ') ?? '无'}`,
          };
        }
      }
      return { valid: true, layer: 2 };
    }
    default:
      return { valid: true, layer: 2 };
  }
}

/**
 * Parse and validate raw LLM output through both layers.
 */
export function parseAndValidate(
  raw: unknown,
  context?: { treeNodes?: string[] },
): { config: BuilderConfig } | { error: ValidationResult } {
  const schema = validateBuilderConfig(raw);
  if (!schema.valid) return { error: schema };

  const config = raw as BuilderConfig;
  const metadata = validateMetadata(config, context ?? {});
  if (!metadata.valid) return { error: metadata };

  return { config };
}
