# Integrations 页面按能力分组设计

## 背景
当前 Console → Integrations 页面把 OpenAI API Key、豆包 API Key 和“对话 LLM Provider”平铺列出，用户容易困惑：
- 为什么 OpenAI / 豆包出现两次？
- 视觉生成和对话 LLM 是什么关系？
- 后续接入 Minimax 视频等能力时，页面会进一步膨胀。

## 目标
把 Integrations 页面从“按品牌堆字段”重构为“按能力分组”，让配置意图清晰，并为后续多模态 provider 扩展留出结构。

## 设计

### 页面结构
页面仅保留两大区块：

#### 1. 语言模型（Language Model）
用于 Copilot 对话和 Agent 工具调用。

- Provider 切换：豆包 / Minimax / DeepSeek / OpenAI
- API Key
- Base URL（按 provider 预填默认值，允许修改）
- Model（按 provider 预填默认值，允许修改）
- 保存按钮

行为：切换 provider 时，Base URL 和 Model 自动更新为对应默认值；用户可覆盖。

#### 2. 多模态生成（Multimodal Generation）
用于图片、图生图、风格迁移、视频等视觉/媒体生成能力。

- OpenAI API Key（用于 DALL·E 图片生成）
- 豆包 / 火山方舟 API Key（用于豆包图片、图生图、风格迁移、视频生成）
- Minimax API Key（预留，用于后续 Minimax 视频生成）
  - 输入框 `disabled`，placeholder 显示 `console.integrations.minimaxPlaceholder`（“即将支持” / “Coming soon”）。
  - 字段仅用于收集和存储 Key，当前没有功能调用它。
- 保存按钮（三个 Key 一起保存）

保存语义：提交时对每个输入值做 `.trim()`，然后把当前值（含空字符串）写入后端。空字符串在服务端存为 `null`，本地存为空字符串；这样用户可以清空某个 Key。

### 数据模型

#### Prisma schema
在 `server/prisma/schema.prisma` 的 `User` 模型新增：

```prisma
minimaxApiKey String?
```

保留现有字段：`openaiApiKey`、`doubaoApiKey`、`llmProvider`、`llmApiKey`、`llmBaseUrl`、`llmModel`。

变更后需执行 Prisma migration：

```bash
cd server
npx prisma migrate dev --name add_minimax_api_key
npx prisma generate
```

或使用 `npx prisma db push` 在开发环境快速同步。

#### localStorage
`spellpaw_settings` 中新增 `minimaxApiKey` 字段，与 `openaiApiKey`、`doubaoApiKey` 一起同步。

加载策略：`IntegrationsSection` 应复用或对齐 `syncUserSettings()` 的逻辑：从服务端拉取三个多模态 Key，并始终写入 localStorage（包括空值），确保服务端清空后本地也被清空。`IntegrationsSection` 内部不再单独调用 `setDoubaoApiKey` 等局部方法，统一由 `syncUserSettings()` 处理。

### Server API
`/api/auth/settings` GET/PATCH 增加 `minimaxApiKey` 字段。

在 `server/src/routes/auth.ts` 中：
- GET `/settings` 的 `select` 和响应对象加入 `minimaxApiKey`，响应使用 `user.minimaxApiKey ?? ''`。
- PATCH `/settings` 的解构加入 `minimaxApiKey`，`data` 赋值使用 `data.minimaxApiKey = minimaxApiKey || null`，响应对象同样使用 `user.minimaxApiKey ?? ''`。
- `llmProvider` 合法值保持为 `doubao | minimax | deepseek | openai`。

示例 PATCH 逻辑片段：

```ts
const { openaiApiKey, doubaoApiKey, minimaxApiKey, llmProvider, llmApiKey, llmBaseUrl, llmModel } = req.body;
const data: Record<string, string | null> = {};
if (openaiApiKey !== undefined) data.openaiApiKey = openaiApiKey || null;
if (doubaoApiKey !== undefined) data.doubaoApiKey = doubaoApiKey || null;
if (minimaxApiKey !== undefined) data.minimaxApiKey = minimaxApiKey || null;
// ... existing LLM fields
```

### 前端改动

