import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { getSettings, setApiKey, setDoubaoApiKey, setMinimaxApiKey } from '@drama/lib/imageGen';
import { getLLMSettings, setLLMSettings, LLM_PROVIDERS, LLM_PROVIDER_DEFAULTS, isValidProvider, DEFAULT_PROVIDER, type LLMProviderType } from '@console/lib/llmSettings';
import { fetchSettings, updateSettings } from '@console/lib/consoleApi';

export function IntegrationsSection() {
  const { t } = useTranslation();
  const [openaiKey, setOpenaiKey] = useState('');
  const [doubaoKey, setDoubaoKey] = useState('');
  const [minimaxKey, setMinimaxKey] = useState('');
  const [llmProvider, setLlmProvider] = useState<LLMProviderType>('deepseek');
  const [llmApiKey, setLlmApiKey] = useState('');
  const [llmBaseUrl, setLlmBaseUrl] = useState('');
  const [llmModel, setLlmModel] = useState('');
  const [languageSaved, setLanguageSaved] = useState(false);
  const [multimodalSaved, setMultimodalSaved] = useState(false);
  const [languageError, setLanguageError] = useState(false);
  const [multimodalError, setMultimodalError] = useState(false);
  const [languageSaving, setLanguageSaving] = useState(false);
  const [multimodalSaving, setMultimodalSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchSettings().then((server) => {
      if (server) {
        // Sync multimodal keys to localStorage directly from the server response.
        setApiKey(server.openaiApiKey ?? '');
        setDoubaoApiKey(server.doubaoApiKey ?? '');
        setMinimaxApiKey(server.minimaxApiKey ?? '');

        setOpenaiKey(server.openaiApiKey ?? '');
        setDoubaoKey(server.doubaoApiKey ?? '');
        setMinimaxKey(server.minimaxApiKey ?? '');

        const provider = isValidProvider(server.llmProvider) ? server.llmProvider : DEFAULT_PROVIDER;
        setLlmProvider(provider);
        setLlmApiKey(server.llmApiKey ?? '');
        setLlmBaseUrl(server.llmBaseUrl ?? LLM_PROVIDER_DEFAULTS[provider].baseUrl);
        setLlmModel(server.llmModel ?? LLM_PROVIDER_DEFAULTS[provider].model);
      } else {
        const local = getSettings();
        setOpenaiKey(local.openaiApiKey ?? '');
        setDoubaoKey(local.doubaoApiKey ?? '');
        setMinimaxKey(local.minimaxApiKey ?? '');
        const llm = getLLMSettings();
        setLlmProvider(llm.provider);
        setLlmApiKey(llm.apiKey);
        setLlmBaseUrl(llm.baseUrl || LLM_PROVIDER_DEFAULTS[llm.provider].baseUrl);
        setLlmModel(llm.model || LLM_PROVIDER_DEFAULTS[llm.provider].model);
      }
      setLoading(false);
    });
  }, []);

  const showSaved = (setter: (v: boolean) => void) => {
    setter(true);
    setTimeout(() => setter(false), 2000);
  };

  const handleProviderChange = (provider: LLMProviderType) => {
    setLlmProvider(provider);
    setLlmBaseUrl(LLM_PROVIDER_DEFAULTS[provider].baseUrl);
    setLlmModel(LLM_PROVIDER_DEFAULTS[provider].model);
  };

  const handleSaveLanguageModel = async () => {
    setLanguageSaving(true);
    const provider = llmProvider;
    const settings = {
      provider,
      apiKey: llmApiKey.trim(),
      baseUrl: llmBaseUrl.trim() || LLM_PROVIDER_DEFAULTS[provider].baseUrl,
      model: llmModel.trim() || LLM_PROVIDER_DEFAULTS[provider].model,
    };
    const result = await updateSettings({
      llmProvider: settings.provider,
      llmApiKey: settings.apiKey,
      llmBaseUrl: settings.baseUrl,
      llmModel: settings.model,
    });
    setLanguageSaving(false);
    if (result.success) {
      setLLMSettings(settings);
      showSaved(setLanguageSaved);
    } else {
      setLanguageError(true);
      setTimeout(() => setLanguageError(false), 2000);
    }
  };

  const handleSaveMultimodal = async () => {
    setMultimodalSaving(true);
    const settings = {
      openaiApiKey: openaiKey.trim(),
      doubaoApiKey: doubaoKey.trim(),
      minimaxApiKey: minimaxKey.trim(),
    };
    const result = await updateSettings(settings);
    setMultimodalSaving(false);
    if (result.success) {
      setApiKey(settings.openaiApiKey);
      setDoubaoApiKey(settings.doubaoApiKey);
      setMinimaxApiKey(settings.minimaxApiKey);
      showSaved(setMultimodalSaved);
    } else {
      setMultimodalError(true);
      setTimeout(() => setMultimodalError(false), 2000);
    }
  };

  return (
    <section className="space-y-8">
      <div>
        <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">{t('console.integrations.title')}</h2>
        <p className="text-sm text-[var(--color-text-secondary)]">{t('console.integrations.description')}</p>
      </div>

      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">{t('console.integrations.languageModelTitle')}</h3>
          <p className="text-sm text-[var(--color-text-secondary)]">{t('console.integrations.languageModelDescription')}</p>
        </div>

        <div>
          <label className="mb-2 block text-xs font-medium text-[var(--color-text-secondary)]">
            {t('console.integrations.llmProvider')}
          </label>
          <div className="flex flex-wrap gap-2">
            {LLM_PROVIDERS.map((provider) => (
              <Button
                key={provider}
                variant={llmProvider === provider ? 'primary' : 'outline'}
                size="sm"
                onClick={() => handleProviderChange(provider)}
                disabled={loading}
              >
                {t(`console.integrations.providers.${provider}`)}
              </Button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--color-text-secondary)]">
            {t('console.integrations.llmApiKey')}
          </label>
          <Input
            type="password"
            value={llmApiKey}
            onChange={(e) => setLlmApiKey(e.target.value)}
            placeholder={LLM_PROVIDER_DEFAULTS[llmProvider].apiKeyPlaceholder}
            disabled={loading}
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--color-text-secondary)]">
            {t('console.integrations.llmBaseUrl')}
          </label>
          <Input
            value={llmBaseUrl}
            onChange={(e) => setLlmBaseUrl(e.target.value)}
            placeholder={LLM_PROVIDER_DEFAULTS[llmProvider].baseUrl}
            disabled={loading}
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
            placeholder={LLM_PROVIDER_DEFAULTS[llmProvider].model}
            disabled={loading}
          />
        </div>

        {languageSaved && <p className="text-xs text-green-500">{t('console.integrations.saved')}</p>}
        {languageError && <p className="text-xs text-red-500">{t('console.integrations.saveError')}</p>}

        <div className="pt-2">
          <Button size="sm" onClick={handleSaveLanguageModel} loading={languageSaving} disabled={loading}>
            {t('console.integrations.saveLanguageModel')}
          </Button>
        </div>
      </div>

      <div className="space-y-4 border-t border-[var(--color-border-default)] pt-6">
        <div>
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">{t('console.integrations.multimodalTitle')}</h3>
          <p className="text-sm text-[var(--color-text-secondary)]">{t('console.integrations.multimodalDescription')}</p>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--color-text-secondary)]">
            {t('console.integrations.openaiKey')}
          </label>
          <Input
            type="password"
            value={openaiKey}
            onChange={(e) => setOpenaiKey(e.target.value)}
            placeholder="sk-..."
            disabled={loading}
          />
          <p className="mt-1 text-[10px] text-[var(--color-text-tertiary)]">
            {t('console.integrations.openaiHint')}
          </p>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--color-text-secondary)]">
            {t('console.integrations.doubaoKey')}
          </label>
          <Input
            type="password"
            value={doubaoKey}
            onChange={(e) => setDoubaoKey(e.target.value)}
            placeholder="ark-..."
            disabled={loading}
          />
          <p className="mt-1 text-[10px] text-[var(--color-text-tertiary)]">
            {t('console.integrations.doubaoHint')}
          </p>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--color-text-secondary)]">
            {t('console.integrations.minimaxKey')}
          </label>
          <Input
            type="password"
            value={minimaxKey}
            onChange={(e) => setMinimaxKey(e.target.value)}
            placeholder={t('console.integrations.minimaxPlaceholder')}
            disabled
          />
        </div>

        {multimodalSaved && <p className="text-xs text-green-500">{t('console.integrations.saved')}</p>}
        {multimodalError && <p className="text-xs text-red-500">{t('console.integrations.saveError')}</p>}

        <div className="pt-2">
          <Button size="sm" onClick={handleSaveMultimodal} loading={multimodalSaving} disabled={loading}>
            {t('console.integrations.saveMultimodal')}
          </Button>
        </div>
      </div>
    </section>
  );
}
