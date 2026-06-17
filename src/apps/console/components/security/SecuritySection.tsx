import { useTranslation } from 'react-i18next';

export function SecuritySection() {
  const { t } = useTranslation();

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">{t('console.security.title')}</h2>
        <p className="text-sm text-[var(--color-text-secondary)]">{t('console.security.description')}</p>
      </div>

      <div className="rounded-[var(--radius-base)] border border-[var(--color-border-default)] bg-[var(--color-bg-secondary)]/30 p-4">
        <p className="text-sm text-[var(--color-text-secondary)]">
          密码修改功能暂时不可用。
        </p>
      </div>
    </section>
  );
}
