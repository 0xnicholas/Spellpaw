---
id: cinematography-strategy-designer
name: 摄影策略编排器
description: Orchestrator for cinematography work. Use only when you need to plan camera work for an entire scene end-to-end and need multiple sub-skills in sequence. For a single concern (e.g. just shot sizes, or just transitions), call the specific sub-skill directly: /cinematography-shot-size, /cinematography-camera-movement, /cinematography-camera-angle, /cinematography-transitions, /cinematography-styles, /cinematography-fight, /cinematography-equipment, /cinematography-axis-continuity, /cinematography-vocabulary.
slashCommand: cinematography-strategy-designer
examples: []
parameters: {}
required: []
---
# Cinematography Strategy — Orchestrator

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

1. `get_canvas` — read the scene + shots
2. Call `/cinematography-shot-size` to lock shot sizes per shot
3. Call `/cinematography-camera-movement` to plan movement
4. Call `/cinematography-transitions` to plan shot-to-shot transitions
5. Call `/cinematography-styles` if the user named a director style
6. Apply metadata updates via `update_card` after each sub-skill call

If you only need one of these steps, do NOT load this orchestrator — call the sub-skill directly.

## Atomic tools this orchestrator uses

- `get_canvas` (read) — list scene/shot cards
- `update_card` (write) — apply shot-size / movement / transition metadata
- `batch_apply_style` (write) — apply a director's style across many shots
