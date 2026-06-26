# 音乐设定卡片 - 提取细节打磨（子Skill）

## 一、Skill定位

### 1.1 作为子Skill的角色

音乐设定Skill是**剧本解构Skill的子Skill**，在剧本解构的**阶段2：引导式风格设定**中被调用。

**调用时机**：
- 阶段1（自动提取核心信息）完成后
- 用户确认假设后
- 在美术设定之前或之后（顺序可调整）

**调用方式**：
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

### 1.2 输入依赖

**必需输入**：
1. **完整剧本卡片** (FullScriptCard) — 提供剧本完整内容和分集分场结构
2. **故事核心卡片** (StoryCoreCard)
   - genre（类型）→ 确定音乐风格方向
   - emotionalCore（情感核心）→ 确定音乐基调
3. **世界观卡片** (WorldviewCard)
   - timeSetting（时代背景）→ 确定乐器系统和音乐传统
   - spaceSetting（空间设定）→ 确定地域音乐风格

**可选输入**：
- **剧情节奏卡片** (NarrativeRhythmCard) — 用于识别关键情绪节拍，确定 BGM 触发点
- **用户音乐选择** (userMusicChoice) — 用户的风格偏好和参考作品

### 1.3 输出产物

**输出**：**音乐设定卡片** (MusicDirectionCard)
- 全局音乐风格定义（乐器系统、调性、情感映射）
- BGM 清单（需要制作哪些背景音乐）
- SFX 清单（需要准备哪些音效）

---

## Reference Routing

根据当前任务只读取必要 reference，不要把 reference 内容复制进卡片：

- 判断世界观、类型与音乐风格关系时：读取 `references/music-style-taxonomy.md`
- 构建乐器系统、禁用乐器和音色词汇时：读取 `references/instrumentation-vocabulary.md`
- 生成情绪映射、BPM、Key、调式时：读取 `references/emotion-music-map.md`
- 识别 BGM/SFX 清单、控制数量和触发条件时：读取 `references/bgm-sfx-planning-rules.md`

`SKILL.md` 负责流程、字段和质量门槛；可增长的音乐风格、乐器、情绪和声音资产规则维护在 `references/` 中。

---

## 二、字段定义

