---
name: director-briefing
description: Use when an EpisodeSceneDetailCard needs director precheck (initial content load assessment and structure selection); or when scene/performance/cinematography strategy cards are all complete and need director review, continuity audit, and shot group finalization
---

# Director Briefing

Based on episode/scene plot cards, first perform an initial content load assessment and structure selection for the entire scene, creating a DirectorBriefingCard; then dispatch the scene strategy, performance strategy, and cinematography strategy skills as sub-skills; once all three strategy cards are complete, return to the director briefing for content load recheck, continuity audit, and shot group finalization, producing a structured storyboard production plan.

**Core principle of this skill**: Not a final summarization step, but the central director hub of the production zone — determines upfront "how this scene will be shot," constrains the design direction of the three strategy cards, and finally converts strategies into executable shot groups.

---

## Overall Workflow

```
First entry input: Episode/scene plot cards
  ↓
Stage 0: Confirm series-wide video generation duration config
  - Read FullScriptCard.metadata.videoGenerationProfile
  - If missing, ask user whether to adopt the production config supporting up to 30-second shot groups
  - Accepted: subsequent unfinalized shot groups cap at 30s; explicitly declined: 15s
  - Write confirmed config to DirectorBriefingCard snapshot
  ↓
Stage A: Director Precheck (create DirectorBriefingCard.precheck)
  - Extract plot content and narrative purpose
  - Identify rhythm changes and emotional curve
  - Find key turning points (plot twists, emotional climax, key dialogue)
  - Assess duration, complexity and split necessity based on playable content
  - Select primary/secondary structure
  - Generate preliminary shot group split suggestions
  - Write design directives for scene/performance/cinematography strategy cards
  ↓
Stage B: Dispatch sub-skills
  - Scene strategy: read DirectorBriefingCard.precheck.strategyDirectives.scene
  - Performance strategy: read DirectorBriefingCard.precheck.strategyDirectives.performance
  - Cinematography strategy: read DirectorBriefingCard.precheck.strategyDirectives.cinematography
  - Write back to DirectorBriefingCard.strategyCards after all three are complete
  ↓
Second entry input: DirectorBriefingCard + SceneStrategyCard + PerformanceStrategyCard + CinematographyStrategyCard
  ↓
Stage C: Director Review (update DirectorBriefingCard.finalBriefing)
  - Determine if the prechecked structure still holds
  - Assess whether content load has become heavier/lighter after strategy card expansion
  - Perform continuity audit: axis, eyeline, blocking, movement direction, prop hand, props, costume state, lighting, emotional residue
  ↓
Stage D: Shot Group Finalization
  - Scene strategy: lighting, color tone, atmosphere, character positions
  - Performance strategy: each character's actions, expressions, dialogue delivery
  - Cinematography strategy: all shots' shot sizes, camera movements, angles, parameters
  - Final shot group breakdown based on review results
  - Consider editing rationality (narrative flow, rhythm, natural transitions)
  - Consider duration rationality (each group ≤ current config's maxShotGroupDuration)
  - Define tail frame anchors for each shot group
  - Form structured shot list and StoryboardPlanCard
  - Use guided questions to confirm with user when uncertain
  ↓
Output: DirectorBriefingCard + StoryboardPlanCard
```

---

## Operating Mode Determination

Automatically determine current stage based on input:

- If only episode/scene plot cards are provided: execute `Director Precheck`, create `DirectorBriefingCard` with status `precheck` or `strategies_in_progress`.
- If `DirectorBriefingCard.precheck` exists but the three strategy cards are not yet complete: prompt to continue completing scene strategy, performance strategy, and cinematography strategy.
- If `DirectorBriefingCard` exists and all three strategy cards are complete: execute `Director Review + Shot Group Finalization`, update `DirectorBriefingCard.finalBriefing` and create `StoryboardPlanCard`.

---

## Reference Routing

Heavy rules for this skill are placed in `references/`, read on demand:

- Content load assessment, structure selection, preliminary shot group split: read `references/content-load-and-structure.md`.
- Series-wide video model preferences, 15/30s caps, card snapshots and legacy card compatibility: read `references/video-generation-duration-profile.md`.
- Director review, continuity audit, tail frame anchors: read `references/continuity-tailframe-audit.md`.
- Quality checks, compression and splitting before shot group finalization: read `references/director-quality-self-check.md`.
- Testing, review or major changes to the production zone skills: read `references/production-regression-cases.md`.

Do not regurgitate these references to the user; use them as internal judgment basis, outputting concise director judgments and card fields.

---

## Stage A: Director Precheck

**Goal**: Before the three strategy cards, determine the content load, primary structure, and design priorities for the three sub-strategy cards for the entire scene.

### A.0 Confirm Series-Wide Video Generation Duration Config

Before content load assessment and preliminary shot group split, read:

```text
FullScriptCard.metadata.videoGenerationProfile
```

If field is missing or `userConfirmed !== true`, ask the user whether to adopt the Seedance 2.5 production config supporting up to 30-second single video generation:

- Accept: `supports30SecondShotGroup = true`, `maxShotGroupDuration = 30`.
- Explicitly decline: `supports30SecondShotGroup = false`, `maxShotGroupDuration = 15`.
- Cannot complete `DirectorBriefingCard.precheck` before confirmation.
- Once confirmed, subsequent scenes in the same series inherit it without re-asking.

Save confirmed config to:

```text
DirectorBriefingCard.videoGenerationProfileSnapshot
```

This field expresses the user-confirmed production planning capability; actual video generation still queries the target API's real capabilities via `video-creator`.

### A.1 Global Understanding of the Scene

**Goal**: Understand the scene's narrative purpose, rhythm, and key priorities from the episode/scene plot card.

### A.1.1 Read Episode/Scene Plot Card

**Input**:
- `sceneId`: Scene ID (e.g. "Episode 1 - Scene 3")
- `FullScriptCard.metadata.videoGenerationProfile`: Series-wide video generation capability config; complete A.0 confirmation first if missing

**Information to extract**:

#### 1.1.1 Plot Content
- `visualDescription`: Visual description array (sorted by sequence)
- `sceneElements.environment`: Environment description
- `sceneElements.characterStates`: Character states
- `sceneElements.objects`: Important objects
- `dialogueLines`: Dialogue list (if any)

#### 1.1.2 Rhythm and Emotion
- `rhythm`: Rhythm (fast/medium/slow)
- `emotion`: Emotional tone
- `emotionIntensity`: Emotional intensity (1-10)
- `tension`: Tension level (1-10)

#### 1.1.3 Narrative Structure
- `narrativeRole`: Narrative role (exposition/rising/climax/falling/resolution)
- `dramaticFunction`: Dramatic function (conflict/reveal/decision/action/reflection)
- `keyConflict`: Core conflict (if any)

#### 1.1.4 Cinematographic Intent
- `cameraInfo.purpose`: Shot purpose
- `cameraInfo.focus`: Visual focus
- `duration`: Estimated duration

---

