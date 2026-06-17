# Unified Provider Registry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consolidate LLM and multimodal provider defaults into symmetric frontend/backend registries and drive the Integrations UI from registry metadata.

**Architecture:** Create a single source of truth in `src/shared/lib/providers.ts` for frontend apps and `server/src/lib/providers.ts` for the backend. Existing `llmSettings.ts` becomes a thin re-export/alias layer so callers do not change. The Integrations page renders multimodal inputs by iterating over `MULTIMODAL_PROVIDERS` instead of hard-coding OpenAI/Doubao/Minimax JSX.

**Tech Stack:** TypeScript 6, Vitest, React 19, Tailwind CSS 4, Express.

---

## Files

| File | Action | Responsibility |
|------|--------|----------------|
| `src/shared/lib/providers.ts` | Create | Frontend registry: LLM provider list/defaults/validation + multimodal provider metadata |
| `src/shared/lib/providers.test.ts` | Create | Unit tests for frontend registry |
| `src/apps/console/lib/llmSettings.ts` | Modify | Re-export registry constants and keep `LLMSettings`, `getLLMSettings`, `setLLMSettings` |
| `src/apps/console/lib/llmSettings.test.ts` | Modify | Update imports if needed; all existing assertions stay valid |
| `server/src/lib/providers.ts` | Create | Backend registry: LLM provider list/defaults/validation |
| `server/src/lib/providers.test.ts` | Create | Unit tests for backend registry |
| `server/src/lib/llmClient.ts` | Modify | Import provider defaults/validation from `server/src/lib/providers.ts` |
| `server/src/routes/auth.ts` | Modify | Import provider validation/default from `server/src/lib/providers.ts` |
| `src/apps/console/components/integrations/IntegrationsSection.tsx` | Modify | Render language model and multimodal sections from registry metadata |
| `src/apps/drama/lib/llm/types.ts` | Modify | Reuse `LLMProviderType` from shared registry for `LLMProviderName` |

---

### Task 1: Frontend Registry

**Files:**
- Create: `src/shared/lib/providers.ts`
- Test: `src/shared/lib/providers.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/shared/lib/providers.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  LLM_PROVIDERS,
  LLM_PROVIDER_REGISTRY,
  DEFAULT_LLM_PROVIDER,
  isValidLLMProvider,
  MULTIMODAL_PROVIDERS,
  MULTIMODAL_PROVIDER_REGISTRY,
} from './providers';

describe('providers', () => {
  it('lists expected LLM providers', () => {
    expect(LLM_PROVIDERS).toEqual(['doubao', 'minimax', 'deepseek', 'openai']);
  });

  it('has config for every LLM provider', () => {
    for (const p of LLM_PROVIDERS) {
      const config = LLM_PROVIDER_REGISTRY[p];
      expect(config).toBeDefined();
      expect(config.baseUrl).toMatch(/^https?:\/\//);
      expect(config.model).toBeTruthy();
      expect(config.apiKeyPlaceholder).toBeTruthy();
    }
  });

  it('default provider is supported', () => {
    expect(isValidLLMProvider(DEFAULT_LLM_PROVIDER)).toBe(true);
  });

  it('validates provider names', () => {
    expect(isValidLLMProvider('deepseek')).toBe(true);
    expect(isValidLLMProvider('openai')).toBe(true);
    expect(isValidLLMProvider('gemini')).toBe(false);
    expect(isValidLLMProvider(null)).toBe(false);
    expect(isValidLLMProvider(123)).toBe(false);
  });

  it('lists multimodal providers with required metadata', () => {
    expect(MULTIMODAL_PROVIDERS).toEqual(['openai', 'doubao', 'minimax']);
    for (const p of MULTIMODAL_PROVIDERS) {
      const config = MULTIMODAL_PROVIDER_REGISTRY[p];
      expect(config).toBeDefined();
      expect(config.labelKey).toBeTruthy();
      expect(config.hintKey).toBeTruthy();
    }
  });
});
```

- [ ] **Step 2: Run the failing test**

```bash
npx vitest run src/shared/lib/providers.test.ts
```

Expected: FAIL with "Cannot find module './providers'".

- [ ] **Step 3: Implement the frontend registry**

Create `src/shared/lib/providers.ts`:

