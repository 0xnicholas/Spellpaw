/**
 * PromptInput — 共享的 prompt 输入核心，被 Portal 的 HeroSearchBar
 * 和 DynamicIslandInput 共用。同一套视觉 / 同一套操作按钮，
 * 不同 size 适配 hero（大、多行）和 floating pill（小、单行）。
 *
 * 设计目标：
 *  - hero 版：rows=3, max-w-3xl, rounded-3xl，左侧工具栏完整展示
 *  - floating 版：rows=1, max-w-2xl, rounded-full，紧凑但保留关键 action
 *  - 共享 placeholder 渐变文字、Send 按钮紫色渐变、Enter 提交
 */
import { useState, type KeyboardEvent } from 'react';
import { ArrowUp, Paperclip, Sparkles, ChevronDown } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

const PLACEHOLDER_FULL = 'Describe your story idea, paste a script, or attach a reference…';
const PLACEHOLDER_FLOATED = 'Describe your idea…';

export type PromptInputSize = 'hero' | 'floating';

export interface PromptInputProps {
  size: PromptInputSize;
  /** 提交时回调（page 侧负责跳转 / 触发 AI） */
  onSubmit: (content: string) => void;
  /** 当模型/附件按钮被点（page 侧可接 popover/toast） */
  onPickModel?: () => void;
  onAttach?: () => void;
  /** 受控值（可选；不传则内部 state） */
  value?: string;
  onChange?: (v: string) => void;
}

