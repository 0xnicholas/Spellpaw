# Integrations Capability Grouping Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorganize the Console Integrations page into "Language Model" and "Multimodal Generation" sections, add Minimax API key storage, and keep all tests/lint passing.

**Architecture:** Keep the existing Spellpaw Server proxy and User settings model. Add a `minimaxApiKey` column to `User`, expose it through `/api/auth/settings`, and surface it in the UI grouped by capability rather than by brand.

**Tech Stack:** React 19 + TypeScript 6 + Vite 8 + Tailwind CSS 4 + Zustand/Immer + Express + Prisma + SQLite + Vitest

---

## File Structure

| File | Responsibility |
|------|----------------|
| `server/prisma/schema.prisma` | Add `minimaxApiKey String?` to `User` model |
| `server/src/routes/auth.ts` | Read/write `minimaxApiKey` in `/api/auth/settings` |
| `src/apps/drama/lib/imageGen.ts` | Add `getMinimaxApiKey` / `setMinimaxApiKey` helpers |
| `src/apps/console/lib/consoleApi.ts` | Add `minimaxApiKey` to `UserSettings` interface |
| `src/apps/console/lib/syncSettings.ts` | Sync all three multimodal keys (including empty values) to localStorage |
| `src/shared/i18n/locales/zh-CN.json` | Chinese copy for new grouped UI |
| `src/shared/i18n/locales/en.json` | English copy for new grouped UI |
| `src/apps/console/components/integrations/IntegrationsSection.tsx` | Reorganize UI into two capability sections |
| `src/apps/console/lib/consoleApi.test.ts` | Update mock settings to include `minimaxApiKey` |

---

### Task 1: Add `minimaxApiKey` to Prisma schema and migrate

**Files:**
- Modify: `server/prisma/schema.prisma`

- [ ] **Step 1: Add the field**

  In the `User` model, add:
  ```prisma
  minimaxApiKey String?
  ```

- [ ] **Step 2: Run migration and regenerate client**

  Run:
  ```bash
  cd server
  npx prisma migrate dev --name add_minimax_api_key
  npx prisma generate
  ```

  Expected: migration file created, `@prisma/client` regenerated with no errors.

- [ ] **Step 3: Commit**

  ```bash
  git add server/prisma/
  git commit -m "chore(db): add minimaxApiKey to User model"
  ```

---

### Task 2: Expose `minimaxApiKey` in auth settings routes

**Files:**
- Modify: `server/src/routes/auth.ts`

- [ ] **Step 1: Update GET `/settings` select and response**

  Add `minimaxApiKey` to the `select` object and to the response JSON, using `user.minimaxApiKey ?? ''`.

- [ ] **Step 2: Update PATCH `/settings` destructuring, data mapping, and response**

  Destructure `minimaxApiKey` from `req.body`.
  Add:
  ```ts
  if (minimaxApiKey !== undefined) data.minimaxApiKey = minimaxApiKey || null;
  ```
  Add `minimaxApiKey` to the PATCH `select` and response JSON with `?? ''`.

- [ ] **Step 3: Verify server lint**

  Run:
  ```bash
  npm run lint:server
  ```
  Expected: no errors.

- [ ] **Step 4: Commit**

  ```bash
  git add server/src/routes/auth.ts
  git commit -m "feat(server): read/write minimaxApiKey in settings"
  ```

---

### Task 3: Add Minimax localStorage helpers

**Files:**
- Modify: `src/apps/drama/lib/imageGen.ts`

- [ ] **Step 1: Add getter and setter**

  After the existing Doubao helpers, add:
  ```ts
  export function getMinimaxApiKey(): string | null {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) return JSON.parse(raw).minimaxApiKey ?? null;
    } catch { /* ignore */ }
    return null;
  }

  export function setMinimaxApiKey(key: string): void {
    const settings = getSettings();
    settings.minimaxApiKey = key;
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }
  ```

- [ ] **Step 2: Verify frontend lint**

  Run:
  ```bash
  npm run lint
  ```
  Expected: no errors.

- [ ] **Step 3: Commit**

  ```bash
  git add src/apps/drama/lib/imageGen.ts
  git commit -m "feat(image-gen): add minimax api key localStorage helpers"
  ```

