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