### A.1.2 Analyze the Scene's Core Priorities

**Execution logic**: Based on extracted information, answer the following questions

#### Question 1: What is the narrative purpose of this scene?

**Analysis dimensions**:
- **narrativeRole**: Role in the overall story (setup/advancement/climax/resolution)
- **dramaticFunction**: Specific dramatic function (conflict/reveal/decision/action/reflection)
- **keyConflict**: What is the core contradiction

**Output format**:
```
Narrative purpose: [one-sentence summary]

Examples:
- "Show the protagonist's calm and determination in the face of crisis, setting up the upcoming battle"
- "Reveal hidden conflicts between two people through dialogue, driving the plot forward"
- "Build a tense atmosphere, demonstrate the enemy's power, create suspense"
```

---

#### Question 2: What is the emotional curve of this scene?

**Analysis dimensions**:
- **emotion + emotionIntensity**: Starting emotion and intensity
- **visualDescription**: Infer emotional changes from visual descriptions
- **tension**: Tension changes
- **dialogueLines**: Infer emotional shifts from dialogue content

**Output format**:
```
Emotional curve: [starting point] → [turning point 1] → [turning point 2] → [end point]

Examples:
- "Calm alertness(3) → Tense after seeing the crisis(7) → Resolute after making up mind(8)"
- "Warm and peaceful(2) → Growing rift during dialogue(5) → Conflict erupts in anger(9)"
- "Curious exploration(4) → Shocked after discovering truth(10) → Relieved after understanding(6)"
```

---

#### Question 3: Where are the key turning points in this scene?

**Analysis dimensions**:
- **Plot twist**: The moment the plot shifts from state A to state B
- **Emotional climax**: The moment emotional intensity peaks
- **Key dialogue**: Dialogue that reveals important information or drives the plot
- **Key action**: Action that changes the situation

**Identification method**:
1. Traverse the `visualDescription` array, identify transition words in the description: "but", "suddenly", "at this moment", "however"
2. Identify important dialogue in `dialogueLines` (usually short sentences, rhetorical questions, decisive statements)
3. Identify state changes in `characterStates`

**Output format**:
```
Key turning points:

#1 [estimated time: Xs] [type: plot twist / emotional climax / key dialogue / key action]
Description: [specific content]
Importance: critical/important/supporting

Example:
#1 [0s] [Plot trigger] Lin Yuan sees the zombie horde surging toward him
Importance: critical
Reason: Triggers the core event of the entire scene

#2 [8s] [Emotional shift] Lin Yuan changes from alert to resolute
Importance: important
Reason: Key change in the character's inner state

#3 [12s] [Key dialogue] Lin Yuan says "They're coming"
Importance: important
Reason: Announces the imminent battle, driving the plot forward
```

---

#### Question 4: What are the core priorities this scene needs to express?

**Comprehensive analysis**: Based on narrative purpose, emotional curve, and key turning points, distill 2-3 core priorities

**Output format**:
```
Core priorities:

1. [Priority 1]: [Why it matters]
2. [Priority 2]: [Why it matters]
3. [Priority 3]: [Why it matters] (if applicable)

Example:
1. Show the protagonist's determination: Through facial expression changes and body language, show Lin Yuan's inner transformation from alert to resolute
2. Build a sense of crisis: Through environmental description (flood, zombie horde) and light/shadow contrast, create the oppressive atmosphere of an apocalyptic crisis
3. Set up for battle: Through camera push-ins and character actions, foreshadow the impending fierce battle
```

---

### A.2 Content Load Assessment

Do not judge solely by text length. Assess whether the scene's actual playable visual content can be carried by a single shot group:

- Number of plot nodes or reversals
- Number of key dialogue lines, pre-speech pauses, listener reactions
- Physical actions, spatial movement, fighting, embracing, falling, picking up/placing props
- Emotional turning points and micro-expression settling time
- Scene/location/time changes
- Camera movements, reframing, and the time needed to widen shot size before major actions
- Final 1-2 seconds of breathing, reaction, sound tail, or tail frame hold

Output format:

```text
【Content Load Assessment】
Content load level: low / medium / high / overloaded
Playable beat count: X beats
Estimated playable duration: X-Y seconds
Assessment reasoning:
- Plot nodes: ...
- Dialogue and reactions: ...
- Actions / spatial movement: ...
- Emotional turning points: ...
- Ending resonance: ...
Split tendency: single shot group / 2-3 groups / 4+ groups / needs compression first
```

If it exceeds what one `maxShotGroupDuration` shot group can naturally carry, do not force it. First provide preliminary shot group split suggestions, letting the three strategy cards work around this split.

### A.3 Structure Selection Precheck

Select the structure first, then dispatch the three strategy cards. The structure determines scene blocking, performance organization, and cinematography strategy.

| Structure | Use Case | Three Strategy Cards' Focus |
|---|---|---|
| Single-scene one-take | One space, one continuous emotional change, few actions | Scene maintains single movement line; performance emphasizes continuous action anchor points; cinematography emphasizes one stable movement path |
| Single-scene continuity editing | Multiple action/reaction nodes within one location | Scene defines foreground/midground/background; performance advances by nodes; cinematography uses 3-5 shots for establishing, reacting, ending |
| Multi-person dialogue cross-cutting | 2-4 person relationship pressure from dialogue and silence | Scene determines axis/seating/eyeline; performance emphasizes dialogue and listener reactions; cinematography designs relationship shots and reverse shots |
| Long close-up micro-expressions | Emotion primarily conveyed through face and head details | Scene compresses background and light sources; performance writes micro-expression timeline; cinematography uses ECU/CU and stable camera |
| Continuous action editing | Character moves through space with objective or escape/chase | Scene defines start/end/path; performance emphasizes action causality; cinematography maintains directional continuity |
| Montage / match cut | Memory, time compression, symbolism, or past/present contrast | Scene finds transition anchor points; performance maintains gesture/object correspondence; cinematography matches via sound, action or object |
| Large-scale scene compression | Disaster, battlefield, banquet, crowd scene following one person | Scene defines crowd pressure and protagonist anchor; performance avoids crowd stealing focus; cinematography keeps only 4-5 key nodes |
| Fight choreography | 1v1 or small cast with clear offense/defense | Scene locks environmental impact points; performance writes attack/defense chain; cinematography ensures full-body readability and spatial continuity |
| Long narrative split | Exceeds current `maxShotGroupDuration` capacity or multiple reversals | Scene/performance/cinematography work around preliminary shot group split; each group retains tail frame anchor |

Output format:

```text
【Structure Selection Precheck】
Primary structure: ...
Secondary structure: ...
Selection rationale: ...
Preliminary shot group split:
1. X-Ys: Core task...
2. X-Ys: Core task...
Directives for three strategy cards:
- Scene strategy: ...
- Performance strategy: ...
- Cinematography strategy: ...
```

### A.4 Create Director Briefing Card

Write the results of A.1-A.3 into `DirectorBriefingCard.precheck`:

```typescript
{
  cardType: "DirectorBriefingCard",
  workflowStatus: "precheck",
  videoGenerationProfileSnapshot,
  precheck: {
    narrativeObjective,
    emotionalCore,
    visualCore,
    playableContentLoad,
    playableBeatCount,
    estimatedPlayableDuration,
    primaryStructure,
    secondaryStructure,
    preliminaryShotGroupPlan,
    strategyDirectives
  }
}
```

After creation, prompt the user to proceed with the three sub-strategy cards: scene strategy, performance strategy, cinematography strategy.

### A.5 Output Precheck Results

Consolidate the first step's analysis results into an overall understanding of the scene:

```
============================================
Step 1: Global Understanding of the Scene
============================================

Scene: Episode 1 - Scene 3
Estimated duration: 45s
Rhythm: medium
Emotional tone: tense, oppressive

Narrative purpose:
  Show protagonist Lin Yuan's calm and determination facing the apocalypse crisis, setting up for the upcoming battle

Emotional curve:
  Calm alertness(3) → Tense after seeing the zombie horde(7) → Resolute after making up mind(8)

Key turning points:
  #1 [0s] [Plot trigger] Lin Yuan sees the zombie horde surging (critical)
  #2 [8s] [Emotional shift] Lin Yuan changes from alert to resolute (important)
  #3 [12s] [Key dialogue] Lin Yuan says "They're coming" (important)

Core priorities:
  1. Show the protagonist's determination: Through facial expression changes show inner transformation
  2. Build a sense of crisis: Through environment and light/shadow create oppressive atmosphere
  3. Set up for battle: Through camera push-ins foreshadow the fierce battle

============================================
```

---

## Stage C: Director Review

**Goal**: Understand the confirmed scene, performance, and cinematography design details, determine if they comply with `DirectorBriefingCard.precheck`, and provide basis for shot group finalization.

### C.1 Summarize Scene Strategy

**Read**: Scene strategy card (SceneStrategyCard)

**Extract information**:
- **lighting**: Lighting plan (type, direction, intensity, colorTemperature, description)
- **colorScheme**: Color scheme (dominantColor, accentColor, mood, description)
- **atmosphere**: Atmosphere (mood, tension, visualStyle)
- **characterPositions**: Character position list

**Understand design intent**:
- Why this lighting choice? (e.g. side light creates light/shadow contrast, reinforcing sense of crisis)
- How does the color scheme support emotion? (e.g. warm/cool contrast creates apocalyptic atmosphere)
- How do character positions serve the narrative? (e.g. protagonist centered to emphasize dominance)

**Output format**:
```
Scene strategy summary:

Lighting: Afternoon sunlight slanting from right, moderate intensity, warm color temperature
  → Design intent: Side light creates light/shadow contrast, reinforcing crisis; warm color temp contrasts with cool environment

Color scheme: Cool tones dominant (blue-gray water surface), warm orange accent (sunlight)
  → Design intent: Warm/cool contrast creates hope within the apocalypse, strong visual impact

Atmosphere: Oppressive, tense, apocalyptic crisis feeling
  → Design intent: Provides strong contrast for the protagonist's resolute determination

Character positions:
  - Lin Yuan: Foreground center, standing, facing camera
    → Design intent: Centered to highlight protagonist, facing camera enhances immersion
  - Zombie horde: Midground to background, surging in water
    → Design intent: Distance creates threat, surging motion creates pressure
```

---

### C.2 Summarize Performance Strategy

**Read**: Performance strategy card (PerformanceStrategyCard)

**Extract information**:
- **performanceType**: Performance nature (dialogue/action/mixed)
- **characterPerformances**: Performance design for each character
  - `actions.keyActions`: Key action list (timestamp, description, intensity, purpose)
  - `facialExpressions`: Expression design (dominantExpression, microExpressions)
  - `dialogue`: Dialogue delivery (if any)

**Understand design intent**:
- What is the purpose of each action?
- How do expression changes reflect the emotional curve?
- How does dialogue delivery support character personality?

**Output format**:
```
Performance strategy summary:

Performance nature: mixed (action + dialogue)

Lin Yuan:
  Action design:
    [0s] Standing by the water observing the zombie horde (moderate)
      → Purpose: Establish alert state, show calm
    [8s] Expression shifts from alert to resolute (moderate)
      → Purpose: Show inner determination, drive emotional curve
    [12s] Slowly turns around (subtle)
      → Purpose: Transition action, prepare for battle
    [15s] Grips weapon tightly (strong)
      → Purpose: Declare fighting will, action climax
  
  Expression design:
    Dominant expression: Solemn
    Micro-expression changes:
      [2s] Brows furrow slightly (seeing zombie horde) → Shows alertness
      [8s] Eyes show resolve (determined to face it) → Shows determination
  
  Dialogue delivery:
    [12s] "They're coming." (low, resolute, emphasis on "They're")
      → Purpose: Announce the crisis, show composure

Zombie horde (group character):
  Action design:
    [0s] Surge from underwater, advancing under giant zombie's command
      → Purpose: Create threat, establish crisis
```

---

### C.3 Summarize Cinematography Strategy

**Read**: Cinematography strategy card (CinematographyStrategyCard)

**Extract information**:
- **shootingStyle**: Shooting style (style, rationale)
- **equipment**: Equipment configuration
- **shots**: Complete shot list
  - `shotNumber`, `shotSize`, `cameraMovement`, `cameraAngle`
  - `duration`, `description`, `equipment`, `cameraParams`
- **transitions**: Transition design

**Understand design intent**:
- Why this shooting style?
- How does each shot serve the narrative?
- How do camera movement and angle support emotion?

**Output format**:
```
Cinematography strategy summary:

Shooting style: Documentary
  → Rationale: Enhance realism and urgency, immerse the audience

Equipment: ARRI ALEXA 65 + Signature Prime lens set

Shot list (11 shots total, 45.5s total duration):

#1 (3.5s) LS → Slow push-in → Eye-level front
  Description: Wide shot push-in, showing overall environment and zombie horde scale
  Equipment: Tripod + linear slider
  Parameters: ISO 800, f/2.8, 1/50s, 5600K, 35mm
  → Design intent: Establish spatial sense, show crisis scale

#2 (2.5s) MS → Static → Eye-level front
  Description: Medium shot static, focus on Lin Yuan's expression change
  Equipment: Tripod
  Parameters: ISO 800, f/2.0, 1/50s, 5600K, 50mm
  → Design intent: Capture expression detail, show inner transformation

#3 (2.0s) CU → Slight push-in → Low-angle front
  Description: Close-up slight push-in, capture determination in Lin Yuan's eyes
  Equipment: Tripod
  Parameters: ISO 800, f/1.8, 1/50s, 5600K, 85mm
  → Design intent: Low angle enhances sense of power, eye close-up shows determination

... (remaining shots)

Transition design:
  - Shot 1→2: Cut (quick switch to heighten tension)
  - Shot 2→3: Cut (maintain smooth rhythm)
  - Shot 8→9: Dissolve (emotional transition, from inner to action)
```

