---
name: performance-strategy-designer
description: Use when a DirectorBriefingCard.precheck exists and performance strategies need to be designed for characters in a scene, including action design, expression changes, dialogue delivery, and emotional arcs
---

# Performance Strategy Designer

Based on the EpisodeSceneDetailCard, DirectorBriefingCard precheck directives, Character Profile Cards, and Character Costume Cards, translate script text into visualizable actions, expressions, micro-expressions, and dialogue delivery.

**This skill is the core translation skill**, responsible for transforming textual descriptions into actor-executable performance direction.

---

## Reference Routing

This skill's performance methods and vocabulary are stored in `references/`; read on demand:

- Actions, performance chains, action anchors, and body space: read `references/performance-vocabulary.md`.
- Emotion-to-micro-expression conversion: read `references/emotion-microexpression-map.md`.
- Dialogue delivery, dialogue timing, and vocal performance: read `references/dialogue-timing-and-delivery.md`.

Usage principle: References are used to generate more specific performance designs. Do not copy vocabulary lists wholesale into the card; select only the actions, expressions, and dialogue delivery that most serve the story at each stage.

---

## ⚠️ Important: Card Organization Structure

### Organize by time phases, not by dimension

**Correct approach**: Organize by character's time phases, each phase containing a holistic description of actions + expressions + dialogue + emotion

```
Character 1: 林渊
  ├── Phase 1 (0-15s): Graceful entrance and intimate moment
  │   ├── Plot (what happens in this phase)
  │   ├── Actions (specific action descriptions, including timestamps)
  │   ├── Expressions (expression changes in this phase)
  │   ├── Dialogue (dialogue and delivery style in this phase)
  │   ├── Emotion (emotional state and transitions in this phase)
  │   └── Consistency check (check results or questions for this phase)
  │
  ├── Phase 2 (15-40s): Listening to 方涵's report
  │   ├── Plot
  │   ├── Actions
  │   ├── Expressions
  │   ├── Dialogue
  │   ├── Emotion
  │   └── Consistency check
  └── ...
```

**Wrong approach**: Split by dimension (do not do this)

```
Character 1: 林渊
  ├── Action design (list all actions)
  ├── Expression design (list all expressions)
  ├── Dialogue delivery (list all dialogue)
  └── Emotional arc (overall emotion)
```

### Why organize by time phases?

1. **Matches director and actor working habits**: They need to know "what do I do in these 10 seconds", not "a list of all my actions"
2. **Actions, expressions, dialogue, and emotion are integrated**: They co-occur in the same moment and should be described together
3. **Easier to execute and rehearse**: Actors can understand and perform in chronological order
4. **Easier to adjust and iterate**: When modifying a time segment, all related elements are together

### Scene segmentation principles

Divide the scene into 3-7 phases based on story rhythm and key events. Each phase should:
- Have a clear time range (e.g., 0-15s, 15-40s)
- Have a clear story objective (e.g., "graceful entrance", "power display")
- Contain a holistic description of all performance elements within that time segment

---

## Overall Workflow

```
Input: EpisodeSceneDetailCard + DirectorBriefingCard (precheck) + Character Profile Cards + Character Costume Cards
  ↓
Stage 1: Analyze characters and story
  - Read DirectorBriefingCard (primaryStructure, preliminaryShotGroupPlan, strategyDirectives.performance) ⭐
  - Read Character Profile Cards (personality, motivation, arc)
  - Read Character Costume Cards (visual reference)
  - Read EpisodeSceneDetailCard (visualDescription, dialogue, emotion)
  ↓
Stage 2: Segment the scene
  - Determine 3-7 time phases based on story rhythm
  - Each phase has a clear time range and story objective
  ↓
Stages 3-7: Design performance for each character in each phase
  - Organized by time phases
  - Each phase includes: plot, actions, expressions, dialogue, emotion, consistency check
  ↓
Stage 8: User confirmation
  - Generate complete card
  - Mark uncertain details (with ⚠️待确认)
  - List pending confirmation questions at end of card
  - Provide multiple-choice options for user
  - Adjust based on user feedback
  ↓
Output: PerformanceStrategyCard (completed status)
```

---

## Stage 1: Analyze Characters and Story

