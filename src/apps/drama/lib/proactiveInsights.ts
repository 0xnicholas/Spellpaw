/**
 * Proactive Insights — Buzzy "Proactive Video Agent" equivalent.
 *
 * Instead of waiting for the user to ask, the agent periodically scans
 * the project and pushes actionable suggestions into the chat:
 *  - structural completeness (missing acts/scenes based on template genre)
 *  - pacing issues (per analyzePacing)
 *  - template recommendations (per match_template scoring)
 *  - visual coverage gaps (scenes without art / sceneCard)
 *
 * Insights are produced as a pure function so they're easy to test.
 * The chat store wires them in as agent "suggestion" messages.
 */

import type { TreeNode } from "@drama/types";
import {
	analyzePacing,
	suggestCompletions,
	generatePacingReport,
} from "./projectAnalysis";

export type InsightSeverity = "info" | "warning" | "critical";

export type InsightKind = "structure" | "pacing" | "template" | "coverage";

export interface ProactiveInsight {
	/** Stable id so we can dedupe across runs. */
	id: string;
	kind: InsightKind;
	severity: InsightSeverity;
	title: string;
	message: string;
	/** Suggested next action the user could ask the agent to take. */
	suggestedPrompt?: string;
}

/** Count nodes of a given type under root (project → acts → scenes → shots). */
function countNodes(tree: TreeNode): {
	acts: number;
	scenes: number;
	shots: number;
	withArt: number;
	withSceneCard: number;
} {
	const acts = tree.children ?? [];
	let scenes = 0;
	let shots = 0;
	const withArt = 0;
	const withSceneCard = 0;
	for (const act of acts) {
		for (const scene of act.children ?? []) {
			scenes++;
			shots += (scene.children ?? []).length;
			const linkedIds = new Set<string>();
			for (const child of scene.children ?? []) linkedIds.add(child.id);
			// We don't have direct tree → canvas links here; the canvasStore would need
			// to be passed in for full accuracy. For now we report coverage as 0 so
			// the caller can decide whether to attach canvas state separately.
			void linkedIds;
		}
	}
	return { acts: acts.length, scenes, shots, withArt, withSceneCard };
}

/** Built-in template catalogue (subset — we keep IDs only). */
const BUILTIN_TEMPLATES = [
	{ id: "suspense-reversal", name: "悬疑反转", category: "suspense" },
	{ id: "sweet-romance", name: "甜宠短剧", category: "romance" },
	{ id: "comedy-twist", name: "喜剧反转", category: "comedy" },
	{ id: "underdog-comeback", name: "励志逆袭", category: "drama" },
	{ id: "mini-documentary", name: "短纪录片", category: "documentary" },
];

/** Match a project title/description against template keyword heuristics. */
function detectGenre(title: string, description?: string): string | undefined {
	const corpus = `${title} ${description ?? ""}`.toLowerCase();
	const keywordMap: Array<{ category: string; keys: string[] }> = [
		{
			category: "suspense",
			keys: [
				"悬疑",
				"密室",
				"反转",
				"侦探",
				"凶杀",
				"失踪",
				"真相",
				"阴谋",
				"惊悚",
				"犯罪",
			],
		},
		{
			category: "romance",
			keys: [
				"甜宠",
				"恋爱",
				"爱情",
				"霸道",
				"总裁",
				"心动",
				"初恋",
				"约会",
				"浪漫",
				"甜蜜",
			],
		},
		{
			category: "comedy",
			keys: ["喜剧", "搞笑", "幽默", "段子", "荒诞", "讽刺", "无厘头"],
		},
		{
			category: "drama",
			keys: [
				"励志",
				"逆袭",
				"奋斗",
				"成长",
				"追梦",
				"突破",
				"翻身",
				"成功",
				"创业",
			],
		},
		{
			category: "documentary",
			keys: ["纪录", "纪实", "访谈", "纪录片", "人文", "历史"],
		},
	];
	let best: { category: string; hits: number } | undefined;
	for (const { category, keys } of keywordMap) {
		const hits = keys.filter((k) => corpus.includes(k)).length;
		if (!best || hits > best.hits) best = { category, hits };
	}
	return best && best.hits > 0 ? best.category : undefined;
}

