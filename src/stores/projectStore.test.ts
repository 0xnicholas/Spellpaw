import { describe, it, expect, beforeEach } from 'vitest';
import { useProjectStore } from './projectStore';
import { mockProjects } from '@/data/mockProjects';
import { mockTreeData } from '@/data/mockTreeData';

describe('projectStore', () => {
  beforeEach(() => {
    useProjectStore.setState({
      projects: mockProjects,
      currentProjectId: mockProjects[0]?.id ?? null,
      treeData: mockTreeData,
      selectedNodeId: null,
    });
  });

  it('sets current project', () => {
    useProjectStore.getState().setCurrentProject('proj_1');
    expect(useProjectStore.getState().currentProjectId).toBe('proj_1');
  });

  it('selects node', () => {
    useProjectStore.getState().selectNode('node_1');
    expect(useProjectStore.getState().selectedNodeId).toBe('node_1');
  });

  it('deselects node', () => {
    useProjectStore.getState().selectNode('node_1');
    useProjectStore.getState().selectNode(null);
    expect(useProjectStore.getState().selectedNodeId).toBeNull();
  });

  it('initializes with mock data', () => {
    const state = useProjectStore.getState();
    expect(state.projects.length).toBeGreaterThan(0);
    expect(state.treeData).not.toBeNull();
  });
});
