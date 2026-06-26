/**
 * CardDetailDrawer — buzzy-style side panel.
 *
 * Design ref: screenshots/buzzy-canvas-*.png
 *   - Dark theme (no light bg)
 *   - No "标题 / 描述 / 元信息" FieldSection labels
 *   - Header: lucide icon + Chinese type name (from BuzzyCard config)
 *   - No emoji icons (📝 🎬 🎨 👤 📦)
 *   - Status shown as small dot (consistent with BuzzyCard)
 *   - Content blocks: image (full-width), description text, key-value rows
 */

import { useState, useEffect, useRef } from "react";
import { X, FileText, Image as ImageIcon, User, Video, Film, Paperclip, Package, type LucideIcon } from "lucide-react";
import { useCanvasStore } from "@drama/stores/canvasStore";
import { useProjectStore } from "@drama/stores/projectStore";
import { Z_INDEX } from "@shared/lib/zIndex";
import { useHotkeys } from "@/shared/hooks/useHotkeys";
import { computeDisplayNumbers } from "@drama/lib/numbering";
import { formatBytes } from "@drama/lib/canvasToolkit";
import { useStyleLockStore } from '@shared/stores/styleLockStore';
import { getCardTypeConfig } from "./BuzzyCard";
import type { CanvasNodeData, CanvasNodeType, DeliverableType } from "@drama/types";

// ── Status dot (same as BuzzyCard) ──
const STATUS_DOT_COLOR: Record<string, string> = {
  draft: 'oklch(50% 0.01 250)',
  in_progress: 'oklch(65% 0.15 230)',
  review: 'oklch(80% 0.15 85)',
  done: 'oklch(65% 0.15 145)',
};

const STATUS_LABEL: Record<string, string> = {
  draft: '草稿',
  in_progress: '进行中',
  review: '审核中',
  done: '已完成',
};

// ── Deliverable type labels ──
const deliverableLabels: Record<DeliverableType, string> = {
  image: "图片",
  video: "视频",
  audio: "音频",
};

// Sub-icon for deliverable kind
const DELIVERABLE_SUB_ICONS: Record<DeliverableType, LucideIcon> = {
  image: ImageIcon,
  video: Video,
  audio: Video, // reuse Video icon (no audio icon needed visually)
};

const PANEL_BG = 'oklch(10% 0.01 250)';
const PANEL_BORDER = 'oklch(22% 0.015 250)';
const INPUT_BG = 'oklch(8% 0.01 250)';
const TEXT_PRIMARY = 'oklch(95% 0.01 250)';
const TEXT_SECONDARY = 'oklch(70% 0.02 250)';
const TEXT_TERTIARY = 'oklch(50% 0.02 250)';

// ── Content block (replaces FieldSection — no label, just content) ──
function Block({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`mb-3 ${className}`}>{children}</div>;
}

// ── Key-value row (no label header, just inline key) ──
function KeyValue({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-baseline gap-2 text-[12px] py-0.5">
      <span className="shrink-0" style={{ color: TEXT_TERTIARY, minWidth: 56 }}>{k}</span>
      <span style={{ color: TEXT_SECONDARY }}>{v}</span>
    </div>
  );
}