### 1.0 Read DirectorBriefingCard (CRITICAL)

**Goal**: Retrieve director precheck constraints on performance strategy, so performance design serves the scene's primary structure and shot group plan.

**Must extract**:
- `precheck.primaryStructure`: Primary structure
- `precheck.secondaryStructure`: Secondary structure
- `precheck.preliminaryShotGroupPlan`: Preliminary shot group plan
- `precheck.strategyDirectives.performance`: Performance strategy design directives
- `precheck.playableContentLoad`: Content volume level

**Execution rules**:
1. Performance phases must first align with the director's shot group plan, then subdivide actions, expressions, dialogue, and emotion within each group.
2. If primary structure is `dialogue_cross_cutting`, every key line must have delivery style written, and leave time for listener reactions.
3. If primary structure is `close_up_micro_expression`, prioritize micro-expression timelines, reduce large movements, avoid emotional jumps.
4. If primary structure is `continuous_action` or `fight_choreography`, actions must have trigger, direction, contact point, reaction, and recovery; do not write vague "intense fighting".
5. If director precheck is `sequential_split`, each phase must describe the inherited starting state and ending emotional residue for tail-frame anchor use.

**Output to PerformanceStrategyCard**:
```typescript
directorBriefingCardId: string;
directorPrecheckSnapshot: {
  primaryStructure: SceneStructureType;
  secondaryStructure?: SceneStructureType;
  performanceDirective: string;
  preliminaryShotGroupPlan: Array<{
    groupNumber: number;
    corePurpose: string;
    coveredBeats: string[];
  }>;
}
```

### 1.1 Read Character Profile Cards

**Goal**: Retrieve character personality, motivation, and arc information

**Input**:
- Character ID list from the EpisodeSceneDetailCard's `characters` array

**Execution logic**:
1. Iterate through all characters in the EpisodeSceneDetailCard
2. Look up the corresponding Character Profile Card by `characterId`
3. Extract the following fields:
   - `personality`: Personality traits
   - `motivation`: Motivation and goals
   - `characterArc`: Character arc
   - `relationships`: Character relationships

**Sample output**:
```typescript
{
  characterId: "char-001",
  characterName: "林渊",
  personality: {
    traits: ["冷静", "理性", "战略思维"],
    strengths: ["领导力", "决断力"],
    weaknesses: ["过于理性", "缺乏情感表达"]
  },
  motivation: {
    mainGoal: "保护人类在末世中生存",
    internalConflict: "理性与情感的冲突"
  },
  characterArc: {
    startingPoint: "孤独的领导者",
    development: "逐渐学会信任他人",
    endingPoint: "团队的核心"
  }
}
```

### 1.2 Read Character Costume Cards

**Goal**: Retrieve character visual references

**Execution logic**:
1. Look up costume cards from the EpisodeSceneDetailCard's `assetCompleteness.characterAssets`
2. Extract the following fields:
   - `typicalExpressions`: Typical expressions (5)
   - `typicalActions`: Typical actions (5)
   - `overallDemeanor`: Overall demeanor

**Note**:
- If costume card does not exist, prompt user to generate costume card first
- Typical expressions and typical actions are important references for inference

### 1.3 Read EpisodeSceneDetailCard

**Goal**: Retrieve scene story, emotion, and dialogue information

**Execution logic**:
1. Extract the following fields:
   - `visualDescription`: Detailed visual description array (contains character actions)
   - `sceneElements.characterStates`: Character states
   - `dialogue`: Dialogue text
   - `emotion`: Emotional tone
   - `emotionIntensity`: Emotional intensity (1-10)
   - `rhythm`: Rhythm (fast/medium/slow)

**Sample output**:
```typescript
{
  visualDescription: [
    { sequence: 2, content: "在一只巨型丧尸的指挥下，尸潮从水下涌来", type: "action" },
    { sequence: 3, content: "战士站在浮岛城墙上，举枪拼死抵抗", type: "character" }
  ],
  characterStates: [
    { character: "战士", state: "站在浮岛城墙上，举枪拼死抵抗" }
  ],
  dialogue: "林渊VO：这是末世第137天。洪水淹没陆地，尸潮围城...",
  emotion: "震撼、压迫感、末世惨烈",
  emotionIntensity: 8,
  rhythm: "fast"
}
```

