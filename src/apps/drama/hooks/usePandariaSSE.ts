/**
 * usePandariaSSE — 连接 Pandaria，消费 SSE 事件流
 *
 * 替换 useMockSSE。需要 Pandaria 本地运行 + LLM API key 配置。
 */
import { useEffect, useRef } from 'react';
import { useChatStore } from '@drama/stores/chatStore';
import { useProjectStore } from '@drama/stores/projectStore';
import { createSession, sendMessage, subscribeSSE, buildSystemPrompt } from '@drama/lib/pandaria';
import { findNode } from '@drama/lib/treeUtils';
import { SPELLPAW_TOOL_CONFIGS } from '@drama/lib/toolConfigs';

export function usePandariaSSE() {
  const sessionRef = useRef<string | null>(null);
  const sseRef = useRef<{ close: () => void } | null>(null);

  const {
    startStreaming, appendDelta, startToolCall, endToolCall, endStreaming,
  } = useChatStore();

  useEffect(() => {
    // Override sendMessage to use Pandaria
    const originalSend = useChatStore.getState().sendMessage;
    let initDone = false;

    useChatStore.setState({
      sendMessage: async (content: string) => {
        // Build node context for the message
        const projectStore = useProjectStore.getState();
        const tree = projectStore.getCurrentTree();
        const selectedNodeId = projectStore.selectedNodeId;
        let enrichedContent = content;
        let contextNodeId: string | undefined;
        let contextNodeType: string | undefined;

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
            const contextHeader = `[当前节点：${path.join(' > ')}${metaParts.length > 0 ? ' · ' + metaParts.join(' · ') : ''}]`;
            enrichedContent = `${contextHeader}\n\n${content}`;
          }
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

        // Lazy init Pandaria session
        if (!initDone) {
          initDone = true;
          try {
            const tree = useProjectStore.getState().getCurrentTree();
            const treeText = tree ? treeToPromptText(tree as { title: string; type: string; children?: Array<Record<string, unknown>> }) : '(空项目)';
            const projectTitle = useProjectStore.getState()
              .projects.find(p => p.id === useProjectStore.getState().currentProjectId)?.title ?? 'Untitled';
            const prompt = buildSystemPrompt(projectTitle, treeText);
            const session = await createSession(projectTitle, prompt, SPELLPAW_TOOL_CONFIGS);
            sessionRef.current = session.id;

            // Subscribe to SSE
            sseRef.current?.close();
            sseRef.current = subscribeSSE(session.id, (event) => {
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
          } catch (err) {
            appendDelta(`\n\n❌ Failed to connect to Pandaria: ${(err as Error).message}`);
            endStreaming('error');
            return;
          }
        }

        // Send message
        if (sessionRef.current) {
          try {
            await sendMessage(sessionRef.current, enrichedContent);
          } catch (err) {
            appendDelta(`\n\n❌ ${(err as Error).message}`);
            endStreaming('error');
          }
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
