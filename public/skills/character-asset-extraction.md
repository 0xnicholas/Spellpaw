---
id: character-asset-extraction
name: character-asset-extraction
description: Use when a CharacterSettingCard must be converted into a CharacterAssetCard for visual translation, costume requirements, and downstream character image generation
slashCommand: character-asset-extraction
examples: []
parameters: {}
required: []
---

# Character Asset Extraction Skill

Extract and translate visual information from character setting cards (Creation Zone), creating character asset cards (Asset Zone - Intermediate Assets).

## Overall Workflow

```
Input: CharacterCard (character setting card, from Creation Zone)
Optional Input: WorldviewCard, ArtDirectionCard (for inference)

Stage 1: Dependency Check
  Check if character setting card exists
  Check worldview card, art direction card (optional)

Stage 2: Extract Inherited Information
  Read from character setting card:
  - Basic info (name, age, gender, occupation)
  - Personality traits
  - Motivations and goals
  - Visual forms (if any)

Stage 3: Visual Translation
  Personality → Typical expressions (5)
  Motivation → Typical actions (5)
  Synthesis → Overall aura

Stage 4: User Supplements Physical Details
  Display translated information
  Guide user to supplement:
  - Physical details (height, build, skin tone, facial features)
  - Hairstyle (style, color, accessories)
  - Costume style (primary style, colors, materials, layers)
  - Accessories (jewelry, weapons, props, distinctive marks)

Stage 5: Determine Costume Requirements
  Determine number of costume designs based on visual forms
  Name each costume design
  Link to episode range

Stage 6: Create Character Asset Card
  Integrate all information
  Create card
  Establish upstream/downstream connections

Output: CharacterAssetCard
```

---

## Stage 1: Dependency Check

**Purpose**: Ensure required upstream cards exist.

**Check Items**:
1. Character setting card (required)
2. Worldview card (optional, for inference)
3. Art direction card (optional, for inference)

**Error Handling**:
- If character setting card does not exist, terminate execution and notify user

---

## Stage 2: Extract Inherited Information

**Purpose**: Read conceptual-level information from the character setting card.

**Extraction Fields**:
```typescript
interface InheritedInfo {
  characterId: string;
  characterName: string;
  role: 'protagonist' | 'antagonist' | 'supporting' | 'minor';
  sourceCharacterSchemaVersion: "CharacterSettingCard.v1";
  legacyFieldCompatibility?: {
    usedLegacyFields: string[];
    ignoredLegacyFields: string[];
    notes: string;
  };
  biography: {
    age?: string;
    gender?: string;
    occupation?: string;
    socialStatus?: string;
    appearance?: string;
    backstory?: string;
    personalityTraits: string[];
    relationships?: Array<{
      characterId?: string;
      targetCharacter: string;
      relationship: string;
    }>;
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
  visualForms?: Array<{
    formName: string;
    episodeRange: string;
    appearanceChange: string;
    triggerEvent: string;
  }>;
}
```

**Extraction Rules**:
1. The current formal fields of the Creation Zone `CharacterSettingCard` are the sole authority:
   - `content.role`
   - `content.biography.backstory`
   - `content.motivation.surfaceDesire`
   - `content.motivation.deepDesire`
   - `content.motivation.drivingForce`
   - `content.coreConflict.externalConflict`
   - `content.coreConflict.internalConflict`
   - `content.visualForms[].appearanceChange`
2. Do not read legacy fields as primary source:
   - `biography.background`
   - `motivation.goals`
   - `motivation.fears`
   - `motivation.internalConflict`
   - `visualForms[].description`
3. If a historical card only has legacy fields, may enter `legacyFieldCompatibility`:
   - Legacy `biography.background` may only be migrated to `biography.backstory`
   - Legacy `motivation.goals[]` may only serve as candidate summary for `surfaceDesire`, must be marked as legacy
   - Legacy `motivation.fears[]` must not override `coreConflict.internalConflict`
   - Legacy `visualForms[].description` may only serve as candidate summary for `appearanceChange`, must be marked as legacy
