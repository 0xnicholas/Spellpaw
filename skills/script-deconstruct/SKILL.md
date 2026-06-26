---
name: script-deconstruct
description: Use when a FullScriptCard must be decomposed into creation-zone structure cards, including episode-scene tables and story, character, scene, prop, art, and music direction cards
---

# 剧本解构 Skill（主Skill）

将完整剧本卡片解构为创作分区所需的全套设定卡片。

## 整体工作流

```
输入：FullScriptCard（完整剧本）

阶段1：自动提取（需用户确认，顺序执行）
  Step 1 → 分集分场表卡片 (EpisodeSceneTableCard)
         → [暂停] 与用户核对分场是否合理，确认无误后继续
         → [暂停] 询问用户选择批次策略（一次性 or 分批）
  Step 2 → 故事核心卡片 (StoryCoreCard)
  Step 3 → 世界观卡片 (WorldviewCard)
  Step 4 → 剧情节奏卡片 (PlotPacingCard)
  Step 5 → 角色设定卡片 (CharacterSettingCard × N) - 根据批次策略执行
  Step 6 → 场景设定卡片 (SceneSettingCard × N) - 根据批次策略执行
  Step 7 → 道具设定卡片 (PropSettingCard × N) - 根据批次策略执行
  ↓
  [暂停] 向用户展示提取结果，确认假设，等待确认

阶段2：引导式风格设定（需要用户参与）
  Step 8 → callSkill('art-direction', ...)  → 美术设定卡片
  Step 9 → callSkill('music-direction', ...) → 音乐设定卡片

输出：完整的创作分区卡片集合
```

---

## 阶段1：自动提取

### Step 1：分集分场表卡片（创作分区的基石）

**作用**：将完整剧本拆解为结构化分场表，是后续所有卡片的基础数据源。

**重要原则**：
1. **默认生成完整分集分场表** - 一次性生成所有集数的分场表，不使用占位符或"测试案例"
2. **生成后与用户核对** - 展示分集分场表，询问用户分场是否合理
3. **确认后再继续** - 只有在用户确认分场表无误后，才进入后续步骤

**字段定义**：
```typescript
interface EpisodeSceneTableCard extends BaseCard {
  type: 'episode_scene_table';
  upstreamCards: CardRef[];      // 必须包含 FullScriptCard 引用，role = "source_script"

  episodes: Array<{
    episodeNumber: number;
    episodeTitle?: string;
    scenes: Array<{
      sceneNumber: string;       // 格式：集数-场次，如 "1-3"
      sceneId: string;           // 稳定场次ID，如 "ep01_sc03"
      scriptRawText: string;     // 本场完整剧本原文，从 FullScriptCard.rawText 切片保留
      sceneLocationId: string;   // 稳定场景ID，供制作区和场景资产查询
      sceneLocationName: string; // 场景名称，优先与 SceneSettingCard 对齐
      location: string;
      time: string;
      interiorExterior: string;  // 内景/外景
      weather?: string;
      plotSummary: string;       // 20-30字核心事件
      moodAndPace: {
        emotionalTone: string;
        pace: string;
        intensity: string;       // 1-10
      };
      characters: Array<{
        characterId: string;     // 稳定角色ID，供制作区和角色资产查询
        characterName: string;
        roleType: "protagonist" | "antagonist" | "supporting" | "minor";
        characterCardId?: string;
      }>;
      mainActions: string[];     // 简化的关键动作列表（3-5条，用于快速浏览）
      props: Array<{
        propId: string;          // 稳定道具ID，供制作区和道具资产查询
        propName: string;
        importance: "key" | "supporting" | "background";
        propCardId?: string;
      }>;
      dialogue?: string;         // 该场次的完整台词文本（保留原始格式）
      
      // 新增：详细的视觉描述（从△动作描述提取）
      visualDescription: Array<{
        sequence: number;        // 顺序编号
        content: string;         // 完整的动作描述（保留原文）
        type: "action" | "camera" | "environment" | "character"; // 描述类型
      }>;
      
      // 新增：场景视觉元素（从△描述中提取结构化信息）
      sceneElements: {
        environment: string[];   // 环境元素（如：水面翻涌、洪水淹没陆地、楼群）
        characterStates: Array<{ // 角色及其状态
          character: string;
          state: string;         // 状态描述（如：站在城墙上、举枪抵抗）
        }>;
        objects: string[];       // 场景中的物体（如：浮岛城墙、枪、SUV）
        lighting?: string;       // 光照描述（如果剧本中有明确描述）
        atmosphere?: string;     // 氛围描述（如果剧本中有明确描述）
      };
      
      // 新增：镜头信息（如果剧本中有明确的镜头描述）
      cameraInfo?: {
        movements: string[];     // 镜头运动（如：镜头随着战士下沉、镜头推到车内）
        angles?: string[];       // 机位角度（如果有）
        focusSubjects?: string[]; // 焦点对象（如果有明确说明）
      };
      
      duration?: string;
      notes?: string;
    }>;
  }>;
}
```

