import { useEffect, useRef } from 'react';
import { useBuilderStore } from '@drama/stores/builderStore';
import { getBuilderComponent } from './registry';
import { BuilderErrorBoundary } from './BuilderErrorBoundary';
import { addRawCard } from '@drama/stores/toolRouter/cards';
import type { CanvasNodeType } from '@drama/types';

/** Map BuilderConfig.component to canvas card type */
const COMPONENT_TO_CARD_TYPE: Record<string, CanvasNodeType> = {
  character_map: 'character',
};

export function BuilderPanel() {
  const config = useBuilderStore((s) => s.config);
  const status = useBuilderStore((s) => s.status);
  const currentStep = useBuilderStore((s) => s.currentStep);
  const totalSteps = useBuilderStore((s) => s.totalSteps);
  const edits = useBuilderStore((s) => s.edits);
  const error = useBuilderStore((s) => s.error);
  const confirmStep = useBuilderStore((s) => s.confirmStep);
  const updateEdits = useBuilderStore((s) => s.updateEdits);
  const reset = useBuilderStore((s) => s.reset);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Stable ref for reset to avoid useEffect dependency issues
  const resetRef = useRef(reset);

  useEffect(() => {
    resetRef.current = reset;
  });

  // Listen for cancel events from ErrorBoundary
  useEffect(() => {
    const handler = () => resetRef.current();
    window.addEventListener('builder:cancel', handler);
    return () => window.removeEventListener('builder:cancel', handler);
  }, []);

  // On all steps confirmed, write to store via shared handler
  useEffect(() => {
    if (status === 'confirmed' && config) {
      // Clear any pending reset timer
      if (resetTimerRef.current) clearTimeout(resetTimerRef.current);

      // Merge edits into data
      const mergedData = { ...config.data, ...edits };

      // Write to appropriate target
      if (config.target === 'canvas') {
        const cardType = COMPONENT_TO_CARD_TYPE[config.component] ?? 'character';
        addRawCard(cardType, {
          title: mergedData.title as string ?? '角色关系图',
          ...mergedData,
        });
      }

      // Reset after write
      resetTimerRef.current = setTimeout(() => {
        resetTimerRef.current = null;
        resetRef.current();
      }, 500);
      return () => {
        if (resetTimerRef.current) {
          clearTimeout(resetTimerRef.current);
          resetTimerRef.current = null;
        }
      };
    }
  }, [status, config, edits]);

  // Nothing to show
  if (!config || status === 'idle') return null;
  if (status === 'confirmed') {
    return (
      <div className="absolute bottom-4 right-4 z-50 rounded-lg border border-[var(--color-accent-200)] bg-[var(--color-accent-50)] px-4 py-2 text-xs text-[var(--color-accent-700)] shadow-lg">
        ✅ 已写入画布
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="absolute bottom-4 right-4 z-50 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-xs text-red-700 shadow-lg">
        ❌ {error || '渲染失败'} {' '}
        <button onClick={reset} className="underline">关闭</button>
      </div>
    );
  }

  const entry = getBuilderComponent(config.component);
  if (!entry) {
    return (
      <div className="absolute bottom-4 right-4 z-50 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-bg-primary)] p-4 shadow-lg max-w-md">
        <h3 className="text-xs font-semibold text-[var(--color-text-primary)] mb-2">不支持的组件</h3>
        <pre className="text-[10px] text-[var(--color-text-tertiary)] max-h-40 overflow-auto">
          {JSON.stringify(config, null, 2)}
        </pre>
        <button onClick={reset} className="mt-2 text-xs text-[var(--color-text-secondary)] underline">
          关闭
        </button>
      </div>
    );
  }

  const BuilderComponent = entry.component;

  return (
    <div className="absolute inset-y-0 right-0 z-40 w-80 border-l border-[var(--color-border-default)] bg-[var(--color-bg-primary)] shadow-lg">
      <div className="flex items-center justify-between border-b border-[var(--color-border-default)] px-4 py-2">
        <span className="text-xs font-semibold text-[var(--color-text-primary)]">
          🔨 Builder
        </span>
        <button
          onClick={reset}
          className="text-[10px] text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]"
        >
          关闭
        </button>
      </div>
      <BuilderErrorBoundary componentName={config.component}>
        <BuilderComponent
          config={config}
          currentStep={currentStep}
          totalSteps={totalSteps}
          edits={edits}
          onConfirmStep={confirmStep}
          onUpdateEdits={updateEdits}
        />
      </BuilderErrorBoundary>
    </div>
  );
}
