import { create } from 'zustand';
import type { TreeNode } from '@/apps/drama/types';

interface DetailState {
  activeTab: 'chat' | 'details';
  draftFormData: Partial<TreeNode> | null;
  focusCanvasLinkedId: string | null;
  setActiveTab: (tab: 'chat' | 'details') => void;
  setDraftFormData: (data: Partial<TreeNode> | null) => void;
  requestFocusCanvas: (linkedTreeNodeId: string) => void;
  clearFocusCanvas: () => void;
}

export const useDetailStore = create<DetailState>((set) => ({
  activeTab: 'chat',
  draftFormData: null,
  focusCanvasLinkedId: null,
  setActiveTab: (tab) => set({ activeTab: tab }),
  setDraftFormData: (data) => set({ draftFormData: data }),
  requestFocusCanvas: (linkedTreeNodeId) => set({ focusCanvasLinkedId: linkedTreeNodeId }),
  clearFocusCanvas: () => set({ focusCanvasLinkedId: null }),
}));
