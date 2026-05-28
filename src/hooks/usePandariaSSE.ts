/**
 * usePandariaSSE — 连接 Pandaria，消费 SSE 事件流
 *
 * 替换 useMockSSE。需要 Pandaria 本地运行 + LLM API key 配置。
 */
import { useEffect, useRef } from 'react';
import { useChatStore } from '../stores/chatStore';
import { useProjectStore } from '../stores/projectStore';
import { createSession, sendMessage, subscribeSSE, buildSystemPrompt } from '../lib/pandaria';

/** Tool configs: all pointing to the local Tool Server */
const TOOL_CONFIGS = [
  {
    name: 'spellpaw_add_node',
    description: 'Add a node (act/scene/shot) to the project tree. parentId required, type/title required.',
    parameters: {
      type: 'object',
      properties: {
        parentId: { type: 'string' },
        type: { type: 'string', enum: ['act', 'scene', 'shot'] },
        title: { type: 'string' },
        description: { type: 'string' },
        duration: { type: 'number' },
      },
      required: ['parentId', 'type', 'title'],
    },
    endpoint: 'http://localhost:5173/tool',
  },
  {
    name: 'spellpaw_update_node',
    description: 'Update a node\'s title or metadata.',
    parameters: {
      type: 'object',
      properties: {
        nodeId: { type: 'string' },
        changes: { type: 'object' },
      },
      required: ['nodeId', 'changes'],
    },
    endpoint: 'http://localhost:5173/tool',
  },
  {
    name: 'spellpaw_delete_node',
    description: 'Delete a node. CAREFUL: irreversible. Ask user first.',
    parameters: {
      type: 'object',
      properties: {
        nodeId: { type: 'string' },
      },
      required: ['nodeId'],
    },
    endpoint: 'http://localhost:5173/tool',
  },
  {
    name: 'spellpaw_get_tree',
    description: 'Get the full project tree structure.',
    parameters: { type: 'object', properties: {} },
    endpoint: 'http://localhost:5173/tool',
  },
  {
    name: 'spellpaw_get_subtree',
    description: 'Get a subtree starting from a specific node.',
    parameters: {
      type: 'object',
      properties: { nodeId: { type: 'string' } },
      required: ['nodeId'],
    },
    endpoint: 'http://localhost:5173/tool',
  },
];

export function usePandariaSSE() {
  const sessionRef = useRef<string | null>(null);
  const sseRef = useRef<{ close: () => void } | null>(null);

  const {
    startStreaming, appendDelta, startToolCall, endToolCall, endStreaming,
    sendMessage: storeSend, isLoading,
  } = useChatStore();

  useEffect(() => {
    // Override sendMessage to use Pandaria
    const originalSend = useChatStore.getState().sendMessage;
    let initDone = false;

    useChatStore.setState({
      sendMessage: async (content: string) => {
        // Add user message
        const userMsg = {
          id: crypto.randomUUID(),
          role: 'user' as const,
          content,
          type: 'text' as const,
          timestamp: new Date().toISOString(),
        };
        useChatStore.setState((s) => ({ messages: [...s.messages, userMsg] }));

        // Lazy init Pandaria session
        if (!initDone) {
          initDone = true;
          try {
            const tree = useProjectStore.getState().getCurrentTree();
            const treeText = tree ? treeToPromptText(tree) : '(空项目)';
            const projectTitle = useProjectStore.getState()
              .projects.find(p => p.id === useProjectStore.getState().currentProjectId)?.title ?? 'Untitled';
            const prompt = buildSystemPrompt(projectTitle, treeText);
            const session = await createSession(projectTitle, prompt, TOOL_CONFIGS);
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
            await sendMessage(sessionRef.current, content);
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
  }, []);
}

/** Convert project tree to indented text for system_prompt */
function treeToPromptText(node: { title: string; type: string; children?: Array<{ title: string; type: string; children?: unknown[] }> }, depth = 0): string {
  const indent = '  '.repeat(depth);
  let text = `${indent}${node.type}「${node.title}」`;
  if (node.children) {
    for (const child of node.children as Array<{ title: string; type: string; children?: unknown[] }>) {
      text += '\n' + treeToPromptText(child, depth + 1);
    }
  }
  return text;
}