export function PromptInput({
  size,
  onSubmit,
  onPickModel,
  onAttach,
  value: controlled,
  onChange,
}: PromptInputProps) {
  const [internal, setInternal] = useState('');
  const value = controlled ?? internal;
  const setValue = (v: string) => {
    if (controlled === undefined) setInternal(v);
    onChange?.(v);
  };

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
  };

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
      e.preventDefault();
      submit();
    }
  };

  const isHero = size === 'hero';
  const isFloating = size === 'floating';

  return (
    <div className={isHero ? 'mx-auto mt-6 w-full max-w-3xl px-2' : 'pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4'}>
      <div
        className={cn(
          'group overflow-hidden transition-all focus-within:scale-[1.005]',
          isHero
            ? 'rounded-3xl'
            : 'pointer-events-auto flex h-12 items-center rounded-full',
        )}
        style={{
          background: isFloating
            ? 'linear-gradient(170deg, oklch(22% 0.025 275 / 0.95) 0%, oklch(15% 0.02 270 / 0.95) 100%)'
            : 'linear-gradient(170deg, oklch(20% 0.02 275 / 0.88) 6%, oklch(15% 0.02 270 / 0.94) 94%)',
          border: '1px solid oklch(100% 0 0 / 0.16)',
          boxShadow: isFloating
            ? '0 16px 48px oklch(0% 0 0 / 0.55), inset 0 1px oklch(100% 0 0 / 0.06), 0 0 0 1px oklch(55% 0.22 275 / 0.08)'
            : '0 8px 32px oklch(0% 0 0 / 0.5), inset 0 1px oklch(100% 0 0 / 0.06), inset 0 -1px oklch(0% 0 0 / 0.3)',
          // backdrop blur radius reduced from 12px → 4px: keeps the
          // glassy feel without the dominant scroll-time GPU cost.
          backdropFilter: 'blur(4px)',
        }}
      >
        {/* 浮动版左侧 Sparkles icon */}
        {isFloating && (
          <div className="flex h-full shrink-0 items-center pl-4 pr-1">
            <Sparkles className="h-4 w-4" style={{ color: 'var(--portal-accent)' }} />
          </div>
        )}

        {/* 输入区 */}
        <div className="relative flex-1">
          {/* 渐变占位文字层 */}
          {value === '' && (
            <span
              aria-hidden
              className={cn(
                'pointer-events-none absolute left-5 select-none',
                isHero ? 'top-4 text-[15px] leading-relaxed' : 'left-3 top-1/2 -translate-y-1/2 text-sm whitespace-nowrap',
              )}
              style={{
                background:
                  'linear-gradient(90deg, oklch(72% 0.2 290) 0%, oklch(75% 0.18 320) 50%, oklch(70% 0.2 340) 100%)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                color: 'transparent',
                fontFamily: 'var(--font-family-display)',
              }}
            >
              {isHero ? PLACEHOLDER_FULL : PLACEHOLDER_FLOATED}
            </span>
          )}
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={onKey}
            rows={isHero ? 3 : 1}
            aria-label={isHero ? PLACEHOLDER_FULL : PLACEHOLDER_FLOATED}
            className={cn(
              'block w-full resize-none border-0 bg-transparent text-white outline-none focus:outline-none',
              isHero
                ? 'px-5 pb-2 pt-4 text-[15px] leading-relaxed'
                : 'h-12 px-3 text-sm leading-[48px]',
            )}
            style={{
              fontFamily: 'var(--font-family-display)',
              minHeight: isHero ? undefined : '48px',
            }}
          />
        </div>

        {/* 浮动版 hover 时才显示的 action 按钮组 */}
        {isFloating && (
          <div className="flex h-full shrink-0 items-center gap-0.5 pr-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
            <FloatingIconButton icon={<Paperclip className="h-4 w-4" />} label="附件" onClick={onAttach} />
            <FloatingIconButton
              icon={<Sparkles className="h-4 w-4" />}
              rightIcon={<ChevronDown className="h-3 w-3" />}
              label="模型"
              onClick={onPickModel}
            />
          </div>
        )}

        {/* Send 按钮 */}
        {isHero ? (
          <div className="flex items-center justify-between gap-2 border-t border-white/[0.06] px-3 py-2.5">
            <div className="flex items-center gap-1">
              <IconButton icon={<Paperclip className="h-4 w-4" />} label="附件" onClick={onAttach} />
              <IconButton
                icon={<Sparkles className="h-4 w-4" />}
                label="模型"
                rightIcon={<ChevronDown className="h-3 w-3" />}
                onClick={onPickModel}
              />
              <span className="mx-1 hidden h-4 w-px bg-white/[0.08] sm:inline-block" />
              <span className="hidden text-[11px] text-white/40 sm:inline">
                按 <kbd className="rounded bg-white/[0.06] px-1.5 py-0.5 font-mono text-[10px] text-white/60">Enter</kbd> 发送
              </span>
            </div>
            <SendButton onClick={submit} disabled={!value.trim()} />
          </div>
        ) : (
          <div className="flex h-full shrink-0 items-center pr-2">
            <SendButton onClick={submit} disabled={!value.trim()} compact />
          </div>
        )}
      </div>

      {/* example tags（仅 hero 显示） */}
      {isHero && <ExampleTags onPick={(tag) => setValue(tag)} />}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// 内部子组件
// ────────────────────────────────────────────────────────────────────────────

function SendButton({
  onClick,
  disabled,
  compact,
}: {
  onClick: () => void;
  disabled: boolean;
  compact?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex shrink-0 items-center gap-1.5 rounded-full text-sm font-semibold text-white transition-all group-hover:scale-[1.03] disabled:opacity-40 disabled:group-hover:scale-100',
        compact ? 'h-9 w-9 justify-center px-0' : 'h-10 px-4',
      )}
      style={{
        background:
          'linear-gradient(170deg, oklch(82% 0.18 290) 0%, oklch(65% 0.22 275) 50%, oklch(55% 0.22 260) 100%)',
        boxShadow: disabled
          ? 'none'
          : '0 6px 20px oklch(55% 0.22 275 / 0.5), inset 0 1px oklch(100% 0 0 / 0.15)',
        fontFamily: 'var(--font-family-display)',
      }}
      aria-label="开始创作"
    >
      {compact ? (
        <ArrowUp className="h-4 w-4" strokeWidth={2.5} />
      ) : (
        <>
          <span>开始创作</span>
          <ArrowUp className="h-4 w-4" strokeWidth={2.5} />
        </>
      )}
    </button>
  );
}

function IconButton({
  icon,
  rightIcon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  rightIcon?: React.ReactNode;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-white/60 transition-colors hover:bg-white/[0.06] hover:text-white/90"
      title={label}
      aria-label={label}
    >
      {icon}
      {rightIcon}
    </button>
  );
}

function FloatingIconButton({
  icon,
  rightIcon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  rightIcon?: React.ReactNode;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex h-8 w-8 items-center justify-center rounded-full text-white/60 transition-colors hover:bg-white/[0.08] hover:text-white"
      title={label}
      aria-label={label}
    >
      {icon}
      {rightIcon}
    </button>
  );
}

const EXAMPLE_TAGS = ['都市奇缘', '密室逃脱', '逆袭人生', '校园恋爱', '古装仙侠'];

function ExampleTags({ onPick }: { onPick: (tag: string) => void }) {
  return (
    <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5 px-2 text-xs">
      <span className="text-white/40">试试：</span>
      {EXAMPLE_TAGS.map((tag) => (
        <button
          key={tag}
          onClick={() => onPick(tag)}
          className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-0.5 text-[11px] text-white/70 transition-all hover:border-white/[0.18] hover:bg-white/[0.08] hover:text-white"
        >
          {tag}
        </button>
      ))}
    </div>
  );
}