---
id: music-direction
name: music-direction
description: Use to set the music direction for a project — style, BPM, key, instrumentation, emotion map. Reads storyline cards via get_canvas, updates moodboard / storyline cards with music guidance via update_card.
slashCommand: music-direction
examples: []
parameters: {}
required: []
---

# Music Direction Card — Extraction Detail Refinement (Sub-Skill)

## I. Skill Positioning

### 1.1 Role as a Sub-Skill

The Music Direction Skill is a **sub-skill of the Script Deconstruct Skill**, invoked during **Phase 2: Guided Style Setting** of script deconstruction.

**Invocation Timing**:
- After Phase 1 (automatic extraction of core information) is complete
- After the user confirms assumptions
- Before or after art direction (order is adjustable)

**Invocation Method**:
```typescript
const musicDirectionCard = await callSkill('music-direction', {
  fullScript: fullScriptCard,
  storyCore: storyCoreCard,
  worldview: worldviewCard,
  narrativeRhythm: narrativeRhythmCard,
  userMusicChoice: {
    primaryStyle: "中国传统音乐为主，融合现代编曲",
    referenceWorks: ["《三国演义》原声带", "《权力的游戏》配乐"],
    userPreferences: "战争场景要有鼓点和弦乐，情感场景用古筝和二胡"
  }
});
```

### 1.2 Input Dependencies

**Required Inputs**:
1. **Full Script Card** (FullScriptCard) — provides the complete script content and episode-scene structure
2. **Story Core Card** (StoryCoreCard)
   - genre → determines music style direction
   - emotionalCore → determines music tone
3. **Worldview Card** (WorldviewCard)
   - timeSetting → determines instrument system and musical tradition
   - spaceSetting → determines regional music style

**Optional Inputs**:
- **Plot Pacing Card** (NarrativeRhythmCard) — used to identify key emotional beats and determine BGM trigger points
- **User Music Choice** (userMusicChoice) — user's style preferences and reference works

### 1.3 Output Deliverable

**Output**: **Music Direction Card** (MusicDirectionCard)
- Global music style definition (instrument system, tonality, emotional mapping)
- BGM list (which background music tracks need to be produced)
- SFX list (which sound effects need to be prepared)

---

## Reference Routing

Based on the current task, only read the necessary reference; do not copy reference content into the card:

---

## II. Field Definitions

```typescript
interface MusicDirectionCard extends BaseCard {
  type: 'music_direction';

  content: {
    // === Global Music Style ===
    globalMusicStyle: {
      styleDescription: string;  // Overall style description

      culturalContext: {
        musicalTradition: string;  // Musical tradition (e.g. traditional Chinese music, Western classical, electronic)
        era: string;               // Era feel (e.g. ancient style, modern, futuristic)
        regionalInfluence?: string; // Regional influence (e.g. bold northern, graceful Jiangnan)
      };

      instrumentSystem: {
        primaryInstruments: Array<{
          instrument: string;      // Instrument name
          role: string;            // Role (main melody / emotional rendering / rhythm)
          characteristics: string; // Timbre characteristics
        }>;
        supportingInstruments: string[];
        forbiddenInstruments?: Array<{
          instrument: string;
          reason: string;          // Reason for forbidding (e.g. inconsistent with era)
        }>;
      };

      tonalCharacteristics: {
        keyTendency: string;   // Key tendency description (e.g. primarily pentatonic, primarily minor)
        defaultKey?: string;   // Default key (e.g. pentatonic, C minor, A major)
        tempoRange: string;    // Tempo range description (e.g. 40-160 BPM)
        defaultBPM?: number;   // Default BPM (e.g. 90)
        dynamicRange: string;  // Dynamic range (e.g. from pianissimo to fortissimo)
      };

      emotionalMapping: Array<{
        emotion: string;           // Emotion (e.g. tension, sadness, joy, heroic)
        musicalTreatment: string;  // Musical treatment approach
        instruments: string[];
        tempo: string;             // Tempo description (e.g. moderate and solemn, 120-140 BPM)
        bpm?: number;              // Specific BPM value (e.g. 130)
        key?: string;              // Key for this emotion (e.g. C minor)
      }>;
    };

    // === BGM List ===
    bgmList: Array<{
      bgmId: string;
      name: string;
      type: 'main_theme' | 'character_theme' | 'scene_theme' | 'emotional_theme' | 'action' | 'ending';

      usage: {
        description: string;
        usageScenarios: Array<{
          episode?: number;
          sceneType?: string;
          trigger: string;
        }>;
      };

      musicalCharacteristics: {
        mood: string;
        tempo: string;
        keyInstruments: string[];
        duration: string;
        variations?: string[];
      };

      assetCardId?: string;
    }>;

    // === SFX List ===
    sfxList: Array<{
      sfxId: string;
      name: string;
      category: 'combat' | 'environment' | 'ui' | 'character' | 'special';

      usage: {
        description: string;
        usageScenarios: Array<{
          sceneType?: string;
          trigger: string;
        }>;
      };

      soundCharacteristics: {
        description: string;
        duration: string;
        intensity: 'subtle' | 'moderate' | 'prominent';
        variations?: string[];
      };

      assetCardId?: string;
    }>;

    // === Linked Cards ===
    linkedCards: {
      sourceScriptCardId: string;
      narrativeRhythmCardId?: string;
      worldviewCardId?: string;
      bgmAssetCardIds?: string[];
      sfxAssetCardIds?: string[];
    };
  };
}
```