```typescript
interface MusicDirectionCard extends BaseCard {
  type: 'music_direction';

  content: {
    // === 全局音乐风格 ===
    globalMusicStyle: {
      styleDescription: string;  // 整体风格描述

      culturalContext: {
        musicalTradition: string;  // 音乐传统（如：中国传统音乐、西方古典、电子）
        era: string;               // 时代感（如：古风、现代、未来感）
        regionalInfluence?: string; // 地域影响（如：北方豪迈、江南婉约）
      };

      instrumentSystem: {
        primaryInstruments: Array<{
          instrument: string;      // 乐器名称
          role: string;            // 角色（主旋律/情感渲染/节奏）
          characteristics: string; // 音色特征
        }>;
        supportingInstruments: string[];
        forbiddenInstruments?: Array<{
          instrument: string;
          reason: string;          // 禁用原因（如：与时代背景不符）
        }>;
      };

      tonalCharacteristics: {
        keyTendency: string;   // 调性倾向描述（如：五声调式为主、小调为主）
        defaultKey?: string;   // 默认调性（如：pentatonic、C minor、A major）
        tempoRange: string;    // 节奏范围描述（如：40-160 BPM）
        defaultBPM?: number;   // 默认 BPM（如：90）
        dynamicRange: string;  // 动态范围（如：从极弱到极强）
      };

      emotionalMapping: Array<{
        emotion: string;           // 情感（如：紧张、悲伤、喜悦、壮烈）
        musicalTreatment: string;  // 音乐处理方式
        instruments: string[];
        tempo: string;             // 节奏描述（如：中速庄重，120-140 BPM）
        bpm?: number;              // 具体 BPM 数值（如：130）
        key?: string;              // 该情感对应的调性（如：C minor）
      }>;
    };

    // === BGM 清单 ===
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

    // === SFX 清单 ===
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

    // === 关联卡片 ===
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

## 三、音乐设定提取流程

### 3.1 前置步骤（由父Skill完成）

**Step 1: 分析剧本音乐需求**

父Skill基于故事核心和世界观，分析剧本的音乐风格倾向：
```
分析维度：
• 时代背景 → 确定乐器系统和音乐传统
• 情感基调 → 确定音乐整体基调
• 核心矛盾 → 确定音乐张力和动态范围
• 故事类型 → 确定整体音乐风格方向
```

**Step 2: 展示音乐风格 Reference**

父Skill提供 3-4 组音乐风格方案，每组包含：
- 代表性配乐作品（电影/剧集原声带）
- 风格关键词（3-5 个）
- 一句话描述

**Step 3: 用户选择与细化**

用户选择音乐风格方向，可以：
- 选择单一风格
- 混合风格
- 提供参考作品
- 描述具体场景的音乐感受

**Step 4: 调用音乐设定子Skill**

用户确认后，父Skill调用音乐设定子Skill，传入用户的音乐选择

### 3.2 子Skill的核心任务

音乐设定子Skill接收用户的音乐选择后，需要完成：

1. **解析用户音乐选择**：理解用户选择的风格方向和偏好
2. **提取剧本音乐线索**：从剧本中提取所有音乐相关的描述
3. **构建全局音乐风格**：将风格选择转化为详细的乐器系统和情感映射
4. **识别 BGM 需求**：从剧情节拍中识别需要制作哪些背景音乐
5. **识别 SFX 需求**：从场景描述中识别需要准备哪些音效
6. **输出音乐设定卡片**：生成完整的音乐设定卡片

### 3.3 详细提取流程

#### 步骤1：解析用户音乐选择

**输入**：
```typescript
userMusicChoice: {
  primaryStyle: "中国传统音乐为主，融合现代编曲",
  referenceWorks: ["《三国演义》原声带", "《权力的游戏》配乐"],
  userPreferences: "战争场景要有鼓点和弦乐，情感场景用古筝和二胡"
}
```

**解析任务**：
1. 提取主要风格关键词：中国传统、古风、融合现代
2. 识别参考作品的音乐特征：
   - 《三国演义》原声带：古筝、二胡、编钟、大鼓，五声调式
   - 《权力的游戏》配乐：弦乐、打击乐、史诗感、动态范围大
3. 提取用户对具体场景的音乐期望：
   - 战争场景：鼓点 + 弦乐 → 快节奏、强力度
   - 情感场景：古筝 + 二胡 → 缓慢、细腻

**输出**：
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

#### 步骤2：提取剧本音乐线索

**从完整剧本中扫描**：

**场景描述中的音乐线索**：
- 扫描所有场景描述，提取音乐/声音相关关键词
- 识别明确的音乐指示（如：鼓声响起、琴声悠扬）
- 识别隐含的音乐需求（如：战鼓齐鸣的战场、寂静的深夜）

**示例**：
```
场景描述：
"战鼓声震天，三军将士齐声呐喊，旌旗猎猎作响。"