---

### C.4 Content Load Recheck

Compare the director precheck against the actual content load after the three strategy cards have been expanded:

```text
【Content Load Recheck】
Precheck: medium, estimated 30-45s, suggested 3 groups
Recheck: heavier / unchanged / lighter / needs_split
Reasons for change:
- Performance strategy added X key dialogue lines, requiring extra reaction time
- Scene strategy confirmed character needs to move from door to table, adding spatial movement
- Cinematography strategy split into X shots, of which shot X can be merged / must be kept
Handling plan:
- Keep original split / merge certain group / split certain group / compress secondary reactions
```

### C.5 Continuity Audit

Before shot group finalization, must check whether the three strategy cards conflict with each other:

- 180-degree axis and eyeline matching
- Character left/right positioning, foreground/midground/background, entry/exit and movement direction
- Prop hand, prop position, prop state changes
- Costume, hair/makeup, wounds, tear stains, dust, moisture, and other states
- Light source direction, color temperature, light/shadow continuity
- Whether emotion progresses rather than resets
- Whether shot group tail frame can serve as next group's first frame or video continuation reference

Output format:

```text
【Continuity Audit】
Axis / eyeline: ...
Space / blocking: ...
Props / prop hand: ...
Costume / state: ...
Lighting / color tone: ...
Emotional residue: ...
Risks and handling: ...
```

### C.6 Output Review Results

Integrate the three strategy card summaries:

```
============================================
Step 2: Three Strategy Card Summary
============================================

【Scene Strategy】
  Lighting: Side light, warm color temp, light/shadow contrast → Reinforce crisis
  Color scheme: Warm/cool contrast → Hope within apocalypse
  Atmosphere: Oppressive, tense → Contrast for character's determination
  Blocking: Protagonist centered, zombie horde in background → Highlight protagonist, distance creates threat

【Performance Strategy】
  Lin Yuan: Alert observation → Inner transformation → Resolute determination → Prepare for battle
  Key actions: Observe(0s) → Resolute(8s) → Turn(12s) → Grip weapon(15s)
  Expression curve: Solemn → Alert → Resolute
  Key dialogue: "They're coming"(12s, low and resolute)

【Cinematography Strategy】
  Style: Documentary → Enhance realism
  Shots: 11 shots, total 45.5s
  Camera movement characteristics: Push-in(establishing) → Static(expression) → Slight push(determination) → ...
  Transitions: Primarily Cut, key emotional transitions use Dissolve

【Interrelationships】
  - Scene's warm/cool contrast + Performance's emotional transformation + Cinematography's push-in rhythm → Together create "determination in crisis"
  - Side light's light/shadow contrast + Expression's subtle changes + Close-up's low angle → Together reinforce "sense of power"

============================================
```


---

## Stage D: Director's Shot Group Finalization

**Goal**: Based on the scene's narrative priorities, use directorial thinking to strategically break down shot groups, forming a structured shot list

**Core principles**:
1. **Serve narrative priorities**: Every shot group split must serve the scene's core priorities
2. **Editing rationality**: Narrative flow, rhythm, natural transitions
3. **Duration rationality**: Each group ≤ current card snapshot's `maxShotGroupDuration`; 30s is a ceiling, not a target
4. **Strategic decisions**: Use guided questions to confirm with user when uncertain

---

### D.1 Director's Split Strategies

#### Strategy 1: Split Based on Narrative Priorities

**Core idea**: Each shot group should be a complete narrative unit centered around one core priority

**Judgment method**:
1. Review the core priorities identified in step 1
2. Identify which shots express the same priority
3. Group shots expressing the same priority together

**Example**:
```
Core priority 1: Show the protagonist's determination

Corresponding shots:
  - Shots 1-3: Show Lin Yuan's alertness upon seeing the zombie horde
  - Shots 4-6: Show Lin Yuan's expression shifting from alert to resolute
  - Shots 7-9: Show determination in Lin Yuan's eyes

Strategy:
  → Shots 1-3 → Group 1 (Establish crisis)
  → Shots 4-6 → Group 2 (Inner transformation)
  → Shots 7-9 → Group 3 (Determination established)
```

---

#### Strategy 2: Split Based on Emotional Curve

**Core idea**: Split at emotional turning points, each shot group maintains emotional consistency

**Judgment method**:
1. Review the emotional curve identified in step 1
2. Identify emotional turning points (from emotion A to emotion B)
3. Split before and after turning points

**Example**:
```
Emotional curve: Calm alertness(3) → Tense(7) → Resolute(8)

Emotional turning points:
  - [0s-7s] Calm alertness → Tense
  - [7s-15s] Tense → Resolute

Strategy:
  → Split at 7s
  → Group 1(0-7s): Process from calm to tense
  → Group 2(7-15s): Process from tense to resolute
```

---

#### Strategy 3: Split Based on Key Turning Points

**Core idea**: Split before and after key turning points (plot twists, key dialogue, key actions)

**Judgment method**:
1. Review the key turning points identified in step 1
2. Confirm each turning point's importance (critical/important/supporting)
3. Prioritize splitting at critical and important turning points

**Example**:
```
Key turning points:
  #1 [0s] Lin Yuan sees zombie horde (critical)
  #2 [8s] Lin Yuan emotional shift (important)
  #3 [12s] Lin Yuan says "They're coming" (important)

Strategy:
  → Split at 8s and 12s
  → Group 1(0-8s): Establish crisis
  → Group 2(8-12s): Inner transformation
  → Group 3(12-?): Declare battle
```

---

#### Strategy 4: Split Based on Cinematographic Rhythm

**Core idea**: Consider shot switches, camera movement speed, transition types, split at natural cinematographic nodes

**Judgment method**:
1. Identify transition types in cinematography strategy
2. Prioritize splitting at non-Cut transitions (Fade, Dissolve, Wipe, etc.)
3. Identify camera movement start/end points (push-in start/end, pan start/end)
4. Split at natural camera movement endings

**Example**:
```
Shot list:
  #1 (3.5s) LS push-in → Cut → #2 (2.5s) MS static → Cut → #3 (2.0s) CU slight push
  → Dissolve →
  #4 (3.0s) MS pan → Cut → #5 (2.5s) CU static

Strategy:
  → Split at Dissolve (between shot 3 and shot 4)
  → Group 1: Shots 1-3 (push-in + static + slight push complete rhythm)
  → Group 2: Shots 4-5 (pan + static complete rhythm)
```

---

### 3.2 Split Execution Workflow

#### Step 1: Preliminary Split Proposal

Based on the above 4 strategies, generate a preliminary split plan:

