import { MessageSquare, GitBranch, Layout, Zap, Shield, Palette } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const features: { key: string; icon: typeof MessageSquare }[] = [
  { key: 'dialog', icon: MessageSquare },
  { key: 'structure', icon: GitBranch },
  { key: 'canvas', icon: Layout },
  { key: 'rhythm', icon: Zap },
  { key: 'sync', icon: Shield },
  { key: 'templates', icon: Palette },
];

/**
 * Features grid — buzzy.now-style 3-column dark surface cards
 * with subtle borders and hover lift.
 */
export function FeaturesSection() {
  const { t } = useTranslation();

  return (
    <section
      id="features"
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
            {t('portal.features.badge')}
          </div>
          <h2
            className="mb-3 text-3xl font-bold tracking-tight text-white sm:text-4xl"
            style={{ fontFamily: 'var(--font-family-display)', letterSpacing: '-0.025em' }}
          >
            {t('portal.features.title')}
          </h2>
          <p className="text-base" style={{ color: 'var(--portal-text-muted)' }}>
            {t('portal.features.subtitle')}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.key}
                className="group relative overflow-hidden rounded-[20px] border p-6 transition-all duration-300 hover:-translate-y-0.5"
                style={{
                  background: 'var(--portal-bg-elevated)',
                  borderColor: 'var(--portal-border)',
                  boxShadow: '0 1px 0 oklch(100% 0 0 / 0.04) inset',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'oklch(45% 0.1 275 / 0.5)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--portal-border)';
                }}
              >
                {/* Icon */}
                <div
                  className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl transition-colors"
                  style={{
                    background: 'oklch(50% 0.18 275 / 0.15)',
                    border: '1px solid oklch(60% 0.16 275 / 0.22)',
                  }}
                >
                  <Icon className="h-[18px] w-[18px]" style={{ color: 'var(--portal-accent)' }} />
                </div>

                {/* Title */}
                <h3
                  className="mb-1.5 text-base font-semibold text-white"
                  style={{ fontFamily: 'var(--font-family-display)' }}
                >
                  {t(`portal.features.items.${feature.key}.title`)}
                </h3>

                {/* Description */}
                <p
                  className="text-[13px] leading-relaxed"
                  style={{ color: 'var(--portal-text-muted)' }}
                >
                  {t(`portal.features.items.${feature.key}.description`)}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}