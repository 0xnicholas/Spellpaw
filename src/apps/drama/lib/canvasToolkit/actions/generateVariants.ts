/* eslint-disable @typescript-eslint/no-unused-vars */
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
import { getCapabilityConfig } from "../capabilityConfig";

export interface GenerateVariantsParams {
	action: "generate_variants";
	nodeId?: string;
	cardId?: string;
	mediaType?: MediaType;
	prompt?: string;
	count?: number;
	provider?: string;
}

export async function generateVariants(
	params: GenerateVariantsParams,
): Promise<ToolkitResult> {
	const canvasNodes = useCanvasStore.getState().getCurrentNodes();

	let basePrompt = params.prompt;

	if (params.nodeId || params.cardId) {
		const targetId = params.cardId || params.nodeId;
		const card = canvasNodes.find(n => n.id === targetId);
		if (!card) {
			return { success: false, message: `未找到卡片: ${targetId}`, retryable: false };
		}
		basePrompt ??= (card.data.generatedPrompt as string) || (card.data.description as string) || card.data.title;
	} else {
		return {
			success: false,
			message: "请提供 nodeId 或 cardId",
			retryable: false,
		};
	}

	if (!basePrompt) {
		return { success: false, message: "无法确定生成提示词", retryable: false };
	}

	const mediaType = params.mediaType ?? "image";
	if (mediaType !== "image" && mediaType !== "video") {
		return {
			success: false,
			message: `不支持的 mediaType: ${mediaType}`,
			retryable: false,
		};
	}

	const capability: Capability =
		mediaType === "video" ? "text2video" : "text2image";
	const batchCount = Math.max(1, Math.floor(params.count ?? 1));
	const input: GenerationInput = {
		type: mediaType,
		capability,
		prompt: basePrompt,
		batchCount,
	};

	const selection = providerRegistry.select(input, params.provider);
	if ("error" in selection) {
		return { success: false, message: selection.error, retryable: false };
	}

	const provider = selection.provider;

	// Inject the capability-specific LLM config (from synced llmConfigs).
	const capConfig = getCapabilityConfig(mediaType);
	if (capConfig) {
		provider.configure({
			apiKey: capConfig.apiKey,
			baseUrl: capConfig.baseUrl,
			model: capConfig.model,
		});
	}

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
		const title = card
			? `${card.data.title}${titleSuffix}`
			: `${basePrompt.slice(0, 20)}${titleSuffix}`;
		const card = await addEnrichedCard("art", {
			title,
			description: basePrompt,
			generatedPrompt: basePrompt,
			status: "draft",
			sourceProvider: provider.id,
		});
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
		message: `已使用 ${provider.name} 创建 ${cardIds.length} 张变体图片卡片${pendingSuffix}`,
		cardIds,
		...(pendingTaskIds.length > 0 ? { taskId: pendingTaskIds[0] } : {}),
	};
}