**提取规则**：
1. 识别集数边界，确定每集起止行
2. **场景识别（优先级顺序）**：
   - 优先识别明确标注的场景标题（`集数-场次 地点 时间 内/外景`格式）
   - 场景标题支持字母后缀（如 `1-1A`、`1-1B`），视为同一集内的子场景
   - **若剧本无明确场景标题，以地点/时间/人物变化为分场依据**：地点切换、时间跳跃、或主要人物组合变化，均视为新的一场戏
   - 无编号的"一组镜头"/"快速镜头"/"一组快速镜头"，sceneNumber 标注为 `X-X-montage`

3. **为每场生成稳定 ID 与原文切片**：
   - `sceneId`：按 `ep{episodeNumber}_sc{sceneNumber}` 生成；字母后缀和 montage 原样归一化保留，如 `ep01_sc01A`、`ep01_montage01`
   - `scriptRawText`：从 `FullScriptCard.rawText` 截取本场完整原文，必须包含场景标题、所有 `△` 动作描述、台词、VO/OS、转场和情绪标注
   - 如果无法可靠切片，必须暂停并返回解析告警，不得用摘要或 `dialogue` 替代 `scriptRawText`

4. **为场景、角色、道具建立稳定实体引用**：
   - `sceneLocationId`：优先复用已存在 `SceneSettingCard.id`；没有则按场景规范名生成临时 ID，并在 Step 6 创建场景设定卡时回填
   - `sceneLocationName`：保留规范化后的场景名称
   - `characters[].characterId`：优先复用已存在 `CharacterSettingCard.id`；没有则按角色规范名生成临时 ID，并在 Step 5 创建角色设定卡时回填
   - `characters[].roleType`：从全剧角色重要性和本场功能判断，取 `protagonist | antagonist | supporting | minor`
   - `props[].propId`：优先复用已存在 `PropSettingCard.id`；没有则按道具规范名生成临时 ID，并在 Step 7 创建道具设定卡时回填
   - 输出给制作区前，禁止只保留名称而缺少 ID

5. **提取 `△` 开头的动作描述**：
   - **visualDescription**：保留所有 `△` 开头的完整描述，按顺序编号
   - 识别描述类型：
     - `action`：角色动作（如：林渊起身、赵峰暴打林渊）
     - `camera`：镜头运动（如：镜头随着战士下沉、镜头推到车内）
     - `environment`：环境描述（如：水面翻涌、暴雨倾盆）
     - `character`：角色状态（如：战士站在城墙上、苏晴骑坐在赵峰身上）
   - **mainActions**：从 visualDescription 中提炼最关键的3-5条动作（用于快速浏览）

6. **提取场景视觉元素（sceneElements）**：
   - **environment**：环境元素列表（如：水面、洪水、楼群、暴雨）
   - **characterStates**：角色及其状态（如：{character: "战士", state: "站在城墙上举枪抵抗"}）
   - **objects**：场景中的物体（如：浮岛城墙、枪、SUV、铁管）
   - **lighting**：仅当剧本中有明确光照描述时提取（如：逆光、灯光、阳光）
   - **atmosphere**：仅当剧本中有明确氛围描述时提取（如：阴森、压抑）

7. **提取镜头信息（cameraInfo）**：
   - **movements**：镜头运动描述（如：镜头随着战士下沉、镜头推到车内、镜头跟着林渊走出套房门）
   - **angles**：机位角度（如果剧本中有明确说明，如：俯拍、仰拍）
   - **focusSubjects**：焦点对象（如果剧本中有明确说明，如：林渊的表情、尸潮攻击）
   - 如果该场次没有明确的镜头描述，cameraInfo 为 null

8. 从对话行提取角色名（过滤旁白VO/OS、系统声音）

9. 从动作和对话识别关键道具

10. 提炼核心事件为一句话 plotSummary（20-30字）

