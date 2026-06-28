---
id: music-prompt-generator
name: music-prompt-generator
description: Use to generate Suno / Udio prompts from a music direction card. Reads the music direction metadata via get_canvas, emits asset cards via add_card (type=asset) with the generated prompt.
slashCommand: music-prompt-generator
examples: []
parameters: {}
required: []
---

# Music Prompt Generator Skill

Generate AI music tool (Suno/Udio) optimized prompts from music asset cards, outputting in priority order.

## Overall Workflow

```
Input: MusicAssetCard

Stage 1: Dependency Check
Stage 2: Select Target BGM/SFX (by priority)
Stage 3: Generate Prompts
  Suno: English tags + style description
  Udio: English natural language description
Stage 4: Generate Variant Prompts (all variants per BGM)
Stage 5: Output Prompt Cards

Output: MusicPromptCard
```

---

## Stage 1: Dependency Check

**Check Item**: Music asset card (required)

**Error Handling**: If absent, prompt user to run `/music-asset-extraction` first

---

## Stage 2: Select Target

Default processing order: P1 → P2 → P3. User can specify:
- Single track: `Generate prompts for "Against the Tide"`
- By priority: `Generate all P1 prompts`
- By type: `Generate all SFX prompts`

---

## Stage 3: Generate Prompts

### Suno Prompt Template

Suno uses **style tags + short description**, kept within 200 characters:

```
[genre tags], [mood tags], [instrument tags], [tempo], [production style], [vocal tag]
```

**Vocal tag rules** (auto-appended based on `vocalType`):

| vocalType | Appended Tag |
|-----------|---------|
| `instrumental` | `instrumental, no vocals` |
| `with_vocals` | No append (Suno generates vocals by default) |
| `optional` | Generate two versions: one with `instrumental, no vocals`, one without |

**Mood → Tag Mapping Table**:

| Mood | Style Tags | Mood Tags | Instrument Tags |
|------|---------|---------|---------|
| Satisfaction / Power-up | electronic, synthpop | energetic, triumphant, satisfying | synthesizer, drum machine, bass synth |
| Comedy / Absurdity | indie pop, quirky | playful, lighthearted, comedic | clean guitar, music box, light synth |
| Tension / Crisis | electronic, dark synth | tense, urgent, suspenseful | bass synth, fast drums, high-freq synth |
| Revenge / Coldness | dark electronic, minimal | cold, calculated, controlled | bass loop, minimal percussion, dark pad |
| Grief-rage / Awakening | cinematic electronic | emotional, building, powerful | piano, bass synth, drums crescendo |
| Warmth / Protection | ambient pop | warm, gentle, heartfelt | piano, warm pad, soft strings |
| Suspense / Cliffhanger | electronic, minimal | mysterious, anticipating | context-dependent, short stinger |

**Example (Theme "Against the Tide")**:
```
electronic, synthpop, energetic, confident, uplifting, not epic,
synthesizer lead, drum machine, bass synth, piano accent,
120 BPM, modern production, short drama style, loop-friendly
```

**Example (Comedy Theme "Collapse")**:
```
indie pop, quirky, playful, comedic, lighthearted,
clean guitar, music box, light synth, electronic drums,
110 BPM, bouncy rhythm, sudden key change variation available
```

---

### Udio Prompt Template

Udio supports longer natural language descriptions, kept within 500 characters:

```
{mood description}. {instrumentation}. {tempo and rhythm}. 
{production notes}. {usage context}. {what to avoid}.
```

**Example (Awakening Theme "Daybreak")**:
```
Emotional electronic music that builds from quiet despair to powerful 
resolution. Starts with simple piano chords and low bass drone at 90 BPM, 
gradually adds electronic drums that intensify, culminating in a bright 
synthesizer burst at 150 BPM. Not orchestral or epic — powerful but 
intimate. For a pivotal emotional scene in a fast-paced Chinese web drama. 
Avoid full orchestra, choir, or overly cinematic sound.
```

---

## Stage 4: Generate Variant Prompts

Each BGM variant generates a separate prompt, appending variant description to the main prompt:

| Variant Type | Appended Description |
|---------|---------|
| Short version (30-45s) | `short version, 30 seconds, no intro` |
| Loop version | `seamless loop, no fade in/out` |
| Crescendo version | `starts quiet, builds gradually, full energy at end` |
| Instrumental only | `instrumental only, no vocals` |
| Sudden shift (comedy twist) | `starts serious for 5 seconds, then suddenly switches to playful` |

---

## Stage 5: Output Prompt Cards

### Output Format

Each BGM/SFX outputs one prompt block:

```markdown
## {bgm_name}（{bgmId}）

**Purpose**: {usage description}
**Priority**: {P1/P2/P3}

### Suno Prompt
**Main Version**:
{suno_prompt}

**Variant - {variation_name}**:
{suno_prompt_variation}

### Udio Prompt
**Main Version**:
{udio_prompt}

---
```

### Card Structure

```typescript
interface MusicPromptCard {
  id: string;
  type: 'music_prompt';
  title: string;  // e.g., "[Show Title] - Music Prompts"

  content: {
    upstreamCards: { musicAssetCard: string };
    bgmPrompts: Array<{
      bgmId: string;
      name: string;
      priority: 'P1' | 'P2' | 'P3';
      suno: {
        main: string;
        variations: Record<string, string>;
      };
      udio: {
        main: string;
        variations: Record<string, string>;
      };
    }>;
    sfxPrompts: Array<{
      sfxId: string;
      name: string;
      category: string;
      suno: string;
      udio: string;
      note: string;  // SFX are usually better suited for sound libraries than AI generation, noted here
    }>;
  };
}
```

---

## SFX Special Handling

SFX (sound effects) differ from BGM — AI music tools produce limited results. Provide two options per SFX:

1. **AI Generation Prompt** (Suno/Udio): Suitable for ambient sound effects
2. **Sound Library Keyword Recommendations** (Freesound/Epidemic Sound): Suitable for specific sound effects

| SFX Category | Recommended Approach |
|---------|---------|
| environment | AI generation (ambient effects work well) |
| ui | Sound library (system notification sounds require high precision) |
| special | Sound library + post-processing (corpse manipulation, crystal cores, etc. require precise control) |
| character | Sound library (zombie sounds require realism) |

---

## Test Cases

**Input**: Zombie apocalypse short drama music asset card, generate P1 BGM prompts

**Expected Output**:
- "Against the Tide": Suno + Udio 1 set each, with 4 variants
- "Power Up": Suno + Udio 1 set each, with 3 variants
- "Undercurrent": Suno + Udio 1 set each, with 3 variants
- "Daybreak": Suno + Udio 1 set each, with 2 variants

---

## Implementation Checklist

- [ ] Stage 1: Dependency check complete
- [ ] Stage 2: Target BGM/SFX selected
- [ ] Stage 3: Main prompts generated (Suno + Udio)
- [ ] Stage 4: All variant prompts generated
- [ ] Stage 5: Prompt card output, clear format ready for use

---

**Skill Version**: v1.0  
**Created**: 2026-05-29  
**Test Status**: Pending

## Next Step After Completion

Completion criteria: `MusicPromptCard` created, BGM and SFX prompt versions saved.

No mandatory downstream at present. The music branch does not currently feed into the main video pipeline; users can save prompts, continue generating music versions, or return to `production-coordinator` to advance specific scene production.

Recommended phrasing: `Music prompts are complete. The music branch currently does not block the main video pipeline — you can continue music production or return to specific scene video production.`
