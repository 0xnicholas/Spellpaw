import { useProjectStore } from "@drama/stores/projectStore";
import { useCanvasStore } from "@drama/stores/canvasStore";
import { addEnrichedCard } from "@drama/stores/toolRouter/cards";

import { providerRegistry } from "../registry";
import { useTaskStore } from "../taskStore";
import { updateCardThumbnail, startPolling } from "../shared";
import type { ToolkitResult, GenerationInput, Capability } from "../types";
import type { CanvasNodeType } from "@drama/types";
import { getCapabilityConfig } from "../capabilityConfig";

export interface EditAssetParams {
	action: "edit_asset";
	cardId: string;
	prompt: string;
	provider?: string;
}

/**
 * Pick a sensible default card type for the edited copy.
 * Editing a videoClip stays as videoClip; anything image-based becomes `art`.
 */
function defaultCardType(sourceType: CanvasNodeType): CanvasNodeType {
	return sourceType === "videoClip" ? "videoClip" : "art";
}

export async function editAsset(
	params: EditAssetParams,
): Promise<ToolkitResult> {
	const projectId = useProjectStore.getState().currentProjectId;
	if (!projectId) {
		return { success: false, message: "当前没有打开的项目", retryable: false };
	}

	const sourceCard = useCanvasStore
		.getState()
		.getCurrentNodes()
		.find((n) => n.id === params.cardId);
	if (!sourceCard) {
		return {
			success: false,
			message: `未找到卡片: ${params.cardId}`,
			retryable: false,
		};
	}

	// Q1: image edit / style transfer require a reference image. Without a
	// thumbnail the source card cannot be used as a reference, so fail fast
	// with a clear error instead of misleadingly reporting "no provider".
	if (!sourceCard.data.thumbnail) {
		return {
			success: false,
			message: "源卡片没有图片，无法编辑",
			retryable: false,
		};
	}

	const sourcePrompt =
		(sourceCard.data.generatedPrompt as string | undefined) ||
		(sourceCard.data.description as string | undefined) ||
		sourceCard.data.title;

	// Prefer a true image-editing provider; fall back to text2image with an edit-aware prompt.
	const preferredCapabilities: Capability[] = [
		"inpaint",
		"image2image",
		"text2image",
	];
	let selectedProvider: ReturnType<typeof providerRegistry.select> | null =
		null;
	let usedCapability: Capability = "inpaint";
	for (const capability of preferredCapabilities) {
		const input: GenerationInput = {
			type: "image",
			capability,
			prompt: params.prompt,
			referenceUrl: sourceCard.data.thumbnail,
			options: { originalPrompt: sourcePrompt },
		};
		const selection = providerRegistry.select(input, params.provider);
		if (!("error" in selection)) {
			selectedProvider = selection;
			usedCapability = capability;
			break;
		}
	}

	if (!selectedProvider || "error" in selectedProvider) {
		return {
			success: false,
			message: "没有可用的图像生成 provider",
			retryable: false,
		};
	}

	const provider = selectedProvider.provider;
	const fallbackPrompt = `Edited version of the reference image. ${params.prompt}\n\nOriginal scene: ${sourcePrompt}`;

	// Inject capability-specific config (per the actual capability we'll use,
	// not just the media type). image2image vs inpaint vs styleTransfer can
	// each have their own provider/apiKey/model.
	const capConfig = getCapabilityConfig(usedCapability);
	if (capConfig) {
		provider.configure({
			apiKey: capConfig.apiKey,
			baseUrl: capConfig.baseUrl,
			model: capConfig.model,
		});
	}

	const task = await provider.submit({
		type: "image",
		capability: usedCapability,
		prompt: usedCapability === "text2image" ? fallbackPrompt : params.prompt,
		referenceUrl: sourceCard.data.thumbnail,
		options: { originalPrompt: sourcePrompt },
	});

	if (task.status === "failed") {
		return {
			success: false,
			message: task.error ?? "图像编辑失败",
			retryable: true,
		};
	}

	const cardType = defaultCardType(sourceCard.type);
	const title = `${sourceCard.data.title}（编辑版）`;
	const card = await addEnrichedCard(cardType, {
		title,
		description: params.prompt,
		generatedPrompt: fallbackPrompt,
		status: "draft",
		sourceProvider: provider.id,
		linkedCardIds: [sourceCard.id],
	});
	useCanvasStore.getState().updateNodeData(card.id, { generationStatus: "generating" });

	if (task.status === "done" && task.resultUrl) {
		updateCardThumbnail(card.id, task.resultUrl, "image");
	} else if (task.status === "pending" || task.status === "processing") {
		useTaskStore.getState().addTask({
			taskId: task.taskId,
			providerId: provider.id,
			cardId: card.id,
			createdAt: new Date().toISOString(),
		});
		startPolling(task.taskId, provider, card.id);
	}

	return {
		success: true,
		message: `已使用 ${provider.name} 创建编辑版图片卡片`,
		cardIds: [card.id],
		...(task.status === "pending" || task.status === "processing"
			? { taskId: task.taskId }
			: {}),
	};
}