11. **提取该场次的完整台词文本（dialogue）**：
   - 保留原始格式（角色名 + 台词内容）
   - 包含旁白（VO/OS）
   - 如果该场次无台词（纯动作场景），dialogue 字段为 null

12. **emotionalTone 填写对画面/表演/分镜有直接指导意义的氛围词**，如：阴森、压抑、紧张、爽快、温馨、荒诞、悲壮、惊悚。避免填写抽象情绪词（如"复杂"）

**分批处理策略**（针对长剧本）：
- 建议每次处理10集，分批生成分场表
- 每批完成后输出该批次的分场表，再继续下一批
- **所有集数的分场表必须完整生成**，不得使用占位符
- Step 5/6/7 依赖 Step 1 **完整完成**后才能执行（需要出场频次统计）

**生成完成后的核对流程**：
1. **展示分集分场表总览**：向用户展示已生成的分场表结构（集数、场次数量、主要场景）
2. **询问用户确认**：
   - 分场是否合理？
   - 场景拆分是否过细或过粗？
   - 是否有遗漏的关键场景？
   - 是否需要调整某些场景的时长或强度？
3. **根据反馈迭代修改**：用户提出修改意见后，更新分集分场表
4. **确认无误后继续**：只有在用户明确确认分场表无误后，才进入 Step 2-7

**假设标注**：
- 时间未标注 → 根据上下文推断，标注 `[假设]`
- 内/外景根据地点名称推断 → 标注 `[假设]`

---

### Step 2-7：询问批次策略

**在开始创建角色、场景、道具卡片前，先询问用户选择批次策略**：

```
分集分场表已确认完成。接下来需要创建角色设定、场景设定、道具设定卡片。

请选择创建方式：
1. **一次性创建所有**（基于全部X集的分场表，生成所有角色/场景/道具卡片）
2. **分批创建**（例如先创建前10集涉及的角色/场景/道具，后续分批补充）

您希望采用哪种方式？
```

**根据用户选择执行**：
- **选择1（一次性创建）**：
  - 提取全部集数的角色、场景、道具清单
  - 统计出场频次和重要性
  - 一次性生成所有卡片
  
- **选择2（分批创建）**：
  - 询问用户第一批范围（如"前10集"）
  - 提取该范围内的角色、场景、道具清单
  - 生成第一批卡片
  - 完成后询问是否继续下一批

---

### Step 2：故事核心卡片

**作用**：提取全剧的故事结构、主题、情感核心，为美术/音乐设定提供基调依据。

**字段定义**：
```typescript
interface StoryCoreCard extends BaseCard {
  type: 'story_core';
  content: {
    synopsis: {
      logline: string;          // 一句话概括（20-30字）
      fullSummary: string;      // 完整概括（200-300字）
      genre: string[];
      targetAudience: string;
      viewerAppeal: string;     // 观众爽点
    };
    storyPattern: {
      pattern: string;          // 如：重生复仇+英雄之旅
      archetype: string[];      // 英雄、盟友、阴影、反派
      keyBeats: string[];       // 6-10个关键节拍
    };
    conflict: {
      primary: string;
      secondary: string[];      // 2-3个
      internal: string;
      external: string;
    };
    structure: {
      type: string;             // 三幕式/五幕式
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

**提取规则**：
1. 从第1集开场VO和闪回提取 logline
2. 按「前世→重生→建立→复仇→结局」结构提取 fullSummary
3. 从剧本元素提取 genre（可多个）
4. 从短剧形式和题材推断 targetAudience
5. 从各集爽点提取 viewerAppeal
6. 分析主角成长轨迹提取 pattern 和 archetype
7. 按英雄之旅12阶段提取 keyBeats
8. 从主角vs末世/反派/内心提取 conflict
9. 按三幕式划分 acts 和 keyEvents
10. 从结局反推 coreTheme，从次要情节提取 subThemes

**假设标注**：
- 幕次划分基于典型结构推断 → 标注 `[假设]`
- 内在矛盾基于角色成长推断 → 标注 `[假设]`

---

### Step 3：世界观卡片

**作用**：提取故事世界的时空、社会、规则、物质条件等原始信息，为美术设定（视觉风格）、角色设定（外形/行为）、场景/道具设定提供**上游依据**。世界观卡片描述"世界是什么样的"，不做视觉或表演结论。

**字段定义**：
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
      primaryLocations: string[];    // 5-7个主要地点
      geographicScope: string;
      locationDescription: string;
    };
    socialStructure: {
      politicalSystem: string;
      hierarchy: string;             // 社会阶层结构
      powerDistribution: string;     // 权力分布（谁掌握什么资源）
      interpersonalDynamics: string; // 人与人之间的典型关系模式（如：强者对弱者的态度、幸存者之间的信任度）
    };
    worldRules: {
      physicalLaws: string[];        // 物理/超自然规则
      technologyLevel: string;       // 技术水平
      specialSettings: string[];     // 特殊设定（异能、系统、特殊物品等）
      materialConditions: string[];  // 物质条件（资源稀缺/丰富情况，影响服装/道具/场景的新旧程度）
    };
    culturalTraits: {
      values: string[];
      customs: string[];
      taboos: string[];
      survivalBehaviors: string[];   // 末世/特殊环境下人物的典型行为模式（如：囤积物资、不信任陌生人）
    };
  };
}
```

