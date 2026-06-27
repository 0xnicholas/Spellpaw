# Spellpaw Skills

AI-assisted short drama production skills — 19 skills across 3 zones covering the full pipeline from script to video.

## Directory

```
skills/
├── README.md
├── script-ingestion/                   # Creation — script upload
├── script-deconstruct/                 # Creation — script decomposition (orchestrates art-direction + music-direction)
├── art-direction/                      # Creation — visual art direction (sub-skill)
├── music-direction/                    # Creation — music direction (sub-skill)
├── character-asset-extraction/         # Assets — character visual translation
├── character-costume-designer/         # Assets — character costume three-views
├── scene-asset-extraction/             # Assets — scene visual translation
├── scene-generator/                    # Assets — scene concept images
├── prop-asset-extraction/              # Assets — prop visual translation
├── prop-generator/                     # Assets — prop multi-view images
├── music-asset-extraction/             # Assets — BGM/SFX inventory
├── music-prompt-generator/             # Assets — Suno/Udio prompts
├── production-coordinator/             # Production — scene detail card + asset check
├── scene-strategy-designer/            # Production — lighting, color, character blocking
├── performance-strategy-designer/      # Production — action, expression, dialogue delivery
├── cinematography-strategy-designer/   # Production — shot breakdown, camera, transitions
├── director-briefing/                  # Production — director hub (precheck → dispatch → review → finalize)
├── storyboard-creator/                 # Production — key-shot images + motion storyboard
└── video-creator/                      # Production — video generation
```

## Full Pipeline

```
SCRIPT
  │
  ├─ script-ingestion → FullScriptCard
  └─ script-deconstruct
       ├─ EpisodeSceneTableCard
       ├─ StoryCoreCard, WorldviewCard, PlotPacingCard
       ├─ CharacterSettingCard[] → character-asset-extraction → CharacterAssetCard → character-costume-designer → CharacterCostumeCard
       ├─ SceneSettingCard[]      → scene-asset-extraction      → SceneAssetCard      → scene-generator            → SceneConceptCard
       ├─ PropSettingCard[]       → prop-asset-extraction       → PropAssetCard       → prop-generator             → PropConceptCard
       ├─ art-direction           → ArtDirectionCard
       └─ music-direction         → MusicDirectionCard → music-asset-extraction → MusicAssetCard → music-prompt-generator → MusicPromptCard
            │                                                                                       (music branch, non-blocking)
            ▼
PRODUCTION (per scene)
  │
  ├─ production-coordinator → EpisodeSceneDetailCard
  ├─ director-briefing (1st pass) → DirectorBriefingCard.precheck
  ├─ scene-strategy-designer      → SceneStrategyCard       ┐
  ├─ performance-strategy-designer → PerformanceStrategyCard ├─ (parallel)
  └─ cinematography-strategy-designer → CinematographyStrategyCard ┘
       │
       ▼
  director-briefing (2nd pass) → StoryboardPlanCard
       │
       ▼
  storyboard-creator → StoryboardCard
       │
       ▼
  video-creator → VideoCard
```

### Quick Reference

| # | Skill | Input → Output | Lines |
|---|-------|---------------|-------|
| 1 | `script-ingestion` | Script file → FullScriptCard | 121 |
| 2 | `script-deconstruct` | FullScriptCard → 7 card types + sub-skills | 639 |
| 3 | `art-direction` | Script + user style → ArtDirectionCard | 971 |
| 4 | `music-direction` | Script + user style → MusicDirectionCard | 680 |
| 5 | `character-asset-extraction` | CharacterSettingCard → CharacterAssetCard | 644 |
| 6 | `character-costume-designer` | CharacterAssetCard → CharacterCostumeCard | 356 |
| 7 | `scene-asset-extraction` | SceneSettingCard → SceneAssetCard | 415 |
| 8 | `scene-generator` | SceneAssetCard → SceneConceptCard | 417 |
| 9 | `prop-asset-extraction` | PropSettingCard → PropAssetCard | 514 |
| 10 | `prop-generator` | PropAssetCard → PropConceptCard | 417 |
| 11 | `music-asset-extraction` | MusicDirectionCard → MusicAssetCard | 220 |
| 12 | `music-prompt-generator` | MusicAssetCard → MusicPromptCard | 237 |
| 13 | `production-coordinator` | EpisodeSceneTableCard → EpisodeSceneDetailCard | 740 |
| 14 | `scene-strategy-designer` | DetailCard + AssetCard → SceneStrategyCard | 663 |
| 15 | `performance-strategy-designer` | DetailCard + CharacterCards → PerformanceStrategyCard | 990 |
| 16 | `cinematography-strategy-designer` | DetailCard + StrategyCards → CinematographyStrategyCard | 555 |
| 17 | `director-briefing` | DetailCard + 3 StrategyCards → StoryboardPlanCard | 1,463 |
| 18 | `storyboard-creator` | StoryboardPlanCard → StoryboardCard | 757 |
| 19 | `video-creator` | StoryboardCard → VideoCard | 741 |

## Skill File Convention

Each skill directory:

```
skill-name/
├── SKILL.md              # Workflow + rules (required)
└── references/           # Reference data, schemas, examples (optional)
    ├── *.md              # Heavy reference tables, vocabularies
    └── *.json            # Example card outputs
```

**SKILL.md** frontmatter:
```yaml
---
name: skill-name
description: Use when [triggering conditions in third person]
---
```

**Key principle**: SKILL.md = workflow + decision points. Reference data, large examples, and schemas go in `references/`. Do not inline massive tables or JSON in SKILL.md.

## Recent Optimizations (2026-06-27)

- All 19 skills: proper YAML frontmatter with English descriptions
- Extracted inline reference data to `references/` files across 9 oversized skills
- Total SKILL.md line count reduced by ~32% (17k → 11.5k)
- Deleted junk files (empty `build-a-story.md`, `.DS_Store`)
- Removed unsupported frontmatter fields (`version`, `author`, `tags`)
- Largest reductions: scene-generator (-63%), character-costume-designer (-64%), scene-asset-extraction (-48%)
