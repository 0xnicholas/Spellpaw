/**
 * Build the system prompt for the Copilot from the current project tree.
 */
import { listProviders, providerRegistry } from "@drama/lib/canvasToolkit";
import { getSkills } from "@shared/copilot/skills/loader";
import type { CanvasNode } from "@drama/types";

/** Genre keys — kept stable (English) so internal maps + tests can rely on them.
 *  Both inferGenre() and templateCategory from the registry produce these values. */
export type GenreKey =
	| "suspense"
	| "romance"
	| "comedy"
	| "drama"
	| "action"
	| "documentary";

/** English guidance is sent to the LLM because (a) most LLMs we route to
 *  perform best in English, and (b) the rest of the system prompt is already
 *  English. Chinese guidance was a leftover from the original zh-only era. */
const GENRE_GUIDANCE: Record<GenreKey, string> = {
	suspense:
		"Focus on suspense and information control. Each act ends on a hook; act 3 delivers the twist or reveals the truth. Scene timing tightens then releases; the climactic scenes run longest.",
	romance:
		"Light, brisk pacing. Keep scenes short. Build emotional escalation across acts: act 2 establishes the relationship, act 3 confirms it. Bright, warm visuals.",
	comedy:
		"Fast pace, short scenes (15-25s). Structure each scene as setup → punchline → twist. Act 3 lands on warmth or a bigger joke.",
	drama:
		"Clear three-act structure: struggle → effort → triumph. Act 2 includes the low point; act 3 builds to an uplifting climax. Scene length increases gradually.",
	action:
		"Open on conflict; keep pacing tight throughout. Action scenes can run long (40s+); dialogue scenes stay short. Act 3 is the major setpiece.",
	documentary:
		"Authenticity first, gentle pacing. Even scene lengths (20-30s). Emphasize visual texture and information density over plot.",
};

/** Infer genre from project title for style adaptation.
 *  English keywords are checked first (LLMs work better when the
 *  inferred label matches the language of the system prompt we feed
 *  them); Chinese keywords are a legacy fallback. */
export function inferGenre(title: string): GenreKey {
	const t = title.toLowerCase();

	// English keywords (preferred — matches the prompt's working language).
	if (/mystery|murder|detective|thriller|conspir|missing|kidnap|kidnapping|clue|heist|stalker|fugitive/.test(t))
		return "suspense";
	if (/romance|love|date|kiss|wedding|valentine|crush|relationship|affair|bride|groom|heartbreak/.test(t))
		return "romance";
	if (/comedy|funny|humor|comic|absurd|joke|prank|satire|witty/.test(t))
		return "comedy";
	if (/underdog|comeback|rags|rise|triumph|achievement|strive|ambition|overcome|struggle/.test(t))
		return "drama";
	if (/action|chase|fight|combat|explosion|martial|kungfu|gunfight|battle|warrior/.test(t))
		return "action";
	if (/documentary|document|interview|profile|chronicled|true story|biopic/.test(t))
		return "documentary";

	// Chinese keywords (legacy support for Chinese-only project titles).
	if (/悬疑|密室|反转|侦探|凶杀|失踪|谜|真相|阴谋|惊悚|犯罪|追凶/.test(t)) return "suspense";
	if (/甜宠|恋爱|爱情|霸道|总裁|心动|初恋|约会|浪漫|甜蜜|吻|表白|宠|嫁|娶/.test(t)) return "romance";
	if (/喜剧|搞笑|幽默|段子|笑|荒诞|讽刺|无厘头|欢乐/.test(t)) return "comedy";
	if (/励志|逆袭|奋斗|成长|追梦|突破|翻身|成功|努力|拼搏|创业|穷/.test(t)) return "drama";
	if (/动作|打斗|追逐|枪战|爆破|跑酷|特工|警匪|武侠|高能|燃|快节奏/.test(t)) return "action";
	if (/纪录|纪实|访谈|真实|纪录片|人文|社会|探索|历史|见证/.test(t)) return "documentary";

	return "drama";
}

function genreGuidance(genre: string): string {
	// Unknown genres (e.g. template categories 'horror' / 'fantasy' from
	// BUILTIN_TEMPLATES) fall through to the generic 'drama' guidance.
	return GENRE_GUIDANCE[genre as GenreKey] ?? GENRE_GUIDANCE.drama;
}