```ts
export const LLM_PROVIDERS = ['doubao', 'minimax', 'deepseek', 'openai'] as const;
export type LLMProviderType = (typeof LLM_PROVIDERS)[number];

export interface LLMProviderConfig {
  baseUrl: string;
  model: string;
  apiKeyPlaceholder: string;
}

export const LLM_PROVIDER_REGISTRY: Record<LLMProviderType, LLMProviderConfig> = {
  doubao: {
    baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
    model: 'doubao-pro-32k',
    apiKeyPlaceholder: 'ark-...',
  },
  minimax: {
    baseUrl: 'https://api.minimax.chat/v1',
    model: 'abab6.5s-chat',
    apiKeyPlaceholder: 'eyJ...',
  },
  deepseek: {
    baseUrl: 'https://api.deepseek.com/v1',
    model: 'deepseek-chat',
    apiKeyPlaceholder: 'sk-...',
  },
  openai: {
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-4o-mini',
    apiKeyPlaceholder: 'sk-...',
  },
};

export const DEFAULT_LLM_PROVIDER: LLMProviderType = 'deepseek';

export function isValidLLMProvider(value: unknown): value is LLMProviderType {
  return typeof value === 'string' && (LLM_PROVIDERS as readonly string[]).includes(value);
}

export const MULTIMODAL_PROVIDERS = ['openai', 'doubao', 'minimax'] as const;
export type MultimodalProviderType = (typeof MULTIMODAL_PROVIDERS)[number];

export interface MultimodalProviderConfig {
  labelKey: string;
  hintKey: string;
  placeholderKey?: string;
}

export const MULTIMODAL_PROVIDER_REGISTRY: Record<MultimodalProviderType, MultimodalProviderConfig> = {
  openai: { labelKey: 'console.integrations.openaiKey', hintKey: 'console.integrations.openaiHint' },
  doubao: { labelKey: 'console.integrations.doubaoKey', hintKey: 'console.integrations.doubaoHint' },
  minimax: {
    labelKey: 'console.integrations.minimaxKey',
    hintKey: 'console.integrations.minimaxHint',
    placeholderKey: 'console.integrations.minimaxPlaceholder',
  },
};
```

- [ ] **Step 4: Run the test**

```bash
npx vitest run src/shared/lib/providers.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/shared/lib/providers.ts src/shared/lib/providers.test.ts
git commit -m "feat: add shared LLM and multimodal provider registry"
```

---

### Task 2: Refactor Console `llmSettings.ts` to Re-export the Registry

**Files:**
- Modify: `src/apps/console/lib/llmSettings.ts`
- Test: `src/apps/console/lib/llmSettings.test.ts`

- [ ] **Step 1: Replace local constants with re-exports**

Replace the contents of `src/apps/console/lib/llmSettings.ts` with:

```ts
import {
  LLM_PROVIDERS,
  LLM_PROVIDER_REGISTRY,
  DEFAULT_LLM_PROVIDER,
  isValidLLMProvider,
  type LLMProviderType,
} from '@shared/lib/providers';

export type { LLMProviderType };
export { LLM_PROVIDERS, DEFAULT_LLM_PROVIDER };
export { LLM_PROVIDER_REGISTRY as LLM_PROVIDER_DEFAULTS };
export { DEFAULT_LLM_PROVIDER as DEFAULT_PROVIDER };
export { isValidLLMProvider as isValidProvider };

export interface LLMSettings {
  provider: LLMProviderType;
  apiKey: string;
  baseUrl: string;
  model: string;
}

const SETTINGS_KEY = 'spellpaw_llm_settings';

export function getLLMSettings(): LLMSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        provider: isValidLLMProvider(parsed.provider) ? parsed.provider : DEFAULT_LLM_PROVIDER,
        apiKey: typeof parsed.apiKey === 'string' ? parsed.apiKey : '',
        baseUrl: typeof parsed.baseUrl === 'string' ? parsed.baseUrl : '',
        model: typeof parsed.model === 'string' ? parsed.model : '',
      };
    }
  } catch { /* ignore */ }
  const defaults = LLM_PROVIDER_DEFAULTS[DEFAULT_LLM_PROVIDER];
  return { provider: DEFAULT_LLM_PROVIDER, apiKey: '', baseUrl: defaults.baseUrl, model: defaults.model };
}

export function setLLMSettings(settings: LLMSettings): void {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
```

