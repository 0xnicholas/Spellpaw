---
id: art-direction
name: art-direction
description: Use to define the overall visual art direction for a project. Reads the current canvas via get_canvas and produces storyline + moodboard + art cards with palette, lighting, and composition guidance. Drives add_card (type=storyline/moodboard/art).
slashCommand: art-direction
examples: []
parameters: {}
required: []
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


---

# References

## Reference: color-light-composition-vocabulary

# 色彩光影构图词汇库

用于美术设定卡中 `colorSystem`、`lightingSystem`、`compositionPrinciples`、`textureAndMaterial` 字段的词汇选择。

## 情感到色彩

| 情感 | 推荐方向 | 可选方案 | 注意 |
|------|---------|---------|------|
| 悲壮/史诗 | 低饱和冷暖混合，土黄、铁灰、暗红 | 文化主题色，如红金、水墨黑白 | 避免高饱和纯色 |
| 浪漫/温馨 | 中高饱和暖色，粉、金、橙 | 清新马卡龙 | 需要暗部平衡，避免甜腻 |
| 压抑/恐怖 | 去饱和冷色，灰蓝、暗绿 | 黑色加单一强调色 | 去饱和过度会灰平 |
| 欢乐/活力 | 明黄、橙红、天蓝等明快色 | 胶片暖调 | 控制高光不过曝 |
| 神秘/悬疑 | 深蓝、紫、青灰 | 黑加金色点缀 | 保持线索可见 |
| 冷静/科技 | 冷蓝、灰、白，加少量暖色 | 金属银、屏幕青 | 全冷色会失去人味 |
| 温情/日常 | 自然色加轻微暖调 | 淡雅留白 | 不刻意、不花哨 |

## 时代到材质

| 时代 | 服装材质 | 建筑材质 | 道具材质 |
|------|---------|---------|---------|
| 中国古代 | 粗布、丝绸、棉麻 | 木、夯土、石材、琉璃瓦 | 青铜、铁器、陶瓷、竹木 |
| 现代都市 | 棉、涤纶、牛仔、针织 | 玻璃幕墙、混凝土、钢结构、瓷砖 | 塑料、不锈钢、玻璃、电子设备 |
| 近未来 | 合成面料、智能织物 | 合金、碳纤维、LED、全息界面 | 透明材质、模块化设备、触屏 |
| 末世/废土 | 修补拼接、磨损日常服 | 废墟、锈蚀金属、临时搭建 | 修复再利用旧物 |
| 西方古代 | 羊毛、亚麻、皮革、盔甲 | 石材、木材、铁艺、彩色玻璃 | 铁器、皮革、羊皮纸、银器 |

## 光影词汇

| 光影类型 | 效果 | 适用场景 | 实现描述 |
|---------|------|---------|---------|
| 自然散射光 | 柔和、真实、略阴郁 | 日常、末世外部、克制戏 | 阴天自然光、柔光布、低反差 |
| 暖色室内灯 | 安全、温暖、私密 | 家、基地内部、情感场景 | 台灯、筒灯、壁灯等实际光源 |
| 霓虹暗环境 | 迷离、都市、夜晚 | 赛博朋克、都市夜戏 | 霓虹、屏幕光、烟雾、湿地反光 |
| 强侧光/逆光 | 戏剧性、力量、剪影 | 战斗、权力场、高潮 | 单一强光源从侧面或背后切入 |
| 顶光黑暗 | 压迫、观看感、舞台感 | 审讯、斗兽场、仪式 | 顶部聚光，四周压暗 |
| 屏幕光低照度 | 科技、孤独、监控感 | 黑客、控制室、监控中心 | 屏幕冷光主导，环境低照 |
| 烛光/火光 | 不稳定、紧张、私密 | 古代夜戏、停电、灾难 | 火焰闪烁，暖色低照度 |

## 构图词汇

- 对称构图：秩序、权力、仪式、童话感。
- 不对称构图：危机、不稳定、悬疑、被观察感。
- 中心构图：英雄时刻、爽点、人物选择被强调。
- 前景遮挡：窥视、秘密、距离感。
- 深景深：世界规模、环境压迫、空间关系。
- 浅景深：情绪集中、人物关系、细节强调。
- 低角度：权力、威胁、英雄化。
- 高角度：脆弱、被压制、局势失控。

