import { Lightbulb, Users, Film, Wand2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const steps: { n: string; key: string; icon: typeof Lightbulb }[] = [
  { n: '01', key: 'idea', icon: Lightbulb },
  { n: '02', key: 'characters', icon: Users },
  { n: '03', key: 'storyboard', icon: Film },
  { n: '04', key: 'production', icon: Wand2 },
];

/**
 * Workflow section — buzzy.now-style 4-step horizontal flow.
 * Each step is a card with a large step number, icon, title, desc.
 */
export function WorkflowSection() {
  const { t } = useTranslation();

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
            {t('portal.workflow.badge')}
          </div>
          <h2
            className="mb-3 text-3xl font-bold tracking-tight text-white sm:text-4xl"
            style={{ fontFamily: 'var(--font-family-display)', letterSpacing: '-0.025em' }}
          >
            {t('portal.workflow.title')}
          </h2>
          <p className="text-base" style={{ color: 'var(--portal-text-muted)' }}>
            {t('portal.workflow.subtitle')}
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
                  key={step.key}
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
                    {t(`portal.workflow.steps.${step.key}.title`)}
                  </h3>

                  {/* Description */}
                  <p
                    className="text-[13px] leading-relaxed"
                    style={{ color: 'var(--portal-text-muted)' }}
                  >
                    {t(`portal.workflow.steps.${step.key}.desc`)}
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