---

## Stage 2: Design Actions

### 2.1 Determine Performance Nature

**Inference rules**:

| Condition | Performance Nature |
|-----------|--------------------|
| visualDescription contains many action descriptions | action |
| dialogue exists and is long | dialogue |
| Both present | mixed |

### 2.2 Select Action Style Based on Personality

**Inference rules**:

| Personality Traits | Action Style |
|--------------------|--------------|
| Calm, rational | Restrained, precise, minimal gestures |
| Enthusiastic, outgoing | Exaggerated, open, large movements |
| Nervous, anxious | Fidgety, frequent, unsettled |
| Confident, assertive | Stable, decisive, space-occupying |
| Gentle, introverted | Soft, small amplitude, close to body |

**Example**:
```typescript
// Input: personality = ["冷静", "理性"]
// Output:
actionStyle: "克制、精确，动作幅度小，避免不必要的手势。每个动作都有明确目的，体现理性思维。"
```

### 2.3 Extract Key Actions from visualDescription

**Extraction rules**:
1. Filter descriptions with `type === "character"` or `type === "action"`
2. Filter descriptions containing the current character's name
3. Extract verbs and action descriptions
4. Use action sequence as timeline reference

**Example**:
```typescript
// Input:
visualDescription: [
  { sequence: 3, content: "战士站在浮岛城墙上，举枪拼死抵抗", type: "character" }
]

// Output:
keyActions: [
  {
    actionNumber: 1,
    triggerEvent: "尸潮涌来",
    timestamp: 5,
    description: "站在城墙上，举起枪",
    intensity: "strong",
    purpose: "展现拼死抵抗的决心",
    interactionWith: null
  },
  {
    actionNumber: 2,
    triggerEvent: "丧尸接近",
    timestamp: 8,
    description: "连续射击",
    intensity: "strong",
    purpose: "阻止丧尸攀爬",
    interactionWith: null
  }
]
```

### 2.4 Determine Trigger Events and Timestamps

**Inference rules**:
1. Trigger event sources:
   - Before/after dialogue ("after line XXX")
   - Other character actions ("when Character A does XX")
   - Situational changes ("when the zombie horde approaches")
2. Timestamp estimation:
   - Based on visualDescription sequence estimation
   - Fast rhythm: ~3-5 seconds per sequence
   - Medium rhythm: ~5-8 seconds per sequence
   - Slow rhythm: ~8-12 seconds per sequence

---

## Stage 3: Design Expressions

### 3.1 Determine Dominant Expression

**Inference rules**: Select based on emotional tone

| Emotional Tone | Dominant Expression |
|----------------|---------------------|
| Shock, oppression | Tense, serious, furrowed brow |
| Warmth, cheerfulness | Smiling, relaxed, soft eyes |
| Sadness, despair | Downcast, vacant eyes, downturned mouth |
| Anger, agitation | Furrowed brow, sharp eyes, tight lips |
| Calm, everyday | Natural, neutral, no obvious emotion |

### 3.2 Design Micro-Expression Changes

**Inference rules**:
1. Determine micro-expression count based on emotional intensity:
   - emotionIntensity >= 7: 5-8 micro-expressions
   - 4-6: 3-5
   - < 4: 1-3
2. Micro-expression types:
   - Eyebrow changes: raise/furrow/relax
   - Eye changes: stare/avert/defocus
   - Mouth corner changes: upturn/downturn/tremble
   - Muscle changes: tense/relax

**Example**:
```typescript
microExpressions: [
  {
    expressionNumber: 1,
    triggerEvent: "看到尸潮涌来",
    timestamp: 3,
    expression: "眉头紧皱，眼神瞬间凝固",
    trigger: "情境突变"
  },
  {
    expressionNumber: 2,
    triggerEvent: "举枪瞄准",
    timestamp: 6,
    expression: "嘴唇紧抿，眼神专注",
    trigger: "进入战斗状态"
  }
]
```

### 3.3 Design Expression Transitions

**Inference rules**:
1. Transition timing:
   - Emotional turning points (key lines in dialogue)
   - Before/after key actions
   - During character interactions
2. Transition duration:
   - Fast rhythm: 0.5-1 second
   - Medium rhythm: 1-2 seconds
   - Slow rhythm: 2-3 seconds