```
【Preliminary Split Plan】

Basis:
  1. Core priority: "Show protagonist's determination" → Split into establish, transform, confirm phases
  2. Emotional curve: Emotional turning points at 7s and 15s
  3. Key turning points: 8s (emotional shift), 12s (key dialogue) are important nodes
  4. Cinematographic rhythm: Dissolve transition between shots 3 and 4

Suggested split into 4 groups:

Group 1 (0-8s, 8s total)
  Core: Establish crisis, show alertness
  Shots: #1-3
  Emotion: Calm alertness → Tense
  Key turning point: Lin Yuan sees zombie horde

Group 2 (8-12s, 4s total)
  Core: Inner transformation
  Shots: #4-5
  Emotion: Tense → Resolute
  Key turning point: Lin Yuan emotional shift

Group 3 (12-20s, 8s total)
  Core: Declare determination
  Shots: #6-8
  Emotion: Resolute
  Key turning point: Lin Yuan says "They're coming"

Group 4 (20-30s, 10s total)
  Core: Prepare for battle
  Shots: #9-11
  Emotion: Resolute → Fighting spirit
  Key turning point: Lin Yuan grips weapon
```

---

#### Step 2: Check Split Rationality

**Check dimensions**:

1. **Duration rationality**: Is each group ≤ current `maxShotGroupDuration`?
   - ✓ Group 1: 8s
   - ✓ Group 2: 4s
   - ✓ Group 3: 8s
   - ✓ Group 4: 10s

2. **Narrative completeness**: Is each group a complete narrative unit?
   - ✓ Group 1: Completely shows the process of "seeing the crisis"
   - ✓ Group 2: Completely shows the process of "inner transformation"
   - ✓ Group 3: Completely shows the process of "declaring determination"
   - ✓ Group 4: Completely shows the process of "preparing for battle"

3. **Emotional coherence**: Is emotion consistent within groups, with clear transitions between groups?
   - ✓ Within Group 1: Calm→Tense (gradual)
   - ✓ Group 1→2: Tense→Resolute (clear transition)
   - ✓ Within Group 2: Emotional shift (consistent theme)
   - ✓ Group 2→3: Resolute→Declare (natural transition)

4. **Cinematographic rhythm**: Are split points at natural cinematographic nodes?
   - ✓ At 8s: Dissolve transition between shots 3 and 4
   - ✓ At 12s: Between shots 5 and 6, before dialogue begins
   - ✓ At 20s: Between shots 8 and 9, camera movement ends

**Check result**: ✓ Split plan is rational

---

#### Step 3: Guided Questions (if uncertain)

**Scenario 1: Duration exceeds limit**

If a shot group exceeds the current `maxShotGroupDuration`, ask the user:

```
【Duration Exceeded Notice】

Group 3's duration exceeds the current shot group duration cap.

Suggested split options:

Option A (split by dialogue):
  - Group 3-1 (12-18s, 6s): Lin Yuan says "They're coming"
  - Group 3-2 (18-30s, 12s): Lin Yuan grips weapon, prepares for battle

Option B (split by camera movement):
  - Group 3-1 (12-20s, 8s): Lin Yuan speaks dialogue + turning action
  - Group 3-2 (20-30s, 10s): Lin Yuan grips weapon, camera push-in

Which option do you prefer? Or other suggestions?
```

---

**Scenario 2: Unclear narrative unit**

If a split point's narrative unit is unclear, ask the user:

```
【Split Point Uncertainty】

Shots 6-8 cover two key actions:
  - Lin Yuan says "They're coming" (12s)
  - Lin Yuan turns around (15s)

These two actions can be one group ("Declaring determination") or split into two:
  - Group 2: Speaking dialogue (declaration)
  - Group 3: Turning (preparation)

Suggestion:
  If emphasizing "the power of the dialogue line," suggest a separate group
  If emphasizing "continuity from declaration to action," suggest merging

Your preference?
```

---

**Scenario 3: Fuzzy emotional turning point**

If the emotional curve's turning point is unclear, ask the user:

```
【Emotional Turning Point Confirmation】

According to the performance strategy, Lin Yuan's emotional shift from "tense" to "resolute" occurs between 8-12s.

Specific turning points could be:
  - 8s: After Lin Yuan's brows furrow slightly, eyes begin to show resolve
  - 10s: Lin Yuan takes a deep breath (body language shift)
  - 12s: Lin Yuan speaks the dialogue (verbal declaration)

Suggestion:
  If emphasizing "the process of inner transformation," split at 8s
  If emphasizing "the declarative meaning of the dialogue," split at 12s

Where do you think the key emotional turning point is?
```

---

#### Step 4: Confirm Split Plan

Display the final split plan, wait for user confirmation:

```
============================================
Shot Group Split Plan
============================================

Total duration: 45s
Split into: 4 shot groups

【Group 1】(0-8s, 8s total) - Establish Crisis
  Core: Show Lin Yuan's alertness and tension after seeing the zombie horde
  Emotion: Calm alertness(3) → Tense(7)
  Key turning point: Lin Yuan sees the zombie horde surging
  Shots: #1-3 (LS push-in → MS static → CU slight push)

【Group 2】(8-12s, 4s total) - Inner Transformation
  Core: Show Lin Yuan's emotional shift from tense to resolute
  Emotion: Tense(7) → Resolute(8)
  Key turning point: Lin Yuan's expression turns resolute, determination in eyes
  Shots: #4-5 (MS close-up → CU extreme close-up)

【Group 3】(12-20s, 8s total) - Declare Determination
  Core: Through dialogue and action, declare battle determination
  Emotion: Resolute(8)
  Key turning point: Lin Yuan says "They're coming," slowly turns
  Shots: #6-8 (CU dialogue → MS turn → FS wide)

【Group 4】(20-30s, 10s total) - Prepare for Battle
  Core: Show Lin Yuan gripping weapon, ready to fight
  Emotion: Resolute(8) → Fighting spirit rising(9)
  Key turning point: Lin Yuan grips weapon tightly
  Shots: #9-11 (MS action → CU weapon → LS distant view)

============================================

Confirm this split plan? (y/n)

If adjustments needed, please specify:
  - Where to re-split?
  - Which groups to merge?
  - Different views on split rationale?
```

---

### 3.3 Generate Structured Description for Each Shot Group

**Goal**: For each confirmed shot group, generate a detailed shot list containing duration, performance content, camera movement, special details

For each shot group, generate the following:

#### 3.3.1 Shot Group Overview

**Format**:
```typescript
{
  groupNumber: number;              // Group number
  groupId: string;                  // Group ID (Episode X - Scene X - Group X)
  duration: number;                 // Duration (seconds)
  coreTheme: string;                // Core theme (one sentence)
  emotionRange: string;             // Emotional range
  keyMoment: string;                // Key moment
  splitReason: string;              // Split rationale
  tailFrameAnchor: {
    composition: string;            // Tail frame composition
    characterState: string;         // Character position, body, expression state
    propState?: string;             // Prop state
    emotionResidue: string;         // Emotional residue
    continuationUse: string;        // How the next group or video continuation uses it
  };
}
```