提取：
- 明确音效：战鼓声、呐喊声、旌旗声
- 隐含 BGM 需求：战争主题，需要激昂的战斗音乐
- 情感：壮烈、热血
```

**从故事核心卡片提取**：
- emotionalCore.dominantEmotion → 确定主基调
  - 悲壮 → 低沉弦乐 + 古筝哀鸣
  - 热血 → 快节奏鼓点 + 激昂弦乐
  - 温情 → 轻柔古筝 + 笛声
- theme.coreTheme → 确定音乐隐喻
  - 忠义 → 庄重、厚重的主题音乐
  - 背叛 → 不和谐音程、阴暗色彩
  - 兄弟情 → 温暖、共鸣感强的主题

**从世界观卡片提取**：
- timeSetting.era → 确定乐器系统
  - 东汉末年 → 古筝、二胡、琵琶、编钟、战鼓
  - 现代都市 → 钢琴、弦乐、电子元素
  - 末世废土 → 工业噪音、变形吉他、电子打击乐
- spaceSetting → 确定地域音乐风格
  - 北方战场 → 豪迈、粗犷
  - 江南水乡 → 婉约、细腻
  - 宫廷 → 庄重、典雅

#### 步骤3：构建乐器系统

**规则1：基于时代背景选择主要乐器**

| 时代背景 | 主要乐器 | 禁用乐器 |
|---------|---------|---------|
| 中国古代 | 古筝、二胡、琵琶、笛、编钟、战鼓 | 电吉他、合成器（除非风格化） |
| 现代都市 | 钢琴、弦乐、电子元素 | 无特别限制 |
| 末世废土 | 工业噪音、变形吉他、电子打击乐 | 传统古典乐器（除非对比效果） |
| 西方古代 | 弦乐、管风琴、战鼓、号角 | 东方乐器（除非混搭风格） |

**规则2：基于情感功能分配乐器角色**

| 情感功能 | 乐器角色 | 示例 |
|---------|---------|------|
| 主旋律/主题 | 独奏乐器 | 古筝独奏、二胡独奏 |
| 情感渲染 | 弦乐组 | 弦乐四重奏、管弦乐 |
| 节奏/张力 | 打击乐 | 战鼓、定音鼓 |
| 氛围/色彩 | 管乐 | 笛、箫、号角 |

#### 步骤4：构建情感-音乐映射

**基于故事核心卡片的情感列表，为每种情感制定音乐处理方案**：

| 情感 | 音乐处理 | 主要乐器 | 节奏 |
|-----|---------|---------|------|
| 壮烈/史诗 | 大编制管弦乐 + 战鼓 | 战鼓、弦乐、号角 | 中速庄重，120-140 BPM |
| 紧张/危机 | 快速弦乐拨奏 + 低音鼓 | 琵琶、低音弦乐、定音鼓 | 急促，140-180 BPM |
| 悲伤/离别 | 独奏弦乐 + 轻柔伴奏 | 二胡、古筝 | 缓慢，40-60 BPM |
| 温情/兄弟情 | 温暖弦乐 + 轻柔管乐 | 古筝、笛、弦乐 | 中速舒缓，70-90 BPM |
| 权谋/阴谋 | 低沉拨弦 + 不和谐音程 | 琵琶、低音弦乐 | 缓慢阴沉，50-70 BPM |
| 胜利/喜悦 | 全编制齐奏 + 打击乐 | 全乐器组 | 快速激昂，140-160 BPM |

**输出示例**：
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

#### 步骤4.1：生成具体的 BPM 和 Key 数值

**目的**：为 Suno 等音乐生成模型提供具体的技术参数

##### 生成 defaultBPM

从 `tempoRange` 中提取或推断默认 BPM：

```typescript
function generateDefaultBPM(tempoRange: string, emotionalMapping: EmotionalMapping[]): number {
  // 方法1：从 tempoRange 提取中间值
  const rangeMatch = tempoRange.match(/(\d+)-(\d+)\s*BPM/);
  if (rangeMatch) {
    const min = parseInt(rangeMatch[1]);
    const max = parseInt(rangeMatch[2]);
    return Math.round((min + max) / 2);
  }

  // 方法2：从 emotionalMapping 中计算平均值
  const bpms = emotionalMapping
    .map(m => extractBPMFromTempo(m.tempo))
    .filter(bpm => bpm !== undefined);
  
  if (bpms.length > 0) {
    return Math.round(bpms.reduce((a, b) => a + b, 0) / bpms.length);
  }

  // 方法3：默认值
  return 90;
}

