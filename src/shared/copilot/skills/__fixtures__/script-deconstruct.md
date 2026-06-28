---
id: script-deconstruct
name: script-deconstruct
description: Use when a FullScriptCard must be decomposed into creation-zone structure cards, including episode-scene tables and story, character, scene, prop, art, and music direction cards
slashCommand: script-deconstruct
examples: []
parameters: {}
required: []
---

# Script Deconstruct Skill (Main Skill)

Decomposes the full script card into a complete set of creation-zone setting cards.

## Overall Workflow

```
Input: FullScriptCard (full script)

Phase 1: Automatic extraction (requires user confirmation, executed sequentially)
  Step 1 → Episode-Scene Table Card (EpisodeSceneTableCard)
         → [Pause] Verify scene splits with the user; continue only after confirmation
         → [Pause] Ask user to choose batching strategy (all-at-once or batch)
  Step 2 → Story Core Card (StoryCoreCard)
  Step 3 → Worldview Card (WorldviewCard)
  Step 4 → Plot Pacing Card (PlotPacingCard)
  Step 5 → Character Setting Cards (CharacterSettingCard × N) — execute according to batching strategy
  Step 6 → Scene Setting Cards (SceneSettingCard × N) — execute according to batching strategy
  Step 7 → Prop Setting Cards (PropSettingCard × N) — execute according to batching strategy
  ↓
  [Pause] Present extraction results to the user, confirm assumptions, wait for confirmation

Phase 2: Guided style setting (requires user participation)
  Step 8 → callSkill('art-direction', ...)  → Art Direction Card
  Step 9 → callSkill('music-direction', ...) → Music Direction Card

Output: Complete set of creation-zone cards
```

---

## Phase 1: Automatic Extraction

### Step 1: Episode-Scene Table Card (Foundation of the Creation Zone)

**Purpose**: Decompose the full script into a structured scene table — the foundational data source for all subsequent cards.

**Key Principles**:
1. **Generate the complete episode-scene table by default** — generate the scene table for all episodes in one pass; do not use placeholders or "test cases"
2. **Review with the user after generation** — present the episode-scene table and ask whether the scene splits are reasonable
3. **Continue only after confirmation** — proceed to subsequent steps only after the user confirms the scene table is correct

**Field Definitions**:
```typescript
interface EpisodeSceneTableCard extends BaseCard {
  type: 'episode_scene_table';
  upstreamCards: CardRef[];      // Must include FullScriptCard reference, role = "source_script"

  episodes: Array<{
    episodeNumber: number;
    episodeTitle?: string;
    scenes: Array<{
      sceneNumber: string;       // Format: episode-scene, e.g. "1-3"
      sceneId: string;           // Stable scene ID, e.g. "ep01_sc03"
      scriptRawText: string;     // Complete original script text for this scene, sliced from FullScriptCard.rawText
      sceneLocationId: string;   // Stable location ID for production zone and scene asset queries
      sceneLocationName: string; // Scene name, preferably aligned with SceneSettingCard
      location: string;
      time: string;
      interiorExterior: string;  // INT/EXT
      weather?: string;
      plotSummary: string;       // 20-30 character core event summary
      moodAndPace: {
        emotionalTone: string;
        pace: string;
        intensity: string;       // 1-10
      };
      characters: Array<{
        characterId: string;     // Stable character ID for production zone and character asset queries
        characterName: string;
        roleType: "protagonist" | "antagonist" | "supporting" | "minor";
        characterCardId?: string;
      }>;
      mainActions: string[];     // Simplified key action list (3-5 items for quick browsing)
      props: Array<{
        propId: string;          // Stable prop ID for production zone and prop asset queries
        propName: string;
        importance: "key" | "supporting" | "background";
        propCardId?: string;
      }>;
      dialogue?: string;         // Complete dialogue text for this scene (preserving original format)
      
      // New: detailed visual descriptions (extracted from △ action descriptions)
      visualDescription: Array<{
        sequence: number;        // Sequence number
        content: string;         // Complete action description (preserving original text)
        type: "action" | "camera" | "environment" | "character"; // Description type
      }>;
      
      // New: scene visual elements (structured info extracted from △ descriptions)
      sceneElements: {
        environment: string[];   // Environment elements (e.g. surging water, flooded land, buildings)
        characterStates: Array<{ // Characters and their states
          character: string;
          state: string;         // State description (e.g. standing on the wall, raising a gun)
        }>;
        objects: string[];       // Objects in the scene (e.g. floating island wall, gun, SUV)
        lighting?: string;       // Lighting description (if explicitly described in script)
        atmosphere?: string;     // Atmosphere description (if explicitly described in script)
      };
      
      // New: camera info (if the script contains explicit camera descriptions)
      cameraInfo?: {
        movements: string[];     // Camera movements (e.g. camera follows warrior sinking, camera pushes into car)
        angles?: string[];       // Camera angles (if specified)
        focusSubjects?: string[]; // Focus subjects (if explicitly stated)
      };
      
      duration?: string;
      notes?: string;
    }>;
  }>;
}
```

