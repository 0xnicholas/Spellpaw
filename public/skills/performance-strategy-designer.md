---
id: performance-strategy-designer
name: performance-strategy-designer
description: Use to plan performance direction — expressions, body language, dialogue delivery — for a character in a scene. Reads scene + character cards via get_canvas, updates metadata via update_card. Drives generate_asset for reference images of key beats.
slashCommand: performance-strategy-designer
examples: []
parameters: {}
required: []
---

# Performance Strategy Designer

Based on the EpisodeSceneDetailCard, DirectorBriefingCard precheck directives, Character Profile Cards, and Character Costume Cards, translate script text into visualizable actions, expressions, micro-expressions, and dialogue delivery.

**This skill is the core translation skill**, responsible for transforming textual descriptions into actor-executable performance direction.

---

## Reference Routing

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

Do not copy reference content wholesale into the PerformanceStrategyCard; select only the specific rules needed for the current scene.

## After Completion — Next Steps

Completion criteria: `PerformanceStrategyCard` has been created, character objectives, obstacles, actions, dialogue, micro-expressions, and emotional arcs have been confirmed.

After completion, must check the completion status of the three strategy cards: `SceneStrategyCard`, `PerformanceStrategyCard`, `CinematographyStrategyCard`.

- Only when all three strategy cards are complete should `director-briefing` be invoked for review and shot group finalization.
- If any strategy cards are still missing, recommend completing the remaining strategy cards.

Recommended dialogue: `Performance strategy design is complete. I will check the completion status of the three strategy cards; only when all three strategy cards are complete should we return to director-briefing for review and finalization.`

---

# References

## Reference: dialogue-timing-and-delivery

# 台词时长与演绎

## 台词必须具体

关键剧情信息不能写成概括：

```text
不要：医生说出噩耗。
要：医生摘下口罩，低声说：“我们尽力了，但她没能撑过来。”
```

适用场景：

- 医生/警察/电话通知
- 表白、分手、背叛、承诺
- 录音、遗言、旁白、内心OS
- 任何改变剧情走向的信息

## 台词时长估算

普通中文戏剧对白：

- 正常语速：约3-4字/秒。
- 克制、迟疑、哭腔：约2-3字/秒。
- 愤怒爆发：可快，但仍要给听者反应。

预算时要加：

- 说话前停顿
- 说话时动作
- 听者反应
- 结尾1-2秒余韵

## 演绎字段

每句关键台词至少包含：

```typescript
{
  line: string;
  speaker: string;
  timing: string;
  tone: string;
  pace: "fast" | "medium" | "slow";
  volume: "loud" | "normal" | "soft";
  pauseBefore?: string;
  listenerReaction: string;
}
```

## 声音表演

- 震惊：音量变低，句尾断掉。
- 强忍：气息不稳，但仍努力控制音量。
- 愤怒克制：语速变慢，重音更硬。
- 亲密：音量变轻，停顿更多。
- 麻木：语调平，反应慢。

## 环境声与表演

表演策略可以给声音锚点，供导演讲戏和视频制作使用：

- 医院：荧光灯、电流声、监护仪、护士脚步。
- 深夜公寓：冰箱低频、电梯远声、手机震动。
- 饭桌：碗筷轻碰、汤勺停住、椅子摩擦。
- 雨夜车内：雨刷、车顶雨声、发动机怠速。
- 古风室内：烛火、衣袖摩擦、发簪轻响。

默认不写“电影感配乐”。优先写真实环境声和动作声。

## Reference: emotion-microexpression-map

# 情绪到微表情映射

每种情绪选择3-5个可见节点即可，不要堆满所有部位。

## 悲伤 / Grief

- 眼神失焦，视线落不到对方身上。
- 下眼睑泛红或轻颤。
- 嘴角先维持体面，随后慢慢下坠。
- 呼吸变浅，像把声音压回胸腔。
- 手指攥住衣料或道具，随后无力松开。

## 震惊 / Shock

