import { Film, Sparkles, Moon, Sun } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useThemeStore } from '@/shared/stores/themeStore';

export function Navbar() {
  const { theme, toggleTheme } = useThemeStore();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-[var(--color-border-default)] bg-[var(--color-bg-primary)]/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2.5">
          <Sparkles className="h-5 w-5 text-[var(--color-accent-500)]" />
          <span className="text-lg font-semibold tracking-tight text-[var(--color-text-primary)]">
            Spellpaw
          </span>
        </Link>
        <nav className="flex items-center gap-6">
          <a
            href="#apps"
            className="text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)]"
          >
            应用
          </a>
          <a
            href="#features"
            className="text-sm font-medium text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)]"
          >
            功能
          </a>
          <button
            onClick={toggleTheme}
            className="flex h-8 w-8 items-center justify-center rounded-[var(--radius-base)] text-[var(--color-text-tertiary)] transition-colors hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text-primary)]"
            title={theme === 'dark' ? '切换亮色模式' : '切换暗色模式'}
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <Link
            to="/login"
            className="rounded-[var(--radius-base)] px-4 py-1.5 text-sm font-medium text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-bg-secondary)]"
          >
            登录
          </Link>
          <Link
            to="/projects"
            className="flex items-center gap-1.5 rounded-[var(--radius-base)] bg-[var(--color-accent-500)] px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-[var(--color-accent-600)]"
          >
            <Film className="h-3.5 w-3.5" />
            进入创作
          </Link>
        </nav>
      </div>
    </header>
  );
}
