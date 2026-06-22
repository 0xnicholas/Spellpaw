import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Copy, Plus, Share2, Eye } from "lucide-react";
import { TabPanel } from "@/shared/components/ui/TabPanel";
import { Button } from "@/shared/components/ui/Button";
import { IconButton } from "@/shared/components/ui/IconButton";
import { useToast } from "@/shared/components/ui/useToast";
import { DetailPanel } from "@drama/components/detail-panel/DetailPanel";
import { CopilotChat } from "./copilot";
import { ContextBar } from "./ContextBar";
import { QuickActions } from "./QuickActions";
import { WorkflowGuide } from "./WorkflowGuide";
import { CanvasMentionButton } from "./CanvasMentionButton";
import { FileUploadButton, formatFileInsert } from "./FileUploadButton";
import { buildSystemPrompt, canvasToPromptText } from "@drama/lib/systemPrompt";
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
	const navigate = useNavigate();
	const { show: showToast } = useToast();

	const handleBack = () => {
		if (activeTab === "details") {
			setActiveTab("chat");
			return;
		}
		navigate("/");
	};

	const handleNew = () => {
		navigate("/");
	};

	const handleShare = () => {
		showToast("分享功能即将上线", "info");
	};

	// View Prompt modal state —— 只读查看 + 复制当前 session 使用的 system prompt
	const [promptOpen, setPromptOpen] = useState(false);
	const currentPrompt = useMemo(() => {
		const projectTitle = useProjectStore.getState()
			.projects.find(p => p.id === useProjectStore.getState().currentProjectId)?.title ?? "Untitled";
		const canvasText = canvasToPromptText(useCanvasStore.getState().getCurrentNodes());
		return buildSystemPrompt(projectTitle, canvasText);
		}, []);
	const copyPrompt = async () => {
		try {
			await navigator.clipboard.writeText(currentPrompt);
			showToast("Prompt 已复制", "success");
		} catch {
			showToast("复制失败", "error");
		}
	};
	

	return (
		<>
			<div className="flex h-full flex-col overflow-hidden rounded-[var(--radius-xl)] bg-[var(--color-bg-primary)]">
			<div className="flex items-center justify-between border-b border-[var(--color-border-default)] px-2 py-1.5">
				<IconButton
					icon={<ArrowLeft className="h-4 w-4" />}
					label={activeTab === "details" ? "返回对话" : "返回项目列表"}
					size="sm"
					onClick={handleBack}
				/>
				<div className="flex items-center gap-1">
					<Button variant="ghost" size="sm" onClick={handleNew}>
						<Plus className="mr-1 h-3.5 w-3.5" />
						New
					</Button>
					<Button variant="ghost" size="sm" onClick={() => setPromptOpen(true)}>
						<Eye className="mr-1 h-3.5 w-3.5" />
						View Prompt
					</Button>
					<Button variant="ghost" size="sm" onClick={handleShare}>
						<Share2 className="mr-1 h-3.5 w-3.5" />
						Share
					</Button>
				</div>
			</div>
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
						inputLeftToolbar={
							<>
								<FileUploadButton
									onUpload={(f) => {
										window.dispatchEvent(new CustomEvent('spellpaw:insert-text', { detail: formatFileInsert(f) }));
									}}
								/>
								<CanvasMentionButton
									onPick={(node) => useCanvasStore.getState().setSelectedCardId(node.id)}
								/>
							</>
						}
						inputRows={5}
						inputClassName="border-t border-[var(--color-border-default)] bg-[var(--color-bg-primary)] p-3"
					/>
				</TabPanel>
				<TabPanel isActive={activeTab === "details" && showDetailsTab}>
					<DetailPanel />
				</TabPanel>
			</div>
		</div>

			{promptOpen && (
				<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setPromptOpen(false)}>
					<div className="flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-[var(--radius-xl)] border border-[var(--color-border-default)] bg-[var(--color-bg-primary)] shadow-2xl" onClick={(e) => e.stopPropagation()}>
						<div className="flex shrink-0 items-center justify-between border-b border-[var(--color-border-default)] px-4 py-3">
							<h2 className="text-sm font-semibold text-[var(--color-text-primary)]">System Prompt（只读）</h2>
							<Button variant="secondary" size="sm" onClick={copyPrompt}>
								<Copy className="mr-1 h-3 w-3" />
								复制
							</Button>
						</div>
						<pre className="m-0 flex-1 overflow-auto whitespace-pre-wrap break-words p-4 font-mono text-[11px] leading-relaxed text-[var(--color-text-secondary)]">{currentPrompt}</pre>
					</div>
				</div>
			)}
		</>
	);
}
