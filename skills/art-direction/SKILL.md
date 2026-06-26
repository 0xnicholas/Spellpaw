# 美术设定卡片 - 提取细节打磨（子Skill）

## 一、Skill定位

### 1.1 作为子Skill的角色

美术设定Skill是**剧本解构Skill的子Skill**，在剧本解构的**阶段2：引导式风格设定**中被调用。

**调用时机**：
- 阶段1（自动提取核心信息）完成后
- 用户确认假设后
- 在音乐设定之前或之后（顺序可调整）

**调用方式**：
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

### 1.2 输入依赖

美术设定Skill依赖以下输入：

**必需输入**：
1. **完整剧本卡片** (FullScriptCard)
   - 提供剧本的完整内容和分集分场结构

2. **故事核心卡片** (StoryCoreCard)
   - genre（类型）→ 确定视觉风格方向
   - theme（主题）→ 指导视觉表达
   - emotionalCore（情感核心）→ 确定色彩和光影基调

3. **世界观卡片** (WorldviewCard)
   - timeSetting（时代背景）→ 确定服装、道具、建筑风格
   - spaceSetting（空间设定）→ 确定场景视觉特征
   - worldRules（世界规则）→ 确定特效和视觉规则

4. **用户风格选择** (userStyleChoice)
   - primaryStyle：主要风格方向
   - secondaryStyle：次要风格方向（可选）
   - referenceImages：参考图片列表
   - userPreferences：用户的具体偏好描述

**可选输入**：
- **剧情节奏卡片** (PlotRhythmCard)
   - 用于理解不同剧情阶段的视觉需求

### 1.3 输出产物

**输出**：
- **美术设定卡片** (ArtDirectionCard)
  - 包含完整的视觉风格定义
  - 为下游的角色资产、场景资产、道具资产提供视觉指导

---

## Reference Routing

根据当前任务只读取必要 reference，不要把 reference 内容复制进卡片：

- 用户风格选择、题材到视觉系统映射：读取 `references/visual-style-taxonomy.md`
- 用户提到导演、作品、视觉流派时：读取 `references/director-visual-style-vocabulary.md`
- 需要确定色彩、光影、构图、材质词汇时：读取 `references/color-light-composition-vocabulary.md`
- 生成概念图并收集用户反馈时：读取 `references/concept-validation-workflow.md`

`SKILL.md` 负责流程、字段和质量门槛；可增长的风格库与词汇库维护在 `references/` 中。

---

## 二、字段定义（更新后）

```typescript
interface ArtDirectionCard extends BaseCard {
  type: 'art_direction';

  content: {
    // === 整体视觉风格 ===
    overallStyle: {
      styleName: string;  // 风格名称（如：写实史诗、浪漫古装、水墨写意）
      styleDescription: string;  // 风格描述（1-2句话）
      referenceWorks: string[];  // 参考作品（电影、绘画、摄影等）
      keyVisualPrinciples: string[];  // 核心视觉原则（3-5条）
    };

    // === 色彩系统 ===
    colorSystem: {
      primaryPalette: {
        colors: string[];  // 主色调（3-5个颜色，HEX或色彩名称）
        usage: string;  // 使用场景
        emotionalTone: string;  // 情感基调
      };
      secondaryPalette?: {
        colors: string[];  // 辅助色调
        usage: string;
        emotionalTone: string;
      };
      colorContrast: string;  // 色彩对比度（高对比/中对比/低对比）
      saturation: string;  // 饱和度（高饱和/中饱和/低饱和/去饱和）
      colorProgression?: Array<{
        episodeRange: { start: number; end: number };
        paletteShift: string;  // 色彩变化描述
        reason: string;  // 变化原因
      }>;
    };

    // === 光影系统 ===
    lightingSystem: {
      dominantLighting: string;  // 主导光照类型（自然光/人工光/混合）
      lightQuality: string;  // 光质（硬光/软光/散射光）
      shadowStyle: string;  // 阴影风格（深重/柔和/极简）
      keyLightingScenarios: Array<{
        scenario: string;  // 场景类型（如：战争场景、情感戏、室内戏）
        lightingDescription: string;  // 光照描述
        mood: string;  // 营造的氛围
      }>;
    };

    // === 构图原则 ===
    compositionPrinciples: {
      framingStyle: string;  // 取景风格（对称/不对称/黄金分割/中心构图）
      cameraMovement: string;  // 镜头运动（静态/动态/混合）
      depthOfField: string;  // 景深（浅景深/深景深）
      visualHierarchy: string;  // 视觉层次（如何引导观众视线）
      
      // === 场景类型默认构图方案（新增，用于场景资产提取） ===
      sceneTypeDefaults: Array<{
        sceneType: string;  // 场景类型（如：核心据点、战斗场景、情感场景、幸存者聚居地）
        composition: string;  // 推荐构图（如：广角全景、低角度仰拍、中景+环境光）
        cameraAngle: string;  // 推荐机位（如：低角度微仰、平视、高角度俯拍）
        reason: string;  // 推荐原因
      }>;
      
      // === 场景规模视觉处理建议（新增） ===
      sceneScaleGuidance: {
        large: string;  // 大型场景（如：海底基地、城市废墟）的视觉处理建议
        medium: string;  // 中型场景（如：斗兽场、浮岛）的视觉处理建议
        small: string;  // 小型场景（如：办公室、房间）的视觉处理建议
      };
      
      // === 外景场景默认设定（新增） ===
      exteriorDefaults: {
        defaultWeather: string;  // 默认天气（如：阴天为主、晴天为主、多变）
        defaultTimeOfDay: string;  // 默认时段（如：日间为主、夜间为主、混合）
        weatherRationale: string;  // 天气选择的原因（如：末世持续阴雨、营造压抑感）
      };
    };

    // === 质感与材质 ===
    textureAndMaterial: {
      dominantTextures: string[];  // 主导质感（粗糙/光滑/磨损/精致）
      materialPalette: string[];  // 材质调色板（木质/金属/布料/石材等）
      weatheringLevel: string;  // 磨损程度（崭新/轻微磨损/严重磨损/废墟）
    };

    // === 视觉节奏 ===
    visualRhythm: {
      pacing: string;  // 视觉节奏（快速切换/缓慢推进/变化节奏）
      visualContrast: string;  // 视觉对比（强对比/柔和过渡）
      keyVisualBeats: Array<{
        episode: number;
        scene?: string;
        visualDescription: string;  // 视觉描述
        purpose: string;  // 目的（如：建立氛围、推动情绪、标记转折）
      }>;
    };

    // === 特殊视觉元素 ===
    specialVisualElements?: {
      vfxStyle?: string;  // 特效风格（写实/风格化/极简）
      transitionStyle?: string;  // 转场风格（硬切/淡入淡出/创意转场）
      titleCardStyle?: string;  // 片头片尾风格
      graphicElements?: string[];  // 图形元素（字幕、UI、图表等）
    };

    // === 分场景视觉指导 ===
    sceneSpecificGuidance: Array<{
      sceneType: string;  // 场景类型（如：战争场景、情感戏、日常场景）
      visualApproach: string;  // 视觉处理方式
      colorPalette: string;  // 色彩方案
      lighting: string;  // 光照方案
      composition: string;  // 构图方案
      reference?: string;  // 参考作品
    }>;

    // === 关联卡片 ===
    linkedCards: {
      sourceScriptCardId: string;  // 来源：完整剧本卡片
      storyCoreCardId: string;  // 依赖：故事核心卡片
      worldviewCardId: string;  // 依赖：世界观卡片
      characterCardIds?: string[];  // 影响：角色设定卡片
      sceneCardIds?: string[];  // 影响：场景设定卡片
    };
  };
}
```

