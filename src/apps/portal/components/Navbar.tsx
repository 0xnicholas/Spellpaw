import { Film } from 'lucide-react';
import { Link } from 'react-router-dom';

/**
 * Portal navbar — buzzy.now-style translucent dark surface
 * with slim pill CTAs. Logo stays unchanged.
 */
export function Navbar() {
  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.06]"
      style={{
        background: 'oklch(13% 0.015 270 / 0.72)',
        backdropFilter: 'blur(16px) saturate(140%)',
        WebkitBackdropFilter: 'blur(16px) saturate(140%)',
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
          <Link
            to="/login"
            className="rounded-full px-4 py-1.5 text-sm font-medium text-white/80 transition-colors hover:bg-white/[0.06] hover:text-white"
          >
            登录
          </Link>
          <Link
            to="/projects"
            className="group flex items-center gap-1.5 rounded-full bg-white px-4 py-1.5 text-sm font-semibold text-[oklch(15%_0.02_270)] transition-all hover:bg-white/90"
            style={{ boxShadow: '0 0 24px oklch(60% 0.2 275 / 0.25)' }}
          >
            <Film className="h-3.5 w-3.5" />
            进入创作
          </Link>
        </nav>
      </div>
    </header>
  );
}
