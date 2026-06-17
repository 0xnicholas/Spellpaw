import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/components/ui/Button';

export function PreferencesSection() {
  const { i18n, t } = useTranslation();

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">{t('console.preferences.title')}</h2>
        <p className="text-sm text-[var(--color-text-secondary)]">{t('console.preferences.description')}</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="mb-2 block text-xs font-medium text-[var(--color-text-secondary)]">{t('console.preferences.language')}</label>
          <div className="flex gap-2">
            <Button
              variant={i18n.language === 'zh-CN' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => i18n.changeLanguage('zh-CN')}
            >
              中文
            </Button>
            <Button
              variant={i18n.language === 'en' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => i18n.changeLanguage('en')}
            >
              English
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