- 呼吸突然停住。
- 瞳孔轻微放大，眨眼变慢。
- 嘴唇微张但说不出话。
- 手停在半空，动作中断。
- 声音环境可短暂变闷。

## 强忍哭泣 / Suppressed Crying

- 下眼睑蓄泪但不落。
- 嘴角或双唇轻颤。
- 下颌锁住，喉咙吞咽。
- 视线避开对方，试图恢复表情。
- 手指寻找动作锚点：袖口、杯子、门把手。

## 愤怒克制 / Restrained Anger

- 下颌绷紧，牙关压住。
- 眼神锁定对方但不靠近。
- 呼吸从鼻腔短促进出。
- 手指压住桌沿或杯壁。
- 说话变慢，音量不一定提高。

## 羞怯 / Shyness

- 视线先靠近再弹开。
- 嘴角压不住上扬。
- 呼吸轻短，肩膀略收。
- 手指整理衣角、头发或道具。
- 再次鼓起勇气看向对方。

## 爱意克制 / Restrained Love

- 眼神柔化，但停留时间很短。
- 微笑先出现在眼睛，再被压回嘴角。
- 身体微微靠近，又保持礼貌距离。
- 触碰动作悬停或改成替对方整理物件。
- 离开后回头或用余光确认。

## 恐惧 / Fear

- 眼睛睁大但身体变小。
- 呼吸变浅，喉咙吞咽。
- 肩膀上提，手指贴近身体。
- 视线反复扫向声音来源。
- 后退或停住，动作变慢。

## 麻木 / Numbness

- 眼神空，反应延迟。
- 面部肌肉松掉，嘴唇微开。
- 动作机械重复。
- 声音平直，情绪像断开。
- 关键物件掉落或握着却无意识。

## 决绝 / Resolve

- 眼神重新聚焦。
- 呼吸从乱到稳。
- 下颌收紧，肩膀放平。
- 手指从颤抖变成稳定抓握。
- 做出一个不可逆动作：签字、推门、拔剑、转身离开。

## 阴冷 / Cold Cruelty

- 表情减少，眼神变窄。
- 嘴角极轻地上扬但眼睛不笑。
- 说话速度稳定，音量低。
- 动作慢而准，不显急躁。
- 视线像衡量物件而不是面对人。

## 尴尬 / Awkwardness

- 视线快速游移。
- 笑容短暂、僵硬、很快收回。
- 手找不到放处，转向杯子、手机、衣角。
- 说话重复或尾音变轻。
- 身体后退半步或侧开。

## Reference: inference-rule-library

# 推断规则库

按需在阶段2-6中使用以下映射表辅助推断。不要将表格原样输出给用户。

## 性格-动作风格映射表

| 性格特征 | 动作风格 | 典型动作 |
|----------|----------|----------|
| 冷静、理性 | 克制、精确、少量手势 | 手指轻触、点头确认、站立不动 |
| 热情、外向 | 夸张、开放、大幅度动作 | 张开双臂、拍肩膀、大步前进 |
| 紧张、焦虑 | 细碎、频繁、不安定 | 搓手、踱步、摸头发 |
| 自信、强势 | 稳定、果断、占据空间 | 交叉双臂、挺胸抬头、指向动作 |
| 温柔、内敛 | 柔和、小幅度、接近身体 | 轻抚、点头、微笑 |

## 情绪-表情映射表

| 情绪基调 | 主要表情 | 微表情类型 |
|----------|----------|-----------|
| 震撼、压迫感 | 紧绷、严肃、眉头紧锁 | 眉毛紧皱、眼神凝固、嘴唇紧抿 |
| 温馨、欢快 | 微笑、放松、眼神柔和 | 眼角上扬、嘴角微笑、眉毛放松 |
| 悲伤、绝望 | 低垂、眼神空洞、嘴角下压 | 眉毛下垂、眼神失焦、嘴唇颤抖 |
| 愤怒、激动 | 眉头紧皱、眼神锐利、嘴唇紧抿 | 眉毛扬起、眼神凝视、鼻翼扩张 |
| 平静、日常 | 自然、中性、无明显情绪 | 微笑、点头、眼神交流 |

