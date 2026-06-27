---
name: prop-asset-extraction
description: Use when a PropSettingCard must be converted into a PropAssetCard for prop image generation, state variants, and downstream prop concept cards
---

# Prop Asset Extraction Specialist Skill

Generate prop asset cards from prop setting cards, converting conceptual descriptions into concrete visual asset requirements through inference rule libraries and user interaction.

## Overall Workflow

```
Input: PropSettingCard (from Creation Zone)
Optional Input: WorldviewCard
Optional Input: ArtDirectionCard

Stage 1: Dependency Check
Stage 2: Extract Inherited Information
Stage 3: Symbolic Meaning Visual Translation
Stage 4: Guide User to Supplement and Confirm Concrete Information
Stage 5: Determine Generation Requirements
Stage 6: Create Prop Asset Card

Output: PropAssetCard
```

---

## Stage 1: Dependency Check

**Check Items**:
1. Prop setting card (required)
2. Worldview card (optional, for material/color inference)
3. Art direction card (optional, for style consistency)

**Error Handling**:
- If prop setting card does not exist, prompt user to run `/script-deconstruct` first
- If worldview card or art direction card does not exist, notify user (but do not block the workflow)

---

## Stage 2: Extract Inherited Information

Extract all fields from the prop setting card, directly inheriting into `PropAssetCard.inheritedInfo`:

```typescript
inheritedInfo: {
  propId: propSettingCard.id,
  propSettingCardId: propSettingCard.id,
  propName: propSettingCard.content.name,
  category: propSettingCard.content.category,
  importance: propSettingCard.content.importance,
  roleInStory: propSettingCard.content.roleInStory,
  basicAppearance: propSettingCard.content.basicAppearance,  // Fully inherit structured fields
  functionality: propSettingCard.content.functionality,
  symbolism: propSettingCard.content.symbolism,
  propStates: propSettingCard.content.propStates,
  keyAppearances: propSettingCard.content.keyAppearances
}
```

**Notes**:
- `basicAppearance` is already a structured field (containing size/materialDetails/colorScheme/visualEffects), with formal type `PropBasicAppearance`
- `keyAppearances` is the authoritative key appearance field
- Historical `keyMoments` field can only serve as legacy input migrated to `keyAppearances`
- Historical simple appearance fields `size: string`, `material: string`, `color: string` can only be recorded via `legacyFieldCompatibility` migration, and must not overwrite structured fields
- If fields have `_inferred: true` annotation, preserve it

---

## Stage 3: Symbolic Meaning Visual Translation

Transform abstract symbolic meaning into concrete visual design direction.

### Translation Rule Library

| Symbolic Meaning Keywords | Design Direction | Visual Element Examples |
|-------------|---------|------------|
| Power / Rule | Authoritative + Refined | Symmetrical composition, gold accents, intricate patterns |
| Loyalty / Promise | Weighty + Historical | Wear marks, inscriptions, heirloom feel |
| Mystery / Unknown | Mysterious + Energetic | Glow effects, irregular forms, visible internal structure |
| Survival / Resource | Rare + Valuable | Crystal texture, glow intensity distinguishing tiers |
| Danger / Threat | Sharp + Cold | Sharp edges, cool tones, metallic texture |
| Warmth / Hope | Soft + Approachable | Warm tones, rounded forms, natural materials |

### Translation Output

```typescript
visualTranslation: {
  symbolicDesign: {
    designDirection: string;  // e.g., "Rare + Mysterious + Energetic"
    symbolicElements: string[];  // e.g., ["Crystal polyhedron refractive light effect", "Visible internal energy flow", "Glow intensity distinguishing tiers"]
    visualMetaphor: string;  // e.g., "Value of post-apocalyptic hard currency = crystal texture + energy feel combined"
  }
}
```

### Translation Example

**Input** (symbolism):
```json
{
  "meaning": "Power and survival resource in the apocalypse — whoever controls the crystal cores controls the wasteland"
}
```

