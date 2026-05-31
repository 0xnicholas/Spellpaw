import { Film } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Navbar() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-[var(--color-border-default)] bg-[var(--color-bg-primary)]/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2.5">
          <img src="/favicon.svg" alt="SpellPaw" className="h-6 w-6" />
          <span
            className="text-[17px] font-bold tracking-[-0.02em] text-[var(--color-text-primary)]"
            style={{ fontFamily: '"Sora", Inter, sans-serif' }}
          >
            SpellPaw
          </span>
        </Link>
        <nav className="flex items-center gap-4">
          <Link
            to="/login"
            className="rounded-[var(--radius-base)] px-4 py-1.5 text-sm font-medium text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-bg-secondary)]"
          >
            登录
          </Link>
          <Link
            to="/projects"
            className="flex items-center gap-1.5 rounded-[var(--radius-base)] bg-gradient-to-r from-[#5b21ff] to-[#a855f7] px-4 py-1.5 text-sm font-medium text-white transition-all hover:from-[#4c1ad9] hover:to-[#9646e5]"
          >
            <Film className="h-3.5 w-3.5" />
            进入创作
          </Link>
        </nav>
      </div>
    </header>
  );
}