## 情绪-语气映射表

| 情绪基调 | 语气 | 语速 | 音量 |
|----------|------|------|------|
| 震撼、压迫感 | 沉重、低沉、有力 | medium | normal |
| 温馨、欢快 | 轻快、明亮、柔和 | medium | normal |
| 悲伤、绝望 | 颤抖、哽咽、低落 | slow | soft |
| 愤怒、激动 | 高亢、急促、强烈 | fast | loud |
| 平静、日常 | 自然、平和、稳定 | medium | normal |

## 节奏-时间点映射表

| 节奏 | sequence间隔 | 动作时长 | 表情转换时长 |
|------|-------------|----------|-------------|
| fast | 3-5秒 | 1-2秒 | 0.5-1秒 |
| medium | 5-8秒 | 2-4秒 | 1-2秒 |
| slow | 8-12秒 | 4-6秒 | 2-3秒 |

## Reference: microexpression-control-framework

# 电影级微表情控制框架

来源: Larus Canus (@MrLarus) 电影级微表情提示词框架。适用场景: 人物头肩部特写、情绪细腻转换、一镜到底无剪辑。

按需在设计近景特写和情绪细腻转换时读取，不要全文复制进卡片。

## REF-001: 电影级微表情控制框架（近景特写）

**质量等级**: ⭐⭐⭐⭐⭐

### 核心原则

#### 1. 毫米级动作边界

将面部表情的动作幅度控制在毫米级别，避免五官大幅度位移。

**控制要点**:
- **眼睑**: 上下眼睑的开合幅度控制在1-3毫米
- **嘴角**: 嘴角的上扬或下垂控制在2-5毫米
- **绝对静止区**: 额头、颧骨、下颌骨架等区域保持完全静止
- **微动区**: 只有眼周肌肉（眼轮匝肌）和口周肌肉（口轮匝肌）产生微小形变

**实现方法**: 在表情设计时明确标注动作幅度，设定静止区域，使用物理尺度描述。

```
✅ 正确："眼睑微微上提1-2毫米，瞳孔略微扩张，嘴角极轻微上扬约3毫米，额头保持静止"
❌ 错误："眼睛睁大，嘴角上扬"
```

#### 2. 生理传导顺序

情绪显现遵循神经传导顺序，非五官同步：

```
情绪触发
  ↓
1. 眼周先变（0.1-0.3秒）: 瞳孔→眼睑→眼周肌肉
  ↓
2. 口唇再变（0.3-0.5秒后）: 嘴角→唇部轮廓→口周肌肉
  ↓
3. 下颌最后微调（0.5-0.8秒后）: 下颌→咬肌
```

**实现方法**: 为表情转换设计精确时间线（0.1秒级），标注各部位先后顺序，避免"同时"。

#### 3. 情绪物理惯性

情绪状态具有物理惯性，前一阶段生理表现在后一阶段缓慢减弱：

- **眼眶红润**: 哭后红润持续3-10秒逐渐消退
- **泪光**: 止哭后湿润反光保留2-5秒
- **呼吸节奏**: 激动后呼吸加速需10-20秒恢复
- **肌肉紧张**: 愤怒时咬肌紧绷平静后残留5-8秒

**实现方法**: 为生理表现设计强度曲线，标注百分比衰减，禁止突变。

#### 4. 正向参数约束

使用正向物理指令约束画面质感：

- ✅ "保持真实皮肤纹理，可见毛孔和细微血管"
- ✅ "维持一致的自然光照，色温3200K，柔和漫射"
- ✅ 用"保持"、"维持"、"控制在"等正向动词

替代否定式清单：
- ❌ "禁止磨皮、禁止滤镜" → ✅ "保持摄影级真实质感，皮肤纹理清晰"

## 完整示例：7段情绪转换微表情序列

场景: 角色从"克制高兴"到"平静收回"，40秒，头肩部特写，9:16竖版，自然光5500K。

