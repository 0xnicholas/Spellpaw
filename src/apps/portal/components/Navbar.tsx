import { Film } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';

/**
 * Portal navbar — buzzy.now-style translucent dark surface
 * with slim pill CTAs. Logo stays unchanged.
 */
export function Navbar() {
  const { i18n, t } = useTranslation();
  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.06]"
      style={{
        // Solid translucent background instead of `backdrop-filter: blur()`.
        // Backdrop blur is the single biggest scroll-time GPU cost on a
        // fixed navbar (every frame re-blurs everything behind it); a
        // bumped-up alpha here looks nearly identical visually but
        // removes the per-frame composite cost entirely.
        background: 'oklch(13% 0.015 270 / 0.92)',
      }}
    >
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2.5">
          <img src="/favicon.svg" alt="SpellPaw" className="h-6 w-6" />
          <span
            className="text-[17px] font-bold tracking-[-0.02em] text-white"
            style={{ fontFamily: '"Sora", Inter, sans-serif' }}
          >
            SpellPaw
          </span>
        </Link>

        <nav className="flex items-center gap-2">
          <button
            onClick={() =>
              i18n.changeLanguage(i18n.language === 'zh-CN' ? 'en' : 'zh-CN')
            }
            className="flex h-7 items-center rounded-full px-2.5 text-[10px] font-medium transition-colors"
            style={{ color: 'oklch(75% 0 0)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'oklch(100% 0 0 / 0.06)';
              e.currentTarget.style.color = 'white';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'oklch(75% 0 0)';
            }}
            title={t('portal.nav.switchLanguage')}
          >
            {i18n.language === 'zh-CN' ? 'EN' : '中'}
          </button>
          <Link
            to="/login"
            className="rounded-full px-4 py-1.5 text-sm font-medium text-white/80 transition-colors hover:bg-white/[0.06] hover:text-white"
          >
            {t('portal.nav.login')}
          </Link>
          <Link
            to="/projects"
            className="group flex items-center gap-1.5 rounded-full bg-white px-4 py-1.5 text-sm font-semibold text-[oklch(15%_0.02_270)] transition-all hover:bg-white/90"
            style={{ boxShadow: '0 0 24px oklch(60% 0.2 275 / 0.25)' }}
          >
            <Film className="h-3.5 w-3.5" />
            {t('portal.nav.enterStudio')}
          </Link>
        </nav>
      </div>
    </header>
  );
}
