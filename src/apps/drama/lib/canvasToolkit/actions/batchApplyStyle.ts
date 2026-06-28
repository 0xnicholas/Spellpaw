import { useProjectStore } from "@drama/stores/projectStore";
import { useCanvasStore } from "@drama/stores/canvasStore";
import { addEnrichedCard } from '@drama/stores/toolRouter/cards';
import { providerRegistry } from "../registry";
import { useTaskStore } from "../taskStore";
import { updateCardThumbnail, startPolling } from "../shared";
import type { ToolkitResult, GenerationInput } from "../types";
import type { CanvasNodeType } from "@drama/types";
import { getCapabilityConfig } from "../capabilityConfig";

export interface BatchApplyStyleParams {
	action: "batch_apply_style";
	/** Canvas card ids to apply the style to (canvas-first). Alias: `nodeIds` (deprecated). */
	cardIds?: string[];
	/** @deprecated Use `cardIds`. Retained for backward compatibility with tree-era callers. */
	nodeIds?: string[];
	stylePrompt: string;
	provider?: string;
}

function defaultCardType(sourceType: CanvasNodeType): CanvasNodeType {
	return sourceType === "videoClip" ? "videoClip" : "art";
}

export async function batchApplyStyle(
	params: BatchApplyStyleParams,
): Promise<ToolkitResult> {
	const projectId = useProjectStore.getState().currentProjectId;
	if (!projectId) {
		return { success: false, message: "当前没有打开的项目", retryable: false };
	}

	if (!params.stylePrompt || params.stylePrompt.trim().length === 0) {
		return { success: false, message: "请提供风格描述", retryable: false };
	}

	const targetIds = params.cardIds ?? params.nodeIds ?? [];
	if (targetIds.length === 0) {
		return { success: false, message: "请至少选择一张卡片", retryable: false };
	}

	const canvasNodes = useCanvasStore.getState().getCurrentNodes();

	const input: GenerationInput = {
		type: "image",
		capability: "text2image",
		prompt: params.stylePrompt,
	};

	const selection = providerRegistry.select(input, params.provider);
	if ("error" in selection) {
		return { success: false, message: selection.error, retryable: false };
	}

	const provider = selection.provider;

	// Inject capability-specific config (text2image, since the action
	// generates a new styled card from a text prompt + a source reference)
	const capConfig = getCapabilityConfig("text2image");
	if (capConfig) {
		provider.configure({
			apiKey: capConfig.apiKey,
			baseUrl: capConfig.baseUrl,
			model: capConfig.model,
		});
	}

	const cardIds: string[] = [];
	const pendingTaskIds: string[] = [];
	const errors: string[] = [];

	for (const cardId of targetIds) {
		const card = canvasNodes.find((n) => n.id === cardId);
		if (!card) {
			errors.push(`未找到卡片: ${cardId}`);
			continue;
		}

		// Canvas era: build the per-card prompt from card data. (Tree-era buildDefaultPrompt
		// was removed because it relied on TreeNode metadata fields.)
		const basePrompt =
			(card.data.generatedPrompt as string | undefined) ??
			(card.data.description as string | undefined) ??
			card.data.title;
		const styledPrompt = `Style: ${params.stylePrompt}.\n\n${basePrompt}`;

		const task = await provider.submit({ ...input, prompt: styledPrompt });
		if (task.status === "failed") {
			errors.push(task.error ?? `「${card.data.title}」生成失败`);
			continue;
		}

		const cardType = defaultCardType(card.type);
		const newCard = await addEnrichedCard(cardType, {
			title: `${card.data.title}（${params.stylePrompt.slice(0, 12)}）`,
			description: styledPrompt,
			generatedPrompt: styledPrompt,
			status: "draft",
			sourceProvider: provider.id,
			linkedCardIds: [card.id],
		});
		useCanvasStore.getState().updateNodeData(newCard.id, { generationStatus: "generating" });
		cardIds.push(newCard.id);

		if (task.status === "done" && task.resultUrl) {
			updateCardThumbnail(newCard.id, task.resultUrl, "image");
		} else if (task.status === "pending" || task.status === "processing") {
			useTaskStore.getState().addTask({
				taskId: task.taskId,
				providerId: provider.id,
				cardId: newCard.id,
				createdAt: new Date().toISOString(),
			});
			startPolling(task.taskId, provider, newCard.id);
			pendingTaskIds.push(task.taskId);
		}
	}

	if (cardIds.length === 0) {
		return {
			success: false,
			message: `批量风格迁移失败: ${errors.join("; ")}`,
			retryable: errors.length > 0,
		};
	}

	const pendingSuffix =
		pendingTaskIds.length > 0
			? `（${pendingTaskIds.length} 个任务正在后台生成）`
			: "";
	const errorSuffix = errors.length > 0 ? `；${errors.length} 个节点失败` : "";
	return {
		success: true,
		message: `已为 ${cardIds.length} 个节点创建「${params.stylePrompt}」风格卡片${pendingSuffix}${errorSuffix}`,
		cardIds,
		...(pendingTaskIds.length > 0 ? { taskId: pendingTaskIds[0] } : {}),
	};
}
