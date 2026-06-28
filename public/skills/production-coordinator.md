---
id: production-coordinator
name: production-coordinator
description: Use when a confirmed EpisodeSceneTableCard scene must become a production-zone EpisodeSceneDetailCard with asset completeness checks
slashCommand: production-coordinator
examples: []
parameters: {}
required: []
---

# Production Coordinator Skill

Extract individual scene details from an EpisodeSceneTableCard (creative zone), create an EpisodeSceneDetailCard (production zone), and perform asset completeness checks.

## Input Contract Hard Gate

`production-coordinator` only accepts `EpisodeSceneTableCard` with a closed field contract. It can perform field mapping and asset completeness queries, but must not infer stable IDs from bare names, nor patch together `scriptRawText` from summaries, dialogue, or visual descriptions.

Each selected scene must include:

- `sceneId`
- `sceneLocationId`
- `sceneLocationName` or `location`
- `scriptRawText`
- `characters[].characterId`
- `characters[].characterName`
- `characters[].roleType`
- `props[].propId` and `props[].propName` (only when the scene has props)

If any required field is missing, terminate immediately and return:

```typescript
interface MissingContractReport {
  canContinue: false;
  reason: "episode_scene_table_contract_incomplete";
  missingContractFields: Array<{
    path: string;
    expected: string;
    impact: string;
  }>;
  nextAction: "rerun_script_deconstruct" | "repair_episode_scene_table";
}
```

## Overall Workflow

```
Input: EpisodeSceneTableCard (episode/scene table card, from creative zone)
User specifies: episode number, scene number

Stage 1: Extract scene information
  Locate the specified scene from the episode/scene table
  Extract basic information (episode, scene, location, time, characters, etc.)

Stage 2: Asset completeness check
  Check whether costume cards for appearing characters have been generated
  Check whether concept art cards for the scene have been generated
  Check whether design cards for props have been generated (if any)
  Calculate completeness percentage
  Generate missing asset list

Stage 3: User interaction
  If completeness < 100%, display the missing list
  Ask user: continue or jump to asset zone to supplement

Stage 4: Create card
  Create EpisodeSceneDetailCard
  Save asset completeness status
  Establish upstream/downstream connections

Output: EpisodeSceneDetailCard (episode/scene detail card)
```

---

## Stage 1: Extract Scene Information

**Purpose**: Locate and extract detailed information for the specified scene from the episode/scene table.

**Input**:
- Episode/scene table card ID
- User-specified episode number (e.g., Episode 1)
- User-specified scene number (e.g., Scene 3)

**Extracted fields**:
```typescript
interface SceneInfo {
  episodeNumber: number;        // Episode number
  sceneNumber: string;          // Scene number (supports letter suffix, e.g. "1-1A")
  sceneId: string;              // Scene ID (format: Episode X-Scene X)
  sceneLocationId: string;      // Location ID
  sceneLocationName: string;    // Location name
  timeOfDay: string;            // Time of day (day/night/dusk etc.)
  lighting: string;             // Lighting conditions (inferred from time)
  weather?: string;             // Weather (if present)
  characters: Array<{           // Appearing characters
    characterId: string;
    characterName: string;
    roleType: 'protagonist' | 'supporting' | 'minor';
  }>;
  plotSummary: string;          // Plot summary
  scriptRawText: string;        // Original script text (complete script text for this scene)
  dialogue?: string;            // Dialogue (inherited from episode/scene table)
  emotion: string;              // Emotional tone
  emotionIntensity: number;     // Emotional intensity (1-10)
  rhythm: 'fast' | 'medium' | 'slow'; // Rhythm

  // Detailed visual description (inherited from episode/scene table)
  visualDescription: Array<{
    sequence: number;
    content: string;
    type: 'action' | 'camera' | 'environment' | 'character';
  }>;

  // Scene visual elements (inherited from episode/scene table)
  sceneElements: {
    environment: string[];
    characterStates: Array<{
      character: string;
      state: string;
    }>;
    objects: string[];
    lighting?: string;
    atmosphere?: string;
  };

  // Camera information (inherited from episode/scene table)
  cameraInfo?: {
    movements: string[];
    angles?: string[];
    focusSubjects?: string[];
  };

  props?: Array<{               // Props (if any)
    propId: string;
    propName: string;
  }>;
}
```

