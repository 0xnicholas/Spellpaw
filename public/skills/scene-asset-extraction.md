---
id: scene-asset-extraction
name: scene-asset-extraction
description: Use to translate a scene plot into a scene canvas card with a reference prompt for the environment. Reads storyline cards via get_canvas, emits scene cards via add_card (type=sceneCard).
slashCommand: scene-asset-extraction
examples: []
parameters: {}
required: []
---

# Scene Asset Extraction Skill

Extract and translate visual information from scene setting cards (Creation Zone), creating scene asset cards (Asset Zone - Intermediate Assets).

## Overall Workflow

```
Input: SceneCard (scene setting card, from Creation Zone)
Optional Input: WorldviewCard, ArtDirectionCard (for inference)

Stage 1: Dependency Check
  Check if scene setting card exists
  Check worldview card, art direction card (optional)

Stage 2: Extract Inherited Information
  Read from scene setting card:
  - Basic info (name, type, location, period, scale)
  - Narrative function (primary purpose, key events)
  - Key elements (landmarks, props, architectural features)
  - Scene states (visual characteristics across different periods)
  - Emotional tone

Stage 3: Visual Translation
  Emotional tone → Lighting schemes (3 sets)
  Scene states → Visual change list
  Key elements → Visual focus ranking

Stage 4: User Supplements Visual Details
  Display translated information
  Guide user to supplement:
  - Color scheme (primary, secondary, accent)
  - Material textures (floor, walls, key props)
  - Light source setup (key light, fill light, ambient light)
  - Special visual effects (particles, fog, water reflections, etc.)

Stage 5: Determine Generation Requirements
  Determine number of images needed based on scene states
  Name each state
  Link to episode range

Stage 6: Create Scene Asset Card
  Integrate all information
  Create card
  Establish upstream/downstream connections

Output: SceneAssetCard
```

---

## Stage 1: Dependency Check & Mode Selection

### Step 1.1: Mode Selection

**Default Mode**: Single scene processing (user selects one scene setting card)

**Batch Mode** (optional):
- User can select "Batch extract all scenes"
- Sort by first appearance episode (episodeRange.start or keyEvents[0].episode)
- Process in batches: ep1-10 → ep11-20 → ep21-30...
- Pause after each batch, wait for user to confirm or adjust

**Mode Selection Prompt**:
```
Detected X scene setting cards.

[Recommended] Single Scene Mode: Select one scene for detailed extraction (suitable for professional users)
[Optional] Batch Mode: Auto-extract all scenes (suitable for quick preview, can adjust individually later)

Please select mode:
```

### Step 1.2: Dependency Check

**Check Items**:
1. Scene setting card (required)
2. **Art direction card (required)** — Changed to mandatory dependency
3. Worldview card (optional, for inferring era background)

**Error Handling**:
- Scene setting card absent → Prompt user to run `/script-deconstruct` first
- **Art direction card absent → Prompt user to run `/art-direction` first, and explain why: "Scene asset extraction requires the art direction card to provide lighting schemes, color systems, and composition guidance. Missing art direction settings would result in excessively low inference confidence."**
- Art direction card missing required fields (sceneTypeDefaults/exteriorDefaults) → Prompt user that art direction card version is outdated and needs regeneration

---

## Stage 2: Extract Inherited Information

**Extraction Fields**:
```typescript
interface InheritedSceneInfo {
  sceneName: string;
  sceneType: 'interior' | 'exterior' | 'mixed';
  roleInStory: string;
  basicInfo: {
    location: string;
    period: string;
    scale: string;
  };
  narrativeFunction: {
    primaryPurpose: string;
    keyEvents: Array<{
      episode: number;
      event: string;
      significance: string;
    }>;
  };
  keyElements: {
    landmarks: string[];
    props: string[];
    architecture?: string;
    naturalFeatures?: string[];
  };
  sceneStates: Array<{
    stateName: string;
    episodeRange?: { start: number; end: number };
    visualCharacteristics: {
      condition: string;
      lighting: string;
      atmosphere: string;
    };
  }>;
  emotionalTone: {
    primaryMood: string;
    atmosphereDescription: string;
  };
}
```

---

## Stage 3: Visual Translation

### Step 1: Emotional Tone → Lighting Schemes

**Translation Rule Library (Expanded)**:

| Emotional Tone Keywords | Lighting Scheme Name | Key Light Characteristics | Color Temp | Shadow Characteristics | Confidence |
|-------------|------------|---------|------|---------|--------|
| Safety / Warmth | Warm Diffuse Light | Soft diffuse, no strong shadows | Warm white (3200K) | Soft shadows | 0.9 |
| Oppression / Fear | Low-key Side/Back Light | Strong side or back light, large shadow areas | Cool blue (5600K+) | Hard shadows, high contrast | 0.9 |
| Post-apocalyptic Wasteland | Overexposed Diffuse Light | Gray-white sky diffuse, no distinct light source | Neutral cool (4500K) | Almost no shadows | 0.85 |
| Mystery / Unknown | Localized Point Lights | Multiple small point lights, large dark areas | Mixed color temps | Complex shadows | 0.85 |
| Satisfaction / Contrast | High-contrast Fill Light | Strong fill on subject, dark background | Warm key + cool background | Distinct rim light | 0.9 |
| Anger / Climax | Dramatic Side Light | Strong side light, half-face shadow | Warm orange (2800K) | Hard shadows, dramatic feel | 0.85 |
| Survival / Tension | Natural Scattered Light | Unstable natural light, occasional strong light | Natural light (5000K) | Dynamic shadows | 0.85 |
| Warmth / Daily Life | Soft Top Light | Even top light, simulating indoor lighting | Warm white (3000K) | Soft shadows | 0.85 |
| Sadness / Heaviness | Low-intensity Side Light | Weak side light, large dark areas | Cool white (4000K) | Deep heavy shadows | 0.85 |
| Hope / Brightness | High-key Even Light | Bright and even, minimal shadows | Natural daylight (5500K) | Shallow shadows | 0.85 |
| Cruelty / Bloodshed | High-contrast Top Light | Strong top light directly down, deep heavy shadows | Cool white (5000K) | Hard shadows, extreme contrast | 0.85 |
| Loneliness / Emptiness | Single Distant Light Source | Distant single light source, large dark areas | Cool (4500K) | Long shadows | 0.8 |
| Chaos / Loss of Control | Multi-source Conflicting Light | Light from multiple directions, chaotic shadows | Mixed color temps | Intersecting shadows | 0.8 |
| Tranquility / Peace | Soft Scattered Light | Even scatter, no distinct direction | Neutral (4000K) | Very soft shadows | 0.85 |
| Urgency / Chase | Dynamic Light Source | Moving light source, flickering effect | Cool white (5000K) | Dynamic changes | 0.8 |

**Mixed Emotion Handling Rules**:

When `primaryMood` contains multiple emotion keywords (e.g., "post-apocalyptic survival / human warmth"), synthesize as follows:

1. **Separate Primary and Secondary**: Identify primary emotion (usually first) and secondary emotion (usually last or separated by "/")
2. **Scheme Fusion**:
   - Primary emotion determines the base lighting scheme (confidence preserved)
   - Secondary emotion applied as localized adjustment (applied at specific moments or areas)
3. **Confidence Adjustment**: Mixed emotion confidence = min(primary confidence, secondary confidence) - 0.1

**Example**:
```
Input: primaryMood = "Post-apocalyptic survival / Human warmth"

Analysis:
- Primary emotion: Post-apocalyptic survival → Natural scattered light (5000K, dynamic shadows, confidence 0.85)
- Secondary emotion: Human warmth → Warm diffuse light (3200K, soft shadows, confidence 0.9)

Synthesized scheme:
- Base: Natural scattered light (overcast-dominant)
- Localized adjustment: Natural sunlight appears during human warmth moments (survivor mutual aid scenes)
- Confidence: 0.75 (= min(0.85, 0.9) - 0.1)
- Note: Natural scattered light as foundation, warmth comes from character behavior and occasional sunlight, no artificial warm lighting
```

**Translation Process**:
1. Extract keywords from `emotionalTone.primaryMood`
2. Identify if mixed emotion (contains "/" or multiple keywords)
3. Match translation rule library, generate primary lighting scheme
4. If mixed emotion, generate synthesized scheme and adjust confidence
5. Combine with `lighting` field in each `sceneStates` state, generate lighting variants per state
6. **When confidence is below 0.7, mark as requiring user confirmation**
7. Annotate source (inherited/inferred) and confidence

**Fallback Path (when art direction card is missing)**:

If art direction card does not exist or lacks keyLightingScenarios field:
1. Use only the above translation rule library (confidence -0.1)
2. Infer era background lighting characteristics from worldview card's timeSetting
3. All inferences marked as low confidence (<0.7), force user confirmation

### Step 2: Scene States → Visual Change List