**Example**:
```json
{
  "groupNumber": 1,
  "groupId": "Episode 1 - Scene 3 - Group 1",
  "duration": 8.0,
  "coreTheme": "Establish crisis, show Lin Yuan's alertness and tension",
  "emotionRange": "Calm alertness(3) → Tense(7)",
  "keyMoment": "Lin Yuan sees the zombie horde surging toward him",
  "splitReason": "This group completes crisis establishment, next group enters protagonist's inner transformation",
  "tailFrameAnchor": {
    "composition": "CU close-up of Lin Yuan's eyes, background blurred into churning water surface",
    "characterState": "Lin Yuan's brows slightly furrowed, eyes locked on distant zombie horde, body slightly tensed",
    "propState": "Weapon still at side, not yet raised",
    "emotionResidue": "Alertness just turning to tension, determination not yet formed",
    "continuationUse": "Next group continues from same eye close-up, pushing into resolute determination"
  }
}
```

---

#### 3.3.2 Shot Group Overall Description

**Format**: 200-300 character paragraph, integrating scene, performance, and cinematography dimensions

**Elements to include**:
- Scene environment and atmosphere
- Character actions and expressions
- Camera movement and visual focus
- Emotional tone

**Example**:
```
Lin Yuan stood at the edge of the flooded land, gazing solemnly into the distance. The water surface churned, countless zombie figures surged beneath, advancing toward him under the command of a giant zombie. Afternoon sunlight slanted in from the right, creating shimmering reflections on the rippling water, yet the overall atmosphere was oppressive and tense. Lin Yuan's expression gradually shifted from initial alertness to tension, brows furrowing slightly, body subtly tensing. The camera slowly pushed in from wide shot to medium shot, then to close-up, progressively revealing his journey from observing the environment to recognizing the crisis. The entire frame was dominated by cool tones, the blue-gray flood contrasting with warm orange sunlight, creating an atmosphere of lonely resilience amid apocalyptic crisis. The push-in camera movement paired with subtle expression changes, gradually focusing the audience's attention from the grand environment to the protagonist's inner world.
```

---

#### 3.3.3 Scene Strategy Summary

Extract relevant information for this shot group from the scene strategy card:

**Format**:
```typescript
{
  lighting: string;           // Lighting summary
  colorScheme: string;        // Color scheme summary
  atmosphere: string;         // Atmosphere summary
  characterPositions: string; // Character position summary
}
```

**Example**:
```json
{
  "lighting": "Afternoon sunlight slanting from right, moderate intensity, warm color temperature, creating shimmering reflections on water surface",
  "colorScheme": "Cool tones dominant (blue-gray flood water), warm orange accent (sunlight), creating apocalyptic atmosphere",
  "atmosphere": "Oppressive, tense, intense sense of crisis",
  "characterPositions": "Lin Yuan: foreground center, standing, facing camera; Zombie horde: midground to background, surging in water"
}
```

---

#### 3.3.4 Performance Strategy Summary

Extract performance design within this shot group's time range from the performance strategy card:

**Format**:
```typescript
{
  characterActions: Array<{
    characterName: string;
    actions: string;          // Action sequence (connected with arrows)
    expressions: string;      // Expression changes (connected with arrows)
    dialogue?: string;        // Dialogue (if any)
    performanceFocus: string; // Performance focus
  }>;
}
```

**Example**:
```json
{
  "characterActions": [
    {
      "characterName": "Lin Yuan",
      "actions": "Standing by water observing zombie horde → Body subtly tensing → Brows furrowing slightly",
      "expressions": "Solemn → Alert (brows furrow) → Tense (eyes focus)",
      "dialogue": null,
      "performanceFocus": "Through micro-expressions and body language, show the gradual process from alertness to tension"
    }
  ]
}
```

---

#### 3.3.5 Cinematography Strategy Summary (Shot List)

Extract all shots for this shot group from the cinematography strategy card, forming a shot list:

**Format**:
```typescript
{
  shootingStyle: string;      // Shooting style
  shots: Array<{
    shotNumber: number;       // Shot number
    duration: number;         // Duration
    shotSize: string;         // Shot size
    cameraMovement: string;   // Camera movement (readable format)
    cameraAngle: string;      // Angle (readable format)
    equipment: string;        // Equipment (readable format)
    cameraParams: string;     // Parameters (readable format)
    visualFocus: string;      // Visual focus
    purpose: string;          // Shot purpose
  }>;
  transitionsInGroup: string; // In-group transition notes
}
```

**Example**:
```json
{
  "shootingStyle": "Documentary - enhance realism and urgency",
  "shots": [
    {
      "shotNumber": 1,
      "duration": 3.5,
      "shotSize": "LS (Wide Shot)",
      "cameraMovement": "Extremely slow push-in (from LS to MS)",
      "cameraAngle": "Eye-level front",
      "equipment": "Tripod + linear slider",
      "cameraParams": "ISO 800 | f/2.8 | 1/50s | 5600K | 35mm",
      "visualFocus": "Overall environment: flood, zombie horde, Lin Yuan's solitary figure",
      "purpose": "Establish spatial sense, show crisis scale, set up for subsequent close-ups"
    },
    {
      "shotNumber": 2,
      "duration": 2.5,
      "shotSize": "MS (Medium Shot)",
      "cameraMovement": "Static",
      "cameraAngle": "Eye-level front",
      "equipment": "Tripod",
      "cameraParams": "ISO 800 | f/2.0 | 1/50s | 5600K | 50mm",
      "visualFocus": "Lin Yuan's upper body, especially facial expression",
      "purpose": "Capture expression change, the subtle shift from alertness to tension"
    },
    {
      "shotNumber": 3,
      "duration": 2.0,
      "shotSize": "CU (Close-up)",
      "cameraMovement": "Extremely slow slight push-in",
      "cameraAngle": "Slight low-angle front (15°)",
      "equipment": "Tripod",
      "cameraParams": "ISO 800 | f/1.8 | 1/50s | 5600K | 85mm",
      "visualFocus": "Lin Yuan's eyes, brows",
      "purpose": "Extreme close-up capturing alertness in the eyes, low angle enhances imminent explosive power"
    }
  ],
  "transitionsInGroup": "Shot 1→2 Cut (quick switch maintains tension), Shot 2→3 Cut (smooth transition to close-up)"
}
```

---

#### 3.3.6 Special Details and Notes

List production details requiring special attention for this shot group:

**Format**:
```typescript
{
  performanceDetails: string[];      // Performance details
  cinematographyDetails: string[];   // Cinematography details
  postProductionNotes: string[];     // Post-production notes
}
```

**Example**:
```json
{
  "performanceDetails": [
    "Lin Yuan's brow furrowing must be very subtle, not exaggerated",
    "The eye focusing process must have layers: first scan → then focus → finally lock on",
    "Body tension must be restrained, expressed only through subtle shoulder and neck changes"
  ],
  "cinematographyDetails": [
    "Push-in speed must be extremely slow (0.5m/s), giving audience sufficient time to observe the environment",
    "Close-up focus must land precisely on the eyes, background appropriately blurred",
    "Low angle controlled within 15°, avoiding over-dramatization"
  ],
  "postProductionNotes": [
    "In color grading, enhance warm/cool contrast, flood water tending blue-gray, sunlight tending warm orange",
    "Sound design: distant zombie roars need spatial depth, water sounds should be oppressive and dull",
    "Shot 1 push-in can incorporate slight handheld camera shake to enhance documentary feel"
  ]
}
```