**Extraction rules (inherit only, do not infer)**:
1. Find the matching scene from the episode/scene table's `scenes` array
2. Match criteria: both `episodeNumber` and `sceneNumber` must match
3. If no matching scene is found, notify the user and terminate execution
4. **Run contract validation first**:
   - Check `sceneId`, `sceneLocationId`, `scriptRawText`
   - Check each character's `characterId`, `characterName`, `roleType`
   - Check each prop's `propId`, `propName`
   - If fields are missing, return `missingContractFields`; do not proceed to asset completeness check
5. **Directly inherit all fields**:
   - `scriptRawText`: Directly inherit from episode/scene table (complete original script text)
   - `dialogue`: Directly inherit from episode/scene table
   - `visualDescription`: Directly inherit from episode/scene table
   - `sceneElements`: Directly inherit from episode/scene table
   - `cameraInfo`: Directly inherit from episode/scene table
6. **Only perform simple formatting**:
   - `sceneId`: Auto-generate (format: "Episode X-Scene X")
   - `lighting`: Simple mapping based on `timeOfDay` (day→natural light, night→artificial light)
7. **Field name mapping**:
   - `moodAndPace.emotionalTone` → `emotion`
   - `moodAndPace.intensity` → `emotionIntensity`
   - `moodAndPace.pace` → `rhythm` (map to fast/medium/slow)
8. **Do not perform any inferential work**:
   - Do not infer character positioning
   - Do not infer action details
   - Do not infer shot design
   - Do not infer performance style
   - Do not reverse-lookup or guess missing IDs from character names, location names, or prop names

**Error handling**:
- If the episode/scene table card does not exist → prompt user to complete script deconstruction first
- If the specified episode or scene number does not exist → list available episodes and scenes for user selection

---

## Stage 2: Asset Completeness Check

**Purpose**: Check whether all assets needed to produce this scene have been generated in the asset zone.

### 2.1 Check Character Costume Assets

**Check logic**:
```typescript
for (const character of sceneInfo.characters) {
  // Query character costume cards
  const costumeCards = queryCostumeCards({
    characterId: character.characterId
  });

  if (costumeCards.length === 0) {
    // Missing: this character has no costume cards
    missingAssets.push({
      type: 'character_costume',
      characterId: character.characterId,
      characterName: character.characterName,
      reason: '未生成角色妆造三视图'
    });
  } else {
    // Exists: record costume card ID for later use
    character.costumeCardId = costumeCards[0].id;  // Default to first costume set
  }
}
```

**Output**:
- `hasCharacterCostumes`: boolean (whether all characters have costumes)
- `missingCharacterCostumes`: Array<{characterId, characterName, reason}>

### 2.2 Check Scene Assets

**Check logic**:
```typescript
// Query scene concept art cards
const sceneConceptCards = querySceneConceptCards({
  sceneLocationId: sceneInfo.sceneLocationId
});

if (sceneConceptCards.length === 0) {
  missingAssets.push({
    type: 'scene_concept',
    sceneLocationId: sceneInfo.sceneLocationId,
    sceneLocationName: sceneInfo.sceneLocationName,
    reason: '未生成场景概念图'
  });
}
```

**Output**:
- `hasSceneConcept`: boolean
- `missingSceneConcept`: {sceneLocationId, sceneLocationName, reason}

### 2.3 Check Prop Assets

**Check logic**:
```typescript
if (sceneInfo.props && sceneInfo.props.length > 0) {
  for (const prop of sceneInfo.props) {
    // Query prop concept art cards
    const propConceptCards = queryPropConceptCards({
      propId: prop.propId
    });

    if (propConceptCards.length === 0) {
      missingAssets.push({
        type: 'prop_concept',
        propId: prop.propId,
        propName: prop.propName,
        reason: '未生成道具概念图'
      });
    }
  }
}
```

**Output**:
- `hasAllProps`: boolean
- `missingProps`: Array<{propId, propName, reason}>

### 2.4 Calculate Completeness

**Calculation formula**:
```typescript
const totalAssets =
  sceneInfo.characters.length +  // Number of character costumes
  1 +                             // Scene concept art (1)
  (sceneInfo.props?.length || 0); // Number of props

const completedAssets =
  (sceneInfo.characters.length - missingCharacterCostumes.length) +
  (hasSceneConcept ? 1 : 0) +
  ((sceneInfo.props?.length || 0) - missingProps.length);

const completenessPercentage = Math.round(
  (completedAssets / totalAssets) * 100
);
```