---

## 三、美术设定提取流程

### 3.1 前置步骤（由父Skill完成）

在调用美术设定子Skill之前，父Skill（剧本解构Skill）已经完成：

**Step 1: 分析剧本风格特征**

父Skill基于故事核心和世界观，分析剧本的视觉风格倾向：

```
分析维度：
• 时代背景 → 确定视觉时代感
• 情感基调 → 确定色彩和光影方向
• 核心矛盾 → 确定视觉对比度
• 故事类型 → 确定整体风格方向
```

**Step 2: 展示主流风格 Reference**

父Skill提供 3-4 组风格方案，每组包含：
- 2-3 张参考图片（电影剧照、概念图、绘画作品）
- 风格关键词（3-5 个）
- 一句话描述

**Step 3: 用户选择与细化**

用户选择风格方向，可以：
- 选择单一风格
- 混合风格
- 提供参考作品
- 要求更多例子

**Step 4: 生成概念图验证**

用户选择风格方向后，生成 2-3 张概念图验证风格效果。

**图片生成模型配置**：

优先级顺序：
1. **gpt-image2**（默认首选）
   - 优势：理解力强，风格控制精准，写实效果好
   - 适用：写实风格、现代都市、人物场景
   
2. **nano-banana**（备选1）
   - 优势：速度快，成本低
   - 适用：快速预览、概念草图
   
3. **seedream**（备选2）
   - 优势：艺术风格多样
   - 适用：风格化场景、艺术化表现
   
4. **midjourney**（备选3）
   - 优势：画面精美，细节丰富
   - 适用：精美宣传图、关键场景概念图

**提示词规范**：

根据不同模型调整提示词格式：

**gpt-image2 提示词格式**（推荐，中文友好）：
```
[场景描述]，[风格关键词]，[视觉细节]，[色彩基调]，[光影描述]，[构图说明]，[参考风格]

示例：
海底豪华酒店套房内景，现代写实主义风格。一个25-30岁的亚洲男性半躺在深棕色真皮沙发上，手持啤酒，穿着灰色休闲卫衣，表情惬意放松。背景是巨大的弧形落地观景窗，窗外是深蓝色海水，有2-3条热带鱼游过。室内暖黄色吊灯照明（3200K色温），现代简约家具，木质茶几，干净整洁。电影摄影质感，自然柔和光影，浅景深，高细节纹理。色调：深蓝海水+暖黄室内灯光+棕色家具。16:9横版构图，电影级画面，类似韩国电影《釜山行》《寄生虫》的写实摄影风格。
```

**midjourney 提示词格式**（英文，需添加参数）：
```
[Scene description], [Style keywords], [Visual details], [Color palette], [Lighting], [Composition]. [Technical parameters]

示例：
Cinematic realistic underwater hotel suite interior, Korean cinema style. A young Asian man in his late 20s relaxing on a brown leather sofa, holding a beer bottle, wearing casual grey hoodie. Massive curved floor-to-ceiling glass window showing deep blue ocean water with a few tropical fish swimming outside. Warm yellow ceiling lights (3200K), modern minimalist furniture, wooden coffee table, clean white walls. Photorealistic, film photography aesthetic, natural soft lighting, shallow depth of field, high detail texture on leather and glass. Color palette: deep blue ocean + warm yellow interior lighting + brown furniture. 16:9 aspect ratio, cinematic composition, like a scene from Train to Busan or Parasite movie --ar 16:9 --style raw --v 6
```