// ── Main component ──
export function CardDetailDrawer() {
  const selectedCardId = useCanvasStore((s) => s.selectedCardId);
  const getSelectedCard = useCanvasStore((s) => s.getSelectedCard);
  const setSelectedCardId = useCanvasStore((s) => s.setSelectedCardId);

  const card = selectedCardId ? getSelectedCard() : null;

  // Slide-in/out animation state
  const [visible, setVisible] = useState(false);
  const [slideIn, setSlideIn] = useState(false);
  const prevCardId = useRef<string | null>(null);

  useEffect(() => {
    const cardId = card?.id ?? null;
    if (cardId && cardId !== prevCardId.current) {
      // New card selected — mount and animate in
      prevCardId.current = cardId;
      setVisible(true);
      // Defer slide-in to next frame so CSS transition triggers
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setSlideIn(true));
      });
    } else if (!cardId && prevCardId.current) {
      // Card deselected — slide out, then unmount
      setSlideIn(false);
      const t = setTimeout(() => {
        setVisible(false);
        prevCardId.current = null;
      }, 200);
      return () => clearTimeout(t);
    }
  }, [card?.id]);

  useHotkeys("escape", () => {
    if (selectedCardId) setSelectedCardId(null);
  });

  if (!visible || !card) return null;

  const cardType = card.type as CanvasNodeType;
  const config = getCardTypeConfig(cardType);
  const TypeIcon = config.icon;
  const data = card.data;
  const status = data.status as string | undefined;
  const statusColor = status ? STATUS_DOT_COLOR[status] : null;
  const statusLabel = status ? STATUS_LABEL[status] : null;

  // Compute display numbers (used for legacy types)
  const allNodes = useCanvasStore((s) => s.getCurrentNodes());
  const numberMap = computeDisplayNumbers(tree, allNodes);
  const displayNumber = numberMap.get(card.id) ?? '';

  return (
    <>
      {/* Mask — purely visual, pointer-events: none so events pass through */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ zIndex: Z_INDEX.cardDetailDrawerMask }}
      />

      {/* Drawer */}
      <div
        data-testid="card-detail-drawer"
        role="dialog"
        aria-label={`${config.label} 详情`}
        className="absolute right-0 top-0 bottom-0 w-[340px] flex flex-col"
        style={{
          zIndex: Z_INDEX.cardDetailDrawer,
          backgroundColor: PANEL_BG,
          borderLeft: `1px solid ${PANEL_BORDER}`,
          transform: slideIn ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.2s ease-out",
          boxShadow: '-4px 0 16px rgba(0, 0, 0, 0.3)',
          color: TEXT_PRIMARY,
        }}
      >
        {/* Header — minimal: icon + type + status dot + close */}
        <div
          className="flex items-center gap-2 px-4 py-3 shrink-0"
          style={{ borderBottom: `1px solid ${PANEL_BORDER}` }}
        >
          <TypeIcon className="h-3.5 w-3.5 shrink-0" style={{ color: TEXT_TERTIARY }} aria-hidden="true" />
          <span className="text-[12px] font-normal" style={{ color: TEXT_SECONDARY }}>
            {config.label}
          </span>
          {displayNumber && (
            <span
              className="text-[10px] font-mono shrink-0"
              style={{ color: TEXT_TERTIARY }}
            >
              {displayNumber}
            </span>
          )}
          {statusColor && (
            <span className="flex items-center gap-1.5 ml-auto">
              <span
                className={status === 'in_progress' ? 'animate-status-pulse' : ''}
                style={{
                  display: 'inline-block',
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  backgroundColor: statusColor,
                  boxShadow: status === 'in_progress' ? `0 0 6px ${statusColor}` : undefined,
                }}
                aria-label={`status: ${status}`}
              />
              {statusLabel && (
                <span className="text-[11px]" style={{ color: TEXT_TERTIARY }}>
                  {statusLabel}
                </span>
              )}
            </span>
          )}
          <button
            onClick={() => setSelectedCardId(null)}
            aria-label="关闭"
            className="flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-white/5 shrink-0"
            style={{ color: TEXT_TERTIARY }}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Body — scrollable content */}
        <div className="flex-1 overflow-auto px-4 py-4">
          {/* Title — large, no label */}
          <h3
            className="text-[18px] font-semibold mb-3 leading-tight"
            style={{ color: TEXT_PRIMARY }}
          >
            {data.title}
          </h3>

          {/* Thumbnail (if any) */}
          {data.thumbnail && (
            <Block>
              <img
                src={data.thumbnail as string}
                alt={data.title}
                className="w-full rounded-lg object-cover"
                style={{ maxHeight: 320, backgroundColor: INPUT_BG }}
                draggable={false}
              />
            </Block>
          )}

          {/* Type-specific content */}
          {cardType === "script" && <ScriptDetail data={data} />}
          {cardType === "sceneCard" && (
            <SceneCardDetail data={data} canvasCardId={card && card.id} />
          )}
          {cardType === "art" && (
            <ArtDetail data={data} canvasCardId={card && card.id} />
          )}
          {cardType === "character" && <CharacterDetail data={data} />}
          {cardType === "deliverable" && <DeliverableDetail data={data} />}
          {cardType === "asset" && <AssetDetail data={data} />}
          {cardType === "storyline" && <StorylineDetail data={data} />}
          {cardType === "moodboard" && <MoodboardDetail data={data} />}
          {cardType === "task" && <TaskDetail data={data} />}
        </div>
      </div>
    </>
  );
}