---

## III. Music Direction Extraction Process

### 3.1 Preliminary Steps (Completed by Parent Skill)

**Step 1: Analyze Script Music Needs**

The parent skill analyzes the script's music style tendencies based on the story core and worldview:
```
Analysis dimensions:
• Era → determine instrument system and musical tradition
• Emotional tone → determine overall music tone
• Core conflict → determine musical tension and dynamic range
• Story genre → determine overall music style direction
```

**Step 2: Present Music Style References**

The parent skill provides 3-4 music style option groups, each containing:
- Representative soundtrack works (film/series OSTs)
- Style keywords (3-5)
- One-sentence description

**Step 3: User Selection and Refinement**

The user selects a music style direction and can:
- Choose a single style
- Mix styles
- Provide reference works
- Describe music feelings for specific scenes

**Step 4: Invoke Music Direction Sub-Skill**

After user confirmation, the parent skill invokes the music direction sub-skill, passing in the user's music choice

### 3.2 Core Tasks of the Sub-Skill

After receiving the user's music choice, the music direction sub-skill needs to:

1. **Parse the user's music choice**: understand the user's chosen style direction and preferences
2. **Extract script music cues**: extract all music-related descriptions from the script
3. **Build the global music style**: translate the style choice into a detailed instrument system and emotional mapping
4. **Identify BGM needs**: identify which background music tracks need to be produced from plot beats
5. **Identify SFX needs**: identify which sound effects need to be prepared from scene descriptions
6. **Output the Music Direction Card**: generate the complete music direction card

### 3.3 Detailed Extraction Process

#### Step 1: Parse User Music Choice

**Input**:
```typescript
userMusicChoice: {
  primaryStyle: "中国传统音乐为主，融合现代编曲",
  referenceWorks: ["《三国演义》原声带", "《权力的游戏》配乐"],
  userPreferences: "战争场景要有鼓点和弦乐，情感场景用古筝和二胡"
}
```

**Parsing Tasks**:
1. Extract primary style keywords: traditional Chinese, ancient style, modern fusion
2. Identify musical characteristics of reference works:
   - Romance of the Three Kingdoms OST: guzheng, erhu, bianzhong, big drum, pentatonic mode
   - Game of Thrones score: strings, percussion, epic feel, large dynamic range
3. Extract user's music expectations for specific scenes:
   - Battle scenes: drums + strings → fast tempo, strong intensity
   - Emotional scenes: guzheng + erhu → slow, delicate

**Output**:
```typescript
{
  styleDescription: "以中国传统乐器为主旋律，融合现代管弦乐编曲，营造史诗感与情感深度并重的音乐风格",
  culturalContext: {
    musicalTradition: "中国传统音乐",
    era: "古风",
    regionalInfluence: "北方豪迈（战争场景）+ 中原雅正（宫廷场景）"
  }
}
```

#### Step 2: Extract Script Music Cues

**Scan from the full script**:

**Music cues in scene descriptions**:
- Scan all scene descriptions; extract music/sound-related keywords
- Identify explicit music instructions (e.g. drums sounding, qin music flowing)
- Identify implicit music needs (e.g. battlefield with drums roaring, silent deep night)

**Example**:
```
Scene description:
"战鼓声震天，三军将士齐声呐喊，旌旗猎猎作响。"

Extracted:
- Explicit SFX: war drum sounds, battle cries, banner sounds
- Implicit BGM need: war theme, needs rousing battle music
- Emotion: heroic, hot-blooded
```

**Extract from Story Core Card**:
- emotionalCore.dominantEmotion → determines main tone
  - Tragic → low strings + guzheng lament
  - Hot-blooded → fast drum beats + rousing strings
  - Tender → soft guzheng + flute
- theme.coreTheme → determines musical metaphor
  - Loyalty → solemn, weighty theme music
  - Betrayal → dissonant intervals, dark colors
  - Brotherhood → warm, resonant theme

**Extract from Worldview Card**:
- timeSetting.era → determines instrument system
  - Late Eastern Han → guzheng, erhu, pipa, bianzhong, war drums
  - Modern urban → piano, strings, electronic elements
  - Post-apocalyptic wasteland → industrial noise, distorted guitar, electronic percussion
