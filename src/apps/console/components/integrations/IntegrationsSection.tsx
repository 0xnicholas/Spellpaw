/**
 * Console Integrations page — Phase 4 capability-grouped.
 *
 * Three independent blocks (TEXT / IMAGE / VIDEO), each with its own
 * provider pill row + API Key + Base URL + Model fields. Each block
 * saves independently via PATCH /api/auth/settings with
 * { llmConfigs: { [capability]: ModelConfig } }.
 *
 * i18n: skipped per user request — strings hardcoded in Chinese.
 */

import { useEffect, useState } from 'react';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { cn } from '@/shared/lib/utils';
import {
  isValidLLMProvider,
  LLM_PROVIDER_REGISTRY,
  providersForCapability,
  type Capability,
  type LLMProviderType,
  type ModelConfig,
} from '@shared/lib/providers';
import { fetchSettings, updateSettings, type LlmConfigs } from '@console/lib/consoleApi';
import { syncUserSettings } from '@console/lib/syncSettings';

const CAPABILITY_META: Record<Capability, { title: string; description: string }> = {
  text: { title: '文本生成', description: '用于 Copilot 对话和 Agent 工具调用' },
  image: { title: '图片生成', description: '用于图片、图生图、风格迁移' },
  video: { title: '视频生成', description: '用于文生视频和图生视频' },
};

const PROVIDER_LABELS: Record<LLMProviderType, string> = {
  doubao: '豆包',
  openai: 'OpenAI',
  deepseek: 'DeepSeek',
  minimax: 'Minimax',
  siliconflow: '硅基流动',
};

function emptyConfig(capability: Capability, provider: LLMProviderType): ModelConfig {
  const cfg = LLM_PROVIDER_REGISTRY[provider];
  return {
    provider,
    apiKey: '',
    baseUrl: cfg.baseUrl,
    model: cfg.recommended[capability] ?? cfg.model,
  };
}

function deriveDefault(capability: Capability): ModelConfig {
  return emptyConfig(capability, capability === 'text' ? 'deepseek' : 'doubao');
}

export function IntegrationsSection() {
  const [llmConfigs, setLlmConfigs] = useState<LlmConfigs>({});
  const [saved, setSaved] = useState<Record<Capability, boolean>>({ text: false, image: false, video: false });
  const [errors, setErrors] = useState<Record<Capability, boolean>>({ text: false, image: false, video: false });
  const [saving, setSaving] = useState<Record<Capability, boolean>>({ text: false, image: false, video: false });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchSettings()
      .then(async (server) => {
        if (server) {
          await syncUserSettings(server);
        }
        const fresh: LlmConfigs = {};
        for (const cap of ['text', 'image', 'video'] as Capability[]) {
          const incoming = server?.llmConfigs?.[cap];
          if (incoming && isValidLLMProvider(incoming.provider)) {
            const cfg = LLM_PROVIDER_REGISTRY[incoming.provider];
            fresh[cap] = {
              provider: incoming.provider,
              apiKey: incoming.apiKey ?? '',
              baseUrl: incoming.baseUrl || cfg.baseUrl,
              model: incoming.model || cfg.recommended[cap] || cfg.model,
            };
          } else {
            fresh[cap] = deriveDefault(cap);
          }
        }
        setLlmConfigs(fresh);
      })
      .finally(() => setLoading(false));
  }, []);

  function updateCap(capability: Capability, patch: Partial<ModelConfig>) {
    setLlmConfigs((prev) => ({
      ...prev,
      [capability]: { ...(prev[capability] ?? emptyConfig(capability, 'deepseek')), ...patch },
    }));
  }

  function changeProvider(capability: Capability, provider: LLMProviderType) {
    const cfg = LLM_PROVIDER_REGISTRY[provider];
    setLlmConfigs((prev) => {
      const cur = prev[capability] ?? emptyConfig(capability, provider);
      return {
        ...prev,
        [capability]: {
          ...cur,
          provider,
          baseUrl: cfg.baseUrl,
          model: cfg.recommended[capability] ?? cfg.model,
        },
      };
    });
  }

  async function saveCapability(capability: Capability) {
    const cfg = llmConfigs[capability];
    if (!cfg) return;
    setSaving((s) => ({ ...s, [capability]: true }));
    setErrors((e) => ({ ...e, [capability]: false }));
    setSaved((s) => ({ ...s, [capability]: false }));
    const result = await updateSettings({ llmConfigs: { [capability]: cfg } });
    setSaving((s) => ({ ...s, [capability]: false }));
    if (result.success) {
      setSaved((s) => ({ ...s, [capability]: true }));
      setTimeout(() => setSaved((s) => ({ ...s, [capability]: false })), 2000);
    } else {
      setErrors((e) => ({ ...e, [capability]: true }));
      setTimeout(() => setErrors((e) => ({ ...e, [capability]: false })), 2000);
    }
  }

  if (loading) {
    return <div className="text-sm text-[var(--color-text-muted)]">加载中…</div>;
  }

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-base font-semibold text-[var(--color-text-primary)]">API 集成</h3>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          管理第三方 API 密钥。每个能力（文本/图片/视频）独立配置 provider 和模型。
        </p>
      </div>

      {(['text', 'image', 'video'] as Capability[]).map((cap) => (
        <CapabilityCard
          key={cap}
          capability={cap}
          config={llmConfigs[cap]}
          saved={saved[cap]}
          error={errors[cap]}
          saving={saving[cap]}
          onChange={(patch) => updateCap(cap, patch)}
          onChangeProvider={(p) => changeProvider(cap, p)}
          onSave={() => saveCapability(cap)}
        />
      ))}
    </div>
  );
}