- [ ] **Step 2: Update test imports if needed**

Open `src/apps/console/lib/llmSettings.test.ts`. The existing import already imports `LLM_PROVIDER_DEFAULTS` from `./llmSettings`, which still works because it is re-exported. No changes are required. Verify the file still looks correct.

- [ ] **Step 3: Run the tests**

```bash
npx vitest run src/apps/console/lib/llmSettings.test.ts
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add src/apps/console/lib/llmSettings.ts src/apps/console/lib/llmSettings.test.ts
git commit -m "refactor(console): derive llmSettings from shared provider registry"
```

---

### Task 3: Backend Registry

**Files:**
- Create: `server/src/lib/providers.ts`
- Test: `server/src/lib/providers.test.ts`

- [ ] **Step 1: Write the failing test**

Create `server/src/lib/providers.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  SUPPORTED_LLM_PROVIDERS,
  LLM_PROVIDER_DEFAULTS,
  DEFAULT_LLM_PROVIDER,
  isSupportedLLMProvider,
} from './providers';

describe('server providers', () => {
  it('lists expected providers', () => {
    expect(SUPPORTED_LLM_PROVIDERS).toEqual(['doubao', 'minimax', 'deepseek', 'openai']);
  });

  it('has defaults for every provider', () => {
    for (const p of SUPPORTED_LLM_PROVIDERS) {
      const defaults = LLM_PROVIDER_DEFAULTS[p];
      expect(defaults).toBeDefined();
      expect(defaults.baseUrl).toMatch(/^https?:\/\//);
      expect(defaults.model).toBeTruthy();
    }
  });

  it('default provider is supported', () => {
    expect(isSupportedLLMProvider(DEFAULT_LLM_PROVIDER)).toBe(true);
  });

  it('validates provider names', () => {
    expect(isSupportedLLMProvider('deepseek')).toBe(true);
    expect(isSupportedLLMProvider('openai')).toBe(true);
    expect(isSupportedLLMProvider('gemini')).toBe(false);
    expect(isSupportedLLMProvider(undefined)).toBe(false);
    expect(isSupportedLLMProvider(42)).toBe(false);
  });
});
```

- [ ] **Step 2: Run the failing test**

```bash
npx vitest run server/src/lib/providers.test.ts
```

Expected: FAIL with "Cannot find module".

- [ ] **Step 3: Implement the backend registry**

Create `server/src/lib/providers.ts`:

```ts
export const SUPPORTED_LLM_PROVIDERS = ['doubao', 'minimax', 'deepseek', 'openai'] as const;
export type SupportedLLMProvider = (typeof SUPPORTED_LLM_PROVIDERS)[number];

export const LLM_PROVIDER_DEFAULTS: Record<SupportedLLMProvider, { baseUrl: string; model: string }> = {
  doubao: { baseUrl: 'https://ark.cn-beijing.volces.com/api/v3', model: 'doubao-pro-32k' },
  minimax: { baseUrl: 'https://api.minimax.chat/v1', model: 'abab6.5s-chat' },
  deepseek: { baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
  openai: { baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
};

export const DEFAULT_LLM_PROVIDER: SupportedLLMProvider = 'deepseek';

export function isSupportedLLMProvider(value: unknown): value is SupportedLLMProvider {
  return typeof value === 'string' && (SUPPORTED_LLM_PROVIDERS as readonly string[]).includes(value);
}
```

- [ ] **Step 4: Run the test**

```bash
npx vitest run server/src/lib/providers.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add server/src/lib/providers.ts server/src/lib/providers.test.ts
git commit -m "feat(server): add LLM provider registry"
```

---

### Task 4: Adopt Backend Registry

**Files:**
- Modify: `server/src/lib/llmClient.ts`
- Modify: `server/src/routes/auth.ts`

- [ ] **Step 1: Replace constants in `llmClient.ts`**

Open `server/src/lib/llmClient.ts`. Add at the top:

```ts
import { DEFAULT_LLM_PROVIDER, isSupportedLLMProvider, LLM_PROVIDER_DEFAULTS } from './providers';
```

Delete lines 57-69 (the local `SUPPORTED_PROVIDERS`, `SupportedProvider`, `PROVIDER_DEFAULTS`, and `isSupportedProvider`).