- spaceSetting → determines regional music style
  - Northern battlefield → bold, rough
  - Jiangnan water town → graceful, delicate
  - Palace → solemn, elegant

#### Step 3: Build Instrument System

**Rule 1: Select primary instruments based on era**

| Era | Primary Instruments | Forbidden Instruments |
|---------|---------|---------|
| Ancient China | Guzheng, erhu, pipa, flute, bianzhong, war drums | Electric guitar, synthesizer (unless stylized) |
| Modern urban | Piano, strings, electronic elements | No specific restrictions |
| Post-apocalyptic wasteland | Industrial noise, distorted guitar, electronic percussion | Traditional classical instruments (unless for contrast) |
| Ancient West | Strings, pipe organ, war drums, horns | Eastern instruments (unless mixed style) |

**Rule 2: Assign instrument roles based on emotional function**

| Emotional Function | Instrument Role | Example |
|---------|---------|------|
| Main melody / Theme | Solo instrument | Guzheng solo, erhu solo |
| Emotional rendering | String section | String quartet, orchestral |
| Rhythm / Tension | Percussion | War drums, timpani |
| Atmosphere / Color | Wind instruments | Flute, xiao, horn |

#### Step 4: Build Emotion-to-Music Mapping

**Based on the Story Core Card's emotion list, create a music treatment plan for each emotion**:

| Emotion | Musical Treatment | Primary Instruments | Tempo |
|-----|---------|---------|------|
| Heroic / Epic | Large orchestral + war drums | War drums, strings, horns, guzheng | Moderate solemn, 120-140 BPM |
| Tense / Crisis | Fast string pizzicato + bass drum | Pipa, low strings, timpani | Urgent, 140-180 BPM |
| Sad / Parting | Solo strings + soft accompaniment | Erhu, guzheng | Slow, 40-60 BPM |
| Tender / Brotherhood | Warm strings + soft winds | Guzheng, flute, strings | Moderate relaxed, 70-90 BPM |
| Intrigue / Conspiracy | Low pizzicato + dissonant intervals | Pipa, low strings | Slow gloomy, 50-70 BPM |
| Victory / Joy | Full ensemble + percussion | Full instrument group | Fast rousing, 140-160 BPM |

**Output Example**:
```typescript
{
  emotionalMapping: [
    {
      emotion: "壮烈/史诗",
      musicalTreatment: "大编制管弦乐与战鼓齐鸣，五声调式主旋律，层层递进的动态",
      instruments: ["战鼓", "弦乐组", "号角", "古筝"],
      tempo: "中速庄重，120-140 BPM"
    },
    {
      emotion: "悲伤/离别",
      musicalTreatment: "二胡独奏主旋律，古筝轻柔伴奏，留白处理，不过度渲染",
      instruments: ["二胡", "古筝"],
      tempo: "缓慢，40-60 BPM"
    },
    {
      emotion: "紧张/危机",
      musicalTreatment: "琵琶快速拨奏，低音弦乐持续震音，定音鼓渐强",
      instruments: ["琵琶", "低音弦乐", "定音鼓"],
      tempo: "急促，140-180 BPM"
    }
  ]
}
```

#### Step 4.1: BPM and Key Generation

#### Step 5: Identify BGM Needs

**BGM Identification Rules**:

**Rule 1: Must have a main theme**
- Every series must have one main theme (main_theme)
- The main theme represents the core emotion and style of the entire series

**Rule 2: Major characters need character themes**
- The protagonist must have a character theme
- The antagonist usually needs a character theme
- Important supporting characters are optional

**Rule 3: Identify key scene BGMs from the Plot Pacing Card**
- Scan emotional climax points in the Plot Pacing Card
- Each climax type corresponds to a BGM type
- Scene types with high frequency need dedicated BGMs

**Rule 4: Count scene types from the episode-scene table**
- Battle scenes appear N times → need battle theme BGM
- Emotional scenes appear N times → need emotional theme BGM
- Palace/intrigue scenes appear N times → need intrigue theme BGM

**BGM List Identification Example** (for a Late Eastern Han epic):

| BGM Name | Type | Trigger Scene | Frequency |
|--------|------|---------|---------|
| Main Theme | main_theme | Opening, key emotional nodes | Entire series |
| Liu-Guan-Zhang Brotherhood Theme | character_theme | Three together, brotherhood scenes | High |
| Battle Theme | action | Battle start, army march | High |
| Tragic Theme | emotional_theme | Sacrifice, parting, defeat | Medium |
| Intrigue Theme | scene_theme | Palace conspiracy, power struggle | Medium |
| Ending Theme | ending | End of each episode | Entire series |