---

### 3.4 Generate Complete Shot Group Card Data

Consolidate all the above information to generate the `shotGroups` array for `StoryboardPlanCard`:

**Hard requirements**:
- `StoryboardPlanCard` top level must contain `shotGroups` array, and each shot group in the array must contain all fields from this section.
- `StoryboardPlanCard` top level must contain `videoGenerationProfileSnapshot`.
- `DirectorBriefingCard.finalBriefing` or `directorFinalBriefing.shotGroupFinalization` can only serve as director review records, not as a substitute for `StoryboardPlanCard.shotGroups`.
- If only review summaries like `shotGroupFinalization`, `groupName`, `timeRange`, `tailFrame` are generated, they cannot enter `storyboard-creator`.
- Each `shotGroups[]` must contain `maxDurationApplied`, with value 15 or 30.
- Each `shotGroups[]`'s `duration` must be a numeric second value and must not exceed its own `maxDurationApplied`.
- Each `shotGroups[]` must integrate all three strategy cards: `sceneStrategy`, `performanceStrategy`, `cinematographyStrategy`, `shotBreakdown` — none may be empty.

**Full example**:

```json
{
  "groupNumber": 1,
  "groupId": "Episode 1 - Scene 3 - Group 1",
  "duration": 8.0,
  "maxDurationApplied": 30,
  "coreTheme": "Establish crisis, show Lin Yuan's alertness and tension",
  "emotionRange": "Calm alertness(3) → Tense(7)",
  "keyMoment": "Lin Yuan sees the zombie horde surging toward him",
  "splitReason": "This group completes crisis establishment, next group enters protagonist's inner transformation",
  "tailFrameAnchor": {
    "composition": "CU close-up of Lin Yuan's eyes, background blurred into churning water surface",
    "characterState": "Lin Yuan's brows slightly furrowed, eyes locked on distant zombie horde, body slightly tensed",
    "propState": "Weapon still at side, not yet raised",
    "emotionResidue": "Alertness just turning to tension, determination not yet formed",
    "continuationUse": "Next group continues from same eye close-up, pushing into resolute determination"
  },
  
  "description": "Lin Yuan stood at the edge of the flooded land, gazing solemnly into the distance. The water surface churned, countless zombie figures surged beneath, advancing toward him under the command of a giant zombie. Afternoon sunlight slanted in from the right, creating shimmering reflections on the rippling water, yet the overall atmosphere was oppressive and tense. Lin Yuan's expression gradually shifted from initial alertness to tension, brows furrowing slightly, body subtly tensing. The camera slowly pushed in from wide shot to medium shot, then to close-up, progressively revealing his journey from observing the environment to recognizing the crisis. The entire frame was dominated by cool tones, the blue-gray flood contrasting with warm orange sunlight, creating an atmosphere of lonely resilience amid apocalyptic crisis.",
  
  "keyActions": [
    "Lin Yuan sees the zombie horde surging toward him",
    "Lin Yuan's expression shifts from alertness to tension",
    "Lin Yuan's brows furrow slightly, body tenses"
  ],
  
  "keyDialogue": null,
  
  "sceneStrategy": {
    "lighting": "Afternoon sunlight slanting from right, moderate intensity, warm color temperature, creating shimmering reflections on water surface",
    "colorScheme": "Cool tones dominant (blue-gray flood water), warm orange accent (sunlight), creating apocalyptic atmosphere",
    "atmosphere": "Oppressive, tense, intense sense of crisis",
    "characterPositions": "Lin Yuan: foreground center, standing, facing camera; Zombie horde: midground to background, surging in water"
  },
  
  "performanceStrategy": {
    "characterActions": [
      {
        "characterName": "Lin Yuan",
        "actions": "Standing by water observing zombie horde → Body subtly tensing → Brows furrowing slightly",
        "expressions": "Solemn → Alert (brows furrow) → Tense (eyes focus)",
        "dialogue": "None",
        "performanceFocus": "Through micro-expressions and body language, show the gradual process from alertness to tension"
      }
    ]
  },
  
  "cinematographyStrategy": {
    "shootingStyle": "Documentary - enhance realism and urgency",
    "shots": [
      {
        "shotNumber": 1,
        "duration": 3.5,
        "shotSize": "LS (Wide Shot)",
        "cameraMovement": "Extremely slow push-in (from LS to MS)",
        "cameraAngle": "Eye-level front",
        "equipment": "Tripod + linear slider",
        "cameraParams": "ISO 800 | f/2.8 | 1/50s | 5600K | 35mm",
        "visualFocus": "Overall environment: flood, zombie horde, Lin Yuan's solitary figure",
        "purpose": "Establish spatial sense, show crisis scale, set up for subsequent close-ups"
      },
      {
        "shotNumber": 2,
        "duration": 2.5,
        "shotSize": "MS (Medium Shot)",
        "cameraMovement": "Static",
        "cameraAngle": "Eye-level front",
        "equipment": "Tripod",
        "cameraParams": "ISO 800 | f/2.0 | 1/50s | 5600K | 50mm",
        "visualFocus": "Lin Yuan's upper body, especially facial expression",
        "purpose": "Capture expression change, the subtle shift from alertness to tension"
      },
      {
        "shotNumber": 3,
        "duration": 2.0,
        "shotSize": "CU (Close-up)",
        "cameraMovement": "Extremely slow slight push-in",
        "cameraAngle": "Slight low-angle front (15°)",
        "equipment": "Tripod",
        "cameraParams": "ISO 800 | f/1.8 | 1/50s | 5600K | 85mm",
        "visualFocus": "Lin Yuan's eyes, brows",
        "purpose": "Extreme close-up capturing alertness in the eyes, low angle enhances imminent explosive power"
      }
    ],
    "transitionsInGroup": "Shot 1→2 Cut (quick switch maintains tension), Shot 2→3 Cut (smooth transition to close-up)"
  },
  
  "shotBreakdown": [
    {
      "shotNumber": 1,
      "shotDescription": "LS wide shot push-in, establishing flood environment and zombie horde scale, showing Lin Yuan standing alone, warm/cool color contrast strong",
      "estimatedDuration": 3.5,
      "performanceDetail": "Lin Yuan solemnly observing, body upright",
      "cinematographyDetail": "Extremely slow push-in (0.5m/s), tripod + linear slider, 35mm wide angle",
      "specialNotes": "Push-in must be smooth, give audience sufficient time to establish spatial sense"
    },
    {
      "shotNumber": 2,
      "shotDescription": "MS medium shot static, focus on Lin Yuan's upper body, capture subtle expression shift from alertness to tension",
      "estimatedDuration": 2.5,
      "performanceDetail": "Brows furrow slightly, eyes shift from scanning to focusing, body subtly tenses",
      "cinematographyDetail": "Static shot, tripod, 50mm standard lens, focus on face",
      "specialNotes": "Expression change must be subtle, not exaggerated"
    },
    {
      "shotNumber": 3,
      "shotDescription": "CU close-up slight push-in, extreme close-up of Lin Yuan's eyes, slight low angle enhances power, background blurred",
      "estimatedDuration": 2.0,
      "performanceDetail": "Eyes lock on target, brows slightly furrowed, showing alertness and imminent determination",
      "cinematographyDetail": "Extremely slow slight push-in, slight low angle 15°, 85mm telephoto, f/1.8 shallow depth of field",
      "specialNotes": "Focus precisely on eyes, background appropriately blurred to highlight the eyes"
    }
  ],
  
  "specialDetails": {
    "performanceDetails": [
      "Lin Yuan's brow furrowing must be very subtle, not exaggerated",
      "The eye focusing process must have layers: first scan → then focus → finally lock on",
      "Body tension must be restrained, expressed only through subtle shoulder and neck changes"
    ],
    "cinematographyDetails": [
      "Push-in speed must be extremely slow (0.5m/s), giving audience sufficient time to observe the environment",
      "Close-up focus must land precisely on the eyes, background appropriately blurred",
      "Low angle controlled within 15°, avoiding over-dramatization"
    ],
    "postProductionNotes": [
      "In color grading, enhance warm/cool contrast, flood water tending blue-gray, sunlight tending warm orange",
      "Sound design: distant zombie roars need spatial depth, water sounds should be oppressive and dull",
      "Shot 1 push-in can incorporate slight handheld camera shake to enhance documentary feel"
    ]
  }
}
```