**概念图生成流程**：

1. 基于用户选择的风格，确定需要生成的场景类型
2. 选择合适的生成模型（默认gpt-image2）
3. 根据模型格式编写提示词
4. 生成2-3张概念图：
   - 图1：主要场景（如海底基地）
   - 图2：对比场景（如末世废墟）
   - 图3：角色特写（可选）
5. 展示给用户确认风格方向
6. 根据用户反馈调整或重新生成

**Step 5: 调用美术设定子Skill**

用户确认后，父Skill调用美术设定子Skill，传入用户的风格选择

### 3.2 子Skill的核心任务

美术设定子Skill接收用户的风格选择后，需要完成：

1. **解析用户风格选择**：理解用户选择的风格方向和偏好
2. **提取剧本视觉线索**：从剧本中提取所有视觉相关的描述
3. **构建完整的视觉系统**：将风格选择转化为详细的视觉规范
4. **生成分场景视觉指导**：为不同类型的场景提供具体的视觉方案
5. **输出美术设定卡片**：生成完整的美术设定卡片

### 3.3 详细提取流程

#### 步骤1：解析用户风格选择

**输入**：
```typescript
userStyleChoice: {
  primaryStyle: "方案 A：写实史诗风格",
  secondaryStyle: "方案 C：水墨写意风格（局部）",
  referenceImages: ["权力的游戏战争场景", "影的水墨美学"],
  userPreferences: "要粗粝质感，但在情感高潮时加入水墨意境"
}
```

**解析任务**：
1. 提取主要风格关键词：写实、史诗、粗粝质感
2. 提取次要风格关键词：水墨、写意、意境
3. 识别风格应用场景：战争场景用写实史诗，情感高潮用水墨写意
4. 提取参考作品的视觉特征：
   - 权力的游戏：低饱和、强对比、粗粝质感、土黄铁灰色调
   - 影：水墨美学、留白、克制、黑白灰色调

**输出**：
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

#### 步骤2：提取剧本视觉线索

**从完整剧本中提取**：

**场景描述中的视觉线索**：
- 扫描所有场景描述
- 提取颜色关键词（如：血红、灰暗、金黄）
- 提取光照关键词（如：昏暗、明亮、火光）
- 提取质感关键词（如：破旧、崭新、锈蚀）
- 提取氛围关键词（如：压抑、温馨、紧张）

**示例**：
```
场景描述：
"昏暗的地下室，墙壁斑驳，铁锈味弥漫，唯一的光源是一盏摇曳的油灯。"

提取：
- 光照：昏暗、摇曳的油灯 → 低照度、不稳定光源
- 质感：墙壁斑驳、铁锈 → 破旧、磨损
- 色彩：铁锈 → 暗红、褐色
- 氛围：昏暗、铁锈味 → 压抑、危险
```

**从故事核心卡片提取**：
- emotionalCore.dominantEmotion → 确定主色调
  - 悲壮 → 低饱和、冷色调
  - 欢乐 → 高饱和、暖色调
  - 压抑 → 去饱和、暗色调
- theme.coreTheme → 确定视觉隐喻
  - 忠义 → 红色、金色（传统色彩）
  - 背叛 → 黑色、紫色（阴暗色彩）
  - 希望 → 蓝色、白色（明亮色彩）

**从世界观卡片提取**：
- timeSetting.era → 确定时代视觉特征
  - 东汉末年 → 木质建筑、土黄色调、粗布服装
  - 现代都市 → 玻璃幕墙、冷色调、现代服装
  - 末世废土 → 废墟、锈蚀、灰暗色调
- worldRules.physicalLaws → 确定特效风格
  - 现实世界 → 写实特效
  - 魔法世界 → 风格化特效
  - 科幻世界 → 科技感特效

#### 步骤3：构建色彩系统

**主色调（primaryPalette）构建**：

**规则1：基于情感基调选择主色调**

| 情感基调 | 主色调方向 | 示例色彩 |
|---------|----------|---------|
| 悲壮、史诗 | 低饱和冷暖混合 | 土黄、铁灰、暗红 |
| 浪漫、温馨 | 中高饱和暖色 | 粉色、金黄、橙色 |
| 压抑、恐怖 | 去饱和冷色 | 灰蓝、暗绿、黑色 |
| 欢乐、活力 | 高饱和暖色 | 明黄、橙红、天蓝 |
| 神秘、悬疑 | 低饱和冷色 | 深蓝、紫色、黑色 |

**规则2：基于时代背景调整色彩**

| 时代背景 | 色彩调整 | 原因 |
|---------|---------|------|
| 古代 | 偏向土色、自然色 | 染料技术限制 |
| 现代 | 可用全色谱 | 工业染料发达 |
| 未来 | 偏向冷色、金属色 | 科技感 |
| 末世 | 去饱和、灰暗 | 环境恶化 |

**规则3：基于用户风格选择确定色彩**

