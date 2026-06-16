/**
 * useCopilotSSE — 连接配置的 LLM provider，消费 SSE 事件流
 *
 * 需要 Spellpaw Server 运行 + LLM API key 配置。
 */
import { useEffect, useRef } from 'react';
import { useChatStore } from '@drama/stores/chatStore';
import { useProjectStore } from '@drama/stores/projectStore';
import { useCanvasStore } from '@drama/stores/canvasStore';
import { buildSystemPrompt } from '@drama/lib/systemPrompt';
import { getLLMProvider } from '@drama/lib/llm';
import { findNode } from '@drama/lib/treeUtils';
import { SPELLPAW_TOOL_CONFIGS } from '@drama/lib/toolConfigs';

export function useCopilotSSE() {
  const sessionRef = useRef<string | null>(null);
  const sseRef = useRef<{ close: () => void } | null>(null);
  const providerRef = useRef(getLLMProvider());

  const {
    startStreaming, appendDelta, startToolCall, endToolCall, endStreaming, appendMessage,
  } = useChatStore();

  useEffect(() => {
    // Override sendMessage to use the configured LLM provider
    const originalSend = useChatStore.getState().sendMessage;
    let initDone = false;
    const provider = providerRef.current;

    const subscribeToSession = (sessionId: string) => {
      sseRef.current?.close();
      sseRef.current = provider.subscribeSSE(sessionId, (event) => {
        console.log('[useCopilotSSE] SSE event:', event.type, event);
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
            endStreaming(event.stop_reason as string);
            break;
          case 'error':
            appendDelta(`\n\n❌ Error: ${event.message}`);
            endStreaming('error');
            break;
        }
      });
    };

    useChatStore.setState({
      sendMessage: async (content: string) => {
        console.log('[useCopilotSSE] sendMessage called:', content.slice(0, 80));
        // Build node context for the message
        const projectStore = useProjectStore.getState();
        const tree = projectStore.getCurrentTree();
        const selectedNodeId = projectStore.selectedNodeId;
        let enrichedContent = content;
        let contextNodeId: string | undefined;
        let contextNodeType: string | undefined;
        const contextParts: string[] = [];

        if (selectedNodeId && tree) {
          const node = findNode(tree, selectedNodeId);
          if (node) {
            contextNodeId = node.id;
            contextNodeType = node.type;
            const path = projectStore.getSelectedNodePath();
            const metaParts: string[] = [];
            if (node.metadata?.description) metaParts.push(`描述：${node.metadata.description}`);
            if (node.metadata?.duration) metaParts.push(`时长：${node.metadata.duration}秒`);
            if (node.metadata?.location) metaParts.push(`地点：${node.metadata.location}`);
            contextParts.push(`当前节点：${path.join(' > ')}${metaParts.length > 0 ? ' · ' + metaParts.join(' · ') : ''}`);
          }
        }

        const selectedCard = useCanvasStore.getState().getSelectedCard();
        if (selectedCard) {
          const cardMeta = [`类型：${selectedCard.type}`, `标题：${selectedCard.data.title}`];
          if (selectedCard.data.linkedTreeNodeId) {
            cardMeta.push(`关联节点：${selectedCard.data.linkedTreeNodeId}`);
          }
          contextParts.push(`当前画布卡片：${cardMeta.join(' · ')}`);
        }

        if (contextParts.length > 0) {
          enrichedContent = `[${contextParts.join(' | ')}]\n\n${content}`;
        }

        // Add user message
        const userMsg = {
          id: crypto.randomUUID(),
          role: 'user' as const,
          content,
          type: 'text' as const,
          timestamp: new Date().toISOString(),
          context: contextNodeId ? { nodeId: contextNodeId, nodeType: contextNodeType } : undefined,
        };
        useChatStore.setState((s) => ({ messages: [...s.messages, userMsg] }));

        // Lazy init LLM session
        if (!initDone) {
          initDone = true;
          try {
            const tree = useProjectStore.getState().getCurrentTree();
            const treeText = tree ? treeToPromptText(tree as { title: string; type: string; children?: Array<Record<string, unknown>> }) : '(空项目)';
            const projectTitle = useProjectStore.getState()
              .projects.find(p => p.id === useProjectStore.getState().currentProjectId)?.title ?? 'Untitled';
            const prompt = buildSystemPrompt(projectTitle, treeText);
            console.log('[useCopilotSSE] creating session with', SPELLPAW_TOOL_CONFIGS.length, 'tools');
            const session = await provider.createSession(projectTitle, prompt, SPELLPAW_TOOL_CONFIGS);
            sessionRef.current = session.id;
            console.log('[useCopilotSSE] session created:', session.id);
            subscribeToSession(session.id);
          } catch (err) {
            console.error('[useCopilotSSE] session init failed:', err);
            appendMessage({
              id: crypto.randomUUID(),
              role: 'agent',
              content: `❌ 连接失败: ${(err as Error).message}`,
              type: 'text',
              timestamp: new Date().toISOString(),
            });
            endStreaming('error');
            return;
          }
        }

        // Send message
        if (sessionRef.current) {
          console.log('[useCopilotSSE] sending message to session', sessionRef.current);
          try {
            // Re-subscribe before each turn: some backends close the SSE stream after turn_end.
            subscribeToSession(sessionRef.current);
            await provider.sendMessage(sessionRef.current, enrichedContent);
            console.log('[useCopilotSSE] message sent');
          } catch (err) {
            console.error('[useCopilotSSE] sendMessage failed:', err);
            appendMessage({
              id: crypto.randomUUID(),
              role: 'agent',
              content: `❌ 发送失败: ${(err as Error).message}`,
              type: 'text',
              timestamp: new Date().toISOString(),
            });
            endStreaming('error');
          }
        } else {
          console.error('[useCopilotSSE] no session available');
        }
      },
    });

    return () => {
      useChatStore.setState({ sendMessage: originalSend });
      sseRef.current?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

/** Convert project tree to indented text for system_prompt */
function treeToPromptText(node: { title: string; type: string; children?: Array<Record<string, unknown>> }, depth = 0): string {
  const indent = '  '.repeat(depth);
  let text = `${indent}${node.type}「${node.title}」`;
  if (node.children) {
    for (const child of node.children) {
      text += '\n' + treeToPromptText(child as { title: string; type: string; children?: Array<Record<string, unknown>> }, depth + 1);
    }
  }
  return text;
}