**提取规则**：
1. 从第1集VO提取 era 和 timeSpan
2. 从系统提示/背景说明提取 historicalContext
3. 从各集场景标题统计 primaryLocations
4. 从灾难规模推断 geographicScope
5. 从权力角色分布提取 socialStructure（包括 interpersonalDynamics：人与人之间的典型关系模式）
6. 从特殊能力/系统描述提取 worldRules；从场景描述提取 materialConditions（物资稀缺/丰富、新旧程度）
7. 从角色行为提取 values、customs、taboos、survivalBehaviors

**假设标注**：
- 时间跨度基于剧情推算 → 标注 `[假设]`
- 政治制度基于场景推断 → 标注 `[假设]`

---

### Step 4：剧情节奏卡片

**作用**：提取全剧情绪曲线和节奏变化点，为美术设定的视觉节奏和音乐设定的BGM触发点提供依据。

**字段定义**：
```typescript
interface PlotPacingCard extends BaseCard {
  type: 'plot_pacing';
  content: {
    overallRhythm: {
      pacing: string;            // 快节奏/中等/舒缓
      characteristics: string;
    };
    emotionBoard: Array<{
      episode: number;
      intensity: number;         // 1-10
      dominantEmotion: string;
      description: string;
    }>;
    rhythmChangePoints: Array<{
      location: string;          // 集数-场次
      type: string;              // 高潮/转折/低谷
      description: string;
    }>;
    climaxDistribution: {
      miniClimax: string[];      // 每集小高潮
      midClimax: string[];       // 每10-15集中高潮
      grandClimax: string;       // 全剧大高潮
    };
    qualityAssessment: {
      strengths: string[];
      concerns: string[];
      suggestions: string[];
    };
  };
}
```

**提取规则**：
1. 分析全剧节奏类型（短剧=快节奏）
2. 逐集标注情绪强度（1-10）和主导情绪
3. 识别节奏变化点（高潮/转折/低谷）
4. 统计小高潮（每集最强冲突）、中高潮、大高潮
5. **短剧专项评估**（重点）：
   - **第1集冲击力**：前30秒是否有强钩子？开场反差/冲突是否足够强？能否让观众立刻想看下一集？
   - **前20%集数（约前10集）的钩子/反转密度**：平均每集有几个爽点/反转？结尾悬念是否足够？
   - 短剧标准：前10集每集至少1个明确爽点，结尾必须有悬念或反转

---

### Step 5：角色设定卡片

**作用**：为每个出场角色建立完整的人物档案，指导后续角色资产制作。