interface CapabilityCardProps {
  capability: Capability;
  config: ModelConfig | undefined;
  saved: boolean;
  error: boolean;
  saving: boolean;
  onChange: (patch: Partial<ModelConfig>) => void;
  onChangeProvider: (provider: LLMProviderType) => void;
  onSave: () => void;
}

function CapabilityCard({
  capability,
  config,
  saved,
  error,
  saving,
  onChange,
  onChangeProvider,
  onSave,
}: CapabilityCardProps) {
  const meta = CAPABILITY_META[capability];
  const supportedProviders = providersForCapability(capability);
  const current = config ?? emptyConfig(capability, 'deepseek');
  const providerSupports = supportedProviders.includes(current.provider);

  return (
    <section
      className="rounded-[14px] border p-5"
      style={{
        background: 'var(--portal-bg-elevated)',
        borderColor: 'var(--portal-border)',
      }}
    >
      <header className="mb-3">
        <h4 className="text-sm font-semibold text-white">{meta.title}</h4>
        <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">{meta.description}</p>
      </header>

      {!providerSupports && (
        <div
          className="mb-3 rounded-md px-3 py-2 text-xs"
          style={{
            background: 'oklch(60% 0.18 60 / 0.12)',
            color: 'oklch(85% 0.15 60)',
            border: '1px solid oklch(60% 0.18 60 / 0.3)',
          }}
        >
          当前 provider "{PROVIDER_LABELS[current.provider]}" 不支持 {meta.title}，请选择其他 provider。
        </div>
      )}

      <div className="mb-3">
        <label className="mb-1.5 block text-[11px] font-medium text-[var(--color-text-secondary)]">Provider</label>
        <div className="flex flex-wrap gap-1.5">
          {supportedProviders.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => onChangeProvider(p)}
              className={cn(
                'rounded-full px-3 py-1 text-[11px] font-medium transition-all',
                current.provider === p
                  ? 'bg-white text-[oklch(15%_0.02_270)] shadow-sm'
                  : 'text-[var(--portal-text-muted)] hover:text-[var(--portal-accent)]',
              )}
              style={
                current.provider !== p
                  ? {
                      background: 'oklch(100% 0 0 / 0.04)',
                      border: '1px solid oklch(100% 0 0 / 0.08)',
                    }
                  : undefined
              }
            >
              {PROVIDER_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-3">
        <label className="mb-1.5 block text-[11px] font-medium text-[var(--color-text-secondary)]">API Key</label>
        <Input
          type="password"
          placeholder={LLM_PROVIDER_REGISTRY[current.provider].apiKeyPlaceholder}
          value={current.apiKey}
          onChange={(e) => onChange({ apiKey: e.target.value })}
          className="text-xs"
        />
      </div>

      <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-[11px] font-medium text-[var(--color-text-secondary)]">Base URL</label>
          <Input
            value={current.baseUrl}
            onChange={(e) => onChange({ baseUrl: e.target.value })}
            className="text-xs"
            placeholder="https://api.example.com/v1"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-[11px] font-medium text-[var(--color-text-secondary)]">Model</label>
          <Input
            value={current.model}
            onChange={(e) => onChange({ model: e.target.value })}
            className="text-xs"
            placeholder={
              LLM_PROVIDER_REGISTRY[current.provider].recommended[capability] ??
              LLM_PROVIDER_REGISTRY[current.provider].model
            }
          />
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <Button size="sm" disabled={saving} onClick={onSave}>
          {saving ? '保存中…' : '保存'}
        </Button>
        {saved && (
          <span className="text-xs" style={{ color: 'var(--portal-accent)' }}>
            ✓ 已保存
          </span>
        )}
        {error && (
          <span className="text-xs" style={{ color: 'oklch(70% 0.18 25)' }}>
            保存失败，请重试
          </span>
        )}
      </div>
    </section>
  );
}