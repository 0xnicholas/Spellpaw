import { useEffect, useState } from 'react';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { getSettings, setApiKey } from '@drama/lib/imageGen';

export function IntegrationsSection() {
  const [apiKey, setApiKeyState] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setApiKeyState(getSettings().openaiApiKey ?? '');
  }, []);

  const handleSave = () => {
    setApiKey(apiKey.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">集成 / API</h2>
        <p className="text-sm text-[var(--color-text-secondary)]">管理第三方 API Key 和本地集成设置</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--color-text-secondary)]">
            OpenAI API Key
          </label>
          <Input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKeyState(e.target.value)}
            placeholder="sk-..."
          />
          <p className="mt-1 text-[10px] text-[var(--color-text-tertiary)]">
            用于 AI 分镜图生成。仅保存在本地浏览器中，不会上传到服务器。
          </p>
        </div>

        {saved && <p className="text-xs text-green-500">已保存</p>}

        <div className="pt-2">
          <Button size="sm" onClick={handleSave}>保存 API Key</Button>
        </div>
      </div>
    </section>
  );
}
