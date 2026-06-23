import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

export function Footer() {
  const { t } = useTranslation();

  return (
    <footer
      className="border-t"
      style={{
        background: 'var(--portal-bg)',
        borderColor: 'oklch(100% 0 0 / 0.06)',
      }}
    >
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
          {/* Brand */}
          <div className="flex items-center gap-2">
            <img src="/favicon.svg" alt="SpellPaw" className="h-4 w-4" />
            <span
              className="text-sm font-bold tracking-[-0.01em] text-white"
              style={{ fontFamily: '"Sora", Inter, sans-serif' }}
            >
              SpellPaw
            </span>
          </div>

          {/* Center info */}
          <div className="flex flex-col items-center gap-1">
            <p className="text-xs" style={{ color: 'var(--portal-text-dim)' }}>
              {t('portal.footer.tagline')}
            </p>
            <a
              href="https://beian.miit.gov.cn/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs transition-colors"
              style={{ color: 'var(--portal-text-dim)' }}
            >
              {t('portal.footer.beian')}
            </a>
          </div>

          {/* Links */}
          <div className="flex items-center gap-5">
            <Link
              to="/login"
              className="text-xs transition-colors"
              style={{ color: 'var(--portal-text-muted)' }}
            >
              {t('portal.footer.login')}
            </Link>
            <Link
              to="/projects"
              className="text-xs transition-colors"
              style={{ color: 'var(--portal-text-muted)' }}
            >
              {t('portal.footer.studio')}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}