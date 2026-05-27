import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from 'react';
import { cn } from '@/lib/utils';

export interface EditableTitleRef {
  startEdit: () => void;
}

interface EditableTitleProps {
  value: string;
  onSave: (value: string) => void;
  className?: string;
  inputClassName?: string;
}

export const EditableTitle = forwardRef<EditableTitleRef, EditableTitleProps>(
  ({ value, onSave, className, inputClassName }, ref) => {
    const [isEditing, setIsEditing] = useState(false);
    const [draft, setDraft] = useState(value);
    const inputRef = useRef<HTMLInputElement>(null);

    useImperativeHandle(ref, () => ({
      startEdit: () => {
        setDraft(value);
        setIsEditing(true);
      },
    }));

    useEffect(() => {
      if (isEditing) {
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    }, [isEditing]);

    const handleSave = () => {
      if (draft.trim() && draft.trim() !== value) {
        onSave(draft.trim());
      }
      setIsEditing(false);
      setDraft(value);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') handleSave();
      if (e.key === 'Escape') {
        setIsEditing(false);
        setDraft(value);
      }
    };

    if (isEditing) {
      return (
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          className={cn(
            'rounded-[var(--radius-sm)] border border-[var(--color-accent-500)] bg-[var(--color-bg-primary)] px-1.5 py-0.5 text-xs outline-none',
            inputClassName
          )}
        />
      );
    }

    return (
      <span
        onDoubleClick={() => { setDraft(value); setIsEditing(true); }}
        className={cn('cursor-text', className)}
        title="Double-click to edit"
      >
        {value}
      </span>
    );
  }
);