---

### Task 4: Update `UserSettings` type

**Files:**
- Modify: `src/apps/console/lib/consoleApi.ts`

- [ ] **Step 1: Add field to interface**

  ```ts
  export interface UserSettings {
    openaiApiKey: string;
    doubaoApiKey: string;
    minimaxApiKey: string;
    llmProvider: string;
    llmApiKey: string;
    llmBaseUrl: string;
    llmModel: string;
  }
  ```

- [ ] **Step 2: Verify lint**

  Run:
  ```bash
  npm run lint
  ```
  Expected: no errors.

- [ ] **Step 3: Commit**

  ```bash
  git add src/apps/console/lib/consoleApi.ts
  git commit -m "feat(console-api): add minimaxApiKey to UserSettings type"
  ```

---

### Task 5: Sync all multimodal keys including empty values

**Files:**
- Modify: `src/apps/console/lib/syncSettings.ts`

- [ ] **Step 1: Import new helper**

  ```ts
  import { setApiKey, setDoubaoApiKey, setMinimaxApiKey } from '@drama/lib/imageGen';
  ```

- [ ] **Step 2: Rewrite sync to always overwrite local values**

  Replace the three key sync blocks with:
  ```ts
  setApiKey(server.openaiApiKey ?? '');
  setDoubaoApiKey(server.doubaoApiKey ?? '');
  setMinimaxApiKey(server.minimaxApiKey ?? '');
  ```

  Server returns empty string for cleared keys (`?? ''` in auth.ts), so this writes empty strings to localStorage when the user clears a key.

- [ ] **Step 3: Verify lint**

  Run:
  ```bash
  npm run lint
  ```
  Expected: no errors.

- [ ] **Step 4: Commit**

  ```bash
  git add src/apps/console/lib/syncSettings.ts
  git commit -m "feat(sync): sync minimax key and support clearing keys"
  ```

---

### Task 6: Update i18n copy

**Files:**
- Modify: `src/shared/i18n/locales/zh-CN.json`
- Modify: `src/shared/i18n/locales/en.json`

- [ ] **Step 1: Update Chinese copy**

  Replace the `console.integrations` object with:
  ```json
  "integrations": {
    "title": "集成 / API",
    "description": "管理第三方 API Key 和本地集成设置",
    "save": "保存",
    "saved": "已保存",
    "saveError": "保存失败，请重试",
    "languageModelTitle": "语言模型",
    "languageModelDescription": "用于 Copilot 对话和 Agent 工具调用",
    "multimodalTitle": "多模态生成",
    "multimodalDescription": "用于图片、图生图、风格迁移和视频生成",
    "openaiKey": "OpenAI API Key",
    "openaiHint": "用于 DALL·E 图片生成",
    "doubaoKey": "豆包 / 火山方舟 API Key",
    "doubaoHint": "用于豆包图片生成、图生图、风格迁移和视频生成",
    "minimaxKey": "Minimax API Key",
    "minimaxHint": "预留，用于 Minimax 视频生成",
    "minimaxPlaceholder": "即将支持",
    "llmProvider": "Provider",
    "llmApiKey": "API Key",
    "llmBaseUrl": "Base URL",
    "llmBaseUrlHint": "已根据 Provider 预设，通常无需修改",
    "llmModel": "模型",
    "saveLanguageModel": "保存语言模型设置",
    "saveMultimodal": "保存多模态 Key",
    "providers": {
      "doubao": "豆包",
      "minimax": "Minimax",
      "deepseek": "DeepSeek",
      "openai": "OpenAI"
    }
  }
  ```