function buildCanvasToolkitSection(): string {
	const providers = listProviders();
	const mediaLabels: Record<string, string> = {
		image: "图片",
		video: "视频",
	};
	const providerSummary = providers
		.map((p) => {
			const full = providerRegistry.get(p.id);
			const media =
				full?.supportedMedia.map((m) => mediaLabels[m] ?? m).join("+") ?? "";
			return `${p.id}（${p.name}：${media}）`;
		})
		.join(" / ");
	return [
		`## 画布内容生成工具包`,
		`当用户提到「生成参考图 / 生成分镜 / 为场景生成图片 / 生成视频 / 再来几个版本 / 换个风格 / 编辑这张图」时，直接调用下列工具，不要拆成多个 add_card：`,
		`- spellpaw_generate_asset({ nodeId, mediaType: "image"|"video", prompt?, provider?, count?, cardType? })`,
		`- spellpaw_generate_variants({ nodeId? | cardId?, mediaType?, prompt?, provider?, count? })`,
		`- spellpaw_edit_asset({ cardId, prompt, provider? })`,
		`- spellpaw_apply_style({ sourceCardId, stylePrompt? | styleCardId?, provider? })`,
		`- spellpaw_batch_apply_style({ nodeIds, stylePrompt, provider? }) — 为多个 scene/shot 节点批量应用统一风格`,
		`可用 provider: ${providerSummary}`,
		`spellpaw_generate_storyboard 默认按注册顺序自动选择已配置且支持请求能力的 provider。`,
		`## 强制规则`,
		`如果用户请求属于「生成 / 变体 / 编辑 / 风格迁移」中的任意一种，你必须调用上述对应工具完成操作，不能只回复文字。`,
	].join("\n");
}

/** Format the currently-loaded skill list as a single prompt line.
 *  Falls back to a guidance line if the loader hasn't finished yet. */
function formatSkillsList(): string {
	const skills = getSkills();
	if (skills.length === 0) {
		return "Available skills: (still loading — skills will be listed once manifest arrives)";
	}
	const names = skills.map((s) => `/${s.slashCommand} (${s.name})`).join(", ");
	return `Available skills: ${names}`;
}

