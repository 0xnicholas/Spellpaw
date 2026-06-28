/**
 * Console Integrations page — Phase 4 final, per-Capability.
 *
 * One independent card per drama canvas Capability (text2image,
 * image2image, inpaint, text2video, image2video, styleTransfer). Each
 * card has its own provider pill row + API Key + Base URL + Model and
 * saves independently via PATCH /api/auth/settings.
 *
 * i18n: skipped per user request — strings hardcoded in Chinese.
 */

import { useEffect, useState } from 'react';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { ProviderSelect, type ProviderSelectOption } from '@/shared/components/ui/ProviderSelect';
import {
  isValidLLMProvider,
  LLM_PROVIDER_REGISTRY,
  type Capability,
  type LLMProviderType,
  type ModelConfig,
} from '@shared/lib/providers';
import { fetchSettings, updateSettings, type LlmConfigs } from '@console/lib/consoleApi';
import { syncUserSettings } from '@console/lib/syncSettings';

// Drama canvas toolkit's Capability union — must stay in sync with
// src/apps/drama/lib/canvasToolkit/types.ts. Listed explicitly here so
// the UI can group / title them.
const CAPABILITY_LIST: Capability[] = [
  'text2image',
  'image2image',
  'inpaint',
  'text2video',
  'image2video',
  'styleTransfer',
  'text2audio',
  'text2model',
  'image2model',
];

/** Map a drama Capability to the broad MediaCapability bucket used by
 *  LLM_PROVIDER_REGISTRY.capabilities. */
const CAPABILITY_TO_MEDIA: Record<Capability, 'text' | 'image' | 'video' | 'audio' | 'model3d'> = {
  text2image: 'image',
  image2image: 'image',
  inpaint: 'image',
  text2video: 'video',
  image2video: 'video',
  styleTransfer: 'image',
  text2audio: 'audio',
  text2model: 'model3d',
  image2model: 'model3d',
};

const CAPABILITY_META: Record<Capability, { title: string; description: string }> = {
  text2image: { title: '文生图 (text2image)', description: '纯文字 → 图片，drama 画布新建 art 卡片' },
  image2image: { title: '图生图 (image2image)', description: '参考图 + 提示词 → 修改后的图' },
  inpaint: { title: '局部重绘 (inpaint)', description: '在原图指定区域重绘' },
  text2video: { title: '文生视频 (text2video)', description: '纯文字 → 视频，drama 画布新建 videoClip 卡片' },
  image2video: { title: '图生视频 (image2video)', description: '参考图 + 提示词 → 视频' },
  styleTransfer: { title: '风格迁移 (styleTransfer)', description: '把风格应用到参考图上' },
  text2audio: { title: '文生音频 (text2audio)', description: '文字 → 语音 / 音乐（TTS / 配音）' },
  text2model: { title: '文生模型 (text2model)', description: '文字 → 3D 模型（即将支持）' },
  image2model: { title: '图生模型 (image2model)', description: '参考图 → 3D 模型（即将支持）' },
};

const CAPABILITY_DEFAULT_PROVIDER: Record<Capability, LLMProviderType> = {
  text2image: 'doubao',
  image2image: 'doubao',
  inpaint: 'doubao',
  text2video: 'doubao',
  image2video: 'doubao',
  styleTransfer: 'siliconflow',
  text2audio: 'openai',
  text2model: 'doubao',
  image2model: 'doubao',
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
  const media = CAPABILITY_TO_MEDIA[capability];
  return {
    provider,
    apiKey: '',
    baseUrl: cfg.baseUrl,
    model: cfg.recommended[media] ?? cfg.model,
  };
}

