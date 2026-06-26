/**
 * CardCopilotPopover — Spellpaw integrated popover.
 *
 * Design ref: screenshots/buzzy-canvas-*.png
 *   - No "Copilot" title bar — single dark floating block
 *   - + Ref button (top-left) + textarea + model dropdown + format info + send button
 *   - Model dropdown filtered by capability: only shows providers that actually
 *     support the current kind (image / video / upload)
 *   - For video kind: format info is clickable, opens Settings panel (Auto toggle,
 *     Resolution picker, Length slider, Ratio picker)
 *   - Send button: Spellpaw accent purple "+N" credit cost
 *   - aria-label still says "Copilot tool panel" for accessibility + test compat
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Upload, X, Plus, ChevronDown, KeyRound, Settings as SettingsIcon } from 'lucide-react';
import { useCopilotGenerate, type FileRefData } from '@shared/components/canvas/hooks/useCopilotGenerate';
import { providerRegistry } from '@drama/lib/canvasToolkit';
import type { GenerationProvider, MediaType, Capability } from '@drama/lib/canvasToolkit';
import type { CopilotKind } from '@shared/components/canvas/PaneContextMenu';
import { Z_INDEX } from '@shared/lib/zIndex';

const POPOVER_AUTOCLOSE_DELAY_MS = 1200;
const POPOVER_WIDTH = 560;
const SETTINGS_WIDTH = 340;
const SETTINGS_GAP = 12;
const VIEWPORT_PAD = 16;
const NAVBAR_HEIGHT = 64;

const SEND_BG = 'oklch(55% 0.2 275)';
const SEND_BG_HOVER = 'oklch(50% 0.22 275)';
const SEND_TEXT = 'oklch(98% 0.01 275)';
const POPOVER_BG = 'oklch(12% 0.015 250)';
const POPOVER_BORDER = 'oklch(28% 0.02 250)';

const PLACEHOLDERS: Record<CopilotKind, string> = {
  text: '告诉 Spellpaw 你想生成或编辑什么，用 @ 引用画布上的元素...',
  image: '描述你脑海中的画面，用 @ 引用已上传的参考图',
  video: '上传参考、描述创意，用 @ 引用已上传的素材。例如：参考 @video，把主体换成 @image',
  upload: '',
};

/* ── Capability mapping ── */

interface CapReq { type: MediaType; capability: Capability }

function capabilityForKind(kind: CopilotKind): CapReq | null {
  if (kind === 'image') return { type: 'image', capability: 'text2image' };
  if (kind === 'video') return { type: 'video', capability: 'text2video' };
  if (kind === 'upload') return { type: 'image', capability: 'text2image' };
  return null; // text kind has no provider-based generation
}

function providerSupportsCap(provider: GenerationProvider, req: CapReq): boolean {
  return (provider.supportedMedia ?? []).includes(req.type)
    && (provider.capabilities ?? []).includes(req.capability);
}

/* ── Default fallback (when no provider matches) ── */

const KIND_DEFAULT_COST: Record<CopilotKind, number> = {
  text: 4,
  image: 28,
  video: 40,
  upload: 0,
};

/* ── Video settings ── */

const VIDEO_RESOLUTIONS = ['480p', '720p', '1080p'] as const;
const VIDEO_RATIOS = ['21:9', '16:9', '4:3', '1:1', '3:4', '9:16'] as const;
const VIDEO_LENGTH_MIN = 4;
const VIDEO_LENGTH_MAX = 15;

interface VideoSettings {
  auto: boolean;
  resolution: typeof VIDEO_RESOLUTIONS[number];
  length: number;     // seconds
  ratio: typeof VIDEO_RATIOS[number];
}

const DEFAULT_VIDEO_SETTINGS: VideoSettings = {
  auto: true,
  resolution: '480p',
  length: 4,
  ratio: '21:9',
};

function formatVideoInfo(s: VideoSettings): string {
  return `${s.resolution} · ${s.length}s · ${s.ratio}`;
}

