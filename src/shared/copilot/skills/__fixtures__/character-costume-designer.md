---
id: character-costume-designer
name: character-costume-designer
description: Use to design character costume variants and three-view sheets. Reads a character card via get_canvas, then drives update_card (description, tags) and generate_variants + generate_asset to emit costume variants as art cards.
slashCommand: character-costume-designer
examples: []
parameters: {}
required: []
---

# Character Costume Designer Skill

## Overview
The Character Costume Designer is responsible for generating formal `CharacterCostumeCard` from `CharacterAssetCard.costumeRequirements[]`. Costume designs include hairstyle, makeup, clothing, accessories, three-view image versions, and user confirmation status, providing unified character visual assets for the production zone, performance strategy, storyboarding, and video generation.

The legacy capability of "extracting costume details directly from scripts" only serves as a legacy auxiliary information source, no longer the primary entry point, and must not bypass `CharacterAssetCard` to directly produce costume cards for downstream use.

## Current Authoritative Input and Output

**Primary Input**:

- `CharacterAssetCard`
- One costume requirement from `CharacterAssetCard.content.costumeRequirements[]`
- Optional `ArtDirectionCard`
- Optional `WorldviewCard`
- Optional `baseCostumeCardId` for costume changes

**Sole Formal Output**:

- `CharacterCostumeCard`

## CharacterCostumeCard Formal Schema

```typescript
interface CharacterCostumeCard extends BaseCard {
  cardId: string;
  cardType: "CharacterCostumeCard";
  type: "character_costume";
  title: string;
  upstreamCards: CardRef[];

  characterId: string;
  characterName: string;
  characterAssetCardId: string;

  costumeId: string;
  costumeName: string;
  formName: string;
  episodeRange: string;
  sceneIds: string[];
  baseCostumeCardId?: string;

  worldAlignment: {
    worldviewCardId?: string;
    ethnicity?: string;
    hairColor?: string;
    eyeColor?: string;
    skinTone?: string;
    facialFeatureNotes?: string;
    userConfirmed: boolean;
  };

  costumeDesign: {
    physicalDetails: string;
    hairstyle: string;
    makeup: string;
    clothing: string;
    accessories: string;
    colorPalette: string[];
    materialNotes: string[];
    consistencyLocks: string[];     // Elements that must remain consistent during costume changes: face, hairstyle, body type, distinctive marks, etc.
  };

  promptPackage: {
    modelTargets: Array<"gpt-image-2" | "gemini" | "seedance-5" | string>;
    prompt: string;
    negativePrompt?: string;
    aspectRatio: "16:9";
    layout: "character-design-sheet";
  };

  imageVersions: Array<{
    versionId: string;
    image: ImageReference;
    promptSnapshot: string;
    generatedAt: string;
    qualityChecks: {
      characterConsistency: boolean;
      threeViewCompleteness: boolean;
      expressionActionReadable: boolean;
      styleConsistency: boolean;
      notes?: string;
    };
    userConfirmed: boolean;
    stale: boolean;
  }>;

  selectedVersionId?: string;
  approvedImage?: ImageReference;
  userConfirmed: boolean;
  stale: boolean;
  confirmation?: ConfirmationRecord;
}
```

**Hard Rules**:

1. The production zone only reads `CharacterCostumeCard.cardId` / `costumeId` / `characterId` / `approvedImage` / `selectedVersionId` / `userConfirmed` / `stale`.
2. When `userConfirmed !== true` or `stale === true`, it must not serve as the authoritative character image for storyboarding and video.
3. Costume change cards must fill in `baseCostumeCardId` and list elements that must remain consistent in `costumeDesign.consistencyLocks`.
4. `imageVersions[]` stores all generated versions, `selectedVersionId` points to the user-confirmed version, `approvedImage` must reference the same version's image.

## Core Responsibilities

### 0. Worldview Alignment & Ethnicity Feature Confirmation (NEW - v1.2.0)
Before generating character costumes, worldview alignment must be performed first:
- **Read Worldview Settings**: Confirm story location, cultural background, primary population ethnicity
- **Confirm Character Ethnicity Features**: Infer or confirm the character's ethnicity, hair color, eye color, skin tone based on worldview
- **Ethnicity Information Inheritance**: Fully record ethnicity information into the character costume asset card
- **Image Generation Constraint**: Ensure three-view prompts explicitly declare ethnicity features to prevent AI models from defaulting to Western appearances

**Importance**: AI image generation models (GPT-Image-2, Gemini, etc.) default to generating Western facial features. In stories set in China, if ethnicity features are not explicitly specified, characters may appear Western, severely violating worldview settings.

See: `/docs/角色资产管线-种族地域特征对齐规范.md`

### 1. Costume Detail Extraction
Identify and extract from the script:
- **Hairstyle Design**: Length, color, styling, texture
- **Makeup Style**: Base makeup, eye makeup, lip makeup, special effects
- **Clothing Design**: Style, color, material, aesthetic
- **Accessory Details**: Jewelry, hats, bags, shoes, etc.
- **Overall Style**: Fashion level, era feel, occupational characteristics

