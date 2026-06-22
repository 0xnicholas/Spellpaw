import { Lightbulb, Users, Film, Wand2 } from 'lucide-react';

const steps = [
  {
    n: '01',
    icon: Lightbulb,
    title: '一句话创意',
    desc: '输入梗概或上传剧本，AI 解析出三幕结构。',
  },
  {
    n: '02',
    icon: Users,
    title: '角色与场景',
    desc: '一键生成角色卡与情绪板，建立故事的世界观。',
  },
  {
    n: '03',
    icon: Film,
    title: '分镜拆解',
    desc: 'AI 自动拆分镜头，节奏分析保证叙事张力。',
  },
  {
    n: '04',
    icon: Wand2,
    title: '视觉成片',
    desc: '导出分镜 PDF 或直接调用 AI 生成参考图与视频。',
  },
];

/**
 * Workflow section — buzzy.now-style 4-step horizontal flow.
 * Each step is a card with a large step number, icon, title, desc.
 */
export function WorkflowSection() {
  return (
    <section
      id="workflow"
      className="relative py-24 sm:py-32"
      style={{ background: 'var(--portal-bg)' }}
    >
      <div className="relative mx-auto max-w-6xl px-6">
        {/* Section header */}
        <div className="mb-14 text-center">
          <div
            className="mb-3 inline-block text-xs font-semibold tracking-[0.18em]"
            style={{ color: 'var(--portal-accent)' }}
          >
            WORKFLOW
          </div>
          <h2
            className="mb-3 text-3xl font-bold tracking-tight text-white sm:text-4xl"
            style={{ fontFamily: 'var(--font-family-display)', letterSpacing: '-0.025em' }}
          >
            从灵感到成片，4 步搞定
          </h2>
          <p className="text-base" style={{ color: 'var(--portal-text-muted)' }}>
            AI 接管繁琐的结构工作，让你专注在最有创造力的部分
          </p>
        </div>

        {/* Steps */}
        <div className="relative">
          {/* Connecting line (desktop) */}
          <div
            className="absolute left-0 right-0 top-[42px] hidden h-px lg:block"
            style={{
              background:
                'linear-gradient(to right, transparent 5%, oklch(45% 0.1 275 / 0.5) 30%, oklch(45% 0.1 275 / 0.5) 70%, transparent 95%)',
            }}
          />

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((step) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.n}
                  className="relative rounded-[20px] border p-6"
                  style={{
                    background: 'var(--portal-bg-elevated)',
                    borderColor: 'var(--portal-border)',
                  }}
                >
                  {/* Step number — large, dim, top-right */}
                  <div
                    className="absolute top-4 right-5 text-3xl font-bold leading-none"
                    style={{
                      fontFamily: 'var(--font-family-display)',
                      color: 'oklch(100% 0 0 / 0.06)',
                    }}
                  >
                    {step.n}
                  </div>

                  {/* Icon — large circular, accent-colored */}
                  <div
                    className="mb-5 flex h-[52px] w-[52px] items-center justify-center rounded-2xl"
                    style={{
                      background: 'oklch(50% 0.18 275 / 0.2)',
                      border: '1px solid oklch(60% 0.16 275 / 0.3)',
                      boxShadow: '0 0 24px oklch(50% 0.18 275 / 0.18)',
                    }}
                  >
                    <Icon className="h-5 w-5" style={{ color: 'var(--portal-accent)' }} />
                  </div>

                  {/* Title */}
                  <h3
                    className="mb-1.5 text-[15px] font-semibold text-white"
                    style={{ fontFamily: 'var(--font-family-display)' }}
                  >
                    {step.title}
                  </h3>

                  {/* Description */}
                  <p
                    className="text-[13px] leading-relaxed"
                    style={{ color: 'var(--portal-text-muted)' }}
                  >
                    {step.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