用户选择：写实史诗风格
- 参考作品：权力的游戏
- 色彩特征：低饱和、土黄铁灰、强对比

**输出**：
```typescript
{
  primaryPalette: {
    colors: ["#8B7355", "#5C5C5C", "#A0522D", "#2F4F4F", "#8B4513"],
    // 土黄色、铁灰色、赭石色、深灰绿、褐色
    usage: "战争场景、日常场景、权谋场景",
    emotionalTone: "粗粝、压抑、史诗感"
  },
  secondaryPalette: {
    colors: ["#000000", "#FFFFFF", "#696969"],
    // 黑色、白色、深灰
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

#### 步骤4：构建光影系统

**光照类型识别**：

**从场景描述中提取光照信息**：
- 扫描所有场景描述
- 识别光源类型：自然光（日光、月光）、人工光（火光、灯光）
- 识别光照强度：明亮、昏暗、微弱
- 识别光照方向：顶光、侧光、逆光

**基于风格选择确定光照风格**：

用户选择：写实史诗风格
- 参考作品：权力的游戏、角斗士
- 光照特征：强对比、硬光、深重阴影

**输出**：
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

#### 步骤5：构建构图原则

**基于风格选择确定构图风格**：

用户选择：写实史诗风格
- 参考作品：权力的游戏、角斗士
- 构图特征：对称构图（权力场景）、不对称构图（战争场景）、深景深

**输出**：
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

#### 步骤5.5：生成场景类型默认构图方案（新增）

**目的**：为场景资产提取提供构图指导，减少用户在场景资产提取阶段的决策负担。

**生成规则**：

基于剧本中出现的场景类型，为每种场景类型生成默认构图方案：

| 场景类型识别规则 | 推荐构图 | 推荐机位 | 原因 |
|---------------|---------|---------|------|
| 核心据点/基地（roleInStory含"核心"/"基地"） | 广角全景 | 低角度微仰 | 展示空间规模和氛围，强化据点的重要性 |
| 战斗/高潮场景（narrativeFunction含"战斗"/"决战"） | 低角度仰拍 | 低角度 | 强化压迫感和戏剧性 |
| 情感场景（emotionalTone含"温暖"/"温馨"/"情感"） | 中景+环境光 | 平视 | 突出情感氛围，不做视觉干扰 |
| 幸存者聚居地/日常场景（sceneType为exterior且含"聚居"/"日常"） | 平视全景 | 平视 | 展示环境规模和人文感 |
| 权力/压迫场景（emotionalTone含"压抑"/"恐惧"） | 高角度俯拍或低角度仰拍 | 根据权力关系 | 强化权力不对等 |

**输出示例**：
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

**生成逻辑**：
1. 扫描场景设定卡片，识别场景类型关键词
2. 匹配上表规则，生成对应的构图方案
3. 基于世界观的天气/时段设定，生成exteriorDefaults
4. 如果世界观未明确天气，根据情感基调推断（压抑→阴天，欢乐→晴天）

---

#### 步骤6：构建质感与材质

**从世界观和风格选择提取**：

世界观：东汉末年
- 材质：木质、布料、铁器、土石
- 质感：粗糙、磨损、朴素

用户选择：写实史诗风格，粗粝质感
- 避免过度精致
- 强调使用痕迹和磨损

**输出**：
```typescript
{
  textureAndMaterial: {
    dominantTextures: ["粗糙", "磨损", "朴素", "真实"],
    materialPalette: ["木质", "粗布", "铁器", "土石", "皮革"],
    weatheringLevel: "中度到重度磨损，避免崭新感"
  }
}
```

#### 步骤7：构建视觉节奏

**从剧情节奏卡片提取**：
- 识别情绪高潮点
- 识别剧情转折点
- 为关键节拍设计视觉处理

**输出**：
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

#### 步骤8：生成分场景视觉指导

**识别场景类型**：
- 从分集分场表中统计场景类型
- 为每种场景类型制定视觉方案

**输出**：
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

## 四、质量检查清单

### 4.1 必填字段完整性检查

**整体视觉风格**：
- [ ] styleName：风格名称是否简洁明确？
- [ ] styleDescription：风格描述是否清晰（1-2句话）？
- [ ] referenceWorks：是否包含2-5个参考作品？
- [ ] keyVisualPrinciples：是否包含3-5条核心视觉原则？

**色彩系统**：
- [ ] primaryPalette.colors：是否包含3-5个主色调？
- [ ] primaryPalette.usage：使用场景是否明确？
- [ ] primaryPalette.emotionalTone：情感基调是否准确？
- [ ] colorContrast：色彩对比度是否明确？
- [ ] saturation：饱和度是否明确？

**光影系统**：
- [ ] dominantLighting：主导光照类型是否明确？
- [ ] lightQuality：光质是否明确？
- [ ] shadowStyle：阴影风格是否明确？
- [ ] keyLightingScenarios：是否包含3-5个关键场景的光照方案？

**构图原则**：
- [ ] framingStyle：取景风格是否明确？
- [ ] cameraMovement：镜头运动是否明确？
- [ ] depthOfField：景深是否明确？
- [ ] visualHierarchy：视觉层次是否清晰？

**质感与材质**：
- [ ] dominantTextures：是否包含3-5个主导质感？
- [ ] materialPalette：是否包含3-5个材质？
- [ ] weatheringLevel：磨损程度是否明确？

**视觉节奏**：
- [ ] pacing：视觉节奏是否明确？
- [ ] visualContrast：视觉对比是否明确？
- [ ] keyVisualBeats：是否包含3-5个关键视觉节拍？

**分场景视觉指导**：
- [ ] sceneSpecificGuidance：是否包含3-5种场景类型的视觉方案？
- [ ] 每种场景类型的视觉方案是否完整（色彩、光照、构图）？

### 4.2 逻辑一致性检查

**与用户风格选择的一致性**：
- [ ] 整体风格是否符合用户选择的主要风格？
- [ ] 次要风格是否在适当的场景中体现？
- [ ] 参考作品的视觉特征是否被正确提取和应用？
- [ ] 用户的具体偏好是否被体现？

**与故事核心卡片的一致性**：
- [ ] 色彩系统是否与情感核心一致？
- [ ] 视觉风格是否与故事类型一致？
- [ ] 视觉隐喻是否与主题一致？

**与世界观卡片的一致性**：
- [ ] 色彩和材质是否与时代背景一致？
- [ ] 光照和质感是否与世界规则一致？
- [ ] 视觉元素是否与社会结构一致？

**内部一致性**：
- [ ] 色彩系统与光影系统是否协调？
- [ ] 构图原则与视觉节奏是否协调？
- [ ] 分场景视觉指导是否与整体风格一致？

### 4.3 可执行性检查

**色彩系统可执行性**：
- [ ] 色彩是否有明确的HEX值或色彩名称？
- [ ] 色彩使用场景是否明确？
- [ ] 色彩变化是否有明确的时间节点？

**光影系统可执行性**：
- [ ] 光照方案是否具体可执行？
- [ ] 不同场景的光照差异是否明确？
- [ ] 光照方案是否考虑了实际拍摄/制作的可行性？

**构图原则可执行性**：
- [ ] 构图规则是否清晰可执行？
- [ ] 镜头运动是否具体？
- [ ] 视觉层次是否有明确的引导方式？

**分场景视觉指导可执行性**：
- [ ] 每种场景类型的视觉方案是否具体可执行？
- [ ] 是否提供了足够的参考作品？
- [ ] 是否考虑了实际制作的难度和成本？

---

## 五、Agent 话术示例

### 5.1 场景1：接收用户风格选择

```
收到你的风格选择：写实史诗风格为主，情感高潮时加入水墨意境。

