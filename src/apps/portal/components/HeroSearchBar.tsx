/**
 * HeroSearchBar — buzzy-inspired but expanded hero-center prompt input.
 *
 * 比 buzzy 的 .search-bar 多：
 *  - 更大尺寸（h-16，宽 max-w-3xl）
 *  - 多行 textarea（按 Enter 提交，Shift+Enter 换行）
 *  - 左侧 action 按钮组（图片附件 / 模型选择占位）
 *  - 输入区上方有 example prompt 标签
 *  - 右侧主 Send 按钮（紫渐变 pill）
 *  - focus 时 scale-up + 紫色 glow
 *
 * Submit 跳 /projects?idea=xxx。
 */
import { useState, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUp, Paperclip, Sparkles, ChevronDown } from 'lucide-react';

const EXAMPLE_TAGS = ['都市奇缘', '密室逃脱', '逆袭人生', '校园恋爱', '古装仙侠'];

const PLACEHOLDER = 'Describe your story idea, paste a script, or attach a reference…';

export function HeroSearchBar() {
  const [value, setValue] = useState('');
  const navigate = useNavigate();

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    navigate(`/projects?idea=${encodeURIComponent(trimmed)}`);
  };

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.metaKey && !e.ctrlKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="mx-auto mt-6 w-full max-w-3xl px-2">
      {/* 输入框本体 */}
      <div
        className="group relative overflow-hidden rounded-3xl transition-all focus-within:scale-[1.005]"
        style={{
          background:
            'linear-gradient(170deg, oklch(20% 0.02 275 / 0.85) 6%, oklch(15% 0.02 270 / 0.92) 94%)',
          border: '1px solid oklch(100% 0 0 / 0.14)',
          boxShadow:
            '0 8px 32px oklch(0% 0 0 / 0.5), inset 0 1px oklch(100% 0 0 / 0.06), inset 0 -1px oklch(0% 0 0 / 0.3)',
        }}
      >
        {/* 顶部分隔细线 + 输入区 */}
        <div className="relative">
          {/* 渐变占位文字层 */}
          {value === '' && (
            <span
              aria-hidden
              className="pointer-events-none absolute left-5 top-4 select-none text-[15px] leading-relaxed"
              style={{
                background:
                  'linear-gradient(90deg, oklch(72% 0.2 290) 0%, oklch(75% 0.18 320) 50%, oklch(70% 0.2 340) 100%)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                color: 'transparent',
                fontFamily: 'var(--font-family-display)',
              }}
            >
              {PLACEHOLDER}
            </span>
          )}
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={onKey}
            rows={3}
            aria-label={PLACEHOLDER}
            className="block w-full resize-none border-0 bg-transparent px-5 pb-2 pt-4 text-[15px] leading-relaxed text-white outline-none focus:outline-none"
            style={{ fontFamily: 'var(--font-family-display)' }}
          />
        </div>

        {/* 底部工具栏：左 action 按钮组，右 Send */}
        <div className="flex items-center justify-between gap-2 border-t border-white/[0.06] px-3 py-2.5">
          {/* 左侧 action 按钮 */}
          <div className="flex items-center gap-1">
            <ActionButton icon={<Paperclip className="h-4 w-4" />} label="附件" />
            <ActionButton
              icon={<Sparkles className="h-4 w-4" />}
              label="模型"
              rightIcon={<ChevronDown className="h-3 w-3" />}
              onClick={() => {
                // TODO: 模型选择下拉
                window.alert('模型选择：即将支持 Seedance / Kling / Omni 等');
              }}
            />
            <span className="mx-1 hidden h-4 w-px bg-white/[0.08] sm:inline-block" />
            <span className="hidden text-[11px] text-white/40 sm:inline">
              按 <kbd className="rounded bg-white/[0.06] px-1.5 py-0.5 font-mono text-[10px] text-white/60">Enter</kbd> 发送
            </span>
          </div>

          {/* 右侧 Send */}
          <button
            onClick={submit}
            disabled={!value.trim()}
            className="flex h-10 items-center gap-1.5 rounded-full px-4 text-sm font-semibold text-white transition-all group-hover:scale-[1.03] disabled:opacity-40 disabled:group-hover:scale-100"
            style={{
              background:
                'linear-gradient(170deg, oklch(82% 0.18 290) 0%, oklch(65% 0.22 275) 50%, oklch(55% 0.22 260) 100%)',
              boxShadow: value.trim()
                ? '0 6px 20px oklch(55% 0.22 275 / 0.5), inset 0 1px oklch(100% 0 0 / 0.15)'
                : 'none',
              fontFamily: 'var(--font-family-display)',
            }}
          >
            <span>开始创作</span>
            <ArrowUp className="h-4 w-4" strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* 下方 example prompt 标签 */}
      <div className="mt-3 flex flex-wrap items-center justify-center gap-1.5 px-2 text-xs">
        <span className="text-white/40">试试：</span>
        {EXAMPLE_TAGS.map((tag) => (
          <button
            key={tag}
            onClick={() => setValue(tag)}
            className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-0.5 text-[11px] text-white/70 transition-all hover:border-white/[0.18] hover:bg-white/[0.08] hover:text-white"
          >
            {tag}
          </button>
        ))}
      </div>
    </div>
  );
}

function ActionButton({
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