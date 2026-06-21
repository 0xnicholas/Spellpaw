import { useCallback, useEffect, useMemo } from "react";
import { TabBar } from "@/shared/components/ui/TabBar";
import { TabPanel } from "@/shared/components/ui/TabPanel";
import { DetailPanel } from "@drama/components/detail-panel/DetailPanel";
import { CopilotChat } from "./copilot";
import { ContextBar } from "./ContextBar";
import { QuickActions } from "./QuickActions";
import { WorkflowGuide } from "./WorkflowGuide";
import { useChatStore } from "@drama/stores/chatStore";
import { useCanvasStore } from "@drama/stores/canvasStore";
import { useDetailStore } from "@drama/stores/detailStore";
import { useProjectStore } from "@drama/stores/projectStore";
import { useCopilotSSE } from "@drama/hooks/useCopilotSSE";
import { generateId } from "@/shared/lib/utils";
import { toolRouter } from "@drama/stores/toolRouter";
import type { ChatAction } from "@shared/types";

export function ChatPanel() {
	const sendMessage = useChatStore((s) => s.sendMessage);
	const messages = useChatStore((s) => s.messages);
	const streamingMessage = useChatStore((s) => s.streamingMessage);
	const toolCalls = useChatStore((s) => s.toolCalls);
	const isLoading = useChatStore((s) => s.isLoading);
	const filterNodeId = useChatStore((s) => s.filterNodeId);
	const setFilterNodeId = useChatStore((s) => s.setFilterNodeId);
	const loadChat = useChatStore((s) => s.loadChat);
	const pushProactiveInsights = useChatStore((s) => s.pushProactiveInsights);

	const activeTab = useDetailStore((s) => s.activeTab);
	const setActiveTab = useDetailStore((s) => s.setActiveTab);
	const currentProjectId = useProjectStore((s) => s.currentProjectId);

	// Phase 2: connect to LLM provider for real-time AI collaboration
	useCopilotSSE();

	// Load project-scoped chat history when the active project changes.
	useEffect(() => {
		if (currentProjectId) {
			void loadChat(currentProjectId);
		} else {
			useChatStore.setState({ messages: [] });
		}
	}, [currentProjectId, loadChat]);

	// Proactive insights: when a project is loaded with no prior chat history,
	// scan the tree and post a "💡 Agent Suggestion" message if anything needs
	// attention. Throttled to once per project per session.
	useEffect(() => {
		if (!currentProjectId) return;
		const sessionKey = `proactive:${currentProjectId}`;
		if (sessionStorage.getItem(sessionKey)) return;
		// Wait a tick for loadChat to settle so we can check if messages are empty.
		const timer = setTimeout(() => {
			const state = useChatStore.getState();
			if (state.messages.length === 0 && state.streamingMessage == null) {
				const insights = state.pushProactiveInsights(currentProjectId);
				if (insights.length > 0) {
					sessionStorage.setItem(sessionKey, String(Date.now()));
				}
			}
		}, 800);
		return () => clearTimeout(timer);
	}, [currentProjectId, pushProactiveInsights]);

	const filteredMessages = filterNodeId
		? messages.filter(
				(m) => m.context?.nodeId === filterNodeId || m.role === "agent",
			)
		: messages;

	const handleSendMessage = useCallback(
		(content: string) => {
			if (currentProjectId) {
				sendMessage(content, currentProjectId);
			}
		},
		[currentProjectId, sendMessage],
	);

	const triggerHighlight = useCanvasStore((s) => s.triggerHighlight);

	/** After tool execution, highlight linked canvas cards */
	const highlightAffectedCards = useCallback((affectedTreeNodeIds: string[]) => {
		const cards = useCanvasStore.getState().getCurrentNodes();
		const ids = new Set(affectedTreeNodeIds);
		const cardIds = cards
			.filter((c) => c.data.linkedTreeNodeId && ids.has(c.data.linkedTreeNodeId as string))
			.map((c) => c.id);
		if (cardIds.length > 0) triggerHighlight(cardIds);
	}, [triggerHighlight]);

	const handleActionClick = useCallback(
		(action: ChatAction) => {
			const card = useCanvasStore.getState().getSelectedCard();

			switch (action.type) {
				case "generate_storyboard": {
					if (!card) {
						handleSendMessage("请先选择一张卡片");
						return;
					}
					void toolRouter.generate_storyboard({
						action: "generate_storyboard",
						nodeId: card.id,
					}).then(() => {
						highlightAffectedCards([card.id]);
						setTimeout(() => {
							const cards = useCanvasStore.getState().getCurrentNodes();
							const newCard = cards.find((c) =>
								c.type === 'art' && c.data.linkedCardIds?.includes(card.id)
							);
							if (newCard) useCanvasStore.getState().triggerFocusCard(newCard.id);
						}, 800);
					});
					break;
				}
				case "insert_scene": {
					// Add a new storyline card on canvas
					const cs = useCanvasStore.getState();
					const existing = cs.getCurrentNodes();
					const lastY = existing.length > 0 ? Math.max(...existing.map((n) => n.position.y)) + 220 : 50;
					cs.addNode({
						id: generateId('canvas_'),
						type: 'storyline',
						position: { x: 50 + (existing.length % 3) * 420, y: lastY },
						data: { title: action.label || '新场景', status: 'draft' },
					});
					break;
				}
				case "modify_script": {
					if (card) setActiveTab("details");
					break;
				}
				case "custom": {
					if (action.payload?.followUp) {
						handleSendMessage(action.payload.followUp as string);
					} else {
						handleSendMessage(action.label);
					}
					break;
				}
			}
		},
		[handleSendMessage, setActiveTab, highlightAffectedCards],
	);

	const selectedCard = useCanvasStore((s) => s.getSelectedCard());

	const contextChip = useMemo(() => {
		if (!selectedCard) return null;
		const typeIcon = ({ storyline: '📖', moodboard: '🎨', videoClip: '🎬', asset: '📦', task: '📋', art: '🖼️', character: '👤', script: '📝', deliverable: '📦', sceneCard: '🎬' } as Record<string, string>)[selectedCard.type] ?? '📄';
		return {
			label: `${typeIcon} ${selectedCard.data.title}`,
			onClear: () => {
				useCanvasStore.getState().setSelectedCardId(null);
			},
		};
	}, [selectedCard]);

	const showDetailsTab = !!selectedCard;
	const tabs = showDetailsTab
		? [
				{ id: "chat", label: "对话" },
				{ id: "details", label: "详情" },
			]
		: [{ id: "chat", label: "对话" }];

	return (
		<div className="flex h-full flex-col bg-[var(--color-bg-primary)]">
			<TabBar
				tabs={tabs}
				activeTab={activeTab}
				onChange={(id) => setActiveTab(id as "chat" | "details")}
			/>
			<div className="flex-1 overflow-hidden">
				<TabPanel
					isActive={activeTab === "chat" || !showDetailsTab}
					className="flex flex-col overflow-hidden"
				>
					<ContextBar
						onClick={() => selectedCard && setFilterNodeId(selectedCard.id)}
					/>
					<QuickActions onAction={handleSendMessage} />
					<CopilotChat
						messages={filteredMessages}
						streamingText={streamingMessage}
						toolCalls={toolCalls}
						isLoading={isLoading}
						onSend={handleSendMessage}
						onActionClick={handleActionClick}
						placeholder="输入创作想法…"
						emptyState={<WorkflowGuide />}
					contextChip={contextChip}
					/>
				</TabPanel>
				<TabPanel isActive={activeTab === "details" && showDetailsTab}>
					<DetailPanel />
				</TabPanel>
			</div>
		</div>
	);
}
