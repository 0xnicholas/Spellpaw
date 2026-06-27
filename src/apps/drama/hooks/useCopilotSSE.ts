/**
 * useCopilotSSE — 连接配置的 LLM provider，消费 SSE 事件流
 *
 * 需要 Spellpaw Server 运行 + LLM API key 配置。
 */
import { useEffect, useRef } from 'react';
import { useChatStore } from '@drama/stores/chatStore';
import { useProjectStore } from '@drama/stores/projectStore';
import { useCanvasStore } from '@drama/stores/canvasStore';
import type { ChatMessage } from '@drama/types';
import { buildSystemPrompt, canvasToPromptText } from '@drama/lib/systemPrompt';
import { getLLMProvider } from '@drama/lib/llm';
import { SPELLPAW_TOOL_CONFIGS } from '@drama/lib/toolConfigs';
import { detectIntent, intentToToolChoice } from '@drama/lib/intentRouter';
import {
  generateAsset,
  generateVariants,
  editAsset,
  applyStyle,
  batchApplyStyle,
} from '@drama/lib/canvasToolkit';
import { logger } from '@shared/lib/logger';
import { isSlashCommand, tryRunSkill, formatSkillInvocation, augmentUserMessage } from '@drama/lib/skills/chat';
import { parseToolResult } from '@drama/lib/toolResultFormat';
import type { CanvasIntent } from '@drama/lib/intentRouter';