export function IntegrationsSection() {
  const [llmConfigs, setLlmConfigs] = useState<LlmConfigs>({});
  const [saved, setSaved] = useState<Record<Capability, boolean>>(
    Object.fromEntries(CAPABILITY_LIST.map((c) => [c, false])) as Record<Capability, boolean>,
  );
  const [errors, setErrors] = useState<Record<Capability, boolean>>(
    Object.fromEntries(CAPABILITY_LIST.map((c) => [c, false])) as Record<Capability, boolean>,
  );
  const [saving, setSaving] = useState<Record<Capability, boolean>>(
    Object.fromEntries(CAPABILITY_LIST.map((c) => [c, false])) as Record<Capability, boolean>,
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchSettings()
      .then(async (server) => {
        if (server) {
          await syncUserSettings(server);
        }
        const fresh: LlmConfigs = {};
        for (const cap of CAPABILITY_LIST) {
          const incoming = server?.llmConfigs?.[cap];
          if (incoming && isValidLLMProvider(incoming.provider)) {
            const cfg = LLM_PROVIDER_REGISTRY[incoming.provider];
            const media = CAPABILITY_TO_MEDIA[cap];
            fresh[cap] = {
              provider: incoming.provider,
              apiKey: incoming.apiKey ?? '',
              baseUrl: incoming.baseUrl || cfg.baseUrl,
              model: incoming.model || cfg.recommended[media] || cfg.model,
            };
          } else {
            fresh[cap] = emptyConfig(cap, CAPABILITY_DEFAULT_PROVIDER[cap]);
          }
        }
        setLlmConfigs(fresh);
      })
      .finally(() => setLoading(false));
  }, []);

  function updateCap(capability: Capability, patch: Partial<ModelConfig>) {
    setLlmConfigs((prev) => ({
      ...prev,
      [capability]: {
        ...(prev[capability] ?? emptyConfig(capability, CAPABILITY_DEFAULT_PROVIDER[capability])),
        ...patch,
      },
    }));
  }

  function changeProvider(capability: Capability, provider: LLMProviderType) {
    const cfg = LLM_PROVIDER_REGISTRY[provider];
    const media = CAPABILITY_TO_MEDIA[capability];
    setLlmConfigs((prev) => {
      const cur = prev[capability] ?? emptyConfig(capability, provider);
      return {
        ...prev,
        [capability]: {
          ...cur,
          provider,
          baseUrl: cfg.baseUrl,
          model: cfg.recommended[media] ?? cfg.model,
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
          管理第三方 API 密钥。每个能力（文生图 / 图生图 / 局部重绘 / 文生视频 / 图生视频 / 风格迁移 / 文生音频 / 文生模型 / 图生模型）独立配置 provider 和模型。
        </p>
      </div>

      {CAPABILITY_LIST.map((cap) => (
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
  // Providers that support this capability (text2image, image2image, …).
  // Each provider's `capabilities` array is filtered at the registry level.
  const supportedProviders = (Object.keys(LLM_PROVIDER_REGISTRY) as LLMProviderType[]).filter((p) =>
    LLM_PROVIDER_REGISTRY[p].capabilities.includes(CAPABILITY_TO_MEDIA[capability]),
  );
  const current = config ?? emptyConfig(capability, CAPABILITY_DEFAULT_PROVIDER[capability]);
  const providerSupports = supportedProviders.includes(current.provider);

  // If the chosen default isn't supported, fall back to the first supported
  // provider so the UI shows a usable default instead of an unreachable one.
  const effectiveProvider = providerSupports
    ? current.provider
    : (supportedProviders[0] ?? current.provider);
  const effectiveConfig: ModelConfig = providerSupports
    ? current
    : (() => {
        const fallback = LLM_PROVIDER_REGISTRY[effectiveProvider];
        const media = CAPABILITY_TO_MEDIA[capability];
        return {
          provider: effectiveProvider,
          apiKey: current.apiKey,
          baseUrl: fallback.baseUrl,
          model: fallback.recommended[media] ?? fallback.model,
        };
      })();

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
          当前 provider "{PROVIDER_LABELS[current.provider]}" 不支持 {meta.title}，已切换到 {PROVIDER_LABELS[effectiveProvider]}。
        </div>
      )}

      <div className="mb-3">
        <ProviderSelect<LLMProviderType>
          label="Provider"
          value={effectiveConfig.provider}
          placeholder="选择 provider"
          options={supportedProviders.map<ProviderSelectOption<LLMProviderType>>((p) => ({
            value: p,
            label: PROVIDER_LABELS[p],
            hint: LLM_PROVIDER_REGISTRY[p].apiKeyPlaceholder,
            recommended:
              p === CAPABILITY_DEFAULT_PROVIDER[capability] &&
              LLM_PROVIDER_REGISTRY[p].recommended[CAPABILITY_TO_MEDIA[capability]] != null,
          }))}
          onChange={onChangeProvider}
        />
      </div>

      <div className="mb-3">
        <label className="mb-1.5 block text-[11px] font-medium text-[var(--color-text-secondary)]">API Key</label>
        <Input
          type="password"
          placeholder={LLM_PROVIDER_REGISTRY[effectiveConfig.provider].apiKeyPlaceholder}
          value={effectiveConfig.apiKey}
          onChange={(e) => onChange({ apiKey: e.target.value })}
          className="text-xs"
        />
      </div>

      <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-[11px] font-medium text-[var(--color-text-secondary)]">Base URL</label>
          <Input
            value={effectiveConfig.baseUrl}
            onChange={(e) => onChange({ baseUrl: e.target.value })}
            className="text-xs"
            placeholder="https://api.example.com/v1"
          />
        </div>
        <div>
          <label className="mb-1.5 block text-[11px] font-medium text-[var(--color-text-secondary)]">Model</label>
          <Input
            value={effectiveConfig.model}
            onChange={(e) => onChange({ model: e.target.value })}
            className="text-xs"
            placeholder={
              LLM_PROVIDER_REGISTRY[effectiveConfig.provider].recommended[CAPABILITY_TO_MEDIA[capability]] ??
              LLM_PROVIDER_REGISTRY[effectiveConfig.provider].model
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