**Output** (symbolicDesign):
```json
{
  "designDirection": "Rare + Mysterious + Energetic",
  "symbolicElements": [
    "Crystal polyhedron refractive light effect (rare gem feel)",
    "Visible internal energy flow (mysterious energy feel)",
    "Glow intensity distinguishing tiers (ordinary dark purple vs high-purity gold)"
  ],
  "visualMetaphor": "Value of post-apocalyptic hard currency = crystal texture + energy feel combined"
}
```

---

## Stage 3.5: Generate Visual Details for Each State

Generate detailed visual descriptions for each propState:

```typescript
stateVisuals: Array<{
  stateName: string;
  visualFocus: {
    primary: string[];    // Primary visual focus (2-3 core elements)
    secondary: string[];  // Secondary visual focus (supporting elements)
  };
  materialDetails: {
    surface: string;      // Inherited and refined from inheritedInfo.basicAppearance.materialDetails
    texture: string;
    glowEffect?: string;
    particleEffect?: string;
  };
  colorPalette: {
    primary: string;      // Inherited and refined from inheritedInfo.basicAppearance.colorScheme
    secondary?: string;
    accent?: string;
    grading: string;
  };
  specialEffects?: {
    activationEffect?: string;  // Effect when in use
    ambientEffect?: string;     // Environmental impact
  };
}>
```

**Generation Rules**:
1. Inherit base information from `inheritedInfo.basicAppearance`
2. Refine per-state differences based on `propStates[].visualCharacteristics`
3. Generate more detailed descriptions for core props
4. Generate simplified descriptions for supporting props

---

## Stage 4: Guide User to Supplement and Confirm Concrete Information

### 4.1 Check Completeness of Inferred Results

Traverse all fields in `inheritedInfo.basicAppearance`, checking for gaps:

| Field | Check Condition | User Interaction |
|------|---------|---------|
| size.dimensions | If empty | Ask: "Please provide the specific dimensions of {prop name} (e.g., approximately 5-8cm diameter)" |
| materialDetails.textureDescription | If empty | Ask: "Please describe the surface texture of {prop name} (e.g., faceted cut surfaces / brushed texture / natural wood grain)" |
| colorScheme.secondary | If empty and prop importance is core | Ask: "Please provide the secondary color of {prop name} (interior detail color)" |
| colorScheme.accent | If empty and has glow effect | Ask: "Please provide the glow color of {prop name}" |
| visualEffects.particleDescription | If particles=true but description is empty | Ask: "Please describe the particle effect of {prop name} (e.g., golden energy particles circling)" |

### 4.2 Confirm Inferred Results

For all fields annotated `_inferred: true`, present inferred results to user and request confirmation:

```
Based on prop category and art direction, I infer {prop name}'s material as:
- Material Type: {type}
- Surface Type: {surfaceType}
- Inference Basis: {_inferredFrom}

Confirm? (Yes / No / Modify)
```

**User Response Handling**:
- User answers "Yes" → annotate `_inferred: false`, `_userConfirmed: true`
- User answers "No" → ask for correct value, update field, annotate `_inferred: false`, `_userConfirmed: true`
- User answers "Modify" → ask for modification content, update field, annotate `_inferred: false`, `_userConfirmed: true`

### 4.3 Supplement Display Strategy

