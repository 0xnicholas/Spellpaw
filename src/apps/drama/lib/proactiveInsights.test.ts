import { describe, it, expect } from "vitest";
import {
	computeProactiveInsights,
	formatInsightsAsMessage,
} from "./proactiveInsights";
import type { TreeNode } from "@drama/types";

function makeProject(title: string): TreeNode {
	return {
		id: "root",
		type: "project",
		title,
		status: "draft",
		children: [],
	};
}

function makeAct(
	id: string,
	title: string,
	sceneCount: number,
	sceneDurations: number[],
): TreeNode {
	return {
		id,
		type: "act",
		title,
		status: "draft",
		children: Array.from({ length: sceneCount }, (_, i) => ({
			id: `${id}-s${i}`,
			type: "scene",
			title: `Scene ${i}`,
			status: "draft",
			metadata: {
				duration: sceneDurations[i] ?? 30,
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			},
			children: [],
		})),
	};
}

describe("computeProactiveInsights", () => {
	it("returns empty list for null tree", () => {
		expect(computeProactiveInsights(null, "测试")).toEqual([]);
	});

	it("flags critical issue when project has no acts", () => {
		const insights = computeProactiveInsights(makeProject("测试"), "测试");
		const coverage = insights.find((i) => i.id === "coverage:no-acts");
		expect(coverage).toBeDefined();
		expect(coverage?.severity).toBe("critical");
		expect(coverage?.suggestedPrompt).toContain("kickstart");
	});

	it("flags missing scenes when acts exist but scenes are empty", () => {
		const project = makeProject("测试");
		project.children = [makeAct("act1", "第一幕", 0, [])];
		const insights = computeProactiveInsights(project, "测试");
		const noScenes = insights.find((i) => i.id === "coverage:no-scenes");
		expect(noScenes).toBeDefined();
		expect(noScenes?.severity).toBe("critical");
	});

	it("flags missing shots when scenes exist but have no children", () => {
		const project = makeProject("测试");
		project.children = [makeAct("act1", "第一幕", 2, [30, 40])];
		const insights = computeProactiveInsights(project, "测试");
		const noShots = insights.find((i) => i.id === "coverage:no-shots");
		expect(noShots).toBeDefined();
		expect(noShots?.severity).toBe("info");
	});

	it("recommends suspense template for suspense-titled project", () => {
		const project = makeProject("密室逃脱");
		project.children = [makeAct("act1", "第一幕", 1, [30])];
		const insights = computeProactiveInsights(project, "密室逃脱");
		const template = insights.find((i) => i.kind === "template");
		expect(template).toBeDefined();
		expect(template?.id).toBe("template:suspense-reversal");
	});

	it("recommends romance template for sweet-romance titled project", () => {
		const project = makeProject("甜宠霸总");
		project.children = [makeAct("act1", "第一幕", 1, [30])];
		const insights = computeProactiveInsights(project, "甜宠霸总的爱情故事");
		const template = insights.find((i) => i.kind === "template");
		expect(template).toBeDefined();
		expect(template?.id).toBe("template:sweet-romance");
	});

	it("does not recommend template when title has no genre keywords", () => {
		const project = makeProject("测试");
		project.children = [makeAct("act1", "第一幕", 1, [30])];
		const insights = computeProactiveInsights(project, "测试");
		expect(insights.find((i) => i.kind === "template")).toBeUndefined();
	});

	it("produces unique insight IDs (no duplicates)", () => {
		const project = makeProject("测试");
		project.children = [makeAct("act1", "第一幕", 2, [30, 30])];
		const insights = computeProactiveInsights(project, "测试");
		const ids = insights.map((i) => i.id);
		expect(new Set(ids).size).toBe(ids.length);
	});
});

describe("formatInsightsAsMessage", () => {
	it("returns empty string for no insights", () => {
		expect(formatInsightsAsMessage([])).toBe("");
	});

	it("formats insights with severity icons and titles", () => {
		const message = formatInsightsAsMessage([
			{
				id: "test",
				kind: "structure",
				severity: "warning",
				title: "结构问题",
				message: "缺一幕",
				suggestedPrompt: "套用模板",
			},
		]);
		expect(message).toContain("⚠️");
		expect(message).toContain("结构问题");
		expect(message).toContain("缺一幕");
		expect(message).toContain("套用模板");
	});

	it("uses critical icon for critical insights", () => {
		const message = formatInsightsAsMessage([
			{
				id: "crit",
				kind: "coverage",
				severity: "critical",
				title: "严重问题",
				message: "no acts",
			},
		]);
		expect(message).toContain("🔴");
	});

	it("uses 💡 for info insights", () => {
		const message = formatInsightsAsMessage([
			{
				id: "info",
				kind: "template",
				severity: "info",
				title: "模板推荐",
				message: "use suspense-reversal",
			},
		]);
		expect(message).toContain("💡");
	});
});
