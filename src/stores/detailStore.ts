import { create } from 'zustand';
import type { TreeNode } from '@/types';

interface DetailState {
  activeTab: 'chat' | 'details';
  draftFormData: Partial<TreeNode> | null;
  setActiveTab: (tab: 'chat' | 'details') => void;
  setDraftFormData: (data: Partial<TreeNode> | null) => void;
}

export const useDetailStore = create<DetailState>((set) => ({
  activeTab: 'chat',
  draftFormData: null,
  setActiveTab: (tab) => set({ activeTab: tab }),
  setDraftFormData: (data) => set({ draftFormData: data }),
}));
