# Console Integrations: Text / Image / Video 三类分组设计

## 背景

当前 Console → Integrations 页面（按 6-17 「按能力分组」设计实现）分两大区块：

- **Language Model**：Provider 选择 + API Key + Base URL + Model（4 个 LLM provider: doubao / minimax / deepseek / openai）
- **Multimodal Generation**：仅 API Key（3 个多模态 provider: openai / doubao / minimax）

局限：

1. **粒度不够细**：Image 和 Video 共用「Multimodal」卡，用户无法为两种能力分别指定 model/baseUrl。例如 doubao 的 image model (`doubao-seedream-5-0-lite`) 和 video model (`doubao-seedance-2-5`) 用同一个 API Key 但 baseUrl/model 不同，目前无法配置。
2. **Provider 视角和组织能力视角不匹配**：当前 multimodal 区块用「Provider 列表」视角（OpenAI / Doubao / Min...），未来 siliconflow 等更多 image provider 接入时，UI 进一步膨胀。
3. **Drama 端已经在用 siliconflow provider**，但 Console 端未暴露。
4. **扩展性差**：每加一个能力（如 audio），都要在 Multimodal 区块加 Key 字段。

## 目标

把 Integrations 页面从「Language Model + Multimodal」两块重构为 **Text / Image / Video** 三块，每块采用统一结构（Provider 选择 + API Key + Base URL + Model），让用户按"使用场景"配置，并暴露 siliconflow 等 image provider。

## 范围

**In scope**（本期）：

- Console Integrations UI 重构为三块
- 后端 schema、API、Provider Registry 改造
- Image 区块新增 siliconflow provider
- localStorage schema 改造
- i18n 更新
- 相关测试更新

**Out of scope**（本期不做）：

- Drama 端 canvas toolkit provider 代码改动（仍读 `spellpaw_settings.openaiApiKey/doubaoApiKey/minimaxApiKey`）
- Drama 端调用 image/video 生成时读 Console 新配置的 `llmConfigs` 字段（下一期）
- 新增 audio / 3D / 其他能力

**已知接受限制**：

- 用户在 Image 区块配的 doubao key 与 drama 端 `spellpaw_settings.doubaoApiKey` 是**两份独立数据**。本期不打通。下一期做 sync。
- 同样，siliconflow 的 key 在 drama 端代码里有 `siliconflowApiKey` 字段读取，本期 Console 不动这个字段。

## 设计

### 1. 整体架构

| 层 | 改动 |
|----|------|
| **Prisma** | 删除 `User.llmProvider/llmApiKey/llmApiKeys/llmBaseUrl/llmModel`（drama 不读）。**保留** `User.openaiApiKey/doubaoApiKey/minimaxApiKey`（drama 在用）。新增 `User.llmConfigs: Json?`。生成 migration。 |
| **Server `auth.ts`** | `GET/PATCH /api/auth/settings` 改为读写 `llmConfigs`；GET 时从旧字段派生填充；PATCH 时不回写旧字段。 |
| **`src/shared/lib/providers.ts`** | 删除 `MULTIMODAL_PROVIDERS/REGISTRY`。每个 provider 加 `capabilities: ('text'\|'image'\|'video')[]` 和 `recommended: { text?, image?, video? }`。新增 siliconflow provider。 |
| **`src/apps/console/lib/llmSettings.ts`** | 重写为 3 份独立配置 + 旧 schema 迁移。 |
| **`src/apps/console/lib/consoleApi.ts`** | `UserSettings` 类型改为读 `llmConfigs`。 |
| **`src/apps/console/lib/syncSettings.ts`** | 简化：仍同步 `openaiApiKey/doubaoApiKey/minimaxApiKey` 到 `spellpaw_settings`（drama 用），不再同步 LLM 相关字段。 |
| **`src/apps/console/components/integrations/IntegrationsSection.tsx`** | 拆为三个并列 `CapabilitySection` 子组件。 |
| **`src/apps/drama/lib/imageGen.ts`** | **本期不动**（drama 仍读 `spellpaw_settings` 三个 multimodal key）。 |
| **i18n** | 重写 `console.integrations.*` keys。 |
| **测试** | `providers.test.ts` / `llmSettings.test.ts` / `consoleApi.test.ts` / `IntegrationsSection.test.tsx` 全部更新。 |

