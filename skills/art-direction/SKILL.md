---
name: art-direction
description: Use when script deconstruction enters the style setting phase, the user has chosen an art style, and an ArtDirectionCard needs to be generated with a color system, lighting system, composition principles, and per-scene visual guidance
---

# Art Direction Card — Extraction Detail Refinement (Sub-Skill)

## I. Skill Positioning

### 1.1 Role as a Sub-Skill

The Art Direction Skill is a **sub-skill of the Script Deconstruct Skill**, invoked during **Phase 2: Guided Style Setting** of script deconstruction.

**Invocation Timing**:
- After Phase 1 (automatic extraction of core information) is complete
- After the user confirms assumptions
- Before or after music direction (order is adjustable)

**Invocation Method**:
```typescript
const artDirectionCard = await callSkill('art-direction', {
  fullScript: fullScriptCard,
  storyCore: storyCoreCard,
  worldview: worldviewCard,
  userStyleChoice: {
    primaryStyle: "方案 A：写实史诗风格",
    secondaryStyle: "方案 C：水墨写意风格（局部）",
    referenceImages: ["权力的游戏战争场景", "影的水墨美学"],
    userPreferences: "要粗粝质感，但在情感高潮时加入水墨意境"
  }
});
```

### 1.2 Input Dependencies

The Art Direction Skill depends on the following inputs:

**Required Inputs**:
1. **Full Script Card** (FullScriptCard)
   - Provides the complete script content and episode-scene structure

2. **Story Core Card** (StoryCoreCard)
   - genre → determines visual style direction
   - theme → guides visual expression
   - emotionalCore → determines color and lighting tone

3. **Worldview Card** (WorldviewCard)
   - timeSetting → determines clothing, props, architectural style
   - spaceSetting → determines scene visual characteristics
   - worldRules → determines VFX and visual rules

4. **User Style Choice** (userStyleChoice)
   - primaryStyle: primary style direction
   - secondaryStyle: secondary style direction (optional)
   - referenceImages: list of reference images
   - userPreferences: user's specific preference description

**Optional Inputs**:
- **Plot Pacing Card** (PlotRhythmCard)
   - Used to understand visual needs for different plot phases

### 1.3 Output Deliverable

**Output**:
- **Art Direction Card** (ArtDirectionCard)
  - Contains the complete visual style definition
  - Provides visual guidance for downstream character assets, scene assets, and prop assets

---

## Reference Routing

Based on the current task, only read the necessary reference; do not copy reference content into the card:

- User style choice, genre-to-visual-system mapping: read `references/visual-style-taxonomy.md`
- When user mentions directors, works, or visual schools: read `references/director-visual-style-vocabulary.md`
- When color, lighting, composition, or material vocabulary is needed: read `references/color-light-composition-vocabulary.md`
- When generating concept art and collecting user feedback: read `references/concept-validation-workflow.md`

`SKILL.md` handles process, fields, and quality gates; the growable style library and vocabulary library are maintained in `references/`.

---

## II. Field Definitions (Updated)