我会基于这个方向，结合剧本的内容，生成完整的美术设定。

正在分析剧本的视觉线索...
```

### 5.2 场景2：提取过程中的进度反馈

```
正在构建美术设定...

✓ 色彩系统：已提取主色调（土黄、铁灰、暗红）和次要色调（黑白灰）
✓ 光影系统：已确定强对比硬光风格
✓ 构图原则：已确定对称/不对称混合构图
✓ 质感材质：已确定粗粝质感和中度磨损
✓ 视觉节奏：已标记3个关键视觉节拍
✓ 分场景指导：已为4种场景类型制定视觉方案

美术设定卡片生成完成。
```

### 5.3 场景3：展示关键决策

```
美术设定已完成，几个关键决策：

【色彩系统】
• 主色调：土黄、铁灰、暗红（低饱和、强对比）
• 次要色调：黑白灰（用于情感高潮场景）
• 色彩会在第31集后逐渐加入更多黑白对比

【光影系统】
• 战争场景：强烈侧光/逆光，深重阴影
• 权谋场景：顶光，制造权力感
• 情感场景：柔和散射光，水墨意境

【视觉节奏】
• 第1集开场大战：快速切换，剪影效果
• 第15集桃园结义：对称构图，水墨意境
• 第48集最终决战：极强对比，慢动作

这些设定会指导后续的角色资产、场景资产、道具资产的制作。

要调整哪里吗？
```

### 5.4 场景4：用户要求调整

```
明白了，你希望：
• 色彩饱和度再降低一些
• 战争场景的光影对比再强一些

我更新一下美术设定卡片...

✓ 已更新：饱和度从"低饱和"改为"去饱和"
✓ 已更新：战争场景光照描述，强调"极强对比"

更新完成，还有其他需要调整的吗？
```

### 5.5 场景5：完成确认

```
美术设定确认完成。

这张美术设定卡片会作为视觉指导，影响：
• 角色资产：服装色彩、质感、磨损程度
• 场景资产：环境色调、光照方案、材质选择
• 道具资产：道具色彩、质感、新旧程度