### 2. 数据模型

#### 2.1 Prisma schema

`server/prisma/schema.prisma` 的 `User` model 变更：

```prisma
model User {
  // ... other fields
  
  // Multimodal keys (kept for drama app compatibility, do not touch in this phase)
  openaiApiKey   String?
  doubaoApiKey   String?
  minimaxApiKey  String?
  
  // NEW: capability-grouped model configs
  llmConfigs     Json?
  
  // REMOVED:
  // - llmProvider
  // - llmApiKey
  // - llmApiKeys
  // - llmBaseUrl
  // - llmModel
}
```

生成 migration：

```bash
cd server
npx prisma migrate dev --name replace_llm_fields_with_llm_configs
npx prisma generate
```

#### 2.2 `llmConfigs` JSON 结构

```typescript
type Capability = 'text' | 'image' | 'video';

interface ModelConfig {
  provider: string;   // 'doubao' | 'openai' | 'deepseek' | 'minimax' | 'siliconflow'
  apiKey:   string;
  baseUrl:  string;
  model:    string;
}

type LlmConfigs = {
  text:  ModelConfig;
  image: ModelConfig;
  video: ModelConfig;
};
```

存储示例：

```json
{
  "text":  { "provider": "deepseek", "apiKey": "sk-...", "baseUrl": "https://api.deepseek.com/v1", "model": "deepseek-v4-flash" },
  "image": { "provider": "doubao",   "apiKey": "ark-...", "baseUrl": "https://ark.cn-beijing.volces.com/api/v3", "model": "doubao-seedream-5-0-lite" },
  "video": { "provider": "doubao",   "apiKey": "ark-...", "baseUrl": "https://ark.cn-beijing.volces.com/api/v3", "model": "doubao-seedance-2-5" }
}
```

#### 2.3 Frontend `UserSettings` 类型

`src/apps/console/lib/consoleApi.ts`：

```typescript
export interface UserSettings {
  openaiApiKey:   string;   // drama 端需要，仍读
  doubaoApiKey:   string;   // drama 端需要，仍读
  minimaxApiKey:  string;   // drama 端需要，仍读
  llmConfigs:     LlmConfigs;  // 新结构
}
```

#### 2.4 Frontend `localStorage` 改造

`spellpaw_llm_settings` 改为：

```typescript
{
  text:  ModelConfig,
  image: ModelConfig,
  video: ModelConfig,
}
```

老的 `apiKeys` map（per-provider 共享 key）字段**移除**。每个能力独立配自己的 key，provider 跨能力共享 key 的需求不再存在。

### 3. Provider Registry 改造

**文件**：`src/shared/lib/providers.ts`

**删除**：

- `MULTIMODAL_PROVIDERS` 常量
- `MULTIMODAL_PROVIDER_REGISTRY` 常量
- `MultimodalProviderType` 类型

**改造**：

