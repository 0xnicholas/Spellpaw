import { useProjectStore } from "@drama/stores/projectStore";
import { useCanvasStore } from "@drama/stores/canvasStore";
import { addEnrichedCard } from "@drama/stores/toolRouter/cards";

import { providerRegistry } from "../registry";
import { useTaskStore } from "../taskStore";
import {
	buildDefaultPrompt,
	updateCardThumbnail,
	startPolling,
} from "../shared";
import type {
	ToolkitResult,
	GenerationInput,
	Capability,
	MediaType,
} from "../types";
import type { CanvasNodeType } from "@drama/types";

export interface GenerateAssetParams {
	action: "generate_asset";
	/** Canvas card to use as prompt source (canvas-first). Alias: `nodeId` (deprecated). */
	cardId?: string;
	/** @deprecated Use `cardId`. Retained for backward compatibility with tree-era callers. */
	nodeId?: string;
	mediaType: MediaType;
	prompt?: string;
	provider?: string;
	count?: number;
	cardType?: CanvasNodeType;
}

/**
 * Default card type for generated assets. Video → videoClip, otherwise art.
 * Legacy `deliverable` is no longer the default (use `videoClip` for video).
 */
function defaultCardType(mediaType: MediaType): CanvasNodeType {
	return mediaType === "video" ? "videoClip" : "art";
}

export async function generateAsset(
	params: GenerateAssetParams,
): Promise<ToolkitResult> {
	const projectId = useProjectStore.getState().currentProjectId;
	if (!projectId) {
		return { success: false, message: "当前没有打开的项目", retryable: false };
	}

	if (params.mediaType !== "image" && params.mediaType !== "video") {
		return {
			success: false,
			message: `不支持的 mediaType: ${params.mediaType}`,
			retryable: false,
		};
	}

	// Resolve source card (canvas-first; nodeId kept as alias for back-compat).
	const targetCardId = params.cardId ?? params.nodeId;
	let sourceCard: import("@drama/types").CanvasNode | null = null;
	if (targetCardId) {
		const nodes = useCanvasStore.getState().getCurrentNodes();
		sourceCard = nodes.find((n) => n.id === targetCardId) ?? null;
		if (!sourceCard) {
			return {
				success: false,
				message: `未找到卡片: ${targetCardId}`,
				retryable: false,
			};
		}
	}

	if (!sourceCard && !params.prompt) {
		return {
			success: false,
			message: "未选择卡片时，请提供生成提示词",
			retryable: false,
		};
	}

	const capability: Capability =
		params.mediaType === "video" ? "text2video" : "text2image";
	const batchCount = Math.max(1, Math.floor(params.count ?? 1));
	const input: GenerationInput = {
		type: params.mediaType,
		capability,
		prompt: params.prompt ?? buildDefaultPrompt(sourceCard!),
		batchCount,
	};

	const selection = providerRegistry.select(input, params.provider);
	if ("error" in selection) {
		return { success: false, message: selection.error, retryable: false };
	}

	const provider = selection.provider;
	const cardType = params.cardType ?? defaultCardType(params.mediaType);
	const cardIds: string[] = [];
	const pendingTaskIds: string[] = [];

	for (let i = 0; i < batchCount; i++) {
		const task = await provider.submit(input);
		if (task.status === "failed") {
			return {
				success: false,
				message: task.error ?? "生成失败",
				retryable: true,
			};
		}

		const titleSuffix = batchCount > 1 ? ` 变体 ${i + 1}` : "";
		const baseTitle = sourceCard?.data.title ?? input.prompt.slice(0, 20);
		const cardData: Record<string, unknown> = {
			title: `${baseTitle}${titleSuffix}`,
			description: input.prompt,
			generatedPrompt: input.prompt,
			status: "draft",
			sourceProvider: provider.id,
			linkedCardIds: sourceCard ? [sourceCard.id] : [],
		};
		if (cardType === "videoClip") {
			cardData.source = "ai";
		} else if (cardType === "asset") {
			cardData.assetType = params.mediaType;
		}

		const card = await addEnrichedCard(cardType, cardData);
		cardIds.push(card.id);

		if (task.status === "done" && task.resultUrl) {
			updateCardThumbnail(card.id, task.resultUrl, input.type);
		} else if (task.status === "pending" || task.status === "processing") {
			useTaskStore.getState().addTask({
				taskId: task.taskId,
				providerId: provider.id,
				cardId: card.id,
				createdAt: new Date().toISOString(),
			});
			startPolling(task.taskId, provider, card.id);
			pendingTaskIds.push(task.taskId);
		}
	}

	const pendingSuffix =
		pendingTaskIds.length > 0
			? `（${pendingTaskIds.length} 个任务正在后台生成）`
			: "";
	return {
		success: true,
		message: `已使用 ${provider.name} 创建 ${cardIds.length} 张${cardType === "videoClip" ? "视频" : "图片"}卡片${pendingSuffix}`,
		cardIds,
		...(pendingTaskIds.length > 0 ? { taskId: pendingTaskIds[0] } : {}),
	};
}
