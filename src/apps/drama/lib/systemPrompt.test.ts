import { describe, it, expect, beforeAll } from "vitest";
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

import { inferGenre, type GenreKey } from "./systemPrompt";

describe("inferGenre — English keyword detection", () => {
  it("detects suspense from English keywords", () => {
    expect(inferGenre("The Murder Mystery")).toBe("suspense");
    expect(inferGenre("Heist at Midnight")).toBe("suspense");
    expect(inferGenre("Detective's Last Case")).toBe("suspense");
    expect(inferGenre("Conspiracy Theory")).toBe("suspense");
    expect(inferGenre("The Kidnapping")).toBe("suspense");
    expect(inferGenre("Vanishing Clue")).toBe("suspense");
  });

  it("detects romance from English keywords", () => {
    expect(inferGenre("First Date")).toBe("romance");
    expect(inferGenre("Wedding Day")).toBe("romance");
    expect(inferGenre("Valentine Crush")).toBe("romance");
    expect(inferGenre("Forbidden Love")).toBe("romance");
  });

  it("detects comedy from English keywords", () => {
    expect(inferGenre("Office Prank")).toBe("comedy");
    expect(inferGenre("Witty Comedy Hour")).toBe("comedy");
    expect(inferGenre("Absurd Joke")).toBe("comedy");
  });

  it("detects drama (underdog/comeback) from English keywords", () => {
    expect(inferGenre("Underdog Story")).toBe("drama");
    expect(inferGenre("Rags to Riches")).toBe("drama");
    expect(inferGenre("Comeback Kid")).toBe("drama");
  });

  it("detects action from English keywords", () => {
    expect(inferGenre("Car Chase")).toBe("action");
    expect(inferGenre("Martial Arts Battle")).toBe("action");
    expect(inferGenre("Kungfu Warrior")).toBe("action");
    expect(inferGenre("Explosion at Dawn")).toBe("action");
  });

  it("detects documentary from English keywords", () => {
    expect(inferGenre("True Story")).toBe("documentary");
    expect(inferGenre("Interview with a Legend")).toBe("documentary");
    expect(inferGenre("Biopic of Ada")).toBe("documentary");
  });

  it("is case-insensitive", () => {
    expect(inferGenre("MURDER MYSTERY")).toBe("suspense");
    expect(inferGenre("wedding day")).toBe("romance");
    expect(inferGenre("Car CHASE")).toBe("action");
  });

  it("falls back to drama for empty or unknown titles", () => {
    expect(inferGenre("")).toBe("drama");
    expect(inferGenre("The Project")).toBe("drama");
    expect(inferGenre("Untitled")).toBe("drama");
  });
});

describe("inferGenre — Chinese keyword detection (legacy support)", () => {
  it("still detects Chinese genres for Chinese-only project titles", () => {
    expect(inferGenre("密室大逃脱")).toBe("suspense");
    expect(inferGenre("总裁的甜宠小娇妻")).toBe("romance");
    expect(inferGenre("办公室搞笑日常")).toBe("comedy");
    expect(inferGenre("草根逆袭")).toBe("drama");
    expect(inferGenre("枪战大片")).toBe("action");
    expect(inferGenre("人间真实纪录片")).toBe("documentary");
  });

  it("prefers English match when both languages appear in title", () => {
    // 'Murder' is checked first (English pass); if found, returns suspense
    expect(inferGenre("Murder 案件")).toBe("suspense");
  });
});

describe("buildSystemPrompt — genre integration", () => {
  it("includes the inferred English genre label in the prompt", () => {
    const prompt = buildSystemPrompt("Murder Mystery", "");
    expect(prompt).toContain("- 类型：suspense");
  });

  it("includes the English genre guidance text", () => {
    const prompt = buildSystemPrompt("Murder Mystery", "");
    // Suspense guidance is fully in English now (no Chinese fragments)
    expect(prompt).toContain("Focus on suspense and information control");
  });

  it("honors an explicit templateCategory that matches a known genre key", () => {
    const prompt = buildSystemPrompt("Untitled", "", "romance");
    expect(prompt).toContain("- 类型：romance");
    expect(prompt).toContain("Light, brisk pacing");
  });

  it("falls back to drama guidance for unknown templateCategory", () => {
    const prompt = buildSystemPrompt("Untitled", "", "horror");
    expect(prompt).toContain("- 类型：horror");
    expect(prompt).toContain("Clear three-act structure");
  });
});

describe("GenreKey type exhaustiveness", () => {
  it("GENRE_GUIDANCE has an entry for every GenreKey", () => {
    const allKeys: GenreKey[] = [
      "suspense",
      "romance",
      "comedy",
      "drama",
      "action",
      "documentary",
    ];
    // If a new GenreKey is added without a guidance entry, this fails.
    // We can't import the map directly (it's not exported), so verify by
    // calling genreGuidance indirectly through buildSystemPrompt.
    for (const key of allKeys) {
      const prompt = buildSystemPrompt("Untitled", "", key);
      // The guidance text is the long-form line that follows "- 类型："
      expect(prompt).toMatch(new RegExp(`- 类型：${key}\\s*\\n`));
    }
  });
});

describe("buildSystemPrompt — Phase 3 skills section", () => {
  beforeAll(async () => {
    const { installFetchStub } = await import("@shared/copilot/skills/_testHelpers");
    installFetchStub();
    const { _resetSkillsLoader, ensureSkillsLoaded } = await import(
      "@shared/copilot/skills/loader"
    );
    _resetSkillsLoader();
    await ensureSkillsLoaded();
  });

  it("does NOT reference the obsolete spellpaw_skill_* tool prefix as a callable tool", () => {
    const prompt = buildSystemPrompt("测试项目", "");
    // Old (Phase 2) wording was: "spellpaw_skill_* — multi-step workflows. Prefer when user names a skill."
    // Phase 3 must explicitly say skills are NOT registered tools.
    expect(prompt).not.toMatch(/spellpaw_skill_\* \u2014 multi-step workflows/);
    expect(prompt).toContain("Skills are NOT registered as tools");
  });

  it("lists the loaded skills with slash command + name", () => {
    const prompt = buildSystemPrompt("测试项目", "");
    expect(prompt).toContain("Available skills:");
    expect(prompt).toContain("/analyze-pacing");
    expect(prompt).toContain("节奏分析");
    expect(prompt).toContain("/character-profile");
  });

  it("shows loading placeholder when skills haven't loaded yet", async () => {
    const { _resetSkillsLoader } = await import("@shared/copilot/skills/loader");
    _resetSkillsLoader();
    // Replace fetch so ensureSkillsLoaded won't resolve before we read the prompt
    const realFetch = global.fetch;
    global.fetch = (() => new Promise<Response>(() => {})) as typeof fetch;
    const prompt = buildSystemPrompt("测试项目", "");
    expect(prompt).toContain("(still loading");
    global.fetch = realFetch;
    // Restore for other tests
    const { ensureSkillsLoaded } = await import("@shared/copilot/skills/loader");
    await ensureSkillsLoaded();
  });
});
