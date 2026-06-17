# Unified Provider Registry Design

## Background
Spellpaw currently maintains LLM provider defaults in two places:
- Frontend: `src/apps/console/lib/llmSettings.ts` defines `LLM_PROVIDERS` and `LLM_PROVIDER_DEFAULTS`.
- Backend: `server/src/lib/llmClient.ts` defines `PROVIDER_DEFAULTS`.

Multimodal provider metadata (labels, hints, storage keys) is hard-coded in `src/apps/console/components/integrations/IntegrationsSection.tsx`. This duplication makes it easy for endpoint/model defaults to drift when adding or updating providers.

## Goal
Consolidate provider definitions into symmetric frontend/backend registries so that:
- Adding or changing a provider requires editing only registry files.
- Frontend and backend defaults stay aligned.
- The Integrations UI can render multimodal inputs from registry data instead of hard-coded JSX.

## Design

### Frontend Registry
**File:** `src/shared/lib/providers.ts`

```ts
export const LLM_PROVIDERS = ['doubao', 'minimax', 'deepseek', 'openai'] as const;
export type LLMProviderType = (typeof LLM_PROVIDERS)[number];

export interface LLMProviderConfig {
  baseUrl: string;
  model: string;
  apiKeyPlaceholder: string;
}

export const LLM_PROVIDER_REGISTRY: Record<LLMProviderType, LLMProviderConfig> = {
  doubao: { baseUrl: 'https://ark.cn-beijing.volces.com/api/v3', model: 'doubao-pro-32k', apiKeyPlaceholder: 'ark-...' },
  minimax: { baseUrl: 'https://api.minimax.chat/v1', model: 'abab6.5s-chat', apiKeyPlaceholder: 'eyJ...' },
  deepseek: { baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat', apiKeyPlaceholder: 'sk-...' },
  openai: { baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini', apiKeyPlaceholder: 'sk-...' },
};

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
  minimax: { labelKey: 'console.integrations.minimaxKey', hintKey: 'console.integrations.minimaxHint', placeholderKey: 'console.integrations.minimaxPlaceholder' },
};
```

### Backend Registry
**File:** `server/src/lib/providers.ts`

```ts
export const SUPPORTED_LLM_PROVIDERS = ['doubao', 'minimax', 'deepseek', 'openai'] as const;
export type SupportedLLMProvider = typeof SUPPORTED_LLM_PROVIDERS[number];

export const LLM_PROVIDER_DEFAULTS: Record<SupportedLLMProvider, { baseUrl: string; model: string }> = {
  doubao: { baseUrl: 'https://ark.cn-beijing.volces.com/api/v3', model: 'doubao-pro-32k' },
  minimax: { baseUrl: 'https://api.minimax.chat/v1', model: 'abab6.5s-chat' },
  deepseek: { baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
  openai: { baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
};

export function isSupportedLLMProvider(value: unknown): value is SupportedLLMProvider {
  return typeof value === 'string' && (SUPPORTED_LLM_PROVIDERS as readonly string[]).includes(value);
}
```

### Frontend Changes
1. **`src/apps/console/lib/llmSettings.ts`**
   - Remove local `LLM_PROVIDERS` and `LLM_PROVIDER_DEFAULTS`.
   - Re-export them from `src/shared/lib/providers.ts`.
   - Keep `LLMSettings` interface and `getLLMSettings`/`setLLMSettings` helpers here because they are storage-specific.

2. **`src/apps/console/components/integrations/IntegrationsSection.tsx`**
   - Import `MULTIMODAL_PROVIDERS` and `MULTIMODAL_PROVIDER_REGISTRY` from `src/shared/lib/providers.ts`.
   - Replace the three hard-coded multimodal input blocks with a loop over `MULTIMODAL_PROVIDERS`.
   - Use `labelKey`, `hintKey`, and `placeholderKey` for i18n lookups.
   - Keep the Minimax input disabled via `disabled={provider === 'minimax'}`.

3. **`src/apps/drama/lib/llm/types.ts`**
   - Derive `LLMProviderName` from `LLMProviderType` or simply re-export it.

### Backend Changes
1. **`server/src/lib/llmClient.ts`**
   - Remove local `SUPPORTED_PROVIDERS` and `PROVIDER_DEFAULTS`.
   - Import from `server/src/lib/providers.ts`.

2. **`server/src/routes/auth.ts`**
   - Import `SUPPORTED_LLM_PROVIDERS` and `isSupportedLLMProvider` from `server/src/lib/providers.ts`.
   - Remove the local duplicate helpers.

### Testing
- **New:** `src/shared/lib/providers.test.ts`
  - Assert every `LLMProviderType` has a config with non-empty `baseUrl`, `model`, and `apiKeyPlaceholder`.
  - Assert every `MultimodalProviderType` has a config with non-empty `labelKey` and `hintKey`.
- **Updated:** `src/apps/console/lib/llmSettings.test.ts` continues to pass using re-exported values.
- **Updated:** `server/src/lib/llmClient.test.ts` (if exists) uses the registry.

### Out of Scope
- Does not change API routes or DB schema.
- Does not add new providers.
- Does not move API key localStorage helpers (imageGen) to shared yet.

## Validation
- `npm test` passes.
- `npm run lint` passes.
- `npm run lint:server` passes.
- `npm run build` passes.
