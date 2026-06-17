import { describe, it, expect } from 'vitest';
import { detectIntent, intentToToolChoice } from './intentRouter';
import type { CanvasNode } from '@drama/types';

describe('intentRouter', () => {
  const sceneNodeId = 'scene-1';
  const selectedCard: CanvasNode = {
    id: 'card-1',
    type: 'art',
    position: { x: 0, y: 0 },
    data: { title: '参考图' },
  };

  it('detects generate_asset for a selected scene node', () => {
    const result = detectIntent('给这个场景生成一张参考图', { selectedNodeId: sceneNodeId });
    expect(result.confidence).toBe('high');
    expect(result.intent.type).toBe('generate_asset');
    expect(result.intent.mediaType).toBe('image');
    expect(result.intent.payload.nodeId).toBe(sceneNodeId);
  });

  it('detects video generation request', () => {
    const result = detectIntent('为这个场景生成一段视频', { selectedNodeId: sceneNodeId });
    expect(result.confidence).toBe('high');
    expect(result.intent.mediaType).toBe('video');
  });

  it('detects generate_variants for a selected card', () => {
    const result = detectIntent('再来几个版本', { selectedCard });
    expect(result.confidence).toBe('high');
    expect(result.intent.type).toBe('generate_variants');
    expect(result.intent.payload.cardId).toBe('card-1');
    expect(result.intent.payload.count).toBe(3);
  });

  it('detects variant count from message', () => {
    const result = detectIntent('给我5个版本', { selectedCard });
    expect(result.confidence).toBe('high');
    expect(result.intent.payload.count).toBe(5);
  });

  it('detects edit_asset for a selected card', () => {
    const result = detectIntent('把这张图改成雨夜场景', { selectedCard });
    expect(result.confidence).toBe('high');
    expect(result.intent.type).toBe('edit_asset');
    expect(result.intent.payload.cardId).toBe('card-1');
  });

  it('detects apply_style for a selected card', () => {
    const result = detectIntent('把它变成赛博朋克风格', { selectedCard });
    expect(result.confidence).toBe('high');
    expect(result.intent.type).toBe('apply_style');
    expect(result.intent.payload.sourceCardId).toBe('card-1');
    expect(result.intent.payload.stylePrompt).toContain('赛博朋克');
  });

  it('detects batch_apply_style for a selected tree node', () => {
    const result = detectIntent('把这个场景统一成油画风格', { selectedNodeId: sceneNodeId });
    expect(result.confidence).toBe('high');
    expect(result.intent.type).toBe('batch_apply_style');
    expect(result.intent.payload.nodeIds).toEqual([sceneNodeId]);
  });

  it('returns high confidence for a free-form generation prompt without a node', () => {
    const result = detectIntent('画一张赛博朋克猫', {});
    expect(result.confidence).toBe('high');
    expect(result.intent.type).toBe('generate_asset');
    expect(result.intent.payload.prompt).toContain('赛博朋克猫');
  });

  it('uses linked tree node when a canvas card is selected', () => {
    const linkedCard: CanvasNode = {
      id: 'card-linked',
      type: 'sceneCard',
      position: { x: 0, y: 0 },
      data: { title: '场景卡', linkedTreeNodeId: 'scene-2' },
    };
    const result = detectIntent('生成参考图', { selectedCard: linkedCard });
    expect(result.confidence).toBe('high');
    expect(result.intent.type).toBe('generate_asset');
    expect(result.intent.payload.nodeId).toBe('scene-2');
  });

  it('returns medium confidence when generation intent has neither node nor prompt', () => {
    const result = detectIntent('生成一张图', {});
    expect(result.confidence).toBe('medium');
    expect(result.intent.type).toBe('generate_asset');
  });

  it('returns unknown for irrelevant messages', () => {
    const result = detectIntent('今天天气怎么样', { selectedNodeId: sceneNodeId });
    expect(result.confidence).toBe('low');
    expect(result.intent.type).toBe('unknown');
  });

  it('maps intent to tool_choice', () => {
    const choice = intentToToolChoice({
      type: 'generate_asset',
      mediaType: 'image',
      payload: { action: 'generate_asset', nodeId: 'x', mediaType: 'image' },
    });
    expect(choice).toEqual({ type: 'function', function: { name: 'spellpaw_generate_asset' } });
  });

  it('returns undefined tool_choice for unknown intent', () => {
    const choice = intentToToolChoice({ type: 'unknown', payload: {} });
    expect(choice).toBeUndefined();
  });
});
