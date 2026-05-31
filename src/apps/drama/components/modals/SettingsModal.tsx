import { useState, useEffect } from 'react';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { getSettings, setApiKey } from '@/apps/drama/lib/imageGen';
import { useThemeStore, type Theme } from '@/shared/stores/themeStore';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const themeOptions: { value: Theme; label: string }[] = [
  { value: 'dark', label: '深色' },
  { value: 'light', label: '浅色' },
  { value: 'system', label: '跟随系统' },
];

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [apiKey, setApiKeyState] = useState('');
  const theme = useThemeStore((s) => s.theme);
  const setTheme = useThemeStore((s) => s.setTheme);

  useEffect(() => {
    if (isOpen) {
      setApiKeyState(getSettings().openaiApiKey ?? '');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    setApiKey(apiKey.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="w-full max-w-sm rounded-[var(--radius-base)] border border-[var(--color-border-default)] bg-[var(--color-bg-primary)] p-5 shadow-lg">
        <h3 className="mb-3 text-sm font-semibold text-[var(--color-text-primary)]">设置</h3>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-[11px] font-medium text-[var(--color-text-secondary)]">
              主题
            </label>
            <div className="flex gap-1 rounded-[var(--radius-sm)] bg-[var(--color-bg-tertiary)] p-0.5">
              {themeOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setTheme(opt.value)}
                  className={`flex-1 rounded-[var(--radius-sm)] py-1 text-[11px] font-medium transition-colors ${
                    theme === opt.value
                      ? 'bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] shadow-sm'
                      : 'text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-medium text-[var(--color-text-secondary)]">
              OpenAI API Key
            </label>
            <Input
              type="password"
              placeholder="sk-..."
              value={apiKey}
              onChange={(e) => setApiKeyState(e.target.value)}
              className="text-xs"
            />
            <p className="mt-1 text-[9px] text-[var(--color-text-tertiary)]">
              用于 AI 分镜图生成。仅保存在本地浏览器中。
            </p>
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={onClose}>取消</Button>
          <Button size="sm" onClick={handleSave}>保存</Button>
        </div>
      </div>
    </div>
  );
}