Update the provider resolution line from:

```ts
const providerName = isSupportedProvider(context.provider) ? context.provider : 'deepseek';
const defaults = PROVIDER_DEFAULTS[providerName];
```

to:

```ts
const providerName = isSupportedLLMProvider(context.provider) ? context.provider : DEFAULT_LLM_PROVIDER;
const defaults = LLM_PROVIDER_DEFAULTS[providerName];
```

- [ ] **Step 2: Replace constants in `auth.ts`**

Open `server/src/routes/auth.ts`. Add at the top:

```ts
import { DEFAULT_LLM_PROVIDER, isSupportedLLMProvider } from '../lib/providers';
```

Delete lines 7-14:

```ts
const SUPPORTED_LLM_PROVIDERS = ['doubao', 'minimax', 'deepseek', 'openai'] as const;
const DEFAULT_LLM_PROVIDER = 'deepseek';

function normalizeLlmProvider(value: unknown): string {
  return typeof value === 'string' && (SUPPORTED_LLM_PROVIDERS as readonly string[]).includes(value)
    ? value
    : DEFAULT_LLM_PROVIDER;
}
```

Replace with:

```ts
function normalizeLlmProvider(value: unknown): string {
  return isSupportedLLMProvider(value) ? value : DEFAULT_LLM_PROVIDER;
}
```

- [ ] **Step 3: Type-check and lint the server**

```bash
npm run lint:server
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add server/src/lib/llmClient.ts server/src/routes/auth.ts
git commit -m "refactor(server): adopt provider registry in llmClient and auth routes"
```

---

### Task 5: Drive Integrations UI from Registry

**Files:**
- Modify: `src/apps/console/components/integrations/IntegrationsSection.tsx`

- [ ] **Step 1: Replace the component file**

Replace the contents of `src/apps/console/components/integrations/IntegrationsSection.tsx` with:

```tsx
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { getSettings } from '@drama/lib/imageGen';
import {
  DEFAULT_LLM_PROVIDER,
  isValidLLMProvider,
  LLM_PROVIDERS,
  LLM_PROVIDER_REGISTRY,
  MULTIMODAL_PROVIDERS,
  MULTIMODAL_PROVIDER_REGISTRY,
  type LLMProviderType,
} from '@shared/lib/providers';
import { fetchSettings, updateSettings, type UserSettings } from '@console/lib/consoleApi';
import { getLLMSettings, setLLMSettings } from '@console/lib/llmSettings';
import { syncUserSettings } from '@console/lib/syncSettings';

export function IntegrationsSection() {
  const { t } = useTranslation();
  const [multimodalKeys, setMultimodalKeys] = useState<Record<string, string>>({});
  const [llmProvider, setLlmProvider] = useState<LLMProviderType>(DEFAULT_LLM_PROVIDER);
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
    fetchSettings().then(async (server) => {
      if (server) {
        await syncUserSettings(server);
      }

      const local = getSettings();
      const initialMultimodal: Record<string, string> = {};
      for (const id of MULTIMODAL_PROVIDERS) {
        initialMultimodal[id] = local[`${id}ApiKey`] ?? '';
      }
      setMultimodalKeys(initialMultimodal);

      const llm = getLLMSettings();
      const provider = server && isValidLLMProvider(server.llmProvider) ? server.llmProvider : llm.provider;
      setLlmProvider(provider);
      setLlmApiKey(server?.llmApiKey ?? llm.apiKey);
      setLlmBaseUrl(server?.llmBaseUrl ?? (llm.baseUrl || LLM_PROVIDER_REGISTRY[provider].baseUrl));
      setLlmModel(server?.llmModel ?? (llm.model || LLM_PROVIDER_REGISTRY[provider].model));

      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const showSaved = (setter: (v: boolean) => void) => {
    setter(true);
    setTimeout(() => setter(false), 2000);
  };

  const handleProviderChange = (provider: LLMProviderType) => {
    setLlmProvider(provider);
    setLlmBaseUrl(LLM_PROVIDER_REGISTRY[provider].baseUrl);
    setLlmModel(LLM_PROVIDER_REGISTRY[provider].model);
  };

  const handleSaveLanguageModel = async () => {
    setLanguageSaving(true);
    const provider = llmProvider;
    const settings = {
      provider,
      apiKey: llmApiKey.trim(),
      baseUrl: llmBaseUrl.trim() || LLM_PROVIDER_REGISTRY[provider].baseUrl,
      model: llmModel.trim() || LLM_PROVIDER_REGISTRY[provider].model,
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
    const settings: Partial<UserSettings> = {};
    // Minimax is disabled/coming-soon, so exclude it from the save payload
    // to avoid overwriting any existing server value.
    for (const id of MULTIMODAL_PROVIDERS) {
      if (id === 'minimax') continue;
      settings[`${id}ApiKey` as keyof UserSettings] = multimodalKeys[id]?.trim() ?? '';
    }
    const result = await updateSettings(settings);
    setMultimodalSaving(false);
    if (result.success && result.data) {
      await syncUserSettings(result.data);
      const local = getSettings();
      const next: Record<string, string> = {};
      for (const id of MULTIMODAL_PROVIDERS) {
        next[id] = local[`${id}ApiKey`] ?? '';
      }
      setMultimodalKeys(next);
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
            placeholder={LLM_PROVIDER_REGISTRY[llmProvider].apiKeyPlaceholder}
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
            placeholder={LLM_PROVIDER_REGISTRY[llmProvider].baseUrl}
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
            placeholder={LLM_PROVIDER_REGISTRY[llmProvider].model}
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

        {MULTIMODAL_PROVIDERS.map((id) => {
          const config = MULTIMODAL_PROVIDER_REGISTRY[id];
          return (
            <div key={id}>
              <label className="mb-1 block text-xs font-medium text-[var(--color-text-secondary)]">
                {t(config.labelKey)}
              </label>
              <Input
                type="password"
                value={multimodalKeys[id] ?? ''}
                onChange={(e) => setMultimodalKeys((prev) => ({ ...prev, [id]: e.target.value }))}
                placeholder={config.placeholderKey ? t(config.placeholderKey) : undefined}
                disabled={id === 'minimax' || loading}
              />
              <p className="mt-1 text-[10px] text-[var(--color-text-tertiary)]">
                {t(config.hintKey)}
              </p>
            </div>
          );
        })}

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
```