接下来要做音乐设定，还是先进入实体筛选？
```

---

## 六、完整提取示例

### 示例：《三国演义》美术设定卡片

**用户风格选择**：
```typescript
{
  primaryStyle: "写实史诗风格",
  secondaryStyle: "水墨写意风格（情感场景）",
  referenceImages: ["权力的游戏战争场景", "影的水墨美学"],
  userPreferences: "要粗粝质感，战争不美化，情感高潮时用水墨意境"
}
```

**生成的美术设定卡片**：

```json
{
  "type": "art_direction",
  "content": {
    "overallStyle": {
      "styleName": "写实史诗 + 水墨写意（混合风格）",
      "styleDescription": "以写实史诗为主导，战争场景强调粗粝质感和强对比，情感高潮时融入水墨写意的克制美学",
      "referenceWorks": [
        "权力的游戏",
        "影",
        "角斗士",
        "赤壁（战争场景）"
      ],
      "keyVisualPrinciples": [
        "不美化战争，展现残酷真实",
        "强对比光影，营造戏剧张力",
        "粗粝质感，避免过度精致",
        "情感高潮时用水墨意境，克制而深远",
        "色彩克制，以土黄、铁灰、黑白为主"
      ]
    },

    "colorSystem": {
      "primaryPalette": {
        "colors": ["#8B7355", "#5C5C5C", "#A0522D", "#2F4F4F", "#8B4513"],
        "usage": "战争场景、日常场景、权谋场景",
        "emotionalTone": "粗粝、压抑、史诗感"
      },
      "secondaryPalette": {
        "colors": ["#000000", "#FFFFFF", "#696969"],
        "usage": "情感高潮场景，使用水墨美学",
        "emotionalTone": "克制、深远、意境"
      },
      "colorContrast": "高对比",
      "saturation": "低饱和到去饱和",
      "colorProgression": [
        {
          "episodeRange": { "start": 1, "end": 30 },
          "paletteShift": "主色调为主，色彩压抑",
          "reason": "前期剧情压抑，战争频繁"
        },
        {
          "episodeRange": { "start": 31, "end": 60 },
          "paletteShift": "逐渐加入次要色调，黑白对比增强",
          "reason": "后期情感升华，水墨意境增强"
        }
      ]
    },

    "lightingSystem": {
      "dominantLighting": "自然光为主，人工光为辅",
      "lightQuality": "硬光，强对比",
      "shadowStyle": "深重阴影，营造戏剧张力",
      "keyLightingScenarios": [
        {
          "scenario": "战争场景",
          "lightingDescription": "强烈的侧光或逆光，制造剪影效果，阴影深重，尘土飞扬中的光束",
          "mood": "悲壮、史诗感、残酷"
        },
        {
          "scenario": "权谋场景（宫殿、会议）",
          "lightingDescription": "顶光或侧光，制造权力感，阴影落在下位者身上",
          "mood": "压抑、紧张、权力斗争"
        },
        {
          "scenario": "情感高潮场景（结义、离别）",
          "lightingDescription": "柔和的散射光，减少阴影，营造水墨意境，留白感",
          "mood": "克制、深远、兄弟情谊"
        },
        {
          "scenario": "日常场景",
          "lightingDescription": "自然光，中等对比，真实感",
          "mood": "平静、日常"
        }
      ]
    },

    "compositionPrinciples": {
      "framingStyle": "对称构图用于权力场景（如：曹操坐在高位），不对称构图用于战争和冲突场景",
      "cameraMovement": "战争场景动态跟随，手持感；权谋场景静态构图，稳定感；情感戏缓慢推进",
      "depthOfField": "深景深为主，展现环境和氛围；情感特写时使用浅景深",
      "visualHierarchy": "通过光影和位置引导视线，主角通常在光亮处或构图中心，反派在阴影中"
    },

    "textureAndMaterial": {
      "dominantTextures": ["粗糙", "磨损", "朴素", "真实", "风化"],
      "materialPalette": ["木质", "粗布", "铁器", "土石", "皮革", "青铜"],
      "weatheringLevel": "中度到重度磨损，避免崭新感，战争装备有明显使用痕迹"
    },

    "visualRhythm": {
      "pacing": "战争场景快速切换，情感戏缓慢推进，权谋戏中等节奏",
      "visualContrast": "战争与和平的强对比，明暗交替，动静结合",
      "keyVisualBeats": [
        {
          "episode": 1,
          "scene": "1-1",
          "visualDescription": "开场黄巾起义大战，强烈的侧光，剪影效果，快速切换，尘土飞扬",
          "purpose": "建立史诗感和战争残酷性，吸引观众"
        },
        {
          "episode": 15,
          "scene": "15-20",
          "visualDescription": "桃园结义，对称构图，柔和光照，水墨意境，留白，三人剪影",
          "purpose": "情感高潮，标记兄弟情谊，视觉风格转换"
        },
        {
          "episode": 48,
          "scene": "48-30",
          "visualDescription": "赤壁之战，极强对比，逆光剪影，慢动作，火光与水面反射",
          "purpose": "全剧高潮，视觉震撼，史诗感达到顶峰"
        }
      ]
    },

    "specialVisualElements": {
      "vfxStyle": "写实特效，避免过度风格化，火焰、烟雾、血液都要真实",
      "transitionStyle": "硬切为主，情感场景使用淡入淡出，水墨场景使用水墨晕染转场",
      "titleCardStyle": "简洁的书法字体，黑底白字或白底黑字",
      "graphicElements": ["地图标注使用毛笔风格", "字幕使用宋体或楷体"]
    },

    "sceneSpecificGuidance": [
      {
        "sceneType": "战争场景",
        "visualApproach": "强对比、快速切换、动态镜头、剪影效果、手持感",
        "colorPalette": "土黄、铁灰、暗红（血色）、烟雾灰",
        "lighting": "强烈侧光或逆光，深重阴影，尘土中的光束",
        "composition": "不对称构图，制造混乱感和紧张感，低角度仰拍增强史诗感",
        "reference": "权力的游戏 - 私生子之战"
      },
      {
        "sceneType": "权谋场景（宫殿、会议）",
        "visualApproach": "对称构图、静态镜头、强调空间感和权力层级",
        "colorPalette": "金黄、深红、黑色、暗绿",
        "lighting": "顶光或侧光，制造权力感，阴影落在下位者身上",
        "composition": "对称构图，主角居中或高位，俯拍或平拍",
        "reference": "权力的游戏 - 铁王座场景"
      },
      {
        "sceneType": "情感场景（结义、离别、牺牲）",
        "visualApproach": "水墨意境、静态构图、留白、克制",
        "colorPalette": "黑白灰为主，极简色彩",
        "lighting": "柔和散射光，减少阴影，营造水墨晕染效果",
        "composition": "简洁构图，强调人物情感，大量留白",
        "reference": "影 - 水墨美学场景"
      },
      {
        "sceneType": "日常场景",
        "visualApproach": "写实、自然、中等对比",
        "colorPalette": "主色调",
        "lighting": "自然光，真实感",
        "composition": "常规构图，生活化",
        "reference": "无特殊参考"
      }
    ],

    "linkedCards": {
      "sourceScriptCardId": "script_001",
      "storyCoreCardId": "story_core_001",
      "worldviewCardId": "worldview_001"
    }
  }
}
```

---

## 七、总结

### 7.1 美术设定子Skill的核心要点

1. **理解用户风格选择**：准确解析用户的风格偏好和参考作品
2. **提取剧本视觉线索**：从剧本、故事核心、世界观中提取所有视觉相关信息
3. **构建完整视觉系统**：色彩、光影、构图、质感、节奏五大系统
4. **分场景视觉指导**：为不同类型场景提供具体可执行的视觉方案
5. **保持一致性**：与用户选择、故事核心、世界观保持一致

### 7.2 与父Skill的协作

**父Skill负责**：
- 分析剧本风格特征
- 展示风格Reference
- 引导用户选择
- 生成概念图验证
- 调用美术设定子Skill

**子Skill负责**：
- 接收用户风格选择
- 提取剧本视觉线索
- 构建完整视觉系统
- 生成美术设定卡片

### 7.3 下游影响

美术设定卡片会影响：
- **角色资产**：服装色彩、质感、磨损程度、视觉风格
- **场景资产**：环境色调、光照方案、材质选择、氛围营造
- **道具资产**：道具色彩、质感、新旧程度、视觉细节
- **分镜设计**：构图原则、镜头运动、视觉节奏
- **后期制作**：调色方案、特效风格、转场方式

### 7.4 常见问题和解决方案

**问题1：用户风格选择模糊**
- 解决：父Skill应该提供更多具体的参考图片，引导用户明确选择

**问题2：风格选择与剧本内容冲突**
- 解决：子Skill应该在生成卡片前检查一致性，如有冲突，向父Skill反馈

**问题3：色彩系统过于复杂**
- 解决：控制主色调在3-5个，次要色调在2-3个，避免过度复杂

**问题4：分场景视觉指导不够具体**
- 解决：每种场景类型都要提供色彩、光照、构图三个维度的具体方案

### 7.5 下一步

完成美术设定后，进入音乐设定子Skill，或返回父Skill继续剧本解构流程。

---

## 八、设定概念图生成（第二阶段产物）

### 8.1 概念图的定位

**美术设定卡片包含两部分产物**：

1. **美术圣经（视觉指南）**：详细的视觉约束和规则（前面章节已完成）
2. **设定概念图（conceptArt）**：约5张图，用于帮助用户**确认美术圣经的准确性**

**设定概念图的唯一目的**：
- 将美术圣经的文字规则视觉化，让用户直观判断"这就是我想要的感觉吗？"
- 如果概念图与预期不符，说明美术圣经的某些规则需要调整
- 概念图本身**不作为**后续资产制作或视频生成的参考，那些环节直接使用美术圣经

### 8.2 概念图的构成（约5张）

5张概念图覆盖三个维度，帮助用户从不同角度确认美术圣经：

| 编号 | 类型 | 内容 | 检验目标 |
|------|------|------|---------|
| 图1 | 世界观氛围图 | 能代表整个故事世界观的场景全景 | 整体色调、氛围、时代感是否正确 |
| 图2 | 核心场景图 | 出现频次最高的核心场景 | 场景的建筑风格、光照、材质是否符合预期 |
| 图3 | 主角造型图 | 主角的全身造型 | 角色服装风格、质感、色彩是否符合预期 |
| 图4 | 关键配角造型图 | 1-2个重要配角的造型（可合并为一张） | 不同角色之间的视觉差异是否合理 |
| 图5 | 关键情感场景图 | 剧本中情感最强烈的场景类型 | 特殊场景的视觉处理（如水墨意境）是否符合预期 |

**选图原则**：
- 每张图都要能检验美术圣经中的不同规则
- 优先选择在剧本中出现频次高、视觉特征明显的内容
- 图5可根据剧本特点灵活调整（如：末世剧选战斗场景，古装剧选情感场景）

### 8.3 概念图生成流程

**Step 1: 美术圣经确认**

用户确认美术圣经后，进入概念图生成阶段。

**Agent 话术**：
```
美术圣经确认了。

