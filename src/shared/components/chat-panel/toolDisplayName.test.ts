import { describe, it, expect } from 'vitest';
import { toolDisplayName } from './toolDisplayName';

describe('toolDisplayName', () => {
  it('maps known atomic tools to user-friendly labels', () => {
    expect(toolDisplayName('spellpaw_add_card')).toBe('Creating card…');
    expect(toolDisplayName('spellpaw_apply_style')).toBe('Applying style…');
    expect(toolDisplayName('spellpaw_get_pacing_report')).toBe('Analyzing pacing…');
    expect(toolDisplayName('spellpaw_clear_canvas')).toBe('Clearing canvas…');
  });

  it('maps skill tools to "Running {Name}…" using the suffix', () => {
    expect(toolDisplayName('spellpaw_skill_character-profile')).toBe(
      'Running Character Profile…',
    );
    expect(toolDisplayName('spellpaw_skill_brainstorm_variants')).toBe(
      'Running Brainstorm Variants…',
    );
  });

  it('falls back to de-prefixed title-case for unknown tools', () => {
    expect(toolDisplayName('spellpaw_future_thing')).toBe('Future Thing');
    expect(toolDisplayName('spellpaw_x')).toBe('X');
  });

  it('handles bare name without prefix gracefully', () => {
    expect(toolDisplayName('add_card')).toBe('Add Card');
  });

  it('returns consistent label for the same input (no side effects)', () => {
    expect(toolDisplayName('spellpaw_add_node')).toBe(toolDisplayName('spellpaw_add_node'));
  });
});