**Output Example**:
```typescript
{
  bgmList: [
    {
      bgmId: "bgm_001",
      name: "主题曲《义》",
      type: "main_theme",
      usage: {
        description: "全剧主题曲，代表忠义精神，在关键情感节点使用",
        usageScenarios: [
          { sceneType: "片头", trigger: "每集开始" },
          { episode: 15, sceneType: "结义场景", trigger: "桃园三结义仪式" },
          { sceneType: "牺牲场景", trigger: "主要角色牺牲时" }
        ]
      },
      musicalCharacteristics: {
        mood: "庄重、深情、史诗感",
        tempo: "中速庄重，80-100 BPM",
        keyInstruments: ["古筝", "二胡", "弦乐组", "战鼓"],
        duration: "3-4分钟完整版，30秒简短版",
        variations: ["完整版", "简短版（30秒）", "高潮版（仅副歌）", "纯器乐版"]
      }
    },
    {
      bgmId: "bgm_002",
      name: "战争主题《征》",
      type: "action",
      usage: {
        description: "战争场景专用BGM，营造紧张激烈的战斗氛围",
        usageScenarios: [
          { sceneType: "战争场景", trigger: "战斗开始" },
          { sceneType: "军队出征", trigger: "大军开拔" }
        ]
      },
      musicalCharacteristics: {
        mood: "激烈、紧张、壮烈",
        tempo: "快速激昂，140-160 BPM",
        keyInstruments: ["战鼓", "弦乐组", "号角", "琵琶"],
        duration: "循环版（2分钟），可无缝循环",
        variations: ["开场版（渐强）", "高潮版", "收尾版（渐弱）"]
      }
    }
  ]
}
```

#### Step 6: Identify SFX Needs

**SFX Identification Rules**:

**Extract SFX needs from scene descriptions**:
- Scan all scene descriptions; extract sound-related keywords
- Group by category: combat SFX, environment SFX, character SFX, special SFX

**SFX Category Identification**:

| Category | Identification Keywords | Examples |
|-----|---------|------|
| combat | Swords, war drums, arrows, horse hooves | Sword clash sounds, drum sounds, arrow whistling |
| environment | Wind, rain, birdsong, water flow | Battlefield wind, campfire sounds, palace echo |
| character | Footsteps, breathing, battle cries | General's shouts, soldier footsteps |
| special | Special abilities, magic, supernatural | Corpse control activation SFX, system notification |
| ui | System notifications, interface operations | System alert, skill activation sound |

**Output Example**:
```typescript
{
  sfxList: [
    {
      sfxId: "sfx_001",
      name: "刀剑碰撞",
      category: "combat",
      usage: {
        description: "近战武器碰撞时的金属声",
        usageScenarios: [
          { sceneType: "战争场景", trigger: "武器碰撞" },
          { sceneType: "决斗场景", trigger: "单挑交锋" }
        ]
      },
      soundCharacteristics: {
        description: "清脆的金属碰撞声，带有余震感",
        duration: "0.3-0.8秒",
        intensity: "prominent",
        variations: ["轻击版", "重击版", "连击版"]
      }
    },
    {
      sfxId: "sfx_002",
      name: "战场环境音",
      category: "environment",
      usage: {
        description: "战场的整体环境氛围音，包含风声、远处喊杀声、马蹄声",
        usageScenarios: [
          { sceneType: "战争场景", trigger: "战场场景开始" }
        ]
      },
      soundCharacteristics: {
        description: "混合音效：风声 + 远处喊杀声 + 马蹄声 + 兵器碰撞声",
        duration: "循环，30秒无缝循环",
        intensity: "moderate",
        variations: ["战前版（安静）", "激战版（嘈杂）", "战后版（沉寂）"]
      }
    }
  ]
}
```

**Output Example** (for Late Eastern Han):
```typescript
{
  instrumentSystem: {
    primaryInstruments: [
      {
        instrument: "古筝",
        role: "主旋律，情感场景主奏",
        characteristics: "音色清亮，适合表达细腻情感和英雄气概"
      },
      {
        instrument: "二胡",
        role: "情感渲染，悲情场景主奏",
        characteristics: "音色哀婉，善于表达悲伤、思念、离别"
      },
      {
        instrument: "战鼓",
        role: "节奏，战争场景主导",
        characteristics: "音色厚重有力，营造战争紧张感和壮烈感"
      },
      {
        instrument: "琵琶",
        role: "叙事，权谋场景辅助",
        characteristics: "音色铿锵，适合表达紧张、算计、权谋"
      }
    ],
    supportingInstruments: ["笛", "箫", "编钟", "管弦乐（现代编曲）"],
    forbiddenInstruments: [
      {
        instrument: "电吉他",
        reason: "与东汉末年时代背景不符，除非用于特殊风格化场景"
      }
    ]
  }
}
```

---

## IV. Quality Check Checklist

### 4.1 Required Field Completeness Check