```
阶段1 (0-5s): 克制高兴 (3/10)
  嘴角上扬2mm，唇线闭合；眼周浅笑纹<0.3mm；额头下颌静止

阶段2 (5-10s): 笑意迟疑 (4/10)
  嘴角回收至1mm；眼睑收紧；眼神游移；笑纹淡化
  转换：0.8s (眼周→嘴角→额头)

阶段3 (10-15s): 湿润感初现 (5/10)
  嘴角平直；眨眼频率3s/次；眼球表面湿润反光；鼻翼微张

阶段4 (15-22s): 压抑伤心 (7/10)
  嘴角下拉2mm，唇微颤；眨眼1.5s/次；眼眶泛红20%；泪光50%
  转换：1.2s (眼眶→嘴角→下颌)

阶段5 (22-29s): 强压哭意 (8/10) 峰值
  嘴唇紧闭；眨眼1s/次；眼眶红润100%；泪光100%；眉头紧皱

阶段6 (29-35s): 含泪释怀 (6/10)
  唇线放松；眨眼2s/次；红润100%→60%；泪光100%→70%；深呼吸1次

阶段7 (35-40s): 平静收回 (3/10)
  嘴角中性；眨眼正常4-5s/次；红润60%→20%；泪光70%→30%；眼神重聚焦
```

### 技术约束

- 保持真实摄影质感，皮肤纹理清晰，发丝细节
- 恒定景别，头肩部框定，无推拉摇移
- 一致自然光照5500K，柔和漫射，眼球高光一致
- 全程严格人物形象、服饰、妆容一致，背景静止

## 使用指南

- **情感细腻转换场景** → 使用情绪物理惯性和生理传导顺序
- **近景特写镜头** → 使用毫米级动作边界
- **一镜到底无剪辑** → 使用完整框架
- **高质量影视级表演** → 使用正向参数约束

## 持续更新

- REF-002: 待添加（动作戏表演控制）
- REF-003: 待添加（对话戏表演节奏）
- REF-004: 待添加（特定演员风格）

## Reference: performance-vocabulary

# 表演设计词汇库

## 表演链

强情绪戏不要直接写“悲伤/愤怒/害怕”。按以下链条组织：

```text
内在冲突 -> 生理反应 -> 微表情 -> 贯穿动作锚点 -> 决定性行为
```

示例：

```text
因为她不能在孩子面前崩溃，所以先屏住呼吸，嘴角僵住；右手反复摩擦袖口，最后蹲下给孩子系鞋带，把眼泪压回去。
```

## 动作锚点

贯穿动作锚点用于让表演连续，而不是一段一个表情：

- 衣袖、衣角、床单、杯子、门把手、手机、信、戒指、剑柄、报告、碗筷。
- 锚点必须变化：攥紧、松开、反复摩擦、停住、掉落、递出、藏起。
- 不要无故重置：上一阶段攥杯子，下一阶段不能突然空手，除非写出放下动作。

## 动作强度词

细微动作：

- 停顿、迟疑、屏息、垂眼、避开视线、指尖收紧、喉结轻动、肩膀微塌、下颌锁住。

中等动作：

- 转身、后退半步、抬手又停住、把杯子推开、扶住桌沿、缓慢坐下、伸手触碰又收回。

强动作：

- 推开门、摔杯、抱住、跪下、冲出、扑向、挡住、夺过、跌倒、撞上墙面。

## 微表情部位

优先写可见部位：

- 眼神：失焦、锁定、回避、柔化、发冷、发空。
- 下眼睑：颤动、泛红、绷紧、湿润。
- 嘴角：僵住、下坠、强撑上扬、抽动。
- 双唇：抿紧、轻颤、张开又合上。
- 下颌：锁住、绷紧、微微发抖。
- 呼吸：屏住、变浅、急促、压回胸腔。
- 手指：攥紧、松开、摩擦、抠住、悬停。

## 大动作前的身体空间

如果角色要转身、跌倒、拥抱、推开、奔跑、格斗或跪下，表演策略必须提示拍摄策略拉开景别或后撤镜头。不要在ECU/CU里塞完整身体动作。

