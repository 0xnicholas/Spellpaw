// Tree
export interface TreeNode {
  id: string;
  type: 'project' | 'act' | 'scene' | 'shot';
  title: string;
  status: 'draft' | 'in_progress' | 'review' | 'done';
  children?: TreeNode[];
  expanded?: boolean;
  metadata?: {
    duration?: number;
    description?: string;
    location?: string;
    timeOfDay?: 'morning' | 'day' | 'evening' | 'night';
    shotType?: 'wide' | 'medium' | 'close-up' | 'insert' | 'pov';
    cameraMovement?: 'static' | 'pan' | 'tilt' | 'dolly' | 'handheld';
    dialogue?: string;
    notes?: string;
    visualStyle?: string;
    createdAt: string;
    updatedAt: string;
    lockedStylePrompt?: string | null;
    lockedStyleNodeId?: string | null;
  };
}

// Asset
export type AssetType = 'video' | 'image' | 'audio' | 'script' | 'subtitle' | 'other';
export type AssetTab = 'materials' | 'outputs';

export interface AssetItem {
  id: string;
  name: string;
  type: AssetType;
  size: number;
  url?: string;
  thumbnail?: string;
  status: 'uploading' | 'ready' | 'processing' | 'error';
  createdAt: string;
  tags?: string[];
}

// Chat — re-exported from shared
import type { MessageRole, MessageType, ChatAction, ChatMessage } from '@shared/types';
export type { MessageRole, MessageType, ChatAction, ChatMessage };

// Task

export interface AgentTask {
  id: string;
  title: string;
  status: 'in_progress' | 'pending_review' | 'completed';
  messages: ChatMessage[];
  projectId: string | null;
  createdAt: string;
  updatedAt: string;
  sessionId?: string;
}

// Canvas
export type CanvasNodeType = 'script' | 'art' | 'character' | 'deliverable' | 'sceneCard';

export type DeliverableType = 'image' | 'video' | 'audio';

export interface CanvasNodeData extends Record<string, unknown> {
  title: string;
  description?: string;
  status?: 'draft' | 'in_progress' | 'review' | 'done';
  thumbnail?: string;
  generatedPrompt?: string;
  sourceProvider?: string;
  tags?: string[];
  linkedTreeNodeId?: string;
  deliverableType?: DeliverableType;
  duration?: number;
  fileSize?: number;
  resolution?: string;
}

export interface CanvasNode {
  id: string;
  type: CanvasNodeType;
  position: { x: number; y: number };
  data: CanvasNodeData;
}

export interface CanvasEdge {
  id: string;
  source: string;
  target: string;
  type?: 'default' | 'smoothstep';
  label?: string;
  animated?: boolean;
}

// Project
export interface Project {
  id: string;
  title: string;
  description: string;
  updatedAt: string;
  sceneCount: number;
  duration: number;
  coverColor: string;
  version?: number;
}

export type { User } from '@/shared/types';

// === Phase 2: Tool Router ===

/** Tool Server / Spellpaw Server 发来的请求参数 */
export interface ToolParams {
  action: string;
  [key: string]: unknown;
}

/** toolRouter 每个 action 的函数签名 */
export type ToolHandler = (params: ToolParams) => Promise<string>;

/** toolRouter 映射表 */
export type ToolRouter = Record<string, ToolHandler>;

// === Phase 2: Narrative Templates ===

export type TemplateCategory = 'suspense' | 'romance' | 'comedy' | 'drama' | 'action' | 'documentary' | 'custom';
export type TemplatePlatform = 'portrait' | 'landscape' | 'square';
export type TemplatePacing = 'fast' | 'moderate' | 'slow';

export interface TemplateScene {
  title: string;
  description: string;
  suggestedShotTypes?: string[];
  suggestedCameraMovement?: string;
  metadata?: Partial<TreeNode['metadata']>;
  children?: TemplateScene[];
}

export interface TemplateAct {
  title: string;
  description: string;
  scenes: TemplateScene[];
}

export interface NarrativeTemplate {
  id: string;
  name: string;
  category: TemplateCategory;
  description: string;
  thumbnail?: string;
  targetDuration: number;          // 预估时长（秒）
  targetPlatform: TemplatePlatform;
  structure: {
    acts: TemplateAct[];
  };
  stylePresets: {
    colorPalette: string[];
    pacing: TemplatePacing;
    visualStyle: string;
  };
  tags: string[];
  author?: string;
  downloads?: number;
  version: number;
}