```typescript
interface ArtDirectionCard extends BaseCard {
  type: 'art_direction';

  content: {
    // === Overall Visual Style ===
    overallStyle: {
      styleName: string;  // Style name (e.g. realistic epic, romantic period, ink-wash freehand)
      styleDescription: string;  // Style description (1-2 sentences)
      referenceWorks: string[];  // Reference works (films, paintings, photography, etc.)
      keyVisualPrinciples: string[];  // Core visual principles (3-5 items)
    };

    // === Color System ===
    colorSystem: {
      primaryPalette: {
        colors: string[];  // Primary colors (3-5 colors, HEX or color names)
        usage: string;  // Usage scenarios
        emotionalTone: string;  // Emotional tone
      };
      secondaryPalette?: {
        colors: string[];  // Secondary colors
        usage: string;
        emotionalTone: string;
      };
      colorContrast: string;  // Color contrast (high contrast / medium contrast / low contrast)
      saturation: string;  // Saturation (high saturation / medium saturation / low saturation / desaturated)
      colorProgression?: Array<{
        episodeRange: { start: number; end: number };
        paletteShift: string;  // Color shift description
        reason: string;  // Reason for the shift
      }>;
    };

    // === Lighting System ===
    lightingSystem: {
      dominantLighting: string;  // Dominant lighting type (natural / artificial / mixed)
      lightQuality: string;  // Light quality (hard / soft / diffused)
      shadowStyle: string;  // Shadow style (deep / soft / minimal)
      keyLightingScenarios: Array<{
        scenario: string;  // Scene type (e.g. battle scene, emotional scene, interior scene)
        lightingDescription: string;  // Lighting description
        mood: string;  // Mood created
      }>;
    };

    // === Composition Principles ===
    compositionPrinciples: {
      framingStyle: string;  // Framing style (symmetrical / asymmetrical / golden ratio / center composition)
      cameraMovement: string;  // Camera movement (static / dynamic / mixed)
      depthOfField: string;  // Depth of field (shallow / deep)
      visualHierarchy: string;  // Visual hierarchy (how to guide the viewer's eye)
      
      // === Scene Type Default Composition Plans (new, for scene asset extraction) ===
      sceneTypeDefaults: Array<{
        sceneType: string;  // Scene type (e.g. core stronghold, battle scene, emotional scene, survivor settlement)
        composition: string;  // Recommended composition (e.g. wide panoramic, low-angle upward shot, mid-shot + ambient light)
        cameraAngle: string;  // Recommended camera angle (e.g. low angle slight upward, eye level, high angle downward)
        reason: string;  // Reason for recommendation
      }>;
      
      // === Scene Scale Visual Treatment Suggestions (new) ===
      sceneScaleGuidance: {
        large: string;  // Visual treatment suggestions for large-scale scenes (e.g. underwater base, city ruins)
        medium: string;  // Visual treatment suggestions for medium-scale scenes (e.g. arena, floating island)
        small: string;  // Visual treatment suggestions for small-scale scenes (e.g. office, room)
      };
      
      // === Exterior Scene Default Settings (new) ===
      exteriorDefaults: {
        defaultWeather: string;  // Default weather (e.g. mostly overcast, mostly sunny, variable)
        defaultTimeOfDay: string;  // Default time of day (e.g. mostly daytime, mostly nighttime, mixed)
        weatherRationale: string;  // Reason for weather choice (e.g. post-apocalyptic persistent rain, creates oppressive feel)
      };
    };

    // === Texture & Material ===
    textureAndMaterial: {
      dominantTextures: string[];  // Dominant textures (rough / smooth / worn / refined)
      materialPalette: string[];  // Material palette (wood / metal / fabric / stone, etc.)
      weatheringLevel: string;  // Weathering level (brand new / lightly worn / heavily worn / ruins)
    };

    // === Visual Rhythm ===
    visualRhythm: {
      pacing: string;  // Visual rhythm (rapid cuts / slow push / variable rhythm)
      visualContrast: string;  // Visual contrast (strong contrast / soft transitions)
      keyVisualBeats: Array<{
        episode: number;
        scene?: string;
        visualDescription: string;  // Visual description
        purpose: string;  // Purpose (e.g. establish atmosphere, drive emotion, mark turning point)
      }>;
    };

    // === Special Visual Elements ===
    specialVisualElements?: {
      vfxStyle?: string;  // VFX style (realistic / stylized / minimal)
      transitionStyle?: string;  // Transition style (hard cut / fade in-out / creative transitions)
      titleCardStyle?: string;  // Title card and credits style
      graphicElements?: string[];  // Graphic elements (subtitles, UI, diagrams, etc.)
    };

    // === Per-Scene Visual Guidance ===
    sceneSpecificGuidance: Array<{
      sceneType: string;  // Scene type (e.g. battle scene, emotional scene, daily scene)
      visualApproach: string;  // Visual treatment approach
      colorPalette: string;  // Color scheme
      lighting: string;  // Lighting scheme
      composition: string;  // Composition scheme
      reference?: string;  // Reference work
    }>;

    // === Linked Cards ===
    linkedCards: {
      sourceScriptCardId: string;  // Source: Full Script Card
      storyCoreCardId: string;  // Dependency: Story Core Card
      worldviewCardId: string;  // Dependency: Worldview Card
      characterCardIds?: string[];  // Impact: Character Setting Cards
      sceneCardIds?: string[];  // Impact: Scene Setting Cards
    };
  };
}
```

---

## III. Art Direction Extraction Process

### 3.1 Preliminary Steps (Completed by Parent Skill)

Before invoking the Art Direction sub-skill, the parent skill (Script Deconstruct Skill) has already completed:

**Step 1: Analyze Script Style Characteristics**

The parent skill analyzes the script's visual style tendencies based on the story core and worldview:

```
Analysis dimensions:
• Era → determine visual era feel
• Emotional tone → determine color and lighting direction
• Core conflict → determine visual contrast
• Story genre → determine overall style direction
```

**Step 2: Present Mainstream Style References**

The parent skill provides 3-4 style option groups, each containing:
- 2-3 reference images (film stills, concept art, paintings)
- Style keywords (3-5)
- One-sentence description

**Step 3: User Selection and Refinement**

The user selects a style direction and can:
- Choose a single style
- Mix styles
- Provide reference works
- Request more examples

**Step 4: Generate Concept Art for Validation**

After the user selects a style direction, generate 2-3 concept images to validate the style effect.