4. Inherited information must not be overwritten by inference; inference can only write to visual translation or user-supplemented fields
5. `role` must support `minor`; narration, system voice, and pure VO characters should not automatically enter the visual asset pipeline

---

## Stage 3: Visual Translation

**Important Principles**:
1. **Per-form Translation**: If the character setting card has multiple visual forms (visualForms), each form must have its own expressions, actions, and aura translated separately
2. **Personality Difference Recognition**: Different forms may have different personality traits (e.g., past-life cowardice vs post-rebirth coldness); translation must be based on each form's personality state
3. **Avoid Contradictions**: Ensure each form's expressions and actions are consistent with that form's personality traits

### Step 1: Identify Visual Forms

Check the `visualForms` field in the character setting card:
- If multiple forms exist, extract each form's personality state description
- If no such field, treat as a single form

### Step 2: Personality → Typical Expressions (Per Form)

**Purpose**: Translate abstract personality traits into concrete facial expressions.

**Translation Rule Library**:

| Personality Trait | Expression Name | Expression Description | Trigger Scenario | Confidence |
|---------|---------|---------|---------|--------|
| Strong Loyalty / Valuing Relationships | Concerned Gaze | Slightly raised brows, gentle and focused eyes, faint smile at corners of mouth | When concerned about team members | 0.9 |
| Sense of Responsibility | Resolute Gaze | Relaxed brows, firm and determined eyes, tightly pressed lips | When facing crisis, making decisions | 0.9 |
| Scheming / Cunning | Cold Smirk | Slightly upturned corner of mouth, icy sharp eyes, with mockery | When facing enemies | 0.85 |
| Gentle | Gentle Smile | Curved brows and eyes, naturally upturned mouth corners, soft warm eyes | When interacting with close ones | 0.9 |
| Sense of Duty | Pensive Concentration | Slightly furrowed brows, deep eyes, gaze slightly lowered | When analyzing situations, planning | 0.85 |
| Calm | Composed Gaze | Relaxed face, steady eyes, unreadable expression | When handling emergencies | 0.9 |
| Decisive | Sharp Gaze | Tightly furrowed brows, sharp eyes, firmly pressed lips | When making important decisions | 0.85 |
| Kind | Soft Smile | Relaxed brows and eyes, gentle upturned mouth corners, eyes full of care | When helping others | 0.9 |
| Alert | Vigilant Scan | Slightly furrowed brows, sharp eyes, quickly scanning surroundings | When sensing danger | 0.85 |
| Confident | Confident Smile | Upturned mouth corners, firm eyes, full of confidence | When demonstrating ability | 0.9 |
| Cowardly | Helpless Bewilderment | Tightly furrowed brows, hollow lifeless eyes, downturned mouth corners | When oppressed, threatened | 0.9 |
| Fearful | Panicked Terror | Wide eyes, constricted pupils, slightly parted lips | When facing danger | 0.9 |
| Exhausted | Weary Numbness | Drooping eyelids, slack face, vacant eyes | When overworked | 0.85 |
| Controlling | Arrogant Overlook | Eyes looking down from above, contemptuous smile at mouth corners | When displaying power | 0.9 |

**Translation Process (Multi-form Version)**:
1. Iterate through each visual form
2. Extract personality traits corresponding to that form (inferred from `appearanceChange`, `triggerEvent`, or personality arc)
3. For each personality trait, look up the translation rule library
4. If a matching rule is found, generate the corresponding expression
5. If fewer than 5 expressions, add a "neutral expression" or the form's most relevant expression
6. Annotate each expression's source (inherited/inferred), confidence, and associated form

**Output Format**:
```typescript
interface TypicalExpression {
  visualForm: string;  // Associated visual form
  expressionName: string;
  description: string;
  trigger: string;
  basedOnTrait: string;
  confidence: number;
  source: 'inherited' | 'inferred';
}
```

