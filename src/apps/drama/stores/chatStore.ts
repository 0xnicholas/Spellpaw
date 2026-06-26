import { create } from "zustand";
import type { ChatMessage } from "@drama/types";
import { generateId } from "@/shared/lib/utils";
import { authApi } from "@/shared/stores/authStore";
import {
	computeProactiveInsights,
	formatInsightsAsMessage,
	type ProactiveInsight,
} from "@drama/lib/proactiveInsights";
import {
  tryRunSkill,
  executeSkill,
  formatSkillInvocation,
  isSlashCommand,
} from "@drama/skills/chat";
import { useProjectStore } from "./projectStore";
import { useCanvasStore } from "./canvasStore";

interface InFlightToolCall {
	callId: string;
	name: string;
	status: 'running' | 'success' | 'error';
	errorMessage?: string;
}

interface ChatState {
	messages: ChatMessage[];
	isLoading: boolean;
	inputValue: string;

	// Phase 2: SSE streaming
	streamingMessage: string | null; // partial assistant text being built
	streamingMessageId: string | null;
	toolCalls: InFlightToolCall[]; // in-flight tool calls

	// Phase 3: node-scoped chat filtering
	filterNodeId: string | null;

	loadChat: (projectId: string) => Promise<void>;
	sendMessage: (content: string, projectId: string) => void;
	setInputValue: (value: string) => void;
	appendMessage: (message: ChatMessage, projectId: string) => void;
	updateMessage: (id: string, patch: Partial<ChatMessage>, projectId?: string) => void;
	clearMessages: () => void;
	setFilterNodeId: (nodeId: string | null) => void;

	// Chat control: stop the in-flight turn / regenerate the last response.
	// Both delegate to the SSE bridge (useCopilotSSE) which owns the
	// actual AbortController + session ref.
	abortTurn: () => void;
	regenerateLast: (projectId: string) => void;

	// Phase 3+: Proactive insights
	pushProactiveInsights: (projectId: string) => ProactiveInsight[];

	// Phase 2: SSE streaming actions
	startStreaming: (messageId: string) => void;
	appendDelta: (delta: string) => void;
	startToolCall: (callId: string, name: string) => void;
	endToolCall: (callId: string, status?: 'success' | 'error', errorMessage?: string) => void;
	endStreaming: (projectId: string, stopReason?: string) => void;
}

function detectCardIntent(text: string): { type: string; title: string } | null {
	const t = text.trim();
	// Pattern: "创建/添加/新建 [类型] 卡片，标题 X" or "添加 X"
	const cardTypeMatch = t.match(/(?:创建|添加|新建|加)(一个|一张)?\s*(storyline|故事线|moodboard|情绪板|videoClip|视频|asset|素材|task|任务|art|美术|character|角色|script|剧本)\s*(?:卡片)?[\s，,:。]*(?:标题[：:为]?|叫做?|叫)?\s*([^，,。\n]+)?/i);
	if (cardTypeMatch) {
		const cnToType: Record<string, string> = {
			故事线: 'storyline', 情绪板: 'moodboard', 视频: 'videoClip',
			素材: 'asset', 任务: 'task', 美术: 'art', 角色: 'character', 剧本: 'script',
		};
		const rawType = cardTypeMatch[2].toLowerCase();
		const type = cnToType[rawType] ?? rawType;
		const title = cardTypeMatch[3]?.trim() || `新${rawType}`;
		return { type, title };
	}
	// Simpler: "加一张卡片 X"
	const simpleMatch = t.match(/(?:加|创建|添加|新建)(?:一张|一个)?(.+?)(?:卡片|card)/i);
	if (simpleMatch && simpleMatch[1].trim().length > 0) {
		const title = simpleMatch[1].trim();
		if (title.length > 0 && title.length < 50) {
			return { type: 'storyline', title };
		}
	}
	return null;
}

