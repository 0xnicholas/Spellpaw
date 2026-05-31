import { ArrowRight, Film, Wand2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export function HeroSection() {
  return (
    <section className="relative flex min-h-[90vh] items-center justify-center overflow-hidden pt-14">
      {/* Background gradient + animated orbs */}
      <div className="absolute inset-0 bg-gradient-to-b from-[var(--color-bg-primary)] via-[var(--color-bg-secondary)] to-[var(--color-bg-primary)]" />
      <div className="absolute left-1/4 top-1/4 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--color-accent-500)]/5 blur-[120px]" />
      <div className="absolute right-1/4 bottom-1/4 h-[400px] w-[400px] translate-x-1/2 translate-y-1/2 rounded-full bg-[var(--color-accent-500)]/8 blur-[100px]" />

      {/* Animated grid lines */}
      <div className="absolute inset-0 opacity-[0.03]">
        <div
          className="h-full w-full"
          style={{
            backgroundImage: `linear-gradient(var(--color-accent-500) 1px, transparent 1px), linear-gradient(90deg, var(--color-accent-500) 1px, transparent 1px)`,
            backgroundSize: '80px 80px',
          }}
        />
      </div>

      <div className="relative z-10 mx-auto max-w-4xl px-6 text-center">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[var(--color-accent-500)]/20 bg-[var(--color-accent-500)]/5 px-4 py-1.5">
          <Wand2 className="h-3.5 w-3.5 text-[var(--color-accent-500)]" />
          <span className="text-xs font-medium text-[var(--color-accent-500)]">
            AI 驱动的创作平台
          </span>
        </div>

        <h1 className="mb-6 text-5xl font-bold leading-[1.1] tracking-tight text-[var(--color-text-primary)] sm:text-6xl">
          让 AI 成为你
          <br />
          <span className="bg-gradient-to-r from-[var(--color-accent-400)] to-[var(--color-accent-600)] bg-clip-text text-transparent">
            最好的创作搭档
          </span>
        </h1>

        <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-[var(--color-text-secondary)]">
          Spellpaw 是面向创作者的一站式 AI 工作台。从短剧脚本到分镜画布，
          让结构化的叙事思维与 AI 助手无缝协作，释放你的创作潜能。
        </p>

        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            to="/projects"
            className="group flex items-center gap-2 rounded-[var(--radius-base)] bg-[var(--color-accent-500)] px-6 py-3 text-base font-semibold text-white shadow-lg shadow-[var(--color-accent-500)]/20 transition-all hover:bg-[var(--color-accent-600)] hover:shadow-[var(--color-accent-500)]/30"
          >
            <Film className="h-4 w-4" />
            开始创作
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <a
            href="#features"
            className="rounded-[var(--radius-base)] border border-[var(--color-border-default)] px-6 py-3 text-base font-medium text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-bg-secondary)]"
          >
            了解更多
          </a>
        </div>

        {/* Stats */}
        <div className="mt-16 grid grid-cols-3 gap-8 border-t border-[var(--color-border-default)] pt-8">
          <div>
            <div className="text-2xl font-bold text-[var(--color-text-primary)]">AI Agent</div>
            <div className="mt-1 text-sm text-[var(--color-text-secondary)]">对话即操作</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-[var(--color-text-primary)]">画布</div>
            <div className="mt-1 text-sm text-[var(--color-text-secondary)]">可视化叙事</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-[var(--color-text-primary)]">模板</div>
            <div className="mt-1 text-sm text-[var(--color-text-secondary)]">结构化创作</div>
          </div>
        </div>
      </div>
    </section>
  );
}