### Step 3: Motivation → Typical Actions (Per Form)

**Purpose**: Translate abstract motivations and goals into concrete physical actions.

**Translation Rule Library**:

| Motivation Keyword | Action Name | Action Description | Trigger Scenario | Confidence |
|-----------|---------|---------|---------|--------|
| Protect | Shield in Front | Arms spread wide, body leaning forward, resolute gaze | When protecting the team | 0.9 |
| Lead | Command Gesture | Gestures concise and powerful, full of control | When leading the team | 0.9 |
| Think / Strategize | Pondering | One hand on chin or stroking chin, focused gaze | When analyzing situations | 0.85 |
| Fight | Combat Stance | Body slightly leaning forward, center of gravity lowered, both hands clenched or holding weapon | When facing enemies | 0.9 |
| Comfort | Pat on Shoulder | Reaching out to gently pat the other's shoulder, gentle gaze | When comforting others | 0.85 |
| Guard | Alert Stance | Body tensed, hand on weapon, scanning gaze | When sensing danger | 0.9 |
| Negotiate | Open-palm Gesture | Both hands spread open, palms up, showing sincerity | When negotiating | 0.85 |
| Refuse | Waving Off | Palm pushing outward, indicating refusal or denial | When rejecting requests | 0.85 |

**Translation Process**:
1. Iterate through the character's motivation and goal list
2. Extract keywords (e.g., "protect", "lead", "fight")
3. For each keyword, look up the translation rule library
4. If a matching rule is found, generate the corresponding action
5. Supplement actions based on personality traits (e.g., "sense of duty" → "pondering")
6. Select the 4-5 most relevant actions
7. Annotate each action's source and confidence

**Output Format**:
```typescript
interface TypicalAction {
  actionName: string;
  description: string;
  trigger: string;
  basedOnMotivation: string;
  confidence: number;
  source: 'inherited' | 'inferred';
}
```

### Step 4: Synthesis → Overall Aura

**Purpose**: Infer the character's overall aura based on personality and motivation.

**Inference Rules**:

**Posture**:
- Responsible / Leader → "Upright and confident, body straight, center of gravity stable"
- Cautious / Introverted → "Slightly withdrawn, shoulders slightly hunched inward"
- Default → "Naturally relaxed, posture at ease"

**Gait**:
- Decisive / Military → "Stride firm and powerful, rhythm steady"
- Elegant / Aristocratic → "Gait light and graceful, movements fluid"
- Default → "Gait natural, rhythm moderate"

**Gesture Style**:
- Responsible / Decisive → "Gestures concise and powerful, full of control"
- Gentle / Refined → "Gestures soft and delicate, movements light"
- Default → "Gestures natural, movements moderate"

**Eye Characteristics**:
- Sharp / Alert → "Eyes sharp and deep, full of intensity"
- Gentle / Kind → "Eyes soft and warm, full of care"
- Default → "Eyes calm and natural, slightly deep"

**Output Format**:
```typescript
interface OverallAura {
  posture: string;
  gait: string;
  gestureStyle: string;
  eyeCharacteristics: string;
  emotionalTone?: string;
  confidence: number;
  source: 'inferred';
}
```

---

## Stage 4: User Supplements Physical Details

**Purpose**: Guide the user to supplement specific physical details, completing the conversion from conceptual to concrete level.

**Important Principles**:
1. **Suggest First, Then Confirm**: Do not have the user start from a blank slate; provide a complete suggested plan based on character settings, art direction, and script logic
2. **Organize Per Form**: If the character has multiple visual forms, must supplement physical details (hairstyle, costume, accessories) for each form separately
3. **Reference Art Direction**: Costume color schemes must reference the art direction card's color system and character clothing material guidelines
4. **Natural Interaction**: Avoid mechanical form-filling; present suggestions in a natural conversational manner

### Step 1: Display Translated Information

Display to the user (per form):
1. Each form's typical expressions (5)
2. Each form's typical actions (4-5)
3. Each form's overall aura

