/**
 * useMockSSE — 模拟 Pandaria SSE 事件流，用于 Chat UI 开发
 *
 * Pandaria 就绪后，替换为真实的 usePandariaSSE hook。
 */
import { useEffect } from 'react';
import { useChatStore } from '@drama/stores/chatStore';
import { generateId } from '@/shared/lib/utils';

// 模拟一轮完整的 Agent 回复（含 tool call）
const MOCK_TURN = [
  { type: 'message_start' as const, delay: 0 },
  { type: 'text_delta' as const, delta: '好的，我来为你构思这部短剧。\n\n', delay: 300 },
  { type: 'text_delta' as const, delta: '📋 **《密室来电》**\n', delay: 400 },
  { type: 'text_delta' as const, delta: '第一幕：困局（2 场景）\n', delay: 300 },
  { type: 'text_delta' as const, delta: ' 场景 1-1：醒来 · 30s\n', delay: 250 },
  { type: 'text_delta' as const, delta: ' 场景 1-2：发现纸条 · 30s\n', delay: 250 },
  { type: 'text_delta' as const, delta: '第二幕：博弈（2 场景）\n', delay: 300 },
  { type: 'text_delta' as const, delta: ' 场景 2-1：电话响起 · 30s\n', delay: 250 },
  { type: 'text_delta' as const, delta: ' 场景 2-2：声音的主人 · 30s\n', delay: 250 },
  { type: 'text_delta' as const, delta: '第三幕：真相（1 场景）\n', delay: 300 },
  { type: 'text_delta' as const, delta: ' 场景 3-1：密室的门开了 · 30s\n', delay: 250 },
  { type: 'text_delta' as const, delta: '\n总计 **5 场景 / 60 秒**\n\n', delay: 400 },
  { type: 'text_delta' as const, delta: '确认后我帮你搭建项目结构。', delay: 300 },
  { type: 'tool_call_started' as const, name: 'spellpaw_get_tree', callId: 'mock-c1', delay: 200 },
  { type: 'tool_call_done' as const, callId: 'mock-c1', delay: 500 },
  { type: 'turn_end' as const, stop_reason: 'stop', delay: 0 },
];

export function useMockSSE() {
  const {
    startStreaming, appendDelta, startToolCall, endToolCall, endStreaming,
  } = useChatStore();

  // Override sendMessage to use mock SSE
  useEffect(() => {
    const originalSend = useChatStore.getState().sendMessage;
    useChatStore.setState({
      sendMessage: (content: string) => {
        // Add user message normally
        const userMsg = {
          id: generateId('msg_'),
          role: 'user' as const,
          content,
          type: 'text' as const,
          timestamp: new Date().toISOString(),
        };
        useChatStore.setState((s) => ({ messages: [...s.messages, userMsg] }));

        // Start streaming
        const msgId = generateId('msg_');
        startStreaming(msgId);

        // Play mock events sequentially
        let i = 0;
        function next() {
          if (i >= MOCK_TURN.length) return;
          const evt = MOCK_TURN[i++];
          setTimeout(() => {
            switch (evt.type) {
              case 'text_delta':
                appendDelta(evt.delta);
                break;
              case 'tool_call_started':
                startToolCall(evt.callId, evt.name);
                break;
              case 'tool_call_done':
                endToolCall(evt.callId);
                break;
              case 'turn_end':
                endStreaming(evt.stop_reason);
                return; // stop
            }
            next();
          }, evt.delay);
        }
        next();
      },
    });

    return () => {
      useChatStore.setState({ sendMessage: originalSend });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
