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
    createdAt: string;
    updatedAt: string;
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

// Chat
export type MessageRole = 'user' | 'agent' | 'system';
export type MessageType = 'text' | 'code' | 'suggestion' | 'action';

export interface ChatAction {
  id: string;
  label: string;
  type: 'insert_scene' | 'modify_script' | 'generate_storyboard' | 'custom';
  payload?: Record<string, unknown>;
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  type: MessageType;
  timestamp: string;
  context?: {
    nodeId?: string;
    nodeType?: string;
  };
  actions?: ChatAction[];
}

// Canvas
export type CanvasNodeType = 'sceneCard' | 'assetCard' | 'noteCard';

export interface CanvasNodeData extends Record<string, unknown> {
  title: string;
  description?: string;
  status?: 'draft' | 'in_progress' | 'review' | 'done';
  thumbnail?: string;
  tags?: string[];
  color?: string;
  linkedTreeNodeId?: string;
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
}

// User
export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

// === Phase 2: Tool Router ===

/** Pandaria HttpProxyTool 发来的请求参数 */
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
