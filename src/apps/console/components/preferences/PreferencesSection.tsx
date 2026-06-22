import { useTranslation } from 'react-i18next';

export function PreferencesSection() {
  const { i18n, t } = useTranslation();

  return (
    <section className="space-y-6">
      <div>
        <div
          className="mb-2 inline-block text-xs font-semibold tracking-[0.18em]"
          style={{ color: 'var(--portal-accent)' }}
        >
          PREFERENCES
        </div>
        <h2
          className="mb-1.5 text-2xl font-bold text-white"
          style={{ fontFamily: 'var(--font-family-display)', letterSpacing: '-0.02em' }}
        >
          {t('console.preferences.title')}
        </h2>
        <p className="text-sm" style={{ color: 'var(--portal-text-muted)' }}>
          {t('console.preferences.description')}
        </p>
      </div>

      <div
        className="rounded-[20px] border p-6"
        style={{
          background: 'var(--portal-bg-elevated)',
          borderColor: 'var(--portal-border)',
        }}
      >
        <div>
          <label
            className="mb-3 block text-xs font-medium"
            style={{ color: 'var(--portal-text-muted)' }}
          >
            {t('console.preferences.language')}
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => i18n.changeLanguage('zh-CN')}
              className="rounded-full px-4 py-2 text-sm font-medium transition-all"
              style={
                i18n.language === 'zh-CN'
                  ? {
                      background: 'white',
                      color: 'oklch(15% 0.02 270)',
                      fontFamily: 'var(--font-family-display)',
                      boxShadow: '0 2px 8px rgba(255,255,255,0.1)',
                    }
                  : {
                      background: 'oklch(100% 0 0 / 0.04)',
                      border: '1px solid oklch(100% 0 0 / 0.08)',
                      color: 'var(--portal-text-muted)',
                    }
              }
            >
              中文
            </button>
            <button
              onClick={() => i18n.changeLanguage('en')}
              className="rounded-full px-4 py-2 text-sm font-medium transition-all"
              style={
                i18n.language === 'en'
                  ? {
                      background: 'white',
                      color: 'oklch(15% 0.02 270)',
                      fontFamily: 'var(--font-family-display)',
                      boxShadow: '0 2px 8px rgba(255,255,255,0.1)',
                    }
                  : {
                      background: 'oklch(100% 0 0 / 0.04)',
                      border: '1px solid oklch(100% 0 0 / 0.08)',
                      color: 'var(--portal-text-muted)',
                    }
              }
            >
              English
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