## Reference: concept-validation-workflow

# 概念图验证流程

用于美术设定 skill 在文字美术圣经完成后，生成概念图进行用户确认。概念图只验证规则，不替代后续资产制作依据。

## 核心原则

- 美术圣经是下游制作依据。
- 概念图是用户确认工具。
- 概念图不直接作为角色资产、场景资产、分镜或视频生成的主要参考。
- 如果概念图与预期不符，优先修正美术圣经，而不是只改图。

## 建议验证图

| 图号 | 类型 | 检查重点 |
|------|------|---------|
| 1 | 世界观氛围图 | 整体色彩、时代质感、主空间气质 |
| 2 | 核心场景图 | 建筑风格、光照、材质、空间尺度 |
| 3 | 主角造型图 | 服装剪影、材质、色彩、身份阶层 |
| 4 | 关系/群像图 | 角色视觉层级、阵营差异、服装系统 |
| 5 | 关键情感场景图 | 风格转场、情绪光影、象征色是否成立 |

## 反馈归档

用户反馈应回写到美术圣经的具体字段：

- 色彩问题：更新 `colorSystem`
- 光影问题：更新 `lightingSystem`
- 服装/道具问题：更新 `textureAndMaterial`
- 空间问题：更新 `sceneVisualGuide`
- 风格不一致：更新 `overallStyle.keyVisualPrinciples`

## 通过标准

- 用户能用一句话复述该剧视觉气质。
- 每张图至少验证一个核心字段。
- 反馈能够定位到卡片字段，而不是停留在“好看/不好看”。

## Reference: director-visual-style-vocabulary

# 导演视觉风格词汇库

用于把用户口中的导演、作品、流派偏好转译为可执行的美术语言。引用时应转译为视觉原则，而不是要求下游直接模仿某位导演。

| 风格锚点 | 风格标签 | 色彩特征 | 光影手法 | 构图/运动 | 适用场景 |
|----------|---------|---------|---------|-----------|---------|
| 王家卫式 | 迷离、怀旧、情绪流 | 高饱和暖色、红金、偏绿、浓郁油画感 | 霓虹、窗光、逆光、烟雾、半明半暗 | 浅景深特写、镜面、前景遮挡、慢动作 | 都市情感、暧昧、孤独 |
| 诺兰式 | 宏大、理性、时空感 | 冷蓝、灰、自然肤色、高对比 | 自然光、大景深、实拍光源 | 对称空间、交叉剪辑、大视野 | 科幻、悬疑、智力感叙事 |
| 昆汀式 | 暴力美学、复古、黑色幽默 | 高饱和复古色，黄黑、红白对撞 | 硬光、顶部光、舞台感 | 低角度、长对话镜头、突然快速剪辑 | 复古动作、黑色幽默 |
| 韦斯安德森式 | 对称、童话、平面化 | 高饱和粉彩，像复古明信片 | 均匀柔光，少阴影 | 严格对称、正俯拍、横向/纵向移动 | 喜剧、童话感、高度风格化 |
| 扎克施奈德式 | 漫画式、油画感、神话化 | 去饱和、高对比、棕金或蓝灰 | 逆光、剪影、轮廓雕刻 | 慢动作、漫画分镜式静态构图 | 超英、神话、仪式化动作 |
| 大卫芬奇式 | 冷峻、控制、精密 | 去饱和绿黄，暗部极暗 | 精准单一光源，孤立感 | 稳定机位，克制运动，信息密集 | 心理惊悚、犯罪、权力压迫 |
| 是枝裕和式 | 日常、温情、克制 | 自然色，接近生活本身 | 自然光、窗边日光 | 固定机位，礼貌距离，日常动作完整 | 家庭、温情、生活流 |
| 张艺谋式 | 色彩符号、仪式感 | 红、金、水墨黑白等主题色 | 形式化光影或自然光并用 | 大场面全景、对称、仪式队列 | 史诗、武侠、权力结构 |