Ask for display strategy per state (if user hasn't provided):

```
{Prop Name} - {State Name} display plan:

Based on prop category ({category}), I suggest:
- Viewing Angle: {angle recommended by category}
- Background Plan: {background recommended by importance}
- Lighting Plan: {lighting recommended by prop characteristics}

Confirm? (Yes / No / Modify)
```

**Viewing Angle Recommendation Rules** (by prop category):
- Weapon → "45-degree oblique view, showing overall form"
- Tool / Equipment → "Front panorama, showing scale"
- Special Prop → "Floating display, 45-degree oblique view, emphasizing mystery"
- Architectural Element → "Front panorama, showing volume"
- Everyday Prop → "45-degree oblique view"

**Background Plan Recommendation Rules** (by importance):
- core → "Pure black / dark gradient background, highlighting the prop itself"
- supporting → "Scene-blurred background, preserving environmental context"
- background → "Simple scene background"

**Lighting Plan Recommendation Rules** (by prop characteristics):
- Self-illuminating props (with visualEffects) → "Self-illumination dominant, no additional light sources"
- Metallic props → "Three-point lighting (key + fill + rim), showcasing metallic texture"
- Transparent / Glass props → "Backlight + sidelight, showcasing transparent texture"
- Other props → "Natural light or actual scene light source"

### 4.4 User Confirmation Markers

After all user interactions complete, annotate:

```json
{
  "userInput": {
    "detailedAppearance": { ... },
    "displayStrategy": { ... },
    "user_confirmed": true
  }
}
```

---

## Stage 5: Determine Generation Requirements

Auto-generate `generationRequirements` based on prop importance and state count:

### Generation Rules

**Core Props**:
```json
{
  "generationRequirements": [
    {
      "stateName": "State 1",
      "priority": 1,
      "imageCount": 3,
      "viewType": "main",
      "description": "Main view, showing overall prop form",
      "keyFocusElements": ["extracted from visualFocus.primary"],
      "aspectRatio": "1:1"
    },
    {
      "stateName": "State 1",
      "priority": 1,
      "imageCount": 1,
      "viewType": "detail",
      "description": "Detail close-up, showing key functional components or material texture",
      "keyFocusElements": ["extracted from visualFocus.secondary"],
      "aspectRatio": "1:1"
    },
    {
      "stateName": "State 1",
      "priority": 1,
      "imageCount": 1,
      "viewType": "effect",
      "description": "Effect view, showing glow / particles / in-use special effects",
      "keyFocusElements": ["extracted from visualEffects"],
      "aspectRatio": "1:1"
    }
  ]
}
```

**Supporting Props**:
```json
{
  "generationRequirements": [
    {
      "stateName": "State 1",
      "priority": 2,
      "imageCount": 1,
      "viewType": "main",
      "description": "Main view",
      "keyFocusElements": ["extracted from visualFocus.primary"],
      "aspectRatio": "1:1"
    }
  ]
}
```

**Background Props**:
```json
{
  "generationRequirements": [
    {
      "stateName": "State 1",
      "priority": 3,
      "imageCount": 1,
      "viewType": "main",
      "description": "Main view",
      "keyFocusElements": ["extracted from visualFocus.primary"],
      "aspectRatio": "1:1"
    }
  ]
}
```

### Priority Sorting

Sort by first appearance episode:
- Episodes 1-10 first appearance → priority: 1
- Episodes 11-20 first appearance → priority: 2
- Episodes 21+ first appearance → priority: 3

---

## Stage 6: Create Prop Asset Card

Integrate all information to generate a complete `PropAssetCard` JSON.

## PropAssetCard Formal Schema

```typescript
interface PropBasicAppearance {
  size: {
    category: string;
    reference: string;
    dimensions?: string;
  };
  shape: string;
  materialDetails: {
    type: string;
    surfaceType: string;
    textureDescription?: string;
    specialProperties?: string[];
  };
  colorScheme: {
    primary: string;
    secondary?: string;
    accent?: string;
    mood?: string;
  };
  visualEffects?: {
    glowType?: string;
    glowIntensity?: string;
    glowColor?: string;
    particles?: boolean;
    particleDescription?: string;
    ambientEffect?: string;
  };
  distinctiveFeatures: string[];
}

interface PropAssetCard extends BaseCard {
  cardId: string;
  cardType: "PropAssetCard";
  type: "prop_asset";
  title: string;
  upstreamCards: CardRef[];

  propId: string;
  propName: string;
  propSettingCardId: string;
  sourcePropSchemaVersion: "PropSettingCard.v1";
  legacyFieldCompatibility?: {
    usedLegacyFields: string[];
    ignoredLegacyFields: string[];
    notes: string;
  };

  inheritedInfo: {
    propName: string;
    category: string;
    importance: "core" | "supporting" | "background";
    roleInStory: string;
    basicAppearance: PropBasicAppearance;
    functionality: {
      primaryFunction: string;
      secondaryFunctions?: string[];
      usage: string;
    };
    symbolism?: {
      meaning: string;
      culturalSignificance?: string;
      thematicRole?: string;
    };
    propStates: Array<{
      stateName: string;
      episodeRange?: { start: number; end: number };
      visualCharacteristics: {
        condition: string;
        appearance: string;
        details?: string;
      };
      usedInScenes?: Array<{
        episode: number;
        scene: string;
        usage: string;
      }>;
    }>;
    keyAppearances: Array<{
      episode: number;
      scene: string;
      context: string;
      significance: string;
      emotionalImpact?: string;
    }>;
  };

  visualTranslation: {
    symbolicDesign?: {
      designDirection: string;
      symbolicElements: string[];
      visualMetaphor: string;
    };
    stateVisuals: Array<{
      stateName: string;
      visualFocus: {
        primary: string[];
        secondary: string[];
      };
      materialDetails: {
        surface: string;
        texture: string;
        glowEffect?: string;
        particleEffect?: string;
      };
      colorPalette: {
        primary: string;
        secondary?: string;
        accent?: string;
        grading: string;
      };
      specialEffects?: {
        activationEffect?: string;
        ambientEffect?: string;
      };
    }>;
  };

  userInput: {
    detailedAppearance: {
      size?: string;
      shape?: string;
      surfaceTreatment?: string;
    };
    displayStrategy: Record<string, {
      viewAngle: string;
      background: string;
      lighting: string;
    }>;
    userConfirmed: boolean;
  };

  generationRequirements: Array<{
    stateName: string;
    priority: number;
    imageCount: number;
    viewType: "main" | "detail" | "effect" | "state_comparison" | "multi_view";
    description: string;
    keyFocusElements: string[];
    aspectRatio: "16:9" | "1:1";
  }>;

  downstreamPropCards: CardRef[];
  userConfirmed: boolean;
  stale: boolean;
}
```

**Creation Rules**:

1. `propId` preferentially inherits `PropSettingCard.id`; if a separate entity registry exists, use the registry ID.
2. `propSettingCardId` must point to the source `PropSettingCard.id`.
3. `sourcePropSchemaVersion` is fixed to the currently read version.
4. `keyAppearances` must read `propSettingCard.content.keyAppearances`.
5. If input only has historical `keyMoments`, migrate to `keyAppearances` and record in `legacyFieldCompatibility.usedLegacyFields`.
6. `generationRequirements[]` must be jointly determined by `importance + propStates + keyAppearances`.
7. `downstreamPropCards` uses `CardRef[]` — must not write bare string IDs.

---

## Implementation Checklist

- [ ] Stage 1: Dependency check complete
- [ ] Stage 2: Inherited information extraction complete
- [ ] Stage 3: Symbolic meaning translation complete, stateVisuals generation complete
- [ ] Stage 4: User interaction complete, all inferred results confirmed
- [ ] Stage 5: Generation requirement list generated
- [ ] Stage 6: Prop asset card created successfully

---

**Skill Version**: v1.0  
**Created**: 2026-05-30  
**Test Status**: Pending

## Next Step After Completion

Completion criteria: `PropAssetCard` created, `PropSettingCard` source, structured appearance, states, and generation requirements confirmed.

After completing current prop asset extraction, prioritize calling `prop-generator` to produce the formal prop image from the current prop asset.

If other prop assets remain unextracted, continue with current skill; if the user is working on a specific episode/scene, prioritize props appearing in that episode/scene.

Recommended phrasing: `Current prop asset extraction is complete. It is recommended to prioritize calling prop-generator to generate and confirm this prop asset. Continue?`
