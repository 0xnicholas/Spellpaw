# ADR-013: 保证 Copilot 调用画布内容生成工具的架构设计

## 状态

- 状态：提案 / 待实现
- 日期：2026-06-16
- 作者：Kimi Code

## 背景

Spellpaw Copilot 通过 LLM 工具调用（function calling）来修改项目结构、生成画布卡片。当前问题：

1. LLM 有时会看完项目树（`get_tree`）后直接 `turn_end`，不继续调用生成工具。
2. 仅靠 system prompt 和 tool description 无法 100% 保证工具调用。
3. 用户期望「我说生成参考图，画布上就出现卡片」，这是一个高确定性的交互契约。

## 目标

在用户表达明确的生成/编辑/风格迁移意图时，**无论 LLM 是否主动调用工具，前端都能确保对应 toolkit action 被执行**，并把结果反馈给用户。

## 决策

采用**三层防御架构**：

```
┌─────────────────────────────────────────────────────────────┐
│  Layer 3: 客户端兜底 (Client Guardrail)                      │
│  一轮对话结束后，若 LLM 未调用工具但意图明确，                │
│  前端自动调用 toolRouter 完成动作。                           │
├─────────────────────────────────────────────────────────────┤
│  Layer 2: 后端工具约束 (Tool Choice Enforcement)             │
│  通过 provider 向 Spellpaw Server 发送 tool_choice 偏好，    │
│  让底层 LLM 优先/必须调用目标工具。                           │
├─────────────────────────────────────────────────────────────┤
│  Layer 1: 提示词 + 工具描述 (Prompt & Tool Schema)           │
│  system prompt 明确工作流，tool description 描述调用时机。   │
└─────────────────────────────────────────────────────────────┘
```

### Layer 1：提示词与工具描述（已有）

- `systemPrompt.ts` 已加入画布工具包段落。
- `toolConfigs.ts` 已为每个工具编写描述和参数 schema。
- 持续优化方向：减少 LLM 可选路径，让生成类意图只能走 toolkit。

### Layer 2：Tool Choice Enforcement

#### 2.1 设计

扩展 `LLMProvider` 接口，支持可选的 `toolChoice` 参数：

```ts
export type ToolChoice =
  | 'auto'
  | 'required'
  | { type: 'function'; function: { name: string } };

export interface LLMProvider {
  createSession(title, systemPrompt, tools, toolChoice?): Promise<Session>;
  sendMessage(sessionId, content, toolChoice?): Promise<void>;
  subscribeSSE(sessionId, onEvent): SSESubscription;
}
```

`spellpawProvider` 将 `toolChoice` 通过 HTTP header 透传给 Spellpaw Server：

```ts
if (toolChoice) {
  headers['X-LLM-Tool-Choice'] = JSON.stringify(toolChoice);
}
```

后端（Node.js）收到后，在调用底层 LLM 时设置对应的 `tool_choice`。如果后端暂未实现该 header，前端行为回退到 Layer 1 + Layer 3，不影响现有功能。

#### 2.2 使用时机

- 当 `IntentRouter` 识别出高置信度意图时，`useCopilotSSE` 在创建 session 或发送消息时传入对应的 `toolChoice`。
- 例如用户说「生成参考图」，传 `{ type: 'function', function: { name: 'spellpaw_generate_asset' } }`。
- 对于批量/风格类意图，同样映射到对应工具。

### Layer 3：Client Guardrail

#### 3.1 设计

新增 `src/apps/drama/lib/intentRouter.ts`：

```ts
export type CanvasIntent =
  | { type: 'generate_asset'; nodeId?: string; mediaType: 'image' | 'video'; prompt?: string }
  | { type: 'generate_variants'; nodeId?: string; cardId?: string }
  | { type: 'edit_asset'; cardId: string; prompt: string }
  | { type: 'apply_style'; sourceCardId: string; stylePrompt: string }
  | { type: 'batch_apply_style'; nodeIds: string[]; stylePrompt: string }
  | { type: 'unknown' };

export interface IntentResult {
  intent: CanvasIntent;
  confidence: 'high' | 'medium' | 'low';
}

export function detectIntent(message: string, context: IntentContext): IntentResult;
```

检测规则：

- 关键词 + 上下文（是否有选中节点/卡片）。
- 高置信度：明确出现「生成/画/来一张/参考图/分镜/视频/变体/编辑/风格/统一风格」等词，且有可用目标。
- 中/低置信度：意图模糊，交给 LLM 自由处理。

#### 3.2 Guardrail 流程

在 `useCopilotSSE` 中：

1. 发送消息前调用 `detectIntent`。
2. 若置信度为 `high`，计算目标 `toolChoice` 并传给 provider。
3. 订阅 SSE 时跟踪本轮是否发生了 `tool_call_started`。
4. 在 `turn_end` 时：
   - 若已调用工具 → 正常结束。
   - 若未调用工具且意图为 `high` → 自动调用 `toolRouter` 对应 action。
   - 调用成功后，把结果作为 agent 消息追加到聊天列表（或触发新一轮总结）。

#### 3.3 自动调用实现

`useCopilotSSE` 直接 import `toolRouter`，根据 intent type 调用：

```ts
await toolRouter[intent.type](intent.payload);
```

由于 `toolRouter` 返回字符串消息，Guardrail 把该字符串展示给用户：

```ts
appendMessage({
  id: crypto.randomUUID(),
  role: 'agent',
  content: result,
  type: 'action',
  timestamp: new Date().toISOString(),
});
```

## 数据流

```
用户输入
  │
  ▼
IntentRouter.detectIntent()
  │
  ├── 高置信度 ──► useCopilotSSE 传 toolChoice 给 LLM
  │                    │
  │                    ▼
  │              LLM 调用工具？
  │              ├─ 是 ──► 工具执行，结果返回
  │              └─ 否 ──► Client Guardrail 自动调用 toolRouter
  │                            │
  │                            ▼
  │                       结果展示给用户
  │
  └── 低置信度 ──► 正常 LLM 对话
```

## 影响范围

- 新增文件：
  - `src/apps/drama/lib/intentRouter.ts`
  - `src/apps/drama/lib/intentRouter.test.ts`
  - `docs/decisions/ADR-013-copilot-tool-guarantee.md`
- 修改文件：
  - `src/apps/drama/lib/llm/types.ts`
  - `src/apps/drama/lib/llm/spellpawProvider.ts`
  - `src/apps/drama/hooks/useCopilotSSE.ts`
  - `src/apps/drama/lib/systemPrompt.ts`（可选优化）

## 风险与缓解

| 风险 | 缓解 |
|------|------|
| 意图识别错误导致误操作 | 只处理高置信度；需要明确关键词 + 有效上下文 |
| 与 LLM 自己的工具调用重复 | Guardrail 检测到 `tool_call_started` 就跳过 |
| 后端不支持 tool_choice header | 透传 header 是可选的，不影响兜底 |
| 批量/风格类意图缺少目标节点 | Guardrail 只在有选中节点/卡片时触发 |

## 结论

采用**提示词 + tool_choice 约束 + 客户端兜底**三层架构，可以在不强制绑定某个 LLM 的前提下，最大化生成类意图的工具调用成功率。实现顺序：

1. 实现 `intentRouter` 和测试。
2. 扩展 `LLMProvider` / `spellpawProvider` 支持 `toolChoice`。
3. 在 `useCopilotSSE` 中接入 intent 检测和 guardrail。
4. 跑通测试、lint、build。