- [ ] **Step 2: Lint the frontend**

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/apps/console/components/integrations/IntegrationsSection.tsx
git commit -m "refactor(console): render integrations from provider registry"
```

---

### Task 6: Reuse Shared Type in Drama LLM Types

**Files:**
- Modify: `src/apps/drama/lib/llm/types.ts`

- [ ] **Step 1: Import shared type**

Open `src/apps/drama/lib/llm/types.ts` and add at the top:

```ts
import type { LLMProviderType } from '@shared/lib/providers';
```

Replace the last line:

```ts
export type LLMProviderName = 'spellpaw' | 'doubao' | 'minimax' | 'deepseek' | 'openai';
```

with:

```ts
export type LLMProviderName = 'spellpaw' | LLMProviderType;
```

- [ ] **Step 2: Run frontend tests and type-check**

```bash
npm test
```

Expected: PASS.

```bash
npm run lint
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/apps/drama/lib/llm/types.ts
git commit -m "refactor(drama): derive LLMProviderName from shared registry type"
```

---

### Task 7: Final Verification

- [ ] **Step 1: Run full test suite**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 2: Run full lint**

```bash
npm run lint && npm run lint:server
```

Expected: no errors.

- [ ] **Step 3: Run production build**

```bash
npm run build
```

Expected: build succeeds.

- [ ] **Step 4: Review git status**

```bash
git status --short
```

Expected: only the files touched by this plan are staged/committed. The unrelated modified files (`server/src/routes/proxy.ts`, `src/apps/drama/lib/canvasToolkit/index.ts`, `src/apps/drama/lib/systemPrompt.ts`, `src/apps/drama/stores/toolRouter.test.ts`, `src/apps/drama/stores/toolRouter.ts`) and untracked siliconflow files remain untouched.

---

## Notes

- Do not change the unrelated working-tree files listed in Task 7 Step 4.
- Adding a brand-new provider still requires i18n keys and possibly image-gen helpers; the registry only centralizes existing metadata.
- The backend registry deliberately omits `apiKeyPlaceholder` because the server does not need placeholder strings.