```typescript
export const LLM_PROVIDERS = ['doubao', 'minimax', 'deepseek', 'openai', 'siliconflow'] as const;
export type LLMProviderType = (typeof LLM_PROVIDERS)[number];

export type Capability = 'text' | 'image' | 'video';

export interface LLMProviderConfig {
  baseUrl: string;
  model: string;                            // text 默认 model（向后兼容）
  apiKeyPlaceholder: string;
  models?: string[];                        // text 推荐 models
  capabilities: Capability[];               // 新增
  recommended: { [K in Capability]?: string };  // 新增
}

export const LLM_PROVIDER_REGISTRY: Record<LLMProviderType, LLMProviderConfig> = {
  doubao: {
    baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
    model: 'doubao-seed-2-0-pro',
    apiKeyPlaceholder: 'ark-...',
    models: ['doubao-seed-2-0-pro', 'doubao-seed-2-0-lite', 'doubao-seed-2-0-mini', 'doubao-seed-2-0-code'],
    capabilities: ['text', 'image', 'video'],
    recommended: {
      text: 'doubao-seed-2-0-pro',
      image: 'doubao-seedream-5-0-lite',
      video: 'doubao-seedance-2-5',
    },
  },
  openai: {
    baseUrl: 'https://api.openai.com/v1',
    model: 'gpt-5.5',
    apiKeyPlaceholder: 'sk-...',
    models: ['gpt-5.5', 'gpt-5.5-pro', 'gpt-5.5-instant'],
    capabilities: ['text', 'image'],
    recommended: { text: 'gpt-5.5', image: 'gpt-image-2' },
  },
  deepseek: {
    baseUrl: 'https://api.deepseek.com/v1',
    model: 'deepseek-v4-flash',
    apiKeyPlaceholder: 'sk-...',
    models: ['deepseek-v4-flash', 'deepseek-v4-pro'],
    capabilities: ['text'],
    recommended: { text: 'deepseek-v4-flash' },
  },
  minimax: {
    baseUrl: 'https://api.minimax.chat/v1',
    model: 'MiniMax-M3',
    apiKeyPlaceholder: 'eyJ...',
    models: ['MiniMax-M3', 'MiniMax-M2.7-highspeed', 'MiniMax-M2.5'],
    capabilities: ['text', 'video'],
    recommended: { text: 'MiniMax-M3' },
  },
  siliconflow: {
    baseUrl: 'https://api.siliconflow.cn/v1',
    model: 'black-forest-labs/FLUX.2-pro',
    apiKeyPlaceholder: 'sk-...',
    models: ['black-forest-labs/FLUX.2-pro', 'Qwen/Qwen-Image-Edit-2509'],
    capabilities: ['image'],
    recommended: { image: 'black-forest-labs/FLUX.2-pro' },
  },
};

export const DEFAULT_LLM_PROVIDER: LLMProviderType = 'deepseek';
```

**Backend `server/src/lib/providers.ts` 同步**：

- 同样增加 siliconflow
- 加 `SUPPORTED_CAPABILITIES` 常量
- 同步 `recommended` 字段（如果 backend 需要按 capability 提供 default）

### 4. 默认值

**首次打开 / `llmConfigs` 为空时填充：**

```typescript
function buildDefaultConfig(capability: Capability): ModelConfig {
  // 每个能力选一个最常用的 provider 作为默认
  const defaults: Record<Capability, LLMProviderType> = {
    text:  'deepseek',
    image: 'doubao',
    video: 'doubao',
  };
  const provider = defaults[capability];
  const config = LLM_PROVIDER_REGISTRY[provider];
  return {
    provider,
    apiKey: '',
    baseUrl: config.baseUrl,
    model: config.recommended[capability] ?? config.model,
  };
}
```

### 5. 旧数据迁移

读取时如果 `llmConfigs` 为空，从旧字段派生：

