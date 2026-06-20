import { config } from "@/shared/config";
import type {
	GenerationProvider,
	GenerationInput,
	GenerationTask,
	ProviderConfig,
} from "../types";

const SETTINGS_KEY = "spellpaw_settings";
// Direct base URL (kept for reference): https://ark.cn-beijing.volces.com/api/v3
const PROXY_BASE_URL = `${config.serverBase}/api/v1/proxy/doubao`;
const DEFAULT_IMAGE_MODEL = "doubao-seedream-4-5";
const DEFAULT_VIDEO_MODEL = "doubao-seedance-1-5-pro-251215";

function readSettings(): Record<string, unknown> {
	try {
		const raw = localStorage.getItem(SETTINGS_KEY);
		return raw ? JSON.parse(raw) : {};
	} catch {
		return {};
	}
}

function pickSize(options?: Record<string, unknown>): string {
	const configured = options?.size ?? readSettings().doubaoImageSize;
	if (typeof configured === "string" && configured.length > 0)
		return configured;
	return "2048*2048";
}

function pickVideoModel(options?: Record<string, unknown>): string {
	const configured = options?.videoModel ?? readSettings().doubaoVideoModel;
	if (typeof configured === "string" && configured.length > 0)
		return configured;
	return DEFAULT_VIDEO_MODEL;
}

export function createDoubaoProvider(): GenerationProvider {
	let config: ProviderConfig = {};

	return {
		id: "doubao",
		name: "豆包 / 火山方舟",
		supportedMedia: ["image", "video"],
		capabilities: [
			"text2image",
			"image2image",
			"styleTransfer",
			"text2video",
			"image2video",
		],
		requiredConfigKeys: ["doubaoApiKey"],

		isConfigured() {
			if (typeof config.apiKey === "string" && config.apiKey.length > 0)
				return true;
			const settings = readSettings();
			return (
				typeof settings.doubaoApiKey === "string" &&
				settings.doubaoApiKey.length > 0
			);
		},

		configure(next) {
			const apiKey =
				typeof next.apiKey === "string" && next.apiKey.length > 0
					? next.apiKey
					: typeof next.doubaoApiKey === "string" &&
							next.doubaoApiKey.length > 0
						? next.doubaoApiKey
						: undefined;
			config = { ...config, ...next, ...(apiKey ? { apiKey } : {}) };
		},

		estimateCost(_input: GenerationInput) {
			return { amount: 1, unit: "image_or_video_segment" };
		},

		async submit(input: GenerationInput): Promise<GenerationTask> {
			const apiKey =
				typeof config.apiKey === "string" && config.apiKey.length > 0
					? config.apiKey
					: (readSettings().doubaoApiKey as string | undefined);
			if (!apiKey) {
				return {
					taskId: "",
					status: "failed",
					error: "Doubao API key not configured",
				};
			}

			if (input.type === "image") {
				return submitImage(apiKey, input, config);
			}

			return submitVideo(apiKey, input, config);
		},

		async poll(taskId: string): Promise<GenerationTask> {
			const apiKey =
				typeof config.apiKey === "string" && config.apiKey.length > 0
					? config.apiKey
					: (readSettings().doubaoApiKey as string | undefined);
			if (!apiKey) {
				return {
					taskId,
					status: "failed",
					error: "Doubao API key not configured",
				};
			}

			const baseUrl = (config.baseUrl as string | undefined) ?? PROXY_BASE_URL;
			try {
				const res = await fetch(
					`${baseUrl}/contents/generations/tasks/${taskId}`,
					{
						headers: { Authorization: `Bearer ${apiKey}` },
					},
				);
				const data = (await res.json()) as Record<string, unknown>;
				if (!res.ok) {
					return {
						taskId,
						status: "failed",
						error: extractError(data) ?? `HTTP ${res.status}`,
					};
				}

				const status = data.status as string | undefined;
				if (status === "succeeded" || status === "success") {
					const content = data.content as Record<string, unknown> | undefined;
					const videoUrl = content?.video_url as string | undefined;
					return { taskId, status: "done", resultUrl: videoUrl };
				}
				if (status === "failed" || status === "error") {
					return {
						taskId,
						status: "failed",
						error: extractError(data) ?? "视频生成失败",
					};
				}
				return { taskId, status: "processing" };
			} catch (err) {
				return { taskId, status: "failed", error: (err as Error).message };
			}
		},
	};
}

