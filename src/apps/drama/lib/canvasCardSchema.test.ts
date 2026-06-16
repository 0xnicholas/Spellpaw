import { describe, it, expect, beforeEach } from 'vitest';
import { useProjectStore } from '@drama/stores/projectStore';
import { validateCanvasCardPayload, normalizeCardData } from './canvasCardSchema';

function seedTree(): void {
  const store = useProjectStore.getState();
  store.createProject('test-proj', '', '#6366f1');
  const rootNode = store.getCurrentTree()!;
  store.addTreeNode(rootNode.id, {
    id: 'act-1', type: 'act', title: '第一幕', status: 'draft',
    metadata: { createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
  });
  store.addTreeNode('act-1', {
    id: 'scene-1', type: 'scene', title: '场景 1', status: 'draft',
    metadata: { duration: 30, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
  });
}

describe('canvasCardSchema — validateCanvasCardPayload', () => {
  beforeEach(() => {
    useProjectStore.setState({ trees: {}, currentProjectId: null, selectedNodeId: null });
  });

  it('通过 script 卡片校验', () => {
    seedTree();
    const result = validateCanvasCardPayload({
      cardType: 'script',
      data: {
        title: '剧本卡',
        description: '场景描述',
        status: 'draft',
        dialogue: '对白',
        linkedTreeNodeId: 'scene-1',
      },
    });
    expect(result.valid).toBe(true);
  });

  it('通过 art 卡片校验', () => {
    seedTree();
    const result = validateCanvasCardPayload({
      cardType: 'art',
      data: {
        title: '美术参考',
        thumbnail: 'https://example.com/img.jpg',
        tags: ['风格A'],
      },
    });
    expect(result.valid).toBe(true);
  });

  it('通过 character 卡片校验', () => {
    const result = validateCanvasCardPayload({
      cardType: 'character',
      data: { title: '角色 A', status: 'in_progress' },
    });
    expect(result.valid).toBe(true);
  });

  it('通过 deliverable 卡片校验', () => {
    const result = validateCanvasCardPayload({
      cardType: 'deliverable',
      data: {
        title: '成片',
        deliverableType: 'video',
        duration: 60,
        resolution: '1080x1920',
      },
    });
    expect(result.valid).toBe(true);
  });

  it('拒绝未知 cardType', () => {
    const result = validateCanvasCardPayload({
      cardType: 'unknown',
      data: { title: 'x' },
    });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('cardType 无效');
  });

  it('拒绝缺少 title', () => {
    const result = validateCanvasCardPayload({
      cardType: 'script',
      data: { description: '无标题' },
    });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('title');
  });

  it('拒绝无效 status', () => {
    const result = validateCanvasCardPayload({
      cardType: 'script',
      data: { title: 'x', status: 'invalid' },
    });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('status');
  });

  it('拒绝无效 deliverableType', () => {
    const result = validateCanvasCardPayload({
      cardType: 'deliverable',
      data: { title: 'x', deliverableType: 'pdf' },
    });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('deliverableType');
  });

  it('拒绝不存在的 linkedTreeNodeId', () => {
    seedTree();
    const result = validateCanvasCardPayload({
      cardType: 'script',
      data: { title: 'x', linkedTreeNodeId: 'non-existent' },
    });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('linkedTreeNodeId');
  });

  it('拒绝非法 position', () => {
    const result = validateCanvasCardPayload({
      cardType: 'script',
      data: { title: 'x' },
      position: { x: '100', y: 200 },
    });
    expect(result.valid).toBe(false);
    expect(result.error).toContain('position.x');
  });
});

describe('canvasCardSchema — normalizeCardData', () => {
  it('script 类型保留 dialogue 和 notes', () => {
    const data = normalizeCardData('script', {
      title: '剧本卡',
      dialogue: '对白',
      notes: '备注',
      extra: '应被忽略',
    });
    expect(data.title).toBe('剧本卡');
    expect(data.dialogue).toBe('对白');
    expect(data.notes).toBe('备注');
    expect(data).not.toHaveProperty('extra');
  });

  it('art 类型把 prompt 映射到 generatedPrompt', () => {
    const data = normalizeCardData('art', {
      title: '美术',
      prompt: 'a cinematic scene',
    });
    expect(data.generatedPrompt).toBe('a cinematic scene');
  });

  it('deliverable 类型保留专有字段', () => {
    const data = normalizeCardData('deliverable', {
      title: '成片',
      deliverableType: 'video',
      fileSize: 1024,
      resolution: '1080x1920',
    });
    expect(data.deliverableType).toBe('video');
    expect(data.fileSize).toBe(1024);
    expect(data.resolution).toBe('1080x1920');
  });
});
