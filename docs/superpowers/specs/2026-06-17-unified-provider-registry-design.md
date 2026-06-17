# Unified Provider Registry Design

## Background
Spellpaw currently maintains LLM provider defaults in two places:
- Frontend: `src/apps/console/lib/llmSettings.ts` defines `LLM_PROVIDERS` and `LLM_PROVIDER_DEFAULTS`.
- Backend: `server/src/lib/llmClient.ts` defines `PROVIDER_DEFAULTS`.

Multimodal provider metadata (labels, hints, storage keys) is hard-coded in `src/apps/console/components/integrations/IntegrationsSection.tsx`. This duplication makes it easy for endpoint/model defaults to drift when adding or updating providers.

## Goal
Consolidate provider definitions into symmetric frontend/backend registries so that:
- Provider endpoint/model defaults stay aligned between frontend and backend.
- The Integrations UI can render multimodal inputs from registry data instead of hard-coded JSX.

Note: adding a brand-new provider still requires i18n keys and possibly image-gen helpers, but defaults and metadata live in the registries.

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

export const DEFAULT_LLM_PROVIDER: SupportedLLMProvider = 'deepseek';

export function isSupportedLLMProvider(value: unknown): value is SupportedLLMProvider {
  return typeof value === 'string' && (SUPPORTED_LLM_PROVIDERS as readonly string[]).includes(value);
}
```

### Frontend Changes
1. **`src/apps/console/lib/llmSettings.ts`**
   - Remove local `LLM_PROVIDERS` and `LLM_PROVIDER_DEFAULTS`.
   - Re-export them from `src/shared/lib/providers.ts`.
   - Keep `DEFAULT_PROVIDER` and `isValidProvider` as thin aliases/re-exports from the registry so existing callers don't break.
   - Keep `LLMSettings` interface and `getLLMSettings`/`setLLMSettings` helpers here because they are storage-specific.

2. **`src/apps/console/components/integrations/IntegrationsSection.tsx`**
   - Import `MULTIMODAL_PROVIDERS` and `MULTIMODAL_PROVIDER_REGISTRY` from `src/shared/lib/providers.ts`.
   - Replace the three hard-coded multimodal input blocks with a loop over `MULTIMODAL_PROVIDERS`.
   - Use `labelKey`, `hintKey`, and `placeholderKey` for i18n lookups.
   - If `placeholderKey` is absent, leave the input placeholder empty.
   - Keep the Minimax input disabled via `disabled={provider === 'minimax'}`.

3. **`src/apps/drama/lib/llm/types.ts`**
   - Keep `'spellpaw'` as the internal frontend adapter name and add the named model providers:
     ```ts
     export type LLMProviderName = 'spellpaw' | LLMProviderType;
     ```

### Backend Changes
1. **`server/src/lib/llmClient.ts`**
   - Remove local `SUPPORTED_PROVIDERS` and `PROVIDER_DEFAULTS`.
   - Import from `server/src/lib/providers.ts`.

2. **`server/src/routes/auth.ts`**
   - Import `SUPPORTED_LLM_PROVIDERS`, `isSupportedLLMProvider`, and `DEFAULT_LLM_PROVIDER` from `server/src/lib/providers.ts`.
   - Remove the local duplicate helpers and use `DEFAULT_LLM_PROVIDER` as the fallback value.

### Testing
- **New:** `src/shared/lib/providers.test.ts`
  - Assert every `LLMProviderType` has a config with non-empty `baseUrl`, `model`, and `apiKeyPlaceholder`.
  - Assert every `MultimodalProviderType` has a config with non-empty `labelKey` and `hintKey`.
- **New:** `server/src/lib/providers.test.ts`
  - Assert `SUPPORTED_LLM_PROVIDERS` length matches `LLM_PROVIDER_DEFAULTS` keys.
  - Assert `isSupportedLLMProvider` returns true for valid providers and false for invalid strings.
  - Assert `DEFAULT_LLM_PROVIDER` is one of the supported providers.
- **Updated:** `src/apps/console/lib/llmSettings.test.ts` continues to pass using re-exported values.
- **Updated:** `server/src/lib/llmClient.test.ts` (if exists) uses the registry.

### Execution Order
This spec rewrites `IntegrationsSection.tsx`, which was also modified by the capability-grouping plan. The capability-grouping implementation has already landed on `main`. This registry refactor should therefore be implemented on top of the current `main` and will update the already-grouped UI to use registry-driven rendering.

### Out of Scope
- Does not change API routes or DB schema.
- Does not add new providers.
- Does not move API key localStorage helpers (imageGen) to shared yet.

## Validation
- `npm test` passes.
- `npm run lint` passes.
- `npm run lint:server` passes.
- `npm run build` passes.