// ── Script detail ──
function ScriptDetail({ data }: { data: CanvasNodeData }) {
  const description = data.description as string | undefined;
  const dialogue = data.dialogue as string | undefined;
  const location = data.location as string | undefined;
  const timeOfDay = data.timeOfDay as string | undefined;
  const duration = data.duration as number | undefined;

  return (
    <>
      {description && (
        <Block>
          <p className="text-[13px] leading-relaxed" style={{ color: TEXT_SECONDARY }}>
            {description}
          </p>
        </Block>
      )}
      {dialogue && (
        <Block>
          <p className="text-[13px] italic leading-relaxed" style={{ color: TEXT_SECONDARY }}>
            {dialogue}
          </p>
        </Block>
      )}
      {(duration != null || location || timeOfDay) && (
        <Block>
          <div className="rounded-lg p-3 space-y-0.5" style={{ backgroundColor: INPUT_BG }}>
            {duration != null && <KeyValue k="时长" v={`${duration}s`} />}
            {location && <KeyValue k="地点" v={location} />}
            {timeOfDay && <KeyValue k="时间" v={timeOfDay} />}
          </div>
        </Block>
      )}
    </>
  );
}

// ── Art detail ──
function ArtDetail({ data, linkedTreeNodeId }: { data: CanvasNodeData; linkedTreeNodeId?: string }) {
  const prompt = data.prompt as string | undefined;
  const tags = data.tags as string[] | undefined;
  const { lockedCardId } = useStyleLockStore();
  const isLocked = canvasCardId ? lockedCardId === canvasCardId : false;

  return (
    <>
      {prompt && (
        <Block>
          <p
            className="rounded-lg p-3 text-[12px] leading-relaxed"
            style={{ backgroundColor: INPUT_BG, color: TEXT_SECONDARY }}
          >
            {prompt}
          </p>
        </Block>
      )}
      {tags && tags.length > 0 && (
        <Block>
          <div className="flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full px-2.5 py-0.5 text-[11px]"
                style={{ backgroundColor: INPUT_BG, color: TEXT_SECONDARY }}
              >
                {tag}
              </span>
            ))}
          </div>
        </Block>
      )}
      {canvasCardId && (
        <Block>
          <div className="rounded-lg p-3 space-y-0.5" style={{ backgroundColor: INPUT_BG }}>
            <KeyValue k="风格" v={isLocked ? '已锁定' : '未锁定'} />
          </div>
        </Block>
      )}
    </>
  );
}

// ── SceneCard detail ──
function SceneCardDetail({ data, linkedTreeNodeId }: { data: CanvasNodeData; linkedTreeNodeId?: string }) {
  const prompt = data.generatedPrompt as string | undefined;
  const tags = data.tags as string[] | undefined;
  const resolution = data.resolution as string | undefined;
  const fileSize = data.fileSize as number | undefined;
  const sourceProvider = data.sourceProvider as string | undefined;
  const getLockedStyle = useProjectStore((s) => s.getLockedStyle);
  
  const location = linkedNode?.metadata?.location as string | undefined;
  const timeOfDay = linkedNode?.metadata?.timeOfDay as string | undefined;
  const isLocked = linkedTreeNodeId ? getLockedStyle().nodeId === linkedTreeNodeId : false;

  const hasMeta = location || timeOfDay || resolution || fileSize != null || sourceProvider;

  return (
    <>
      {prompt && (
        <Block>
          <p
            className="rounded-lg p-3 text-[12px] leading-relaxed"
            style={{ backgroundColor: INPUT_BG, color: TEXT_SECONDARY }}
          >
            {prompt}
          </p>
        </Block>
      )}
      {tags && tags.length > 0 && (
        <Block>
          <div className="flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full px-2.5 py-0.5 text-[11px]"
                style={{ backgroundColor: INPUT_BG, color: TEXT_SECONDARY }}
              >
                {tag}
              </span>
            ))}
          </div>
        </Block>
      )}
      {hasMeta && (
        <Block>
          <div className="rounded-lg p-3 space-y-0.5" style={{ backgroundColor: INPUT_BG }}>
            {location && <KeyValue k="地点" v={location} />}
            {timeOfDay && <KeyValue k="时间" v={timeOfDay} />}
            {resolution && <KeyValue k="分辨率" v={resolution} />}
            {fileSize != null && <KeyValue k="大小" v={formatBytes(fileSize)} />}
            {sourceProvider && <KeyValue k="Provider" v={sourceProvider} />}
            {canvasCardId && <KeyValue k="风格" v={isLocked ? '已锁定' : '未锁定'} />}
          </div>
        </Block>
      )}
    </>
  );
}

