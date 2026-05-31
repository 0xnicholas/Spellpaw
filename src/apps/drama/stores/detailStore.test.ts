import { describe, it, expect, beforeEach } from 'vitest';
import { useDetailStore } from './detailStore';

describe('detailStore', () => {
  beforeEach(() => {
    useDetailStore.setState({ activeTab: 'chat', draftFormData: null, focusCanvasLinkedId: null });
  });

  it('defaults to chat tab', () => {
    expect(useDetailStore.getState().activeTab).toBe('chat');
  });

  it('switches to details tab', () => {
    useDetailStore.getState().setActiveTab('details');
    expect(useDetailStore.getState().activeTab).toBe('details');
  });

  it('sets draft form data', () => {
    useDetailStore.getState().setDraftFormData({ title: 'Test' });
    expect(useDetailStore.getState().draftFormData?.title).toBe('Test');
  });

  it('clears draft form data', () => {
    useDetailStore.getState().setDraftFormData({ title: 'Test' });
    useDetailStore.getState().setDraftFormData(null);
    expect(useDetailStore.getState().draftFormData).toBeNull();
  });

  it('requests and clears canvas focus', () => {
    useDetailStore.getState().requestFocusCanvas('tree_123');
    expect(useDetailStore.getState().focusCanvasLinkedId).toBe('tree_123');
    useDetailStore.getState().clearFocusCanvas();
    expect(useDetailStore.getState().focusCanvasLinkedId).toBeNull();
  });
});
