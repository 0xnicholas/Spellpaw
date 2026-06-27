---
name: music-direction
description: Use when script deconstruction enters the style setting phase, the user has chosen a music style, and a MusicDirectionCard needs to be generated with an instrument system, emotional mapping, and BGM/SFX lists
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

- When determining the relationship between worldview, genre, and music style: read `references/music-style-taxonomy.md`
- When building instrument systems, forbidden instruments, and timbre vocabulary: read `references/instrumentation-vocabulary.md`
- When generating emotional mapping, BPM, Key, and modes: read `references/emotion-music-map.md`
- When identifying BGM/SFX lists, controlling quantity and trigger conditions: read `references/bgm-sfx-planning-rules.md`

`SKILL.md` handles process, fields, and quality gates; the growable music style, instrument, emotion, and sound asset rule libraries are maintained in `references/`.

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

BPM/key generation helper functions are in `references/bpm-key-generation.md`. Read when generating specific BPM values and musical keys for Suno/Udio parameters. The file contains: `generateDefaultBPM`, `generateDefaultKey`, `inferKeyFromEmotion`, and example output.

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

Full MusicDirectionCard example (post-apocalyptic industrial electronic style) at `references/example-music-direction-card.json`.

## VII. Summary

### 7.1 Core Points of the Music Direction Sub-Skill

1. **Understand user music choice**: accurately parse the user's style preferences and reference works
2. **Extract script music cues**: extract music-related information from the script, story core, and worldview
3. **Build a complete instrument system**: based on era and emotional needs, define primary instruments and forbidden instruments
4. **Identify BGM needs**: identify which background music tracks need to be produced from plot beats and scene types
5. **Identify SFX needs**: identify which sound effects need to be prepared from scene descriptions
6. **Maintain consistency**: instrument system consistent with era; BGM consistent with emotional mapping

### 7.2 BGM Quantity Reference

Detailed rules are maintained in `references/bgm-sfx-planning-rules.md`. Only the quick reference table is kept here.

| Series Scale | Recommended BGM Count | Notes |
|---------|------------|------|
| Short-form (1-20 episodes) | 4-6 | Main theme, battle, emotional, ending |
| Mid-length (20-50 episodes) | 6-10 | Add character themes, scene themes |
| Long-form (50+ episodes) | 10-15 | More granular scene and emotion themes |

### 7.3 SFX Quantity Reference

Detailed rules are maintained in `references/bgm-sfx-planning-rules.md`. Only the quick reference table is kept here.

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