**Image Generation Model Configuration**:

Priority order:
1. **gpt-image2** (default first choice)
   - Strengths: strong comprehension, precise style control, good realism
   - Suitable for: realistic style, modern urban, character scenes
   
2. **nano-banana** (fallback 1)
   - Strengths: fast, low cost
   - Suitable for: quick previews, concept sketches
   
3. **seedream** (fallback 2)
   - Strengths: diverse artistic styles
   - Suitable for: stylized scenes, artistic expression
   
4. **midjourney** (fallback 3)
   - Strengths: beautiful imagery, rich detail
   - Suitable for: polished promotional images, key scene concept art

**Prompt Specifications**:

Adjust prompt format for different models:

**gpt-image2 prompt format** (recommended, Chinese-friendly):
```
[场景描述]，[风格关键词]，[视觉细节]，[色彩基调]，[光影描述]，[构图说明]，[参考风格]

示例：
海底豪华酒店套房内景，现代写实主义风格。一个25-30岁的亚洲男性半躺在深棕色真皮沙发上，手持啤酒，穿着灰色休闲卫衣，表情惬意放松。背景是巨大的弧形落地观景窗，窗外是深蓝色海水，有2-3条热带鱼游过。室内暖黄色吊灯照明（3200K色温），现代简约家具，木质茶几，干净整洁。电影摄影质感，自然柔和光影，浅景深，高细节纹理。色调：深蓝海水+暖黄室内灯光+棕色家具。16:9横版构图，电影级画面，类似韩国电影《釜山行》《寄生虫》的写实摄影风格。
```

**midjourney prompt format** (English, requires parameters):
```
[Scene description], [Style keywords], [Visual details], [Color palette], [Lighting], [Composition]. [Technical parameters]

示例：
Cinematic realistic underwater hotel suite interior, Korean cinema style. A young Asian man in his late 20s relaxing on a brown leather sofa, holding a beer bottle, wearing casual grey hoodie. Massive curved floor-to-ceiling glass window showing deep blue ocean water with a few tropical fish swimming outside. Warm yellow ceiling lights (3200K), modern minimalist furniture, wooden coffee table, clean white walls. Photorealistic, film photography aesthetic, natural soft lighting, shallow depth of field, high detail texture on leather and glass. Color palette: deep blue ocean + warm yellow interior lighting + brown furniture. 16:9 aspect ratio, cinematic composition, like a scene from Train to Busan or Parasite movie --ar 16:9 --style raw --v 6
```

**Concept Art Generation Process**:

1. Based on the user's chosen style, determine the scene types to generate
2. Select the appropriate generation model (default gpt-image2)
3. Write prompts according to the model format
4. Generate 2-3 concept images:
   - Image 1: primary scene (e.g. underwater base)
   - Image 2: contrasting scene (e.g. post-apocalyptic ruins)
   - Image 3: character close-up (optional)
5. Present to user to confirm style direction
6. Adjust or regenerate based on user feedback

**Step 5: Invoke Art Direction Sub-Skill**

After user confirmation, the parent skill invokes the art direction sub-skill, passing in the user's style choice

### 3.2 Core Tasks of the Sub-Skill

After receiving the user's style choice, the art direction sub-skill needs to:

1. **Parse the user's style choice**: understand the user's chosen style direction and preferences
2. **Extract script visual cues**: extract all visually relevant descriptions from the script
3. **Build a complete visual system**: translate the style choice into detailed visual specifications
4. **Generate per-scene visual guidance**: provide specific visual plans for different scene types
5. **Output the Art Direction Card**: generate the complete art direction card

### 3.3 Detailed Extraction Process

#### Step 1: Parse User Style Choice

**Input**:
```typescript
userStyleChoice: {
  primaryStyle: "方案 A：写实史诗风格",
  secondaryStyle: "方案 C：水墨写意风格（局部）",
  referenceImages: ["权力的游戏战争场景", "影的水墨美学"],
  userPreferences: "要粗粝质感，但在情感高潮时加入水墨意境"
}
```

**Parsing Tasks**:
1. Extract primary style keywords: realistic, epic, gritty texture
2. Extract secondary style keywords: ink-wash, freehand, artistic conception
3. Identify style application scenarios: battle scenes use realistic epic; emotional climax uses ink-wash freehand
4. Extract visual characteristics of reference works:
   - Game of Thrones: desaturated, high contrast, gritty texture, earthy yellow-iron gray tones
   - Shadow: ink-wash aesthetics, negative space, restraint, black-white-gray tones

