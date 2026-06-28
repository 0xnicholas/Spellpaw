import { describe, it, expect } from 'vitest';
import { parseFrontmatter } from '@shared/copilot/skills/frontmatter';

describe('parseFrontmatter', () => {
  it('parses simple key:value pairs', () => {
    const md = `---
id: analyze-pacing
name: 节奏分析
description: 深入分析
---

# Body content
`;
    const { meta, body } = parseFrontmatter(md);
    expect(meta).toEqual({
      id: 'analyze-pacing',
      name: '节奏分析',
      description: '深入分析',
    });
    expect(body).toContain('# Body content');
  });

  it('parses inline arrays', () => {
    const md = `---
id: x
examples: ["/foo", "/foo bar", "/baz"]
required: []
---

body`;
    const { meta } = parseFrontmatter(md);
    expect(meta.examples).toEqual(['/foo', '/foo bar', '/baz']);
    expect(meta.required).toEqual([]);
  });

  it('parses inline empty and non-empty objects', () => {
    const md = `---
id: x
parameters: {}
settings: { retries: 3, timeout: 30 }
---

body`;
    const { meta } = parseFrontmatter(md);
    expect(meta.parameters).toEqual({});
    expect(meta.settings).toEqual({ retries: '3', timeout: '30' });
  });

  it('parses quoted values', () => {
    const md = `---
id: "has spaces"
description: 'with single'
---

`;
    const { meta } = parseFrontmatter(md);
    expect(meta.id).toBe('has spaces');
    expect(meta.description).toBe('with single');
  });

  it('parses nested objects (one level)', () => {
    const md = `---
parameters:
  focusArea:
    type: string
    description: 可选，聚焦某段
---

`;
    const { meta } = parseFrontmatter(md);
    expect(meta.parameters).toEqual({
      focusArea: {
        type: 'string',
        description: '可选，聚焦某段',
      },
    });
  });

  it('parses YAML list syntax (`- item` at indent+2)', () => {
    const md = `---
id: character-profile
examples:
  - /character-profile 姓名:林
  - /character-profile 姓名:顾言 年龄:28
required: ["姓名"]
---

body`;
    const { meta } = parseFrontmatter(md);
    expect(meta.id).toBe('character-profile');
    expect(meta.examples).toEqual([
      '/character-profile 姓名:林',
      '/character-profile 姓名:顾言 年龄:28',
    ]);
    expect(meta.required).toEqual(['姓名']);
  });

  it('parses mixed top-level entries', () => {
    const md = `---
id: character-profile
name: 创建角色卡
slashCommand: character-profile
examples: ["/character-profile 姓名:林"]
parameters:
  姓名:
    type: string
    description: 必填
required: ["姓名"]
---

body`;
    const { meta } = parseFrontmatter(md);
    expect(meta).toEqual({
      id: 'character-profile',
      name: '创建角色卡',
      slashCommand: 'character-profile',
      examples: ['/character-profile 姓名:林'],
      parameters: {
        姓名: { type: 'string', description: '必填' },
      },
      required: ['姓名'],
    });
  });

  it('skips comments and empty lines', () => {
    const md = `---
# this is a comment
id: foo

name: bar
---

body`;
    const { meta } = parseFrontmatter(md);
    expect(meta).toEqual({ id: 'foo', name: 'bar' });
  });

  it('throws on missing opening fence', () => {
    expect(() => parseFrontmatter('id: foo\n---\nbody')).toThrow(/start with/);
  });

  it('throws on missing closing fence', () => {
    expect(() => parseFrontmatter('---\nid: foo\nbody')).toThrow(/closing/);
  });
});