**字段定义**：
```typescript
interface CharacterSettingCard extends BaseCard {
  type: 'character_setting';
  content: {
    name: string;
    role: 'protagonist' | 'antagonist' | 'supporting' | 'minor';
    
    // 新增：典型角色类型标签
    characterArchetype?: string;  // 典型角色类型，如：渣女、霸总、幼驯染、白月光、舔狗、工具人、忠犬、绿茶、恶毒女配等
    
    biography: {
      age?: string;
      gender?: string;
      occupation?: string;
      socialStatus?: string;
      // 外形描述：合并剧本原文描述 + 基于角色性格/身份的预设推断
      // 格式：[剧本原文描述（如有）] + 体型/面部/气质/典型服装的综合预设
      // 如：剧本描述"穿着居家针织和短裤，修长美腿"；预设：20-25岁女性，活泼甜美气质，日常居家风
      // 若剧本无描述，直接写预设；若有描述，先引用原文再补充预设
      appearance: string;            // 【必填】外形综合描述
      personalityTraits: string[];   // 3-5个标签，基于具体行为
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
    characterArc?: {              // 主要角色必填
      startingPoint: string;
      turningPoints: Array<{
        episode: string;
        event: string;
        change: string;
      }>;
      endPoint: string;
    };
    exitInfo?: {                  // 角色退场信息（非全剧存活角色必填）
      exitEpisode: string;        // 退场集数，如 "第11集"
      exitMethod: string;         // 退场方式，如 "被小咬吃掉"、"被击败"、"牺牲"
      requiresDeathAsset: boolean; // 是否需要制作死亡/退场状态的资产
    };
    relationships?: Array<{
      characterName: string;
      relationship: string;
      relationshipType?: string;  // 关系类型标签，如：前女友、情敌、幼驯染、主仆、师徒等
    }>;
    signature?: {
      catchphrase?: string;
      weapon?: string;
      skill?: string;
    };
    visualForms?: Array<{         // 有明显造型变化时必填
      formName: string;
      episodeRange: string;
      appearanceChange: string;
      triggerEvent: string;
    }>;
  };
}
```

**提取规则**：
1. 从分集分场表统计出场频次确定 role
2. **识别典型角色类型标签** characterArchetype：
   - 从角色行为模式、与主角的关系、剧情功能综合判断
   - 常见类型：渣女/渣男、霸总、幼驯染、白月光、舔狗、工具人、忠犬、绿茶、恶毒女配、傻白甜、高冷男神、暖男、腹黑、玛丽苏等
   - 一个角色可能符合多个类型，选择最核心的1-2个
3. 从对话和动作提取 personalityTraits（基于具体行为，不空泛）
4. 从回忆场景提取 backstory
5. 从对话提取 surfaceDesire，从行为模式推断 deepDesire
6. 从剧情冲突提取 externalConflict，从角色挣扎提取 internalConflict
7. 按英雄之旅追踪 characterArc 的 turningPoints（对应具体集数）
8. 从前后造型差异识别 visualForms（每个 visualForm 对应一张角色资产卡片）
9. **提取关系时标注 relationshipType**：如前女友、情敌、幼驯染、主仆、师徒、战友、竞争对手等

**假设标注**：
- 年龄基于行为推断 → `"25-30岁 [假设：根据XX推断]"`
- deepDesire 无法判断 → 留空
- internalConflict 未体现 → `"[未体现]"`
- backstory 未提及 → `"[未提及]"`
- appearance 未描述 → `"[未描述]"`

---

### Step 6：场景设定卡片

**作用**：为每个重要场景建立视觉档案，指导后续场景资产制作。