```typescript
function migrateFromLegacy(): LlmConfigs {
  // text: 旧 llmProvider + llmApiKey + llmApiKeys[provider] + llmBaseUrl + llmModel
  const oldProvider = localStorage.llmProvider ?? settings.llmProvider;
  const oldApiKey = localStorage.llmApiKey ?? '';
  const oldApiKeys = localStorage.llmApiKeys ?? {};
  const oldBaseUrl = localStorage.llmBaseUrl ?? '';
  const oldModel = localStorage.llmModel ?? '';
  
  const textProvider = isValidLLMProvider(oldProvider) ? oldProvider : DEFAULT_LLM_PROVIDER;
  const textKey = oldApiKeys[textProvider] ?? oldApiKey;
  const textConfig: ModelConfig = {
    provider: textProvider,
    apiKey: textKey,
    baseUrl: oldBaseUrl || LLM_PROVIDER_REGISTRY[textProvider].baseUrl,
    model: oldModel || LLM_PROVIDER_REGISTRY[textProvider].recommended.text ?? LLM_PROVIDER_REGISTRY[textProvider].model,
  };
  
  // image / video: 优先 doubao key，回退 openai / minimax
  const dramaKeys = {
    doubao: localStorage.doubaoApiKey ?? settings.doubaoApiKey ?? '',
    openai: localStorage.openaiApiKey ?? settings.openaiApiKey ?? '',
    minimax: localStorage.minimaxApiKey ?? settings.minimaxApiKey ?? '',
  };
  
  // image: doubao > openai > siliconflow
  let imageConfig: ModelConfig;
  if (dramaKeys.doubao) {
    imageConfig = { provider: 'doubao', apiKey: dramaKeys.doubao, baseUrl: LLM_PROVIDER_REGISTRY.doubao.baseUrl, model: LLM_PROVIDER_REGISTRY.doubao.recommended.image! };
  } else if (dramaKeys.openai) {
    imageConfig = { provider: 'openai', apiKey: dramaKeys.openai, baseUrl: LLM_PROVIDER_REGISTRY.openai.baseUrl, model: LLM_PROVIDER_REGISTRY.openai.recommended.image! };
  } else {
    imageConfig = buildDefaultConfig('image');  // provider=doubao, key=''
  }
  
  // video: doubao > minimax
  let videoConfig: ModelConfig;
  if (dramaKeys.doubao) {
    videoConfig = { provider: 'doubao', apiKey: dramaKeys.doubao, baseUrl: LLM_PROVIDER_REGISTRY.doubao.baseUrl, model: LLM_PROVIDER_REGISTRY.doubao.recommended.video! };
  } else if (dramaKeys.minimax) {
    videoConfig = { provider: 'minimax', apiKey: dramaKeys.minimax, baseUrl: LLM_PROVIDER_REGISTRY.minimax.baseUrl, model: LLM_PROVIDER_REGISTRY.minimax.recommended.video ?? 'minimax-video-1' };
  } else {
    videoConfig = buildDefaultConfig('video');
  }
  
  return { text: textConfig, image: imageConfig, video: videoConfig };
}
```

**写入语义**：只写 `llmConfigs`，不再回写旧 LLM 字段。`openaiApiKey/doubaoApiKey/minimaxApiKey` 仍保留并由 `syncSettings` 同步（drama 用）。

### 6. UI 设计

`IntegrationsSection` 改为三块并列结构：

```
┌─ Integrations / API ─────────────────────────────────┐
│  Manage third-party API keys...                       │
│                                                       │
│  ┌─ TEXT GENERATION ─────────────────────────────┐  │
│  │  Used for Copilot chat and Agent tool calls    │  │
│  │                                                │  │
│  │  Provider: [Doubao][DeepSeek][OpenAI][Minimax]│  │
│  │  API Key:  ••••••                              │  │
│  │  Base URL: https://api.deepseek.com/v1         │  │
│  │  Model:    [deepseek-v4-flash ▼]                │  │
│  │                                                │  │
│  │  [ Save ]  ✓ Saved                              │  │
│  └────────────────────────────────────────────────┘  │
│                                                       │
│  ┌─ IMAGE GENERATION ────────────────────────────┐  │
│  │  Used for image, image-to-image, style transfer│  │
│  │  [Doubao][OpenAI][SiliconFlow]                 │  │
│  │  API Key / Base URL / Model                    │  │
│  │  [ Save ]                                      │  │
│  └────────────────────────────────────────────────┘  │
│                                                       │
│  ┌─ VIDEO GENERATION ────────────────────────────┐  │
│  │  Used for text-to-video and image-to-video     │  │
│  │  [Doubao][Minimax]                             │  │
│  │  API Key / Base URL / Model                    │  │
│  │  [ Save ]                                      │  │
│  └────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────┘
```

**Component 结构**：

```
IntegrationsSection (外层)
  ├── <CapabilitySection capability="text" />  ← 3 个实例
  ├── <CapabilitySection capability="image" />
  └── <CapabilitySection capability="video" />
```

`CapabilitySection` props：

```typescript
interface CapabilitySectionProps {
  capability: Capability;
}
```