**Output**:
```typescript
{
  styleName: "写实史诗 + 水墨写意（混合风格）",
  styleDescription: "以写实史诗为主导，战争场景强调粗粝质感和强对比，情感高潮时融入水墨写意的克制美学",
  referenceWorks: ["权力的游戏", "影", "角斗士"],
  keyVisualPrinciples: [
    "不美化战争，展现残酷真实",
    "强对比光影，营造戏剧张力",
    "粗粝质感，避免过度精致",
    "情感高潮时用水墨意境，克制而深远",
    "色彩克制，以土黄、铁灰、黑白为主"
  ]
}
```

#### Step 2: Extract Script Visual Cues

**Extract from the full script**:

**Visual cues in scene descriptions**:
- Scan all scene descriptions
- Extract color keywords (e.g. blood red, gray-dark, golden yellow)
- Extract lighting keywords (e.g. dim, bright, firelight)
- Extract texture keywords (e.g. dilapidated, brand new, rusted)
- Extract atmosphere keywords (e.g. oppressive, warm, tense)

**Example**:
```
Scene description:
"昏暗的地下室，墙壁斑驳，铁锈味弥漫，唯一的光源是一盏摇曳的油灯。"

Extracted:
- Lighting: dim, flickering oil lamp → low illumination, unstable light source
- Texture: peeling walls, rust → dilapidated, worn
- Color: rust → dark red, brown
- Atmosphere: dim, smell of rust → oppressive, dangerous
```

**Extract from Story Core Card**:
- emotionalCore.dominantEmotion → determines primary color tone
  - Tragic → desaturated, cool tones
  - Joyful → high saturation, warm tones
  - Oppressive → desaturated, dark tones
- theme.coreTheme → determines visual metaphor
  - Loyalty → red, gold (traditional colors)
  - Betrayal → black, purple (dark colors)
  - Hope → blue, white (bright colors)

**Extract from Worldview Card**:
- timeSetting.era → determines era visual characteristics
  - Late Eastern Han → wooden architecture, earthy yellow tones, coarse fabric clothing
  - Modern urban → glass curtain walls, cool tones, modern clothing
  - Post-apocalyptic wasteland → ruins, rust, gray-dark tones
- worldRules.physicalLaws → determines VFX style
  - Real world → realistic VFX
  - Magic world → stylized VFX
  - Sci-fi world → tech-feel VFX

#### Step 3: Build Color System

**Primary Palette Construction**:

**Rule 1: Choose primary colors based on emotional tone**

| Emotional Tone | Primary Color Direction | Example Colors |
|---------|----------|---------|
| Tragic, Epic | Desaturated cool-warm mix | Earthy yellow, iron gray, dark red |
| Romantic, Warm | Medium-high saturation warm | Pink, golden yellow, orange |
| Oppressive, Horror | Desaturated cool | Gray-blue, dark green, black |
| Joyful, Energetic | High saturation warm | Bright yellow, orange-red, sky blue |
| Mysterious, Suspense | Desaturated cool | Deep blue, purple, black |

**Rule 2: Adjust colors based on era**

| Era | Color Adjustment | Reason |
|---------|---------|------|
| Ancient | Leaning toward earthy, natural colors | Dye technology limitations |
| Modern | Full color spectrum available | Industrial dyes developed |
| Future | Leaning toward cool, metallic colors | Tech feel |
| Post-apocalyptic | Desaturated, gray-dark | Environmental degradation |

**Rule 3: Determine colors based on user style choice**

User choice: realistic epic style
- Reference work: Game of Thrones
- Color characteristics: desaturated, earthy yellow-iron gray, high contrast

**Output**:
```typescript
{
  primaryPalette: {
    colors: ["#8B7355", "#5C5C5C", "#A0522D", "#2F4F4F", "#8B4513"],
    // Earthy yellow, iron gray, sienna, dark gray-green, brown
    usage: "战争场景、日常场景、权谋场景",
    emotionalTone: "粗粝、压抑、史诗感"
  },
  secondaryPalette: {
    colors: ["#000000", "#FFFFFF", "#696969"],
    // Black, white, dark gray
    usage: "情感高潮场景，使用水墨美学",
    emotionalTone: "克制、深远、意境"
  },
  colorContrast: "高对比",
  saturation: "低饱和",
  colorProgression: [
    {
      episodeRange: { start: 1, end: 30 },
      paletteShift: "主色调为主，色彩压抑",
      reason: "前期剧情压抑，战争频繁"
    },
    {
      episodeRange: { start: 31, end: 52 },
      paletteShift: "逐渐加入次要色调，黑白对比增强",
      reason: "后期情感升华，水墨意境增强"
    }
  ]
}
```

#### Step 4: Build Lighting System

**Lighting Type Identification**:

**Extract lighting info from scene descriptions**:
- Scan all scene descriptions
- Identify light source types: natural light (sunlight, moonlight), artificial light (firelight, lamplight)
- Identify light intensity: bright, dim, faint
- Identify light direction: top light, side light, backlight