**Global Music Style**:
- [ ] styleDescription: is the style description clear (1-2 sentences)?
- [ ] culturalContext.musicalTradition: is the musical tradition clear?
- [ ] culturalContext.era: is the era feel clear?
- [ ] instrumentSystem.primaryInstruments: does it include 3-5 primary instruments?
- [ ] tonalCharacteristics.keyTendency: is the key tendency description clear?
- [ ] tonalCharacteristics.defaultKey: is a specific default key provided (e.g. pentatonic, C minor)?
- [ ] tonalCharacteristics.tempoRange: is the tempo range description clear?
- [ ] tonalCharacteristics.defaultBPM: is a specific default BPM value provided?
- [ ] tonalCharacteristics.dynamicRange: is the dynamic range clear?
- [ ] emotionalMapping: does it cover the main emotion types in the script (at least 4)?
- [ ] emotionalMapping[].bpm: does each emotional mapping have a specific BPM value?
- [ ] emotionalMapping[].key: does each emotional mapping have a specific key?

**BGM List**:
- [ ] Is there a main theme (main_theme)?
- [ ] Does the protagonist have a character theme (character_theme)?
- [ ] Do battle/action scenes have a dedicated BGM (action)?
- [ ] Do emotional climax scenes have a dedicated BGM (emotional_theme)?
- [ ] Does each BGM's usageScenarios have clear trigger conditions?
- [ ] Are each BGM's keyInstruments consistent with the global instrument system?

**SFX List**:
- [ ] Do combat SFX cover the main weapon types?
- [ ] Do environment SFX cover the main scene types?
- [ ] Are special ability/system SFX (special/ui) filled in (if applicable)?
- [ ] Do each SFX's variations consider different intensities/distances?

### 4.2 Logical Consistency Check

**Consistency with Worldview Card**:
- [ ] Is the instrument system consistent with the era (no era-inappropriate instruments)?
- [ ] Is the regional music style consistent with the spatial setting?

**Consistency with Story Core Card**:
- [ ] Does the emotional mapping cover the main emotions in the story core?
- [ ] Is the overall music tone consistent with the story's emotional core?

**Internal Consistency**:
- [ ] Are all BGM keyInstruments present in the global instrument system?
- [ ] Are BGM mood descriptions consistent with the emotional mapping rules?
- [ ] Are SFX sound descriptions consistent with scene settings?

### 4.3 Actionability Check

- [ ] Do BGMs have clear durations or loop instructions?
- [ ] Do BGM variations sufficiently cover different usage scenarios?
- [ ] Do SFX have clear durations?
- [ ] Are SFX intensities reasonable (not all SFX are prominent)?

---

## V. Agent Interaction Points

Key interaction nodes:
- **Receiving music choice**: Confirm user selection, announce analysis in progress
- **Progress feedback**: Show instrument system → emotional mapping → BGM list → SFX list checkmarks
- **Presenting decisions**: List instrument system, BGM catalog, SFX catalog for review
- **User adjustments**: Update card based on feedback, re-display affected sections
- **Completion**: List downstream impacts (BGM assets, SFX assets, storyboard)

---

## VI. Complete Extraction Example

## VII. Summary

### 7.1 Core Points of the Music Direction Sub-Skill

1. **Understand user music choice**: accurately parse the user's style preferences and reference works
2. **Extract script music cues**: extract music-related information from the script, story core, and worldview
3. **Build a complete instrument system**: based on era and emotional needs, define primary instruments and forbidden instruments
4. **Identify BGM needs**: identify which background music tracks need to be produced from plot beats and scene types
5. **Identify SFX needs**: identify which sound effects need to be prepared from scene descriptions
6. **Maintain consistency**: instrument system consistent with era; BGM consistent with emotional mapping

### 7.2 BGM Quantity Reference

| Series Scale | Recommended BGM Count | Notes |
|---------|------------|------|
| Short-form (1-20 episodes) | 4-6 | Main theme, battle, emotional, ending |
| Mid-length (20-50 episodes) | 6-10 | Add character themes, scene themes |
| Long-form (50+ episodes) | 10-15 | More granular scene and emotion themes |

### 7.3 SFX Quantity Reference

| Series Genre | Recommended SFX Count | Notes |
|---------|------------|------|
| Modern urban drama | 8-12 | Primarily environmental sounds |
| Historical/war drama | 12-20 | Rich combat SFX |
| Post-apocalyptic/sci-fi | 15-25 | Many special ability SFX |

### 7.4 Downstream Impact

The Music Direction Card affects:
- **BGM asset cards**: each BGM corresponds to one asset card for actual music generation
- **SFX asset cards**: each SFX corresponds to one asset card for sound effect collection/generation
- **Storyboard design**: music trigger points and emotional beats annotated in storyboards
- **Video generation**: BGM and SFX are automatically matched during video generation

### 7.5 Common Issues and Solutions

**Issue 1: User music choice is vague (e.g. "something nice")**
- Solution: The parent skill provides specific reference works and style descriptions to guide the user to a clear choice