function extractBPMFromTempo(tempo: string): number | undefined {
  // 从 "中速庄重，120-140 BPM" 提取中间值
  const rangeMatch = tempo.match(/(\d+)-(\d+)\s*BPM/);
  if (rangeMatch) {
    const min = parseInt(rangeMatch[1]);
    const max = parseInt(rangeMatch[2]);
    return Math.round((min + max) / 2);
  }

  // 从 "急促，160 BPM" 提取单一值
  const singleMatch = tempo.match(/(\d+)\s*BPM/);
  if (singleMatch) {
    return parseInt(singleMatch[1]);
  }

  return undefined;
}
```

##### 生成 defaultKey

从 `keyTendency` 和 `musicalTradition` 推断默认调性：

```typescript
function generateDefaultKey(
  keyTendency: string,
  musicalTradition: string
): string {
  // 中国传统音乐 → 五声调式
  if (musicalTradition.includes('中国传统') || musicalTradition.includes('古风')) {
    if (keyTendency.includes('五声调式')) {
      return 'pentatonic';
    }
  }

  // 小调为主
  if (keyTendency.includes('小调')) {
    return 'C minor';
  }

  // 大调为主
  if (keyTendency.includes('大调')) {
    return 'C major';
  }

  // 无调性
  if (keyTendency.includes('无调性') || keyTendency.includes('atonal')) {
    return 'atonal';
  }

  // 默认：根据音乐传统推断
  if (musicalTradition.includes('西方古典')) {
    return 'C major';
  } else if (musicalTradition.includes('电子') || musicalTradition.includes('工业')) {
    return 'C minor';
  }

  return 'C major'; // 最终默认值
}
```

##### 为每个 emotionalMapping 生成 BPM 和 Key

```typescript
function enrichEmotionalMapping(
  mapping: EmotionalMapping,
  defaultKey: string
): EnrichedEmotionalMapping {
  return {
    ...mapping,
    bpm: extractBPMFromTempo(mapping.tempo) || 90,
    key: inferKeyFromEmotion(mapping.emotion, defaultKey)
  };
}

