import { useEffect, useState } from 'react';
import { Cloud, CloudOff, RefreshCw, AlertCircle } from 'lucide-react';
import { subscribeSync, getSyncState, type SyncEngineState } from '@/lib/syncEngine';

export function SyncStatusIndicator() {
  const [state, setState] = useState<SyncEngineState>(getSyncState);

  useEffect(() => {
    return subscribeSync(setState);
  }, []);

  if (!state.lastSyncAt && state.state === 'synced' && state.pendingCount === 0) {
    // Never synced and nothing pending — show nothing
    return null;
  }

  const iconClass = 'h-3.5 w-3.5';

  let icon: React.ReactNode;
  let label: string;
  let colorClass: string;

  switch (state.state) {
    case 'syncing':
      icon = <RefreshCw className={`${iconClass} animate-spin`} />;
      label = 'Syncing…';
      colorClass = 'text-[var(--color-accent-500)]';
      break;
    case 'pending':
      icon = <Cloud className={iconClass} />;
      label = 'Pending';
      colorClass = 'text-[var(--color-text-tertiary)]';
      break;
    case 'conflict':
      icon = <AlertCircle className={iconClass} />;
      label = `${state.conflicts.length} conflict${state.conflicts.length > 1 ? 's' : ''}`;
      colorClass = 'text-amber-500';
      break;
    case 'offline':
      icon = <CloudOff className={iconClass} />;
      label = 'Offline';
      colorClass = 'text-red-400';
      break;
    default:
      icon = <Cloud className={iconClass} />;
      label = 'Synced';
      colorClass = 'text-emerald-500';
  }

  return (
    <div
      className={`flex items-center gap-1 rounded-[var(--radius-base)] px-1.5 py-0.5 text-[10px] font-medium ${colorClass} bg-[var(--color-bg-secondary)]`}
      title={state.error ?? label}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </div>
  );
}
