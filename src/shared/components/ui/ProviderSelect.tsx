/**
 * ProviderSelect — single-select dropdown for choosing one provider from
 * a fixed list (e.g. LLM_PROVIDER_REGISTRY keys).
 *
 * Built on top of native <button>/<ul> rather than radix-ui to keep
 * dependencies minimal. Supports:
 *  - click trigger to open
 *  - click option to select + close
 *  - click outside to close
 *  - Escape to close
 *  - arrow keys to navigate, Enter to select
 */

import { useEffect, useId, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

export interface ProviderSelectOption<V extends string> {
  value: V;
  label: string;
  /** Small secondary line under the label (e.g. "OpenAI" / "sk-..." hint). */
  hint?: string;
  /** Whether this option is the recommended default for the current capability. */
  recommended?: boolean;
}

interface ProviderSelectProps<V extends string> {
  value: V | undefined;
  options: ProviderSelectOption<V>[];
  onChange: (value: V) => void;
  placeholder?: string;
  /** Optional label rendered above the trigger. */
  label?: string;
  disabled?: boolean;
  className?: string;
}

export function ProviderSelect<V extends string>({
  value,
  options,
  onChange,
  placeholder = '选择',
  label,
  disabled,
  className,
}: ProviderSelectProps<V>) {
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState<number>(-1);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const listboxId = useId();

  const selected = options.find((o) => o.value === value);

  // Sync active idx to selected value when opened
  useEffect(() => {
    if (open) {
      const idx = options.findIndex((o) => o.value === value);
      setActiveIdx(idx >= 0 ? idx : 0);
    }
  }, [open, value, options]);

  // Click-outside + Escape to close
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  function handleTriggerKey(e: React.KeyboardEvent<HTMLButtonElement>) {
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setOpen(true);
    }
  }

  function handleListKey(e: React.KeyboardEvent<HTMLUListElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => (i + 1) % Math.max(options.length, 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => (i - 1 + options.length) % Math.max(options.length, 1));
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const opt = options[activeIdx];
      if (opt) {
        onChange(opt.value);
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
  }

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      {label && (
        <label className="mb-1.5 block text-[11px] font-medium text-[var(--color-text-secondary)]">
          {label}
        </label>
      )}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        onClick={() => !disabled && setOpen((o) => !o)}
        onKeyDown={handleTriggerKey}
        className={cn(
          'flex h-9 w-full items-center justify-between gap-2 rounded-[var(--radius-sm)] border px-3 text-xs transition-colors',
          'border-[var(--color-border-default)] bg-[var(--color-bg-primary)]',
          'text-[var(--color-text-primary)]',
          'focus:border-[var(--color-accent-500)] focus:outline-none focus:ring-[1.5px] focus:ring-[var(--color-accent-500)]',
          disabled && 'cursor-not-allowed opacity-50',
        )}
      >
        <span className="truncate">
          {selected ? (
            <>
              {selected.label}
              {selected.recommended && (
                <span
                  className="ml-1.5 align-middle text-[10px] font-medium"
                  style={{ color: 'var(--portal-accent)' }}
                >
                  推荐
                </span>
              )}
            </>
          ) : (
            <span className="text-[var(--color-base-gray-400)]">{placeholder}</span>
          )}
        </span>
        <ChevronDown
          className={cn('h-3.5 w-3.5 shrink-0 transition-transform', open && 'rotate-180')}
          style={{ color: 'var(--color-text-muted)' }}
        />
      </button>

      {open && options.length > 0 && (
        <ul
          ref={listRef}
          id={listboxId}
          role="listbox"
          tabIndex={-1}
          onKeyDown={handleListKey}
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-auto rounded-[var(--radius-sm)] border py-1 shadow-lg"
          style={{
            background: 'var(--portal-bg-elevated)',
            borderColor: 'oklch(100% 0 0 / 0.12)',
          }}
        >
          {options.map((opt, i) => {
            const isSelected = opt.value === value;
            const isActive = i === activeIdx;
            return (
              <li
                key={opt.value}
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                  triggerRef.current?.focus();
                }}
                onMouseEnter={() => setActiveIdx(i)}
                className={cn(
                  'flex cursor-pointer items-center justify-between px-3 py-1.5 text-xs',
                  isActive && 'bg-[oklch(100%_0_0_/_0.06)]',
                  isSelected && 'font-semibold',
                )}
                style={{ color: 'var(--color-text-primary)' }}
              >
                <div className="flex flex-col">
                  <span>{opt.label}</span>
                  {opt.hint && (
                    <span
                      className="text-[10px]"
                      style={{ color: 'var(--color-text-muted)' }}
                    >
                      {opt.hint}
                    </span>
                  )}
                </div>
                {opt.recommended && (
                  <span
                    className="text-[10px] font-medium"
                    style={{ color: 'var(--portal-accent)' }}
                  >
                    推荐
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}