export function useCopilotSSE() {
  const sessionRef = useRef<string | null>(null);
  const sseRef = useRef<{ close: () => void } | null>(null);
  const providerRef = useRef(getLLMProvider());
  const creatingSessionRef = useRef(false);
  const toolCallStartedRef = useRef(false);
  const toolCallsInTurnRef = useRef<string[]>([]);
  const currentIntentRef = useRef<CanvasIntent | null>(null);

  /** Epoch ms — updated on every sendMessage to drive the idle timeout. */
  const lastActivityRef = useRef<number | null>(null);

  /** Sessions idle longer than this on the client get a server DELETE
   *  so we don't leak memory on the Spellpaw Server between user sessions.
   *  Server-side has its own 30 min sweep as a safety net (server/src/routes/llm.ts). */
  const IDLE_TIMEOUT_MS = 30 * 60 * 1000;
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function scheduleIdleCleanup(): void {
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => {
      const id = sessionRef.current;
      logger.log('[useCopilotSSE] idle timeout reached, deleting session:', id);
      if (id) {
        void providerRef.current.deleteSession(id);
      }
      sseRef.current?.close();
      sseRef.current = null;
      sessionRef.current = null;
      idleTimerRef.current = null;
    }, IDLE_TIMEOUT_MS);
  }

  const CANVAS_TOOL_NAMES = new Set([
    'spellpaw_generate_asset',
    'spellpaw_generate_variants',
    'spellpaw_edit_asset',
    'spellpaw_apply_style',
    'spellpaw_batch_apply_style',
    'spellpaw_add_card',
    'spellpaw_add_storyline_card',
    'spellpaw_add_moodboard_card',
    'spellpaw_add_video_clip_card',
    'spellpaw_add_asset_card',
    'spellpaw_add_task_card',
    'spellpaw_add_art_card',
    'spellpaw_add_character_card',
    'spellpaw_update_card',
    'spellpaw_delete_card',
    'spellpaw_batch_update_cards',
    'spellpaw_batch_delete_cards',
    'spellpaw_batch_add_cards',
    'spellpaw_clear_canvas',
    'spellpaw_generate_storyboard',
  ]);

  const {
    startStreaming, appendDelta, startToolCall, endToolCall, endStreaming, appendMessage,
  } = useChatStore();

  const currentProjectId = useProjectStore((s) => s.currentProjectId);

  useEffect(() => {
    // Override sendMessage to use the configured LLM provider
    const originalSend = useChatStore.getState().sendMessage;
    const provider = providerRef.current;
    const projectId = currentProjectId;
    // Snapshot providerRef for the cleanup closure so the lint rule sees a
    // stable reference (it warns about reading .current at unmount time).
    const providerForCleanup = provider;

    const subscribeToSession = (sessionId: string) => {
      sseRef.current?.close();
      toolCallStartedRef.current = false;
      toolCallsInTurnRef.current = [];
      sseRef.current = provider.subscribeSSE(sessionId, (event) => {
        logger.log('[useCopilotSSE] SSE event:', event.type, event);
        switch (event.type) {
          case 'message_start':
            toolCallStartedRef.current = false;
            toolCallsInTurnRef.current = [];
            startStreaming(crypto.randomUUID());
            break;
          case 'text_delta':
            appendDelta(event.delta as string);
            break;
          case 'tool_call_started':
            toolCallStartedRef.current = true;
            toolCallsInTurnRef.current.push(String(event.name));
            startToolCall(event.call_id as string, event.name as string);
            break;
          case 'tool_call_done': {
            // Spellpaw Server emits is_error + content on failed tool calls.
            const isError = Boolean((event as { is_error?: boolean }).is_error);
            const rawContent = String((event as { content?: unknown }).content ?? '');
            const errorText = isError ? (rawContent || 'Tool call failed') : undefined;
            endToolCall(
              event.call_id as string,
              isError ? 'error' : 'success',
              errorText,
            );
            // Highlight affected canvas cards — parse structured JSON results.
            // Phase 2: also apply sideEffects for real-time canvas updates
            // (e.g. card added / thumbnail updated) without waiting for a
            // full canvas re-fetch.
            if (CANVAS_TOOL_NAMES.has(String(event.name))) {
              const parsed = parseToolResult(rawContent);
              if (parsed.parsed) {
                if (parsed.result.affectedCardIds?.length) {
                  useCanvasStore.getState().triggerHighlight(
                    parsed.result.affectedCardIds.slice(-3),
                  );
                }
                // Apply structured sideEffects if present
                const se = parsed.result.sideEffects?.canvas;
                if (se?.cardsUpdated?.length) {
                  for (const u of se.cardsUpdated) {
                    const patch: Record<string, unknown> = {};
                    if (u.thumbnail) patch.thumbnail = u.thumbnail;
                    if (u.status) patch.generationStatus = u.status;
                    useCanvasStore.getState().updateNodeData(u.id, patch as Partial<import('@drama/types').CanvasNodeData>);
                  }
                }
              }
            }
            break;
          }
          case 'turn_end':
            endStreaming(projectId!, event.stop_reason as string);
            // Client guardrail: enforce the canvas intent even if the LLM only
            // called read-only/context tools (e.g. get_tree) or no tool at all.
            if (currentIntentRef.current && !canvasToolWasCalled()) {
              logger.log('[useCopilotSSE] guardrail triggered for intent:', currentIntentRef.current.type);
              void runGuardrail(currentIntentRef.current);
            }
            currentIntentRef.current = null;
            break;
          case 'error':
            appendDelta(`\n\n❌ Error: ${event.message}`);
            endStreaming(projectId!, 'error');
            currentIntentRef.current = null;
            break;
        }
      });
    };

    function canvasToolWasCalled(): boolean {
      return toolCallsInTurnRef.current.some((name) => CANVAS_TOOL_NAMES.has(name));
    }

    async function runGuardrail(intent: CanvasIntent) {
      if (intent.type === 'unknown') return;
      logger.log('[useCopilotSSE] running guardrail for', intent.type, 'with payload:', intent.payload);
      try {
        let result: { success: boolean; message: string };
        switch (intent.type) {
          case 'generate_asset':
            result = await generateAsset(intent.payload as unknown as Parameters<typeof generateAsset>[0]);
            break;
          case 'generate_variants':
            result = await generateVariants(intent.payload as unknown as Parameters<typeof generateVariants>[0]);
            break;
          case 'edit_asset':
            result = await editAsset(intent.payload as unknown as Parameters<typeof editAsset>[0]);
            break;
          case 'apply_style':
            result = await applyStyle(intent.payload as unknown as Parameters<typeof applyStyle>[0]);
            break;
          case 'batch_apply_style':
            result = await batchApplyStyle(intent.payload as unknown as Parameters<typeof batchApplyStyle>[0]);
            break;
          default:
            return;
        }
        logger.log('[useCopilotSSE] guardrail result:', result);
        appendMessage({
          id: crypto.randomUUID(),
          role: 'agent',
          content: result.success ? result.message : `❌ ${result.message}`,
          type: 'action',
          timestamp: new Date().toISOString(),
        }, projectId!);
      } catch (err) {
        logger.error('[useCopilotSSE] guardrail failed:', err);
        appendMessage({
          id: crypto.randomUUID(),
          role: 'agent',
          content: `❌ 自动执行失败: ${(err as Error).message}`,
          type: 'action',
          timestamp: new Date().toISOString(),
        }, projectId!);
      }
    }

    useChatStore.setState({
      sendMessage: async (content: string, _projectId: string) => {
        const projectId = currentProjectId;
        if (!projectId) {
          logger.warn('[useCopilotSSE] sendMessage ignored: no project selected');
          return;
        }
        logger.log('[useCopilotSSE] sendMessage called:', content.slice(0, 80));

        // Phase 2 of skills-refactor: slash command content is augmented
        // in-place so the LLM receives skill instructions. The user still
        // sees their original slash command in the message log.
        // The invocation notice tells the user which skill is being invoked.
        if (isSlashCommand(content)) {
          const started = tryRunSkill(content, projectId);
          if (started) {
            const invocationMsg: ChatMessage = {
              id: crypto.randomUUID(),
              role: 'agent',
              content: formatSkillInvocation(started.skillId),
              type: 'text',
              timestamp: new Date().toISOString(),
            };
            useChatStore.getState().appendMessage(invocationMsg, projectId);
          }
          // Rewrite content so the LLM receives augmented instructions
          // instead of the raw slash command.
          content = augmentUserMessage(content, projectId);
        }

        // Build card context for the message
        let enrichedContent = content;
        let contextCardId: string | undefined;
        const contextParts: string[] = [];

        const selectedCard = useCanvasStore.getState().getSelectedCard();
        if (selectedCard) {
          contextCardId = selectedCard.id;
          const metaParts: string[] = [`类型：${selectedCard.type}`, `标题：${selectedCard.data.title}`];
          if (selectedCard.data.description) metaParts.push(`描述：${selectedCard.data.description}`);
          if (selectedCard.data.location) metaParts.push(`地点：${selectedCard.data.location}`);
          if (selectedCard.data.duration) metaParts.push(`时长：${selectedCard.data.duration}s`);
          contextParts.push(`当前卡片：${metaParts.join(' · ')}`);
        }

        if (contextParts.length > 0) {
          enrichedContent = `[${contextParts.join(' | ')}]\n\n${content}`;
        }

        // Detect canvas toolkit intent and decide whether to force a tool choice.
        const intentResult = detectIntent(content, {
          selectedCard: useCanvasStore.getState().getSelectedCard(),
        });
        currentIntentRef.current = intentResult.confidence === 'high' ? intentResult.intent : null;
        const toolChoice = intentResult.confidence === 'high'
          ? intentToToolChoice(intentResult.intent)
          : undefined;
        if (toolChoice) {
          logger.log('[useCopilotSSE] forcing tool choice:', toolChoice.function.name);
        } else if (intentResult.confidence === 'high') {
          logger.log('[useCopilotSSE] high-confidence intent without toolChoice:', intentResult.intent.type);
        }

        // Add user message
        const userMsg = {
          id: crypto.randomUUID(),
          role: 'user' as const,
          content,
          type: 'text' as const,
          timestamp: new Date().toISOString(),
          context: contextCardId ? { nodeId: contextCardId, nodeType: selectedCard?.type } : undefined,
        };
        appendMessage(userMsg, projectId);

        // Reset idle timer on every user-initiated activity.
        lastActivityRef.current = Date.now();
        scheduleIdleCleanup();

        // Lazy init LLM session
        if (!sessionRef.current && !creatingSessionRef.current) {
          creatingSessionRef.current = true;
          try {
            const canvasText = canvasToPromptText(useCanvasStore.getState().getCurrentNodes());
            const projectTitle = useProjectStore.getState()
              .projects.find(p => p.id === useProjectStore.getState().currentProjectId)?.title ?? 'Untitled';
            const prompt = buildSystemPrompt(projectTitle, canvasText);
            logger.log('[useCopilotSSE] creating session with', SPELLPAW_TOOL_CONFIGS.length, 'tools');
            const session = await provider.createSession(projectTitle, prompt, SPELLPAW_TOOL_CONFIGS, toolChoice);
            sessionRef.current = session.id;
            logger.log('[useCopilotSSE] session created:', session.id);
            subscribeToSession(session.id);
          } catch (err) {
            logger.error('[useCopilotSSE] session init failed:', err);
            appendMessage({
              id: crypto.randomUUID(),
              role: 'agent',
              content: `❌ 连接失败: ${(err as Error).message}`,
              type: 'text',
              timestamp: new Date().toISOString(),
            }, projectId);
            endStreaming(projectId, 'error');
            return;
          } finally {
            creatingSessionRef.current = false;
          }
        }

        // Send message
        if (sessionRef.current) {
          logger.log('[useCopilotSSE] sending message to session', sessionRef.current);
          try {
            // Re-subscribe before each turn: some backends close the SSE stream after turn_end.
            subscribeToSession(sessionRef.current);
            await provider.sendMessage(sessionRef.current, enrichedContent, toolChoice);
            logger.log('[useCopilotSSE] message sent');
          } catch (err) {
            logger.error('[useCopilotSSE] sendMessage failed:', err);
            appendMessage({
              id: crypto.randomUUID(),
              role: 'agent',
              content: `❌ 发送失败: ${(err as Error).message}`,
              type: 'text',
              timestamp: new Date().toISOString(),
            }, projectId);
            endStreaming(projectId, 'error');
          }
        } else {
          logger.error('[useCopilotSSE] no session available');
        }
      },
    });

    return () => {
      useChatStore.setState({ sendMessage: originalSend });
      // Best-effort: tell the server to free the session's memory when
      // the user navigates away (project switch / unmount). Without this,
      // sessions live forever in the Spellpaw Server's in-memory Map and
      // accumulate conversation history unboundedly.
      const id = sessionRef.current;
      if (id) {
        void providerForCleanup.deleteSession(id);
      }
      sseRef.current?.close();
      sessionRef.current = null;
      creatingSessionRef.current = false;
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
        idleTimerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentProjectId]);

  // ── Abort listener ──
  // chatStore.abortTurn() dispatches a 'spellpaw:abort-turn' event. We close
  // the SSE subscription and reset the session so the next user message
  // starts a fresh turn (avoids re-using a stale session id). We also
  // explicitly delete the server-side session so its memory is freed.
  useEffect(() => {
    const handler = () => {
      logger.log('[useCopilotSSE] abort-turn received, closing SSE + resetting session');
      const id = sessionRef.current;
      if (id) {
        void providerRef.current.deleteSession(id);
      }
      sseRef.current?.close();
      sseRef.current = null;
      sessionRef.current = null;
      creatingSessionRef.current = false;
      toolCallsInTurnRef.current = [];
      currentIntentRef.current = null;
      if (idleTimerRef.current) {
        clearTimeout(idleTimerRef.current);
        idleTimerRef.current = null;
      }
    };
    window.addEventListener('spellpaw:abort-turn', handler);
    return () => window.removeEventListener('spellpaw:abort-turn', handler);
  }, []);
}

// canvasToPromptText 现在在 @drama/lib/systemPrompt 里导出，这里不再定义。
