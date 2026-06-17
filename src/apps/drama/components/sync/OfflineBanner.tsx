import { useEffect, useState } from 'react';
import { CloudOff, X } from 'lucide-react';

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  );
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false);
      setDismissed(false);
    };
    const handleOffline = () => {
      setIsOffline(true);
      setDismissed(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!isOffline || dismissed) return null;

  return (
    <div className="fixed left-1/2 top-4 z-[100] -translate-x-1/2">
      <div className="flex items-center gap-3 rounded-[var(--radius-base)] border border-amber-500/30 bg-[oklch(95%_0.05_85)] px-4 py-2.5 shadow-lg">
        <CloudOff className="h-4 w-4 text-amber-600" />
        <div className="text-xs text-[oklch(35%_0.08_85)]">
          <span className="font-medium">当前处于离线状态</span>
          <span className="ml-1 text-[oklch(45%_0.06_85)]">
            连接恢复后会自动同步。离线期间的修改可能在同步时被云端覆盖。
          </span>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="rounded p-1 text-amber-700 hover:bg-amber-200/50"
          aria-label="关闭提示"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
