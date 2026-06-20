import { useProjectStore } from "@drama/stores/projectStore";
import { useCanvasStore } from "@drama/stores/canvasStore";
import { addCanvasCardHandler } from "@drama/lib/builderHandlers";
import { findNode } from "@drama/lib/treeUtils";
import { providerRegistry } from "../registry";
import { useTaskStore } from "../taskStore";
import { updateCardThumbnail, startPolling } from "../shared";
import type { ToolkitResult, GenerationInput, Capability } from "../types";

export interface ApplyStyleParams {
	action: "apply_style";
	sourceCardId: string;
	stylePrompt?: string;
	styleCardId?: string;
	provider?: string;
}

export async function applyStyle(
	params: ApplyStyleParams,
): Promise<ToolkitResult> {
	const store = useProjectStore.getState();
	const tree = store.getCurrentTree();
	if (!tree) {
		return { success: false, message: "当前没有打开的项目", retryable: false };
	}

	const sourceCard = useCanvasStore
		.getState()
		.getCurrentNodes()
		.find((n) => n.id === params.sourceCardId);
	if (!sourceCard) {
		return {
			success: false,
			message: `未找到源卡片: ${params.sourceCardId}`,
			retryable: false,
		};
	}

	const sourcePrompt =
		(sourceCard.data.generatedPrompt as string | undefined) ||
		(sourceCard.data.description as string | undefined) ||
		sourceCard.data.title;

	let stylePrompt = params.stylePrompt;
	if (!stylePrompt && params.styleCardId) {
		const styleCard = useCanvasStore
			.getState()
			.getCurrentNodes()
			.find((n) => n.id === params.styleCardId);
		stylePrompt = styleCard
			? (styleCard.data.generatedPrompt as string | undefined) ||
				(styleCard.data.description as string | undefined) ||
				styleCard.data.title
			: undefined;
	}
	if (!stylePrompt) {
		return {
			success: false,
			message: "请提供 stylePrompt 或 styleCardId",
			retryable: false,
		};
	}

	const linkedNodeId = sourceCard.data.linkedTreeNodeId;
	const linkedNode = linkedNodeId
		? (findNode(tree, linkedNodeId) ?? null)
		: null;

	const combinedPrompt = `Render the following scene in this style: ${stylePrompt}\n\nScene: ${sourcePrompt}`;

	// Try a dedicated style-transfer provider first, then fall back to text2image with the combined prompt.
	const preferredCapabilities: Capability[] = [
		"styleTransfer",
		"image2image",
		"text2image",
	];
	let selectedProvider: ReturnType<typeof providerRegistry.select> | null =
		null;
	let usedCapability: Capability = "styleTransfer";
	for (const capability of preferredCapabilities) {
		const input: GenerationInput = {
			type: "image",
			capability,
			prompt: combinedPrompt,
			referenceUrl: sourceCard.data.thumbnail,
			options: { stylePrompt },
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
	const task = await provider.submit({
		type: "image",
		capability: usedCapability,
		prompt: combinedPrompt,
		referenceUrl: sourceCard.data.thumbnail,
		options: { stylePrompt },
	});

	if (task.status === "failed") {
		return {
			success: false,
			message: task.error ?? "风格迁移失败",
			retryable: true,
		};
	}

	const title = linkedNode
		? `${linkedNode.title}（风格化）`
		: `${sourceCard.data.title}（风格化）`;
	const card = await addCanvasCardHandler("art", {
		title,
		description: combinedPrompt,
		generatedPrompt: combinedPrompt,
		linkedTreeNodeId: linkedNode?.id,
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
		message: `已使用 ${provider.name} 创建风格化图片卡片`,
		cardIds: [card.id],
		...(task.status === "pending" || task.status === "processing"
			? { taskId: task.taskId }
			: {}),
	};
}