function inferKeyFromEmotion(emotion: string, defaultKey: string): string {
  // 悲伤/离别 → 小调
  if (emotion.includes('悲伤') || emotion.includes('离别') || emotion.includes('哀')) {
    return 'C minor';
  }

  // 紧张/危机 → 小调或无调性
  if (emotion.includes('紧张') || emotion.includes('危机') || emotion.includes('恐怖')) {
    return 'atonal';
  }

  // 喜悦/胜利 → 大调
  if (emotion.includes('喜悦') || emotion.includes('胜利') || emotion.includes('欢快')) {
    return 'C major';
  }

  // 壮烈/史诗 → 使用默认调性
  if (emotion.includes('壮烈') || emotion.includes('史诗')) {
    return defaultKey;
  }

  // 其他情况使用默认调性
  return defaultKey;
}
```

**输出示例**：

```typescript
{
  tonalCharacteristics: {
    keyTendency: "五声调式为主",
    defaultKey: "pentatonic",
    tempoRange: "40-160 BPM",
    defaultBPM: 100,
    dynamicRange: "从极弱到极强"
  },
  emotionalMapping: [
    {
      emotion: "壮烈/史诗",
      musicalTreatment: "大编制管弦乐与战鼓齐鸣，五声调式主旋律，层层递进的动态",
      instruments: ["战鼓", "弦乐组", "号角", "古筝"],
      tempo: "中速庄重，120-140 BPM",
      bpm: 130,
      key: "pentatonic"
    },
    {
      emotion: "悲伤/离别",
      musicalTreatment: "二胡独奏主旋律，古筝轻柔伴奏，留白处理，不过度渲染",
      instruments: ["二胡", "古筝"],
      tempo: "缓慢，40-60 BPM",
      bpm: 50,
      key: "C minor"
    },
    {
      emotion: "紧张/危机",
      musicalTreatment: "琵琶快速拨奏，低音弦乐持续震音，定音鼓渐强",
      instruments: ["琵琶", "低音弦乐", "定音鼓"],
      tempo: "急促，140-180 BPM",
      bpm: 160,
      key: "atonal"
    }
  ]
}
```

#### 步骤5：识别 BGM 需求

**BGM 识别规则**：

**规则1：必须有主题曲**
- 每部剧必须有一首主题曲（main_theme）
- 主题曲代表整部剧的核心情感和风格

**规则2：主要角色需要角色主题**
- protagonist（主角）必须有角色主题
- antagonist（反派）通常需要角色主题
- 重要 supporting 角色可选

**规则3：从剧情节奏卡片识别关键场景 BGM**
- 扫描剧情节奏卡片中的情绪高潮点
- 每个高潮类型对应一种 BGM 类型
- 出现频率高的场景类型需要专属 BGM

**规则4：从分集分场表统计场景类型**
- 战争场景出现 N 次 → 需要战斗主题 BGM
- 情感场景出现 N 次 → 需要情感主题 BGM
- 宫廷/权谋场景出现 N 次 → 需要权谋主题 BGM

**BGM 清单识别示例**（以东汉末年史诗剧为例）：

| BGM名称 | 类型 | 触发场景 | 出现频率 |
|--------|------|---------|---------|
| 主题曲 | main_theme | 片头、关键情感节点 | 全剧 |
| 刘关张结义主题 | character_theme | 三人同框、兄弟情场景 | 高频 |
| 战争主题 | action | 战斗开始、军队出征 | 高频 |
| 悲情主题 | emotional_theme | 牺牲、离别、失败 | 中频 |
| 权谋主题 | scene_theme | 宫廷密谋、权力斗争 | 中频 |
| 片尾曲 | ending | 每集结尾 | 全剧 |

**输出示例**：
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

#### 步骤6：识别 SFX 需求

**SFX 识别规则**：

**从场景描述中提取音效需求**：
- 扫描所有场景描述，提取声音相关关键词
- 按类别分组：战斗音效、环境音效、角色音效、特殊音效

**SFX 类别识别**：

| 类别 | 识别关键词 | 示例 |
|-----|---------|------|
| combat（战斗） | 刀剑、战鼓、箭矢、马蹄 | 刀剑碰撞声、战鼓声、箭矢破空声 |
| environment（环境） | 风声、雨声、鸟鸣、水流 | 战场风声、营地篝火声、宫殿回响 |
| character（角色） | 脚步、呼吸、呐喊 | 将领呐喊声、士兵脚步声 |
| special（特殊） | 特殊能力、魔法、超自然 | 御尸术激活音效、系统提示音 |
| ui（界面） | 系统提示、界面操作 | 系统通知音、技能激活音 |

**输出示例**：
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

**输出示例**（以东汉末年为例）：
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

## 四、质量检查清单

### 4.1 必填字段完整性检查

**全局音乐风格**：
- [ ] styleDescription：风格描述是否清晰（1-2句话）？
- [ ] culturalContext.musicalTradition：音乐传统是否明确？
- [ ] culturalContext.era：时代感是否明确？
- [ ] instrumentSystem.primaryInstruments：是否包含3-5个主要乐器？
- [ ] tonalCharacteristics.keyTendency：调性倾向描述是否明确？
- [ ] tonalCharacteristics.defaultKey：是否提供了具体的默认调性（如：pentatonic、C minor）？
- [ ] tonalCharacteristics.tempoRange：节奏范围描述是否明确？
- [ ] tonalCharacteristics.defaultBPM：是否提供了具体的默认 BPM 数值？
- [ ] tonalCharacteristics.dynamicRange：动态范围是否明确？
- [ ] emotionalMapping：是否覆盖了剧本中的主要情感类型（至少4种）？
- [ ] emotionalMapping[].bpm：每个情感映射是否有具体的 BPM 数值？
- [ ] emotionalMapping[].key：每个情感映射是否有具体的调性？

**BGM 清单**：
- [ ] 是否有主题曲（main_theme）？
- [ ] 主角是否有角色主题（character_theme）？
- [ ] 战争/动作场景是否有专属 BGM（action）？
- [ ] 情感高潮场景是否有专属 BGM（emotional_theme）？
- [ ] 每个 BGM 的 usageScenarios 是否有明确的触发条件？
- [ ] 每个 BGM 的 keyInstruments 是否与全局乐器系统一致？

**SFX 清单**：
- [ ] 战斗音效（combat）是否覆盖主要武器类型？
- [ ] 环境音效（environment）是否覆盖主要场景类型？
- [ ] 特殊能力/系统音效（special/ui）是否有填写（如有）？
- [ ] 每个 SFX 的 variations 是否考虑了不同强度/距离？

### 4.2 逻辑一致性检查

**与世界观卡片的一致性**：
- [ ] 乐器系统是否与时代背景一致（不出现时代不符的乐器）？
- [ ] 地域音乐风格是否与空间设定一致？

**与故事核心卡片的一致性**：
- [ ] 情感映射是否覆盖了故事核心中的主要情感？
- [ ] 整体音乐基调是否与故事的情感核心一致？

**内部一致性**：
- [ ] BGM 的 keyInstruments 是否都在全局乐器系统中？
- [ ] BGM 的情绪描述是否与情感映射规则一致？
- [ ] SFX 的音效描述是否与场景设定一致？

### 4.3 可执行性检查

- [ ] BGM 的 duration 是否有明确时长或循环说明？
- [ ] BGM 的 variations 是否足够覆盖不同使用场景？
- [ ] SFX 的 duration 是否有明确时长？
- [ ] SFX 的 intensity 是否合理（不是所有音效都 prominent）？

---

## 五、Agent 话术示例

### 5.1 场景1：接收用户音乐选择

```
收到你的音乐风格选择：中国传统音乐为主，融合现代编曲，战争场景要有鼓点和弦乐。