**Issue 2: Instrument system conflicts with era**
- Solution: The sub-skill checks instrument-era consistency; if conflicts exist, annotate in forbiddenInstruments and explain why

**Issue 3: BGM count too many or too few**
- Solution: Reference the quantity table in 7.2; adjust based on series scale; prioritize ensuring main theme and battle/emotional themes

**Issue 4: SFX descriptions not specific enough**
- Solution: Each SFX must provide description (timbre description), duration, and variations

### 7.6 Next Step

After completing music direction, enter the entity filtering phase, or return to the parent skill to continue the script deconstruction process.

## Next Step After Completion

Completion criteria: `MusicDirectionCard` has been created, with music style, instrument system, and emotional mapping confirmed.

Prefer calling `music-asset-extraction` to enter the music branch; can also return to `script-deconstruct` to continue the main creation chain.

Suggested message: `Music direction is complete. You can call music-asset-extraction to generate the soundtrack asset list; the music branch does not currently block the main video pipeline.`

---

# References

## Reference: bgm-sfx-planning-rules

# BGM 与 SFX 规划规则

用于音乐设定 skill 识别 BGM 清单和 SFX 清单，控制数量、功能和下游资产边界。

## BGM 类型

| 类型 | 触发条件 | 说明 |
|------|----------|------|
| main_theme | 整剧核心情感或世界观反复出现 | 可做片头、高潮回归、最终胜利 |
| character_theme | 主角、反派、关键关系高频出现 | 必须有清楚动机，不为每个小角色创建 |
| scene_theme | 特定地点/阵营/组织高频出现 | 用于建立空间记忆 |
| emotional_theme | 离别、牺牲、爱情、和解等高频情绪 | 可做不同强度变体 |
| action | 战斗、追逐、危机处理 | 节奏清楚，可循环或切段 |
| ending | 片尾、悬念、集尾钩子 | 与下一集情绪衔接 |

## BGM 数量参考

| 剧集规模 | 建议 BGM 数量 | 说明 |
|---------|--------------|------|
| 1-20 集短剧 | 4-6 首 | 主题曲、动作、情感、悬疑/片尾 |
| 20-50 集中剧 | 6-10 首 | 增加角色主题、场景主题 |
| 50 集以上长剧 | 10-15 首 | 更细分阵营、人物和情绪 |

## SFX 类别

| 类别 | 内容 | 注意 |
|------|------|------|
| combat | 刀剑、枪械、拳脚、爆炸、冲击 | 需要距离和强度变体 |
| environment | 风、雨、城市、室内、电流、废墟 | 控制循环长度和底噪密度 |
| ui | 系统提示、屏幕、通讯、倒计时 | 避免抢台词 |
| character | 脚步、衣料、呼吸、动作细节 | 角色身份可有差异 |
| special | 超能力、法术、异变、怪物 | 必须和世界观规则一致 |

## SFX 数量参考

| 剧集类型 | 建议 SFX 数量 | 说明 |
|---------|--------------|------|
| 现代都市剧 | 8-12 个 | 环境音和生活动作音为主 |
| 古装/战争剧 | 12-20 个 | 武器、马匹、鼓、盔甲等更丰富 |
| 末世/科幻剧 | 15-25 个 | 特殊能力、设备、怪物、机械音较多 |

## 规划原则

- BGM 是可复用音乐资产，不为每场戏单独生成一首。
- SFX 是动作/环境/能力的声音原子，要考虑强度、距离、持续版和瞬发版。
- 高情绪场景优先使用已有主题变体，而不是新建过多主题。
- 每个 BGM/SFX 都要写清触发条件，方便分镜和视频生成阶段匹配。

## Reference: bpm-key-generation

# BPM and Key Generation

Helper functions for generating specific BPM values and musical keys for Suno/Udio prompt parameters. Do not inline in SKILL.md.

## defaultBPM Generation

Extract or infer default BPM from tempoRange:

```typescript
function generateDefaultBPM(tempoRange: string, emotionalMapping: EmotionalMapping[]): number {
  // Method 1: extract mid-value from tempoRange
  const rangeMatch = tempoRange.match(/(\d+)-(\d+)\s*BPM/);
  if (rangeMatch) {
    const min = parseInt(rangeMatch[1]);
    const max = parseInt(rangeMatch[2]);
    return Math.round((min + max) / 2);
  }
  // Method 2: average from emotionalMapping
  const bpms = emotionalMapping
    .map(m => extractBPMFromTempo(m.tempo))
    .filter(bpm => bpm !== undefined);
  if (bpms.length > 0) {
    return Math.round(bpms.reduce((a, b) => a + b, 0) / bpms.length);
  }
  return 90; // fallback
}

function extractBPMFromTempo(tempo: string): number | undefined {
  const rangeMatch = tempo.match(/(\d+)-(\d+)\s*BPM/);
  if (rangeMatch) return Math.round((parseInt(rangeMatch[1]) + parseInt(rangeMatch[2])) / 2);
  const singleMatch = tempo.match(/(\d+)\s*BPM/);
  if (singleMatch) return parseInt(singleMatch[1]);
  return undefined;
}
```