**Extraction Rules**:
1. Identify episode boundaries; determine the start and end lines of each episode
2. **Scene identification (priority order)**:
   - Prioritize explicitly labeled scene headings (`episode-scene location time INT/EXT` format)
   - Scene headings support letter suffixes (e.g. `1-1A`, `1-1B`), treated as sub-scenes within the same episode
   - **If the script has no explicit scene headings, use location/time/character changes as split criteria**: location switches, time jumps, or changes in main character groupings all count as a new scene
   - For unnumbered "a sequence of shots"/"quick shots"/"a quick montage", mark sceneNumber as `X-X-montage`

3. **Generate stable IDs and original text slices for each scene**:
   - `sceneId`: generate as `ep{episodeNumber}_sc{sceneNumber}`; normalize letter suffixes and montage markers, e.g. `ep01_sc01A`, `ep01_montage01`
   - `scriptRawText`: slice the complete original text for this scene from `FullScriptCard.rawText`; must include scene heading, all `△` action descriptions, dialogue, VO/OS, transitions, and emotional annotations
   - If reliable slicing fails, must pause and return parse warnings; never substitute summary or `dialogue` for `scriptRawText`

4. **Establish stable entity references for scenes, characters, and props**:
   - `sceneLocationId`: prefer reusing existing `SceneSettingCard.id`; if none, generate a temporary ID from the canonical scene name, backfilled when Scene Setting Cards are created in Step 6
   - `sceneLocationName`: preserve the normalized scene name
   - `characters[].characterId`: prefer reusing existing `CharacterSettingCard.id`; if none, generate a temporary ID from the canonical character name, backfilled when Character Setting Cards are created in Step 5
   - `characters[].roleType`: determined from the character's overall importance and function in this scene; choose `protagonist | antagonist | supporting | minor`
   - `props[].propId`: prefer reusing existing `PropSettingCard.id`; if none, generate a temporary ID from the canonical prop name, backfilled when Prop Setting Cards are created in Step 7
   - Before outputting to the production zone, never keep only names without IDs

5. **Extract action descriptions starting with `△`**:
   - **visualDescription**: preserve all complete descriptions starting with `△`, numbered in order
   - Identify description types:
     - `action`: character action (e.g. Lin Yuan stands up, Zhao Feng beats Lin Yuan)
     - `camera`: camera movement (e.g. camera follows the warrior sinking, camera pushes into the car)
     - `environment`: environment description (e.g. water surging, torrential rain)
     - `character`: character state (e.g. warrior stands on the wall, Su Qing sits astride Zhao Feng)
   - **mainActions**: distill the 3-5 most critical actions from visualDescription (for quick browsing)

6. **Extract scene visual elements (sceneElements)**:
   - **environment**: list of environmental elements (e.g. water surface, flood, buildings, torrential rain)
   - **characterStates**: characters and their states (e.g. {character: "warrior", state: "standing on the wall raising a gun"})
   - **objects**: objects in the scene (e.g. floating island wall, gun, SUV, iron pipe)
   - **lighting**: extract only when the script explicitly describes lighting (e.g. backlight, lamplight, sunlight)
   - **atmosphere**: extract only when the script explicitly describes atmosphere (e.g. gloomy, oppressive)

