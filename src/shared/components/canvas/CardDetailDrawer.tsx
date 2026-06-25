import { useState, useEffect, useRef } from "react";
import { X } from "lucide-react";
import { Badge } from "@/shared/components/ui/Badge";
import { useCanvasStore } from "@drama/stores/canvasStore";
import { useProjectStore } from "@drama/stores/projectStore";
import { Z_INDEX } from "@shared/lib/zIndex";
import { useHotkeys } from "@/shared/hooks/useHotkeys";
import { computeDisplayNumbers } from "@drama/lib/numbering";
import { formatBytes } from "@drama/lib/canvasToolkit";
import { findNode } from "@drama/lib/treeUtils";
import type { CanvasNodeData, DeliverableType } from "@drama/types";

// ── Status badge config (same as ScriptCardNode) ──
const statusMap: Record<
	string,
	{ label: string; variant: "default" | "accent" | "success" | "warning" }
> = {
	draft: { label: "草稿", variant: "default" },
	in_progress: { label: "进行中", variant: "accent" },
	review: { label: "审核中", variant: "warning" },
	done: { label: "已完成", variant: "success" },
};

// ── Deliverable type config ──
const deliverableLabels: Record<DeliverableType, string> = {
	image: "图片",
	video: "视频",
	audio: "音频",
};

// ── Field section helper ──
function FieldSection({
	label,
	children,
}: {
	label: string;
	children: React.ReactNode;
}) {
	return (
		<div className="mb-4">
			<div className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-[var(--color-text-tertiary)]">
				{label}
			</div>
			{children}
		</div>
	);
}

// ── Script detail ──
function ScriptDetail({ data }: { data: CanvasNodeData }) {
	const dialogue = data.dialogue as string | undefined;
	const location = data.location as string | undefined;
	const timeOfDay = data.timeOfDay as string | undefined;
	const duration = data.duration as number | undefined;

	return (
		<>
			<FieldSection label="描述">
				<p className="text-[13px] leading-relaxed text-[var(--color-text-secondary)]">
					{data.description || "暂无描述"}
				</p>
			</FieldSection>

			{dialogue && (
				<FieldSection label="对白">
					<div className="rounded-[var(--radius-sm)] bg-[var(--color-bg-tertiary)] p-3">
						<p className="text-[13px] italic leading-relaxed text-[var(--color-text-secondary)]">
							💬 {dialogue}
						</p>
					</div>
				</FieldSection>
			)}

			{(duration != null || location || timeOfDay) && (
				<FieldSection label="元信息">
					<div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[12px] text-[var(--color-text-secondary)]">
						{duration != null && <span>⏱ {duration}s</span>}
						{location && <span>📍 {location}</span>}
						{timeOfDay && <span>🌅 {timeOfDay}</span>}
					</div>
				</FieldSection>
			)}
		</>
	);
}

// ── Art detail ──
function ArtDetail({
	data,
	linkedTreeNodeId,
}: {
	data: CanvasNodeData;
	linkedTreeNodeId?: string;
}) {
	const thumbnail = data.thumbnail as string | undefined;
	const prompt = data.prompt as string | undefined;
	const tags = data.tags as string[] | undefined;
	const getLockedStyle = useProjectStore((s) => s.getLockedStyle);

	const isLocked = linkedTreeNodeId
		? getLockedStyle().nodeId === linkedTreeNodeId
		: false;

	return (
		<>
			<FieldSection label="预览">
				{thumbnail ? (
					<img
						src={thumbnail}
						alt={data.title}
						className="w-full rounded-[var(--radius-sm)] object-cover"
						style={{ maxHeight: 320 }}
					/>
				) : (
					<div className="flex h-40 w-full items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-bg-tertiary)]">
						<span className="text-xs text-[var(--color-text-tertiary)]">
							暂无预览
						</span>
					</div>
				)}
			</FieldSection>

			{prompt && (
				<FieldSection label="生成提示词">
					<p className="rounded-[var(--radius-sm)] bg-[var(--color-bg-tertiary)] p-3 text-[12px] leading-relaxed text-[var(--color-text-secondary)]">
						{prompt}
					</p>
				</FieldSection>
			)}

			{tags && tags.length > 0 && (
				<FieldSection label="标签">
					<div className="flex flex-wrap gap-1.5">
						{tags.map((tag) => (
							<span
								key={tag}
								className="rounded-full bg-[var(--color-bg-tertiary)] px-2.5 py-0.5 text-[11px] text-[var(--color-text-secondary)]"
							>
								{tag}
							</span>
						))}
					</div>
				</FieldSection>
			)}

			<FieldSection label="风格锁定">
				<span className="text-[12px] text-[var(--color-text-secondary)]">
					{isLocked ? "🔒 已锁定风格" : "未锁定"}
				</span>
			</FieldSection>
		</>
	);
}

