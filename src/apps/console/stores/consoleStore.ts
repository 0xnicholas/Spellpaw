import { create } from 'zustand';
import type { ConsoleTab } from '@console/types';

interface ConsoleState {
  activeTab: ConsoleTab;
  setActiveTab: (tab: ConsoleTab) => void;
}

export const useConsoleStore = create<ConsoleState>((set) => ({
  activeTab: 'profile',
  setActiveTab: (tab) => set({ activeTab: tab }),
}));
