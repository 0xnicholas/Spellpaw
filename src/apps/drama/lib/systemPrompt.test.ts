import { describe, it, expect } from "vitest";
import { buildSystemPrompt } from "./systemPrompt";
import { listProviders, providerRegistry } from "./canvasToolkit";

describe("buildSystemPrompt — dynamic provider list", () => {
	it("includes every registered provider id in the toolkit section", () => {
		const prompt = buildSystemPrompt("测试项目", "");
		const providers = listProviders();
		expect(providers.length).toBeGreaterThan(0);
		for (const p of providers) {
			expect(prompt).toContain(p.id);
		}
	});

	it("includes the display name for each provider", () => {
		const prompt = buildSystemPrompt("测试项目", "");
		const providers = listProviders();
		for (const p of providers) {
			expect(prompt).toContain(p.name);
		}
	});

	it("reflects the toolkit section header and fallback rule", () => {
		const prompt = buildSystemPrompt("测试项目", "");
		expect(prompt).toContain("## 画布内容生成工具包");
		expect(prompt).toContain(
			"按注册顺序自动选择已配置且支持请求能力的 provider",
		);
	});

	it("matches actual provider ids known to the registry", () => {
		const prompt = buildSystemPrompt("测试项目", "");
		const ids = providerRegistry.ids();
		expect(ids).toContain("openai");
		expect(ids).toContain("doubao");
		expect(ids).toContain("siliconflow");
		expect(ids).toContain("mock");
		for (const id of ids) {
			expect(prompt).toContain(id);
		}
	});
});