// ── SceneCard detail ──
function SceneCardDetail({
	data,
	linkedTreeNodeId,
}: {
	data: CanvasNodeData;
	linkedTreeNodeId?: string;
}) {
	const thumbnail = data.thumbnail as string | undefined;
	const prompt = data.generatedPrompt as string | undefined;
	const tags = data.tags as string[] | undefined;
	const resolution = data.resolution as string | undefined;
	const fileSize = data.fileSize as number | undefined;
	const sourceProvider = data.sourceProvider as string | undefined;
	const getLockedStyle = useProjectStore((s) => s.getLockedStyle);

	// Walk the tree to find the linked scene so we can show its location / timeOfDay
	// in addition to the image-derived metadata.
	const tree = useProjectStore((s) => s.getCurrentTree());
	const linkedNode =
		linkedTreeNodeId && tree ? findNode(tree, linkedTreeNodeId) : null;
	const location = linkedNode?.metadata?.location as string | undefined;
	const timeOfDay = linkedNode?.metadata?.timeOfDay as string | undefined;

	const isLocked = linkedTreeNodeId
		? getLockedStyle().nodeId === linkedTreeNodeId
		: false;

	return (
		<>
			<FieldSection label="预览">
				{thumbnail ? (
					<img
						src={thumbnail}
						alt={data.title}
						className="w-full rounded-[var(--radius-sm)] object-cover"
						style={{ maxHeight: 320 }}
					/>
				) : (
					<div className="flex h-40 w-full items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-bg-tertiary)]">
						<span className="text-xs text-[var(--color-text-tertiary)]">
							暂无预览
						</span>
					</div>
				)}
			</FieldSection>

			{prompt && (
				<FieldSection label="场景提示词">
					<p className="rounded-[var(--radius-sm)] bg-[var(--color-bg-tertiary)] p-3 text-[12px] leading-relaxed text-[var(--color-text-secondary)]">
						{prompt}
					</p>
				</FieldSection>
			)}

			{(location || timeOfDay) && (
				<FieldSection label="场景信息">
					<div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[12px] text-[var(--color-text-secondary)]">
						{location && <span>📍 {location}</span>}
						{timeOfDay && <span>🌅 {timeOfDay}</span>}
					</div>
				</FieldSection>
			)}

			{tags && tags.length > 0 && (
				<FieldSection label="标签">
					<div className="flex flex-wrap gap-1.5">
						{tags.map((tag) => (
							<span
								key={tag}
								className="rounded-full bg-[var(--color-bg-tertiary)] px-2.5 py-0.5 text-[11px] text-[var(--color-text-secondary)]"
							>
								{tag}
							</span>
						))}
					</div>
				</FieldSection>
			)}

			{(resolution || fileSize != null || sourceProvider) && (
				<FieldSection label="技术信息">
					<div className="space-y-1 text-[12px] text-[var(--color-text-secondary)]">
						{resolution && <p>📐 分辨率：{resolution}</p>}
						{fileSize != null && <p>💾 文件大小：{formatBytes(fileSize)}</p>}
						{sourceProvider && <p>🤖 Provider：{sourceProvider}</p>}
					</div>
				</FieldSection>
			)}

			<FieldSection label="风格锁定">
				<span className="text-[12px] text-[var(--color-text-secondary)]">
					{isLocked ? "🔒 已锁定风格" : "未锁定"}
				</span>
			</FieldSection>
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

	return (
		<>
			<FieldSection label="头像">
				<div
					className="mx-auto h-24 w-24 rounded-full"
					style={{
						background: avatar
							? `url(${avatar}) center/cover`
							: "var(--color-bg-tertiary)",
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
						fontSize: "2rem",
					}}
				>
					{!avatar && "👤"}
				</div>
			</FieldSection>

			<FieldSection label="基本信息">
				<div className="space-y-1.5 text-[12px] text-[var(--color-text-secondary)]">
					{role && (
						<p>
							<span className="text-[var(--color-text-tertiary)]">角色：</span>
							{role}
						</p>
					)}
					{age != null && (
						<p>
							<span className="text-[var(--color-text-tertiary)]">年龄：</span>
							{age}岁
						</p>
					)}
					{occupation && (
						<p>
							<span className="text-[var(--color-text-tertiary)]">职业：</span>
							{occupation}
						</p>
					)}
				</div>
			</FieldSection>

			{personality && (
				<FieldSection label="性格">
					<p className="text-[13px] leading-relaxed text-[var(--color-text-secondary)]">
						{personality}
					</p>
				</FieldSection>
			)}

			{appearance && (
				<FieldSection label="外貌">
					<p className="text-[13px] leading-relaxed text-[var(--color-text-secondary)]">
						{appearance}
					</p>
				</FieldSection>
			)}
		</>
	);
}

// ── Deliverable detail ──
function DeliverableDetail({ data }: { data: CanvasNodeData }) {
	const thumbnail = data.thumbnail as string | undefined;
	const deliverableType: DeliverableType =
		(data.deliverableType as DeliverableType) ?? "image";
	const duration = data.duration as number | undefined;
	const fileSize = data.fileSize as number | undefined;
	const resolution = data.resolution as string | undefined;

	const formatDuration = (s?: number) => {
		if (s == null) return null;
		const m = Math.floor(s / 60);
		const sec = s % 60;
		return `${m}:${sec.toString().padStart(2, "0")}`;
	};
	const formatFileSize = (b?: number) => (b == null ? null : formatBytes(b));

	return (
		<>
			<FieldSection label="类型">
				<span className="text-[12px] text-[var(--color-text-secondary)]">
					📦 {deliverableLabels[deliverableType]}
				</span>
			</FieldSection>

			{thumbnail && (
				<FieldSection label="预览">
					<img
						src={thumbnail}
						alt={data.title}
						className="w-full rounded-[var(--radius-sm)] object-cover"
						style={{ maxHeight: 240 }}
					/>
				</FieldSection>
			)}

			{data.description && (
				<FieldSection label="描述">
					<p className="text-[13px] leading-relaxed text-[var(--color-text-secondary)]">
						{data.description}
					</p>
				</FieldSection>
			)}

			{(duration != null || fileSize != null || resolution) && (
				<FieldSection label="技术信息">
					<div className="space-y-1 text-[12px] text-[var(--color-text-secondary)]">
						{duration != null && <p>⏱ 时长：{formatDuration(duration)}</p>}
						{resolution && <p>📐 分辨率：{resolution}</p>}
						{fileSize != null && <p>💾 文件大小：{formatFileSize(fileSize)}</p>}
					</div>
				</FieldSection>
			)}
		</>
	);
}

// ── Main CardDetailDrawer ──
export function CardDetailDrawer() {
	const selectedCardId = useCanvasStore((s) => s.selectedCardId);
	const getSelectedCard = useCanvasStore((s) => s.getSelectedCard);
	const setSelectedCardId = useCanvasStore((s) => s.setSelectedCardId);

	const card = selectedCardId ? getSelectedCard() : null;
	const tree = useProjectStore((s) => s.getCurrentTree());
	const allNodes = useCanvasStore((s) => s.getCurrentNodes());

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
			requestAnimationFrame(() => setSlideIn(true));
		} else if (!cardId && prevCardId.current) {
			// Card deselected — animate out then unmount
			prevCardId.current = null;
			setSlideIn(false);
			const timer = setTimeout(() => setVisible(false), 200);
			return () => clearTimeout(timer);
		}
	}, [card?.id]);

	// Compute displayNumber on-the-fly (not stored, derived from tree structure)
	const displayNumber = (() => {
		if (!card) return "";
		const map = computeDisplayNumbers(tree, allNodes);
		return map.get(card.id) ?? "";
	})();

	useHotkeys({ Escape: () => setSelectedCardId(null) }, []);

	if (!visible || !card) return null;

	const data = card.data;
	const statusInfo = data.status ? statusMap[data.status as string] : null;
	const linkedTreeNodeId = data.linkedTreeNodeId as string | undefined;

	const typeConfig: Record<
		string,
		{ icon: string; label: string; accentClass: string }
	> = {
		script: {
			icon: "📝",
			label: "剧本卡片",
			accentClass: "text-[var(--color-accent-600)]",
		},
		sceneCard: {
			icon: "🎬",
			label: "场景卡片",
			accentClass: "text-[var(--color-accent-500)]",
		},
		art: {
			icon: "🎨",
			label: "美术卡片",
			accentClass: "text-[var(--color-status-warning-text)]",
		},
		character: {
			icon: "👤",
			label: "人物角色卡片",
			accentClass: "text-[var(--color-status-success-text)]",
		},
		deliverable: {
			icon: "📦",
			label: "产出物卡片",
			accentClass: "text-[var(--color-accent-600)]",
		},
	};
	const config = typeConfig[card.type] ?? {
		icon: "📄",
		label: "卡片",
		accentClass: "text-[var(--color-text-secondary)]",
	};

	return (
		<>
			{/* Mask — purely visual, pointer-events: none so events pass through */}
			<div
				className="absolute inset-0 bg-black/10 pointer-events-none"
				style={{ zIndex: Z_INDEX.cardDetailDrawerMask }}
			/>

			{/* Drawer */}
			<div
				className="absolute right-0 top-0 bottom-0 w-[340px] bg-[var(--color-bg-primary)] border-l border-[var(--color-border-default)] shadow-lg flex flex-col"
				style={{
					zIndex: Z_INDEX.cardDetailDrawer,
					transform: slideIn ? "translateX(0)" : "translateX(100%)",
					transition: "transform 0.2s ease-out",
				}}
			>
				{/* Header */}
				<div className="flex items-center justify-between border-b border-[var(--color-border-default)] px-4 py-3 shrink-0">
					<div className="flex items-center gap-2 min-w-0">
						<span className="text-sm">{config.icon}</span>
						<div className="min-w-0">
							<div className="flex items-center gap-1.5">
								<span
									className={`text-[11px] font-semibold uppercase tracking-wider ${config.accentClass}`}
								>
									{config.label}
								</span>
								{displayNumber && (
									<span className="text-[10px] font-mono text-[var(--color-text-tertiary)]">
										{displayNumber}
									</span>
								)}
							</div>
						</div>
					</div>
					<button
						onClick={() => setSelectedCardId(null)}
						className="flex h-6 w-6 items-center justify-center rounded-[var(--radius-sm)] hover:bg-[var(--color-bg-secondary)] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] shrink-0"
					>
						<X className="h-3.5 w-3.5" />
					</button>
				</div>

				{/* Body */}
				<div className="flex-1 overflow-auto px-4 py-4">
					{/* Title */}
					<FieldSection label="标题">
						<h3 className="text-[15px] font-semibold text-[var(--color-text-primary)]">
							{data.title}
						</h3>
					</FieldSection>

					{/* Status */}
					{statusInfo && (
						<FieldSection label="状态">
							<Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
						</FieldSection>
					)}

					{/* Type-specific detail */}
					{card.type === "script" && <ScriptDetail data={data} />}
					{card.type === "sceneCard" && (
						<SceneCardDetail data={data} linkedTreeNodeId={linkedTreeNodeId} />
					)}
					{card.type === "art" && (
						<ArtDetail data={data} linkedTreeNodeId={linkedTreeNodeId} />
					)}
					{card.type === "character" && <CharacterDetail data={data} />}
					{card.type === "deliverable" && <DeliverableDetail data={data} />}
				</div>
			</div>
		</>
	);
}