---

## Output: Storyboard Production Plan Card

### Pre-Output Validation

Before creating `StoryboardPlanCard`, must check item by item:

```text
Top-level fields:
  - directorBriefingCardId
  - sceneStrategyCardId
  - performanceStrategyCardId
  - cinematographyStrategyCardId
  - strategySourceCardIds
  - videoGenerationProfileSnapshot
  - finalBriefingSnapshot
  - summary
  - shotGroups
  - upstreamCards

Each shotGroups[]:
  - groupNumber
  - groupId
  - maxDurationApplied
  - duration <= maxDurationApplied
  - coreTheme
  - emotionRange
  - keyMoment
  - splitReason
  - description
  - tailFrameAnchor
  - sceneStrategy
  - performanceStrategy
  - cinematographyStrategy
  - shotBreakdown
```

If any field is missing, the current stage cannot be marked as complete; continue completing `StoryboardPlanCard`. Do not treat `directorFinalBriefing.shotGroupFinalization` as a storyboard plan output.

### Complete Card Structure

```typescript
interface StoryboardPlanCard extends BaseCard {
  cardType: "StoryboardPlanCard";
  sceneId: string;
  directorBriefingCardId: string;
  sceneStrategyCardId: string;
  performanceStrategyCardId: string;
  cinematographyStrategyCardId: string;
  strategySourceCardIds: {
    sceneStrategyCardId: string;
    performanceStrategyCardId: string;
    cinematographyStrategyCardId: string;
  };
  videoGenerationProfileSnapshot: VideoGenerationProfile;
  finalBriefingSnapshot: {
    finalStructure: string;
    contentLoadRecheck: string;
    continuityAuditSummary: string;
  };
  
  // Step 1 output
  summary: {
    sceneObjective: string;           // Narrative purpose
    keyMoments: Array<{
      momentNumber: number;
      timestamp: number;
      description: string;
      importance: "critical" | "important" | "supporting";
    }>;
    overallTone: string;              // Overall tone
    emotionCurve: string;             // Emotional curve
    coreThemes: string[];             // Core priorities
    totalDuration: number;
  };
  
  // Step 3 output
  shotGroups: Array<{
    groupNumber: number;
    groupId: string;
    duration: number;
    maxDurationApplied: 15 | 30;
    
    // 3.3.1 Overview
    coreTheme: string;
    emotionRange: string;
    keyMoment: string;
    splitReason: string;
    tailFrameAnchor: {
      composition: string;
      characterState: string;
      propState?: string;
      emotionResidue: string;
      continuationUse: string;
    };
    
    // 3.3.2 Overall description
    description: string;
    
    // 3.3.3-3.3.6 Detailed information
    keyActions: string[];
    keyDialogue?: string;
    sceneStrategy: {...};
    performanceStrategy: {...};
    cinematographyStrategy: {...};
    shotBreakdown: Array<{
      shotNumber: number;
      shotDescription: string;
      estimatedDuration: number;
      performanceDetail: string;
      cinematographyDetail: string;
      specialNotes?: string;
    }>;
    specialDetails: {
      performanceDetails: string[];
      cinematographyDetails: string[];
      postProductionNotes: string[];
    };
  }>;
  
  userConfirmed: boolean;
  upstreamCards: string[];  // Audit list; must not substitute for the three explicit strategy card IDs above
}
```

---

### Full Output Example

Complete `StoryboardPlanCard` example in `references/storyboard-plan-card-example.json`. The shotGroups field example from section D.3.4 can be directly used as a generation reference.

---

## Usage Examples

**Standard flow**: User invokes → Step 1 global understanding (narrative purpose / emotional curve / key turning points / core priorities) → Step 2 summarize three strategy cards (scene/performance/cinematography summaries + interrelationships) → Step 3 director's split (4 strategy judgments → preliminary split → rationality check → user confirmation) → Generate StoryboardPlanCard.

**Adjustment flow**: User proposes adjustments (e.g. merge shot groups) → Re-split → Display adjusted plan → User confirmation.

---

## Summary

Core value of the director briefing skill:

1. **Global understanding**: Deeply understand the scene's narrative purpose, emotional curve, and key priorities from the episode/scene plot cards
2. **Information synthesis**: Understand the design intent of the three strategy cards, not simply list them
3. **Director's thinking**: Strategically split based on narrative priorities, considering editing rationality and duration constraints
4. **Structured description**: Generate detailed shot lists containing all production-needed information: performance, cinematography, special details
5. **Flexible interaction**: Support user adjustments to split plans, confirm uncertain decisions through guided questions

The generated storyboard production plan card is the foundation for subsequent storyboarding and video generation, with each shot group containing complete production information.

## Next Step After Completion

Completion criteria come in two types:

- First entry: `DirectorBriefingCard.precheck` created, content load assessment, structure selection precheck, and `videoGenerationProfileSnapshot` confirmed.
- Second entry: Three strategy cards complete, `finalBriefing` updated, and `StoryboardPlanCard` created.

After first precheck completion, recommend calling in parallel or on demand:

```text
scene-strategy-designer
performance-strategy-designer
cinematography-strategy-designer
```

After second review and finalization completion, recommend calling `storyboard-creator`.

Recommended phrasing: `Director precheck is complete. Suggested next step: complete the scene, performance, and cinematography strategy cards; once all three are done, return to director-briefing for review and finalization.`
