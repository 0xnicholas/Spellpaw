/**
 * HeroSearchBar — buzzy.now-style centered pill input shown in the hero area
 * (NOT the floating Dynamic Island). Matches buzzy's `.search-bar` class:
 *   - Pill shape, 52px height
 *   - Dark gradient bg + backdrop blur
 *   - Gradient text on placeholder (purple→pink, like buzzy's pink→cyan)
 *   - Yellow→purple circular submit button
 *
 * Submit goes to /projects with the idea encoded in query string.
 */
import { useState, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUp } from 'lucide-react';

const PLACEHOLDER = 'Describe your story idea…';

export function HeroSearchBar() {
  const [value, setValue] = useState('');
  const navigate = useNavigate();

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    navigate(`/projects?idea=${encodeURIComponent(trimmed)}`);
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="mx-auto mt-4 w-full max-w-2xl">
      <div
        className="group relative flex h-[52px] items-center gap-2 rounded-full px-2 transition-all focus-within:scale-[1.01]"
        style={{
          background:
            'linear-gradient(170deg, oklch(20% 0.02 275 / 0.85) 6%, oklch(15% 0.02 270 / 0.9) 94%)',
          border: '1px solid oklch(100% 0 0 / 0.14)',
          boxShadow:
            '0 4px 24px oklch(0% 0 0 / 0.45), inset 0 1px oklch(100% 0 0 / 0.06), inset 0 -1px oklch(0% 0 0 / 0.3)',
        }}
      >
        {/* 渐变占位文字层（buzzy 的 background-clip:text 效果，仅在空值时显示） */}
        {value === '' && (
          <span
            aria-hidden
            className="pointer-events-none absolute left-5 select-none text-sm"
            style={{
              background:
                'linear-gradient(90deg, oklch(72% 0.2 290) 0%, oklch(75% 0.18 320) 100%)',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent',
              fontFamily: 'var(--font-family-display)',
            }}
          >
            {PLACEHOLDER}
          </span>
        )}
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKey}
          aria-label={PLACEHOLDER}
          className="flex-1 bg-transparent px-3 text-sm text-white outline-none"
          style={{ fontFamily: 'var(--font-family-display)' }}
        />
        <button
          onClick={submit}
          disabled={!value.trim()}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white transition-all group-hover:scale-105 disabled:opacity-40 disabled:group-hover:scale-100"
          style={{
            background:
              'linear-gradient(170deg, oklch(82% 0.18 290) 0%, oklch(65% 0.22 275) 50%, oklch(55% 0.22 260) 100%)',
            boxShadow: value.trim()
              ? '0 4px 16px oklch(55% 0.22 275 / 0.45)'
              : 'none',
          }}
          aria-label="开始创作"
        >
          <ArrowUp className="h-4 w-4" strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}