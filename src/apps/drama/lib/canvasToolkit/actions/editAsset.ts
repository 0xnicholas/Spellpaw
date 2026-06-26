import { useProjectStore } from "@drama/stores/projectStore";
import { useCanvasStore } from "@drama/stores/canvasStore";
import { addCanvasCardHandler } from "@drama/lib/builderHandlers";
import { findNode } from "@drama/lib/treeUtils";
import { providerRegistry } from "../registry";
import { useTaskStore } from "../taskStore";
import { updateCardThumbnail, startPolling } from "../shared";
import type { ToolkitResult, GenerationInput, Capability } from "../types";

export interface EditAssetParams {
	action: "edit_asset";
	cardId: string;
	prompt: string;
	provider?: string;
}

export async function editAsset(
	params: EditAssetParams,
): Promise<ToolkitResult> {
	const store = useProjectStore.getState();
	const tree = store.getCurrentTree();
	if (!tree) {
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

	const sourcePrompt =
		(sourceCard.data.generatedPrompt as string | undefined) ||
		(sourceCard.data.description as string | undefined) ||
		sourceCard.data.title;

	const linkedNodeId = sourceCard.data.linkedTreeNodeId;
	const linkedNode = linkedNodeId
		? (findNode(tree, linkedNodeId) ?? null)
		: null;

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
	const fallbackPrompt = sourceCard.data.thumbnail
		? `Edited version of the reference image. ${params.prompt}\n\nOriginal scene: ${sourcePrompt}`
		: `Edited version. ${params.prompt}\n\nOriginal scene: ${sourcePrompt}`;

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

	const title = linkedNode
		? `${linkedNode.title}（编辑版）`
		: `${sourceCard.data.title}（编辑版）`;
	const card = await addCanvasCardHandler("art", {
		title,
		description: params.prompt,
		generatedPrompt: fallbackPrompt,
		 linkedNode?.id,
		status: "draft",
		sourceProvider: provider.id,
	});

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