我会基于这个方向，结合剧本内容，生成完整的音乐设定。

正在分析剧本的音乐需求...
```

### 5.2 场景2：提取过程中的进度反馈

```
正在构建音乐设定...

✓ 全局音乐风格：已确定中国传统乐器系统（古筝、二胡、战鼓、琵琶）
✓ 情感映射：已建立6种情感的音乐处理规则
✓ BGM 清单：识别出6首需要制作的背景音乐
✓ SFX 清单：识别出12个需要准备的音效

音乐设定卡片生成完成。
```

### 5.3 场景3：展示关键决策

```
音乐设定已完成，几个关键决策：

【乐器系统】
• 主旋律：古筝（情感场景）、战鼓（战争场景）
• 情感渲染：二胡（悲情）、弦乐组（史诗感）
• 禁用：电吉他、合成器（与东汉末年背景不符）

【BGM 清单（6首）】
• 主题曲《义》：庄重深情，古筝+二胡+弦乐
• 战争主题《征》：激烈快速，战鼓+弦乐+号角
• 结义主题《盟》：温暖庄重，古筝+笛+弦乐
• 悲情主题《殇》：哀婉缓慢，二胡独奏
• 权谋主题《谋》：低沉阴暗，琵琶+低音弦乐
• 片尾曲：每集结尾使用

【SFX 清单（12个）】
• 战斗类：刀剑碰撞、箭矢破空、战鼓声、马蹄声
• 环境类：战场环境音、宫廷环境音、营地篝火声
• 角色类：将领呐喊、士兵脚步
• 特殊类：系统提示音（如有）

要调整哪里吗？
```

### 5.4 场景4：用户要求调整

```
明白了，你希望：
• 加入一首专属于反派的主题音乐
• 战争主题要更有压迫感

我更新一下音乐设定卡片...

✓ 已添加：反派主题《枭》（bgm_007），低沉阴暗，不和谐音程
✓ 已更新：战争主题《征》，加入低音鼓和不和谐弦乐，增强压迫感

更新完成，还有其他需要调整的吗？
```

### 5.5 场景5：完成确认

```
音乐设定确认完成。