`CapabilitySection` 内部：

- 状态：`provider`, `apiKey`, `baseUrl`, `model`, `saved`, `error`, `saving`, `loading`
- Provider pill 列表：从 `LLM_PROVIDERS` 过滤 `provider.capabilities.includes(capability)` 得到
- 切换 provider 时自动重置 baseUrl/model 为该 provider 在该 capability 的 `recommended`
- 三个 save 按钮独立：每块单独保存

### 7. i18n 键

`console.integrations` 下：

**新增**：

| 键 | 中文 | 英文 |
|---|---|---|
| `textTitle` | 文本生成 | Text Generation |
| `textDescription` | 用于 Copilot 对话和 Agent 工具调用 | Used for Copilot chat and Agent tool calls |
| `imageTitle` | 图片生成 | Image Generation |
| `imageDescription` | 用于图片、图生图、风格迁移 | Used for image, image-to-image, style transfer |
| `videoTitle` | 视频生成 | Video Generation |
| `videoDescription` | 用于文生视频和图生视频 | Used for text-to-video and image-to-video |
| `saveText` | 保存文本生成设置 | Save Text Generation Settings |
| `saveImage` | 保存图片生成设置 | Save Image Generation Settings |
| `saveVideo` | 保存视频生成设置 | Save Video Generation Settings |

**保留**（复用为三区块表单标签）：

- `llmProvider` / `llmApiKey` / `llmBaseUrl` / `llmBaseUrlHint` / `llmModel` / `llmModelDefault` / `llmModelCustom`
- `save` / `saved` / `saveError`
- `providers.doubao` / `providers.minimax` / `providers.deepseek` / `providers.openai`
- `title` / `description`（页面顶部）

**新增 provider 标签**：

- `providers.siliconflow`: 硅基流动 / SiliconFlow

**移除**（已废弃）：

- `languageModelTitle` / `languageModelDescription` / `multimodalTitle` / `multimodalDescription`
- `openaiKey` / `openaiHint` / `openaiPlaceholder`
- `doubaoKey` / `doubaoHint` / `doubaoPlaceholder`
- `minimaxKey` / `minimaxHint` / `minimaxPlaceholder`
- `saveLanguageModel` / `saveMultimodal`

**注意**：当前 zh-CN.json 和 en.json 都需更新。

### 8. 错误处理

- **Provider 不支持当前 capability**（用户选过 siliconflow 在 text 视图，但 siliconflow 没有 `text` capability）→ 该 provider pill 不渲染在该区块。已保存的配置仍存在 `llmConfigs.text.provider = 'siliconflow'`，UI 警告"该 provider 不支持 text 能力"并提示重新选择。
- **API Key 为空** → 允许保存（标记为"未配置"），save 按钮不灰。drama 端后续会判定未配置而不能调用。
- **Server PATCH 失败** → 区块内显示红色 toast 文字"保存失败，请重试"，2 秒后消失。
- **旧 schema 解析失败** → 静默回退到默认 `buildDefaultConfig()`。
- **`llmConfigs` 字段为 null** → 视为"用户还没配过"，全部用默认。

### 9. 测试

| 文件 | 改动 |
|------|------|
| `src/shared/lib/providers.test.ts` | **重写**：断言 `LLM_PROVIDER_REGISTRY` 每个 provider 都有 `capabilities` 数组、`recommended` 对象；断言 `LLM_PROVIDERS` 包含 siliconflow；断言 `isValidLLMProvider('siliconflow')` 为 true。 |
| `src/apps/console/lib/llmSettings.test.ts` | **重写**：测试三份独立配置的 get/set；测试旧 schema 迁移（`llmProvider/llmApiKey/llmApiKeys/llmBaseUrl/llmModel` → `llmConfigs.text`）；测试缺失字段回退到 `buildDefaultConfig`；测试 drama 三 key → `llmConfigs.image/video` 派生。 |
| `src/apps/console/lib/consoleApi.test.ts` | **更新**：mock settings 改为 `{ openaiApiKey, doubaoApiKey, minimaxApiKey, llmConfigs: { text, image, video } }`；测试 GET/PATCH 往返。 |
| `src/apps/console/components/integrations/IntegrationsSection.test.tsx` | **重写**：测试三区块独立渲染、独立 provider 切换、独立保存（每个 save 调 `updateSettings({ llmConfigs: { ...partial } })`）；测试 provider pill 列表按 capability 过滤；测试 baseUrl/model 切换 provider 时自动 reset。 |
| `server/src/lib/providers.test.ts` | **更新**：断言 siliconflow 已注册。 |
| `server/src/routes/auth.test.ts`（如有）| **更新**：测试 `llmConfigs` 序列化/反序列化；测试旧字段缺失时返回默认 `llmConfigs`。 |

