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
import { config } from '@/shared/config';

const TOOL_ENDPOINT = config.toolServerEndpoint;

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
    endpoint: TOOL_ENDPOINT,
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
    endpoint: TOOL_ENDPOINT,
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
    endpoint: TOOL_ENDPOINT,
  },
  {
    name: 'spellpaw_get_tree',
    description: 'Get the full project tree structure.',
    parameters: { type: 'object', properties: {} },
    endpoint: TOOL_ENDPOINT,
  },
  {
    name: 'spellpaw_get_subtree',
    description: 'Get a subtree starting from a specific node.',
    parameters: {
      type: 'object',
      properties: { nodeId: { type: 'string' } },
      required: ['nodeId'],
    },
    endpoint: TOOL_ENDPOINT,
  },
  {
    name: 'spellpaw_apply_template',
    description: 'Apply a narrative template to the current project. Creates acts, scenes, and shots from the template structure.',
    parameters: {
      type: 'object',
      properties: {
        templateId: { type: 'string' },
        parentId: { type: 'string' },
      },
      required: ['templateId'],
    },
    endpoint: TOOL_ENDPOINT,
  },
  {
    name: 'spellpaw_generate_storyboard',
    description: 'Generate a storyboard reference image for a scene or shot. Returns an image URL that is attached to the linked canvas card.',
    parameters: {
      type: 'object',
      properties: {
        nodeId: { type: 'string' },
        prompt: { type: 'string' },
      },
      required: ['nodeId'],
    },
    endpoint: TOOL_ENDPOINT,
  },
  {
    name: 'spellpaw_analyze_structure',
    description: 'Analyze the project structure health: check act/scene counts, duration distribution, and suggest completions. Returns a diagnostic report.',
    parameters: { type: 'object', properties: {} },
    endpoint: TOOL_ENDPOINT,
  },
  {
    name: 'spellpaw_get_pacing_report',
    description: 'Get a detailed pacing report with duration statistics, coefficient of variation, and specific rhythm issues. Use when user asks about pacing or timing.',
    parameters: { type: 'object', properties: {} },
    endpoint: TOOL_ENDPOINT,
  },
  {
    name: 'spellpaw_match_template',
    description: 'Match the current project against built-in narrative templates based on title, description, and scene keywords. Returns the best match with similarity score.',
    parameters: { type: 'object', properties: {} },
    endpoint: TOOL_ENDPOINT,
  },
  {
    name: 'spellpaw_optimize_pacing',
    description: 'Auto-adjust scene durations based on pacing analysis. dryRun=true (default) returns a preview plan; dryRun=false executes the changes.',
    parameters: {
      type: 'object',
      properties: {
        dryRun: { type: 'boolean', description: 'If true, returns preview only. If false, executes changes.' },
      },
    },
    endpoint: TOOL_ENDPOINT,
  },
];

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
