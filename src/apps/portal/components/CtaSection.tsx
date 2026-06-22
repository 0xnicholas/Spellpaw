import { ArrowRight, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

/**
 * Final CTA banner — buzzy.now-style large display text with
 * single primary pill button. Centered, with radial purple glow.
 */
export function CtaSection() {
  const navigate = useNavigate();

  return (
    <section
      className="relative overflow-hidden py-24 sm:py-32"
      style={{ background: 'var(--portal-bg)' }}
    >
      {/* Center glow */}
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] rounded-full blur-[160px] pointer-events-none"
        style={{ background: 'oklch(50% 0.2 275 / 0.18)' }}
      />

      <div className="relative mx-auto max-w-3xl px-6 text-center">
        <div
          className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.04] px-3.5 py-1.5"
        >
          <Sparkles className="h-3 w-3" style={{ color: 'var(--portal-accent)' }} />
          <span className="text-xs font-medium" style={{ color: 'var(--portal-text-muted)' }}>
            不用安装，打开即用
          </span>
        </div>

        <h2
          className="mb-5 text-4xl font-bold leading-[1.05] tracking-tight text-white sm:text-5xl"
          style={{
            fontFamily: 'var(--font-family-display)',
            letterSpacing: '-0.035em',
          }}
        >
          下一个爆款短剧
          <br />
          从这里开始
        </h2>

        <p
          className="mx-auto mb-10 max-w-xl text-base leading-relaxed sm:text-lg"
          style={{ color: 'var(--portal-text-muted)' }}
        >
          立即体验 SpellPaw，把你的故事灵感变成可拍可发的完整分镜。
        </p>

        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
          <button
            onClick={() => navigate('/projects')}
            className="group flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-[15px] font-semibold text-[oklch(15%_0.02_270)] transition-all hover:bg-white/95 hover:scale-[1.02]"
            style={{
              fontFamily: 'var(--font-family-display)',
              boxShadow:
                '0 8px 32px rgba(255,255,255,0.18), 0 0 0 1px rgba(255,255,255,0.08), 0 0 60px oklch(60% 0.2 275 / 0.25)',
            }}
          >
            免费开始创作
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </button>
        </div>
      </div>
    </section>
  );
}
