/**
 * DynamicIslandInput — buzzy.now-style floating prompt pill at the bottom
 * of the viewport. iPhone Dynamic Island metaphor: a slim, centered pill
 * with placeholder + submit button.
 *
 * Submit goes to /projects so user can flesh out the idea in workspace.
 */
import { useState, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUp, Sparkles } from 'lucide-react';

const PLACEHOLDER = 'Describe your story idea…';

export function DynamicIslandInput() {
  const [value, setValue] = useState('');
  const navigate = useNavigate();

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    // 跳到 projects 页面，让用户在 workspace 里展开这个 idea。
    // 把 prompt 通过 query string 传过去（后续 WorkspacePage 可选消费）。
    const url = `/projects?idea=${encodeURIComponent(trimmed)}`;
    navigate(url);
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4"
    >
      <div
        className="pointer-events-auto flex w-full max-w-2xl items-center gap-2 rounded-full border border-white/[0.1] bg-[oklch(15%_0.02_270)]/90 px-4 py-2.5 shadow-2xl backdrop-blur-xl transition-all focus-within:border-[oklch(60%_0.18_275)]/60"
        style={{
          boxShadow:
            '0 16px 48px oklch(0% 0 0 / 0.55), 0 0 0 1px oklch(100% 0 0 / 0.04) inset',
        }}
      >
        <Sparkles
          className="h-4 w-4 shrink-0"
          style={{ color: 'var(--portal-accent)' }}
        />
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={onKey}
          placeholder={PLACEHOLDER}
          className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/40"
        />
        <button
          onClick={submit}
          disabled={!value.trim()}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white transition-all hover:scale-105 disabled:opacity-40 disabled:hover:scale-100"
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