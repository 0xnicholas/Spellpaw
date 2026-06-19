import { describe, it, expect, beforeEach } from "vitest";
import { listProviderIds, listProviders } from "./shared";
import { providerRegistry } from "./registry";
import type { GenerationProvider } from "./types";

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