**Determine lighting style based on style choice**:

User choice: realistic epic style
- Reference works: Game of Thrones, Gladiator
- Lighting characteristics: high contrast, hard light, deep shadows

**Output**:
```typescript
{
  lightingSystem: {
    dominantLighting: "自然光为主，人工光为辅",
    lightQuality: "硬光，强对比",
    shadowStyle: "深重阴影，营造戏剧张力",
    keyLightingScenarios: [
      {
        scenario: "战争场景",
        lightingDescription: "强烈的侧光或逆光，制造剪影效果，阴影深重",
        mood: "悲壮、史诗感"
      },
      {
        scenario: "室内密谋场景",
        lightingDescription: "昏暗的烛光或油灯，光源不稳定，阴影摇曳",
        mood: "紧张、阴谋"
      },
      {
        scenario: "情感高潮场景",
        lightingDescription: "柔和的散射光，减少阴影，营造水墨意境",
        mood: "克制、深远"
      },
      {
        scenario: "日常场景",
        lightingDescription: "自然光，中等对比，真实感",
        mood: "平静、日常"
      }
    ]
  }
}
```

#### Step 5: Build Composition Principles

**Determine composition style based on style choice**:

User choice: realistic epic style
- Reference works: Game of Thrones, Gladiator
- Composition characteristics: symmetrical composition (power scenes), asymmetrical composition (battle scenes), deep depth of field

**Output**:
```typescript
{
  compositionPrinciples: {
    framingStyle: "对称构图用于权力场景，不对称构图用于战争和冲突场景",
    cameraMovement: "战争场景动态跟随，情感戏静态构图",
    depthOfField: "深景深为主，展现环境和氛围",
    visualHierarchy: "通过光影和位置引导视线，主角通常在光亮处或构图中心"
  }
}
```

#### Step 5.5: Generate Scene Type Default Composition Plans (New)

**Purpose**: Provide composition guidance for scene asset extraction, reducing user decision burden during the scene asset extraction phase.

**Generation Rules**:

Based on scene types appearing in the script, generate default composition plans for each scene type:

| Scene Type Identification Rule | Recommended Composition | Recommended Camera Angle | Reason |
|---------------|---------|---------|------|
| Core stronghold/base (roleInStory contains "核心"/"基地") | Wide panoramic | Low angle slight upward | Show spatial scale and atmosphere, reinforce stronghold importance |
| Battle/climax scene (narrativeFunction contains "战斗"/"决战") | Low angle upward shot | Low angle | Reinforce sense of pressure and drama |
| Emotional scene (emotionalTone contains "温暖"/"温馨"/"情感") | Mid-shot + ambient light | Eye level | Highlight emotional atmosphere, avoid visual distraction |
| Survivor settlement/daily scene (sceneType is exterior and contains "聚居"/"日常") | Eye-level panoramic | Eye level | Show environmental scale and humanistic feel |
| Power/oppression scene (emotionalTone contains "压抑"/"恐惧") | High angle downward or low angle upward | Based on power relationship | Reinforce power asymmetry |

**Output Example**:
```typescript
{
  sceneTypeDefaults: [
    {
      sceneType: "核心据点",
      composition: "广角全景 + 景深",
      cameraAngle: "低角度微仰",
      reason: "展示空间规模和氛围，强化据点的重要性和安全感"
    },
    {
      sceneType: "战斗/高潮场景",
      composition: "低角度仰拍",
      cameraAngle: "低角度",
      reason: "强化压迫感和戏剧性，突出冲突的激烈程度"
    },
    {
      sceneType: "情感场景",
      composition: "中景 + 环境光",
      cameraAngle: "平视",
      reason: "突出情感氛围，不做视觉干扰，让观众专注于角色情感"
    }
  ],
  
  sceneScaleGuidance: {
    large: "使用广角镜头展示空间纵深，低角度微仰强化规模感，注意前中后景的层次关系",
    medium: "平视或微俯展示空间全貌，保持人物与环境的平衡，避免过度压缩空间",
    small: "中近景为主，利用景深突出重点区域，用光影而非空间营造氛围"
  },
  
  exteriorDefaults: {
    defaultWeather: "阴天为主",
    defaultTimeOfDay: "日间为主",
    weatherRationale: "基于世界观设定（末世持续阴雨天气），阴天散射光营造压抑感，偶尔晴天形成反差"
  }
}
```

**Generation Logic**:
1. Scan scene setting cards, identify scene type keywords
2. Match the table rules above, generate corresponding composition plans
3. Based on worldview weather/time settings, generate exteriorDefaults
4. If worldview does not specify weather, infer from emotional tone (oppressive → overcast, joyful → sunny)

---