Each piece of information annotated with:
- Associated visual form
- Source (inherited/inferred)
- Confidence (0-1)
- Based on which personality trait or motivation

### Step 2: Provide Physical Detail Suggestions (Per Form)

**Step 2.1: Read Art Direction**

Before providing suggestions, first read the art direction card (if available):
- Color system (primary palette, color contrast strategy)
- Character clothing material guidelines
- Per-scene visual guidance

**Step 2.2: Provide Complete Suggestions for Each Form**

For each visual form, provide:

**Physical Details**:
- Height, build, skin tone, facial features (eyebrows, eyes, nose bridge, lips, contour, facial hair)
- Inferred from the character setting's appearance description
- Annotate inference rationale

**Hairstyle**:
- Style, color, accessories
- Inferred from the form's personality state and scene positioning
- Annotate inference rationale

**Costume Style**:
- Primary style, color scheme, materials, layers, details
- **Color scheme must reference art direction** (e.g., undersea base scenes use deep blue + warm tones, post-apocalyptic exterior uses cool gray + gray-green)
- **Materials must reference art direction** (e.g., cotton, knit, premium fabrics)
- Annotate inference rationale

**Accessories**:
- Jewelry, weapons, props, distinctive marks
- Inferred from iconic elements in the character setting and the form's social status
- Annotate inference rationale

**Example Format**:
```
### Form 1: Past-life Lin Yuan (Episode 1 flashback)

**Scene Context**: Pre-apocalypse urban workplace corporate drone, oppressed and betrayed cowardly state

#### Physical Details
**Height**: Medium-tall (175-180cm)
...

#### Hairstyle
**My Suggestion**:
- Style: Ordinary short hair, slightly disheveled, bangs lightly covering brows
- Color: Black
- Accessories: None

**Rationale**: Consistent with the exhausted state of a corporate drone, no energy to manage appearance

#### Costume Style
**My Suggestion** (based on Art Direction - Pre-apocalypse Urban Palette):
- Primary Style: Business attire (shirt and slacks)
- Color Scheme: Gray shirt + black slacks + dark gray tie (consistent with art direction's "neutral gray, everyday clothing colors")
- Material: Ordinary cotton fabric, slightly wrinkled
...

**Rationale**: Gray tones consistent with art direction's "pre-apocalypse urban" flat oppressive tone

#### Accessories
**My Suggestion**:
- Jewelry: Cheap plastic strap watch (or none)
- Weapon: None
...

**Rationale**: Consistent with bottom-tier corporate drone's economic status
```

### Step 3: User Confirmation Mechanism

For all inferred information (source='inferred' and confidence<0.9), ask user to confirm:
```
The following information was inferred based on the character setting. Please confirm if accurate:

1. Expression "Concerned Gaze": Slightly raised brows, gentle and focused eyes, faint smile at mouth corners
   - Based on trait: Strong Loyalty
   - Confidence: 90%
   - Is this accurate? (Yes / No / Modify)

2. Action "Shield in Front": Arms spread wide, body leaning forward, resolute gaze
   - Based on motivation: Protect the team
   - Confidence: 90%
   - Is this accurate? (Yes / No / Modify)

...
```

User can:
- Confirm (keep as-is)
- Deny (delete the item)
- Modify (provide new description)

Modified information annotated as `source='user_provided'`, `confidence=1.0`

---

## Stage 5: Determine Costume Requirements

**Purpose**: Determine the number and list of costume designs needed based on visual forms.

### Step 1: Determine Costume Designs Based on Visual Forms

If the character setting card has a `visualForms` field:
```typescript
visualForms: [
  { formName: "Past-life General", episodeRange: "1-5", appearanceChange: "...", triggerEvent: "..." },
  { formName: "Present-life Merchant", episodeRange: "6-10", appearanceChange: "...", triggerEvent: "..." },
  { formName: "Post-apocalyptic Leader", episodeRange: "11-20", appearanceChange: "...", triggerEvent: "..." }
]
```

