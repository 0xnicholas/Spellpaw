import type { ReactNode } from 'react';
import type { ChatMessage, ChatAction } from '@shared/types';
import type { Skill } from '@shared/copilot/skills/types';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { SkillChips } from '../SkillChips';

export interface ToolCall {
  callId: string;
  name: string;
}

export interface CopilotChatProps {
  messages: ChatMessage[];
  streamingText: string | null;
  toolCalls: ToolCall[];
  isLoading: boolean;
  onSend: (content: string) => void;
  placeholder?: string;
  emptyState?: ReactNode;
  onActionClick?: (action: ChatAction) => void;
  contextChip?: { label: string; onClear: () => void } | null;
  /** 透传给 MessageInput 的左侧工具栏插槽 */
  inputLeftToolbar?: ReactNode;
  /** 透传给 MessageInput 的 textarea 行高 */
  inputRows?: number;
  /** 透传给 MessageInput 的外层 className 覆盖 */
  inputClassName?: string;
  /** 当前项目 id — regenerate 需要 */
  projectId?: string;
  /** 当前 app 的可用 skills — 渲染为 SkillChips */
  skills: readonly Skill[];
  /** 触发 abort 的回调 */
  onStop?: () => void;
  /** 触发 regenerate 的回调 */
  onRegenerate?: () => void;
}

export function CopilotChat({
  messages,
  streamingText,
  toolCalls,
  isLoading,
  onSend,
  placeholder = '输入消息…（Enter 发送，Shift + Enter 换行）',
  emptyState,
  onActionClick,
  contextChip,
  inputLeftToolbar,
  inputRows,
  inputClassName,
  skills,
  projectId,
  onStop,
  onRegenerate,
}: CopilotChatProps) {
  return (
    <div className="flex h-full flex-col">
      <MessageList
        messages={messages}
        streamingMessage={streamingText}
        isLoading={isLoading}
        toolCalls={toolCalls}
        emptyState={emptyState}
        onActionClick={onActionClick}
        onStop={onStop}
        onRegenerate={onRegenerate}
        projectId={projectId}
      />
      <SkillChips
        skills={skills}
        onInsert={(cmd) => {
          const ev = new CustomEvent('spellpaw:insert-text', { detail: cmd });
          window.dispatchEvent(ev);
        }}
      />
      <MessageInput
        onSend={onSend}
        disabled={isLoading}
        placeholder={placeholder}
        contextChip={contextChip}
        leftToolbar={inputLeftToolbar}
        rows={inputRows}
        inputClassName={inputClassName}
      />
    </div>
  );
}