For each `sceneState`, generate visual change description:
```typescript
interface SceneStateVisual {
  stateName: string;
  episodeRange?: string;
  lightingScheme: string;      // From lighting translation
  colorGrading: string;        // Color grading treatment
  atmosphericEffects: string;  // Atmospheric effects (fog, particles, etc.)
  keyVisualDifference: string; // Core visual distinction from other states
  confidence: number;
  source: 'inherited' | 'inferred';
}
```

### Step 3: Key Elements → Visual Focus Ranking

Sort `keyElements` by narrative importance into visual focus tiers:
- **Primary Focus**: Elements directly related to key events (e.g., "180-degree curved floor-to-ceiling observation window")
- **Secondary Focus**: Elements defining scene character (e.g., "purification machine production line")
- **Tertiary Focus**: Atmosphere-building elements (e.g., "luxury sofa")

**Output Format**:
```typescript
interface VisualFocusHierarchy {
  primary: Array<{ element: string; reason: string }>;
  secondary: Array<{ element: string; reason: string }>;
  tertiary: Array<{ element: string; reason: string }>;
}
```

---

## Stage 4: User Supplement & Confirm

Display translated info (lighting schemes, visual focus ranking, inferred colors). Guide user to confirm color scheme, material textures, and special effects. All material/color info requires explicit user confirmation.

## Stage 5: Generation Requirements & Priority

Validate image count reasonableness, sort by first appearance episode + importance + key event count. Present as batched priority list.

## Stage 6: Create Scene Asset Card

**Card Structure**:
```typescript
interface SceneSelectedVisual {
  conceptCardId: string;
  versionId: string;
  image: ImageReference;
  panoramaImage?: ImageReference;
  userConfirmed: boolean;
  stale: boolean;
  selectedAt: string;
}

interface SceneAssetCard extends BaseCard {
  cardId: string;
  cardType: "SceneAssetCard";
  type: 'scene_asset';
  title: string;  // e.g., "Undersea Base - Scene Asset"
  upstreamCards: CardRef[];
  sceneLocationId: string;
  sceneLocationName: string;
  sceneSettingCardId: string;
  sourceSceneSchemaVersion: "SceneSettingCard.v1";
  selectedVisual?: SceneSelectedVisual;
  
  content: {
    inheritedInfo: InheritedSceneInfo;
    
    visualTranslation: {
      lightingSchemes: SceneStateLighting[];
      stateVisuals: SceneStateVisual[];
      focusHierarchy: VisualFocusHierarchy;
    };
    
    userInput: {
      colorScheme: ColorScheme;
      materials: MaterialScheme;
      specialEffects: SpecialEffects;
    };
    
    generationRequirements: SceneGenerationRequirement[];
    
    downstreamSceneCards: CardRef[];
  };
  userConfirmed: boolean;
  stale: boolean;
}

interface SceneConceptCard extends BaseCard {
  cardId: string;
  cardType: "SceneConceptCard";
  type: "scene_concept";
  title: string;
  upstreamCards: CardRef[];
  sceneLocationId: string;
  sceneAssetCardId: string;
  stateName: string;
  episodeRange?: string;
  generationConfig: {
    model: "gpt-image-2" | "gemini-imagen3" | "seedance5" | string;
    compositionType: string;
    cameraAngle: string;
    aspectRatio: "16:9" | "2:1";
  };
  prompts: { cn?: string; en?: string };
  imageVersions: Array<{
    versionId: string;
    image: ImageReference;
    panoramaImage?: ImageReference;
    generatedAt: string;
    qualityScore: number;
    qualityDetails: {
      sceneConsistency: number;
      styleConsistency: number;
      emotionalTone: number;
    };
    userConfirmed: boolean;
    stale: boolean;
  }>;
  selectedVersionId?: string;
  approvedImage?: ImageReference;
  userConfirmed: boolean;
  stale: boolean;
}
```

**Visual Writeback Rules**:
1. `SceneAssetCard` is the scene visual entry point read by the production zone.
2. `SceneConceptCard` is the generation record and version library.
3. After user confirms a `SceneConceptCard.imageVersions[]`, it is written back to `SceneAssetCard.selectedVisual` by `scene-generator`.
4. Downstream must not randomly pick images from `SceneConceptCard.generatedImages[]`; only read `SceneAssetCard.selectedVisual`.

---

## Annotation Standards

Consistent with character asset extraction:
- `inherited`: Inherited from upstream card (confidence 1.0)
- `inferred`: Inferred based on rules (confidence 0.8-0.9)
- `user_provided`: User directly provided (confidence 1.0)
- `default`: Default value (confidence 0.5)

---

## Test Cases

### Test Case 1: Undersea Base (Complete Information)

