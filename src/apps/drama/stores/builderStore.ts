import { create } from 'zustand';
import { produce } from 'immer';
import type { BuilderConfig } from '@shared/lib/builderSchema';

export type BuilderStatus = 'idle' | 'validating' | 'previewing' | 'confirmed' | 'error';

interface BuilderState {
  config: BuilderConfig | null;
  status: BuilderStatus;
  currentStep: number;
  totalSteps: number;
  edits: Record<string, unknown>;
  error: string | null;

  setConfig: (config: BuilderConfig, totalSteps: number) => void;
  setStatus: (status: BuilderStatus) => void;
  updateEdits: (data: Record<string, unknown>) => void;
  confirmStep: () => void;
  setError: (error: string) => void;
  reset: () => void;
}

export const useBuilderStore = create<BuilderState>()((set, get) => ({
  config: null,
  status: 'idle',
  currentStep: 0,
  totalSteps: 0,
  edits: {},
  error: null,

  setConfig: (config, totalSteps) =>
    set({
      config,
      status: config ? 'validating' : 'idle',
      currentStep: 0,
      totalSteps,
      edits: {},
      error: null,
    }),

  setStatus: (status) => set({ status }),

  updateEdits: (data) =>
    set(
      produce((s: BuilderState) => {
        Object.assign(s.edits, data);
      }),
    ),

  confirmStep: () => {
    const { currentStep, totalSteps } = get();
    if (currentStep + 1 >= totalSteps) {
      set({ status: 'confirmed' });
    } else {
      set({ currentStep: currentStep + 1 });
    }
  },

  setError: (error) => set({ status: 'error', error }),

  reset: () =>
    set({
      config: null,
      status: 'idle',
      currentStep: 0,
      totalSteps: 0,
      edits: {},
      error: null,
    }),
}));