/* ── Component ── */

export interface CardCopilotPopoverProps {
  cardId: string;
  kind: CopilotKind;
  screenPosition: { x: number; y: number };
  onClose: () => void;
}

export function CardCopilotPopover({ cardId, kind, screenPosition, onClose }: CardCopilotPopoverProps) {
  const [prompt, setPrompt] = useState('');
  const [fileRef, setFileRef] = useState<FileRefData | null>(null);
  const [modelOpen, setModelOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [videoSettings, setVideoSettings] = useState<VideoSettings>(DEFAULT_VIDEO_SETTINGS);
  const capReq = capabilityForKind(kind);
  const availableProviders = useMemo(() => {
    if (!capReq) return [];
    // Use providerRegistry.list() (full provider objects) — the shared listProviders()
    // helper returns only {id, name} and strips the capability arrays we need to filter.
    return providerRegistry.list().filter((p) => providerSupportsCap(p, capReq));
  }, [capReq]);
  const configuredProviders = useMemo(
    () => availableProviders.filter((p) => p.isConfigured()),
    [availableProviders],
  );
  const [currentProviderId, setCurrentProviderId] = useState<string | null>(
    configuredProviders[0]?.id ?? availableProviders[0]?.id ?? null,
  );
  const currentProvider = currentProviderId ? providerRegistry.get(currentProviderId) : null;
  const isProviderConfigured = currentProvider?.isConfigured() ?? false;

  // Track auto-close timeout so re-generation can cancel it (I-1 fix).
  const autoCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { status, progress, error, generate, cancel } = useCopilotGenerate({
    cardId,
    kind,
    onSuccess: () => {
      if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current);
      autoCloseTimerRef.current = setTimeout(() => {
        autoCloseTimerRef.current = null;
        onClose();
      }, POPOVER_AUTOCLOSE_DELAY_MS);
    },
  });

  useEffect(() => {
    return () => {
      if (autoCloseTimerRef.current) clearTimeout(autoCloseTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (settingsOpen) { setSettingsOpen(false); return; }
        if (modelOpen) { setModelOpen(false); return; }
        if (status === 'generating') cancel();
        else onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose, status, cancel, settingsOpen, modelOpen]);

  const left = Math.max(
    VIEWPORT_PAD,
    Math.min(screenPosition.x - POPOVER_WIDTH / 2, window.innerWidth - POPOVER_WIDTH - VIEWPORT_PAD),
  );
  const top = Math.max(NAVBAR_HEIGHT, screenPosition.y);

  // Format info display (only for video kind currently)
  const formatInfo = kind === 'video' ? formatVideoInfo(videoSettings)
    : kind === 'image' ? '1K · 1:1'
    : '';

  // Credit cost — from selected provider, or fallback
  const creditCost = useMemo(() => {
    if (!currentProvider) return KIND_DEFAULT_COST[kind];
    try {
      const est = currentProvider.estimateCost({ prompt: prompt || 'placeholder', type: capReq?.type ?? 'image', capability: capReq?.capability ?? 'text2image' } as never);
      return Math.max(1, Math.round(est.amount));
    } catch {
      return KIND_DEFAULT_COST[kind];
    }
  }, [currentProvider, kind, prompt, capReq]);

  const handleGenerate = () => {
    if (kind === 'upload') {
      if (!fileRef) return;
      generate({ prompt: fileRef.name, fileRef });
      return;
    }
    if (!prompt.trim()) return;
    generate({
      prompt,
      providerId: currentProviderId ?? undefined,
      fileRef: fileRef ?? undefined,
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result ?? '');
      let detectedKind: 'image' | 'video' | 'audio' = 'image';
      if (file.type.startsWith('video/')) detectedKind = 'video';
      else if (file.type.startsWith('audio/')) detectedKind = 'audio';
      setFileRef({ name: file.name, size: file.size, kind: detectedKind, dataUrl });
    };
    reader.readAsDataURL(file);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleGenerate();
    }
  };

  const isGenerating = status === 'generating';
  const canGenerate =
    !isGenerating && (kind === 'upload' ? !!fileRef : prompt.trim().length > 0);

  // Close model/settings popovers when clicking outside
  useEffect(() => {
    if (!modelOpen && !settingsOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('[data-buzzy-popover-content]')) return;
      setModelOpen(false);
      setSettingsOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [modelOpen, settingsOpen]);

  return createPortal(
    <div
      role="dialog"
      aria-label="Copilot tool panel"
      data-testid="card-copilot-popover"
      // 阻止冒泡到 canvas pane，避免误关弹窗 (M-8 fix)
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      style={{
        position: 'fixed',
        left,
        top,
        width: POPOVER_WIDTH,
        zIndex: Z_INDEX.cardCopilotPopover,
        backgroundColor: POPOVER_BG,
        border: `1px solid ${POPOVER_BORDER}`,
        borderRadius: 16,
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 2px 8px rgba(0, 0, 0, 0.2)',
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
      data-buzzy-popover-content
    >
      {/* Top row: Ref button (left) + close (right) */}
      {kind !== 'text' && (
        <div className="flex items-center gap-2">
          <label
            data-testid="ref-label"
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1.5 transition-colors hover:bg-white/5"
            style={{
              border: `1px solid ${POPOVER_BORDER}`,
              color: 'var(--color-text-secondary)',
            }}
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="text-[12px]">Ref</span>
            <input
              type="file"
              accept="image/*,video/*,audio/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
          {fileRef && (
            <span className="text-[11px] text-[var(--color-text-tertiary)] truncate flex-1">
              {fileRef.name}
            </span>
          )}
          <button
            onClick={onClose}
            aria-label="关闭"
            className="ml-auto flex h-6 w-6 items-center justify-center rounded-md text-[var(--color-text-tertiary)] hover:bg-white/5 hover:text-[var(--color-text-primary)]"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* For text kind: only show close button at top-right (no header label — buzzy style) */}
      {kind === 'text' && (
        <div className="absolute right-2 top-2 z-10">
          <button
            onClick={onClose}
            aria-label="关闭"
            className="flex h-6 w-6 items-center justify-center rounded-md text-[var(--color-text-tertiary)] hover:bg-white/5 hover:text-[var(--color-text-primary)]"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Main: prompt textarea (text/image/video) or upload UI (upload) */}
      {kind === 'upload' ? (
        <div>
          <label
            data-testid="ref-label"
            className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-md py-6 transition-colors hover:bg-white/5"
            style={{
              border: `1px dashed ${POPOVER_BORDER}`,
              color: 'var(--color-text-tertiary)',
            }}
          >
            <Upload className="h-5 w-5" />
            <span className="text-[12px]">点击上传或拖拽文件</span>
            <input
              type="file"
              accept="image/*,video/*,audio/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
          {fileRef && (
            <div className="mt-2 text-[11px] text-[var(--color-text-tertiary)]">
              {fileRef.name} ({(fileRef.size / 1024).toFixed(0)} KB)
            </div>
          )}
        </div>
      ) : (
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={PLACEHOLDERS[kind]}
          disabled={isGenerating}
          rows={4}
          data-testid="copilot-prompt"
          className="w-full resize-none rounded-md px-3 py-2.5 text-[13px] outline-none disabled:opacity-50"
          style={{
            backgroundColor: 'oklch(8% 0.01 250)',
            border: `1px solid ${POPOVER_BORDER}`,
            color: 'var(--color-text-primary)',
          }}
        />
      )}

      {/* Status displays (generating / error / done) */}
      {isGenerating && (
        <div data-testid="copilot-progress" className="space-y-1">
          <div className="h-1 w-full overflow-hidden rounded-full" style={{ backgroundColor: 'oklch(20% 0.015 250)' }}>
            <div
              className="h-full transition-all"
              style={{ width: `${progress}%`, backgroundColor: 'var(--color-accent-500)' }}
            />
          </div>
          <div className="text-[10px] text-[var(--color-text-tertiary)]">
            生成中... {progress}%
          </div>
        </div>
      )}

      {status === 'error' && (
        <div
          className="rounded-md p-2 text-[11px]"
          data-testid="copilot-error"
          style={{ backgroundColor: 'oklch(20% 0.08 25)', color: 'oklch(80% 0.15 25)' }}
        >
          {error}
        </div>
      )}

      {status === 'done' && (
        <div
          className="rounded-md p-2 text-[11px]"
          data-testid="copilot-success"
          style={{ backgroundColor: 'oklch(20% 0.08 145)', color: 'oklch(80% 0.15 145)' }}
        >
          ✓ 完成
        </div>
      )}

      {/* Bottom row: model + format info + send button */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {/* Model selector — only if there are providers for this kind */}
          {availableProviders.length > 0 && currentProvider && (
            <div className="relative" data-buzzy-popover-content>
              <button
                onClick={() => setModelOpen(!modelOpen)}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 text-[12px] transition-colors hover:bg-white/5"
                style={{ color: 'var(--color-text-secondary)' }}
                aria-haspopup="listbox"
                aria-expanded={modelOpen}
                data-testid="model-selector"
              >
                {!isProviderConfigured && (
                  <KeyRound className="h-3 w-3 shrink-0" style={{ color: 'oklch(80% 0.15 85)' }} aria-label="未配置" />
                )}
                <span className="truncate max-w-[140px]">{currentProvider.name}</span>
                <ChevronDown className="h-3 w-3 shrink-0" />
              </button>

              {modelOpen && (
                <div
                  role="listbox"
                  data-buzzy-popover-content
                  className="absolute z-20 mt-1 w-[260px] overflow-auto rounded-md py-1"
                  style={{
                    top: '100%',
                    left: 0,
                    backgroundColor: 'oklch(10% 0.01 250)',
                    border: `1px solid ${POPOVER_BORDER}`,
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.4)',
                  }}
                >
                  {availableProviders.length === 0 && (
                    <div className="px-3 py-2 text-[11px] text-[var(--color-text-tertiary)]">
                      没有支持此类型的模型
                    </div>
                  )}
                  {availableProviders.map((p) => {
                    const configured = p.isConfigured();
                    const isCurrent = p.id === currentProviderId;
                    return (
                      <button
                        key={p.id}
                        role="option"
                        aria-selected={isCurrent}
                        onClick={() => { setCurrentProviderId(p.id); setModelOpen(false); }}
                        data-buzzy-popover-content
                        className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px] transition-colors hover:bg-white/5"
                        style={{
                          color: isCurrent ? 'var(--color-text-primary)' : 'var(--color-text-secondary)',
                          backgroundColor: isCurrent ? 'rgba(255,255,255,0.04)' : undefined,
                        }}
                      >
                        {!configured && (
                          <KeyRound className="h-3 w-3 shrink-0" style={{ color: 'oklch(80% 0.15 85)' }} aria-label="未配置" />
                        )}
                        <span className="flex-1 truncate">{p.name}</span>
                        {configured ? (
                          <span className="text-[9px] uppercase tracking-wider" style={{ color: 'oklch(65% 0.15 145)' }}>已配置</span>
                        ) : (
                          <span className="text-[9px] uppercase tracking-wider" style={{ color: 'oklch(60% 0.02 250)' }}>需配置</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* For text kind: show "本地处理" or similar */}
          {kind === 'text' && (
            <span className="text-[11px] text-[var(--color-text-tertiary)]">本地写入</span>
          )}

          {/* Format info — clickable for video to open settings */}
          {formatInfo && (
            <button
              onClick={() => kind === 'video' ? setSettingsOpen(!settingsOpen) : undefined}
              data-testid="format-info"
              className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] transition-colors hover:bg-white/5"
              style={{
                color: 'var(--color-text-tertiary)',
                cursor: kind === 'video' ? 'pointer' : 'default',
              }}
              disabled={kind !== 'video'}
            >
              {kind === 'video' && <SettingsIcon className="h-3 w-3" aria-hidden="true" />}
              <span>{formatInfo}</span>
            </button>
          )}
        </div>

        {/* Generate / Cancel button */}
        {isGenerating ? (
          <button
            onClick={cancel}
            data-testid="copilot-cancel"
            className="rounded-md px-3 py-1.5 text-[12px] transition-colors hover:bg-white/5"
            style={{
              border: `1px solid ${POPOVER_BORDER}`,
              color: 'var(--color-text-secondary)',
            }}
          >
            取消
          </button>
        ) : (
          <button
            onClick={handleGenerate}
            disabled={!canGenerate}
            data-testid="copilot-generate"
            className="inline-flex items-center justify-center gap-1 rounded-full font-semibold transition-all hover:scale-[1.03] active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:scale-100"
            style={{
              backgroundColor: SEND_BG,
              color: SEND_TEXT,
              minWidth: 64,
              height: 36,
              paddingLeft: 14,
              paddingRight: 14,
              fontSize: 13,
              boxShadow: canGenerate ? '0 2px 8px rgba(85, 70, 230, 0.35)' : 'none',
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = SEND_BG_HOVER; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = SEND_BG; }}
            aria-label="生成"
          >
            <span style={{ fontSize: 14 }}>+</span>
            <span>{creditCost}</span>
          </button>
        )}
      </div>

      {/* Video Settings panel — only for video kind, positioned to the right of popover */}
      {settingsOpen && kind === 'video' && (
        <VideoSettingsPanel
          settings={videoSettings}
          onChange={setVideoSettings}
          onClose={() => setSettingsOpen(false)}
          popoverRect={{ left, top, width: POPOVER_WIDTH }}
        />
      )}
    </div>,
    document.body,
  );
}

/* ── Video Settings Panel ── */

interface VideoSettingsPanelProps {
  settings: VideoSettings;
  onChange: (s: VideoSettings) => void;
  onClose: () => void;
  popoverRect: { left: number; top: number; width: number };
}

function VideoSettingsPanel({ settings, onChange, onClose, popoverRect }: VideoSettingsPanelProps) {
  // Position to the right of the popover
  const panelLeft = popoverRect.left + popoverRect.width + SETTINGS_GAP;
  const panelTop = popoverRect.top;

  // If overflows right edge, flip to left side
  const finalLeft = panelLeft + SETTINGS_WIDTH > window.innerWidth - VIEWPORT_PAD
    ? Math.max(VIEWPORT_PAD, popoverRect.left - SETTINGS_WIDTH - SETTINGS_GAP)
    : panelLeft;

  return (
    <div
      role="dialog"
      aria-label="视频生成设置"
      data-buzzy-popover-content
      data-testid="video-settings-panel"
      style={{
        position: 'fixed',
        left: finalLeft,
        top: panelTop,
        width: SETTINGS_WIDTH,
        zIndex: Z_INDEX.cardCopilotPopover + 1,
        backgroundColor: 'oklch(10% 0.01 250)',
        border: `1px solid ${POPOVER_BORDER}`,
        borderRadius: 16,
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 18,
      }}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Header: Settings + Auto toggle */}
      <div className="flex items-center justify-between">
        <h3 className="text-[15px] font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          设置
        </h3>
        <button
          onClick={onClose}
          aria-label="关闭"
          className="flex h-6 w-6 items-center justify-center rounded-md text-[var(--color-text-tertiary)] hover:bg-white/5 hover:text-[var(--color-text-primary)] -mr-1"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex items-center justify-between">
        <span className="text-[12px]" style={{ color: 'var(--color-text-tertiary)' }}>Auto</span>
        <button
          role="switch"
          aria-checked={settings.auto}
          onClick={() => onChange({ ...settings, auto: !settings.auto })}
          className="relative h-5 w-9 rounded-full transition-colors"
          style={{
            backgroundColor: settings.auto ? 'oklch(85% 0.18 95)' : 'oklch(25% 0.015 250)',
          }}
        >
          <span
            className="absolute top-0.5 h-4 w-4 rounded-full transition-all"
            style={{
              left: settings.auto ? 18 : 2,
              backgroundColor: settings.auto ? 'oklch(20% 0.02 95)' : 'oklch(60% 0.02 250)',
            }}
          />
        </button>
      </div>

      {/* Resolution */}
      <div>
        <div className="mb-2 text-[10px] uppercase tracking-wider" style={{ color: 'var(--color-text-tertiary)' }}>
          分辨率
        </div>
        <div className="flex items-center gap-1 rounded-full p-1" style={{ backgroundColor: 'oklch(8% 0.01 250)' }}>
          {VIDEO_RESOLUTIONS.map((r) => {
            const isSelected = settings.resolution === r;
            // 720p / 1080p are paid (highlighted with yellow dot)
            const isPaid = r !== '480p';
            return (
              <button
                key={r}
                onClick={() => onChange({ ...settings, resolution: r })}
                className="relative flex-1 rounded-full px-3 py-1.5 text-[12px] transition-colors"
                style={{
                  backgroundColor: isSelected ? 'oklch(22% 0.02 250)' : 'transparent',
                  color: isSelected ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
                }}
              >
                {r}
                {isPaid && (
                  <span
                    className="ml-1 inline-block h-1.5 w-1.5 rounded-full align-middle"
                    style={{ backgroundColor: 'oklch(85% 0.18 95)' }}
                    title="付费功能"
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Length */}
      <div>
        <div className="mb-1 flex items-baseline justify-between">
          <span className="text-[12px]" style={{ color: 'var(--color-text-primary)' }}>
            时长 {settings.length}s
          </span>
        </div>
        <div className="mb-2 text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>
          {VIDEO_LENGTH_MIN}s 免费 · 更长需要订阅
        </div>
        <input
          type="range"
          min={VIDEO_LENGTH_MIN}
          max={VIDEO_LENGTH_MAX}
          value={settings.length}
          onChange={(e) => onChange({ ...settings, length: Number(e.target.value) })}
          className="w-full"
          style={{ accentColor: 'oklch(85% 0.18 95)' }}
        />
        <div className="mt-1 flex justify-between text-[10px]" style={{ color: 'var(--color-text-tertiary)' }}>
          <span>{VIDEO_LENGTH_MIN}s</span>
          <span>{VIDEO_LENGTH_MAX}s</span>
        </div>
      </div>

      {/* Ratio */}
      <div>
        <div className="mb-2 text-[10px] uppercase tracking-wider" style={{ color: 'var(--color-text-tertiary)' }}>
          比例
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          {VIDEO_RATIOS.map((r) => {
            const isSelected = settings.ratio === r;
            // 21:9 is paid
            const isPaid = r === '21:9';
            return (
              <button
                key={r}
                onClick={() => onChange({ ...settings, ratio: r })}
                className="relative rounded-md px-2 py-1.5 text-[11px] transition-colors"
                style={{
                  backgroundColor: isSelected ? 'oklch(22% 0.02 250)' : 'oklch(8% 0.01 250)',
                  color: isSelected ? 'var(--color-text-primary)' : 'var(--color-text-tertiary)',
                  border: `1px solid ${isSelected ? POPOVER_BORDER : 'transparent'}`,
                }}
              >
                <span>{r}</span>
                {isPaid && (
                  <span
                    className="absolute right-1 top-1 inline-block h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: 'oklch(85% 0.18 95)' }}
                    title="付费功能"
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