// ── Character detail ──
function CharacterDetail({ data }: { data: CanvasNodeData }) {
  const role = data.role as string | undefined;
  const age = data.age as number | undefined;
  const occupation = data.occupation as string | undefined;
  const personality = data.personality as string | undefined;
  const appearance = data.appearance as string | undefined;
  const avatar = data.avatar as string | undefined;

  const hasInfo = role || age != null || occupation;

  return (
    <>
      {avatar && (
        <Block>
          <div
            className="mx-auto h-24 w-24 rounded-full"
            style={{
              background: `url(${avatar}) center/cover`,
            }}
          />
        </Block>
      )}
      {hasInfo && (
        <Block>
          <div className="rounded-lg p-3 space-y-0.5" style={{ backgroundColor: INPUT_BG }}>
            {role && <KeyValue k="角色" v={role} />}
            {age != null && <KeyValue k="年龄" v={`${age}岁`} />}
            {occupation && <KeyValue k="职业" v={occupation} />}
          </div>
        </Block>
      )}
      {personality && (
        <Block>
          <p className="text-[12px] mb-1" style={{ color: TEXT_TERTIARY }}>性格</p>
          <p className="text-[13px] leading-relaxed" style={{ color: TEXT_SECONDARY }}>
            {personality}
          </p>
        </Block>
      )}
      {appearance && (
        <Block>
          <p className="text-[12px] mb-1" style={{ color: TEXT_TERTIARY }}>外貌</p>
          <p className="text-[13px] leading-relaxed" style={{ color: TEXT_SECONDARY }}>
            {appearance}
          </p>
        </Block>
      )}
    </>
  );
}