async function submitImage(
	apiKey: string,
	input: GenerationInput,
	config: ProviderConfig,
): Promise<GenerationTask> {
	const baseUrl = (config.baseUrl as string | undefined) ?? PROXY_BASE_URL;
	const model = (config.model as string | undefined) ?? DEFAULT_IMAGE_MODEL;
	const size = pickSize(input.options);

	const body: Record<string, unknown> = {
		model,
		prompt: input.prompt,
		n: 1,
		size,
		response_format: "url",
	};

	switch (input.capability) {
		case "text2image": {
			// No reference image; body stays minimal.
			break;
		}
		case "image2image":
		case "inpaint": {
			// Volces /images/generations accepts `image` (single URL or array).
			if (input.referenceUrl) body.image = input.referenceUrl;
			break;
		}
		case "styleTransfer": {
			// Use `image` for source and `style_reference` for the style image.
			if (input.referenceUrl) body.image = input.referenceUrl;
			const styleUrl = input.options?.styleReferenceUrl as string | undefined;
			if (styleUrl) body.style_reference = styleUrl;
			break;
		}
		default: {
			// Unknown capability — degrade to text2image (no reference).
			break;
		}
	}

	try {
		const res = await fetch(`${baseUrl}/images/generations`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${apiKey}`,
			},
			body: JSON.stringify(body),
		});
		const data = (await res.json()) as Record<string, unknown>;
		if (!res.ok) {
			return {
				taskId: "",
				status: "failed",
				error: extractError(data) ?? `HTTP ${res.status}`,
			};
		}

		const arr = data.data as Array<Record<string, unknown>> | undefined;
		const url = arr?.[0]?.url as string | undefined;
		if (!url) {
			return {
				taskId: "",
				status: "failed",
				error: "No image URL in Doubao response",
			};
		}
		return {
			taskId: `doubao_img_${Date.now()}`,
			status: "done",
			resultUrl: url,
		};
	} catch (err) {
		return { taskId: "", status: "failed", error: (err as Error).message };
	}
}

async function submitVideo(
	apiKey: string,
	input: GenerationInput,
	config: ProviderConfig,
): Promise<GenerationTask> {
	const baseUrl = (config.baseUrl as string | undefined) ?? PROXY_BASE_URL;
	const model = pickVideoModel(input.options);

	const content: Array<Record<string, unknown>> = [
		{ type: "text", text: input.prompt },
	];
	if (input.referenceUrl) {
		content.push({
			type: "image_url",
			image_url: { url: input.referenceUrl },
			role: "first_frame",
		});
	}

	const options = input.options ?? {};
	const body: Record<string, unknown> = {
		model,
		content,
		resolution: options.resolution ?? "720p",
		ratio: options.ratio ?? "16:9",
		duration: options.duration ?? 5,
		generate_audio: options.generateAudio ?? true,
	};

	try {
		const res = await fetch(`${baseUrl}/contents/generations/tasks`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${apiKey}`,
			},
			body: JSON.stringify(body),
		});
		const data = (await res.json()) as Record<string, unknown>;
		if (!res.ok) {
			return {
				taskId: "",
				status: "failed",
				error: extractError(data) ?? `HTTP ${res.status}`,
			};
		}
		const taskId = data.id as string | undefined;
		if (!taskId) {
			return {
				taskId: "",
				status: "failed",
				error: "No task id in Doubao video response",
			};
		}
		return { taskId, status: "pending" };
	} catch (err) {
		return { taskId: "", status: "failed", error: (err as Error).message };
	}
}

function extractError(data: Record<string, unknown>): string | undefined {
	const err = data.error as Record<string, unknown> | undefined;
	if (err?.message) return String(err.message);
	if (err?.code) return String(err.code);
	if (data.message) return String(data.message);
	return undefined;
}