## defaultKey Generation

```typescript
function generateDefaultKey(keyTendency: string, musicalTradition: string): string {
  if (musicalTradition.includes('Chinese traditional') || musicalTradition.includes('古风')) {
    if (keyTendency.includes('pentatonic')) return 'pentatonic';
  }
  if (keyTendency.includes('minor')) return 'C minor';
  if (keyTendency.includes('major')) return 'C major';
  if (keyTendency.includes('atonal')) return 'atonal';
  if (musicalTradition.includes('Western classical')) return 'C major';
  if (musicalTradition.includes('electronic') || musicalTradition.includes('industrial')) return 'C minor';
  return 'C major';
}
```

## Emotion → Key

```typescript
function inferKeyFromEmotion(emotion: string, defaultKey: string): string {
  if (emotion.includes('sad') || emotion.includes('parting')) return 'C minor';
  if (emotion.includes('tense') || emotion.includes('crisis') || emotion.includes('horror')) return 'atonal';
  if (emotion.includes('joy') || emotion.includes('victory')) return 'C major';
  if (emotion.includes('heroic') || emotion.includes('epic')) return defaultKey;
  return defaultKey;
}
```

## BPM Generation Example Output

```typescript
{
  tonalCharacteristics: {
    keyTendency: "pentatonic primary",
    defaultKey: "pentatonic",
    tempoRange: "40-160 BPM",
    defaultBPM: 100,
    dynamicRange: "ppp to fff"
  },
  emotionalMapping: [
    { emotion: "heroic/epic", bpm: 130, key: "pentatonic", instruments: ["war drums", "strings", "horns", "guzheng"] },
    { emotion: "sad/parting", bpm: 50, key: "C minor", instruments: ["erhu", "guzheng"] },
    { emotion: "tense/crisis", bpm: 160, key: "atonal", instruments: ["pipa", "bass strings", "timpani"] }
  ]
}
```

## Reference: emotion-music-map

# 情绪音乐映射

用于音乐设定卡中的 `emotionalMapping`、BGM 情绪定位和默认 BPM/Key 生成。

## 情绪到音乐处理

| 情绪 | 音乐处理 | 主要乐器 | 节奏/BPM | 调性建议 |
|------|---------|---------|----------|---------|
| 壮烈/史诗 | 大编制管弦加战鼓，层层递进 | 战鼓、弦乐、号角、合唱 | 中速庄重，120-140 BPM | 小调、五声羽调式、D minor |
| 紧张/危机 | 快速拨奏、低频脉冲、不稳定和声 | 琵琶、低音弦乐、定音鼓、脉冲 | 急促，140-180 BPM | 小调、半音化 |
| 悲伤/离别 | 独奏旋律加轻柔铺底 | 二胡、古筝、钢琴、独奏弦乐 | 缓慢，40-60 BPM | 小调、五声商/羽 |
| 温情/兄弟情 | 温暖弦乐与木质音色 | 古筝、笛、弦乐、钢琴 | 中速舒缓，70-90 BPM | 大调、宫调式 |
| 权谋/阴谋 | 低沉拨弦、不协和音程、留白 | 琵琶、低音弦乐、低频Drone | 缓慢阴沉，50-70 BPM | 小调、减和弦色彩 |
| 胜利/喜悦 | 全编制齐奏，明亮节奏 | 全乐器组、鼓、铜管 | 快速激昂，140-160 BPM | 大调、宫调式 |
| 悬疑/未知 | 少旋律，纹理和脉冲先行 | 低频Drone、钢琴单音、反向音 | 低速或无明确节拍，50-90 BPM | 模糊调性 |
| 浪漫/亲密 | 简洁旋律，和声温暖 | 钢琴、吉他、柔弦、轻Pad | 中慢速，65-95 BPM | 大调或小调转大调 |

## BPM 选择规则

- 如果 `tempo` 写了范围，取中位数作为 `bpm`。
- 如果全剧主风格偏动作，可让默认 BPM 靠近高频场景的中位。
- 如果全剧主风格偏情感，可让默认 BPM 靠近主题曲或情感主题。
- 不要所有 BGM 都使用同一个 BPM；至少区分主题、动作、情感、悬疑。

## Key 选择规则

- 中国传统风格优先写调式倾向，例如“五声调式为主”，再给可执行 key。
- 悲伤、危机、阴谋优先小调或不稳定调性。
- 胜利、温情、爱情可使用大调或小调转大调。
- 悬疑可写“模糊调性/低频中心音”，避免旋律过实。

## Reference: instrumentation-vocabulary

