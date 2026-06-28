/**
 * CopilotLabPage — /copilot-lab 调试页
 *
 * 左侧：复用现有 CopilotChat（无项目上下文，tools 已被 hook 强制为空）
 * 右侧：Inspector 面板（默认展开）
 * 顶部 banner：明示 Lab 模式 + 入口说明
 */
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, FlaskConical, Trash2 } from 'lucide-react';
import { CopilotChat } from '@chat/copilot';

import { Inspector } from '@drama/components/copilot-lab/Inspector';
import { useChatStore } from '@drama/stores/chatStore';
import { useCopilotLabStore, LAB_PROJECT_ID } from '@drama/stores/copilotLabStore';
import { useProjectStore } from '@drama/stores/projectStore';
import { useLabCopilotSSE } from '@drama/hooks/useLabCopilotSSE';
import { LabInputToolbar } from '@drama/components/copilot-lab/LabInputToolbar';

const COPILOT_WIDTH_PX = 400;

export function CopilotLabPage() {
  // 进入时清空 lab chat（chat store 的 LAB_PROJECT_ID 隔离命名空间）
  useEffect(() => {
    useChatStore.getState().clearMessages();
    useChatStore.getState().loadChat(LAB_PROJECT_ID);
    // 离开时恢复 projectStore.currentProjectId：避免 Load Demo Canvas 临时设的
    // fake projectId 泄漏到 /workspace 等其他页面
    const prevProjectId = useProjectStore.getState().currentProjectId;
    return () => {
      useProjectStore.setState({ currentProjectId: prevProjectId });
      // lab store 状态保留，让用户能追溯上次 session（不强清）
    };
  }, []);

  // 启动 lab SSE hook（覆盖 chatStore.sendMessage）
  useLabCopilotSSE();

  const messages = useChatStore((s) => s.messages);
  const streamingMessage = useChatStore((s) => s.streamingMessage);
  const toolCalls = useChatStore((s) => s.toolCalls);
  const isLoading = useChatStore((s) => s.isLoading);

  const handleSend = async (content: string) => {
    await useChatStore.getState().sendMessage(content, LAB_PROJECT_ID);
  };

  const handleClearSession = () => {
    useChatStore.getState().clearMessages();
    useCopilotLabStore.getState().reset();
  };

  return (
    <div className="flex h-screen flex-col bg-[var(--color-bg-secondary)]">
      {/* Top bar */}
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-[var(--color-border-default)] px-3">
        <div className="flex items-center gap-2">
          <Link
            to="/"
            className="flex h-8 w-8 items-center justify-center rounded text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-primary)]"
            aria-label="返回项目列表"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="flex items-center gap-1.5">
            <FlaskConical className="h-4 w-4 text-[var(--color-accent-500)]" />
            <span className="text-sm font-semibold text-[var(--color-text-primary)]">Copilot Lab</span>
            <code className="rounded bg-[var(--color-bg-tertiary)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--color-text-tertiary)]">
              {LAB_PROJECT_ID}
            </code>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleClearSession}
            className="flex items-center gap-1 rounded px-2 py-1 text-xs text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-primary)]"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Clear Session
          </button>
        </div>
      </header>

      {/* Lab mode banner */}
      <div className="flex shrink-0 items-center gap-2 border-b border-[var(--color-border-default)] bg-[var(--color-accent-50)] px-4 py-1.5 text-xs text-[var(--color-accent-700)] dark:bg-[var(--color-accent-900)] dark:text-[var(--color-accent-300)]">
        <FlaskConical className="h-3.5 w-3.5 shrink-0" />
        <span>
          <strong>Lab mode</strong> · 无项目上下文 · tool calls 已被禁用（session 注册 tools=[]）·
          右侧 Inspector 实时显示 prompt / tools / 原始 SSE 事件流
        </span>
      </div>

      {/* Main split: Chat (left, fixed 400px) + Inspector (right, fills rest) */}
      <div className="flex flex-1 gap-3 overflow-hidden p-3">
        <div style={{ width: COPILOT_WIDTH_PX }} className="flex shrink-0 flex-col">
          {/* 消息区：只占中间空间 */}
          <div className="flex-1 overflow-hidden">
            <CopilotChat
              messages={messages}
              streamingText={streamingMessage}
              toolCalls={toolCalls}
              isLoading={isLoading}
              onSend={handleSend}
              placeholder="向 Copilot 提问（Lab 模式，无项目 / 无工具）…"
              inputLeftToolbar={<LabInputToolbar />}
              inputRows={6}
              inputClassName="mt-2 rounded-[var(--radius-xl)] border border-[var(--color-border-default)] bg-[var(--color-bg-primary)] p-3 shadow-sm"
            />
          </div>
        </div>

        <div className="flex-1 overflow-hidden rounded-[var(--radius-xl)] border border-[var(--color-border-default)]">
          <Inspector />
        </div>
      </div>
    </div>
  );
}