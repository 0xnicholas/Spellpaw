import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="border-t border-[var(--color-border-default)] bg-[var(--color-bg-secondary)]">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
          <div className="flex items-center gap-2">
            <img src="/favicon.svg" alt="SpellPaw" className="h-4 w-4" />
            <span
              className="text-sm font-bold tracking-[-0.01em] text-[var(--color-text-primary)]"
              style={{ fontFamily: '"Sora", Inter, sans-serif' }}
            >
              SpellPaw
            </span>
          </div>
          <div className="flex flex-col items-center gap-1">
            <p className="text-xs text-[var(--color-text-tertiary)]">
              © 2026 SpellPaw. AI 驱动的创作平台。
            </p>
            <a
              href="https://beian.miit.gov.cn/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[var(--color-text-tertiary)] transition-colors hover:text-[var(--color-text-secondary)]"
            >
              浙ICP备2026042372号
            </a>
          </div>
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