**Output**:
```typescript
interface AssetCompleteness {
  isComplete: boolean;              // Whether 100% complete
  completenessPercentage: number;   // Completeness percentage
  totalAssets: number;              // Total asset count
  completedAssets: number;          // Completed asset count
  missingAssets: Array<{            // Missing asset list
    type: 'character_costume' | 'scene_concept' | 'prop_concept';
    id: string;
    name: string;
    reason: string;
  }>;
}
```

---

## Stage 3: User Interaction

**Purpose**: Guide the user on the next step based on asset completeness.

### 3.1 Completeness = 100%

**Display**:
```
✅ Asset completeness check passed (100%)

All assets ready:
- Character costumes: 3/3 generated
- Scene concept art: 1/1 generated
- Prop concept art: 2/2 generated

Continue creating EpisodeSceneDetailCard?
```

**User options**:
- Continue → proceed to Stage 4
- Cancel → terminate execution

### 3.2 Completeness < 100%

**Display**:
```
⚠️ Asset completeness check NOT passed (75%)

Missing asset list:
1. Character costume: 林渊 (costume turnaround not generated)
   → Jump to asset zone > Character Costume Designer

2. Prop concept art: 玉佩 (prop concept art not generated)
   → Jump to asset zone > Prop Generator

Recommendations:
- Option A: Jump to asset zone to supplement missing assets (recommended)
- Option B: Ignore missing assets, continue creating detail card (not recommended; downstream production may be blocked)
```

**User options**:
- Jump to asset zone → provide jump link, terminate current execution
- Continue creating (ignore missing) → proceed to Stage 4, but mark asset incompleteness in card

**Sample dialogue**:
```
I have completed the asset completeness check.

The following missing assets were detected:
• Character costume: 林渊 (turnaround not generated)
• Prop concept art: 玉佩 (concept art not generated)

Current completeness: 75% (3/4 completed)

I recommend jumping to the asset zone to supplement these assets first; otherwise, downstream scene strategy, performance strategy, and storyboard production may not proceed normally.

Would you like to:
A. Jump to asset zone to supplement assets (recommended)
B. Ignore missing assets, continue creating detail card (not recommended)

Please choose A or B.
```

---

## Stage 4: Create Card

**Purpose**: Create an EpisodeSceneDetailCard, saving all extracted information and asset completeness status.

**Card fields**:
```typescript
interface EpisodeSceneDetailCard {
  // Basic information
  episodeNumber: number;
  sceneNumber: string;          // Supports letter suffix (e.g. "1-1A")
  sceneId: string;              // Scene ID (format: Episode X-Scene X)
  sceneLocationId: string;
  location: string;             // Location name
  timeOfDay: string;
  lighting: string;             // Lighting conditions (natural/artificial/mixed)
  weather?: string;

  // Character information
  characters: Array<{
    characterId: string;
    characterName: string;
    costumeCardId?: string;     // Costume card ID (if generated)
    roleType: 'protagonist' | 'supporting' | 'minor';
  }>;

  // Plot information
  plotSummary: string;
  scriptRawText: string;        // Original script text (inherited from episode/scene table, required)
  dialogue?: string;            // Dialogue (inherited from episode/scene table)
  emotion: string;              // Emotional tone
  emotionIntensity: number;     // Emotional intensity (1-10)
  rhythm: 'fast' | 'medium' | 'slow'; // Rhythm

  // Detailed visual description (inherited from episode/scene table)
  visualDescription: Array<{
    sequence: number;
    content: string;
    type: 'action' | 'camera' | 'environment' | 'character';
  }>;

  // Scene visual elements (inherited from episode/scene table)
  sceneElements: {
    environment: string[];
    characterStates: Array<{
      character: string;
      state: string;
    }>;
    objects: string[];
    lighting?: string;
    atmosphere?: string;
  };

  // Camera information (inherited from episode/scene table)
  cameraInfo?: {
    movements: string[];
    angles?: string[];
    focusSubjects?: string[];
  };

  // Character arc and plot turning points
  characterArcMoments: Array<{
    characterId: string;
    characterName: string;
    isKeyMoment: boolean;
    arcDescription?: string;
    emotionalShift?: string;
  }>;
  plotTurningPoint: {
    isTurningPoint: boolean;
    turningPointDescription?: string;
    impactLevel?: 'major' | 'moderate' | 'minor';
  };

  // Prop information
  props?: Array<{
    propId: string;
    propName: string;
    propConceptCardId?: string;  // Prop concept art card ID (if generated)
  }>;

  // Asset completeness
  assetCompleteness: {
    characterAssets: Array<{
      characterId: string;
      characterName: string;
      costumeCardId?: string;
      hasCostume: boolean;
      costumeVersion?: string;
    }>;
    sceneAssets: {
      sceneId: string;
      sceneName: string;
      hasConceptArt: boolean;
      conceptArtCardId?: string;
    };
    propAssets: Array<{
      propId: string;
      propName: string;
      hasDesign: boolean;
      designCardId?: string;
    }>;
    completenessPercentage: number;
    missingAssets: string[];    // Missing asset list (for display)
  };

  // Upstream cards
  upstreamCards: string[];      // List of upstream card IDs

  // Metadata
  createdAt: string;
  status: 'draft' | 'in_progress' | 'completed';
  notes?: string;
}
```