| 文件 | 改动 |
|------|------|
| `src/apps/console/components/integrations/IntegrationsSection.tsx` | 按新结构重组 UI；移除手写的局部 Key 同步，统一依赖 `syncUserSettings()` |
| `src/apps/drama/lib/imageGen.ts` | 增加 `getMinimaxApiKey` / `setMinimaxApiKey` |
| `src/apps/console/lib/consoleApi.ts` | `UserSettings` 增加 `minimaxApiKey` |
| `src/apps/console/lib/syncSettings.ts` | 同步三个多模态 Key 到 localStorage，支持空值覆盖 |
| `src/shared/i18n/locales/zh-CN.json` / `en.json` | 更新分组标题、说明、按钮文案 |

### i18n 键变更清单

`console.integrations` 下：

**新增**
| 键 | 中文 | 英文 |
|---|---|---|
| `languageModelTitle` | 语言模型 | Language Model |
| `languageModelDescription` | 用于 Copilot 对话和 Agent 工具调用 | Used for Copilot chat and Agent tool calls |
| `multimodalTitle` | 多模态生成 | Multimodal Generation |
| `multimodalDescription` | 用于图片、图生图、风格迁移和视频生成 | Used for images, image-to-image, style transfer and video |
| `minimaxKey` | Minimax API Key | Minimax API Key |
| `minimaxHint` | 预留，用于 Minimax 视频生成 | Reserved for Minimax video generation |
| `minimaxPlaceholder` | 即将支持 | Coming soon |
| `saveLanguageModel` | 保存语言模型设置 | Save Language Model Settings |
| `saveMultimodal` | 保存多模态 Key | Save Multimodal Keys |

**保留并复用（文案不变）**
- `llmProvider`、`llmApiKey`、`llmBaseUrl`、`llmModel`：语言模型区块的表单标签。
- `save`：通用“保存”文案，可用于多模态保存按钮（若希望按钮文案统一），也可被 `saveMultimodal` 替代。

**保留并修改文案**
- `openaiHint`：从“用于 AI 分镜图生成”改为“用于 DALL·E 图片生成”。
- `doubaoHint`：文案不变（已覆盖图片/图生图/风格迁移/视频）。
- `llmBaseUrlHint`：从“OpenAI 兼容接口地址...”改为“已根据 Provider 预设，通常无需修改”。

**移除/替换**
- `llmTitle` → 替换为 `languageModelTitle`
- `saveLlm` → 替换为 `saveLanguageModel`
- `customProvider` → 不再使用

### 测试更新
- `src/apps/console/lib/consoleApi.test.ts`：`fetchSettings` 和 `updateSettings` 的 mock settings 必须包含完整字段：`openaiApiKey`、`doubaoApiKey`、`minimaxApiKey`、`llmProvider`、`llmApiKey`、`llmBaseUrl`、`llmModel`。
- 新增或更新 `IntegrationsSection` 相关测试（如项目已有）：验证 provider 切换时默认值正确填充、保存时调用 `updateSettings` 包含正确字段。

### 默认配置
语言模型 provider 默认值保持 `deepseek`，各 provider 默认值沿用 `LLM_PROVIDER_DEFAULTS`：
- doubao: `https://ark.cn-beijing.volces.com/api/v3`, `doubao-pro-32k`
- minimax: `https://api.minimax.chat/v1`, `abab6.5s-chat`
- deepseek: `https://api.deepseek.com/v1`, `deepseek-chat`
- openai: `https://api.openai.com/v1`, `gpt-4o-mini`

### 验证
- `npm test` 通过
- `npm run lint` 通过
- `npm run lint:server` 通过
- UI 切换 provider 自动填充默认值；保存刷新后状态正确

## 决策记录
- Key 分开存储：语言模型 Key 和多模态 Key 即使同品牌也分开，避免不同服务/额度混用。
- Minimax 先占位：当前没有实际调用 Minimax 的功能，但提前暴露输入框和存储字段，为后续视频生成接入做准备；UI 需标注“即将支持”，避免用户误以为已可生成视频。
- 多模态 Key 一起保存：为减少保存按钮数量，三个 Key 放在一个表单里统一保存。