这张音乐设定卡片会指导：
• BGM 资产制作：6首背景音乐的生成和制作
• SFX 资产准备：12个音效的采集和制作
• 分镜设计：音乐触发点和情绪节拍的标注

接下来要进入实体筛选，还是先做其他设定？
```

---

## 六、完整提取示例

### 示例：《末世御尸人》音乐设定卡片

**用户音乐选择**：
```typescript
{
  primaryStyle: "末世废土风格，工业感 + 电子音乐",
  referenceWorks: ["《疯狂的麦克斯》配乐", "《地铁：离去》原声带"],
  userPreferences: "战斗场景要有工业噪音和变形吉他，情感场景用钢琴和弦乐"
}
```

**生成的音乐设定卡片（节选）**：

```json
{
  "type": "music_direction",
  "content": {
    "globalMusicStyle": {
      "styleDescription": "以工业电子音乐为主基调，融合后末世废土美学，战斗场景强调工业噪音和变形吉他的压迫感，情感场景用钢琴和弦乐营造人性温度",
      "culturalContext": {
        "musicalTradition": "现代电子音乐 + 工业音乐",
        "era": "末世废土",
        "regionalInfluence": "无地域限制，强调末世后的文明崩塌感"
      },
      "instrumentSystem": {
        "primaryInstruments": [
          {
            "instrument": "变形电吉他",
            "role": "战斗场景主导，营造压迫感",
            "characteristics": "失真、重金属音色，强调危险和暴力"
          },
          {
            "instrument": "钢琴",
            "role": "情感场景主旋律",
            "characteristics": "清澈、孤独感，在废土中代表人性残存"
          },
          {
            "instrument": "工业打击乐",
            "role": "节奏骨架，战斗和紧张场景",
            "characteristics": "金属碰撞声、机械节拍，强调末世工业感"
          }
        ],
        "supportingInstruments": ["弦乐组", "合成器", "低音贝斯"],
        "forbiddenInstruments": [
          {
            "instrument": "传统中国乐器",
            "reason": "与末世废土的世界观不符，除非用于特定文化背景场景"
          }
        ]
      },
      "tonalCharacteristics": {
        "keyTendency": "小调为主，偶尔使用无调性制造不安感",
        "defaultKey": "C minor",
        "tempoRange": "60-200 BPM（情感场景60-80，战斗场景160-200）",
        "defaultBPM": 90,
        "dynamicRange": "从极弱（孤独的钢琴独奏）到极强（全编制工业噪音）"
      },
      "emotionalMapping": [
        {
          "emotion": "战斗/危机",
          "musicalTreatment": "变形吉他 + 工业打击乐，快速切换，不和谐音程",
          "instruments": ["变形电吉他", "工业打击乐", "低音贝斯"],
          "tempo": "急促，160-200 BPM",
          "bpm": 180,
          "key": "atonal"
        },
        {
          "emotion": "孤独/绝望",
          "musicalTreatment": "钢琴独奏，极简，大量留白，偶尔弦乐衬托",
          "instruments": ["钢琴", "弦乐组"],
          "tempo": "缓慢，50-70 BPM",
          "bpm": 60,
          "key": "C minor"
        }
      ]
    },
    "bgmList": [
      {
        "bgmId": "bgm_001",
        "name": "主题曲《深渊》",
        "type": "main_theme",
        "usage": {
          "description": "全剧主题曲，代表末世中的孤独与求生意志",
          "usageScenarios": [
            { "sceneType": "片头", "trigger": "每集开始" },
            { "sceneType": "关键情感节点", "trigger": "主角面临重大抉择" }
          ]
        },
        "musicalCharacteristics": {
          "mood": "孤独、压抑、但有一丝希望",
          "tempo": "中速，80-100 BPM，逐渐加速",
          "keyInstruments": ["钢琴", "弦乐组", "工业打击乐"],
          "duration": "3分钟完整版，45秒简短版",
          "variations": ["完整版", "简短版", "纯钢琴版（情感场景）"]
        }
      }
    ],
    "sfxList": [
      {
        "sfxId": "sfx_001",
        "name": "御尸术激活音效",
        "category": "special",
        "usage": {
          "description": "林渊使用御尸术控制丧尸时的特殊音效",
          "usageScenarios": [
            { "sceneType": "御尸场景", "trigger": "林渊激活御尸术" }
          ]
        },
        "soundCharacteristics": {
          "description": "低频共鸣 + 电子扭曲音，带有神秘和危险感",
          "duration": "1-2秒",
          "intensity": "prominent",
          "variations": ["激活版", "持续版（控制中）", "解除版"]
        }
      }
    ],
    "linkedCards": {
      "sourceScriptCardId": "script_001",
      "worldviewCardId": "worldview_001"
    }
  }
}
```

---

## 七、总结

### 7.1 音乐设定子Skill的核心要点

1. **理解用户音乐选择**：准确解析用户的风格偏好和参考作品
2. **提取剧本音乐线索**：从剧本、故事核心、世界观中提取音乐相关信息
3. **构建完整乐器系统**：基于时代背景和情感需求，定义主要乐器和禁用乐器
4. **识别 BGM 需求**：从剧情节拍和场景类型中识别需要制作的背景音乐
5. **识别 SFX 需求**：从场景描述中识别需要准备的音效
6. **保持一致性**：乐器系统与时代背景一致，BGM 与情感映射一致

### 7.2 BGM 数量参考

详细规则维护在 `references/bgm-sfx-planning-rules.md`。本处只保留快速判断表。

| 剧集规模 | 建议 BGM 数量 | 说明 |
|---------|------------|------|
| 短剧（1-20集） | 4-6首 | 主题曲、战斗、情感、片尾 |
| 中剧（20-50集） | 6-10首 | 加入角色主题、场景主题 |
| 长剧（50集以上） | 10-15首 | 更细分的场景和情感主题 |

### 7.3 SFX 数量参考

详细规则维护在 `references/bgm-sfx-planning-rules.md`。本处只保留快速判断表。

| 剧集类型 | 建议 SFX 数量 | 说明 |
|---------|------------|------|
| 现代都市剧 | 8-12个 | 环境音为主 |
| 古装/战争剧 | 12-20个 | 战斗音效丰富 |
| 末世/科幻剧 | 15-25个 | 特殊能力音效多 |

### 7.4 下游影响

音乐设定卡片会影响：
- **BGM 资产卡片**：每首 BGM 对应一张资产卡片，用于实际音乐生成
- **SFX 资产卡片**：每个 SFX 对应一张资产卡片，用于音效采集/生成
- **分镜设计**：音乐触发点标注在分镜中
- **视频生成**：BGM 和 SFX 在视频生成时自动匹配

### 7.5 常见问题和解决方案

**问题1：用户音乐选择模糊（如"要好听的"）**
- 解决：父Skill提供具体的参考作品和风格描述，引导用户明确选择

**问题2：乐器系统与时代背景冲突**
- 解决：子Skill检查乐器与时代背景的一致性，如有冲突，在 forbiddenInstruments 中标注并说明原因

**问题3：BGM 数量过多或过少**
- 解决：参考 7.2 的数量参考，根据剧集规模调整；优先保证主题曲和战斗/情感主题

**问题4：SFX 描述不够具体**
- 解决：每个 SFX 都要提供 description（音色描述）、duration（时长）和 variations（变体）

### 7.6 下一步

完成音乐设定后，进入实体筛选阶段，或返回父Skill继续剧本解构流程。

## 完成后下一步

完成判定：`MusicDirectionCard` 已创建，音乐风格、乐器系统和情感映射已确认。

优先调用 `music-asset-extraction` 进入音乐支线；也可以返回 `script-deconstruct` 继续主创作链路。

推荐话术：`音乐设定已完成。可以调用 music-asset-extraction 生成配乐资产清单；音乐支线当前不阻塞视频主链路。`