function mockAgentReply(userContent: string, _projectId?: string): ChatMessage {
	const replies: Record<string, string> = {
		"🚀 Kickstart：快速生成初稿":
			"好的，我来为你设计故事框架。首先从三幕结构开始构建：\n\n**第一幕：开端** — 建立角色和世界\n**第二幕：冲突** — 剧情推进和角色成长\n**第三幕：结局** — 高潮与解决\n\n需要我套用叙事模板快速生成初稿吗？",
		"✨ Enhance：展开下一幕": "我来分析当前结构，为下一幕展开分镜…",
		"✨ Enhance：优化节奏": "正在分析全剧节奏分布，检查时长均衡性…",
		"✨ Enhance：生成视觉风格": "正在为你的故事匹配合适的视觉风格参考…",
	};

	// Detect card creation intent
	const cardIntent = detectCardIntent(userContent);
	let content: string;
	let actions: ChatMessage['actions'];

	if (cardIntent) {
		// Actually create the card locally
		const existing = useCanvasStore.getState().getCurrentNodes();
		const lastY = existing.length > 0 ? Math.max(...existing.map(n => n.position.y)) + 220 : 50;
		const cardId = generateId('canvas_');
		useCanvasStore.getState().addNode({
			id: cardId,
			type: cardIntent.type as 'storyline',
			position: { x: 50 + (existing.length % 3) * 420, y: lastY },
			data: { title: cardIntent.title, status: 'draft' },
		});

		// Trigger highlight + focus
		setTimeout(() => useCanvasStore.getState().triggerHighlight([cardId]), 50);
		setTimeout(() => useCanvasStore.getState().triggerFocusCard(cardId), 300);

		content = `已创建 ${cardIntent.type}「${cardIntent.title}」并定位到画布。\n\n💡 试试选中卡片后说「添加描述」「加镜头列表」继续完善。`;
		actions = [
			{ id: generateId('act_'), label: '生成分镜图', type: 'generate_storyboard' },
			{ id: generateId('act_'), label: '编辑详情', type: 'modify_script' },
		];
	} else {
		content = replies[userContent] ?? "收到！我来为你处理。正在分析项目结构并制定最佳方案…";
		actions = [
			{ id: generateId('act_'), label: '生成分镜', type: 'generate_storyboard' },
			{ id: generateId('act_'), label: '撰写对白', type: 'modify_script' },
		];
	}

	return {
		id: generateId('msg_'),
		role: 'agent',
		content,
		type: 'text',
		timestamp: new Date().toISOString(),
		actions,
	};
}

async function saveChatMessages(
	messages: ChatMessage[],
	projectId: string,
): Promise<void> {
	try {
		await authApi.apiCall(`/api/chat/${projectId}`, {
			method: "PUT",
			body: JSON.stringify({ messages }),
		});
	} catch {
		// offline / network errors are tolerated; local state remains usable
	}
}

