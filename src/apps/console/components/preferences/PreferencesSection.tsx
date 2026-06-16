import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/components/ui/Button';
import { useThemeStore, type ThemeMode } from '@/shared/stores/themeStore';

export function PreferencesSection() {
  const { i18n, t } = useTranslation();
  const mode = useThemeStore((s) => s.mode);
  const setMode = useThemeStore((s) => s.setMode);

  const themeOptions: { value: ThemeMode; label: string }[] = [
    { value: 'dark', label: '深色' },
    { value: 'light', label: '浅色' },
    { value: 'system', label: '跟随系统' },
  ];

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">偏好设置</h2>
        <p className="text-sm text-[var(--color-text-secondary)]">自定义界面语言和主题</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="mb-2 block text-xs font-medium text-[var(--color-text-secondary)]">语言</label>
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
          <label className="mb-2 block text-xs font-medium text-[var(--color-text-secondary)]">主题</label>
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
