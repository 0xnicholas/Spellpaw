import { useTranslation } from 'react-i18next';

const stats: { key: string }[] = [
  { key: 'models' },
  { key: 'templates' },
  { key: 'skills' },
  { key: 'sync' },
];

/**
 * Stats / social-proof — large display numbers in a horizontal
 * grid, separated by subtle vertical dividers. Buzzy.now-style.
 */
export function StatsSection() {
  const { t } = useTranslation();

  return (
    <section
      className="relative py-20 sm:py-24"
      style={{ background: 'var(--portal-bg)' }}
    >
      <div className="mx-auto max-w-6xl px-6">
        <div
          className="rounded-[24px] border px-6 py-10 sm:px-10 sm:py-12"
          style={{
            background:
              'linear-gradient(135deg, var(--portal-bg-elevated) 0%, var(--portal-bg-overlay) 100%)',
            borderColor: 'var(--portal-border)',
          }}
        >
          <div className="grid grid-cols-2 gap-y-8 gap-x-2 sm:grid-cols-4">
            {stats.map((stat, i) => (
              <div
                key={stat.key}
                className={`text-center sm:text-left ${i > 0 ? 'sm:pl-6 sm:border-l' : ''}`}
                style={{
                  borderColor: 'oklch(100% 0 0 / 0.06)',
                }}
              >
                <div
                  className="mb-2 text-3xl font-bold leading-none sm:text-4xl"
                  style={{
                    fontFamily: 'var(--font-family-display)',
                    background:
                      'linear-gradient(135deg, #ffffff 0%, oklch(75% 0.15 275) 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                    letterSpacing: '-0.025em',
                  }}
                >
                  {t(`portal.stats.${stat.key}.value`)}
                </div>
                <div
                  className="mb-1 text-sm font-semibold text-white"
                  style={{ fontFamily: 'var(--font-family-display)' }}
                >
                  {t(`portal.stats.${stat.key}.label`)}
                </div>
                <div
                  className="text-xs leading-relaxed"
                  style={{ color: 'var(--portal-text-dim)' }}
                >
                  {t(`portal.stats.${stat.key}.desc`)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}