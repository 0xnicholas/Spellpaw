// === Canvas Metadata ===

/** Canvas card metadata — common metadata for CanvasNodeData */
export interface CardMetadata {
  type?: 'act' | 'scene' | 'shot';
  duration?: number;
  location?: string;
  timeOfDay?: string;
  shotType?: string;
  cameraMovement?: string;
  dialogue?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Tree removed — Phase 4 canvas-first architecture deletes TreeNode entirely

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

// Canvas — no-tree architecture (Phase 3+)
export type CanvasNodeType =
  | 'storyline'    // 故事线卡片（替代 project/act/scene/shot 树）
  | 'moodboard'    // 情绪板卡片
  | 'videoClip'    // 视频片段卡片
  | 'asset'        // 素材资源卡片
  | 'task'         // 任务/批注卡片
  | 'art'          // 保留：AI 生成图（情绪板子项）
  | 'character'    // 保留：角色卡（素材资源）
  // Legacy — still valid, migrated on read
  | 'script'       // → storyline children
  | 'deliverable'  // → videoClip | asset
  | 'sceneCard';   // → storyline

export type DeliverableType = 'image' | 'video' | 'audio';

/** Card child item — inline elements within a card (no separate React Flow node) */
export interface CardChild {
  id: string;
  type: 'shot' | 'dialogue' | 'image' | 'color' | 'reference' | 'variant';
  title: string;
  data: Record<string, unknown>;
}

export interface CanvasNodeData {
  title: string;
  description?: string;
  status?: 'draft' | 'in_progress' | 'review' | 'done';
  thumbnail?: string;
  generatedPrompt?: string;
  sourceProvider?: string;
  tags?: string[];
  duration?: number;
  fileSize?: number;
  resolution?: string;

  // Canonical metadata (replaces scattered flat fields)
  metadata?: CardMetadata;

  // Relations
  linkedCardIds?: string[];      // 关联的其他卡片

  // Storyline card fields
  sceneCount?: number;
  shotCount?: number;
  location?: string;
  timeOfDay?: string;

  // Moodboard card fields
  images?: string[];
  colors?: string[];
  styleRef?: string;
  musicRef?: string;

  // VideoClip card fields
  source?: 'ai' | 'upload';
  variants?: Array<{ id: string; url: string; prompt?: string }>;

  // Asset card fields
  assetType?: 'product' | 'logo' | 'subtitle' | 'audio' | 'image' | 'video' | 'other';

  // Legacy
  deliverableType?: 'image' | 'video' | 'audio';

  // Canvas Node extras (React Flow passes these at runtime)
  _displayNumber?: string;
  _highlighted?: boolean;
  _onAIAction?: (prompt: string) => void;

  // Legacy fields from old card types (character, script, sceneCard)
  role?: string;
  age?: number;
  occupation?: string;
  personality?: string;
  appearance?: string;
  avatar?: string;
  name?: string;
  dialogue?: string;
  shotType?: string;
  cameraMovement?: string;
  notes?: string;
  prompt?: string;

  // Task card fields
  taskType?: 'instruction' | 'feedback' | 'diff';
  targetCardId?: string;
  taskStatus?: 'pending' | 'done';

  // Card children (inline items, not separate React Flow nodes)
  children?: CardChild[];

  // Generation lifecycle (Q4 follow-up — see ADR-014):
  //   'idle'         → no generation in flight (default for legacy cards)
  //   'generating'   → provider task in flight (image/video generate, edit, style)
  //   'failed'       → provider returned failure or polling exhausted retries
  // The card UI shows a retry affordance when status === 'failed'.
  generationStatus?: 'idle' | 'generating' | 'failed';

  // 占位标记（v2+）：true 时 GenericCardNode 显示 "Output will appear here..."
  isPlaceholder?: boolean;

  // Ref 文件引用（v2+）：用户通过 CardCopilotPopover 上传的本地预览
  fileRef?: {
    name: string;
    size: number;
    kind: 'image' | 'video' | 'audio';
    dataUrl: string;
  };

  // Allow arbitrary extensions
  [key: string]: unknown;
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
