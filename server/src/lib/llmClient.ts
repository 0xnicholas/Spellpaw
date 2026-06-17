/**
 * LLM Client — OpenAI-compatible chat completions with streaming.
 *
 * Configured via environment variables:
 *   LLM_API_KEY   required
 *   LLM_BASE_URL  optional, defaults to OpenAI
 *   LLM_MODEL     optional, defaults to gpt-4o-mini
 */

export interface ToolConfig {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_calls?: Array<{
    id: string;
    type: 'function';
    function: { name: string; arguments: string };
  }>;
  tool_call_id?: string;
}

export type SSEvent =
  | { type: 'message_start' }
  | { type: 'text_delta'; delta: string }
  | { type: 'tool_call_started'; call_id: string; name: string }
  | { type: 'tool_call_done'; call_id: string }
  | { type: 'turn_end'; stop_reason: string }
  | { type: 'error'; message: string };

export interface ChatOptions {
  model?: string;
  messages: LLMMessage[];
  tools?: ToolConfig[];
  temperature?: number;
  max_tokens?: number;
}

function toOpenAITools(tools: ToolConfig[] = []): Array<{
  type: 'function';
  function: { name: string; description: string; parameters: Record<string, unknown> };
}> {
  return tools.map((t) => ({
    type: 'function' as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    },
  }));
}

const SUPPORTED_PROVIDERS = ['doubao', 'minimax', 'deepseek', 'openai'] as const;
type SupportedProvider = typeof SUPPORTED_PROVIDERS[number];

const PROVIDER_DEFAULTS: Record<SupportedProvider, { baseUrl: string; model: string }> = {
  doubao: { baseUrl: 'https://ark.cn-beijing.volces.com/api/v3', model: 'doubao-pro-32k' },
  minimax: { baseUrl: 'https://api.minimax.chat/v1', model: 'abab6.5s-chat' },
  deepseek: { baseUrl: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
  openai: { baseUrl: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
};

function isSupportedProvider(value: unknown): value is SupportedProvider {
  return typeof value === 'string' && (SUPPORTED_PROVIDERS as readonly string[]).includes(value);
}

export interface StreamChatContext {
  provider?: string;
  apiKey?: string;
  baseUrl?: string;
  model?: string;
}

export async function* streamChat(
  options: ChatOptions,
  context: StreamChatContext = {}
): AsyncGenerator<SSEvent, void, unknown> {
  const providerName = isSupportedProvider(context.provider) ? context.provider : 'deepseek';
  const defaults = PROVIDER_DEFAULTS[providerName];

  const apiKey = context.apiKey || process.env.LLM_API_KEY;
  const baseUrl = context.baseUrl || process.env.LLM_BASE_URL || defaults.baseUrl;
  const model = context.model || options.model || process.env.LLM_MODEL || defaults.model;

  if (!apiKey) {
    yield { type: 'error', message: 'LLM_API_KEY not configured' };
    return;
  }

  // Use the caller's messages array as the conversation state so that
  // assistant/tool turns are persisted for future user messages.
  const messages = options.messages;
  const tools = options.tools && options.tools.length > 0 ? options.tools : undefined;
  const maxIterations = 5;

  console.log(`[llmClient] streamChat start: model=${model}, tools=${tools?.length ?? 0}, messages=${messages.length}`);

  yield { type: 'message_start' };

  for (let iteration = 0; iteration < maxIterations; iteration++) {
    console.log(`[llmClient] LLM iteration ${iteration + 1}/${maxIterations}`);
    const body: Record<string, unknown> = {
      model,
      messages,
      stream: true,
      stream_options: { include_usage: false },
    };

    if (tools) {
      body.tools = toOpenAITools(tools);
      body.tool_choice = 'auto';
    }

    if (options.temperature !== undefined) body.temperature = options.temperature;
    if (options.max_tokens !== undefined) body.max_tokens = options.max_tokens;

    let res: Response;
    try {
      res = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
    } catch (err) {
      yield { type: 'error', message: `LLM request error: ${(err as Error).message}` };
      return;
    }

    if (!res.ok || !res.body) {
      const text = await res.text().catch(() => 'unknown error');
      console.error(`[llmClient] LLM request failed: ${res.status} ${text}`);
      yield { type: 'error', message: `LLM request failed: ${res.status} ${text}` };
      return;
    }

    console.log('[llmClient] LLM response streaming');

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let assistantText = '';
    let pendingToolCalls: Array<{ id: string; name: string; args: string; index: number }> | null = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (!line.trim() || line === 'data: [DONE]') continue;
        if (!line.startsWith('data: ')) continue;

        try {
          const data = JSON.parse(line.slice(6));
          const delta = data.choices?.[0]?.delta;
          if (!delta) continue;

          if (delta.content) {
            assistantText += delta.content;
            yield { type: 'text_delta', delta: delta.content };
          }

          if (delta.tool_calls) {
            // Accumulate tool call deltas (OpenAI streams them as array fragments)
            if (!pendingToolCalls) pendingToolCalls = [];
            for (const tc of delta.tool_calls) {
              const idx = typeof tc.index === 'number' ? tc.index : pendingToolCalls.length;
              const existing = pendingToolCalls[idx];
              if (existing) {
                if (tc.id) existing.id += tc.id;
                if (tc.function?.name) existing.name += tc.function.name;
                if (tc.function?.arguments) existing.args += tc.function.arguments;
              } else {
                pendingToolCalls[idx] = {
                  id: tc.id || '',
                  name: tc.function?.name || '',
                  args: tc.function?.arguments || '',
                  index: idx,
                };
              }
            }
          }
        } catch {
          // skip malformed lines
        }
      }
    }

    if (!pendingToolCalls || pendingToolCalls.length === 0) {
      // No tool calls: this assistant turn is final.
      messages.push({ role: 'assistant', content: assistantText });
      break;
    }

    // Reconstruct the tool_calls array for the assistant message.
    const toolCalls = pendingToolCalls
      .filter((tc) => tc.name)
      .map((tc) => ({
        id: tc.id || `${tc.name}_${Date.now()}_${tc.index}`,
        type: 'function' as const,
        function: { name: tc.name, arguments: tc.args || '{}' },
      }));

    messages.push({ role: 'assistant', content: assistantText, tool_calls: toolCalls });
    console.log(`[llmClient] assistant requested ${toolCalls.length} tool call(s):`, toolCalls.map((tc) => tc.function.name));

    // Execute each tool call and append tool-role messages for the next LLM turn.
    for (const tc of toolCalls) {
      yield { type: 'tool_call_started', call_id: tc.id, name: tc.function.name };
      console.log(`[llmClient] executing tool ${tc.function.name} -> ${resolveToolEndpoint(tc.function.name)}`);

      let resultText: string;
      let isError = false;
      try {
        const toolEndpoint = resolveToolEndpoint(tc.function.name);
        resultText = await callToolEndpoint(toolEndpoint, tc.function.name, tc.function.arguments, tc.id);
        console.log(`[llmClient] tool ${tc.function.name} result:`, resultText.slice(0, 120));
        yield { type: 'text_delta', delta: `\n\n[Tool result: ${resultText}]\n\n` };
      } catch (err) {
        resultText = (err as Error).message;
        isError = true;
        console.error(`[llmClient] tool ${tc.function.name} error:`, resultText);
        yield { type: 'text_delta', delta: `\n\n[Tool error: ${resultText}]\n\n` };
      }

      yield { type: 'tool_call_done', call_id: tc.id };
      messages.push({ role: 'tool', content: resultText, tool_call_id: tc.id });

      // Surface tool errors to the front-end as text so the model can react.
      if (isError) {
        yield { type: 'text_delta', delta: `\n\n（工具调用失败：${resultText}）\n\n` };
      }
    }

    // Loop back to call the LLM again with the tool results.
  }

  yield { type: 'turn_end', stop_reason: 'end_turn' };
}

