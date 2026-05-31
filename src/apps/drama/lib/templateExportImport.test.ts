import { describe, it, expect } from 'vitest';
import { treeToTemplate, validateTemplate, downloadTemplateFile } from './templateExportImport';
import type { TreeNode, Project } from '@/apps/drama/types';

function makeTree(): TreeNode {
  return {
    id: 'root-1',
    type: 'project',
    title: '悬疑项目',
    status: 'draft',
    expanded: true,
    metadata: {
      description: '一个悬疑短剧',
      duration: 0,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    },
    children: [
      {
        id: 'act-1',
        type: 'act',
        title: '第一幕',
        status: 'draft',
        metadata: {
          description: '平静表面',
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
        children: [
          {
            id: 'scene-1',
            type: 'scene',
            title: '开场',
            status: 'draft',
            metadata: {
              description: '主角醒来',
              duration: 15,
              location: '卧室',
              timeOfDay: 'morning',
              shotType: 'wide',
              cameraMovement: 'static',
              createdAt: '2024-01-01T00:00:00Z',
              updatedAt: '2024-01-01T00:00:00Z',
            },
            children: [
              {
                id: 'shot-1',
                type: 'shot',
                title: '全景',
                status: 'draft',
                metadata: {
                  description: '房间全景',
                  duration: 5,
                  shotType: 'wide',
                  createdAt: '2024-01-01T00:00:00Z',
                  updatedAt: '2024-01-01T00:00:00Z',
                },
              },
            ],
          },
        ],
      },
    ],
  };
}

function makeProject(): Project {
  return {
    id: 'proj-1',
    title: '悬疑项目',
    description: '项目描述',
    updatedAt: '2024-01-01T00:00:00Z',
    sceneCount: 1,
    duration: 20,
    coverColor: '#1a1a2e',
  };
}

describe('treeToTemplate', () => {
  it('转换项目树为 NarrativeTemplate', () => {
    const tree = makeTree();
    const project = makeProject();
    const template = treeToTemplate(tree, project);

    expect(template.name).toBe('悬疑项目');
    expect(template.category).toBe('custom');
    expect(template.description).toBe('一个悬疑短剧');
    expect(template.targetDuration).toBe(20); // 15 + 5
    expect(template.targetPlatform).toBe('portrait');
    expect(template.version).toBe(1);
    expect(template.id).toMatch(/^custom-/);
    expect(template.author).toBe('User');
  });

  it('正确嵌套 act → scene → shot 结构', () => {
    const tree = makeTree();
    const project = makeProject();
    const template = treeToTemplate(tree, project);

    expect(template.structure.acts).toHaveLength(1);
    expect(template.structure.acts[0].title).toBe('第一幕');
    expect(template.structure.acts[0].scenes).toHaveLength(1);
    expect(template.structure.acts[0].scenes[0].title).toBe('开场');
    expect(template.structure.acts[0].scenes[0].children).toHaveLength(1);
    expect(template.structure.acts[0].scenes[0].children![0].title).toBe('全景');
  });

  it('提取 shotType 和 cameraMovement 到 suggested 字段', () => {
    const tree = makeTree();
    const project = makeProject();
    const template = treeToTemplate(tree, project);

    const scene = template.structure.acts[0].scenes[0];
    expect(scene.suggestedShotTypes).toEqual(['wide']);
    expect(scene.suggestedCameraMovement).toBe('static');
  });

  it('使用项目 coverColor 作为风格预设', () => {
    const tree = makeTree();
    const project = makeProject();
    const template = treeToTemplate(tree, project);

    expect(template.stylePresets.colorPalette).toEqual(['#1a1a2e']);
  });

  it('根据标题和描述推导标签', () => {
    const tree = makeTree();
    const project = makeProject();
    const template = treeToTemplate(tree, project);

    expect(template.tags).toContain('suspense');
  });

  it('忽略非 act 类型的根级节点', () => {
    const tree: TreeNode = {
      id: 'root-2',
      type: 'project',
      title: 'Test',
      status: 'draft',
      metadata: { createdAt: '', updatedAt: '' },
      children: [
        {
          id: 'scene-direct',
          type: 'scene',
          title: '直接场景',
          status: 'draft',
          metadata: { createdAt: '', updatedAt: '' },
        },
      ],
    };
    const project = makeProject();
    const template = treeToTemplate(tree, project);

    expect(template.structure.acts).toHaveLength(0);
  });
});

describe('validateTemplate', () => {
  it('通过合法模板数据', () => {
    const data = {
      id: 'test-1',
      name: 'Test Template',
      category: 'custom',
      description: 'desc',
      targetDuration: 60,
      targetPlatform: 'portrait',
      structure: {
        acts: [
          {
            title: 'Act 1',
            description: '',
            scenes: [{ title: 'Scene 1', description: '' }],
          },
        ],
      },
      stylePresets: { colorPalette: [], pacing: 'moderate', visualStyle: '' },
      tags: [],
      version: 1,
    };

    const result = validateTemplate(data);
    expect(result.id).toBe('test-1');
  });

  it('非对象数据抛出错误', () => {
    expect(() => validateTemplate(null)).toThrow('must be an object');
    expect(() => validateTemplate('string')).toThrow('must be an object');
  });

  it('缺少 name 抛出错误', () => {
    expect(() => validateTemplate({ id: 'x', category: 'custom', structure: { acts: [] } })).toThrow('name');
  });

  it('缺少 acts 抛出错误', () => {
    expect(() =>
      validateTemplate({ id: 'x', name: 'Test', category: 'custom', structure: {} })
    ).toThrow('acts');
  });

  it('acts 为空数组抛出错误', () => {
    expect(() =>
      validateTemplate({ id: 'x', name: 'Test', category: 'custom', structure: { acts: [] } })
    ).toThrow('acts');
  });

  it('act 缺少 title 抛出错误', () => {
    expect(() =>
      validateTemplate({
        id: 'x',
        name: 'Test',
        category: 'custom',
        structure: { acts: [{ scenes: [] }] },
      })
    ).toThrow('title');
  });

  it('act 缺少 scenes 数组抛出错误', () => {
    expect(() =>
      validateTemplate({
        id: 'x',
        name: 'Test',
        category: 'custom',
        structure: { acts: [{ title: 'Act 1' }] },
      })
    ).toThrow('scenes');
  });
});

describe('downloadTemplateFile', () => {
  it('创建临时 a 标签触发下载', () => {
    const createdElements: HTMLAnchorElement[] = [];
    const clickSpy = vi.fn();
    const originalURL = globalThis.URL;
    const mockURL = {
      createObjectURL: vi.fn(() => 'blob:test'),
      revokeObjectURL: vi.fn(),
    };
    // @ts-expect-error mock
    globalThis.URL = mockURL;

    const createElementSpy = vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = document.implementation.createHTMLDocument().createElement(tag);
      if (tag === 'a') {
        el.click = clickSpy;
      }
      createdElements.push(el as HTMLAnchorElement);
      return el;
    });

    const template = treeToTemplate(makeTree(), makeProject());
    downloadTemplateFile(template);

    expect(mockURL.createObjectURL).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
    expect(mockURL.revokeObjectURL).toHaveBeenCalled();

    createElementSpy.mockRestore();
    globalThis.URL = originalURL;
  });
});