**Example**:
```typescript
expressionTransitions: [
  {
    from: "紧张",
    to: "决然",
    triggerEvent: "台词'我们必须守住'之后",
    timestamp: 10,
    duration: 1.5,
    reason: "从恐惧转为决心"
  }
]
```

---

## Stage 4: Design Dialogue Delivery

### 4.1 Determine Tone

**Inference rules**:

| Emotional Tone | Delivery Tone |
|----------------|---------------|
| Shock, oppression | Heavy, deep, forceful |
| Warmth, cheerfulness | Light, bright, soft |
| Sadness, despair | Trembling, choked, low |
| Anger, agitation | High-pitched, rapid, intense |
| Calm, everyday | Natural, even, steady |

### 4.2 Determine Pace

**Inference rules**:

| Rhythm | Pace |
|--------|------|
| fast | fast (5-6 characters/second) |
| medium | medium (4-5 characters/second) |
| slow | slow (3-4 characters/second) |

### 4.3 Mark Emphasis Words

**Inference rules**:
1. Extract keywords from dialogue
2. Emphasis types:
   - Emotional words: emphasize feeling (e.g., "必须", "不能")
   - Transition words: express turning points (e.g., "但是", "然而")
   - Core words: story core (e.g., character names, location names)

**Example**:
```typescript
// Input:
dialogue: "林渊VO：这是末世第137天。洪水淹没陆地，尸潮围城。人类只能挤在一座座浮岛上苟活。"

// Output:
emphasis: [
  { word: "末世", reason: "核心背景", timestamp: 1 },
  { word: "第137天", reason: "时间节点", timestamp: 2 },
  { word: "淹没", reason: "灾难强调", timestamp: 4 },
  { word: "围城", reason: "危机强调", timestamp: 6 },
  { word: "苟活", reason: "情绪词", timestamp: 9 }
]
```

### 4.4 Mark Pause Positions

**Inference rules**:
1. Pause types:
   - After period: 1-2 seconds
   - After comma: 0.5-1 second
   - Emotional transition: 1-1.5 seconds
2. Pause purpose:
   - Let information settle
   - Build tension
   - Emphasize upcoming content

**Example**:
```typescript
pauses: [
  {
    position: ""这是末世第137天"之后",
    duration: 1.5,
    purpose: "让时间信息沉淀",
    timestamp: 3
  },
  {
    position: ""尸潮围城"之后",
    duration: 1,
    purpose: "营造压迫感",
    timestamp: 7
  }
]
```

---

## Stage 5: Design Emotional Arc

### 5.1 Determine Starting Emotion

**Inference rules**:
1. Extract the first emotion word from the EpisodeSceneDetailCard's `emotion`
2. Intensity at 60-70% of `emotionIntensity`

**Example**:
```typescript
// Input: emotion = "震撼、压迫感、末世惨烈", emotionIntensity = 8
// Output:
startEmotion: "震撼",
startIntensity: 5  // 8 * 0.6 = 4.8 ≈ 5
```

### 5.2 Determine Peak Emotion

**Inference rules**:
1. Select the highest-intensity emotion word from `emotion`
2. Intensity equals `emotionIntensity` itself
3. Peak timestamp at mid-scene (50-70% position)

**Example**:
```typescript
peakEmotion: "末世惨烈",
peakIntensity: 8,
peakTimestamp: 15,  // Assuming total scene duration 30 seconds, peak at 50%
peakTriggerEvent: "战士被丧尸拉拽入水"
```

### 5.3 Determine Ending Emotion

**Inference rules**:
1. If there is a clear emotional turning point, use the post-turn emotion
2. Otherwise, ending emotion is a continuation of peak emotion, intensity reduced 20-30%

**Example**:
```typescript
endEmotion: "压迫感",
endIntensity: 6  // 8 * 0.75 = 6
```

### 5.4 Design Emotion Transition Timeline

**Inference rules**:
1. Identify emotional turning points from visualDescription
2. Each turning point corresponds to an emotion transition
3. Mark trigger events and timestamps

