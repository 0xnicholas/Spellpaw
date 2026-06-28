// scripts/split-cinematography.mjs
// Extract the 9 reference sub-skills from cinematography-strategy-designer.md
// into standalone sub-skills. Replace the original with a thin dispatcher
// that points to the sub-skills.
//
// Each sub-skill gets:
//   - id and slashCommand = "cinematography-<topic>"
//   - description aligned with the topic
//   - body = original reference content (sans the ## Reference: wrapper)
//
// The orchestrator (cinematography-strategy-designer) gets a short body
// explaining when to use which sub-skill.
//
// Run with: node scripts/split-cinematography.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(__filename), '..');
const CINEMATOGRAPHY = path.join(
  ROOT,
  'src',
  'shared',
  'copilot',
  'skills',
  '__fixtures__',
  'cinematography-strategy-designer.md',
);
const PUBLIC_CINEMATOGRAPHY = path.join(ROOT, 'public', 'skills', 'cinematography-strategy-designer.md');
const OUT_PUBLIC = path.join(ROOT, 'public', 'skills');
const OUT_FIXTURES = path.join(ROOT, 'src', 'shared', 'copilot', 'skills', '__fixtures__');

// Descriptions for each cinematography sub-skill, aligned with current
// Copilot atomic tools.
const SUB_SKILL_DESCRIPTIONS = {
  'shot-size-rules':
    'Use to choose the right shot size (ECU/CU/MS/MLS/LS/ELS) for a scene. Reads scene cards via get_canvas and updates their metadata (shotType) via update_card. Foundation reference for camera-work skills.',
  'camera-movement-rules':
    'Use to plan camera movement (pan/tilt/dolly/tracking/crane) for a sequence of shots. Reads scene/shots via get_canvas, updates metadata.cameraMovement via update_card.',
  'camera-angle-rules':
    'Use to choose the right camera angle (eye-level/high/low/dutch/overhead) for a shot. Reads scene cards via get_canvas, updates metadata.cameraAngle via update_card. Includes dialogue and action-scene angle matrices.',
  'transition-rules':
    'Use to plan transitions between shots (cut/dissolve/wipe/match-cut). Reads multiple scene cards via get_canvas and updates metadata.transition via update_card on each.',
  'cinematography-styles':
    'Use to apply a cinematography style (Hitchcock/Wes Anderson/wong-kar-wai/etc.) consistently across scenes. Reads scene cards, sets style tags + drives batch_apply_style with a style prompt.',
  'fight-cinematography-patterns':
    'Use to plan fight-scene cinematography (coverage, pacing, beat-anchors). Reads scene cards via get_canvas, inserts additional art cards via add_card (type=art) for action keyframes, and updates shot metadata.',
  'camera-equipment':
    'Use to specify camera equipment (lens, body, support) for a scene. Reads scene cards, updates metadata.equipment via update_card. Foundation reference for the other cinematography sub-skills.',
  'axis-continuity-rules':
    'Use to enforce 180-degree axis, screen direction, match-on-action, and eyeline continuity across shots. Reads scene/shots via get_canvas and flags continuity violations by reading metadata + recommending update_card fixes.',
  'shot-camera-vocabulary':
    'Use to standardize cinematography vocabulary (shot types, movements, equipment terms) in scene card descriptions and metadata. Read-only reference — drives update_card with consistent terminology.',
};

/** The orchestrator description — points at the sub-skills. */
const ORCHESTRATOR_DESCRIPTION =
  'Orchestrator for cinematography work. Use only when you need to plan camera work for an entire scene end-to-end and need multiple sub-skills in sequence. For a single concern (e.g. just shot sizes, or just transitions), call the specific sub-skill directly: /cinematography-shot-size, /cinematography-camera-movement, /cinematography-camera-angle, /cinematography-transitions, /cinematography-styles, /cinematography-fight, /cinematography-equipment, /cinematography-axis-continuity, /cinematography-vocabulary.';

