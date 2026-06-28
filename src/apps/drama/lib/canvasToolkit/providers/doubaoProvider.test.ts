import { describe, it, expect, beforeEach, vi } from "vitest";
import { createDoubaoProvider } from "./doubaoProvider";

describe("doubaoProvider", () => {
	beforeEach(() => {
		localStorage.clear();
		vi.restoreAllMocks();
	});

	it("is not configured without an api key", () => {
		const provider = createDoubaoProvider();
		expect(provider.isConfigured()).toBe(false);
	});

	it("reads api key from configure()", () => {
		const provider = createDoubaoProvider();
		provider.configure({ apiKey: "sk-test" });
		expect(provider.isConfigured()).toBe(true);
	});

	it("returns failed when api key missing", async () => {
		const provider = createDoubaoProvider();
		const task = await provider.submit({
			type: "image",
			capability: "text2image",
			prompt: "a cat",
		});
		expect(task.status).toBe("failed");
	});

	it("submits image generation and returns url", async () => {
		globalThis.fetch = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({ data: [{ url: "https://example.com/doubao.png" }] }),
		} as unknown as Response);

		const provider = createDoubaoProvider();
		provider.configure({ apiKey: "sk-test" });

		const task = await provider.submit({
			type: "image",
			capability: "text2image",
			prompt: "a cat",
		});

		expect(task.status).toBe("done");
		expect(task.resultUrl).toBe("https://example.com/doubao.png");
		expect(globalThis.fetch).toHaveBeenCalledWith(
			"http://localhost:3002/api/v1/proxy/doubao/images/generations",
			expect.objectContaining({
				method: "POST",
				headers: expect.objectContaining({ Authorization: "Bearer sk-test" }),
			}),
		);
	});

	it("uses configured model when provided", async () => {
		globalThis.fetch = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({ data: [{ url: "https://example.com/x.png" }] }),
		} as unknown as Response);

		const provider = createDoubaoProvider();
		provider.configure({ apiKey: "sk-test", model: "doubao-seed-2-0-pro" });

		await provider.submit({
			type: "image",
			capability: "text2image",
			prompt: "a cat",
		});

		const body = JSON.parse(
			(globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body,
		);
		expect(body.model).toBe("doubao-seed-2-0-pro");
	});

	it("submits video task and polls until done", async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					id: "task-1",
					data: { status: "queued" },
				}),
			} as unknown as Response)
			.mockResolvedValueOnce({
				ok: true,
				json: async () => ({
					id: "task-1",
					status: "succeeded",
					content: { video_url: "https://example.com/v.mp4" },
				}),
			} as unknown as Response);
		globalThis.fetch = fetchMock;

		const provider = createDoubaoProvider();
		provider.configure({ apiKey: "sk-test" });

		const task = await provider.submit({
			type: "video",
			capability: "text2video",
			prompt: "a dog running",
		});
		expect(task.status).toBe("pending");
		expect(task.taskId).toBe("task-1");

		const polled = await provider.poll!(task.taskId);
		expect(polled.status).toBe("done");
		expect(polled.resultUrl).toBe("https://example.com/v.mp4");
	});

	it("image2image sends reference image in body", async () => {
		globalThis.fetch = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({ data: [{ url: "https://example.com/x.png" }] }),
		} as unknown as Response);

		const provider = createDoubaoProvider();
		provider.configure({ apiKey: "sk-test" });

		await provider.submit({
			type: "image",
			capability: "image2image",
			prompt: "make it blue",
			referenceUrl: "https://example.com/source.png",
		});

		const body = JSON.parse(
			(globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body,
		);
		expect(body.image).toBe("https://example.com/source.png");
	});

	it("inpaint without mask degrades to image2image with reference", async () => {
		globalThis.fetch = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({ data: [{ url: "https://example.com/x.png" }] }),
		} as unknown as Response);

		const provider = createDoubaoProvider();
		provider.configure({ apiKey: "sk-test" });

		await provider.submit({
			type: "image",
			capability: "inpaint",
			prompt: "fill the gap",
			referenceUrl: "https://example.com/source.png",
		});

		expect(globalThis.fetch).toHaveBeenCalledTimes(1);
		const body = JSON.parse(
			(globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body,
		);
		expect(body.image).toBe("https://example.com/source.png");
	});

	it("styleTransfer sends image and style_reference", async () => {
		globalThis.fetch = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({ data: [{ url: "https://example.com/x.png" }] }),
		} as unknown as Response);

		const provider = createDoubaoProvider();
		provider.configure({ apiKey: "sk-test" });

		await provider.submit({
			type: "image",
			capability: "styleTransfer",
			prompt: "Style: watercolor.",
			referenceUrl: "https://example.com/source.png",
			options: { styleReferenceUrl: "https://example.com/style.png" },
		});

		const body = JSON.parse(
			(globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body,
		);
		expect(body.image).toBe("https://example.com/source.png");
		expect(body.style_reference).toBe("https://example.com/style.png");
	});

	it("text2image does not include image field when no referenceUrl", async () => {
		globalThis.fetch = vi.fn().mockResolvedValue({
			ok: true,
			json: async () => ({ data: [{ url: "https://example.com/x.png" }] }),
		} as unknown as Response);

		const provider = createDoubaoProvider();
		provider.configure({ apiKey: "sk-test" });

		await provider.submit({
			type: "image",
			capability: "text2image",
			prompt: "a cat",
		});

		const body = JSON.parse(
			(globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body,
		);
		expect(body.image).toBeUndefined();
	});
});