- [ ] **Step 2: Update English copy**

  Replace the `console.integrations` object with:
  ```json
  "integrations": {
    "title": "Integrations / API",
    "description": "Manage third-party API keys and local integration settings",
    "save": "Save",
    "saved": "Saved",
    "saveError": "Save failed, please try again",
    "languageModelTitle": "Language Model",
    "languageModelDescription": "Used for Copilot chat and Agent tool calls",
    "multimodalTitle": "Multimodal Generation",
    "multimodalDescription": "Used for images, image-to-image, style transfer and video",
    "openaiKey": "OpenAI API Key",
    "openaiHint": "Used for DALL·E image generation",
    "doubaoKey": "Doubao / Volcengine Ark API Key",
    "doubaoHint": "Used for Doubao image generation, image-to-image, style transfer and video",
    "minimaxKey": "Minimax API Key",
    "minimaxHint": "Reserved for Minimax video generation",
    "minimaxPlaceholder": "Coming soon",
    "llmProvider": "Provider",
    "llmApiKey": "API Key",
    "llmBaseUrl": "Base URL",
    "llmBaseUrlHint": "Pre-filled for the selected provider; usually no need to change",
    "llmModel": "Model",
    "saveLanguageModel": "Save Language Model Settings",
    "saveMultimodal": "Save Multimodal Keys",
    "providers": {
      "doubao": "Doubao",
      "minimax": "Minimax",
      "deepseek": "DeepSeek",
      "openai": "OpenAI"
    }
  }
  ```

- [ ] **Step 3: Verify lint**

  Run:
  ```bash
  npm run lint
  ```
  Expected: no errors.

- [ ] **Step 4: Commit**

  ```bash
  git add src/shared/i18n/locales/zh-CN.json src/shared/i18n/locales/en.json
  git commit -m "feat(i18n): add grouped integrations copy and minimax strings"
  ```

---

### Task 7: Reorganize `IntegrationsSection.tsx`

**Files:**
- Modify: `src/apps/console/components/integrations/IntegrationsSection.tsx`

- [ ] **Step 1: Update imports**

  Keep `useEffect`, `useState`, `useTranslation`, `Button`, `Input`.
  Import helpers:
  ```ts
  import { getSettings } from '@drama/lib/imageGen';
  import { getLLMSettings, setLLMSettings, LLM_PROVIDERS, LLM_PROVIDER_DEFAULTS, type LLMProviderType } from '@console/lib/llmSettings';
  import { fetchSettings, updateSettings } from '@console/lib/consoleApi';
  import { syncUserSettings } from '@console/lib/syncSettings';
  ```

- [ ] **Step 2: Replace local state and load effect**

  State:
  ```ts
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
  const [status, setStatus] = useState<'idle' | 'loading'>('idle'); // loading while fetching server settings; fall back to localStorage on failure
  ```

  Load effect:
  ```ts
  useEffect(() => {
    setStatus('loading');
    fetchSettings().then(async (server) => {
      if (server) {
        await syncUserSettings();

        const local = getSettings();
        setOpenaiKey(local.openaiApiKey ?? '');
        setDoubaoKey(local.doubaoApiKey ?? '');
        setMinimaxKey(local.minimaxApiKey ?? '');

        const provider = normalizeProvider(server.llmProvider);
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
      setStatus('idle');
    });
  }, []);
  ```

  Helper for feedback (per-section):
  ```ts
  const showSaved = (setter: (v: boolean) => void) => {
    setter(true);
    setTimeout(() => setter(false), 2000);
  };
  ```

  Provider change handler:
  ```ts
  const handleProviderChange = (provider: LLMProviderType) => {
    setLlmProvider(provider);
    setLlmBaseUrl(LLM_PROVIDER_DEFAULTS[provider].baseUrl);
    setLlmModel(LLM_PROVIDER_DEFAULTS[provider].model);
  };
  ```

- [ ] **Step 3: Replace save handlers**

  Language model save:
  ```ts
  const handleSaveLanguageModel = async () => {
    const provider = llmProvider;
    const settings = {
      provider,
      apiKey: llmApiKey.trim(),
      baseUrl: llmBaseUrl.trim() || LLM_PROVIDER_DEFAULTS[provider].baseUrl,
      model: llmModel.trim() || LLM_PROVIDER_DEFAULTS[provider].model,
    };
    setLLMSettings(settings);
    const result = await updateSettings({
      llmProvider: settings.provider,
      llmApiKey: settings.apiKey,
      llmBaseUrl: settings.baseUrl,
      llmModel: settings.model,
    });
    if (result.success) {
      showSaved(setLanguageSaved);
    } else {
      setLanguageError(true);
      setTimeout(() => setLanguageError(false), 2000);
    }
  };
  ```

  Multimodal save:
  ```ts
  const handleSaveMultimodal = async () => {
    const settings = {
      openaiApiKey: openaiKey.trim(),
      doubaoApiKey: doubaoKey.trim(),
      minimaxApiKey: minimaxKey.trim(),
    };
    const result = await updateSettings(settings);
    if (result.success) {
      showSaved(setMultimodalSaved);
    } else {
      setMultimodalError(true);
      setTimeout(() => setMultimodalError(false), 2000);
    }
  };
  ```

  Note: do not manually call `setApiKey` / `setDoubaoApiKey` / `setMinimaxApiKey` here. `syncUserSettings()` (or the next page load) will persist server values to localStorage.