**Creation rules (inherit only, do not infer)**:
1. All information extracted from the episode/scene table is directly filled into corresponding fields
2. **Directly inherited fields**:
   - `dialogue`: Directly inherited from episode/scene table
   - `visualDescription`: Directly inherited from episode/scene table
   - `sceneElements`: Directly inherited from episode/scene table
   - `cameraInfo`: Directly inherited from episode/scene table
3. **Simply formatted fields**:
   - `sceneId`: Auto-generated (format: "Episode 1-Scene 1")
   - `lighting`: Simple mapping based on `timeOfDay`
4. **Field name mapping**:
   - `moodAndPace.emotionalTone` → `emotion`
   - `moodAndPace.intensity` → `emotionIntensity`
   - `moodAndPace.pace` → `rhythm`
5. Asset completeness information saved in full (using the new structure)
6. If assets are incomplete, the `missingAssets` array records all missing items
7. `status` initial value is `'draft'`
8. **Do not perform any inferential work**: content volume, structural choices, and strategic direction are pre-determined by downstream director briefing skill

**Upstream/downstream connections**:
- Upstream: EpisodeSceneTableCard
- Direct downstream: DirectorBriefingCard (precheck)
- Indirect downstream: SceneStrategyCard, PerformanceStrategyCard, CinematographyStrategyCard

---

## Test Cases

### Test Case 1: Assets Complete (100%)

**Input**:
- Episode/scene table card ID: `episode-scene-table-001`
- Episode: 1
- Scene: 3

**Preconditions**:
- Character "林渊" already has costume card
- Character "苏婉" already has costume card
- Location "林府-书房" already has concept art card
- Prop "玉佩" already has concept art card

**Expected output**:
```typescript
{
  assetCompleteness: {
    characterAssets: [
      {
        characterId: 'char-001',
        characterName: '林渊',
        costumeCardId: 'costume-001',
        hasCostume: true,
        costumeVersion: '林渊-末世大佬'
      },
      {
        characterId: 'char-002',
        characterName: '苏婉',
        costumeCardId: 'costume-002',
        hasCostume: true,
        costumeVersion: '苏婉-妆造1'
      }
    ],
    sceneAssets: {
      sceneId: 'scene-003',
      sceneName: '林府-书房',
      hasConceptArt: true,
      conceptArtCardId: 'scene-concept-003'
    },
    propAssets: [
      {
        propId: 'prop-001',
        propName: '玉佩',
        hasDesign: true,
        designCardId: 'prop-concept-001'
      }
    ],
    completenessPercentage: 100,
    missingAssets: []
  }
}
```

**User interaction**:
```
✅ Asset completeness check passed (100%)

All assets ready:
- Character costumes: 2/2 generated
- Scene concept art: 1/1 generated
- Prop concept art: 1/1 generated

Continue creating EpisodeSceneDetailCard?
```

---

### Test Case 2: Assets Incomplete (75%)

**Input**:
- Episode/scene table card ID: `episode-scene-table-001`
- Episode: 1
- Scene: 5

**Preconditions**:
- Character "林渊" already has costume card
- Character "苏婉" **does not** have costume card
- Location "林府-花园" already has concept art card
- Prop "折扇" **does not** have concept art card

**Expected output**:
```typescript
{
  assetCompleteness: {
    characterAssets: [
      {
        characterId: 'char-001',
        characterName: '林渊',
        costumeCardId: 'costume-001',
        hasCostume: true,
        costumeVersion: '林渊-末世大佬'
      },
      {
        characterId: 'char-002',
        characterName: '苏婉',
        costumeCardId: null,
        hasCostume: false
      }
    ],
    sceneAssets: {
      sceneId: 'scene-005',
      sceneName: '林府-花园',
      hasConceptArt: true,
      conceptArtCardId: 'scene-concept-005'
    },
    propAssets: [
      {
        propId: 'prop-003',
        propName: '折扇',
        hasDesign: false,
        designCardId: null
      }
    ],
    completenessPercentage: 50,
    missingAssets: [
      '角色妆造：苏婉（未生成角色妆造三视图）',
      '道具概念图：折扇（未生成道具概念图）'
    ]
  }
}
```
    checkedAt: '2026-06-01T10:35:00Z'
  }
}
```

**User interaction**:
```
⚠️ Asset completeness check NOT passed (50%)

