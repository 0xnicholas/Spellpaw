import { Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="border-t border-[var(--color-border-default)] bg-[var(--color-bg-secondary)]">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[var(--color-accent-500)]" />
            <span className="text-sm font-semibold text-[var(--color-text-primary)]">
              Spellpaw
            </span>
          </div>
          <p className="text-xs text-[var(--color-text-tertiary)]">
            © 2026 Spellpaw. AI 驱动的创作平台。
          </p>
          <div className="flex items-center gap-4">
            <Link
              to="/login"
              className="text-xs text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)]"
            >
              登录
            </Link>
            <Link
              to="/projects"
              className="text-xs text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)]"
            >
              创作工作台
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
