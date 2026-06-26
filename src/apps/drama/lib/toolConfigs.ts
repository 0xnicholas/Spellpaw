/**
 * Shared Copilot tool configs — single source of truth.
 * Used by useCopilotSSE (ChatPanel).
 */
import { config } from "@/shared/config";
import { listProviderIds } from "@drama/lib/canvasToolkit";
import { getAllSkillToolConfigs } from "@drama/lib/skills/registry";

const TOOL_ENDPOINT = config.toolServerEndpoint;

/** Build a JSON Schema enum property from the current provider registry.
 *  Returns an empty array as a safe fallback; the consuming LLM ignores empty enums. */
function providerEnum(): string[] {
	return listProviderIds();
}

export const SPELLPAW_TOOL_CONFIGS = [
	// ── Canvas card tools (primary) ──
	{
		name: "spellpaw_get_canvas",
		description: "List all cards currently on the canvas. Use this to understand the project state before making changes.",
		parameters: { type: "object", properties: {} },
		endpoint: TOOL_ENDPOINT,
	},
	{
		name: "spellpaw_add_card",
		description: "Add a new card to the canvas. Choose type based on content: storyline for narrative structure, moodboard for visual style references, videoClip for video assets, asset for materials/logos/subtitles, task for instructions/feedback, art for AI-generated images, character for character profiles.",
		parameters: {
			type: "object",
			properties: {
				type: { type: "string", enum: ["storyline", "moodboard", "videoClip", "asset", "task", "art", "character"] },
				title: { type: "string" },
				description: { type: "string" },
				status: { type: "string", enum: ["draft", "in_progress", "review", "done"] },
				location: { type: "string", description: "For storyline cards: scene location" },
				timeOfDay: { type: "string", description: "For storyline cards: morning/day/evening/night" },
				duration: { type: "number", description: "Duration in seconds" },
				colors: { type: "array", items: { type: "string" }, description: "For moodboard cards: color palette hex values" },
				styleRef: { type: "string", description: "For moodboard cards: visual style reference" },
				source: { type: "string", enum: ["ai", "upload"], description: "For videoClip cards" },
				assetType: { type: "string", description: "For asset cards: product/logo/subtitle/audio/image/video/other" },
				taskType: { type: "string", enum: ["instruction", "feedback", "diff"], description: "For task cards" },
				targetCardId: { type: "string", description: "For task cards: which card this task relates to" },
			},
			required: ["type", "title"],
		},
		endpoint: TOOL_ENDPOINT,
	},
	{
		name: "spellpaw_update_card",
		description: "Update an existing canvas card's data. Can change title, description, status, or any type-specific field.",
		parameters: {
			type: "object",
			properties: {
				cardId: { type: "string" },
				data: { type: "object", description: "Fields to update (any field from add_card)" },
			},
			required: ["cardId", "data"],
		},
		endpoint: TOOL_ENDPOINT,
	},
	{
		name: "spellpaw_delete_card",
		description: "Delete a card from the canvas. CAREFUL: irreversible. Ask user first.",
		parameters: {
			type: "object",
			properties: { cardId: { type: "string" } },
			required: ["cardId"],
		},
		endpoint: TOOL_ENDPOINT,
	},
	{
		name: "spellpaw_clear_canvas",
		description:
			"Atomically remove multiple canvas cards in one operation. PREFER this over looping delete_card for batch removal — it triggers a single force-push to the server so a refresh during the operation cannot restore deleted cards. Use the optional `filter` to scope removal by type / status / titleContains; omit filter to remove everything.",
		parameters: {
			type: "object",
			properties: {
				filter: {
					type: "object",
					description: "Optional filter — only matching cards are removed.",
					properties: {
						type: {
							type: "string",
							enum: ["storyline", "moodboard", "videoClip", "asset", "task", "art", "character", "script", "sceneCard", "deliverable"],
							description: "Match cards of this type only",
						},
						status: {
							type: "string",
							enum: ["draft", "in_progress", "review", "done"],
							description: "Match cards with this status only",
						},
						titleContains: {
							type: "string",
							description: "Match cards whose title contains this substring",
						},
					},
				},
			},
		},
		endpoint: TOOL_ENDPOINT,
	},

	{
	// ── Typed add tools (7 specialized, replacing generic add_card) ──
	{
		name: "spellpaw_add_storyline_card",
		description: "Add a storyline card for narrative structure (acts, plot points, story beats). Use for 'act' type storylines.",
		parameters: {
			type: "object",
			properties: {
				title: { type: "string" },
				description: { type: "string" },
				location: { type: "string" },
				timeOfDay: { type: "string" },
				duration: { type: "number", description: "Duration in seconds" },
			},
			required: ["title"],
		},
		endpoint: TOOL_ENDPOINT,
	},
	{
		name: "spellpaw_add_moodboard_card",
		description: "Add a moodboard card for visual style references, color palettes, and aesthetic inspiration.",
		parameters: {
			type: "object",
			properties: {
				title: { type: "string" },
				description: { type: "string" },
				colors: { type: "array", items: { type: "string" }, description: "Color palette hex values" },
				styleRef: { type: "string", description: "Visual style reference (e.g., cyberpunk, film noir, watercolor)" },
			},
			required: ["title"],
		},
		endpoint: TOOL_ENDPOINT,
	},
	{
		name: "spellpaw_add_video_clip_card",
		description: "Add a video clip card for video assets or generated video content.",
		parameters: {
			type: "object",
			properties: {
				title: { type: "string" },
				description: { type: "string" },
				source: { type: "string", enum: ["ai", "upload"], description: "Source of the video" },
				duration: { type: "number", description: "Duration in seconds" },
			},
			required: ["title"],
		},
		endpoint: TOOL_ENDPOINT,
	},
	{
		name: "spellpaw_add_asset_card",
		description: "Add an asset card for materials, logos, subtitles, audio, or other project resources.",
		parameters: {
			type: "object",
			properties: {
				title: { type: "string" },
				description: { type: "string" },
				assetType: { type: "string", description: "Asset type: product/logo/subtitle/audio/image/video/other" },
				url: { type: "string", description: "Asset URL or path" },
				tags: { type: "array", items: { type: "string" } },
			},
			required: ["title"],
		},
		endpoint: TOOL_ENDPOINT,
	},
	{
		name: "spellpaw_add_task_card",
		description: "Add a task card for instructions, feedback, diffs, or action items.",
		parameters: {
			type: "object",
			properties: {
				title: { type: "string" },
				description: { type: "string" },
				taskType: { type: "string", enum: ["instruction", "feedback", "diff"], description: "Task type" },
				targetCardId: { type: "string", description: "Which card this task relates to" },
				dueDate: { type: "string", description: "Optional due date (ISO format)" },
			},
			required: ["title"],
		},
		endpoint: TOOL_ENDPOINT,
	},
	{
		name: "spellpaw_add_art_card",
		description: "Add an art card for AI-generated images, concept art, or reference visuals.",
		parameters: {
			type: "object",
			properties: {
				title: { type: "string" },
				description: { type: "string" },
				thumbnail: { type: "string", description: "Thumbnail URL" },
				generatedPrompt: { type: "string", description: "Prompt used to generate the image" },
			},
			required: ["title"],
		},
		endpoint: TOOL_ENDPOINT,
	},
	{
		name: "spellpaw_add_character_card",
		description: "Add a character card for character profiles, casting, and role descriptions.",
		parameters: {
			type: "object",
			properties: {
				title: { type: "string" },
				description: { type: "string" },
				role: { type: "string", description: "Character role (protagonist/antagonist/supporting etc)" },
				traits: { type: "array", items: { type: "string" }, description: "Character traits" },
				linkedCardIds: { type: "array", items: { type: "string" }, description: "Related canvas card IDs" },
			},
			required: ["title"],
		},
		endpoint: TOOL_ENDPOINT,
	},

	// ── Batch card tools ──
	{
		name: "spellpaw_batch_update_cards",
		description: "Batch update multiple canvas cards at once. Returns success/failure per card.",
		parameters: {
			type: "object",
			properties: {
				updates: {
					type: "array",
					items: {
						type: "object",
						properties: {
							cardId: { type: "string" },
							data: { type: "object", description: "Fields to update on this card" },
						},
						required: ["cardId", "data"],
					},
					description: "Array of {cardId, data} objects to update",
				},
			},
			required: ["updates"],
		},
		endpoint: TOOL_ENDPOINT,
	},
	{
		name: "spellpaw_batch_delete_cards",
		description: "Atomically delete multiple canvas cards. All-or-nothing: validates all cardIds exist before removing.",
		parameters: {
			type: "object",
			properties: {
				cardIds: {
					type: "array",
					items: { type: "string" },
					description: "Array of card IDs to delete",
				},
			},
			required: ["cardIds"],
		},
		endpoint: TOOL_ENDPOINT,
	},
	{
		name: "spellpaw_batch_add_cards",
		description: "Batch create multiple canvas cards of the same type at once.",
		parameters: {
			type: "object",
			properties: {
				cards: {
					type: "array",
					items: {
						type: "object",
						properties: {
							cardType: { type: "string", enum: ["storyline", "moodboard", "videoClip", "asset", "task", "art", "character", "sceneCard", "script", "deliverable"] },
							data: { type: "object", description: "Card data fields" },
						},
						required: ["cardType", "data"],
					},
					description: "Array of {cardType, data} objects to create",
				},
			},
			required: ["cards"],
		},
		endpoint: TOOL_ENDPOINT,
	},

		name: "spellpaw_generate_asset",
		description: `Generate an image or video asset and add it to the canvas as a card. Use when the user asks to generate a storyboard, reference image, scene visual, or video. If a canvas card is selected, pass its cardId; otherwise provide an explicit prompt. Produces an 'art' card (image) or 'deliverable' card (video) by default; pass cardType to override. Valid providers: ${providerEnum().join(", ")}. Example: spellpaw_generate_asset({ mediaType: "image", cardId: "card-1", prompt: "雨夜小巷，霓虹灯反射，悬疑氛围" }).`,
		parameters: {
			type: "object",
			properties: {
				cardId: {
					type: "string",
					description:
						"ID of the canvas card to generate for (optional if prompt is provided)",
				},
				mediaType: {
					type: "string",
					enum: ["image", "video"],
					description: "Type of media to generate",
				},
				prompt: {
					type: "string",
					description:
						"Generation prompt; required when no cardId is provided. If cardId is provided and prompt is omitted, built from card metadata",
				},
				provider: {
					type: "string",
					enum: providerEnum(),
					description: "Optional provider id",
				},
				count: {
					type: "number",
					description: "Number of variants to generate (default 1)",
				},
				cardType: {
					type: "string",
					enum: ["art", "sceneCard", "deliverable", "storyline", "moodboard", "videoClip"],
					description:
						"Canvas card type to create (default art for image, deliverable for video)",
				},
			},
			required: ["mediaType"],
		},
		endpoint: TOOL_ENDPOINT,
	},
	{
		name: "spellpaw_generate_variants",
		description: `Generate multiple variant images of an existing canvas card. Useful when the user wants "more options", "a few versions", or "variations of this shot". Produces a new 'art' card for each variant. Example: spellpaw_generate_variants({ cardId: "card-xyz", count: 3 }).`,
		parameters: {
			type: "object",
			properties: {
				cardId: {
					type: "string",
					description:
						"ID of the canvas card to generate variants from",
				},
				mediaType: {
					type: "string",
					enum: ["image", "video"],
					description: "Type of media to generate",
				},
				prompt: {
					type: "string",
					description:
						"Optional override prompt; if omitted, inherits from card or node metadata",
				},
				provider: {
					type: "string",
					enum: providerEnum(),
					description: "Optional provider id",
				},
				count: {
					type: "number",
					description: "Number of variants to generate (default 1)",
				},
			},
		},
		endpoint: TOOL_ENDPOINT,
	},
	{
		name: "spellpaw_edit_asset",
		description:
			'Edit an existing image canvas card based on a text instruction (e.g. "make it rain", "change the color grading to noir"). Produces a new \'art\' card with the edit applied; original card is preserved for comparison. If no dedicated image-editing provider is available, falls back to generating a new edited-version art card.',
		parameters: {
			type: "object",
			properties: {
				cardId: {
					type: "string",
					description: "ID of the canvas card to edit",
				},
				prompt: {
					type: "string",
					description: "Text instruction describing the desired edit",
				},
				provider: {
					type: "string",
					enum: providerEnum(),
					description: "Optional provider id",
				},
			},
			required: ["cardId", "prompt"],
		},
		endpoint: TOOL_ENDPOINT,
	},
	{
		name: "spellpaw_apply_style",
		description:
			'Create a new styled version of an existing image card. Produces a new \'art\' card with the style applied; original card is preserved. Provide either a stylePrompt (e.g. "watercolor", "cyberpunk neon") or a styleCardId referencing an existing style reference card. Example: spellpaw_apply_style({ sourceCardId: "card-1", stylePrompt: "cyberpunk neon" }).',
		parameters: {
			type: "object",
			properties: {
				sourceCardId: {
					type: "string",
					description: "ID of the source image card",
				},
				stylePrompt: {
					type: "string",
					description: "Text description of the desired style",
				},
				styleCardId: {
					type: "string",
					description:
						"ID of an existing style reference card (alternative to stylePrompt)",
				},
				provider: {
					type: "string",
					enum: providerEnum(),
					description: "Optional provider id",
				},
			},
			required: ["sourceCardId"],
		},
		endpoint: TOOL_ENDPOINT,
	},
	{
		name: "spellpaw_batch_apply_style",
		description:
			'Batch apply a visual style to multiple canvas cards. Creates one new \'art\' card for each selected card; originals are preserved. Use when the user wants "unify the style of selected cards" or "apply this style to all selected shots". Example: spellpaw_batch_apply_style({ cardIds: ["card-1", "card-2"], stylePrompt: "noir" }).',
		parameters: {
			type: "object",
			properties: {
				cardIds: {
					type: "array",
					items: { type: "string" },
					description: "IDs of canvas cards to style",
				},
				stylePrompt: {
					type: "string",
					description: "Text description of the desired visual style",
				},
				provider: {
					type: "string",
					enum: providerEnum(),
					description: "Optional provider id",
				},
			},
			required: ["nodeIds", "stylePrompt"],
		},
		endpoint: TOOL_ENDPOINT,
	},
	{
		name: "spellpaw_analyze_structure",
		description:
			"Analyze the project structure health: check act/scene counts, duration distribution, and suggest completions. Returns a diagnostic report.",
		parameters: { type: "object", properties: {} },
		endpoint: TOOL_ENDPOINT,
	},
	{
		name: "spellpaw_get_pacing_report",
		description:
			"Get a detailed pacing report with duration statistics, coefficient of variation, and specific rhythm issues. Use when user asks about pacing or timing.",
		parameters: { type: "object", properties: {} },
		endpoint: TOOL_ENDPOINT,
	},
	{
		name: "spellpaw_match_template",
		description:
			"Match the current project against built-in narrative templates based on title, description, and scene keywords. Returns the best match with similarity score and templateId.",
		parameters: { type: "object", properties: {} },
		endpoint: TOOL_ENDPOINT,
	},
	{
		name: "spellpaw_optimize_pacing",
		description:
			"Auto-adjust scene durations based on pacing analysis. dryRun=true (default) returns a preview plan; dryRun=false executes the changes.",
		parameters: {
			type: "object",
			properties: {
				dryRun: {
					type: "boolean",
					description:
						"If true, returns preview only. If false, executes changes.",
				},
			},
		},
		endpoint: TOOL_ENDPOINT,
	},
	{
		name: "spellpaw_kickstart_project",
		description:
			"Create a complete narrative structure (acts, scenes, shots) from a theme and generate canvas cards for every scene. Use this whenever the user asks to create a project structure and generate scene cards in one go.",
		parameters: {
			type: "object",
			properties: {
				theme: {
					type: "string",
					description: 'Theme or title of the project, e.g. "密室逃脱"',
				},
				genre: {
					type: "string",
					description: 'Optional genre hint, e.g. "悬疑" or "romance"',
				},
				targetDuration: {
					type: "number",
					description: "Optional total target duration in seconds",
				},
				cardType: {
					type: "string",
					enum: ["storyline", "sceneCard", "script"],
					description:
						"Type of canvas card to create. Defaults to storyline.",
				},
			},
			required: ["theme"],
		},
		endpoint: TOOL_ENDPOINT,
	},
	// ── Skill tools (composed workflows) ──
	// Each skill becomes one tool with name `spellpaw_skill_*` and a
	// single `input` object argument. The LLM can invoke them like
	// atomic tools, but they're implemented as composed workflows
	// internally.
	...getAllSkillToolConfigs().map((cfg) => ({
		name: cfg.name,
		description: cfg.description,
		parameters: cfg.parameters,
		endpoint: TOOL_ENDPOINT,
	})),
];
