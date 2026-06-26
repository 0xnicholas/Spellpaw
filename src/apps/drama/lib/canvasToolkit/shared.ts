import type { TreeNode } from "@drama/types";
import { useTaskStore } from "./taskStore";
import { providerRegistry } from "./registry";
import type { GenerationProvider } from "./types";
import { extractResultMetadata } from "./resultMetadata";

/** Get all registered provider ids. Use this for dynamic enum/list generation in toolConfigs and systemPrompt. */
export function listProviderIds(): string[] {
	return providerRegistry.ids();
}

/** Get all registered providers (id + display name). Useful for "when to use" descriptions. */
export function listProviders(): Array<{ id: string; name: string }> {
	return providerRegistry.list().map((p) => ({ id: p.id, name: p.name }));
}

export function buildDefaultPrompt(card: CanvasNode): string {
	const m = (node.metadata ?? {}) as NonNullable<TreeNode["metadata"]>;
	const parts: string[] = [
		"Cinematic storyboard frame for a short drama scene.",
	];
	if (m.description) parts.push(m.description);
	parts.push(`Scene: "${node.title}".`);
	if (m.shotType) parts.push(`Shot type: ${m.shotType}.`);
	if (m.location) parts.push(`Location: ${m.location}.`);
	if (m.timeOfDay) parts.push(`Time of day: ${m.timeOfDay}.`);
	if (m.visualStyle) parts.push(`Visual style: ${m.visualStyle}.`);
	parts.push(
		"Vertical 9:16 aspect ratio, cinematic lighting, photorealistic, unwatermarked.",
	);
	return parts.join(" ");
}

export function updateCardThumbnail(
	cardId: string,
	url: string,
	mediaType: "image" | "video" = "image",
) {
	import("@drama/stores/canvasStore").then(async ({ useCanvasStore }) => {
		useCanvasStore.getState().updateNodeData(cardId, { thumbnail: url });
		// Best-effort: also populate resolution / fileSize / duration so the UI can
		// show "1920x1080 · 4.2 MB" style transparency per the Buzzy competitive
		// analysis (docs/competitive-analysis-buzzy-now.md section 2.5).
		try {
			const meta = await extractResultMetadata(url, mediaType);
			if (
				meta.resolution ||
				meta.fileSize !== undefined ||
				meta.duration !== undefined
			) {
				useCanvasStore.getState().updateNodeData(cardId, meta);
			}
		} catch {
			/* ignore metadata extraction errors */
		}
	});
}

export function startPolling(
	taskId: string,
	provider: GenerationProvider,
	cardId: string,
) {
	if (!provider.poll) return;
	let attempts = 0;
	const maxAttempts = 150; // ~10 minutes at 4s intervals
	const interval = setInterval(async () => {
		attempts++;
		try {
			const task = await provider.poll!(taskId);
			if (task.status === "done" && task.resultUrl) {
				updateCardThumbnail(cardId, task.resultUrl, "video");
				useTaskStore.getState().removeTask(taskId);
				clearInterval(interval);
			} else if (task.status === "failed") {
				useTaskStore.getState().removeTask(taskId);
				clearInterval(interval);
			}
		} catch {
			if (attempts >= maxAttempts) {
				useTaskStore.getState().removeTask(taskId);
				clearInterval(interval);
			}
		}
	}, 4000);
}

import type { GenerationTask } from "./types";

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * Poll a generation task until done/failed/aborted.
 * Throws AbortError if signal is aborted mid-poll.
 * Throws Error if task status is 'failed'.
 */
export async function pollUntilDone(
	provider: GenerationProvider,
	taskId: string,
	onProgress: (progress: number) => void,
	signal: AbortSignal,
): Promise<GenerationTask> {
	let attempt = 0;
	while (true) {
		if (signal.aborted) throw new DOMException("Aborted", "AbortError");
		if (!provider.poll) throw new Error(`Provider ${provider.id} 不支持轮询`);
		const task = await provider.poll(taskId);
		if (task.status === "done") return task;
		if (task.status === "failed") throw new Error(task.error ?? "Generation failed");
		attempt += 1;
		onProgress(Math.min(90, attempt * 20));
		await sleep(2000);
	}
}