Missing asset list:
1. Character costume: 苏婉 (costume turnaround not generated)
   → Jump to asset zone > Character Costume Designer

2. Prop concept art: 折扇 (prop concept art not generated)
   → Jump to asset zone > Prop Generator

Recommendations:
- Option A: Jump to asset zone to supplement missing assets (recommended)
- Option B: Ignore missing assets, continue creating detail card (not recommended; downstream production may be blocked)

Please choose A or B.
```

---

### Test Case 3: Scene Does Not Exist

**Input**:
- Episode/scene table card ID: `episode-scene-table-001`
- Episode: 1
- Scene: 99 (does not exist)

**Expected output**:
```
❌ Error: Specified scene not found

The specified scene (Episode 1-Scene 99) does not exist in the episode/scene table.

Available scenes:
Episode 1:
  - Scene 1: 林府-大门 (day)
  - Scene 2: 林府-书房 (day)
  - Scene 3: 林府-书房 (night)
  - Scene 4: 街道 (day)
  - Scene 5: 林府-花园 (dusk)

Please re-specify episode and scene numbers.
```

---

## Implementation Checklist

### Before Development
- [ ] Confirm episode/scene table card field definitions
- [ ] Confirm EpisodeSceneDetailCard field definitions
- [ ] Confirm asset zone card types (character costume, scene concept art, prop concept art)
- [ ] Design asset query interface

### During Development
- [ ] Implement scene information extraction logic
- [ ] Implement character costume asset check
- [ ] Implement scene asset check
- [ ] Implement prop asset check
- [ ] Implement completeness calculation
- [ ] Implement user interaction logic (complete/incomplete scenarios)
- [ ] Implement card creation logic
- [ ] Implement upstream/downstream connections

### Testing
- [ ] Test case 1: Assets complete (100%)
- [ ] Test case 2: Assets incomplete (75%)
- [ ] Test case 3: Scene does not exist
- [ ] Test case 4: Episode/scene table card does not exist
- [ ] Test case 5: Multiple characters and props scene

### Before Launch
- [ ] User dialogue review
- [ ] Error message clarity check
- [ ] Performance testing (large asset queries)
- [ ] Integration testing with asset zone skills

---

## Notes

### Asset Query Performance
- If there are many characters/props, asset queries may be slow
- Recommended to use indexed queries (by `characterId`, `sceneLocationId`, `propId`)
- Consider caching queried asset information

### User Experience
- Missing asset list should be clear and provide jump links
- If user chooses "ignore missing assets", mark it clearly in the card to avoid downstream confusion
- Completeness percentage should be intuitive (e.g., 75% = 3/4 completed)

### Edge Cases
- Scene has no props → prop check skipped, does not affect completeness
- Character has no dialogue → does not affect asset check
- Scene is a "virtual scene" (e.g., dream sequence) → may not need scene concept art; requires special handling

### Collaboration with Other Skills
- Production coordinator is the **entry skill** for the production zone
- The output EpisodeSceneDetailCard is the input for all downstream strategy skills
- Asset completeness check ensures smooth downstream production flow

## After Completion — Next Steps

Trigger rule: When user mentions working on a specific episode/scene, invoke `production-coordinator`.

Completion criteria: Check whether the corresponding `EpisodeSceneDetailCard` exists; if not, create it; if it does, check the current episode/scene completion status, including asset completeness, director briefing, three strategy cards, storyboard, and video status.

Recommended next steps:

- If no `DirectorBriefingCard.precheck`: invoke `director-briefing` for the first director precheck.
- If the three strategy cards are incomplete: recommend filling in the missing `scene-strategy-designer`, `performance-strategy-designer`, `cinematography-strategy-designer`.
- If all three strategy cards are complete but no `StoryboardPlanCard`: invoke `director-briefing` for review and shot group finalization.
- If `StoryboardPlanCard` exists but storyboard is not confirmed: invoke `storyboard-creator`.
- If storyboard is confirmed but no video: invoke `video-creator`.

Recommended dialogue: `I have checked the current episode/scene completion status. Recommended next step: address the missing links: {missing items}.`
