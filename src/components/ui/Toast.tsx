import { useEffect, useState } from 'react';
import { X, Image, CheckCircle, AlertCircle } from 'lucide-react';

export type ToastType = 'info' | 'success' | 'error';

interface ToastProps {
  message: string;
  type?: ToastType;
  duration?: number;
  onClose?: () => void;
}

export function Toast({ message, type = 'info', duration = 3000, onClose }: ToastProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
    }, duration);
    const cleanupTimer = setTimeout(() => {
      onClose?.();
    }, duration + 200);
    return () => {
      clearTimeout(timer);
      clearTimeout(cleanupTimer);
    };
  }, [duration, onClose]);

  if (!visible) return null;

  const icon = {
    info: <Image className="h-3.5 w-3.5" />,
    success: <CheckCircle className="h-3.5 w-3.5" />,
    error: <AlertCircle className="h-3.5 w-3.5" />,
  }[type];

  const color = {
    info: 'bg-[var(--color-bg-primary)] border-[var(--color-border-default)] text-[var(--color-text-primary)]',
    success: 'bg-[var(--color-bg-primary)] border-[var(--color-accent-500)] text-[var(--color-accent-500)]',
    error: 'bg-[var(--color-bg-primary)] border-red-400 text-red-500',
  }[type];

  return (
    <div
      className={`fixed left-1/2 top-4 z-[100] -translate-x-1/2 transform rounded-[var(--radius-base)] border px-3 py-2 shadow-lg transition-opacity ${color}`}
      style={{ minWidth: '240px', maxWidth: '400px' }}
    >
      <div className="flex items-center gap-2">
        {icon}
        <span className="flex-1 text-xs">{message}</span>
        <button onClick={() => { setVisible(false); setTimeout(() => onClose?.(), 200); }} className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]">
          <X className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}
