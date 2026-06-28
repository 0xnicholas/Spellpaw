---
id: music-asset-extraction
name: music-asset-extraction
description: Use when a MusicDirectionCard has been generated and BGM/SFX lists need to be extracted, production priorities need to be ranked, and MusicAssetCards need to be created
slashCommand: music-asset-extraction
examples: []
parameters: {}
required: []
---

# Music Asset Extraction Skill

Extracts BGM and SFX information from the music direction card (creation zone), creates music asset cards (asset zone — intermediate assets).

## Overall Workflow

```
Input: MusicDirectionCard (music direction card, from creation zone)

Phase 1: Dependency check
Phase 2: Extract inherited info (global style + BGM list + SFX list)
Phase 3: Generate production priority ranking
  Sort BGMs by importance and usage frequency
  Group SFXs by category
Phase 4: User confirmation and supplementation
  Confirm BGM priorities
  Supplement special production requirements
Phase 5: Create music asset cards

Output: MusicAssetCard (music asset card)
```

---

## Phase 1: Dependency Check

**Check Item**: Music Direction Card (required)

**Error Handling**: If not present, prompt the user to run `/music-direction` first

---

## Phase 2: Extract Inherited Information

```typescript
interface InheritedMusicInfo {
  globalStyle: {
    styleDescription: string;
    primaryInstruments: string[];
    forbiddenInstruments: string[];
    tempoRange: string;
    emotionalMapping: Array<{
      emotion: string;
      musicalTreatment: string;
      instruments: string[];
      tempo: string;
    }>;
  };
  bgmList: Array<{
    bgmId: string;
    name: string;
    type: 'main_theme' | 'action' | 'scene_theme' | 'character_theme' | 'emotional_theme' | 'ending';
    mood: string;
    tempo: string;
    keyInstruments: string[];
    duration: string;
    variations: string[];
    usageScenarios: Array<{ sceneType: string; trigger: string }>;
    vocalType: 'instrumental' | 'with_vocals' | 'optional';  // confirmed by user in Phase 4
  }>;
  sfxList: Array<{
    sfxId: string;
    name: string;
    category: 'ui' | 'special' | 'character' | 'environment';
    description: string;
    duration: string;
    intensity: 'subtle' | 'moderate' | 'prominent';
    variations: string[];
  }>;
}
```

---

## Phase 3: Generate Production Priority Ranking

### BGM Priority Rules

| BGM Type | Priority | Reason |
|---------|--------|------|
| main_theme | P1 | Used every episode, highest frequency |
| action | P1 | High-frequency use in satisfaction/tension scenes |
| emotional_theme (series climax) | P1 | Highest emotional point, highest quality requirement |
| character_theme | P2 | Character-specific, medium frequency |
| scene_theme | P2 | Specific scene usage |
| emotional_theme (other) | P2 | Medium frequency |
| ending | P3 | End of each episode, but short content |

### SFX Grouping

- **Required group**: `special` category (corpse control, crystal core, and other plot-core SFX)
- **High-frequency group**: `ui` category (system notifications, comedic punctuation)
- **Environment group**: `environment` category (can be batch-produced or sourced from sound libraries)
- **Character group**: `character` category (zombie sounds, etc.)

---

## Phase 4: User Confirmation and Supplementation

After presenting the priority ranking to the user, guide supplementation:

```
## Soundtrack Production Checklist

### P1 Priority Production (X tracks total)
1. **{bgm_name}** - {mood} - {tempo}
   Variations: {variations}

...

### Vocal Settings (Required)
Please confirm whether each BGM needs vocals:

| BGM | Default Recommendation | Your Choice |
|-----|---------|---------|
| Main Theme "逆潮" | with_vocals (main theme, can have vocals) | |
| Satisfaction Theme "升级" | instrumental (BGM, instrumental only) | |
| ... | ... | |

Notes:
- **with_vocals**: allow vocals/humming during AI generation
- **instrumental**: instrumental only; append `instrumental only, no vocals` to the prompt
- **optional**: generate both versions; choose later in post-production

### Special Production Requirements
Please supplement the following information (if any):

**Reference tracks** (e.g. similar to the style of "XXX", strongly recommended; significantly improves accuracy):
**Production tool** (e.g. Suno / Udio / manual production):
**Platform constraints** (e.g. volume/format requirements for Hongguo platform):
**Delivery format** (e.g. MP3 128kbps / WAV 44.1kHz):
```

### Vocal Default Inference Rules

When the user does not explicitly specify, auto-infer according to the following rules:

| BGM Type | Default vocalType |
|---------|--------------|
| main_theme | `with_vocals` |
| All other types | `instrumental` |

---

## Phase 5: Create Music Asset Card

```typescript
interface MusicAssetCard {
  id: string;
  type: 'music_asset';
  title: string;  // e.g. "[Series Name] - Soundtrack Assets"

  content: {
    upstreamCards: { musicDirectionCard: string };
    inheritedInfo: InheritedMusicInfo;
    productionPlan: {
      bgmPriority: Array<{
        priority: 'P1' | 'P2' | 'P3';
        bgmId: string;
        name: string;
        estimatedDuration: string;
      }>;
      sfxGroups: {
        required: string[];    // sfxId list
        highFreq: string[];
        environment: string[];
        character: string[];
      };
    };
    userInput: {
      referenceTrack?: string;
      platformRequirements?: string;
      productionTool: string;
      deliveryFormat: string;
    };
    downstreamMusicCards: string[];
  };
}
```

---

## Test Cases

**Input**: Zombie apocalypse short-form drama music direction card (8 BGMs + 10 SFXs)

**Expected Output**:
- P1: Main Theme "逆潮", Satisfaction Theme "升级", Tension Theme "暗涌", Awakening Theme "破晓"
- P2: Comedy Theme "崩坏", Revenge Theme "冷锋", Warmth Theme "港湾"
- P3: Ending Cliffhanger "待续"
- Required SFX: Corpse control activation SFX, crystal core SFX, circular metal door SFX

---

## Implementation Checklist

- [ ] Phase 1: Dependency check completed
- [ ] Phase 2: BGM list and SFX list fully extracted
- [ ] Phase 3: Priority ranking completed
- [ ] Phase 4: User confirmed production checklist, supplemented production requirements
- [ ] Phase 5: Music asset card successfully created

---

**Skill Version**: v1.0  
**Created Date**: 2026-05-29  
**Test Status**: Pending test

## Next Step After Completion

Completion criteria: `MusicAssetCard` has been created, with BGM/SFX lists, priorities, and vocal settings confirmed.

Prefer calling `music-prompt-generator` to generate music prompts usable by tools like Suno/Udio.

Suggested message: `The soundtrack asset list is complete. You can call music-prompt-generator to generate music prompts; the music branch does not currently block the main video pipeline.`