#### Step 6: Build Texture & Material

**Extract from worldview and style choice**:

Worldview: Late Eastern Han
- Materials: wood, fabric, ironware, earth-stone
- Textures: rough, worn, plain

User choice: realistic epic style, gritty texture
- Avoid over-refinement
- Emphasize usage marks and wear

**Output**:
```typescript
{
  textureAndMaterial: {
    dominantTextures: ["粗糙", "磨损", "朴素", "真实"],
    materialPalette: ["木质", "粗布", "铁器", "土石", "皮革"],
    weatheringLevel: "中度到重度磨损，避免崭新感"
  }
}
```

#### Step 7: Build Visual Rhythm

**Extract from Plot Pacing Card**:
- Identify emotional climax points
- Identify plot turning points
- Design visual treatments for key beats

**Output**:
```typescript
{
  visualRhythm: {
    pacing: "战争场景快速切换，情感戏缓慢推进",
    visualContrast: "战争与和平的强对比，明暗交替",
    keyVisualBeats: [
      {
        episode: 1,
        scene: "1-1",
        visualDescription: "开场大战，强烈的侧光，剪影效果，快速切换",
        purpose: "建立史诗感，吸引观众"
      },
      {
        episode: 15,
        scene: "15-20",
        visualDescription: "桃园结义，对称构图，柔和光照，水墨意境",
        purpose: "情感高潮，标记兄弟情谊"
      },
      {
        episode: 48,
        scene: "48-30",
        visualDescription: "最终决战，极强对比，逆光剪影，慢动作",
        purpose: "全剧高潮，视觉震撼"
      }
    ]
  }
}
```

#### Step 8: Generate Per-Scene Visual Guidance

**Identify scene types**:
- Count scene types from the episode-scene table
- Create visual plans for each scene type

**Output**:
```typescript
{
  sceneSpecificGuidance: [
    {
      sceneType: "战争场景",
      visualApproach: "强对比、快速切换、动态镜头、剪影效果",
      colorPalette: "土黄、铁灰、暗红（血色）",
      lighting: "强烈侧光或逆光，深重阴影",
      composition: "不对称构图，制造混乱感和紧张感",
      reference: "权力的游戏 - 私生子之战"
    },
    {
      sceneType: "权谋场景（宫殿、会议）",
      visualApproach: "对称构图、静态镜头、强调空间感",
      colorPalette: "金黄、深红、黑色",
      lighting: "顶光或侧光，制造权力感",
      composition: "对称构图，主角居中或高位",
      reference: "权力的游戏 - 铁王座场景"
    },
    {
      sceneType: "情感场景（结义、离别）",
      visualApproach: "水墨意境、静态构图、留白",
      colorPalette: "黑白灰为主",
      lighting: "柔和散射光，减少阴影",
      composition: "简洁构图，强调人物情感",
      reference: "影 - 水墨美学场景"
    },
    {
      sceneType: "日常场景",
      visualApproach: "写实、自然、中等对比",
      colorPalette: "主色调",
      lighting: "自然光",
      composition: "常规构图",
      reference: "无特殊参考"
    }
  ]
}
```

---

## IV. Quality Check Checklist

### 4.1 Required Field Completeness Check

**Overall Visual Style**:
- [ ] styleName: is the style name concise and clear?
- [ ] styleDescription: is the style description clear (1-2 sentences)?
- [ ] referenceWorks: does it include 2-5 reference works?
- [ ] keyVisualPrinciples: does it include 3-5 core visual principles?

**Color System**:
- [ ] primaryPalette.colors: does it include 3-5 primary colors?
- [ ] primaryPalette.usage: are usage scenarios clear?
- [ ] primaryPalette.emotionalTone: is the emotional tone accurate?
- [ ] colorContrast: is the color contrast clear?
- [ ] saturation: is the saturation clear?

**Lighting System**:
- [ ] dominantLighting: is the dominant lighting type clear?
- [ ] lightQuality: is the light quality clear?
- [ ] shadowStyle: is the shadow style clear?
- [ ] keyLightingScenarios: does it include 3-5 key scenario lighting plans?

**Composition Principles**:
- [ ] framingStyle: is the framing style clear?
- [ ] cameraMovement: is the camera movement clear?
- [ ] depthOfField: is the depth of field clear?
- [ ] visualHierarchy: is the visual hierarchy clear?

**Texture & Material**:
- [ ] dominantTextures: does it include 3-5 dominant textures?
- [ ] materialPalette: does it include 3-5 materials?
- [ ] weatheringLevel: is the weathering level clear?

**Visual Rhythm**:
- [ ] pacing: is the visual rhythm clear?
- [ ] visualContrast: is the visual contrast clear?
- [ ] keyVisualBeats: does it include 3-5 key visual beats?

