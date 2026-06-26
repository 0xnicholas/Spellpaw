/**
 * BuzzyCard — 共享卡片包装器
 *
 * 职责：
 *  - 极简深色边框 + 选中色（按 type 区分蓝/黄/紫）
 *  - 单行 header：lucide 图标 + 中文名
 *  - 右上角状态点（替代原 Badge，支持脉动）
 *  - children 渲染具体类型 body
 *
 * 视觉参考：screenshots/buzzy-canvas.png
 * 设计文档：docs/superpowers/specs/2026-06-26-buzzy-canvas-style-design.md
 */

import type { ReactNode } from 'react';
import {
  FileText,
  Image as ImageIcon,
  User,
  Video,
  Film,
  Paperclip,
  BookOpen,
  Palette,
  CheckSquare,
  Square,
  type LucideIcon,
} from 'lucide-react';
import type { CanvasNodeType, CanvasNodeData } from '@drama/types';

/* ── 类型 → 图标/中文/选中色 ── */

type SelectionColor = 'blue' | 'yellow' | 'accent';

interface CardTypeConfig {
  icon: LucideIcon;
  label: string;
  selectedColor: SelectionColor;
}

const CARD_TYPE_CONFIG: Record<CanvasNodeType, CardTypeConfig> = {
  script:       { icon: FileText,     label: '剧本',   selectedColor: 'accent' },
  art:          { icon: ImageIcon,    label: '美术',   selectedColor: 'blue' },
  character:    { icon: User,         label: '角色',   selectedColor: 'accent' },
  deliverable:  { icon: Video,        label: '视频',   selectedColor: 'yellow' },
  videoClip:    { icon: Video,        label: '视频',   selectedColor: 'yellow' },
  sceneCard:    { icon: Film,         label: '分镜',   selectedColor: 'blue' },
  asset:        { icon: Paperclip,    label: '资产',   selectedColor: 'accent' },
  storyline:    { icon: BookOpen,     label: '故事线', selectedColor: 'accent' },
  moodboard:    { icon: Palette,      label: '情绪板', selectedColor: 'accent' },
  task:         { icon: CheckSquare,  label: '任务',   selectedColor: 'accent' },
};

const FALLBACK_CONFIG: CardTypeConfig = {
  icon: Square,
  label: '卡片',
  selectedColor: 'accent',
};

export function getCardTypeConfig(type: CanvasNodeType | string): CardTypeConfig {
  return CARD_TYPE_CONFIG[type as CanvasNodeType] ?? FALLBACK_CONFIG;
}

export function getCardLabel(type: CanvasNodeType | string): string {
  return getCardTypeConfig(type).label;
}

/* ── 选中色 CSS 变量 ── */

const SELECTION_BORDER: Record<SelectionColor, string> = {
  blue: 'oklch(70% 0.15 230)',     // #5B9EFF
  yellow: 'oklch(85% 0.18 95)',   // #FACC15
  accent: 'var(--color-accent-500)',
};

/* ── 状态点 ── */

const STATUS_DOT_COLOR: Record<string, string> = {
  draft: 'oklch(50% 0.01 250)',
  in_progress: 'oklch(65% 0.15 230)',
  review: 'oklch(80% 0.15 85)',
  done: 'oklch(65% 0.15 145)',
};

function StatusDot({ status }: { status?: string }) {
  if (!status) return null;
  const color = STATUS_DOT_COLOR[status] ?? STATUS_DOT_COLOR.draft;
  const isInProgress = status === 'in_progress';
  return (
    <span
      className={isInProgress ? 'animate-status-pulse' : ''}
      style={{
        display: 'inline-block',
        width: 6,
        height: 6,
        borderRadius: '50%',
        backgroundColor: color,
        boxShadow: isInProgress ? `0 0 6px ${color}` : undefined,
      }}
      aria-label={`status: ${status}`}
    />
  );
}

/* ── 主组件 ── */

export interface BuzzyCardProps {
  /** CanvasNode.type — 决定图标/标签/选中色 */
  type: CanvasNodeType | string;
  /** CanvasNodeData — 用于状态点判定和 highlighted */
  data: CanvasNodeData;
  /** 来自 NodeProps.selected */
  selected?: boolean;
  /** body 渲染内容（缩略图、文本、占位符等） */
  children?: ReactNode;
  /** 自定义类名（用于覆盖宽度、背景等） */
  className?: string;
  /** 自定义内部样式 */
  style?: React.CSSProperties;
  /** 是否有缩略图（缩略图由 children 渲染，这里只用于 aria/语义） */
  hasThumbnail?: boolean;
  /** 屏幕阅读器标签 */
  ariaLabel?: string;
  /** 覆盖默认 label（按 type 决定）；当 type 不够精确时（如 deliverable 含 image/video/audio）使用 */
  label?: string;
  /** 覆盖默认图标 */
  iconOverride?: LucideIcon;
}

export function BuzzyCard({
  type,
  data,
  selected = false,
  children,
  className = '',
  style,
  ariaLabel,
  label,
  iconOverride,
}: BuzzyCardProps) {
  const config = getCardTypeConfig(type);
  const Icon = iconOverride ?? config.icon;
  const displayLabel = label ?? config.label;
  const highlighted = data._highlighted as boolean | undefined;
  const status = data.status;

  // Border color logic: highlighted > selected > default
  let borderColor = 'oklch(22% 0.015 250)';
  if (selected) {
    borderColor = SELECTION_BORDER[config.selectedColor];
  } else if (highlighted) {
    borderColor = 'var(--color-accent-500)';
  }

  return (
    <div
      role="group"
      aria-label={ariaLabel ?? `${displayLabel} 卡片`}
      data-buzzy-card
      data-card-type={type}
      data-selected={selected ? 'true' : 'false'}
      className={`buzzy-card group relative w-[240px] rounded-[var(--radius-lg)] border bg-[oklch(8%_0.01_250)] transition-colors hover:border-[oklch(35%_0.015_250)] ${
        highlighted && !selected ? 'animate-card-pulse' : ''
      } ${className}`}
      style={{
        borderColor,
        ...style,
      }}
    >
      {/* Header — single line: icon + label + status dot */}
      <div className="flex items-center gap-1.5 px-3 py-1.5">
        <Icon
          className="h-3 w-3 shrink-0"
          style={{ color: 'var(--color-text-tertiary)' }}
          aria-hidden="true"
        />
        <span
          className="text-[11px] font-normal tracking-wide"
          style={{ color: 'var(--color-text-tertiary)' }}
        >
          {displayLabel}
        </span>
        {/* Status dot — absolute top-right */}
        <span className="absolute right-2 top-2">
          <StatusDot status={status} />
        </span>
      </div>

      {/* Body — type-specific content (thumbnail, text, placeholder) */}
      <div className="buzzy-card-body">
        {children}
      </div>
    </div>
  );
}