### 2. Scene Costume Variations
- Identify costume variations across different scenes
- Record character image transformations across different plot stages
- Annotate costume requirements for special scenes (e.g., weddings, funerals, parties, etc.)

### 3. Costume Design Card Generation
Generate structured costume design documentation, including:
- Character basic information
- Daily costume design
- Scene costume variations
- Reference image descriptions
- Costume budget suggestions

## Workflow

### Stage 0: Worldview Alignment Check (NEW - v1.2.0)

Before generating character costumes, worldview alignment must be performed first:

#### Step 1: Read Worldview Card
```
Query path: Creation Zone / Worldview Card
Extract information:
- Story location (country / region / city)
- Cultural background
- Primary population ethnicity
```

#### Step 2: Read or Infer Character Ethnicity Information

**If character setting card already has ethnicity information**:
- Read the "Race & Appearance Features" field in the character setting card
- Check consistency with worldview
- If conflicts exist, confirm with user

**If character setting card has no ethnicity information**:
- Auto-infer ethnicity features based on worldview
- Apply ethnicity mapping rules (see table below)
- Present inferred results to user for confirmation

**Ethnicity Mapping Rules**:

| Story Location | Default Ethnicity | Hair Color | Eye Color | Skin Tone |
|-----------|---------|------|---------|------|
| Mainland China | East Asian (Han) | Black | Black / Dark Brown | East Asian skin tone |
| Japan | East Asian (Japanese) | Black | Black / Dark Brown | East Asian skin tone (fair) |
| Korea | East Asian (Korean) | Black | Black / Dark Brown | East Asian skin tone (fair) |
| United States | Mixed (confirm individually) | Diverse | Diverse | Diverse |
| Europe | Caucasian (specific country) | Diverse | Diverse | Caucasian skin tone |
| Middle East | Middle Eastern | Black / Dark Brown | Brown / Black | Brown skin tone |
| Africa | Black | Black | Black / Dark Brown | Black skin tone |

#### Step 3: Record Ethnicity Information to Costume Asset Card

Add "Ethnicity & Appearance Foundation" field in the character costume asset card:

```markdown
## Ethnicity & Appearance Foundation

**Ethnicity**: [Inferred from worldview or inherited from character setting]
**Hair Color**: [Black / Brown / Blonde, etc.]
**Eye Color**: [Black / Brown / Blue, etc.]
**Skin Tone Base**: [East Asian skin tone / Caucasian skin tone / Black skin tone / specific description]
**Facial Contour**: [East Asian facial features / Caucasian facial features / specific description]

**Detailed Facial Feature Description**:
[Describe facial features in detail based on ethnicity, e.g.:
- East Asian: Monolid or double eyelid, flat nose bridge, slightly high cheekbones, soft facial contours
- Caucasian: Deep-set eyes, high nose bridge, three-dimensional features
- Black: Broad nose, full lips, dark skin]
```

#### Step 4: User Confirmation

Present inferred ethnicity information to user:
```
Based on worldview settings (story takes place in [location]), the inferred ethnicity features for character [character name] are:
- Ethnicity: [ethnicity]
- Hair Color: [hair color]
- Eye Color: [eye color]
- Skin Tone: [skin tone]

Confirm? (Yes / No / Modify)
```

**Checklist**:
- [ ] Worldview card read
- [ ] Character ethnicity information confirmed
- [ ] Ethnicity information recorded in costume asset card
- [ ] Ethnicity information consistent with worldview

---

### Input (legacy auxiliary, not primary entry point)
- Script text (full or excerpt): Only used to supplement missing costume clues
- Character list (if available): Only used to verify character names, does not generate formal IDs
- Specific scene requirements (optional): Must fall back to `CharacterAssetCard.content.costumeRequirements[].sceneIds`

Formal production must start from `CharacterAssetCard` and one of its `costumeRequirements[]` items. If `characterAssetCardId`, `characterId`, or `costumeId` is missing, stop and return to complete the character asset card.

### Processing Steps
1. **Script Analysis**
   - Identify all characters
   - Extract costume-related descriptions
   - Analyze the relationship between character personality and costume

2. **Detail Extraction**
   - Hairstyle details
   - Makeup details
   - Clothing details
   - Accessory details

3. **Scene Mapping**
   - Annotate scenes where costumes appear
   - Record timing of costume changes
   - Analyze the relationship between costumes and plot

4. **Design Card Generation**
   - Integrate all costume information
   - Generate structured documentation
   - Add implementation suggestions

### Legacy Output Example

Legacy JSON format (migration reference only, not for production use) — see current `CharacterCostumeCard` schema above.

---

## Image Generation Prompt Specification

Prompt templates, workflow, and quality checklist at `references/image-prompt-specification.md`. Read when generating three-view prompts. Key requirements: reference upstream cards, use existing successful prompts as templates, maintain complete template structure.

## Usage Examples

### Example 1: Extract Single Character Costume
```
User: Extract the female lead's costume design from this script

Assistant: [Analyze script] → [Extract costume details] → [Generate costume design card]
```

### Example 2: Analyze Costume Changes
```
User: Analyze the male lead's costume changes throughout the entire script

Assistant: [Identify all scenes] → [Extract costumes per scene] → [Analyze change trajectory] → [Generate complete design]
```

