import { cn } from '@/lib/utils';

const DEFAULT_COLORS = [
  '#fef3c7', '#fde68a', '#fed7aa', '#fecaca',
  '#e9d5ff', '#ddd6fe', '#c7d2fe', '#bfdbfe',
  '#a5f3fc', '#99f6e4', '#bbf7d0', '#dcfce7',
];

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  colors?: string[];
}

export function ColorPicker({ value, onChange, colors = DEFAULT_COLORS }: ColorPickerProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {colors.map((color) => (
        <button
          key={color}
          onClick={() => onChange(color)}
          className={cn(
            'h-6 w-6 rounded-[var(--radius-sm)] border transition-all',
            value === color
              ? 'border-[var(--color-accent-500)] ring-1 ring-[var(--color-accent-500)]'
              : 'border-[var(--color-border-default)] hover:border-[var(--color-text-secondary)]'
          )}
          style={{ backgroundColor: color }}
        />
      ))}
    </div>
  );
}
