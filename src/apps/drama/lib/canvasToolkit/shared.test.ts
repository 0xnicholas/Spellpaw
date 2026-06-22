import { describe, it, expect, beforeEach } from "vitest";
import { listProviderIds, listProviders, pollUntilDone } from "./shared";
import { providerRegistry } from "./registry";
import type { GenerationProvider, GenerationTask } from "./types";

function fakeProvider(id: string, name = id): GenerationProvider {
	return {
		id,
		name,
		supportedMedia: ["image"],
		capabilities: ["text2image"],
		requiredConfigKeys: [`${id}Key`],
		isConfigured: () => true,
		configure: () => {},
		estimateCost: () => ({ amount: 1, unit: "image" }),
		submit: async () => ({
			taskId: "t",
			status: "done",
			resultUrl: "https://x",
		}),
	};
}

describe("shared helpers — dynamic provider list", () => {
	beforeEach(() => {
		providerRegistry.clear();
	});

	it("listProviderIds reflects the current registry state", () => {
		providerRegistry.register(fakeProvider("doubao"));
		providerRegistry.register(fakeProvider("openai"));
		expect(listProviderIds()).toEqual(["doubao", "openai"]);
	});

	it("listProviders returns id + name pairs", () => {
		providerRegistry.register(fakeProvider("doubao", "豆包"));
		providerRegistry.register(fakeProvider("siliconflow", "硅基流动"));
		expect(listProviders()).toEqual([
			{ id: "doubao", name: "豆包" },
			{ id: "siliconflow", name: "硅基流动" },
		]);
	});

	it("returns empty arrays when registry is cleared", () => {
		providerRegistry.register(fakeProvider("mock"));
		providerRegistry.clear();
		expect(listProviderIds()).toEqual([]);
		expect(listProviders()).toEqual([]);
	});

	it("preserves registration order", () => {
		providerRegistry.register(fakeProvider("z"));
		providerRegistry.register(fakeProvider("a"));
		providerRegistry.register(fakeProvider("m"));
		expect(listProviderIds()).toEqual(["z", "a", "m"]);
	});
});

describe("pollUntilDone", () => {
	function makeMockProvider(sequence: GenerationTask[]): GenerationProvider {
		let i = 0;
		return {
			id: "mock",
			name: "Mock",
			supportedMedia: ["image"],
			capabilities: ["text2image"],
			requiredConfigKeys: [],
			isConfigured: () => true,
			configure: () => {},
			estimateCost: () => ({ amount: 0, unit: "USD" }),
			submit: async () => ({ taskId: "t1", status: "pending" }),
			poll: async () =>
				sequence[i++] ?? { taskId: "t1", status: "done", resultUrl: "https://x" },
		};
	}

	it("returns when task is done", async () => {
		const provider = makeMockProvider([
			{ taskId: "t1", status: "done", resultUrl: "https://final" },
		]);
		const result = await pollUntilDone(
			provider,
			"t1",
			() => {},
			new AbortController().signal,
		);
		expect(result.resultUrl).toBe("https://final");
	});

	it("throws on failed task", async () => {
		const provider = makeMockProvider([
			{ taskId: "t1", status: "failed", error: "oops" },
		]);
		await expect(
			pollUntilDone(provider, "t1", () => {}, new AbortController().signal),
		).rejects.toThrow("oops");
	});

	it("polls until done and calls onProgress", async () => {
		const provider = makeMockProvider([
			{ taskId: "t1", status: "processing" },
			{ taskId: "t1", status: "processing" },
			{ taskId: "t1", status: "done", resultUrl: "https://x" },
		]);
		const progresses: number[] = [];
		await pollUntilDone(
			provider,
			"t1",
			(p) => progresses.push(p),
			new AbortController().signal,
		);
		expect(progresses.length).toBeGreaterThan(0);
	});

	it("throws AbortError when signal is aborted mid-poll", async () => {
		const provider = makeMockProvider([
			{ taskId: "t1", status: "processing" },
			{ taskId: "t1", status: "processing" },
			{ taskId: "t1", status: "done", resultUrl: "https://x" },
		]);
		const ac = new AbortController();
		setTimeout(() => ac.abort(), 100);
		await expect(
			pollUntilDone(provider, "t1", () => {}, ac.signal),
		).rejects.toThrow(/Aborted|Abort/);
	});
});
