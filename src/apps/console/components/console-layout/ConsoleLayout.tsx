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
    <div className="flex h-screen flex-col" style={{ background: 'var(--portal-bg)' }}>
      <header
        className="flex h-14 shrink-0 items-center gap-3 border-b px-6"
        style={{
          background: 'oklch(13% 0.015 270 / 0.72)',
          backdropFilter: 'blur(16px) saturate(140%)',
          WebkitBackdropFilter: 'blur(16px) saturate(140%)',
          borderColor: 'oklch(100% 0 0 / 0.06)',
        }}
      >
        <Link to="/" className="flex items-center gap-2.5">
          <img src="/favicon.svg" alt="SpellPaw" className="h-6 w-6" />
          <span
            className="text-[17px] font-bold tracking-[-0.02em] text-white"
            style={{ fontFamily: '"Sora", Inter, sans-serif' }}
          >
            SpellPaw
          </span>
        </Link>
        <div className="h-4 w-px" style={{ background: 'oklch(100% 0 0 / 0.1)' }} />
        <Link
          to="/projects"
          className="flex items-center gap-1.5 text-xs transition-colors"
          style={{ color: 'var(--portal-text-muted)' }}
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {t('console.back')}
        </Link>
        <span className="text-sm text-white">{t('console.title')}</span>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside
          className="w-60 shrink-0 border-r p-4"
          style={{
            background: 'oklch(15% 0.015 270 / 0.5)',
            borderColor: 'oklch(100% 0 0 / 0.06)',
          }}
        >
          <div
            className="mb-3 px-2 text-[10px] font-semibold tracking-[0.18em]"
            style={{ color: 'var(--portal-accent)' }}
          >
            SETTINGS
          </div>
          <nav className="space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onChangeTab(tab.id)}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium transition-all'
                  )}
                  style={
                    active
                      ? {
                          background: 'oklch(50% 0.18 275 / 0.18)',
                          color: 'var(--portal-accent)',
                          border: '1px solid oklch(60% 0.16 275 / 0.3)',
                        }
                      : {
                          color: 'var(--portal-text-muted)',
                          background: 'transparent',
                          border: '1px solid transparent',
                        }
                  }
                  onMouseEnter={(e) => {
                    if (!active) {
                      e.currentTarget.style.background = 'oklch(100% 0 0 / 0.04)';
                      e.currentTarget.style.color = 'white';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!active) {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = 'var(--portal-text-muted)';
                    }
                  }}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </aside>

        <main className="flex-1 overflow-y-auto p-8 sm:p-10">
          <div className="mx-auto max-w-2xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
