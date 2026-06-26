import { create } from 'zustand';
import type { CanvasNodeData } from '@drama/types';

interface DetailState {
  activeTab: 'chat' | 'details';
  draftFormData: Partial<CanvasNodeData> | null;
  focusCanvasLinkedId: string | null;
  setActiveTab: (tab: 'chat' | 'details') => void;
  setDraftFormData: (data: Partial<CanvasNodeData> | null) => void;
  requestFocusCanvas: (cardId: string) => void;
  clearFocusCanvas: () => void;
}

export const useDetailStore = create<DetailState>((set) => ({
  activeTab: 'chat',
  draftFormData: null,
  focusCanvasLinkedId: null,
  setActiveTab: (tab) => set({ activeTab: tab }),
  setDraftFormData: (data) => set({ draftFormData: data }),
  requestFocusCanvas: (cardId) => set({ focusCanvasLinkedId: cardId }),
  clearFocusCanvas: () => set({ focusCanvasLinkedId: null }),
}));
