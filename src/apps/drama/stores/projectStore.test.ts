import { describe, it, expect, beforeEach } from 'vitest';
import { useProjectStore } from './projectStore';
import { mockProjects } from '@drama/data/mockProjects';

describe('projectStore', () => {
  beforeEach(() => {
    useProjectStore.setState({
      projects: [...mockProjects],
      currentProjectId: 'proj_1',
    });
  });

  it('sets current project', () => {
    useProjectStore.getState().setCurrentProject('proj_1');
    expect(useProjectStore.getState().currentProjectId).toBe('proj_1');
  });

  it('creates a new project', () => {
    const id = useProjectStore.getState().createProject('New', 'Desc', '#6366f1');
    expect(id).toMatch(/^proj_/);
    expect(useProjectStore.getState().currentProjectId).toBe(id);
  });

  it('deletes a project', () => {
    useProjectStore.getState().createProject('Temp', '', '#6366f1');
    const state = useProjectStore.getState();
    const initialCount = state.projects.length;
    useProjectStore.getState().deleteProject(state.currentProjectId!);
    expect(useProjectStore.getState().projects.length).toBe(initialCount - 1);
  });

  it('updates a project', () => {
    useProjectStore.setState({ currentProjectId: 'proj_1' });
    useProjectStore.getState().updateProject('proj_1', { title: 'Updated Title' });
    const updated = useProjectStore.getState().projects.find(p => p.id === 'proj_1');
    expect(updated?.title).toBe('Updated Title');
  });

  it('deduplicates projects', () => {
    useProjectStore.setState({
      projects: [
        { id: 'a', title: 'Project A', description: '', coverColor: '#000', updatedAt: '2024-01-01', sceneCount: 0, duration: 0 },
        { id: 'a', title: 'Project A v2', description: '', coverColor: '#000', updatedAt: '2024-01-02', sceneCount: 0, duration: 0 },
      ],
    });
    useProjectStore.getState().deduplicateProjects();
    expect(useProjectStore.getState().projects.length).toBe(1);
  });
});