# 乐器与音色词汇库

用于音乐设定卡中 `instrumentSystem`、`tonalCharacteristics` 和 BGM/SFX 描述。

## 乐器角色

| 角色 | 常见乐器/音色 | 用途 |
|------|---------------|------|
| 主旋律 | 古筝、二胡、笛、钢琴、独奏弦乐、女声/男声哼唱 | 承载主题和人物情绪 |
| 情感渲染 | 弦乐群、Pad、合唱、低频Drone | 托举情绪、扩大空间感 |
| 节奏推进 | 战鼓、定音鼓、电子鼓、低音脉冲、琵琶拨奏 | 推动动作、紧张和爽点 |
| 空间质感 | 环境音、风声、水声、金属摩擦、城市底噪 | 建立世界观和场景真实感 |
| 标志性动机 | 短笛声、钟声、特殊打击、合成器音色 | 标记角色、能力、组织或地点 |

## 音色描述词

- 温暖：柔弦、木吉他、圆润钢琴、轻Pad。
- 冷峻：低频Drone、金属打击、冷Pad、短促脉冲。
- 古朴：埙、古琴、编钟、木质打击、低动态录音质感。
- 华丽：大编制弦乐、铜管、合唱、竖琴琶音。
- 粗粝：失真吉他、工业噪声、破损广播、压缩鼓。
- 空灵：女声哼唱、长混响笛声、玻璃质感合成器。
- 压迫：低音弦乐、心跳式鼓点、持续低频。

## 乐器一致性检查

- 是否与时代背景冲突。
- 是否与地域文化冲突。
- 是否和用户参考作品的核心音色一致。
- 是否每个主要乐器都有清楚角色。
- 是否为特殊能力、组织、地点建立可复用音色动机。

## 禁用乐器写法

禁用项应写明原因和例外：

```typescript
forbiddenInstruments: [
  {
    instrument: "明亮电子Lead",
    reason: "与东汉末年主风格不符；除非用于超自然能力的异质感提示"
  }
]
```

## Reference: music-style-taxonomy

# 音乐风格类型库

用于音乐设定 skill 根据故事类型、时代背景、空间设定和用户偏好确定全局音乐风格。

## 时代/世界观到音乐传统

| 世界观 | 音乐传统 | 主要乐器 | 可混合元素 | 禁用或谨慎使用 |
|--------|---------|---------|-----------|----------------|
| 中国古代 | 五声调式、中国传统器乐 | 古筝、二胡、琵琶、笛、编钟、战鼓 | 低频弦乐、管弦铺底、合唱 | 电吉他、现代合成器，除非明确风格化 |
| 现代都市 | 流行、轻电子、钢琴弦乐 | 钢琴、吉他、弦乐、轻打击、Pad | Lo-fi、R&B、城市环境音 | 过重史诗鼓、过度民族化 |
| 近未来/科幻 | 电子、氛围、混合管弦 | 合成器、低频脉冲、金属打击、弦乐群 | 人声采样、故障音、空间混响 | 纯传统器乐，除非作为反差 |
| 末世/废土 | 工业、暗黑电子、粗粝打击 | 工业噪声、变形吉他、电子打击、低音弦乐 | 破损广播、机械声、呼吸声 | 明亮甜美流行音色 |
| 西方古代/奇幻 | 管弦、合唱、民谣 | 弦乐、圆号、管风琴、战鼓、竖琴 | 民族鼓、低男声合唱 | 明显东方乐器，除非混搭设定 |
| 悬疑/犯罪 | 极简、低频、脉冲、环境音乐 | 低音弦乐、钢琴单音、脉冲、噪声纹理 | 反向音、心跳、呼吸、金属摩擦 | 旋律过满、情绪过直白 |

## 类型到音乐功能

| 类型 | 主功能 | 主题音乐 | 场景音乐 |
|------|--------|----------|----------|
| 爽文/逆袭 | 强化反转和胜利感 | 短动机、强节奏、可循环 | 爽点前弱化，爽点处进入强拍 |
| 爱情/甜宠 | 托举情绪与亲密感 | 主旋律清晰、温暖和声 | 轻钢琴、吉他、柔弦 |
| 战争/史诗 | 建立规模、牺牲和胜负压力 | 大编制、鼓点、合唱或号角 | 战前低频铺陈，战中节奏推进 |
| 悬疑/惊悚 | 控制信息和不安感 | 少旋律、质感先行 | 低频、脉冲、反向音效 |
| 喜剧 | 服务节奏点和反差 | 轻巧、短句、可停顿 | 留白比铺满更重要 |

## 使用方法

- 先确定世界观允许的乐器边界，再确定类型需要的音乐功能。
- 混搭音乐必须写明主次，例如“古筝主旋律 + 现代弦乐铺底”。
- 禁用乐器不是绝对不能出现，而是出现时必须有叙事理由。

