import { describe, it, expect, beforeEach } from 'vitest';
import { useProjectStore } from './projectStore';
import { mockProjects } from '@/data/mockProjects';
import type { TreeNode } from '@/types';

describe('projectStore', () => {
  beforeEach(() => {
    useProjectStore.setState({
      projects: [...mockProjects],
      trees: {
        'proj_1': {
          id: 'root',
          type: 'project',
          title: 'Test Project',
          status: 'draft',
          children: [
            {
              id: 'act_1',
              type: 'act',
              title: 'Act 1',
              status: 'draft',
              children: [
                {
                  id: 'scene_1',
                  type: 'scene',
                  title: 'Scene 1',
                  status: 'draft',
                  metadata: { createdAt: '', updatedAt: '' },
                },
                {
                  id: 'scene_2',
                  type: 'scene',
                  title: 'Scene 2',
                  status: 'in_progress',
                  metadata: { createdAt: '', updatedAt: '' },
                },
              ],
            },
          ],
        },
      },
      currentProjectId: 'proj_1',
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
    expect(state.getCurrentTree()).not.toBeNull();
  });

  it('adds child node with auto metadata', () => {
    const newNode: TreeNode = {
      id: 'new_scene',
      type: 'scene',
      title: 'New Scene',
      status: 'draft',
    };
    useProjectStore.getState().addTreeNode('act_1', newNode);
    const tree = useProjectStore.getState().getCurrentTree();
    const act1 = tree?.children?.[0];
    expect(act1?.children?.length).toBe(3);
    const added = act1?.children?.[2];
    expect(added?.title).toBe('New Scene');
    expect(added?.metadata?.createdAt).toBeDefined();
    expect(added?.metadata?.duration).toBe(0);
  });

  it('moves node within siblings', () => {
    useProjectStore.getState().moveTreeNode('scene_2', 0);
    const tree = useProjectStore.getState().getCurrentTree();
    const firstScene = tree?.children?.[0]?.children?.[0];
    expect(firstScene?.id).toBe('scene_2');
  });

  it('deep-merges metadata on update', () => {
    useProjectStore.getState().updateTreeNode('scene_1', {
      metadata: { description: 'A scene', duration: 30, createdAt: '', updatedAt: '' },
    });
    const tree = useProjectStore.getState().getCurrentTree();
    const node = tree?.children?.[0]?.children?.[0];
    expect(node?.metadata?.description).toBe('A scene');
    expect(node?.metadata?.duration).toBe(30);
    expect(node?.metadata?.updatedAt).toBeDefined();
    expect(node?.metadata?.createdAt).toBeDefined();
  });

  it('deletes node with children', () => {
    useProjectStore.getState().deleteTreeNode('act_1');
    const tree = useProjectStore.getState().getCurrentTree();
    expect(tree?.children?.length).toBe(0);
  });

  it('creates a new project', () => {
    const id = useProjectStore.getState().createProject('New', 'Desc', '#6366f1');
    expect(id).toMatch(/^proj_/);
    expect(useProjectStore.getState().currentProjectId).toBe(id);
    expect(useProjectStore.getState().getCurrentTree()?.title).toBe('New');
  });

  it('deletes a project', () => {
    useProjectStore.getState().createProject('Temp', '', '#6366f1');
    const state = useProjectStore.getState();
    const initialCount = state.projects.length;
    useProjectStore.getState().deleteProject(state.currentProjectId!);
    expect(useProjectStore.getState().projects.length).toBe(initialCount - 1);
  });

  it('isolates tree data between projects', () => {
    const id1 = useProjectStore.getState().currentProjectId!;
    useProjectStore.getState().createProject('Proj 2', '', '#8b5cf6');
    const id2 = useProjectStore.getState().currentProjectId!;
    useProjectStore.getState().setCurrentProject(id1);
    expect(useProjectStore.getState().getCurrentTree()?.title).toBe('Test Project');
    useProjectStore.getState().setCurrentProject(id2);
    expect(useProjectStore.getState().getCurrentTree()?.title).toBe('Proj 2');
  });
});
