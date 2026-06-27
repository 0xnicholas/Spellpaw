# Character Costume Change Workflow

For creating costume change versions of CharacterCostumeCard. Read when the user needs variant costumes while preserving character identity.

## Core Principle

The character before and after costume change must be the SAME person.

**Must remain consistent**: Facial features, hairstyle, body proportions, typical expressions, action gestures, distinctive marks, overall aura.

**Only change**: Clothing, accessories, overall atmosphere, color tone and lighting.

## Applicable Scenarios

- Scene-based: Indoor↔Outdoor, Daily↔Special, Safe↔Danger zones
- Time-period: Seasons, stages, character growth
- Functional: Professional equipment, disguises, special environments

## Workflow

1. **Determine base costume** — most representative existing three-view card
2. **Analyze requirements** — reason, target scene, functional needs, time range
3. **Design new outfit** — match character personality, art direction, scene environment
4. **Create costume change card** — annotate all consistency elements vs. changed elements
5. **Write prompt** — 10+ repetitions of "must match base costume", annotated consistency blocks
6. **Quality check** — side-by-side comparison of base vs. change

## Prompt Technique

- Repeat consistency requirements 10+ times across the prompt
- Annotate each section: "must be completely consistent with base costume"
- Add to negativePrompt: "different person, inconsistent face"
- Use base costume image as ControlNet reference (recommended)

## Quality Checklist

- [ ] Three views show the same character
- [ ] Facial features match base costume exactly
- [ ] Hairstyle matches base costume
- [ ] Body proportions match base costume
- [ ] Expressions/Actions match (only clothing differs)
- [ ] New outfit matches description and target scene

## Naming Convention

`Character Costume Three-View - {Character} - {Costume Name}`

## Case Study

Lin Yuan: Base (King of Undersea Base, premium casual) → Combat Gear variant. 10+ consistency repetitions in prompt, explicit per-section annotations, comparison table, negative prompt with "different person, inconsistent face".
