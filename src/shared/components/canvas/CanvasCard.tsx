/**
 * CanvasCard — 共享卡片包装器
 *
 * 视觉参考：screenshots/buzzy-canvas.png
 *
 * 职责：
 *  - 极简深色边框 + 选中色（按 type 区分蓝/黄/紫）
 *  - 单行 header：lucide 图标 + 中文名
 *  - 右上角状态点（替代原 Badge，支持脉动）
 *  - children 渲染具体类型 body
 *
 * 视觉令牌（复刻 buzzy）：
 *  - 卡片背景：#151515 — buzzy exact pixel match
 *  - 默认边框：#3a3a3a — 清晰可见的细灰边
 *  - Hover 边框：#4d4d4d
 *  - Header 标签：12px / oklch(63% 0 0) / 400
 *  - Header 图标：12px / oklch(50% 0 0)
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
  script:       { icon: FileText,     label: '文本',   selectedColor: 'accent' },
  art:          { icon: ImageIcon,    label: '图片',   selectedColor: 'blue' },
  character:    { icon: User,         label: '角色',   selectedColor: 'accent' },
  deliverable:  { icon: Video,        label: '视频',   selectedColor: 'yellow' },
  videoClip:    { icon: Video,        label: '视频',   selectedColor: 'yellow' },
  sceneCard:    { icon: Film,         label: '分镜',   selectedColor: 'blue' },
  asset:        { icon: Paperclip,    label: '资产',   selectedColor: 'accent' },
  storyline:    { icon: BookOpen,     label: '文本',   selectedColor: 'accent' },
  moodboard:    { icon: Palette,      label: '图片',   selectedColor: 'accent' },
  task:         { icon: CheckSquare,  label: '任务',   selectedColor: 'accent' },
};

const FALLBACK_CONFIG: CardTypeConfig = {
  icon: Square,
  label: '卡片',
  selectedColor: 'accent',
};

// eslint-disable-next-line react-refresh/only-export-components -- shared with BuzzyCard and external consumers; split into a dedicated file is a planned cleanup
export function getCardTypeConfig(type: CanvasNodeType | string): CardTypeConfig {
  return CARD_TYPE_CONFIG[type as CanvasNodeType] ?? FALLBACK_CONFIG;
}

// eslint-disable-next-line react-refresh/only-export-components -- shared with BuzzyCard and external consumers; split into a dedicated file is a planned cleanup
export function getCardLabel(type: CanvasNodeType | string): string {
  return getCardTypeConfig(type).label;
}

/* ── 视觉令牌（OKLCH，统一复刻 buzzy） ── */

// CanvasCard 自身的颜色 — exact buzzy pixel match
const CARD_BG = '#151515';
const BORDER_DEFAULT = '#3a3a3a';
const BORDER_HOVER = '#4d4d4d';

// 选中态按 type 区分（蓝=image/sceneCard, 黄=video, 紫=其它）
const SELECTION_BORDER: Record<SelectionColor, string> = {
  blue: 'oklch(70% 0.15 230)',     // #5B9EFF
  yellow: 'oklch(85% 0.18 95)',   // #FACC15
  accent: 'var(--color-accent-500)',
};

// Header 文本/图标色
const HEADER_LABEL_COLOR = 'oklch(63% 0 0)';
const HEADER_ICON_COLOR = 'oklch(50% 0 0)';

/* ── 状态点 ── */

const STATUS_DOT_COLOR: Record<string, string> = {
  draft: 'oklch(50% 0.01 250)',
  in_progress: 'oklch(65% 0.15 230)',
  review: 'oklch(80% 0.18 85)',
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

export interface CanvasCardProps {
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
  /** 屏幕阅读器标签 */
  ariaLabel?: string;
  /** 覆盖默认 label（按 type 决定）；当 type 不够精确时（如 deliverable 含 image/video/audio）使用 */
  label?: string;
  /** 覆盖默认图标 */
  iconOverride?: LucideIcon;
}

export function CanvasCard({
  type,
  data,
  selected = false,
  children,
  className = '',
  style,
  ariaLabel,
  label,
  iconOverride,
}: CanvasCardProps) {
  const config = getCardTypeConfig(type);
  const Icon = iconOverride ?? config.icon;
  const displayLabel = label ?? config.label;
  const highlighted = data._highlighted as boolean | undefined;
  const status = data.status;

  // Border color logic: highlighted > selected > default
  let borderColor = BORDER_DEFAULT;
  if (selected) {
    borderColor = SELECTION_BORDER[config.selectedColor];
  } else if (highlighted) {
    borderColor = 'var(--color-accent-500)';
  }

  return (
    <div
      role="group"
      aria-label={ariaLabel ?? `${displayLabel} 卡片`}
      data-canvas-card
      data-card-type={type}
      data-selected={selected ? 'true' : 'false'}
      className={`canvas-card group relative w-[290px] aspect-square rounded-[var(--radius-lg)] border-2 bg-[var(--canvas-card-bg)] transition-colors overflow-hidden ${
        highlighted && !selected ? 'animate-card-pulse' : ''
      } ${className}`}
      style={{
        borderColor,
        ...style,
      }}
      onMouseEnter={(e) => {
        if (!selected) e.currentTarget.style.borderColor = BORDER_HOVER;
      }}
      onMouseLeave={(e) => {
        if (!selected) e.currentTarget.style.borderColor = borderColor;
      }}
    >
      {/* Header — single line: icon + label + status dot */}
      <div className="flex items-center gap-1 px-2.5 py-1">
        <Icon
          className="h-[11px] w-[11px] shrink-0"
          style={{ color: HEADER_ICON_COLOR }}
          aria-hidden="true"
        />
        <span
          className="text-[11px] font-normal tracking-[0.02em]"
          style={{ color: HEADER_LABEL_COLOR }}
        >
          {displayLabel}
        </span>
        {/* Status dot — absolute top-right */}
        <span className="absolute right-1.5 top-1.5">
          <StatusDot status={status} />
        </span>
      </div>

      {/* Body — type-specific content (thumbnail, text, placeholder) */}
      <div className="canvas-card-body">
        {children}
      </div>
    </div>
  );
}

// 导出常量供测试和外部引用
// eslint-disable-next-line react-refresh/only-export-components -- consumed by CanvasCard.test.tsx; split into a dedicated tokens file is a planned cleanup
export const CANVAS_CARD_TOKENS = {
  CARD_BG,
  BORDER_DEFAULT,
  BORDER_HOVER,
  HEADER_LABEL_COLOR,
  HEADER_ICON_COLOR,
} as const;
