import { describe, it, expect } from 'vitest';
import { useConsoleStore } from './consoleStore';

describe('consoleStore', () => {
  it('defaults to profile tab', () => {
    expect(useConsoleStore.getState().activeTab).toBe('profile');
  });

  it('switches active tab', () => {
    useConsoleStore.getState().setActiveTab('security');
    expect(useConsoleStore.getState().activeTab).toBe('security');
    useConsoleStore.getState().setActiveTab('preferences');
    expect(useConsoleStore.getState().activeTab).toBe('preferences');
  });
});