**Example**:
```typescript
transitions: [
  {
    from: "震撼",
    to: "压迫感",
    triggerEvent: "尸潮涌来",
    timestamp: 5
  },
  {
    from: "压迫感",
    to: "末世惨烈",
    triggerEvent: "战士被拉拽入水",
    timestamp: 15
  }
]
```

---

## Stage 6: Design Character Interactions

### 6.1 Infer Interactions from characterStates

**Inference rules**:
1. If characterStates contains multiple characters, infer inter-character interactions
2. Interaction types:
   - Dialogue: Two characters have lines simultaneously
   - Physical contact: Descriptions contain verbs like "推", "拉", "扶"
   - Eye contact: Descriptions contain "看向", "注视"
   - Spatial relationship: Descriptions of relative positions ("面对面", "背对背")

**Example**:
```typescript
// Input:
characterStates: [
  { character: "林渊", state: "站在控制台前" },
  { character: "苏晴", state: "从后方走来，递给林渊一份报告" }
]

// Output:
characterInteractions: [
  {
    interactionNumber: 1,
    triggerEvent: "苏晴走到林渊身后",
    timestamp: 10,
    involvedCharacters: ["char-001", "char-002"],
    interactionType: "空间接近",
    description: "苏晴从后方接近林渊"
  },
  {
    interactionNumber: 2,
    triggerEvent: "苏晴递出报告",
    timestamp: 12,
    involvedCharacters: ["char-001", "char-002"],
    interactionType: "肢体接触",
    description: "苏晴递报告，林渊接过"
  }
]
```

---

## Stage 7: Consistency Check

### 7.1 Check Personality Consistency

**Check rules**:
1. Does action style match personality traits?
2. Do expression changes match personality traits?
3. Does dialogue delivery match personality traits?

**Example**:
```typescript
// Character personality: 冷静、理性
// Designed action style: 克制、精确
// Check result:
alignsWithPersonality: true,
notes: "动作风格符合冷静理性的性格"
```

### 7.2 Check Arc Consistency

**Check rules**:
1. Current scene's position in the character arc
2. Does the emotional arc match the character's development stage?
3. Do actions and expressions reflect character growth?

**Example**:
```typescript
// Character arc: startingPoint = "孤独的领导者"
// Current scene: Episode 1 Scene 1 (arc beginning)
// Check result:
alignsWithArc: true,
notes: "情绪弧光符合弧光起点，展现孤独感"
```

### 7.3 Check Contextual Consistency

**Check rules**:
1. Do actions fit the current situation?
2. Do expressions fit situational pressure?
3. Does dialogue delivery fit situational tension?

---

## Stage 8: User Confirmation

### 8.1 Present Performance Design

**User interaction**:
```
【Performance strategy design】

Scene: Episode 1-Scene 1
Character: 林渊

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Performance nature: mixed

Action design:
- Action style: Restrained, precise, reflecting rational thinking
- Key actions (3):
  1. [5s] Standing at console, fingers lightly touching screen
  2. [10s] Turning to face window, brow slightly furrowed
  3. [15s] Looking down at report in hand

Expression design:
- Dominant expression: Serious, solemn
- Micro-expression changes (5):
  1. [3s] Brow furrowed (trigger: seeing data)
  2. [6s] Eyes frozen (trigger: hearing alarm)
  ...

Dialogue delivery:
- Tone: Heavy, deep
- Pace: medium (4-5 characters/second)
- Emphasis words: 末世, 淹没, 围城, 苟活
- Pauses: After period 1.5s, after comma 0.5s

Emotional arc:
- Start: Shock(5) → Peak: Apocalyptic brutality(8) → End: Oppression(6)
- Peak timestamp: 15s (warrior dragged into water by zombie)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Consistency check:
✓ Matches character personality (calm, rational)
✓ Matches character arc (solitary leader)
✓ Matches current context (apocalyptic crisis)

Please choose:
1. Confirm and generate PerformanceStrategyCard
2. Adjust action design
3. Adjust expression design
4. Adjust dialogue delivery

Enter option (1/2/3/4):
```

### 8.2 User Adjustments

**Adjustment example**:
```
Input: 2
Select action number to adjust: 1
Enter new action description: 站在控制台前，双手快速操作屏幕

Updated key actions:
1. [5s] 站在控制台前，双手快速操作屏幕
2. [10s] 转身面向窗外，眉头微皱
3. [15s] 低头看向手中的报告

Confirm update? (y/n):
```

