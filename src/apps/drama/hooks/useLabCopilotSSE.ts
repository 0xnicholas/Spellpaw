/**
 * useLabCopilotSSE — /copilot-lab 路由专属的 SSE hook。
 *
 * 与 useCopilotSSE 的关键差异：
 *  1. 不读 projectStore / canvasStore —— 纯对话，无项目上下文
 *  2. session 注册的 tools 始终是 [] —— LLM 无法调用任何工具
 *  3. 每个 SSE 事件推一份给 copilotLabStore，给右侧 Inspector 实时显示
 *  4. 不触发任何 canvas guardrail / highlight（没有画布）
 *
 * 仍然走 chatStore.sendMessage（用 LAB_PROJECT_ID 作为 key 隔离消息），
 * 这样 CopilotChat 组件可以 0 改动复用。
 */
import { useEffect, useRef } from 'react';
import { useChatStore } from '@drama/stores/chatStore';
import { buildSystemPrompt } from '@drama/lib/systemPrompt';
import { getLLMProvider } from '@drama/lib/llm';
import { logger } from '@shared/lib/logger';
import { useCopilotLabStore, LAB_PROJECT_ID } from '@drama/stores/copilotLabStore';

export function useLabCopilotSSE() {
  const sessionRef = useRef<string | null>(null);
  const sseRef = useRef<{ close: () => void } | null>(null);
  const providerRef = useRef(getLLMProvider());
  const creatingSessionRef = useRef(false);

  const {
    startStreaming, appendDelta, startToolCall, endToolCall, endStreaming, appendMessage,
  } = useChatStore();

  useEffect(() => {
    const originalSend = useChatStore.getState().sendMessage;
    const provider = providerRef.current;

    const subscribeToSession = (sessionId: string) => {
      sseRef.current?.close();
      sseRef.current = provider.subscribeSSE(sessionId, (event) => {
        // 关键：每个事件都推一份给 lab store
        useCopilotLabStore.getState().pushEvent(event);

        logger.log('[useLabCopilotSSE] SSE event:', event.type, event);
        switch (event.type) {
          case 'message_start':
            startStreaming(crypto.randomUUID());
            break;
          case 'text_delta':
            appendDelta(event.delta as string);
            break;
          case 'tool_call_started':
            startToolCall(event.call_id as string, event.name as string);
            break;
          case 'tool_call_done':
            endToolCall(event.call_id as string);
            break;
          case 'turn_end':
            endStreaming(LAB_PROJECT_ID, event.stop_reason as string);
            break;
          case 'error':
            appendDelta(`\n\n❌ Error: ${event.message}`);
            endStreaming(LAB_PROJECT_ID, 'error');
            break;
        }
      });
    };

    useChatStore.setState({
      sendMessage: async (content: string) => {
        logger.log('[useLabCopilotSSE] sendMessage:', content.slice(0, 80));

        // 写入用户消息
        const userMsg = {
          id: crypto.randomUUID(),
          role: 'user' as const,
          content,
          type: 'text' as const,
          timestamp: new Date().toISOString(),
        };
        appendMessage(userMsg, LAB_PROJECT_ID);

        // 懒初始化 session —— 用 (no project) + 空 canvas + 空 tools
        if (!sessionRef.current && !creatingSessionRef.current) {
          creatingSessionRef.current = true;
          try {
            const systemPrompt = buildSystemPrompt('(no project)', '(画布为空)');
            // 关键：tools 始终为 [] —— Lab 模式不暴露任何工具
            const session = await provider.createSession('Copilot Lab', systemPrompt, []);
            sessionRef.current = session.id;

            useCopilotLabStore.getState().setSessionMeta({
              systemPrompt,
              tools: [],
              sessionId: session.id,
              createdAt: new Date().toISOString(),
            });
            useCopilotLabStore.getState().clearEvents();

            logger.log('[useLabCopilotSSE] lab session created:', session.id);
            subscribeToSession(session.id);
          } catch (err) {
            logger.error('[useLabCopilotSSE] session init failed:', err);
            appendMessage({
              id: crypto.randomUUID(),
              role: 'agent',
              content: `❌ 连接失败: ${(err as Error).message}`,
              type: 'text',
              timestamp: new Date().toISOString(),
            }, LAB_PROJECT_ID);
            endStreaming(LAB_PROJECT_ID, 'error');
            return;
          } finally {
            creatingSessionRef.current = false;
          }
        }

        if (sessionRef.current) {
          try {
            subscribeToSession(sessionRef.current);
            await provider.sendMessage(sessionRef.current, content);
          } catch (err) {
            logger.error('[useLabCopilotSSE] sendMessage failed:', err);
            appendMessage({
              id: crypto.randomUUID(),
              role: 'agent',
              content: `❌ 发送失败: ${(err as Error).message}`,
              type: 'text',
              timestamp: new Date().toISOString(),
            }, LAB_PROJECT_ID);
            endStreaming(LAB_PROJECT_ID, 'error');
          }
        }
      },
    });

    return () => {
      useChatStore.setState({ sendMessage: originalSend });
      sseRef.current?.close();
      sessionRef.current = null;
      creatingSessionRef.current = false;
    };
  }, [appendDelta, appendMessage, endStreaming, endToolCall, startStreaming, startToolCall]);

  // Watch pendingPromptOverride：从 Inspector 保存过来的新 prompt → 重建 session
  const pendingOverride = useCopilotLabStore((s) => s.pendingPromptOverride);
  useEffect(() => {
    if (pendingOverride === null) return;
    const override = pendingOverride;
    if (creatingSessionRef.current) return;

    const provider = providerRef.current;
    let cancelled = false;

    (async () => {
      creatingSessionRef.current = true;
      try {
        // 关闭旧订阅、清空 session，让后续 sendMessage 看到空 session 走重建路径
        sseRef.current?.close();
        sseRef.current = null;
        sessionRef.current = null;
        useCopilotLabStore.getState().clearEvents();

        const session = await provider.createSession('Copilot Lab', override, []);
        if (cancelled) return;
        sessionRef.current = session.id;

        useCopilotLabStore.getState().setSessionMeta({
          systemPrompt: override,
          tools: [],
          sessionId: session.id,
          createdAt: new Date().toISOString(),
        });
        // 重新订阅（通过全局唯一一个内部实现）
        // 这里复用 store-level override 已经被清除的语义
        sseRef.current = provider.subscribeSSE(session.id, (event) => {
          useCopilotLabStore.getState().pushEvent(event);
          switch (event.type) {
            case 'message_start':
              startStreaming(crypto.randomUUID());
              break;
            case 'text_delta':
              appendDelta(event.delta as string);
              break;
            case 'tool_call_started':
              startToolCall(event.call_id as string, event.name as string);
              break;
            case 'tool_call_done':
              endToolCall(event.call_id as string);
              break;
            case 'turn_end':
              endStreaming(LAB_PROJECT_ID, event.stop_reason as string);
              break;
            case 'error':
              appendDelta(`\n\n❌ Error: ${event.message}`);
              endStreaming(LAB_PROJECT_ID, 'error');
              break;
          }
        });
        logger.log('[useLabCopilotSSE] session restarted with override:', session.id);
      } catch (err) {
        logger.error('[useLabCopilotSSE] restart failed:', err);
        appendMessage({
          id: crypto.randomUUID(),
          role: 'agent',
          content: `❌ 重启 Session 失败: ${(err as Error).message}`,
          type: 'text',
          timestamp: new Date().toISOString(),
        }, LAB_PROJECT_ID);
        endStreaming(LAB_PROJECT_ID, 'error');
      } finally {
        creatingSessionRef.current = false;
        // 消费掉 override，不论成败都清掉（避免重复触发）
        useCopilotLabStore.getState().setPendingPromptOverride(null);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    pendingOverride,
    appendDelta, appendMessage, endStreaming, endToolCall, startStreaming, startToolCall,
  ]);
}