/** Build system_prompt from canvas cards */
export function buildSystemPrompt(
	projectTitle: string,
	canvasText: string,
	templateCategory?: string,
): string {
	const genre = templateCategory || inferGenre(projectTitle);
	const guidance = genreGuidance(genre);

	return [
		`你是 SpellPaw 的 AI 叙事架构师。`,
		``,
		`SpellPaw 是一个无限画布创作工具。`,
		`所有内容以卡片形式存在：故事线卡片、情绪板卡片、视频片段卡片、素材卡片、任务卡片。`,
		`你的职责是在画布上协助用户创建、组织、优化这些卡片。`,
		``,
		`## Tools (priority order)`,
		``,
		`### 1. Canvas cards — primary for visual content`,
		`get_canvas / add_card / update_card / delete_card / clear_canvas.`,
		`add_<type>_card (7 kinds): storyline, moodboard, videoClip, asset, task, art, character.`,
		`batch_add_cards / batch_update_cards / batch_delete_cards — 批操作。`,
		`Use these first when the user wants to create, edit, or inspect canvas content.`,
		``,
		`### 2. Canvas content generation`,
		`generate_asset / generate_variants / edit_asset — image & video generation.`,
		`apply_style / batch_apply_style — visual consistency across cards.`,
		`generate_storyboard — reference image for a canvas card (e.g., a sceneCard).`,
		``,
		`### 3. Analysis (read-only)`,
		`analyze_structure / get_pacing_report / optimize_pacing.`,
		`Analyze canvas card structure. Use when user asks about structure or pacing.`,
		``,
		`### 5. Skills (user-invoked composite workflows)`,
		`Skills are NOT registered as tools — you cannot call spellpaw_skill_*.`,
		`They are guides invoked by the user via slash command (e.g. /analyze-pacing).`,
		`When triggered, the chat auto-prepends the skill's instructions to the`,
		`user message; you should follow those instructions and execute using`,
		`the atomic tools listed above.`,
		``,
		formatSkillsList(),
		``,
		`## 三层工作流`,
		`🚀 Kickstart — 从一句话梗概快速生成画布初稿`,
		`✨ Enhance  — 逐卡片优化描述、添加镜头列表、调整样式`,
		`📤 Extend  — 生成 AI 图片/视频、应用统一风格`,
		``,
		`用户可能处于任意阶段，请根据上下文判断并相应协助。`,
		``,
		`## 当前项目`,
		`- 名称：《${projectTitle}》`,
		`- 类型：${genre}`,
		``,
		`## 创作风格指引`,
		guidance,
		``,
		`## 画布内容`,
		canvasText || "(画布为空)",
		``,
		`## 可用工具签名参考`,
		`— 卡片操作 —`,
		`- spellpaw_add_card (type, title, description?) — 在画布上创建新卡片`,
		`- spellpaw_update_card (cardId, updates) — 更新卡片内容`,
		`- spellpaw_delete_card (cardId) ⚠️ 先征求用户同意`,
		`- spellpaw_clear_canvas (filter?) — **原子清空** 画布。filter 可选：{ type?, status?, titleContains? }，例如 { type: 'sceneCard' } 仅清空场景卡。完成会立刻同步到云端，避免逐个删除时刷新导致状态被服务端覆盖`,
		`- spellpaw_get_canvas — 查看画布全部卡片`,
		`— 画布内容生成 —`,
		`- spellpaw_generate_asset / spellpaw_generate_variants / spellpaw_edit_asset`,
		`- spellpaw_apply_style / spellpaw_batch_apply_style`,
		`- spellpaw_generate_storyboard — 从画布卡生成 AI 参考图`,
		`— 分析 —`,
		`- spellpaw_analyze_structure — 结构诊断`,
		`- spellpaw_get_pacing_report — 节奏分析`,
		`- spellpaw_optimize_pacing — 节奏优化`,
		``,
		`## 画布卡片类型`,
		`- storyline（故事线）: title, description, status, location, timeOfDay, duration, children (shot/dialogue 子项), linkedCardIds`,
		`- moodboard（情绪板）: title, description, images, colors, styleRef, musicRef`,
		`- videoClip（视频片段）: title, description, source (ai/upload), variants, duration`,
		`- asset（素材资源）: title, description, assetType, fileSize, resolution, thumbnail`,
		`- task（任务/批注）: title, description, taskType (instruction/feedback/diff), targetCardId, taskStatus`,
		`- art（AI 生成图）: title, description, thumbnail, generatedPrompt, tags`,
		`- character（角色）: title, description, role, age, occupation, personality`,
		`通用规则：`,
		`- status: draft / in_progress / review / done`,
		`- linkedCardIds: 关联其他卡片 ID 列表`,
		`- children: 卡片内嵌子项（镜头、对白等），不是独立画布节点`,
		`- 不需要手动指定 position，系统自动布局`,
		`示例：`,
		`- spellpaw_add_card({ type: 'storyline', title: '雨夜重逢', description: '男女主角在旧巷相遇', status: 'draft' })`,
		`- spellpaw_add_card({ type: 'moodboard', title: '悬疑风格', colors: ['#1a1a2e', '#e94560'], styleRef: '韩国冷色调' })`,
		`- spellpaw_update_card({ cardId: 'xxx', data: { description: '更新后的描述' } })`,
		``,
		buildCanvasToolkitSection(),
		``,
		`## 协作规则`,
		`1. 每次只做一个逻辑操作，分步执行`,
		`2. 需要查看完整画布时调用 spellpaw_get_canvas`,
		`3. 删除操作前先征求用户同意。批量删除（“清空画布 / 全部删除”）优先用 spellpaw_clear_canvas，原子完成且立即同步`,
		`4. 回复简洁、结构化`,
		`5. 卡片之间的关联用 linkedCardIds 表达`,
		`6. 用户问结构/节奏问题时，主动调用 analyze_structure 或 get_pacing_report`,
		`7. **不要将用户的疑问句当成创建卡片的指令**。如“为什么还有卡片在画布上”是诊断问题，先调 spellpaw_get_canvas 看实际情况，再用文字说明，不要创建一张标题为用户问题的 art/task 卡片`,
	]
		.filter(Boolean)
		.join("\n");
}

/** Convert canvas nodes to indented text for system_prompt injection */
export function canvasToPromptText(cards: CanvasNode[]): string {
	if (cards.length === 0) return '(画布为空)';
	const lines: string[] = [`画布共 ${cards.length} 张卡片：`];
	for (const c of cards) {
		const icon = ({ storyline: '📖', moodboard: '🎨', videoClip: '🎬', asset: '📦', task: '📋', art: '🖼️', character: '👤', script: '📝', deliverable: '📦', sceneCard: '🎬' } as Record<string, string>)[c.type] ?? '📄';
		lines.push(`  ${icon} ${c.type}「${c.data.title}」(id: ${c.id})`);
		if (c.data.description) lines.push(`    描述：${c.data.description.slice(0, 80)}`);
		if (c.data.children?.length) {
			for (const ch of c.data.children) lines.push(`    └─ ${ch.type}「${ch.title}」`);
		}
	}
	return lines.join('\n');
}
