import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { getSettings, setApiKey } from '@drama/lib/imageGen';
import { getLLMSettings, setLLMSettings, type LLMProviderType } from '@console/lib/llmSettings';
import { fetchSettings, updateSettings } from '@console/lib/consoleApi';

export function IntegrationsSection() {
  const { t } = useTranslation();
  const [apiKey, setApiKeyState] = useState('');
  const [llmProvider, setLlmProvider] = useState<LLMProviderType>('spellpaw');
  const [llmApiKey, setLlmApiKey] = useState('');
  const [llmBaseUrl, setLlmBaseUrl] = useState('');
  const [llmModel, setLlmModel] = useState('');
  const [saved, setSaved] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');

  useEffect(() => {
    setStatus('loading');
    fetchSettings().then((server) => {
      if (server) {
        setApiKeyState(server.openaiApiKey ?? '');
        setLlmProvider((server.llmProvider as LLMProviderType) ?? 'spellpaw');
        setLlmApiKey(server.llmApiKey ?? '');
        setLlmBaseUrl(server.llmBaseUrl ?? '');
        setLlmModel(server.llmModel ?? '');
      } else {
        // Fallback to local storage if server request fails
        setApiKeyState(getSettings().openaiApiKey ?? '');
        const llm = getLLMSettings();
        setLlmProvider(llm.provider);
        setLlmApiKey(llm.apiKey);
        setLlmBaseUrl(llm.baseUrl);
        setLlmModel(llm.model);
      }
      setStatus('idle');
    });
  }, []);

  const showSaved = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleSaveOpenAI = async () => {
    const trimmed = apiKey.trim();
    setApiKey(trimmed);
    const result = await updateSettings({ openaiApiKey: trimmed });
    if (result.success) {
      showSaved();
    } else {
      setStatus('error');
    }
  };

  const handleSaveLLM = async () => {
    const settings = {
      provider: llmProvider,
      apiKey: llmApiKey.trim(),
      baseUrl: llmBaseUrl.trim(),
      model: llmModel.trim(),
    };
    setLLMSettings(settings);
    const result = await updateSettings({
      llmProvider: settings.provider,
      llmApiKey: settings.apiKey,
      llmBaseUrl: settings.baseUrl,
      llmModel: settings.model,
    });
    if (result.success) {
      showSaved();
    } else {
      setStatus('error');
    }
  };

  return (
    <section className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">{t('console.integrations.title')}</h2>
        <p className="text-sm text-[var(--color-text-secondary)]">{t('console.integrations.description')}</p>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">OpenAI API Key</h3>
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--color-text-secondary)]">
            {t('console.integrations.openaiKey')}
          </label>
          <Input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKeyState(e.target.value)}
            placeholder="sk-..."
          />
          <p className="mt-1 text-[10px] text-[var(--color-text-tertiary)]">
            {t('console.integrations.openaiHint')}
          </p>
        </div>

        {saved && <p className="text-xs text-green-500">{t('console.integrations.saved')}</p>}
        {status === 'error' && <p className="text-xs text-red-500">{t('console.integrations.saveError')}</p>}

        <div className="pt-2">
          <Button size="sm" onClick={handleSaveOpenAI} disabled={status === 'loading'}>{t('console.integrations.save')}</Button>
        </div>
      </div>

      <div className="border-t border-[var(--color-border-default)] pt-6">
        <h3 className="mb-3 text-sm font-semibold text-[var(--color-text-primary)]">{t('console.integrations.llmTitle')}</h3>

        <div className="space-y-4">
          <div>
            <label className="mb-2 block text-xs font-medium text-[var(--color-text-secondary)]">
              {t('console.integrations.llmProvider')}
            </label>
            <div className="flex gap-2">
              <Button
                variant={llmProvider === 'spellpaw' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setLlmProvider('spellpaw')}
              >
                Spellpaw Server
              </Button>
              <Button
                variant={llmProvider === 'custom' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setLlmProvider('custom')}
              >
                {t('console.integrations.customProvider')}
              </Button>
            </div>
          </div>

          {llmProvider === 'custom' && (
            <>
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--color-text-secondary)]">
                  {t('console.integrations.llmApiKey')}
                </label>
                <Input
                  type="password"
                  value={llmApiKey}
                  onChange={(e) => setLlmApiKey(e.target.value)}
                  placeholder="sk-..."
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--color-text-secondary)]">
                  {t('console.integrations.llmBaseUrl')}
                </label>
                <Input
                  value={llmBaseUrl}
                  onChange={(e) => setLlmBaseUrl(e.target.value)}
                  placeholder="https://api.deepseek.com/v1"
                />
                <p className="mt-1 text-[10px] text-[var(--color-text-tertiary)]">
                  {t('console.integrations.llmBaseUrlHint')}
                </p>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--color-text-secondary)]">
                  {t('console.integrations.llmModel')}
                </label>
                <Input
                  value={llmModel}
                  onChange={(e) => setLlmModel(e.target.value)}
                  placeholder="deepseek-chat"
                />
              </div>
            </>
          )}

          <div className="pt-2">
            <Button size="sm" onClick={handleSaveLLM} disabled={status === 'loading'}>{t('console.integrations.saveLlm')}</Button>
          </div>
        </div>
      </div>
    </section>
  );
}
