import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/components/ui/Button';
import { useThemeStore, type ThemeMode } from '@/shared/stores/themeStore';

export function PreferencesSection() {
  const { i18n, t } = useTranslation();
  const mode = useThemeStore((s) => s.mode);
  const setMode = useThemeStore((s) => s.setMode);

  const themeOptions: { value: ThemeMode; label: string }[] = [
    { value: 'dark', label: t('console.preferences.dark') },
    { value: 'light', label: t('console.preferences.light') },
    { value: 'system', label: t('console.preferences.system') },
  ];

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

        <div>
          <label className="mb-2 block text-xs font-medium text-[var(--color-text-secondary)]">{t('console.preferences.theme')}</label>
          <div className="flex gap-2">
            {themeOptions.map((option) => (
              <Button
                key={option.value}
                variant={mode === option.value ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setMode(option.value)}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