**字段定义**：
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
      landmarks: string[];        // 2-5个视觉锚点
      props: string[];
      architecture?: string;
      naturalFeatures?: string[];
    };
    sceneStates: Array<{          // 每个状态对应一张场景资产卡片
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

**提取规则**：
1. 从分集分场表统计场景出现频次确定重要性
2. 从场景标题提取 basicInfo
3. 分析主要活动提取 primaryPurpose
4. 筛选3-5个关键事件记录 keyEvents
5. 从场景描述提取 landmarks（视觉锚点）
6. 按时间段和状态分组识别 sceneStates（每个状态 = 一张资产卡片）
7. 从动作、对话、环境综合提取 emotionalTone

---

### Step 7：道具设定卡片

**作用**：为每个重要道具建立档案，指导后续道具资产制作。

**字段定义**：
```typescript
interface PropSettingCard extends BaseCard {
  type: 'prop_design';
  content: {
    name: string;
    category: string;             // 武器/工具/饰品/文件/器皿/特殊道具（货币/能量/系统类）
    importance: 'core' | 'supporting' | 'background';
    roleInStory: string;
    basicAppearance: {
      size: string;
      shape: string;
      material: string;
      color: string;
      distinctiveFeatures: string[];  // 2-5个显著特征
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
    propStates: Array<{           // 每个状态对应一张道具资产卡片
      stateName: string;
      episodeRange?: { start: number; end: number };
      visualCharacteristics: {
        condition: string;
        appearance: string;
      };
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

**提取规则**：
1. 从分集分场表统计道具出现频次
2. 按频次确定 importance（30次以上=core，10-29次=supporting，1-9次=background）
3. 从首次出现场景提取 basicAppearance（结构化字段，见下方推断规则）
4. 从使用场景提取 functionality
5. 从道具来源和关键场景推断 symbolism
6. 按状态分组识别 propStates（每个状态 = 一张资产卡片）
7. 筛选关键出现场景记录 keyAppearances

**basicAppearance 推断规则库**：

#### 1. 尺寸推断规则

根据剧本中的定性描述 + 道具类别推断结构化尺寸：

| 剧本描述 | category | reference | dimensions推断 |
|---------|----------|-----------|---------------|
| "小型（手持）" | 小型 | 手持 | 根据道具类别：晶体5-10cm，武器30-50cm，工具20-40cm |
| "中型" | 中型 | 单人搬运 | 30-100cm |
| "大型" | 大型 | 多人搬运 | 1-3m |
| "大型工业设备" | 超大型 | 固定设施 | 3m+ |

**道具类别尺寸参考**：
- 晶体/宝石类 → 5-10cm
- 手持武器 → 30-50cm
- 工具 → 20-80cm
- 建筑构件 → 1m+
- 工业设备 → 3m+

**推断标注**：
```json
{
  "size": {
    "category": "小型",
    "reference": "手持",
    "dimensions": "约5-8cm直径",
    "_inferred": true,
    "_inferredFrom": "道具类别=特殊道具(晶体类) + 剧本描述=小型手持"
  }
}
```

---

#### 2. 材质推断规则

根据道具类别 + 世界观时代背景 + 美术设定材质库推断：

| 道具类别 | 默认type | 默认surfaceType | 推断依据 |
|---------|---------|----------------|---------|
| 武器 | 金属/复合材质 | 拉丝/磨损 | 美术设定：金属（有使用痕迹） |
| 工具/设备 | 金属/塑料 | 工业纹理 | 美术设定：塑料/合成材料（现代物品） |
| 特殊道具 | 能量结晶 | 光滑透明 | 美术设定：晶核规范 |
| 建筑构件 | 金属/混凝土 | 粗糙/拉丝 | 美术设定：混凝土/金属 |
| 生活道具 | 木质/布料 | 自然纹理 | 美术设定：真实织物/木头 |

**特殊属性推断**：
- 剧本中提到"发光" → specialProperties: ["自发光"]
- 剧本中提到"能量流动" → specialProperties: ["内部能量流动可见"]
- 剧本中提到"烟雾" → specialProperties: ["烟雾效果"]
- 剧本中提到"防水密封" → specialProperties: ["防水密封"]

**推断标注**：
```json
{
  "materialDetails": {
    "type": "能量结晶",
    "surfaceType": "光滑透明",
    "textureDescription": "多面体切割面自然形成",
    "specialProperties": ["自发光", "内部能量流动可见"],
    "_inferred": true,
    "_inferredFrom": "道具类别=特殊道具 + 美术设定=晶核规范"
  }
}
```

---

#### 3. 色彩方案推断规则

根据道具功能 + 情感基调 + 美术设定色彩系统推断：

**主色调推断**：
- 道具所在场景为"海底基地" → 从 secondaryPalette 选择（#4A90D9 幽蓝等）
- 道具所在场景为"陆地废墟/浮岛" → 从 primaryPalette 选择（#7A8B8B 灰蓝等）
- 特殊道具（晶核等） → 根据剧本描述（"暗紫色/金色"）
- 武器/危险道具 → 冷色调（金属灰/黑/红）
- 生活/温暖道具 → 暖色调（木色/米色/暖白）

**辅助色推断**：
- 核心道具（core） → 推断辅助色（主色的深浅变化或对比色）
- 支撑道具（supporting） → 可选辅助色
- 背景道具（background） → 无辅助色

**强调色推断**：
- 有发光效果的道具 → 强调色为发光颜色
- 无发光效果的道具 → 无强调色

**色调倾向推断**：
- 核心道具 + 正面情感 → "高贵稀有感/温暖安全感"
- 核心道具 + 负面情感 → "压抑冷峻感/危险感"
- 支撑道具 → "功能性/中性感"

**推断标注**：
```json
{
  "colorScheme": {
    "primary": "暗紫色（普通晶核）/ 金色（高纯度晶核）",
    "secondary": "深紫色（普通）/ 白金色（高纯度）- 内部能量流",
    "accent": "淡紫色（普通）/ 暖金色（高纯度）- 发光光晕",
    "mood": "神秘感（普通）/ 高贵稀有感（高纯度）",
    "_inferred": true,
    "_inferredFrom": "剧本描述 + 美术设定色彩系统"
  }
}
```

---

#### 4. 视觉特效推断规则

根据 distinctiveFeatures + 道具类别推断：

**发光类型推断**：
- distinctiveFeatures 包含"发光" → glowType: "常亮"
- distinctiveFeatures 包含"闪烁" → glowType: "闪烁"
- distinctiveFeatures 包含"脉动" → glowType: "脉动"
- 无发光描述 → 不生成 visualEffects 字段

**发光强度推断**：
- 道具名称包含"高纯度/强化/增强" → glowIntensity: "强烈"
- 道具名称包含"普通/初级" → glowIntensity: "微弱"
- 其他 → glowIntensity: "中等"

**发光颜色推断**：
- 默认 → glowColor: "与主色调一致"
- 如果剧本明确描述发光颜色与主色不同 → 单独标注

**粒子效果推断**：
- distinctiveFeatures 包含"能量流动/能量粒子" → particles: true
- 发光强度为"强烈" → particles: true
- 其他 → particles: false

**粒子描述推断**：
- particles: true + 道具类别=能量道具 → particleDescription: "细微能量粒子环绕"
- particles: true + 道具类别=武器 → particleDescription: "能量束粒子"

**环境影响推断**：
- 发光强度为"强烈" + particles: true → ambientEffect: "周围空气微微扭曲"
- 发光强度为"强烈" → ambientEffect: "光晕扩散"
- 其他 → 无环境影响

**推断标注**：
```json
{
  "visualEffects": {
    "glowType": "常亮",
    "glowIntensity": "微弱（普通）/ 强烈（高纯度）",
    "glowColor": "与主色调一致",
    "particles": true,
    "particleDescription": "细微能量粒子环绕（高纯度明显）",
    "ambientEffect": "周围空气微微扭曲（高纯度）",
    "_inferred": true,
    "_inferredFrom": "distinctiveFeatures=发光 + 道具名称包含高纯度"
  }
}
```

---

#### 5. 推断优先级

当剧本中有明确描述时，优先使用剧本描述，不进行推断：
1. 剧本明确描述 → 直接使用，不标注 `_inferred`
2. 剧本部分描述 → 补充推断缺失部分，标注 `_inferred: true`
3. 剧本无描述 → 完全推断，标注 `_inferred: true`

**推断结果标注格式**：
```json
{
  "fieldName": "value",
  "_inferred": true,
  "_inferredFrom": "推断依据说明"
}
```

---

### 阶段1完成后：询问策略

完成7张卡片的自动提取后，采用**"总-分"结构**与用户逐项确认假设，避免一次性抛出过多问题。

#### 询问流程

**第1步：展示总览**

```
阶段1自动提取完成。

已生成：
✓ 分集分场表：[X集，共Y场]
✓ 故事核心：[logline一句话]
✓ 世界观：[时代背景一句话]
✓ 剧情节奏：[整体节奏描述]
✓ 角色设定：[X个角色]
✓ 场景设定：[X个场景]
✓ 道具设定：[X个道具]

在进入阶段2（美术和音乐设定）之前，我需要和您确认一些推断信息。
这些信息已经填入对应的卡片中，现在我们逐项讨论确认。

需要确认的方面包括：
1. 世界观设定（病毒来源、时代背景、时间跨度、社会状态、特殊规则）
2. 角色人设（年龄、职业、典型类型标签、关系类型）
3. 剧情节奏（故事结构、关键转折点时间、结局走向）

我们先从【世界观设定】开始，可以吗？
```

**第2步：逐项探讨**

每次只讨论一个大类（如"世界观设定"），将推断信息作为引子抛出：

```
【世界观设定】

我根据剧本推断了以下信息：

1. 病毒来源：水下沉睡的尸王
   依据：剧本中河流死鱼出现血丝纹路和猩红鱼眼是表象，真正的源头是水下的尸王。
   
2. 时代背景：接近现代，低科幻水平
   依据：剧本中有现代都市元素（手机、银行转账、股票），科技水平接近当代，净化机等设备为低科幻水平。
   
3. 故事时间跨度：约5-6个月
   依据：剧本提到"末世第137天"（约4.5个月），加上重生前一周和末世后的剧情，估算总时长5-6个月。
   
4. 社会状态：政府失能，军队残存，各方势力割据
   依据：浮岛基地有战士守卫（军队存在），但林渊能独立建立海底王国（中央失控）。
   
5. 资源状态：净水成为硬通货，资源极度稀缺
   依据：林渊依靠净水垄断掌握生杀大权，其他幸存者为资源争夺。

这些推断准确吗？有需要修正的地方吗？
```

用户回复后，根据反馈更新卡片，然后继续下一个大类：

```
好的，【世界观设定】已确认。接下来我们讨论【角色人设】...
```

**第3步：完成一轮讨论**

四个大类讨论完毕后，总结确认：

```
太好了！所有推断信息已确认并更新到卡片中。

现在进入阶段2：美术风格和音乐风格设定。
```

#### 询问原则

1. **分批处理**：每次只讨论1个大类（2-4个具体问题）
2. **先展后问**：推断信息先展示在卡片中，讨论时作为引子抛出
3. **引导而非审问**：用"这些推断准确吗？"而非"请逐项确认"
4. **允许发散**：用户可能提出新的想法，灵活调整讨论节奏
5. **及时更新**：每完成一个大类的讨论，立即更新对应卡片
6. **渐进式推进**：完成一部分后再继续下一部分，保持对话自然流畅

---

## 阶段2：引导式风格设定

### Step 8：美术设定

用户确认阶段1假设后，调用美术设定子Skill：

```typescript
const artDirectionCard = await callSkill('art-direction', {
  fullScript: fullScriptCard,
  storyCore: storyCoreCard,
  worldview: worldviewCard,
  narrativeRhythm: plotPacingCard,
  // userStyleChoice 由子Skill引导用户填写
});
```

详见 `~/.claude/skills/art-direction/SKILL.md`

### Step 9：音乐设定

美术设定完成后，调用音乐设定子Skill：

```typescript
const musicDirectionCard = await callSkill('music-direction', {
  fullScript: fullScriptCard,
  storyCore: storyCoreCard,
  worldview: worldviewCard,
  narrativeRhythm: plotPacingCard,
  // userMusicChoice 由子Skill引导用户填写
});
```

详见 `~/.claude/skills/music-direction/SKILL.md`

---

## 输出产物汇总

| 卡片 | 数量 | 下游影响 |
|-----|------|---------|
| 分集分场表 | 1 | 所有卡片的基础数据源 |
| 故事核心 | 1 | 美术/音乐风格基调 |
| 世界观 | 1 | 美术时代感、音乐乐器系统 |
| 剧情节奏 | 1 | 视觉节奏、BGM触发点 |
| 角色设定 | N个 | 角色资产卡片（每个visualForm一张） |
| 场景设定 | N个 | 场景资产卡片（每个sceneState一张） |
| 道具设定 | N个 | 道具资产卡片（每个propState一张） |
| 美术设定 | 1 | 所有视觉资产的风格指导 |
| 音乐设定 | 1 | BGM资产卡片、SFX资产卡片 |

---

## 质量检查

阶段1完成后检查：
- [ ] 分集分场表覆盖所有集数，无遗漏
- [ ] 角色清单与分集分场表中出现的角色一致
- [ ] 场景清单覆盖出现频次≥3次的场景
- [ ] 道具清单覆盖所有 core 和 supporting 道具
- [ ] 所有假设字段已标注 `[假设]`
- [ ] 故事核心的 logline 准确概括全剧
- [ ] 世界观的 worldRules 覆盖所有特殊设定

阶段2完成后检查：
- [ ] 美术设定的乐器系统与世界观时代背景一致
- [ ] 音乐设定的情感映射覆盖故事核心的主要情感
- [ ] 两个设定卡片的风格方向互相协调

## 完成后下一步

完成判定：已输出当前批次可确认的创作分区卡片，并比对分集分场表中的资产拆分结果。

完成后必须向用户说明：

- 已创建哪些 `CharacterSettingCard`、`SceneSettingCard`、`PropSettingCard`。
- 分集分场表里还有哪些角色/场景/道具设定可能遗漏或尚未创建。
- 当前用户想制作的集/场已经具备哪些资产设定。

推荐下一步有两个方向：

1. 继续补齐剩余角色/场景/道具设定。
2. 先开始当前集/场所需资产的设计和制作，按需调用 `character-asset-extraction`、`scene-asset-extraction` 或 `prop-asset-extraction`。

推荐话术：`剧本解构已完成当前批次。我已比对分集分场表中的资产拆分结果。你可以继续补齐剩余角色/场景/道具设定，也可以先开始当前集/场所需资产的设计和制作。`
