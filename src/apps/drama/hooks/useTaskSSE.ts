/**
 * useTaskSSE — per-task Pandaria session + SSE management
 *
 * Overrides taskStore.sendMessage (same pattern as usePandariaSSE).
 * On first message to a task, creates a Pandaria session, subscribes
 * to SSE, and routes events (text_delta, tool_call, turn_end, error)
 * to taskStore.
 *
 * Cleans up stale SSE connections when switching tasks.
 */
import { useEffect } from 'react';
import { useTaskStore } from '@drama/stores/taskStore';
import { useProjectStore } from '@drama/stores/projectStore';
import { createSession, sendMessage, subscribeSSE, buildSystemPrompt } from '@drama/lib/pandaria';
import { findNode } from '@drama/lib/treeUtils';
import { config } from '@/shared/config';

const TOOL_ENDPOINT = config.toolServerEndpoint;

// Reuse the same tool configs as usePandariaSSE
const TOOL_CONFIGS = [
  {
    name: 'spellpaw_add_node',
    description: 'Add a node (act/scene/shot) to the project tree.',
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
    description: "Update a node's title or metadata.",
    parameters: {
      type: 'object',
      properties: { nodeId: { type: 'string' }, changes: { type: 'object' } },
      required: ['nodeId', 'changes'],
    },
    endpoint: TOOL_ENDPOINT,
  },
  {
    name: 'spellpaw_delete_node',
    description: 'Delete a node. CAREFUL: irreversible. Ask user first.',
    parameters: {
      type: 'object',
      properties: { nodeId: { type: 'string' } },
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
    description: 'Apply a narrative template to the current project.',
    parameters: {
      type: 'object',
      properties: { templateId: { type: 'string' }, parentId: { type: 'string' } },
      required: ['templateId'],
    },
    endpoint: TOOL_ENDPOINT,
  },
  {
    name: 'spellpaw_generate_storyboard',
    description: 'Generate a storyboard reference image for a scene or shot.',
    parameters: {
      type: 'object',
      properties: { nodeId: { type: 'string' }, prompt: { type: 'string' } },
      required: ['nodeId'],
    },
    endpoint: TOOL_ENDPOINT,
  },
  {
    name: 'spellpaw_analyze_structure',
    description: 'Analyze project structure health.',
    parameters: { type: 'object', properties: {} },
    endpoint: TOOL_ENDPOINT,
  },
  {
    name: 'spellpaw_get_pacing_report',
    description: 'Get detailed pacing report with duration statistics.',
    parameters: { type: 'object', properties: {} },
    endpoint: TOOL_ENDPOINT,
  },
  {
    name: 'spellpaw_match_template',
    description: 'Match project against built-in narrative templates.',
    parameters: { type: 'object', properties: {} },
    endpoint: TOOL_ENDPOINT,
  },
  {
    name: 'spellpaw_optimize_pacing',
    description: 'Auto-adjust scene durations based on pacing analysis.',
    parameters: {
      type: 'object',
      properties: { dryRun: { type: 'boolean' } },
    },
    endpoint: TOOL_ENDPOINT,
  },
];

export function useTaskSSE() {
  const {
    startStreaming, appendDelta, startToolCall, endToolCall, endStreaming,
    sendMessage: storeSendMessage, setTaskSessionId, updateTaskTitle,
  } = useTaskStore();

  useEffect(() => {
    const taskSessions = new Map<string, string>(); // taskId → sessionId
    const taskSSE = new Map<string, { close: () => void }>(); // taskId → SSE closer

    const originalSend = useTaskStore.getState().sendMessage;

    useTaskStore.setState({
      sendMessage: async (taskId: string, content: string) => {
        // 1. Append user message locally
        storeSendMessage(taskId, content);

        try {
          // 2. Create Pandaria session if first message for this task
          if (!taskSessions.has(taskId)) {
            const projectStore = useProjectStore.getState();
            const tree = projectStore.getCurrentTree();
            const currentProjectId = projectStore.currentProjectId;
            const projectTitle = projectStore.projects.find(
              (p) => p.id === currentProjectId
            )?.title ?? 'Untitled';

            const treeText = tree ? treeToPromptText(tree, 0) : '(空项目)';
            const systemPrompt = buildSystemPrompt(projectTitle, treeText);
            const session = await createSession(projectTitle, systemPrompt, TOOL_CONFIGS);

            taskSessions.set(taskId, session.id);
            setTaskSessionId(taskId, session.id);

            // 3. Subscribe to SSE
            const sse = subscribeSSE(session.id, (event) => {
              const currentState = useTaskStore.getState();
              // Ignore events if streaming task doesn't match (stale SSE events)
              if (currentState.streamingTaskId !== taskId && event.type !== 'error') return;

              switch (event.type) {
                case 'message_start':
                  startStreaming(taskId, crypto.randomUUID());
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
                case 'turn_end': {
                  const stopReason = event.stop_reason as string;
                  endStreaming(stopReason);
                  // Auto-generate title from first turn's agent message
                  const task = useTaskStore.getState().tasks.find((t) => t.id === taskId);
                  if (task && !task.title && task.messages.length > 1) {
                    const agentMsg = [...task.messages].reverse().find((m) => m.role === 'agent');
                    if (agentMsg?.content) {
                      updateTaskTitle(taskId, agentMsg.content.slice(0, 30));
                    }
                  }
                  break;
                }
                case 'error':
                  appendDelta(`\n\n❌ ${event.message}`);
                  endStreaming('error');
                  break;
              }
            });
            taskSSE.set(taskId, sse);
          }

          // 4. Send message to Pandaria
          const sessionId = taskSessions.get(taskId);
          if (sessionId) {
            const projectStore = useProjectStore.getState();
            const tree = projectStore.getCurrentTree();
            const selectedNodeId = projectStore.selectedNodeId;
            let enrichedContent = content;

            if (selectedNodeId && tree) {
              const node = findNode(tree, selectedNodeId);
              if (node) {
                const path = projectStore.getSelectedNodePath();
                enrichedContent = `[当前节点：${path.join(' > ')}]\n\n${content}`;
              }
            }

            await sendMessage(sessionId, enrichedContent);
          }
        } catch (err) {
          appendDelta(`\n\n❌ 连接失败: ${(err as Error).message}`);
          endStreaming('error');
        }
      },
    });

    // Close non-active SSE connections on task switch
    const unsub = useTaskStore.subscribe((state, prevState) => {
      if (state.activeTaskId !== prevState.activeTaskId) {
        for (const [tid, sse] of taskSSE) {
          if (tid !== state.activeTaskId) {
            sse.close();
            taskSSE.delete(tid);
          }
        }
      }
    });

    return () => {
      unsub();
      // Restore original sendMessage
      useTaskStore.setState({ sendMessage: originalSend });
      // Close all SSE connections
      for (const sse of taskSSE.values()) {
        sse.close();
      }
    };
    // Run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

import type { TreeNode } from '@drama/types';

function treeToPromptText(node: TreeNode, depth: number): string {
  const indent = '  '.repeat(depth);
  let text = `${indent}${node.type}「${node.title}」`;
  if (node.children) {
    for (const child of node.children) {
      text += '\n' + treeToPromptText(child, depth + 1);
    }
  }
  return text;
}
