import { cn } from '@/lib/utils';

interface TabBarProps {
  tabs: { id: string; label: string }[];
  activeTab: string;
  onChange: (id: string) => void;
}

export function TabBar({ tabs, activeTab, onChange }: TabBarProps) {
  return (
    <div className="flex border-b border-[var(--color-border-default)]">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            'flex-1 py-2 text-xs font-medium transition-colors',
            activeTab === tab.id
              ? 'border-b-2 border-[var(--color-accent-500)] text-[var(--color-accent-500)]'
              : 'text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]'
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