Then create one costume requirement per visual form:
```typescript
costumeRequirements: [
  { costumeId: "costume_linyuan_past_general", costumeName: "Past-life General", formName: "Past-life General", episodeRange: "1-5", sceneIds: [], appearanceChange: "...", triggerEvent: "...", baseOnForm: "Past-life General" },
  { costumeId: "costume_linyuan_modern_merchant", costumeName: "Present-life Merchant", formName: "Present-life Merchant", episodeRange: "6-10", sceneIds: [], appearanceChange: "...", triggerEvent: "...", baseOnForm: "Present-life Merchant" },
  { costumeId: "costume_linyuan_apocalypse_leader", costumeName: "Post-apocalyptic Leader", formName: "Post-apocalyptic Leader", episodeRange: "11-20", sceneIds: [], appearanceChange: "...", triggerEvent: "...", baseOnForm: "Post-apocalyptic Leader" }
]
```

If no `visualForms` field, create one default costume:
```typescript
costumeRequirements: [
  { costumeId: "costume_default", costumeName: "Default Costume", formName: "Default Form", episodeRange: "Entire Series", sceneIds: [], appearanceChange: "No distinct form change", triggerEvent: "Default creation", baseOnForm: null }
]
```

### Step 2: User Confirms Costume List

Display the costume list to user:
```
## Costume Requirement List

I have determined the following costume requirements for character **Lin Yuan**:

1. **Past-life General**
   - Episode Range: Episodes 1-5
   - Description: Ancient battle armor, deep red + black, hair up in crown

2. **Present-life Merchant**
   - Episode Range: Episodes 6-10
   - Description: Modern suit, deep blue + white shirt

3. **Post-apocalyptic Leader**
   - Episode Range: Episodes 11-20
   - Description: Dark jacket + dark pants + tactical boots

---

Please confirm the above costume list is correct, or indicate modifications needed.
```

User can:
- Confirm (keep as-is)
- Modify (adjust costume names, episode ranges, descriptions)
- Add (add new costume designs)
- Delete (remove a costume design)

---

## Stage 6: Create Character Asset Card

**Purpose**: Integrate all information, create the character asset card.

**Card Structure**:
```typescript
interface CharacterAssetCard extends BaseCard {
  type: 'character_asset';
  title: string;  // e.g., "Lin Yuan - Character Asset"
  upstreamCards: CardRef[];
  
  content: {
    characterId: string;
    characterName: string;
    role: 'protagonist' | 'antagonist' | 'supporting' | 'minor';
    sourceCharacterSchemaVersion: "CharacterSettingCard.v1";
    legacyFieldCompatibility?: {
      usedLegacyFields: string[];
      ignoredLegacyFields: string[];
      notes: string;
    };
    
    inheritedFromCharacter: InheritedInfo;
    
    visualTranslation: {
      typicalExpressions: TypicalExpression[];
      typicalActions: TypicalAction[];
      overallAura: OverallAura;
    };
    
    userInput: {
      physicalDetails: PhysicalDetails;
      hairstyle: Hairstyle;
      costumeStyle: CostumeStyle;
      accessories: Accessories;
    };
    
    costumeRequirements: Array<{
      costumeId: string;
      costumeName: string;
      formName: string;
      episodeRange: string;
      sceneIds: string[];
      appearanceChange: string;
      triggerEvent: string;
      baseOnForm: string | null;
      userConfirmed: boolean;
    }>;
    
    downstreamCostumeCards: CardRef[];  // Character costume three-view card reference list
  };
}
```

**Creation Process**:
1. Generate unique card ID
2. Integrate all information into the card structure
3. Save card to canvas
4. Create upstream/downstream connections (Character Setting Card → Character Asset Card)
5. Return created card

---

## Annotation Standards

All inferred information must annotate source and confidence:

```typescript
type InformationSource = 
  | 'inherited'        // Inherited from upstream card
  | 'inferred'         // Inferred based on rules
  | 'user_provided'    // User directly provided
  | 'default';         // Default value

interface InformationWithSource {
  value: any;
  source: InformationSource;
  confidence: number;  // 0-1, confidence level
  basedOn?: string;    // What information this is based on
}
```

**Confidence Calculation**:
- inherited: 1.0 (inherited information 100% trustworthy)
- user_provided: 1.0 (user-provided 100% trustworthy)
- inferred: 0.8-0.9 (inferred information 80-90% trustworthy, depends on rule accuracy)
- default: 0.5 (default value 50% trustworthy)

---

## Error Handling

### Error 1: Character Setting Card Does Not Exist
```
Error: Character setting card does not exist
Solution: Please use /script-deconstruct first to create a character setting card
```

### Error 2: Personality Traits Empty
```
Warning: No personality traits in the character setting card
Solution: Use default expressions, guide user to supplement personality traits
```

### Error 3: Motivation Empty
```
Warning: No motivation information in the character setting card
Solution: Use default actions, guide user to supplement motivation
```

---

## Test Cases

### Test Case 1: Lin Yuan (Complete Information)

**Input**:
- Character setting card: Lin Yuan
  - Personality: Strong loyalty, responsible, scheming (toward enemies), gentle (toward team), sense of duty
  - Motivation: Protect the team, survival strategy, revenge
  - Visual Forms: Past-life General, Present-life Merchant, Post-apocalyptic Leader

**Expected Output**:
- Character asset card: Lin Yuan
  - Typical Expressions: Concerned Gaze, Resolute Gaze, Cold Smirk, Gentle Smile, Pensive Concentration
  - Typical Actions: Shield in Front, Pondering, Corpse Manipulation Gesture, Command Gesture
  - Costume Requirements: 3 sets (Past-life General, Present-life Merchant, Post-apocalyptic Leader)

### Test Case 2: Shen Zhixia (Partial Information)

**Input**:
- Character setting card: Shen Zhixia
  - Personality: Kind, strong, gentle
  - Motivation: Protect family
  - Visual Forms: None

**Expected Output**:
- Character asset card: Shen Zhixia
  - Typical Expressions: Soft Smile, Resolute Gaze, Gentle Smile, Concerned Gaze, Neutral Expression
  - Typical Actions: Shield in Front, Pat on Shoulder, Comfort Gesture, Default Action
  - Costume Requirements: 1 set (Default Costume)

---

## Implementation Checklist

When executing this skill, check in the following order:

- [ ] Stage 1: Dependency check complete, character setting card exists
- [ ] Stage 2: Inherited information extraction complete, all fields read
- [ ] Stage 3: Visual translation complete
  - [ ] Typical expressions: 5
  - [ ] Typical actions: 4-5
  - [ ] Overall aura: Generated
- [ ] Stage 4: User supplementation complete
  - [ ] Physical details: Supplemented
  - [ ] Hairstyle: Supplemented
  - [ ] Costume style: Supplemented
  - [ ] Accessories: Supplemented
  - [ ] All inferred information confirmed
- [ ] Stage 5: Costume requirements determined, user confirmed
- [ ] Stage 6: Character asset card created successfully
  - [ ] Card ID generated
  - [ ] All fields populated
  - [ ] Upstream/downstream connections established

---

**Skill Version**: v1.0  
**Created**: 2026-05-29  
**Test Status**: Passed Lin Yuan character test

## Next Step After Completion

Completion criteria: `CharacterAssetCard` created, character visual translation, physical details, and costume requirements confirmed.

After completing current character asset extraction, prioritize calling `character-costume-designer` to produce the current character asset into a formal `CharacterCostumeCard`.

If other character assets remain unextracted, continue with current skill; if the user is working on a specific episode/scene, prioritize characters appearing in that episode/scene.

Recommended phrasing: `Current character asset extraction is complete. It is recommended to prioritize calling character-costume-designer to create this character's costume three-view. Continue?`