### 8.3 Generate PerformanceStrategyCard

**Card content**:
```typescript
{
  cardType: "PerformanceStrategyCard",
  sceneId: "第1集-第1场",
  directorBriefingCardId: "card_director_briefing_ep01_sc01",
  directorPrecheckSnapshot: {
    primaryStructure: "large_scene_compression",
    secondaryStructure: "continuous_action",
    performanceDirective: "表演重点放在林渊面对尸潮时的克制反应和战士群体的压迫感，不扩写无关情绪支线",
    preliminaryShotGroupPlan: [
      {
        groupNumber: 1,
        corePurpose: "建立洪水与尸潮压迫",
        coveredBeats: ["尸潮出现", "林渊观察", "战士抵抗"]
      }
    ]
  },

  performanceType: "mixed",
  performanceTypeDescription: "混合型场景，包含旁白台词和视觉动作",

  characterPerformances: [
    {
      characterId: "char-001",
      characterName: "林渊",

      actions: {
        keyActions: [
          {
            actionNumber: 1,
            triggerEvent: "场景开始",
            timestamp: 5,
            description: "站在控制台前，手指轻触屏幕",
            intensity: "subtle",
            purpose: "展现冷静的领导者形象",
            interactionWith: null
          }
        ],
        actionStyle: "克制、精确，动作幅度小，体现理性思维"
      },

      facialExpressions: {
        dominantExpression: "严肃、凝重",
        microExpressions: [
          {
            expressionNumber: 1,
            triggerEvent: "看到尸潮数据",
            timestamp: 3,
            expression: "眉头紧皱，眼神瞬间凝固",
            trigger: "情境突变"
          }
        ],
        expressionTransitions: [
          {
            from: "严肃",
            to: "凝重",
            triggerEvent: "听到警报声",
            timestamp: 6,
            duration: 1.5,
            reason: "危机升级"
          }
        ]
      },

      dialogueDelivery: {
        tone: "沉重、低沉、有力",
        pace: "medium",
        volume: "normal",
        emphasis: [
          { word: "末世", reason: "核心背景", timestamp: 1 },
          { word: "苟活", reason: "情绪词", timestamp: 9 }
        ],
        pauses: [
          {
            position: ""这是末世第137天"之后",
            duration: 1.5,
            purpose: "让时间信息沉淀",
            timestamp: 3
          }
        ]
      },

      emotionalArc: {
        startEmotion: "震撼",
        startIntensity: 5,
        peakEmotion: "末世惨烈",
        peakIntensity: 8,
        peakTimestamp: 15,
        peakTriggerEvent: "战士被丧尸拉拽入水",
        endEmotion: "压迫感",
        endIntensity: 6,
        transitions: [
          {
            from: "震撼",
            to: "压迫感",
            triggerEvent: "尸潮涌来",
            timestamp: 5
          }
        ]
      },

      characterConsistency: {
        alignsWithPersonality: true,
        alignsWithArc: true,
        alignsWithContext: true,
        notes: "动作风格克制精确，符合冷静理性的性格；情绪弧光符合弧光起点"
      }
    }
  ],

  characterInteractions: [],

  userConfirmed: true,

  upstreamCards: [
    "episode-scene-detail-card-001",
    "character-profile-card-001",
    "character-costume-card-001"
  ],

  status: "completed",
  createdAt: "2026-06-02T15:00:00Z"
}
```

---

## Test Cases

### Test Case 1: Voiceover Scene (Episode 1 Scene 1)

**Input data**:
- EpisodeSceneDetailCard: Episode 1 Scene 1
- Character Profile Card: 林渊 (calm, rational)
- Emotion: Shock, oppression
- Rhythm: fast

**Expected output**:
```typescript
{
  performanceType: "mixed",
  characterPerformances: [
    {
      characterName: "林渊",
      actions: {
        actionStyle: "克制、精确"
      },
      facialExpressions: {
        dominantExpression: "严肃、凝重"
      },
      dialogueDelivery: {
        tone: "沉重、低沉",
        pace: "medium"
      },
      emotionalArc: {
        startEmotion: "震撼",
        peakEmotion: "末世惨烈",
        endEmotion: "压迫感"
      }
    }
  ]
}
```