// ── Deliverable detail ──
function DeliverableDetail({ data }: { data: CanvasNodeData }) {
  const deliverableType: DeliverableType = (data.deliverableType as DeliverableType) ?? "image";
  const SubIcon = DELIVERABLE_SUB_ICONS[deliverableType];
  const description = data.description as string | undefined;
  const duration = data.duration as number | undefined;
  const fileSize = data.fileSize as number | undefined;
  const resolution = data.resolution as string | undefined;

  const formatDuration = (s?: number) => {
    if (s == null) return null;
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const hasMeta = duration != null || fileSize != null || resolution;

  return (
    <>
      <Block>
        <div className="flex items-center gap-1.5 text-[12px]" style={{ color: TEXT_SECONDARY }}>
          <SubIcon className="h-3.5 w-3.5" style={{ color: TEXT_TERTIARY }} aria-hidden="true" />
          <span>{deliverableLabels[deliverableType]}</span>
        </div>
      </Block>
      {description && (
        <Block>
          <p className="text-[13px] leading-relaxed" style={{ color: TEXT_SECONDARY }}>
            {description}
          </p>
        </Block>
      )}
      {hasMeta && (
        <Block>
          <div className="rounded-lg p-3 space-y-0.5" style={{ backgroundColor: INPUT_BG }}>
            {duration != null && <KeyValue k="时长" v={formatDuration(duration)} />}
            {resolution && <KeyValue k="分辨率" v={resolution} />}
            {fileSize != null && <KeyValue k="大小" v={formatBytes(fileSize)} />}
          </div>
        </Block>
      )}
    </>
  );
}

// ── Asset detail ──
function AssetDetail({ data }: { data: CanvasNodeData }) {
  const assetType = data.assetType as string | undefined;
  const description = data.description as string | undefined;
  const fileSize = data.fileSize as number | undefined;
  const resolution = data.resolution as string | undefined;

  const hasMeta = assetType || fileSize != null || resolution;

  return (
    <>
      {description && (
        <Block>
          <p className="text-[13px] leading-relaxed" style={{ color: TEXT_SECONDARY }}>
            {description}
          </p>
        </Block>
      )}
      {hasMeta && (
        <Block>
          <div className="rounded-lg p-3 space-y-0.5" style={{ backgroundColor: INPUT_BG }}>
            {assetType && <KeyValue k="类型" v={assetType} />}
            {resolution && <KeyValue k="分辨率" v={resolution} />}
            {fileSize != null && <KeyValue k="大小" v={formatBytes(fileSize)} />}
          </div>
        </Block>
      )}
    </>
  );
}

// ── Storyline detail ──
function StorylineDetail({ data }: { data: CanvasNodeData }) {
  const sceneCount = data.sceneCount as number | undefined;
  const shotCount = data.shotCount as number | undefined;
  const description = data.description as string | undefined;

  return (
    <>
      {description && (
        <Block>
          <p className="text-[13px] leading-relaxed" style={{ color: TEXT_SECONDARY }}>
            {description}
          </p>
        </Block>
      )}
      {(sceneCount != null || shotCount != null) && (
        <Block>
          <div className="rounded-lg p-3 space-y-0.5" style={{ backgroundColor: INPUT_BG }}>
            {sceneCount != null && <KeyValue k="场景" v={`${sceneCount} 场`} />}
            {shotCount != null && <KeyValue k="镜头" v={`${shotCount} 个`} />}
          </div>
        </Block>
      )}
    </>
  );
}

// ── Moodboard detail ──
function MoodboardDetail({ data }: { data: CanvasNodeData }) {
  const colors = data.colors as string[] | undefined;
  const styleRef = data.styleRef as string | undefined;
  const images = data.images as string[] | undefined;

  return (
    <>
      {styleRef && (
        <Block>
          <p className="text-[13px] leading-relaxed" style={{ color: TEXT_SECONDARY }}>
            {styleRef}
          </p>
        </Block>
      )}
      {colors && colors.length > 0 && (
        <Block>
          <p className="text-[12px] mb-2" style={{ color: TEXT_TERTIARY }}>色板</p>
          <div className="flex flex-wrap gap-2">
            {colors.map((c, i) => (
              <div
                key={i}
                className="h-8 w-8 rounded border"
                style={{ backgroundColor: c, borderColor: PANEL_BORDER }}
                title={c}
              />
            ))}
          </div>
        </Block>
      )}
      {images && images.length > 0 && (
        <Block>
          <p className="text-[12px] mb-2" style={{ color: TEXT_TERTIARY }}>
            参考图 · {images.length} 张
          </p>
          <div className="grid grid-cols-3 gap-2">
            {images.slice(0, 9).map((img, i) => (
              <img
                key={i}
                src={img}
                alt=""
                className="w-full aspect-square object-cover rounded"
                style={{ backgroundColor: INPUT_BG }}
                draggable={false}
              />
            ))}
          </div>
        </Block>
      )}
    </>
  );
}

// ── Task detail ──
function TaskDetail({ data }: { data: CanvasNodeData }) {
  const taskType = data.taskType as string | undefined;
  const taskStatus = data.taskStatus as string | undefined;
  const description = data.description as string | undefined;

  const taskTypeLabel = taskType ? { instruction: '指令', feedback: '反馈', diff: '对比' }[taskType] : null;

  return (
    <>
      {description && (
        <Block>
          <p className="text-[13px] leading-relaxed" style={{ color: TEXT_SECONDARY }}>
            {description}
          </p>
        </Block>
      )}
      {(taskTypeLabel || taskStatus) && (
        <Block>
          <div className="rounded-lg p-3 space-y-0.5" style={{ backgroundColor: INPUT_BG }}>
            {taskTypeLabel && <KeyValue k="类型" v={taskTypeLabel} />}
            {taskStatus && <KeyValue k="状态" v={taskStatus === 'done' ? '完成' : '待处理'} />}
          </div>
        </Block>
      )}
    </>
  );
}
