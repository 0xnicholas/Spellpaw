/**
 * Builder component registry — ③ component mapping table.
 *
 * Maps BuilderConfig.component to React components. LLM cannot generate
 * arbitrary UI — it can only select from registered components.
 */
import type { ComponentType } from 'react';
import type { BuilderConfig } from '@shared/lib/builderSchema';

export interface BuilderComponentProps {
  config: BuilderConfig;
  currentStep: number;
  totalSteps: number;
  edits: Record<string, unknown>;
  onConfirmStep: () => void;
  onUpdateEdits: (data: Record<string, unknown>) => void;
}

type RegistryEntry = {
  component: ComponentType<BuilderComponentProps>;
  totalSteps: number;
};

const registry = new Map<string, RegistryEntry>();

export function registerBuilderComponent(
  name: string,
  component: ComponentType<BuilderComponentProps>,
  totalSteps: number,
): void {
  registry.set(name, { component, totalSteps });
}

export function getBuilderComponent(name: string): RegistryEntry | null {
  return registry.get(name) ?? null;
}

export function getTotalSteps(name: string): number {
  return registry.get(name)?.totalSteps ?? 1;
}