/** The orchestrator body — minimal dispatcher. */
const ORCHESTRATOR_BODY = `# Cinematography Strategy — Orchestrator

For most camera-work questions, **call the specific sub-skill directly** rather than this orchestrator:

| Sub-skill | When to use |
| --- | --- |
| /cinematography-shot-size | Choose the right shot size (ECU/CU/MS/MLS/LS/ELS). |
| /cinematography-camera-movement | Plan camera movement (pan/tilt/dolly/tracking/crane). |
| /cinematography-camera-angle | Choose camera angle (eye-level/high/low/dutch/overhead). |
| /cinematography-transitions | Plan transitions between shots (cut/dissolve/wipe/match-cut). |
| /cinematography-styles | Apply a named director's style consistently. |
| /cinematography-fight | Plan fight-scene cinematography (coverage, pacing). |
| /cinematography-equipment | Specify camera equipment (lens/body/support). |
| /cinematography-axis-continuity | Enforce 180-degree axis + eyeline + match-on-action. |
| /cinematography-vocabulary | Standardize cinematography vocabulary in card text. |

## When to use this orchestrator

Use this orchestrator only when:

1. The user explicitly asks for a "full cinematography plan" for a scene, AND
2. You need to combine multiple sub-skills in sequence (e.g. shot size + movement + transition).

In that case, drive a multi-step plan:

1. \`get_canvas\` — read the scene + shots
2. Call \`/cinematography-shot-size\` to lock shot sizes per shot
3. Call \`/cinematography-camera-movement\` to plan movement
4. Call \`/cinematography-transitions\` to plan shot-to-shot transitions
5. Call \`/cinematography-styles\` if the user named a director style
6. Apply metadata updates via \`update_card\` after each sub-skill call

If you only need one of these steps, do NOT load this orchestrator — call the sub-skill directly.

## Atomic tools this orchestrator uses

- \`get_canvas\` (read) — list scene/shot cards
- \`update_card\` (write) — apply shot-size / movement / transition metadata
- \`batch_apply_style\` (write) — apply a director's style across many shots
`;

function buildSubSkillFrontmatter(slug, description) {
  return [
    '---',
    `id: ${slug}`,
    `name: cinematography-${slug.replace(/^cinematography-/, '')}`,
    `description: ${description.replace(/\n/g, ' ')}`,
    `slashCommand: ${slug}`,
    'examples: []',
    'parameters: {}',
    'required: []',
    '---',
    '',
  ].join('\n');
}

function buildOrchestratorFrontmatter() {
  return [
    '---',
    `id: cinematography-strategy-designer`,
    `name: 摄影策略编排器`,
    `description: ${ORCHESTRATOR_DESCRIPTION.replace(/\n/g, ' ')}`,
    `slashCommand: cinematography-strategy-designer`,
    'examples: []',
    'parameters: {}',
    'required: []',
    '---',
    '',
  ].join('\n');
}

function extractReferences(content) {
  // Find each ## Reference: <name> section, capture the body until next ## header
  const refHeaderRe = /^## Reference: (.+)$/gm;
  const headers = [...content.matchAll(refHeaderRe)].map((m) => ({ name: m[1].trim(), start: m.index }));
  const refs = {};
  for (let i = 0; i < headers.length; i++) {
    const h = headers[i];
    const start = h.start;
    const end = i + 1 < headers.length ? headers[i + 1].start : content.length;
    const raw = content.slice(start, end);
    // Drop the "## Reference: <name>\n\n" header and keep the body
    const body = raw.replace(/^## Reference: [^\n]*\n+/, '').trim();
    refs[h.name] = body;
  }
  return refs;
}

function main() {
  const content = fs.readFileSync(CINEMATOGRAPHY, 'utf-8');
  const refs = extractReferences(content);
  const names = Object.keys(refs);
  console.log(`Extracted ${names.length} sub-skill bodies:`, names);

  // Write 9 sub-skill files
  for (const name of names) {
    // Strip leading 'cinematography-' if the original name already has it
    // (e.g. 'cinematography-styles' -> 'styles', 'shot-size-rules' -> 'shot-size-rules')
    const stripped = name.replace(/^cinematography-/, '');
    const slug = `cinematography-${stripped}`;
    const description = SUB_SKILL_DESCRIPTIONS[name];
    if (!description) {
      console.warn(`  ⚠ no description for ${name}, using placeholder`);
    }
    const md = buildSubSkillFrontmatter(slug, description ?? `Cinematography sub-skill: ${name}`) + refs[name];
    fs.writeFileSync(path.join(OUT_PUBLIC, `${slug}.md`), md, 'utf-8');
    fs.writeFileSync(path.join(OUT_FIXTURES, `${slug}.md`), md, 'utf-8');
    console.log(`  ✓ ${slug} (was '${name}')`);
  }

  // Replace the original with a thin orchestrator
  const orchestrator = buildOrchestratorFrontmatter() + ORCHESTRATOR_BODY;
  fs.writeFileSync(CINEMATOGRAPHY, orchestrator, 'utf-8');
  fs.writeFileSync(PUBLIC_CINEMATOGRAPHY, orchestrator, 'utf-8');
  console.log(`\n✓ replaced cinematography-strategy-designer.md with thin orchestrator (${orchestrator.length} bytes)`);
}

main();