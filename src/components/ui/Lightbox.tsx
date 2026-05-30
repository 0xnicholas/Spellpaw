import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X, ZoomIn } from 'lucide-react';

interface LightboxProps {
  src: string;
  alt?: string;
  isOpen: boolean;
  onClose: () => void;
}

export function Lightbox({ src, alt, isOpen, onClose }: LightboxProps) {
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current();
    };
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white/80 hover:bg-black/60 hover:text-white transition-colors"
        title="关闭（Esc）"
      >
        <X className="h-4 w-4" />
      </button>

      {/* Title */}
      {alt && (
        <div className="absolute top-4 left-4 max-w-[70%]">
          <span className="rounded-[var(--radius-sm)] bg-black/40 px-3 py-1.5 text-xs font-medium text-white/90">
            {alt}
          </span>
        </div>
      )}

      {/* Image */}
      <div
        className="relative max-h-[90vh] max-w-[90vw]"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={src}
          alt={alt}
          className="max-h-[90vh] max-w-[90vw] rounded-[var(--radius-base)] object-contain shadow-2xl"
        />
      </div>

      {/* Zoom hint */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 rounded-full bg-black/40 px-3 py-1 text-[10px] text-white/60">
        <ZoomIn className="h-3 w-3" />
        点击任意处关闭
      </div>
    </div>,
    document.body
  );
}
