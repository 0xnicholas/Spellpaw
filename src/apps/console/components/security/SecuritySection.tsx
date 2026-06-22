import { useTranslation } from 'react-i18next';
import { Lock } from 'lucide-react';

export function SecuritySection() {
  const { t } = useTranslation();

  return (
    <section className="space-y-6">
      <div>
        <div
          className="mb-2 inline-block text-xs font-semibold tracking-[0.18em]"
          style={{ color: 'var(--portal-accent)' }}
        >
          SECURITY
        </div>
        <h2
          className="mb-1.5 text-2xl font-bold text-white"
          style={{ fontFamily: 'var(--font-family-display)', letterSpacing: '-0.02em' }}
        >
          {t('console.security.title')}
        </h2>
        <p className="text-sm" style={{ color: 'var(--portal-text-muted)' }}>
          {t('console.security.description')}
        </p>
      </div>

      <div
        className="rounded-[20px] border p-8 text-center"
        style={{
          background: 'var(--portal-bg-elevated)',
          borderColor: 'var(--portal-border)',
        }}
      >
        <div
          className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl"
          style={{
            background: 'oklch(50% 0.18 275 / 0.15)',
            border: '1px solid oklch(60% 0.16 275 / 0.25)',
          }}
        >
          <Lock className="h-5 w-5" style={{ color: 'var(--portal-accent)' }} />
        </div>
        <p className="text-sm" style={{ color: 'var(--portal-text-muted)' }}>
          密码修改功能暂时不可用。
        </p>
      </div>
    </section>
  );
}