7. **Extract camera info (cameraInfo)**:
   - **movements**: camera movement descriptions (e.g. camera follows warrior sinking, camera pushes into car, camera follows Lin Yuan out of the suite door)
   - **angles**: camera angles (if explicitly stated in the script, e.g. overhead shot, low-angle shot)
   - **focusSubjects**: focus subjects (if explicitly stated in the script, e.g. Lin Yuan's expression, zombie horde attack)
   - If the scene has no explicit camera descriptions, cameraInfo is null

8. Extract character names from dialogue lines (filter out narration VO/OS, system sounds)

9. Identify key props from actions and dialogue

10. Distill the core event into a one-sentence plotSummary (20-30 characters)

11. **Extract the complete dialogue text for this scene (dialogue)**:
   - Preserve original formatting (character name + dialogue content)
   - Include narration (VO/OS)
   - If the scene has no dialogue (pure action scene), the dialogue field is null

12. **For emotionalTone, fill in atmosphere keywords that directly guide visuals/performance/storyboarding**, such as: gloomy, oppressive, tense, exhilarating, warm, absurd, tragic, thrilling. Avoid abstract emotion words (e.g. "complex")

**Batching Strategy** (for long scripts):
- Recommended to process 10 episodes per batch; generate scene tables in batches
- Output the batch's scene table after each batch, then continue to the next batch
- **Scene tables for all episodes must be fully generated**; do not use placeholders
- Steps 5/6/7 depend on Step 1 being **fully completed** before execution (need appearance frequency statistics)

**Review Process After Generation**:
1. **Present episode-scene table overview**: show the user the generated scene table structure (episode count, scene count, main locations)
2. **Ask the user to confirm**:
   - Are the scene splits reasonable?
   - Is the scene granularity too fine or too coarse?
   - Are any key scenes missing?
   - Does any scene's duration or intensity need adjustment?
3. **Iterate based on feedback**: update the episode-scene table based on user revisions
4. **Continue only after confirmation**: proceed to Steps 2-7 only after the user explicitly confirms the scene table is correct

**Assumption Markers**:
- Time not specified → infer from context, mark `[假设]`
- INT/EXT inferred from location name → mark `[假设]`

---

### Steps 2-7: Ask for Batching Strategy

**Before starting to create character, scene, and prop cards, first ask the user to choose a batching strategy**:

```
The episode-scene table has been confirmed. Next, we need to create Character Setting, Scene Setting, and Prop Setting cards.

Please choose a creation method:
1. **Create all at once** (generate all character/scene/prop cards based on the scene table for all X episodes)
2. **Create in batches** (e.g. first create cards for the first 10 episodes, then supplement in subsequent batches)

Which approach would you prefer?
```

**Execute based on user choice**:
- **Option 1 (Create all at once)**:
  - Extract the complete list of characters, scenes, and props across all episodes
  - Count appearance frequency and importance
  - Generate all cards in one pass
  
- **Option 2 (Create in batches)**:
  - Ask the user for the first batch range (e.g. "first 10 episodes")
  - Extract characters, scenes, and props within that range
  - Generate the first batch of cards
  - After completion, ask whether to continue with the next batch

---

### Step 2: Story Core Card

**Purpose**: Extract the story structure, themes, and emotional core of the entire series, providing tonal foundation for art/music direction.

**Field Definitions**:
```typescript
interface StoryCoreCard extends BaseCard {
  type: 'story_core';
  content: {
    synopsis: {
      logline: string;          // One-sentence summary (20-30 characters)
      fullSummary: string;      // Full summary (200-300 characters)
      genre: string[];
      targetAudience: string;
      viewerAppeal: string;     // Viewer satisfaction points
    };
    storyPattern: {
      pattern: string;          // e.g. rebirth-revenge + hero's journey
      archetype: string[];      // Hero, ally, shadow, villain
      keyBeats: string[];       // 6-10 key beats
    };
    conflict: {
      primary: string;
      secondary: string[];      // 2-3
      internal: string;
      external: string;
    };
    structure: {
      type: string;             // Three-act / Five-act
      acts: Array<{
        actNumber: number;
        description: string;
        keyEvents: string[];
      }>;
    };
    theme: {
      coreTheme: string;
      subThemes: string[];
      coreValues: string[];
    };
    emotionalCore: {
      dominantEmotion: string;
      emotionalJourney: string;
      emotionalClimax: string;
    };
  };
}
```

**Extraction Rules**:
1. Extract logline from the Episode 1 opening VO and flashback
2. Extract fullSummary following the "past life → rebirth → establishment → revenge → ending" structure
3. Extract genre from script elements (can be multiple)
4. Infer targetAudience from short-form drama format and subject matter
5. Extract viewerAppeal from satisfaction points across episodes
6. Analyze the protagonist's growth arc to extract pattern and archetype
7. Extract keyBeats following the 12 stages of the hero's journey
8. Extract conflict from protagonist vs. apocalypse/villain/inner self
9. Divide acts and keyEvents following the three-act structure
10. Infer coreTheme from the ending; extract subThemes from subplots

**Assumption Markers**:
- Act divisions inferred from typical structure → mark `[假设]`
- Internal conflict inferred from character growth → mark `[假设]`

---

### Step 3: Worldview Card

**Purpose**: Extract the story world's time-space, social structure, rules, and material conditions as raw information, providing **upstream basis** for art direction (visual style), character settings (appearance/behavior), and scene/prop settings. The Worldview Card describes "what the world is like" without making visual or performance conclusions.

**Field Definitions**:
```typescript
interface WorldviewCard extends BaseCard {
  type: 'world_building';
  content: {
    timeSetting: {
      era: string;
      timeSpan: string;
      historicalContext: string;
    };
    spaceSetting: {
      primaryLocations: string[];    // 5-7 primary locations
      geographicScope: string;
      locationDescription: string;
    };
    socialStructure: {
      politicalSystem: string;
      hierarchy: string;             // Social class structure
      powerDistribution: string;     // Power distribution (who controls what resources)
      interpersonalDynamics: string; // Typical relationship patterns between people (e.g. attitudes of the strong toward the weak, trust levels among survivors)
    };
    worldRules: {
      physicalLaws: string[];        // Physical/supernatural rules
      technologyLevel: string;       // Technology level
      specialSettings: string[];     // Special settings (abilities, systems, special items, etc.)
      materialConditions: string[];  // Material conditions (resource scarcity/abundance, affecting clothing/prop/scene wear and tear)
    };
    culturalTraits: {
      values: string[];
      customs: string[];
      taboos: string[];
      survivalBehaviors: string[];   // Typical behavioral patterns of characters in post-apocalyptic/special environments (e.g. hoarding supplies, distrusting strangers)
    };
  };
}
```

**Extraction Rules**:
1. Extract era and timeSpan from Episode 1 VO
2. Extract historicalContext from system prompts/background exposition
3. Count primaryLocations from scene headings across episodes
4. Infer geographicScope from disaster scale
5. Extract socialStructure from power-role distribution (including interpersonalDynamics: typical relationship patterns between people)
6. Extract worldRules from special ability/system descriptions; extract materialConditions from scene descriptions (resource scarcity/abundance, wear and tear)
7. Extract values, customs, taboos, and survivalBehaviors from character behavior

**Assumption Markers**:
- Time span inferred from plot progression → mark `[假设]`
- Political system inferred from scenes → mark `[假设]`

---

### Step 4: Plot Pacing Card

**Purpose**: Extract the overall emotional curve and rhythm change points, providing basis for visual rhythm in art direction and BGM trigger points in music direction.

**Field Definitions**:
```typescript
interface PlotPacingCard extends BaseCard {
  type: 'plot_pacing';
  content: {
    overallRhythm: {
      pacing: string;            // Fast-paced / Moderate / Leisurely
      characteristics: string;
    };
    emotionBoard: Array<{
      episode: number;
      intensity: number;         // 1-10
      dominantEmotion: string;
      description: string;
    }>;
    rhythmChangePoints: Array<{
      location: string;          // Episode-scene
      type: string;              // Climax / Turning point / Low point
      description: string;
    }>;
    climaxDistribution: {
      miniClimax: string[];      // Per-episode mini climaxes
      midClimax: string[];       // Every 10-15 episode mid climaxes
      grandClimax: string;       // Series grand climax
    };
    qualityAssessment: {
      strengths: string[];
      concerns: string[];
      suggestions: string[];
    };
  };
}
```

**Extraction Rules**:
1. Analyze overall rhythm type (short-form drama = fast-paced)
2. Annotate emotional intensity (1-10) and dominant emotion per episode
3. Identify rhythm change points (climax / turning point / low point)
4. Count mini climaxes (strongest conflict per episode), mid climaxes, grand climax
5. **Short-form drama specialized assessment** (key priority):
   - **Episode 1 impact**: Is there a strong hook in the first 30 seconds? Is the opening contrast/conflict strong enough? Does it make viewers immediately want to watch the next episode?
   - **Hook/twist density in the first 20% of episodes (approx. first 10 episodes)**: How many satisfaction points/twists per episode on average? Are the episode-ending cliffhangers strong enough?
   - Short-form drama standard: at least 1 clear satisfaction point per episode in the first 10 episodes; each episode ending must have a cliffhanger or twist

---

### Step 5: Character Setting Card

**Purpose**: Build a complete character profile for each appearing character, guiding subsequent character asset production.

**Field Definitions**:
```typescript
interface CharacterSettingCard extends BaseCard {
  type: 'character_setting';
  content: {
    name: string;
    role: 'protagonist' | 'antagonist' | 'supporting' | 'minor';
    
    // New: typical character archetype label
    characterArchetype?: string;  // Typical character archetype, e.g. bad girl, domineering CEO, childhood friend, white moonlight, simp, tool, loyal dog, green tea, vicious supporting female, etc.
    
    biography: {
      age?: string;
      gender?: string;
      occupation?: string;
      socialStatus?: string;
      // Appearance description: merge original script descriptions + inferred defaults based on character personality/identity
      // Format: [Original script description (if any)] + comprehensive default for body type / face / aura / typical clothing
      // e.g. Script describes "wearing a knitted top and shorts, long beautiful legs"; default: female 20-25, lively sweet aura, casual home style
      // If the script has no description, write the default directly; if it does, cite the original text first then supplement with defaults
      appearance: string;            // [Required] Comprehensive appearance description
      personalityTraits: string[];   // 3-5 labels, based on specific behaviors
      backstory?: string;
    };
    motivation: {
      surfaceDesire: string;
      deepDesire?: string;
      drivingForce: string;
    };
    coreConflict: {
      externalConflict: string;
      internalConflict?: string;
    };
    characterArc?: {              // Required for main characters
      startingPoint: string;
      turningPoints: Array<{
        episode: string;
        event: string;
        change: string;
      }>;
      endPoint: string;
    };
    exitInfo?: {                  // Character exit info (required for characters who don't survive the full series)
      exitEpisode: string;        // Exit episode, e.g. "Episode 11"
      exitMethod: string;         // Exit method, e.g. "eaten by small biters", "defeated", "sacrificed"
      requiresDeathAsset: boolean; // Whether death/exit-state assets need to be produced
    };
    relationships?: Array<{
      characterName: string;
      relationship: string;
      relationshipType?: string;  // Relationship type label, e.g. ex-girlfriend, love rival, childhood friend, master-servant, mentor-student, etc.
    }>;
    signature?: {
      catchphrase?: string;
      weapon?: string;
      skill?: string;
    };
    visualForms?: Array<{         // Required when there are significant appearance changes
      formName: string;
      episodeRange: string;
      appearanceChange: string;
      triggerEvent: string;
    }>;
  };
}
```

**Extraction Rules**:
1. Count appearance frequency from the episode-scene table to determine role
2. **Identify typical character archetype label** characterArchetype:
   - Comprehensive judgment from character behavior patterns, relationship to protagonist, and plot function
   - Common types: bad girl/bad boy, domineering CEO, childhood friend, white moonlight, simp, tool, loyal dog, green tea, vicious supporting female, innocent sweetheart, cold male god, warm guy, schemer, Mary Sue, etc.
   - A character may fit multiple types; choose the 1-2 most core ones
3. Extract personalityTraits from dialogue and actions (based on specific behaviors, not vague)
4. Extract backstory from flashback scenes
5. Extract surfaceDesire from dialogue; infer deepDesire from behavior patterns
6. Extract externalConflict from plot conflicts; extract internalConflict from character struggles
7. Track characterArc turningPoints following the hero's journey (mapped to specific episodes)
8. Identify visualForms from appearance differences before and after (each visualForm corresponds to one character asset card)
9. **Annotate relationshipType when extracting relationships**: e.g. ex-girlfriend, love rival, childhood friend, master-servant, mentor-student, comrade-in-arms, rival, etc.

**Assumption Markers**:
- Age inferred from behavior → `"25-30岁 [假设：根据XX推断]"`
- deepDesire cannot be determined → leave empty
- internalConflict not manifested → `"[未体现]"`
- backstory not mentioned → `"[未提及]"`
- appearance not described → `"[未描述]"`

---

### Step 6: Scene Setting Card

**Purpose**: Build a visual archive for each important scene, guiding subsequent scene asset production.

**Field Definitions**:
```typescript
interface SceneSettingCard extends BaseCard {
  type: 'scene_design';
  content: {
    name: string;
    type: 'interior' | 'exterior' | 'mixed';
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
        scene?: string;
        event: string;
        significance: string;
      }>;
    };
    keyElements: {
      landmarks: string[];        // 2-5 visual anchors
      props: string[];
      architecture?: string;
      naturalFeatures?: string[];
    };
    sceneStates: Array<{          // Each state corresponds to one scene asset card
      stateName: string;
      episodeRange?: { start: number; end: number };
      visualCharacteristics: {
        timeOfDay?: string;
        season?: string;
        weather?: string;
        condition: string;
        lighting: string;
        atmosphere: string;
      };
      keyDifferences?: string;
    }>;
    emotionalTone: {
      primaryMood: string;
      atmosphereDescription: string;
    };
    linkedCards: {
      sourceScriptCardId: string;
      relatedCharacterCardIds?: string[];
    };
  };
}
```

**Extraction Rules**:
1. Count scene appearance frequency from the episode-scene table to determine importance
2. Extract basicInfo from scene headings
3. Analyze main activities to extract primaryPurpose
4. Select 3-5 key events to record in keyEvents
5. Extract landmarks (visual anchors) from scene descriptions
6. Group by time period and state to identify sceneStates (each state = one asset card)
7. Extract emotionalTone from the synthesis of action, dialogue, and environment

---

### Step 7: Prop Setting Card

Field definitions, extraction rules, and the inference rule library (size, material, color, visual effects) at `references/prop-setting-card-schema.md`. Key rules: count frequency → importance; extract from first appearance; infer only when script is silent.

---

### After Phase 1 Completion: Ask Strategy

Use an **overview-then-detail** structure: present overall statistics first, walk through each card category for confirmation, then present unresolved assumptions. Apply selective deep-dives — don't confirm all items one by one, only highlight uncertain ones. Use multiple-choice for efficiency.

---

### Step 9: Music Direction

After art direction is complete, invoke the music direction sub-skill:

```typescript
const musicDirectionCard = await callSkill('music-direction', {
  fullScript: fullScriptCard,
  storyCore: storyCoreCard,
  worldview: worldviewCard,
  narrativeRhythm: plotPacingCard,
  // userMusicChoice is filled in by the sub-skill guiding the user
});
```

See `~/.claude/skills/music-direction/SKILL.md` for details.

---

## Output Summary

| Card | Quantity | Downstream Impact |
|-----|------|---------|
| Episode-Scene Table | 1 | Foundational data source for all cards |
| Story Core | 1 | Art/music style tone foundation |
| Worldview | 1 | Art era feel, music instrument system |
| Plot Pacing | 1 | Visual rhythm, BGM trigger points |
| Character Settings | N | Character asset cards (one per visualForm) |
| Scene Settings | N | Scene asset cards (one per sceneState) |
| Prop Settings | N | Prop asset cards (one per propState) |
| Art Direction | 1 | Style guidance for all visual assets |
| Music Direction | 1 | BGM asset cards, SFX asset cards |

---

## Quality Check

After Phase 1 completion, check:
- [ ] Episode-scene table covers all episodes with no omissions
- [ ] Character list matches characters appearing in the episode-scene table
- [ ] Scene list covers scenes with appearance frequency ≥ 3
- [ ] Prop list covers all core and supporting props
- [ ] All assumption fields are marked `[假设]`
- [ ] Story Core logline accurately summarizes the entire series
- [ ] Worldview worldRules cover all special settings

After Phase 2 completion, check:
- [ ] Art direction instrument system is consistent with worldview era
- [ ] Music direction emotional mapping covers the main emotions of the story core
- [ ] The style directions of both setting cards are mutually coordinated

## Next Step After Completion

Completion criteria: The creation-zone cards confirmable for the current batch have been output, and compared against the asset split results in the episode-scene table.

After completion, must explain to the user:

- Which `CharacterSettingCard`s, `SceneSettingCard`s, and `PropSettingCard`s have been created.
- Which characters/scenes/props in the episode-scene table may have been missed or not yet created.
- Which asset settings are already available for the episodes/scenes the user currently wants to produce.

Two recommended next directions:

1. Continue filling in remaining character/scene/prop settings.
2. Start designing and producing assets needed for the current episodes/scenes by calling `character-asset-extraction`, `scene-asset-extraction`, or `prop-asset-extraction` as needed.

Suggested message: `Script deconstruction is complete for the current batch. I've compared against the asset split results in the episode-scene table. You can continue filling in remaining character/scene/prop settings, or start designing and producing assets needed for the current episodes/scenes.`


---

# References

## Reference: prop-setting-card-schema

# Prop Setting Card Schema & Inference Rules

For Step 7 of script-deconstruct. Read when extracting prop cards from the episode-scene table.

## Field Definitions

```typescript
interface PropSettingCard extends BaseCard {
  type: 'prop_design';
  content: {
    name: string;
    category: string;             // Weapon / Tool / Accessory / Document / Vessel / Special prop
    importance: 'core' | 'supporting' | 'background';
    roleInStory: string;
    basicAppearance: {
      size: string;
      shape: string;
      material: string;
      color: string;
      distinctiveFeatures: string[];  // 2-5 distinctive features
    };
    functionality: {
      primaryFunction: string;
      secondaryFunctions?: string[];
      usage: string;
    };
    symbolism?: {
      meaning: string;
      emotionalConnection?: string;
    };
    propStates: Array<{
      stateName: string;
      episodeRange?: { start: number; end: number };
      visualCharacteristics: { condition: string; appearance: string };
      keyDifferences?: string;
      triggerEvent?: string;
    }>;
    keyAppearances: Array<{
      episode: number;
      scene?: string;
      context: string;
      significance: string;
    }>;
    linkedCards: {
      sourceScriptCardId: string;
      relatedCharacterCardIds?: string[];
      relatedSceneCardIds?: string[];
    };
  };
}
```

## Extraction Rules

1. Count prop appearance frequency → determine importance (30+ = core, 10-29 = supporting, 1-9 = background)
2. Extract basicAppearance from first appearance scene
3. Extract functionality from usage scenes
4. Infer symbolism from prop origin and key scenes
5. Group by state to identify propStates (each state = one asset card)
6. Select key appearance scenes for keyAppearances

## Inference Rule Library

### Size Inference

| Script Description | Category | Reference | Inferred |
|---------|----------|-----------|----------|
| Small (handheld) | Small | Handheld | Crystal 5-10cm, weapon 30-50cm, tool 20-40cm |
| Medium | Medium | Single-person carry | 30-100cm |
| Large | Large | Multi-person carry | 1-3m |
| Industrial equipment | Extra Large | Fixed installation | 3m+ |

### Material Inference

| Category | Default type | Default surface | Basis |
|---------|---------|----------------|---------|
| Weapon | Metal/Composite | Brushed/Worn | Art direction: metal |
| Tool/Equipment | Metal/Plastic | Industrial texture | Art direction: synthetic |
| Special prop | Energy crystal | Smooth transparent | Art direction: crystal spec |
| Building component | Metal/Concrete | Rough/Brushed | Art direction: concrete |
| Daily prop | Wood/Fabric | Natural texture | Art direction: fabric |

Special properties: "glowing" → self-illuminating; "energy flow" → internal energy visible; "smoke" → smoke effect; "waterproof" → waterproof sealed.

### Color Scheme Inference

- Underwater base scene → secondaryPalette (deep blue #4A90D9 etc.)
- Land ruins scene → primaryPalette (gray-blue #7A8B8B etc.)
- Special prop (crystal) → script description ("dark purple/gold")
- Weapon/danger → cool tones (metallic gray/black/red)
- Daily/warm → warm tones (wood/cream/warm white)
- Glow props → accent color = glow color
- Core + positive emotion → noble/rare feel; core + negative → cold/dangerous

### Visual Effects Inference

- "glowing" → glowType: "constant"; "flashing" → "flashing"; "pulsing" → "pulsing"
- "high-purity/enhanced" → glowIntensity: "strong"; "normal/basic" → "weak"
- Glow color: default = primary color; script explicit → use script
- "energy flow/particles" OR strong glow → particles: true
- Strong glow + particles → ambientEffect: "air distortion"

### Inference Priority

1. Script explicit → use directly, no `_inferred` mark
2. Script partial → supplement with inference, mark `_inferred: true`
3. Script none → fully infer, mark `_inferred: true`