function resolveToolEndpoint(toolName: string): string {
  // Default to front-end Tool Server when running via SpellPaw Server.
  // Tool configs are hard-coded here to avoid duplicating the front-end schema.
  const toolEndpoint = process.env.TOOL_SERVER_ENDPOINT || 'http://127.0.0.1.nip.io:5173/tool';
  const toolEndpointMap: Record<string, string> = {
    spellpaw_add_node: toolEndpoint,
    spellpaw_update_node: toolEndpoint,
    spellpaw_delete_node: toolEndpoint,
    spellpaw_get_tree: toolEndpoint,
    spellpaw_get_subtree: toolEndpoint,
    spellpaw_apply_template: toolEndpoint,
    spellpaw_generate_storyboard: toolEndpoint,
    spellpaw_generate_asset: toolEndpoint,
    spellpaw_generate_variants: toolEndpoint,
    spellpaw_edit_asset: toolEndpoint,
    spellpaw_apply_style: toolEndpoint,
    spellpaw_batch_apply_style: toolEndpoint,
    spellpaw_analyze_structure: toolEndpoint,
    spellpaw_get_pacing_report: toolEndpoint,
    spellpaw_match_template: toolEndpoint,
    spellpaw_optimize_pacing: toolEndpoint,
    spellpaw_build_ui: toolEndpoint,
    spellpaw_add_canvas_card: toolEndpoint,
    spellpaw_update_canvas_card: toolEndpoint,
    spellpaw_delete_canvas_card: toolEndpoint,
    spellpaw_kickstart_project: toolEndpoint,
  };
  return toolEndpointMap[toolName] || toolEndpoint;
}

async function callToolEndpoint(endpoint: string, toolName: string, argsJson: string, toolCallId: string): Promise<string> {
  let params: Record<string, unknown>;
  try {
    params = argsJson ? JSON.parse(argsJson) : {};
  } catch {
    params = {};
  }

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'tool_call',
      callId: toolCallId,
      params: { action: toolName, ...params },
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => 'unknown error');
    throw new Error(`${res.status}: ${text}`);
  }

  const data = await res.json();
  if (data.is_error) throw new Error(data.content?.[0]?.text || 'tool error');
  return data.content?.[0]?.text || '';
}