**Per-Scene Visual Guidance**:
- [ ] sceneSpecificGuidance: does it include visual plans for 3-5 scene types?
- [ ] Is the visual plan for each scene type complete (color, lighting, composition)?

### 4.2 Logical Consistency Check

**Consistency with User Style Choice**:
- [ ] Does the overall style match the user's chosen primary style?
- [ ] Is the secondary style reflected in appropriate scenes?
- [ ] Are the visual characteristics of reference works correctly extracted and applied?
- [ ] Are the user's specific preferences reflected?

**Consistency with Story Core Card**:
- [ ] Is the color system consistent with the emotional core?
- [ ] Is the visual style consistent with the story genre?
- [ ] Are visual metaphors consistent with the theme?

**Consistency with Worldview Card**:
- [ ] Are colors and materials consistent with the era?
- [ ] Are lighting and textures consistent with world rules?
- [ ] Are visual elements consistent with social structure?

**Internal Consistency**:
- [ ] Are the color system and lighting system coordinated?
- [ ] Are composition principles and visual rhythm coordinated?
- [ ] Is per-scene visual guidance consistent with the overall style?

### 4.3 Actionability Check

**Color System Actionability**:
- [ ] Do colors have clear HEX values or color names?
- [ ] Are color usage scenarios clear?
- [ ] Do color progressions have clear time markers?

**Lighting System Actionability**:
- [ ] Are lighting plans specific and actionable?
- [ ] Are lighting differences between scenes clear?
- [ ] Do lighting plans consider actual filming/production feasibility?

**Composition Principles Actionability**:
- [ ] Are composition rules clear and actionable?
- [ ] Is camera movement specific?
- [ ] Does visual hierarchy have a clear guiding method?

**Per-Scene Visual Guidance Actionability**:
- [ ] Are visual plans for each scene type specific and actionable?
- [ ] Are sufficient reference works provided?
- [ ] Is actual production difficulty and cost considered?

---

## V. Agent Talking Points

Key interaction nodes (detailed scripts omitted):
- **Receiving style choice**: confirm user selection, inform that script visual cues are being analyzed
- **Progress feedback**: present check results in order: color → lighting → composition → texture → rhythm → per-scene
- **Presenting key decisions**: list core choices for color system, lighting system, and visual rhythm item by item
- **User adjustments**: update cards based on feedback; re-present affected sections
- **Completion confirmation**: list downstream impacts (character/scene/prop assets, storyboards, post-production) and guide next steps

---

## VI. Complete Extraction Example

For a complete ArtDirectionCard output example, see `references/example-art-direction-card.json` (Three Kingdoms realistic epic + ink-wash freehand mixed style case study).

---

## VII. Summary

### 7.1 Core Points of the Art Direction Sub-Skill

1. **Understand user style choice**: accurately parse the user's style preferences and reference works
2. **Extract script visual cues**: extract all visually relevant information from the script, story core, and worldview
3. **Build a complete visual system**: five major systems — color, lighting, composition, texture, rhythm
4. **Per-scene visual guidance**: provide specific, actionable visual plans for different scene types
5. **Maintain consistency**: stay aligned with user choice, story core, and worldview

### 7.2 Collaboration with Parent Skill

**Parent Skill is responsible for**:
- Analyzing script style characteristics
- Presenting style references
- Guiding user selection
- Generating concept art for validation
- Invoking the art direction sub-skill

**Sub-Skill is responsible for**:
- Receiving user style choice
- Extracting script visual cues
- Building the complete visual system
- Generating the Art Direction Card

### 7.3 Downstream Impact

The Art Direction Card affects:
- **Character assets**: clothing colors, textures, weathering level, visual style
- **Scene assets**: environmental tones, lighting plans, material choices, atmosphere creation
- **Prop assets**: prop colors, textures, newness/wear, visual details
- **Storyboard design**: composition principles, camera movement, visual rhythm
- **Post-production**: color grading plans, VFX style, transition methods

### 7.4 Common Issues and Solutions

**Issue 1: User style choice is vague**
- Solution: The parent skill should provide more specific reference images to guide the user to a clear choice

**Issue 2: Style choice conflicts with script content**
- Solution: The sub-skill should check consistency before generating the card; if conflicts exist, feedback to the parent skill

**Issue 3: Color system is too complex**
- Solution: Control primary colors to 3-5, secondary colors to 2-3; avoid over-complexity

**Issue 4: Per-scene visual guidance is not specific enough**
- Solution: Each scene type must provide specific plans across three dimensions: color, lighting, composition

### 7.5 Next Step

After completing art direction, proceed to the music direction sub-skill, or return to the parent skill to continue the script deconstruction process.

---

## VIII. Setting Concept Art Generation (Phase 2 Deliverable)