export const useChatStore = create<ChatState>()((set) => ({
	messages: [],
	isLoading: false,
	inputValue: "",
	streamingMessage: null,
	streamingMessageId: null,
	toolCalls: [],
	filterNodeId: null,

	loadChat: async (projectId: string) => {
		if (!projectId) {
			set({ messages: [] });
			return;
		}
		try {
			const res = await authApi.apiCall(`/api/chat/${projectId}`);
			if (!res.ok) {
				set({ messages: [] });
				return;
			}
			const data = await res.json();
			const remoteMessages = (
				Array.isArray(data.messages) ? data.messages : []
			) as ChatMessage[];
			set({ messages: remoteMessages });
		} catch {
			set({ messages: [] });
		}
	},

	sendMessage: (content, projectId) => {
		if (!projectId) return;
		const userMsg: ChatMessage = {
			id: generateId("msg_"),
			role: "user",
			content,
			type: "text",
			timestamp: new Date().toISOString(),
		};
		set((state) => {
			const messages = [...state.messages, userMsg];
			void saveChatMessages(messages, projectId);
			return { messages, isLoading: true };
		});

		// Slash command: run the skill locally, no LLM roundtrip needed.
		// (The useCopilotSSE override also has this short-circuit so skills
		// work in both mock and real modes.)
		if (isSlashCommand(content)) {
			void (async () => {
				const started = tryRunSkill(content, projectId);
				if (!started) {
					// Unknown slash command — fall through to mock reply
					const agentMsg = mockAgentReply(content, projectId);
					set((state) => {
						const messages = [...state.messages, agentMsg];
						void saveChatMessages(messages, projectId);
						return { messages, isLoading: false };
					});
					return;
				}
				const invocationMsg: ChatMessage = {
					id: generateId("msg_"),
					role: "agent",
					content: formatSkillInvocation(started.skillId),
					type: "text",
					timestamp: new Date().toISOString(),
				};
				set((state) => {
					const messages = [...state.messages, invocationMsg, started.pendingMessage];
					void saveChatMessages(messages, projectId);
					return { messages };
				});

				// Run the skill and update the pending message in place.
				const done = await executeSkill(content, projectId);
				if (done) {
					set((state) => {
						const messages = state.messages.map((m) =>
							m.id === started.pendingMessage.id
								? { ...done.finalMessage, timestamp: started.pendingMessage.timestamp }
								: m
						);
						void saveChatMessages(messages, projectId);
						return { messages, isLoading: false };
					});
				} else {
					set({ isLoading: false });
				}
			})();
			return;
		}

		setTimeout(() => {
			const agentMsg = mockAgentReply(content, projectId);
			set((state) => {
				const messages = [...state.messages, agentMsg];
				void saveChatMessages(messages, projectId);
				return {
					messages,
					isLoading: false,
				};
			});
		}, 1200);
	},

	setInputValue: (value) => set({ inputValue: value }),

	appendMessage: (message, projectId) =>
		set((state) => {
			const messages = [...state.messages, message];
			void saveChatMessages(messages, projectId);
			return { messages };
		}),

	updateMessage: (id, patch, projectId) =>
		set((state) => {
			const messages = state.messages.map((m) =>
				m.id === id ? { ...m, ...patch } : m
			);
			if (projectId) void saveChatMessages(messages, projectId);
			return { messages };
		}),

	clearMessages: () => {
		set({ messages: [] });
	},
	setFilterNodeId: (nodeId) => set({ filterNodeId: nodeId }),

	pushProactiveInsights: (projectId) => {
		const projectState = useProjectStore.getState();
		const canvasNodes = useCanvasStore.getState().canvases[projectId]?.nodes ?? [];
		const project = projectState.projects.find(
			(p) => p.id === projectState.currentProjectId,
		);
		if (!project) return [];
		const insights = computeProactiveInsights(canvasNodes);
		if (insights.length === 0) return [];
		const body = formatInsightsAsMessage(insights);
		const msg: ChatMessage = {
			id: generateId("msg_"),
			role: "agent",
			content: body,
			type: "suggestion",
			timestamp: new Date().toISOString(),
			actions: insights
				.filter((i) => i.suggestedPrompt)
				.slice(0, 4)
				.map((i) => ({
					id: generateId("act_"),
					label: i.title,
					type: "custom",
					payload: { prompt: i.suggestedPrompt },
				})),
		};
		set((state) => {
			const messages = [...state.messages, msg];
			void saveChatMessages(messages, projectId);
			return { messages };
		});
		return insights;
	},

	// Phase 2: SSE streaming actions
	startStreaming: (messageId) =>
		set({
			streamingMessageId: messageId,
			streamingMessage: "",
			isLoading: true,
		}),

	appendDelta: (delta) =>
		set((state) => ({
			streamingMessage: (state.streamingMessage ?? "") + delta,
		})),

	startToolCall: (callId, name) =>
		set((state) => ({
			toolCalls: [
				...state.toolCalls,
				{ callId, name, status: 'running' as const },
			],
		})),

	endToolCall: (callId, status = 'success', errorMessage) =>
		set((state) => ({
			toolCalls: state.toolCalls.map((t) =>
				t.callId === callId
					? { ...t, status, ...(errorMessage ? { errorMessage } : {}) }
					: t,
			),
		})),

	endStreaming: (projectId, _stopReason) => {
		const state = useChatStore.getState();
		if (state.streamingMessage && state.streamingMessageId) {
			const finalMsg: ChatMessage = {
				id: state.streamingMessageId,
				role: "agent",
				content: state.streamingMessage,
				type: "text",
				timestamp: new Date().toISOString(),
			};
			set((s) => {
				const messages = [...s.messages, finalMsg];
				void saveChatMessages(messages, projectId);
				return {
					messages,
					streamingMessage: null,
					streamingMessageId: null,
					isLoading: false,
				};
			});
		} else {
			set({
				streamingMessage: null,
				streamingMessageId: null,
				isLoading: false,
			});
		}
	},

	abortTurn: () => {
		// Reset streaming state immediately so the UI updates.
		set({
			isLoading: false,
			streamingMessage: null,
			streamingMessageId: null,
			toolCalls: [],
		});
		// useCopilotSSE listens for a custom event to close the SSE
		// subscription and reset its session ref. The store stays decoupled.
		if (typeof window !== 'undefined') {
			window.dispatchEvent(new CustomEvent('spellpaw:abort-turn'));
		}
	},

	regenerateLast: (projectId) => {
		if (!projectId) return;
		const state = useChatStore.getState();
		// Walk backwards to find the last user message.
		let lastUserIdx = -1;
		for (let i = state.messages.length - 1; i >= 0; i--) {
			if (state.messages[i].role === 'user') {
				lastUserIdx = i;
				break;
			}
		}
		if (lastUserIdx < 0) return;
		const lastUserMsg = state.messages[lastUserIdx];

		// Drop everything after the last user message (agent replies, tool
		// indicators, etc.) so we get a clean regenerate.
		const trimmed = state.messages.slice(0, lastUserIdx);

		set({
			messages: trimmed,
			isLoading: false,
			streamingMessage: null,
			streamingMessageId: null,
			toolCalls: [],
		});
		void saveChatMessages(trimmed, projectId);

		// Re-send via the same path as a fresh message (delegates to the
		// SSE bridge via the store action).
		useChatStore.getState().sendMessage(lastUserMsg.content, projectId);
	},
}));