### 10. 执行顺序

1. **Prisma migration** — 加 `llmConfigs: Json?`，删 5 个旧字段
2. **Provider Registry 改造** — `src/shared/lib/providers.ts` + `server/src/lib/providers.ts`
3. **llmSettings 重写** — 新数据结构 + 旧 schema 迁移
4. **consoleApi UserSettings 更新** — 类型加 `llmConfigs`
5. **syncSettings 简化** — 不再同步 LLM 字段，只同步 drama 三 key
6. **IntegrationsSection 重构** — 拆为三块 `CapabilitySection`
7. **i18n 更新** — zh-CN.json + en.json
8. **测试更新** — 见上表
9. **验证** — `npm test` / `npm run lint` / `npm run lint:server` / `npm run build`

## 决策记录

- **三块而不是两块**：image / video 是不同能力，baseUrl/model 经常不同（如 doubao-seedream vs doubao-seedance），共用一个 form 容易配错。
- **Provider 在不同能力下完全独立**：用户在 Image 选 doubao、在 Video 选 doubao 的话，两个 doubao key 独立保存（apiKey 输入两次），互不影响。简化数据结构，避免 provider 跨能力共享 key 的复杂语义。
- **本期 drama 端不动**：drama 端仍读 `spellpaw_settings.openaiApiKey/doubaoApiKey/minimaxApiKey`。Console 配的 image/video 区块的 key 与 drama 读的是两份独立数据。用户配 image 区块后，drama 端生成图时仍读 drama 的老 key（这期不通）。这是已知限制，下期打通。
- **删旧 LLM 字段**：drama 不读 `llmProvider/llmApiKey/llmApiKeys/llmBaseUrl/llmModel`，删了不影响 drama 端功能。`openaiApiKey/doubaoApiKey/minimaxApiKey` drama 在用，必须保留。
- **新增 siliconflow**：drama 端 `canvasToolkit/providers/siliconflowProvider.ts` 已经在用，Console 一直未暴露。Image 区块一起补上。
- **localStorage 完全替换 schema**：老的 `apiKeys` per-provider 共享 map 不再需要。每个能力独立配自己的 key。

## 验证

- `npm test` 通过
- `npm run lint` 通过
- `npm run lint:server` 通过
- `npm run build` 通过
- 手动验证：
  1. 登录后进入 Console → Integrations，看到三块
  2. Text 区块选 DeepSeek → 输入 key → 保存 → 刷新页面 → 状态保持
  3. Image 区块切到 SiliconFlow → 输入 key → 保存 → 刷新 → 状态保持
  4. Video 区块切到 Minimax → 输入 key → 保存 → 刷新 → 状态保持
  5. 切回任意 provider → baseUrl/model 自动 reset
  6. 老用户（有 legacy `llmProvider/llmApiKey/llmApiKeys/llmBaseUrl/llmModel` 数据）首次进入页面，三块自动迁移正确

## 范围之外（下一期）

- Drama 端 `canvasToolkit/providers/*` 接收 `capability` 参数，从 `llmConfigs[capability]` 读 key/url/model
- 删除 `spellpaw_settings.openaiApiKey/doubaoApiKey/minimaxApiKey`，drama 端完全改读 `llmConfigs`
- Audio / 3D / 其他能力分类