## 转译规则

- “像某某导演”要拆成色彩、光影、构图、材质、运动五类语言。
- 同一张美术设定卡最多保留 1 个主风格锚点和 1 个辅助锚点。
- 如果用户参考彼此冲突，先问清主次；若无法询问，按故事核心和世界观优先。

## Reference: visual-style-taxonomy

# 视觉风格类型库

用于美术设定 skill 在用户风格选择、视觉方案生成、美术圣经落版时快速匹配类型、色彩、光影、材质和构图方向。

## 短剧高频类型

| 类型 | 色彩倾向 | 光影风格 | 材质质感 | 构图偏好 | 风险提醒 |
|------|---------|---------|----------|---------|---------|
| 重生/穿越爽文 | 中等饱和，暖色为主 | 明亮自然光，室内暖光 | 按时代定材质，反派可更精致 | 竖屏中近景，爽点用稳定构图 | 不要把爽感做成廉价高饱和 |
| 末世/丧尸 | 自然色到略灰冷，安全区可暖 | 外部阴天散射光，基地混合人工光 | 日常磨损、锈蚀金属、临时修补 | 外部手持，基地更稳定 | 避免全片过灰导致信息丢失 |
| 都市爱情/甜宠 | 中高饱和暖色，粉、金、奶油色 | 柔光、逆光、窗边自然光 | 针织、丝绸、木地板、玻璃 | 浅景深特写，双人对称构图 | 甜感要靠光和质感，不靠过曝 |
| 悬疑/惊悚 | 低饱和冷色或黑红强对比 | 低调光、强侧光、局部线索光 | 冷混凝土、潮湿纹理、旧金属 | 不对称、前景遮挡、窥视感 | 太暗会损害线索辨认 |
| 古装/仙侠 | 古装用自然土色，仙侠用冷白、浅金、水墨 | 古装自然光与烛火，仙侠柔光与灵气光 | 布帛、木、石、青铜、纱、玉 | 古装深景深，仙侠空灵浅景深 | 区分人间烟火和超凡气质 |
| 刑侦/犯罪 | 去饱和冷色，线索用局部高饱和 | 硬光、阴影、手电、车灯、监控光 | 混凝土、玻璃、金属、泥土血迹 | 信息密集特写、监控视角 | 线索色不能滥用 |
| 喜剧/搞笑 | 正常偏暖，明快但不过分 | 明亮均匀光 | 日常材质，整洁不精致化 | 中景保证表情和肢体动作 | 视觉不要抢表演节奏 |

## 电影/长剧类型

| 类型 | 色彩倾向 | 光影风格 | 材质质感 | 构图偏好 |
|------|---------|---------|----------|---------|
| 史诗/战争 | 低饱和冷暖混合，土黄、铁灰、暗红 | 硬光、深阴影、逆光剪影 | 粗粝、磨损、真实 | 深景深全景，不对称战斗构图 |
| 科幻/赛博朋克 | 蓝、紫、青冷基调，加霓虹暖色 | 霓虹、屏幕、全息、点光源 | 金属、玻璃、合成材料、湿地反光 | 城市密度、垂直贫富差 |
| 黑色电影/犯罪 | 极低饱和或黑白倾向 | 强侧光、百叶窗纹理光 | 潮湿沥青、皮革、玻璃、金属 | 低角度、镜面、前景遮挡 |
| 文艺/独立 | 自然色或主题化偏色 | 自然光、逆光、留白 | 生活质感细腻 | 静态长镜头，空间留白 |
| 动作/枪战 | 中高对比，随场景变化 | 爆炸、枪口、车灯等动态光 | 武器金属、碎块、车辆、汗血 | 手持、快速切换、高潮慢动作 |

## 使用方法

- 先用故事类型和情感核心选主风格，再用世界观修正时代材质。
- 用户给出参考作品时，只提炼色彩、光影、材质、构图原则，不照搬具体画面。
- 如果类型混合，优先确定主风格，再限定次风格出现的场景，例如“战争戏写实粗粝，情感高潮转水墨写意”。

