import { ArrowRight, Sparkles, Play } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const EXAMPLE_PROMPTS = [
  '都市奇缘',
  '密室逃脱',
  '逆袭人生',
  '校园恋爱',
];

/**
 * Hero section — buzzy.now-style dark hero with large Poppins
 * display headline, dual CTAs (white pill primary + outline),
 * and example prompt chips.
 */
export function HeroSection() {
  const navigate = useNavigate();

  const handleCreate = () => {
    navigate('/projects');
  };

  return (
    <section
      className="relative flex min-h-[auto] items-center justify-center overflow-hidden pt-32 pb-20 sm:min-h-[88vh] sm:pt-36"
      style={{ background: 'var(--portal-bg)' }}
    >
      {/* Aurora flowing bands — purple/violet theme */}
      <div
        className="absolute -left-[15%] -top-[20%] h-[800px] w-[1000px] rounded-full blur-[180px] animate-[aurora-1_16s_ease-in-out_infinite]"
        style={{ background: 'oklch(45% 0.2 275 / 0.35)' }}
      />
      <div
        className="absolute -right-[10%] top-[5%] h-[700px] w-[900px] rounded-full blur-[160px] animate-[aurora-2_20s_ease-in-out_infinite]"
        style={{ background: 'oklch(50% 0.2 290 / 0.28)' }}
      />
      <div
        className="absolute left-[15%] -bottom-[10%] h-[600px] w-[800px] rounded-full blur-[180px] animate-[aurora-3_18s_ease-in-out_infinite]"
        style={{ background: 'oklch(45% 0.18 260 / 0.25)' }}
      />

      {/* Center vignette to focus on the headline */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 60% 50% at 50% 45%, transparent 30%, var(--portal-bg) 100%)',
        }}
      />

      <div className="relative z-10 mx-auto w-full max-w-4xl px-6 text-center">
        {/* Badge */}
        <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.04] px-3.5 py-1.5 backdrop-blur-sm">
          <span
            className="flex h-4 w-4 items-center justify-center rounded-full"
            style={{ background: 'var(--portal-accent)' }}
          >
            <Sparkles className="h-2.5 w-2.5 text-white" strokeWidth={2.5} />
          </span>
          <span
            className="text-xs font-semibold tracking-wide"
            style={{ color: 'var(--portal-accent)', letterSpacing: '0.04em' }}
          >
            AI-DRIVEN SHORT DRAMA STUDIO
          </span>
        </div>

        {/* Headline — large, bold, tight tracking (buzzy.now style) */}
        <h1
          className="mb-5 font-bold leading-[1.05] tracking-[-0.04em] text-white"
          style={{
            fontFamily: 'var(--font-family-display)',
            fontSize: 'clamp(2.5rem, 6vw, 4.75rem)',
            fontWeight: 700,
          }}
        >
          把灵感直接
          <br />
          拍成<span style={{ color: 'var(--portal-accent)' }}>爆款短剧</span>
        </h1>

        <p
          className="mx-auto mb-10 max-w-2xl text-base leading-relaxed sm:text-lg"
          style={{ color: 'var(--portal-text-muted)' }}
        >
          从一句话梗概到完整分镜，AI 帮你完成剧本结构、角色设计和拍摄方案。
          <br className="hidden sm:block" />
          不需要剧本经验，让创意变成可以拍的内容。
        </p>

        {/* CTAs — pill shaped (buzzy.now signature) */}
        <div className="mb-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
          <button
            onClick={handleCreate}
            className="group flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-[15px] font-semibold text-[oklch(15%_0.02_270)] transition-all hover:bg-white/95 hover:scale-[1.02]"
            style={{
              fontFamily: 'var(--font-family-display)',
              boxShadow: '0 8px 32px rgba(255,255,255,0.18), 0 0 0 1px rgba(255,255,255,0.08)',
            }}
          >
            <Play className="h-4 w-4" fill="currentColor" strokeWidth={0} />
            开始创作
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </button>

          <a
            href="#workflow"
            className="flex items-center gap-2 rounded-full border border-white/[0.12] bg-white/[0.04] px-6 py-3.5 text-[15px] font-medium text-white transition-all hover:bg-white/[0.08]"
            style={{ fontFamily: 'var(--font-family-display)' }}
          >
            <Play className="h-3.5 w-3.5" fill="currentColor" strokeWidth={0} />
            查看工作流
          </a>
        </div>

        {/* Quick prompt chips — example starters */}
        <div className="flex flex-wrap items-center justify-center gap-2.5">
          <span className="text-xs" style={{ color: 'var(--portal-text-dim)' }}>
            快速开始：
          </span>
          {EXAMPLE_PROMPTS.map((item) => (
            <button
              key={item}
              onClick={() => handleCreate()}
              className="rounded-full border border-white/[0.08] bg-white/[0.04] px-3.5 py-1 text-xs font-medium text-white/80 backdrop-blur-sm transition-all hover:border-white/[0.18] hover:bg-white/[0.08] hover:text-white"
            >
              {item}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