接下来生成5张概念图，帮你确认这套视觉规则是否准确：
• 图1：世界观氛围图（整体色调和氛围）
• 图2：核心场景图（海底基地）
• 图3：主角造型图（林渊）
• 图4：关键配角造型图（沈知夏）
• 图5：关键情感场景图（战斗场景）

生成中...
```

**Step 2: 生成提示词**

每张概念图的提示词从美术圣经中提取对应规则：

```
[图1 世界观氛围图]
post-apocalyptic world, underwater base exterior view, flooded city ruins in background,
color: ochre yellow, iron grey, dark red, low saturation, high contrast,
lighting: hard light, deep shadows,
texture: rough, weathered, realistic,
cinematic wide shot, concept art, high quality

[图3 主角造型图]
male protagonist, post-apocalyptic warrior, tactical gear, weathered clothing,
color: consistent with world palette,
texture: rugged, battle-worn,
full body shot, neutral background, concept art
```

**Step 3: 展示并收集反馈**

**Agent 话术**：
```
5张概念图生成完成。

[图1: 世界观氛围图]
[图2: 海底基地]
[图3: 林渊造型]
[图4: 沈知夏造型]
[图5: 战斗场景]

这些图准确反映了你想要的视觉感觉吗？

如果有不对的地方，告诉我：
• 哪张图有问题？
• 哪里不对？（色彩太暗/太亮、质感太精致/太粗糙、氛围不对...）

