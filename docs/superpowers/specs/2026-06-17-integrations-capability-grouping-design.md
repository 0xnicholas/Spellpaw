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
- Minimax API Key（预留，用于后续 Minimax 视频生成；UI 标注“即将支持”）
- 保存按钮（三个 Key 一起保存）

保存语义：提交时把三个输入框的当前值（含空字符串）写入后端。空字符串在服务端存为 `null`，本地存为空字符串；这样用户可以清空某个 Key。

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

### Server API
`/api/auth/settings` GET/PATCH 增加 `minimaxApiKey` 字段。
`llmProvider` 合法值保持为 `doubao | minimax | deepseek | openai`。

### 前端改动

| 文件 | 改动 |
|------|------|
| `src/apps/console/components/integrations/IntegrationsSection.tsx` | 按新结构重组 UI |
| `src/apps/drama/lib/imageGen.ts` | 增加 `getMinimaxApiKey` / `setMinimaxApiKey` |
| `src/apps/console/lib/consoleApi.ts` | `UserSettings` 增加 `minimaxApiKey` |
| `src/apps/console/lib/syncSettings.ts` | 同步 `minimaxApiKey` 到 localStorage |
| `src/shared/i18n/locales/zh-CN.json` / `en.json` | 更新分组标题、说明、按钮文案 |

### i18n 新增/变更键

`console.integrations` 下：

| 键 | 中文 | 英文 |
|---|---|---|
| `languageModelTitle` | 语言模型 | Language Model |
| `languageModelDescription` | 用于 Copilot 对话和 Agent 工具调用 | Used for Copilot chat and Agent tool calls |
| `multimodalTitle` | 多模态生成 | Multimodal Generation |
| `multimodalDescription` | 用于图片、图生图、风格迁移和视频生成 | Used for images, image-to-image, style transfer and video |
| `openaiKey` | 保持不变（可调整说明为“用于 DALL·E 图片生成”） | 保持不变 |
| `doubaoKey` | 保持不变 | 保持不变 |
| `minimaxKey` | Minimax API Key | Minimax API Key |
| `minimaxHint` | 预留，用于 Minimax 视频生成 | Reserved for Minimax video generation |
| `saveMultimodal` | 保存多模态 Key | Save Multimodal Keys |

移除或替换旧键：`llmTitle` → `languageModelTitle`，`saveLlm` 可保留或改为 `saveLanguageModel`。

### 测试更新
- `src/apps/console/lib/consoleApi.test.ts`：mock settings 增加 `minimaxApiKey` 字段，确保断言对象包含新字段。
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