## Quality Standards

### Completeness
- ✅ All major characters have costume designs
- ✅ Key scene costume variations are recorded
- ✅ Costume detail descriptions are clear and specific

### Accuracy
- ✅ Costume designs match character personality
- ✅ Costume changes are consistent with plot development
- ✅ Era background and occupational characteristics are accurate

### Actionability
- ✅ Costume descriptions can directly guide implementation
- ✅ Budget suggestions are reasonable and feasible
- ✅ Reference image descriptions are clear

## Collaboration with Other Skills

### Upstream Dependencies
- **script-deconstruct**: Provides script deconstruction results
- **character-asset-extraction**: Provides character basic information

### Downstream Output
- Provides visual reference for art direction
- Provides costume guide for filming team
- Provides cost estimation for budget planning

## Notes

1. **Cultural Sensitivity**
   - Be aware of costume taboos across different cultural backgrounds
   - Respect characters' ethnic and religious characteristics

2. **Practicality First**
   - Costume designs must consider filming feasibility
   - Avoid overly complex or expensive designs

3. **Continuity Assurance**
   - Ensure costume continuity for the same character across different scenes
   - Annotate costume details requiring special attention

4. **Budget Awareness**
   - Provide plans at different budget levels
   - Annotate high-cost costume elements

## Output File Naming Convention
- Single character: `costume_{character_name}_{character_id}.json`
- Full series costumes: `costume_design_all_characters.json`
- Scene costume: `costume_scene_{scene_id}.json`

## Version History
- v1.0.0 (2024-01-XX): Initial version, supports basic costume extraction and design card generation

---

## Character Costume Change

Complete costume change workflow, consistency rules, prompt techniques, and quality checks at `references/costume-change-workflow.md`. Read when creating variant costume cards while preserving character identity. Core principle: facial features, hairstyle, body proportions, expressions, and aura must match base costume; only clothing and accessories change.

## Generated File Naming Rules

Character costume three-views must save `filename` in format:

```text
角色妆造-{Character Name}-{Costume Name}-v{Version Number}
```

Example: `角色妆造-林渊-作战装-v001.png`.

## Next Step After Completion

Completion criteria: `CharacterCostumeCard` created, `selectedVersionId` points to confirmed version, `approvedImage` saved, `userConfirmed === true` and `stale === false`.

After completing current character costume, check if other character assets still need production for the current episode/scene.

- If same-scene characters remain incomplete: Suggest continuing with `character-asset-extraction` or `character-costume-designer`.
- If current episode/scene character assets are sufficient: Prompt user that they can continue with other assets, or call `production-coordinator` to start production on this specific episode and scene.

Recommended phrasing: `Current character costume is confirmed. Next I will check if other character assets need production for the current episode/scene; if not, we can move to production-coordinator to start scene production.`


---

# References

## Reference: costume-change-workflow

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

## Reference: image-prompt-specification

# Image Generation Prompt Specification

For character costume three-view image prompts. Read when generating prompts for CharacterCostumeCard. Do not copy the full specification into the card.

## Core Principles

### 1. Must Reference Upstream Cards

Before generating prompts, read:
- **Art Direction Card**: visual style, color scheme, material requirements, lighting parameters
- **Character Asset Card**: character info, aura characteristics, costume requirements
- **Existing successful prompts**: use as templates; replace only character-specific info

### 2. Complete Prompt Template

Standard prompts must include:

```markdown
[Opening] Professional Character Design Sheet, purpose, style and reference works
[Layout] Left 40% three-views | Center 10% clean headshot | Right top 25% 5 expressions (2 rows×3) | Right mid 15% 4 actions | Right bottom 10% 4 detail close-ups
[Character] Name, age, gender, ethnicity, height, build, facial features, hairstyle, makeup, clothing, accessories, overall aura
[Style] Cite art direction: specific color palette ratios, material texture, lighting (color temp, contrast, light-dark ratio), explicit style name
[Technical] 16:9 | #FFFFFF background | full character visible | orthographic three-view | 4K 3840×2160 | no logos/watermarks
[Reference Works] List specific films with style characteristics
```

### 3. Workflow

1. Read Art Direction Card + Character Asset Card
2. Find and reference existing successful prompts as templates
3. Generate new prompt using template structure, replace only character-specific info

## Quality Checklist

- [ ] Art direction card read
- [ ] Existing successful template referenced
- [ ] Complete 4-area layout described
- [ ] Expressions "arranged in 2 rows of 3 columns"
- [ ] Complete technical requirements (4K, orthographic, etc.)
- [ ] [Reference Work Style] section present
- [ ] Art direction parameters cited (palette, lighting values)
- [ ] Visual style explicitly named

## Common Errors

| Error | Fix |
|-------|-----|
| Vague style ("professional character design") | Explicit style name + reference works + film references |
| Missing tech specs | Always include: 16:9, #FFFFFF bg, orthographic, 4K, no logos |
| Imprecise layout | Specify row/column counts and percentages |
| No art direction params | Cite specific color hex values, lighting color temp, contrast ratios |