我会根据你的反馈调整美术圣经，然后重新生成。
```

**Step 4: 根据反馈调整美术圣经**

**关键点**：概念图不符合预期 → 说明美术圣经的规则需要修正，而不只是重新生成图片。

**用户反馈示例**："图1色彩太暗了"

**Agent**：
```
明白了，色彩太暗。

我更新美术圣经：
• 饱和度：从"去饱和"调整为"低饱和"
• 整体亮度：提高中间调，减少深色比例

[重新生成图1]

这样感觉对了吗？如果对了，我同步更新美术圣经的色彩系统。
```

**Step 5: 确认完成**

**Agent 话术**：
```
概念图确认完成，美术圣经已同步更新。

美术设定卡片完成：
✓ 美术圣经（视觉指南）
✓ 设定概念图（5张，已确认）

接下来要做音乐设定，还是先进入实体筛选？
```

### 8.4 质量检查

**5张概念图的检验目标**：
- [ ] 图1：整体色调和氛围是否符合故事基调？
- [ ] 图2：核心场景的建筑风格、光照、材质是否正确？
- [ ] 图3：主角造型的服装风格、质感是否符合美术圣经？
- [ ] 图4：配角造型与主角的视觉差异是否合理？
- [ ] 图5：特殊场景的视觉处理是否达到预期效果？

---

## 九、完整工作流程总结

### 9.1 美术设定的完整流程

```
阶段1: 用户风格选择（由父Skill完成）
├─ 展示预设Reference库
├─ 引导用户表达偏好
├─ 生成验证概念图
└─ 确认风格选择

阶段2: 生成美术圣经（由子Skill完成）
├─ 解析用户风格选择
├─ 提取剧本视觉线索
├─ 构建色彩、光影、构图、质感、节奏系统
├─ 生成分场景视觉指导
└─ 输出美术圣经

阶段3: 生成设定概念图（由子Skill完成）
├─ 用户确认美术圣经
├─ 生成5张概念图（世界观/核心场景/主角/配角/关键情感场景）
├─ 收集用户反馈
├─ 根据反馈调整美术圣经并重新生成
└─ 确认并保存

阶段4: 输出完整的美术设定卡片
├─ 美术圣经（视觉指南）
└─ 设定概念图（5张，已确认）
```

### 9.2 两部分产物的关系

**美术圣经（文字）**：
- 详细的视觉规则和约束
- 结构化的视觉系统
- 后续所有视觉决策的依据（资产制作、分镜、视频生成均直接使用美术圣经）

**设定概念图（图像）**：
- 美术圣经的视觉化呈现，仅用于用户确认
- 概念图与预期不符 → 说明美术圣经需要调整
- 概念图确认后，其使命完成；后续制作不依赖概念图，而是依赖美术圣经

**两者的协作**：
- 美术圣经定义规则 → 概念图检验规则是否准确
- 概念图反馈问题 → 美术圣经调整规则
- 最终两者一致 → 形成完整的美术设定卡片

---

## 十、Reference / Vocabulary 维护

本节原本承载的类型风格库、导演视觉词汇、色彩光影构图参考已外置到 `references/` 目录，避免主 skill 过长并方便持续扩展。

当前读取路径：

- `references/visual-style-taxonomy.md`
- `references/director-visual-style-vocabulary.md`
- `references/color-light-composition-vocabulary.md`
- `references/concept-validation-workflow.md`

更新原则：

- 新增类型、流派、导演风格、色彩光影词汇时，优先更新对应 reference 文件。
- 主 `SKILL.md` 只更新路由、字段或流程，不继续堆叠大表格。
- reference 文件不需要标注来源参考；外部材料应转译为项目自己的规则和词汇。

## 生成文件命名规则

美术设定卡片中的效果图必须保存 `filename`，格式：

```text
美术设定-概念图-{名字}-v{版本号}
```

示例：`美术设定-概念图-末世海底基地-v001.png`。

## 完成后下一步

完成判定：`ArtDirectionCard` 已创建，必要的美术圣经字段和概念图确认结果已保存。

优先返回 `script-deconstruct` 继续创作分区流程；如果剧本拆解已完成，可进入 `character-asset-extraction`、`scene-asset-extraction` 或 `prop-asset-extraction`。

推荐话术：`美术设定已完成。建议返回 script-deconstruct 汇总创作分区结果，或开始当前集/场所需资产制作。`
