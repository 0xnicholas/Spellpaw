import { Link } from 'react-router-dom';
import { ArrowLeft, User, Lock, Sliders, Plug } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/shared/lib/utils';
import type { ConsoleTab } from '@console/types';

interface ConsoleLayoutProps {
  activeTab: ConsoleTab;
  onChangeTab: (tab: ConsoleTab) => void;
  children: React.ReactNode;
}

export function ConsoleLayout({ activeTab, onChangeTab, children }: ConsoleLayoutProps) {
  const { t } = useTranslation();

  const tabs: { id: ConsoleTab; label: string; icon: React.ElementType }[] = [
    { id: 'profile', label: t('console.tabs.profile'), icon: User },
    { id: 'security', label: t('console.tabs.security'), icon: Lock },
    { id: 'preferences', label: t('console.tabs.preferences'), icon: Sliders },
    { id: 'integrations', label: t('console.tabs.integrations'), icon: Plug },
  ];

  return (
    <div className="flex h-screen flex-col bg-[var(--color-bg-primary)]">
      <header className="flex h-12 shrink-0 items-center gap-3 border-b border-[var(--color-border-default)] bg-[var(--color-bg-primary)] px-4">
        <Link
          to="/projects"
          className="flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)]"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('console.back')}
        </Link>
        <div className="h-4 w-px bg-[var(--color-border-default)]" />
        <span className="text-sm font-medium text-[var(--color-text-primary)]">{t('console.title')}</span>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="w-56 shrink-0 border-r border-[var(--color-border-default)] bg-[var(--color-bg-secondary)]/30 p-3">
          <nav className="space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => onChangeTab(tab.id)}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-[var(--radius-base)] px-3 py-2 text-sm font-medium transition-colors',
                    activeTab === tab.id
                      ? 'bg-[var(--color-accent-500)]/10 text-[var(--color-accent-500)]'
                      : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-secondary)] hover:text-[var(--color-text-primary)]'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </aside>

        <main className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-2xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