### Test Case 2: Dialogue Scene

**Input data**:
- Characters: 林渊 vs 苏晴
- Emotion: Tension, conflict
- Rhythm: fast
- Dialogue: Two arguing about survival strategy

**Expected output**:
```typescript
{
  performanceType: "dialogue",
  characterPerformances: [
    {
      characterName: "林渊",
      facialExpressions: {
        dominantExpression: "坚定、不妥协"
      },
      dialogueDelivery: {
        tone: "坚定、强硬",
        pace: "fast",
        volume: "loud"
      }
    },
    {
      characterName: "苏晴",
      facialExpressions: {
        dominantExpression: "愤怒、质疑"
      },
      dialogueDelivery: {
        tone: "激动、质疑",
        pace: "fast",
        volume: "loud"
      }
    }
  ],
  characterInteractions: [
    {
      interactionType: "对话",
      description: "两人激烈争论"
    }
  ]
}
```

### Test Case 3: Action Scene

**Input data**:
- Character: Soldier group
- Emotion: Tension, intense
- Rhythm: fast
- Action: Combat scene

**Expected output**:
```typescript
{
  performanceType: "action",
  characterPerformances: [
    {
      characterName: "战士群体",
      actions: {
        keyActions: [
          { description: "举枪射击", intensity: "strong" },
          { description: "装填弹药", intensity: "moderate" },
          { description: "闪避攻击", intensity: "strong" }
        ],
        actionStyle: "快速、连贯、力量感强"
      }
    }
  ]
}
```

---

## Implementation Checklist

### Feature Completeness
- [ ] Correctly reads Character Profile Cards (personality, motivation, arc)
- [ ] Correctly reads Character Costume Cards (typical expressions, typical actions)
- [ ] Correctly reads EpisodeSceneDetailCard (visualDescription, dialogue, emotion)
- [ ] Infers action style from personality
- [ ] Extracts key actions from visualDescription
- [ ] Determines trigger events and timestamps for each action
- [ ] Infers dominant expression and micro-expressions from emotion
- [ ] Designs expression transition timelines
- [ ] Marks emphasis words and pause positions from dialogue
- [ ] Designs emotional arc (start, peak, end)
- [ ] Infers character interactions from characterStates
- [ ] Performs consistency checks (personality/arc/context)

### User Experience
- [ ] Displayed content is clear and user-understandable
- [ ] Supports user adjustment of actions, expressions, dialogue delivery
- [ ] Friendly error messages (e.g., costume card does not exist)

### Data Quality
- [ ] Action style matches character personality
- [ ] Expression changes match emotional tone
- [ ] Dialogue delivery matches emotion and rhythm
- [ ] Emotional arc matches character development stage
- [ ] Character interaction inference is reasonable
- [ ] Consistency checks are accurate

### Technical Specifications
- [ ] Follows "professional inference" principle (based on detailed information)
- [ ] All actions, expressions, interactions have trigger events
- [ ] All elements have timestamps
- [ ] Upstream card IDs correctly recorded

---

## Inference Rules and Micro-Expression Techniques

The following rule libraries and techniques have been externalized to `references/`; read on demand:

- Personality/emotion/tone/rhythm mapping tables: read `references/inference-rule-library.md`
- Cinematic micro-expression control framework (millimeter-level action boundaries, physiological conduction order, emotional physical inertia, positive parameter constraints): read `references/microexpression-control-framework.md`

Do not copy reference content wholesale into the PerformanceStrategyCard; select only the specific rules needed for the current scene.

## After Completion — Next Steps

Completion criteria: `PerformanceStrategyCard` has been created, character objectives, obstacles, actions, dialogue, micro-expressions, and emotional arcs have been confirmed.

After completion, must check the completion status of the three strategy cards: `SceneStrategyCard`, `PerformanceStrategyCard`, `CinematographyStrategyCard`.

- Only when all three strategy cards are complete should `director-briefing` be invoked for review and shot group finalization.
- If any strategy cards are still missing, recommend completing the remaining strategy cards.

Recommended dialogue: `Performance strategy design is complete. I will check the completion status of the three strategy cards; only when all three strategy cards are complete should we return to director-briefing for review and finalization.`