**Input**:
- Scene setting card: Undersea Base (Yalan Deep-sea Hotel)
  - Emotional Tone: Safety / Contrast satisfaction
  - Scene States: Renovation Period (ep3-5), Operational Period (ep6-52)
  - Key Elements: 180-degree curved observation window, purification machine production line, monitoring center

**Expected Output**:
- Scene asset card: Undersea Base
  - Lighting Schemes: Renovation (construction lighting / cool white), Operational (warm diffuse + undersea blue light)
  - Visual Focus: Primary (observation window), Secondary (purification machines), Tertiary (luxury sofa)
  - Generation Requirements: 2 sets (Renovation Period, Operational Period)

### Test Case 2: Colosseum (Strong Emotion)

**Input**:
- Scene setting card: Colosseum (Cherry Blossom Island)
  - Emotional Tone: Oppression / Anger
  - Scene States: In Operation (ep43-47)

**Expected Output**:
- Scene asset card: Colosseum
  - Lighting Schemes: Low-key side/back light + Dramatic side light
  - Visual Focus: Primary (iron cage), Secondary (spectator high platform)
  - Generation Requirements: 1 set

---

## Implementation Checklist

- [ ] Stage 1: Dependency check complete, scene setting card exists
- [ ] Stage 2: Inherited information extraction complete
- [ ] Stage 3: Visual translation complete
  - [ ] Lighting schemes: Each scene state has a corresponding scheme
  - [ ] Visual focus: Three-tier ranking complete
  - [ ] Scene state visual changes: Generated
- [ ] Stage 4: User supplementation complete
  - [ ] Color scheme: Supplemented
  - [ ] Material textures: Supplemented
  - [ ] Special visual effects: Supplemented
- [ ] Stage 5: Generation requirements determined, user confirmed
- [ ] Stage 6: Scene asset card created successfully

---

**Skill Version**: v1.0  
**Created**: 2026-05-29  
**Test Status**: Pending

---

## Scene Asset Purity Principle

Scene assets must be clean scenes without main characters. Full rules, examples, and prompt conventions at `references/scene-purity-principle.md`. Key rule: scene = clean space + set dressing + lighting only; characters added via post compositing. GPT-Image-2 negative prompt must include: `people, person, characters, human, man, woman, figure, face, body, hand, arm, leg`.

## Next Step After Completion

Completion criteria: `SceneAssetCard` created, `SceneSettingCard` source, scene states, generation requirements, and confirmation info saved.

After completing current scene asset extraction, prioritize calling `scene-generator` to produce the formal scene image and write back to `SceneAssetCard.selectedVisual`.

If other scene assets remain unextracted, continue with current skill; if the user is working on a specific episode/scene, prioritize the scenes needed for that episode/scene.

Recommended phrasing: `Current scene asset extraction is complete. It is recommended to prioritize calling scene-generator to generate and confirm this scene's visual asset. Continue?`


---

# References

## Reference: scene-purity-principle

# Scene Asset Purity Principle

Scene assets must be **clean scenes without main characters** — clean space + set dressing props + lighting atmosphere only. Characters are added through post-production compositing.

## Allowed (✅) / Prohibited (❌)

**Allowed**: Architecture, furniture, placed props (not held), environmental effects, natural elements, extremely blurred background crowds as scale reference.

**Prohibited**: Main characters, character-specific actions/poses/expressions, props being actively used/held/worn, any identifiable facial features.

## Prop Boundaries

- **Scene Props**: Placed/resting state, not in use (e.g., beer bottles on table, tablet on desk)
- **Character Props**: Being used, worn, or held (e.g., beer held by character, watch worn)

## Description Conventions

❌ "Lin Yuan reclining on sofa, holding a beer"
✅ "Large L-shaped leather sofa, empty state. Black marble coffee table with beer bottles placed on top."

❌ "Workers in uniforms standing beside production line"
✅ "Empty work stations beside production line, no operators"

## GPT-Image-2 Negative Prompt (Required)

```
people, person, characters, human, man, woman, figure, face, body, hand, arm, leg
```

## Quality Checklist

- [ ] No main characters or identifiable persons in frame
- [ ] Space presented as complete independent environment
- [ ] Props in placed/resting state, not in use
- [ ] Negative prompt includes character exclusion terms
- [ ] Card notes state: "Clean scene; characters added through compositing"

## Why Maintain Purity

- **Asset reuse**: Same scene for multiple characters/shots
- **Post flexibility**: Adjust character position/action/expression independently
- **Parallel production**: Scene and character teams work independently
- **Version support**: Same scene supports different character combinations