- [ ] **Step 4: Rewrite JSX into two sections**

  Replace the entire section content with:
  1. Page header (title + description)
  2. **Language Model** section
     - Title + description
     - Provider buttons: each maps to `LLM_PROVIDERS`, uses `handleProviderChange(provider)` on click, and highlights the active provider
     - API Key input
     - Base URL input
     - Model input
     - Save button (`saveLanguageModel`)
     - `{languageSaved && <p className="text-xs text-green-500">{t('console.integrations.saved')}</p>}`
     - `{languageError && <p className="text-xs text-red-500">{t('console.integrations.saveError')}</p>}`
  3. **Multimodal Generation** section
     - Title + description
     - OpenAI key input
     - Doubao key input
     - Minimax key input (disabled, placeholder `minimaxPlaceholder`)
     - Save button (`saveMultimodal`)
     - `{multimodalSaved && <p className="text-xs text-green-500">{t('console.integrations.saved')}</p>}`
     - `{multimodalError && <p className="text-xs text-red-500">{t('console.integrations.saveError')}</p>}`

  Remove old separate OpenAI save, Doubao save, and LLM save sections.

- [ ] **Step 5: Verify component renders and lint passes**

  Run:
  ```bash
  npm run lint
  ```
  Expected: no errors.

- [ ] **Step 6: Commit**

  ```bash
  git add src/apps/console/components/integrations/IntegrationsSection.tsx
  git commit -m "feat(console): reorganize integrations into language and multimodal sections"
  ```

---

### Task 8: Update `consoleApi.test.ts` mocks

**Files:**
- Modify: `src/apps/console/lib/consoleApi.test.ts`

- [ ] **Step 1: Add `minimaxApiKey` to mock objects**

  Update the `settings` and `updated` objects used in `fetchSettings` and `updateSettings` tests to include `minimaxApiKey: ''`.

- [ ] **Step 2: Run the test**

  Run:
  ```bash
  npm test -- src/apps/console/lib/consoleApi.test.ts
  ```
  Expected: PASS.

- [ ] **Step 3: Commit**

  ```bash
  git add src/apps/console/lib/consoleApi.test.ts
  git commit -m "test(console-api): include minimaxApiKey in settings mocks"
  ```

---

### Task 9: Final verification

- [ ] **Step 1: Run full test suite**

  Run:
  ```bash
  npm test
  ```
  Expected: all tests pass.

- [ ] **Step 2: Run frontend lint**

  Run:
  ```bash
  npm run lint
  ```
  Expected: no errors.

- [ ] **Step 3: Run server lint**

  Run:
  ```bash
  npm run lint:server
  ```
  Expected: no errors.

- [ ] **Step 4: Smoke check UI (dev server)**

  If dev server is running, open Console → Integrations and verify:
  - Two sections: "语言模型" and "多模态生成"
  - Provider buttons switch and auto-fill Base URL/Model
  - Minimax input is disabled with "即将支持" placeholder
  - Saving each section persists after refresh

- [ ] **Step 5: Final commit if any remaining changes**

  ```bash
  git status
  git add -A
  git commit -m "feat(integrations): capability-grouped settings with minimax placeholder"
  ```

---

## Notes

- Do not change the LLM provider enum (`doubao | minimax | deepseek | openai`); it was already updated in a previous commit.
- The Minimax input is disabled because no feature consumes it yet.
- Use per-section `saved`/`error` states so users know which section's save succeeded or failed.