/** Produce the list of proactive insights for the current project state. */
export function computeProactiveInsights(
	tree: TreeNode | null | undefined,
	projectTitle: string,
	projectDescription?: string,
): ProactiveInsight[] {
	if (!tree) return [];

	const insights: ProactiveInsight[] = [];
	const counts = countNodes(tree);

	// 1. Structural completeness
	const completions = suggestCompletions(tree);
	for (const c of completions) {
		insights.push({
			id: `completion:${c.message}`,
			kind: "structure",
			severity: c.severity === "warning" ? "warning" : "info",
			title: c.severity === "warning" ? "结构需要补全" : "结构优化建议",
			message: c.message,
			suggestedPrompt:
				c.severity === "warning"
					? "是否补全这些节点？我可以为你展开。"
					: "要不要我按这个建议优化？",
		});
	}

	// 2. Pacing issues
	const pacing = analyzePacing(tree);
	for (const issue of pacing) {
		insights.push({
			id: `pacing:${issue.nodeId ?? "tree"}:${issue.message}`,
			kind: "pacing",
			severity: issue.severity === "warning" ? "warning" : "info",
			title: "节奏问题",
			message: issue.message,
			suggestedPrompt: issue.nodeId
				? `请帮我优化节点 ${issue.nodeId} 的时长`
				: "请生成节奏优化方案",
		});
	}

	// 3. Coverage gaps
	if (counts.acts === 0) {
		insights.push({
			id: "coverage:no-acts",
			kind: "coverage",
			severity: "critical",
			title: "项目还没有幕",
			message: "当前项目只有树根节点，需要先创建至少 1 幕才能开始编排。",
			suggestedPrompt: "用 spellpaw_kickstart_project 创建一个三幕结构",
		});
	} else if (counts.scenes === 0) {
		insights.push({
			id: "coverage:no-scenes",
			kind: "coverage",
			severity: "critical",
			title: "幕下没有场景",
			message: `${counts.acts} 幕项目目前没有任何场景，无法生成节奏分析或分镜。`,
			suggestedPrompt: "为每个幕添加 2-3 个场景",
		});
	} else if (counts.scenes > 0 && counts.shots === 0) {
		insights.push({
			id: "coverage:no-shots",
			kind: "structure",
			severity: "info",
			title: "场景还没有镜头",
			message: `${counts.scenes} 个场景还没有分解到镜头级别，可以为关键场景补充分镜。`,
			suggestedPrompt: "为最关键的场景展开 2-3 个镜头",
		});
	}

	// 4. Template recommendation
	const genre = detectGenre(projectTitle, projectDescription);
	if (genre && counts.acts > 0) {
		const template = BUILTIN_TEMPLATES.find((t) => t.category === genre);
		if (template) {
			insights.push({
				id: `template:${template.id}`,
				kind: "template",
				severity: "info",
				title: "模板推荐",
				message: `项目题材像是「${template.name}」，可以使用对应模板补全节点。`,
				suggestedPrompt: `套用模板 ${template.id}`,
			});
		}
	}

	// 5. Heavy scene concentration
	const report = generatePacingReport(tree);
	if (report.sceneCount >= 3 && report.overallStatus !== "good") {
		insights.push({
			id: `pacing:overall:${report.overallStatus}`,
			kind: "pacing",
			severity: "info",
			title: "整体节奏可优化",
			message: `节奏报告判定为「${report.overallStatus === "warning" ? "一般" : "需优化"}」，离散系数 ${(report.avgSceneDuration > 0 ? (report.durationStdDev / report.avgSceneDuration) * 100 : 0).toFixed(0)}%。可以运行 dryRun 预览优化方案。`,
			suggestedPrompt: "用 spellpaw_optimize_pacing 预览节奏优化方案",
		});
	}

	return insights;
}

/** Convert insights to a chat-message-style text body for the agent to post. */
export function formatInsightsAsMessage(insights: ProactiveInsight[]): string {
	if (insights.length === 0) return "";
	const sections = insights.map((insight) => {
		const severityIcon =
			insight.severity === "critical"
				? "🔴"
				: insight.severity === "warning"
					? "⚠️"
					: "💡";
		return `${severityIcon} **${insight.title}**\n${insight.message}${insight.suggestedPrompt ? `\n  → 试试：「${insight.suggestedPrompt}」` : ""}`;
	});
	return `我刚扫了一遍你的项目，发现 ${insights.length} 条主动建议：\n\n${sections.join("\n\n")}`;
}