### 8.1 Positioning of Concept Art

Art Direction Card = Art Bible (visual guide) + Setting Concept Art (conceptArt, approximately 5 images). The sole purpose of concept art is to **let the user verify whether the Art Bible's written rules are accurate**; it is not used as a direct reference for subsequent production.

### 8.2 Concept Art Composition (5 Images)

| Number | Type | Validation Target |
|------|------|---------|
| Image 1 | Worldview atmosphere image | Overall tone, atmosphere, era feel |
| Image 2 | Core scene image | Architectural style, lighting, materials |
| Image 3 | Protagonist design image | Clothing style, texture, color |
| Image 4 | Key supporting character design image | Visual differentiation between characters |
| Image 5 | Key emotional scene image | Visual treatment of special scenes |

### 8.3 Generation Process

1. User confirms Art Bible → 2. Extract corresponding rules from Art Bible to generate 5 concept art prompts → 3. Present images and collect feedback → 4. **Adjust Art Bible based on feedback (not just regenerate images)** → 5. Confirm completion

**Key Principle**: Concept art does not meet expectations → Art Bible rules need to be corrected.

### 8.4 Quality Check

- [ ] Image 1: Overall tone and atmosphere match the story's emotional foundation
- [ ] Image 2: Core scene's architectural style, lighting, and materials are correct
- [ ] Image 3: Protagonist's clothing style and texture match the Art Bible
- [ ] Image 4: Visual differentiation between supporting character and protagonist is reasonable
- [ ] Image 5: Special scene's visual treatment achieves the expected effect

---

## IX. Complete Workflow Summary

### 9.1 Complete Art Direction Workflow

```
Phase 1: User Style Selection (completed by parent skill)
├─ Present preset reference library
├─ Guide user to express preferences
├─ Generate validation concept art
└─ Confirm style choice

Phase 2: Generate Art Bible (completed by sub-skill)
├─ Parse user style choice
├─ Extract script visual cues
├─ Build color, lighting, composition, texture, and rhythm systems
├─ Generate per-scene visual guidance
└─ Output Art Bible

Phase 3: Generate Setting Concept Art (completed by sub-skill)
├─ User confirms Art Bible
├─ Generate 5 concept images (worldview / core scene / protagonist / supporting character / key emotional scene)
├─ Collect user feedback
├─ Adjust Art Bible based on feedback and regenerate
└─ Confirm and save

Phase 4: Output Complete Art Direction Card
├─ Art Bible (visual guide)
└─ Setting Concept Art (5 images, confirmed)
```

### 9.2 Relationship Between the Two Deliverables

**Art Bible (text)**:
- Detailed visual rules and constraints
- Structured visual system
- The basis for all subsequent visual decisions (asset production, storyboarding, video generation all directly use the Art Bible)

**Setting Concept Art (images)**:
- Visual presentation of the Art Bible, used only for user confirmation
- Concept art does not match expectations → indicates the Art Bible needs adjustment
- Once concept art is confirmed, its mission is complete; subsequent production does not depend on concept art but on the Art Bible

**Collaboration between the two**:
- Art Bible defines rules → Concept art verifies whether the rules are accurate
- Concept art feedback reveals problems → Art Bible adjusts rules
- When both are finally aligned → Forms the complete Art Direction Card

---

## X. Reference / Vocabulary Maintenance

The genre style library, director visual vocabulary, and color/lighting/composition references originally carried in this section have been externalized to the `references/` directory to avoid an overly long main skill file and to facilitate continuous expansion.

Current read paths:

- `references/visual-style-taxonomy.md`
- `references/director-visual-style-vocabulary.md`
- `references/color-light-composition-vocabulary.md`
- `references/concept-validation-workflow.md`

Update Principles:

- When adding new genres, schools, director styles, or color/lighting vocabulary, prioritize updating the corresponding reference file.
- The main `SKILL.md` only updates routing, fields, or process; do not continue stacking large tables.
- Reference files do not need source attribution; external materials should be translated into the project's own rules and vocabulary.

## Generated File Naming Convention

Effect images in the Art Direction Card must save a `filename`, format:

```text
美术设定-概念图-{名字}-v{版本号}
```

Example: `美术设定-概念图-末世海底基地-v001.png`.

## Next Step After Completion

Completion criteria: `ArtDirectionCard` has been created, with the necessary Art Bible fields and concept art confirmation results saved.

Prefer returning to `script-deconstruct` to continue the creation-zone workflow; if script deconstruction is already complete, can proceed to `character-asset-extraction`, `scene-asset-extraction`, or `prop-asset-extraction`.

Suggested message: `Art direction is complete. I recommend returning to script-deconstruct to summarize creation-zone results, or starting asset production for the current episodes/scenes.`
