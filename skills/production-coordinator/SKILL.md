---
name: production-coordinator
description: Use when a confirmed EpisodeSceneTableCard scene must become a production-zone EpisodeSceneDetailCard with asset completeness checks
---

# 剧务统筹 Skill

从分集分场表卡片（创作分区）提取单场详情，创建分集分场剧情卡片（制作分区），并进行资产完整度检查。

## 输入契约硬门禁

`production-coordinator` 只接受已闭合字段契约的 `EpisodeSceneTableCard`。它可以做字段映射和资产完整度查询，但不得从纯名称推断稳定 ID，也不得用摘要、台词或视觉描述拼凑 `scriptRawText`。

每个被选中的场次必须包含：

- `sceneId`
- `sceneLocationId`
- `sceneLocationName` 或 `location`
- `scriptRawText`
- `characters[].characterId`
- `characters[].characterName`
- `characters[].roleType`
- `props[].propId` 与 `props[].propName`（仅当本场有道具时）

如果任一必需字段缺失，立即终止并返回：

```typescript
interface MissingContractReport {
  canContinue: false;
  reason: "episode_scene_table_contract_incomplete";
  missingContractFields: Array<{
    path: string;
    expected: string;
    impact: string;
  }>;
  nextAction: "rerun_script_deconstruct" | "repair_episode_scene_table";
}
```

## 整体工作流

```
输入：EpisodeSceneTableCard（分集分场表卡片，来自创作分区）
用户指定：集数、场数

阶段1：提取场次信息
  从分集分场表中定位指定场次
  提取基础信息（集数、场数、场景、时间、角色等）

阶段2：资产完整度检查
  检查出场角色的妆造卡片是否已生成
  检查场景的概念图卡片是否已生成
  检查道具的设计图卡片是否已生成（如有）
  计算完整度百分比
  生成缺失资产列表

阶段3：用户交互
  如果完整度 < 100%，展示缺失清单
  询问用户：继续 or 跳转到资产分区补充

阶段4：创建卡片
  创建分集分场剧情卡片
  保存资产完整度状态
  建立上下游连线

输出：EpisodeSceneDetailCard（分集分场剧情卡片）
```

---

## 阶段1：提取场次信息

**作用**：从分集分场表中定位并提取指定场次的详细信息。

**输入**：
- 分集分场表卡片ID
- 用户指定的集数（如：第1集）
- 用户指定的场数（如：第3场）

**提取字段**：
```typescript
interface SceneInfo {
  episodeNumber: number;        // 集数
  sceneNumber: string;          // 场数（支持字母后缀，如："1-1A"）
  sceneId: string;              // 场次ID（格式：第X集-第X场）
  sceneLocationId: string;      // 场景ID
  sceneLocationName: string;    // 场景名称
  timeOfDay: string;            // 时间（白天/夜晚/黄昏等）
  lighting: string;             // 光照条件（根据时间推断）
  weather?: string;             // 天气（如有）
  characters: Array<{           // 出场角色
    characterId: string;
    characterName: string;
    roleType: 'protagonist' | 'supporting' | 'minor';
  }>;
  plotSummary: string;          // 剧情概要
  scriptRawText: string;        // 剧本原文（这一场的完整剧本文本）
  dialogue?: string;            // 台词（从分集分场表继承）
  emotion: string;              // 情绪基调
  emotionIntensity: number;     // 情绪强度（1-10）
  rhythm: 'fast' | 'medium' | 'slow'; // 节奏
  
  // 详细的视觉描述（从分集分场表继承）
  visualDescription: Array<{
    sequence: number;
    content: string;
    type: 'action' | 'camera' | 'environment' | 'character';
  }>;
  
  // 场景视觉元素（从分集分场表继承）
  sceneElements: {
    environment: string[];
    characterStates: Array<{
      character: string;
      state: string;
    }>;
    objects: string[];
    lighting?: string;
    atmosphere?: string;
  };
  
  // 镜头信息（从分集分场表继承）
  cameraInfo?: {
    movements: string[];
    angles?: string[];
    focusSubjects?: string[];
  };
  
  props?: Array<{               // 道具（如有）
    propId: string;
    propName: string;
  }>;
}
```

**提取规则（只继承不推断）**：
1. 从分集分场表的 `scenes` 数组中查找匹配的场次
2. 匹配条件：`episodeNumber` 和 `sceneNumber` 都相等
3. 如果找不到匹配的场次，提示用户并终止执行
4. **先执行契约校验**：
   - 检查 `sceneId`、`sceneLocationId`、`scriptRawText`
   - 检查每个角色的 `characterId`、`characterName`、`roleType`
   - 检查每个道具的 `propId`、`propName`
   - 如果缺字段，返回 `missingContractFields`，不得进入资产完整度检查
5. **直接继承所有字段**：
   - `scriptRawText`：直接从分集分场表继承（完整的剧本原文）
   - `dialogue`：直接从分集分场表继承
   - `visualDescription`：直接从分集分场表继承
   - `sceneElements`：直接从分集分场表继承
   - `cameraInfo`：直接从分集分场表继承
6. **仅做简单格式化**：
   - `sceneId`：自动生成（格式："第X集-第X场"）
   - `lighting`：根据 `timeOfDay` 简单映射（日→自然光，夜→人工光）
7. **字段名称映射**：
   - `moodAndPace.emotionalTone` → `emotion`
   - `moodAndPace.intensity` → `emotionIntensity`
   - `moodAndPace.pace` → `rhythm`（映射为 fast/medium/slow）
8. **不做任何推断性工作**：
   - 不推断角色站位
   - 不推断动作细节
   - 不推断镜头设计
   - 不推断表演方式
   - 不根据角色名、场景名、道具名反查或猜测缺失 ID

**错误处理**：
- 如果分集分场表卡片不存在 → 提示用户先完成剧本解构
- 如果指定的集数或场数不存在 → 列出可用的集数和场数供用户选择

---

## 阶段2：资产完整度检查

**作用**：检查制作这场戏所需的所有资产是否已在资产分区生成完毕。

### 2.1 检查角色妆造资产

**检查逻辑**：
```typescript
for (const character of sceneInfo.characters) {
  // 查询角色妆造卡片
  const costumeCards = queryCostumeCards({
    characterId: character.characterId
  });
  
  if (costumeCards.length === 0) {
    // 缺失：该角色没有任何妆造卡片
    missingAssets.push({
      type: 'character_costume',
      characterId: character.characterId,
      characterName: character.characterName,
      reason: '未生成角色妆造三视图'
    });
  } else {
    // 存在：记录妆造卡片ID供后续使用
    character.costumeCardId = costumeCards[0].id;  // 默认使用第一套妆造
  }
}
```

**输出**：
- `hasCharacterCostumes`: boolean（所有角色是否都有妆造）
- `missingCharacterCostumes`: Array<{characterId, characterName, reason}>

### 2.2 检查场景资产

**检查逻辑**：
```typescript
// 查询场景概念图卡片
const sceneConceptCards = querySceneConceptCards({
  sceneLocationId: sceneInfo.sceneLocationId
});

if (sceneConceptCards.length === 0) {
  missingAssets.push({
    type: 'scene_concept',
    sceneLocationId: sceneInfo.sceneLocationId,
    sceneLocationName: sceneInfo.sceneLocationName,
    reason: '未生成场景概念图'
  });
}
```

**输出**：
- `hasSceneConcept`: boolean
- `missingSceneConcept`: {sceneLocationId, sceneLocationName, reason}

### 2.3 检查道具资产

**检查逻辑**：
```typescript
if (sceneInfo.props && sceneInfo.props.length > 0) {
  for (const prop of sceneInfo.props) {
    // 查询道具概念图卡片
    const propConceptCards = queryPropConceptCards({
      propId: prop.propId
    });
    
    if (propConceptCards.length === 0) {
      missingAssets.push({
        type: 'prop_concept',
        propId: prop.propId,
        propName: prop.propName,
        reason: '未生成道具概念图'
      });
    }
  }
}
```

**输出**：
- `hasAllProps`: boolean
- `missingProps`: Array<{propId, propName, reason}>

### 2.4 计算完整度

**计算公式**：
```typescript
const totalAssets = 
  sceneInfo.characters.length +  // 角色妆造数量
  1 +                             // 场景概念图（1个）
  (sceneInfo.props?.length || 0); // 道具数量

const completedAssets = 
  (sceneInfo.characters.length - missingCharacterCostumes.length) +
  (hasSceneConcept ? 1 : 0) +
  ((sceneInfo.props?.length || 0) - missingProps.length);

const completenessPercentage = Math.round(
  (completedAssets / totalAssets) * 100
);
```

**输出**：
```typescript
interface AssetCompleteness {
  isComplete: boolean;              // 是否100%完整
  completenessPercentage: number;   // 完整度百分比
  totalAssets: number;              // 总资产数
  completedAssets: number;          // 已完成资产数
  missingAssets: Array<{            // 缺失资产列表
    type: 'character_costume' | 'scene_concept' | 'prop_concept';
    id: string;
    name: string;
    reason: string;
  }>;
}
```

---

## 阶段3：用户交互

**作用**：根据资产完整度，引导用户决定下一步操作。

### 3.1 完整度 = 100%

**展示信息**：
```
✅ 资产完整度检查通过（100%）

所有资产已准备就绪：
- 角色妆造：3/3 已生成
- 场景概念图：1/1 已生成
- 道具概念图：2/2 已生成

是否继续创建分集分场剧情卡片？
```

**用户选项**：
- 继续 → 进入阶段4
- 取消 → 终止执行

### 3.2 完整度 < 100%

**展示信息**：
```
⚠️ 资产完整度检查未通过（75%）

缺失资产清单：
1. 角色妆造：林渊（未生成角色妆造三视图）
   → 跳转到资产分区 > 角色妆造师

2. 道具概念图：玉佩（未生成道具概念图）
   → 跳转到资产分区 > 道具生成师

建议：
- 选项A：跳转到资产分区补充缺失资产（推荐）
- 选项B：忽略缺失资产，继续创建剧情卡片（不推荐，后续制作可能受阻）
```

**用户选项**：
- 跳转到资产分区 → 提供跳转链接，终止当前执行
- 继续创建（忽略缺失） → 进入阶段4，但在卡片中标注资产不完整

**话术示例**：
```
我已完成资产完整度检查。

检测到以下缺失资产：
• 角色妆造：林渊（未生成三视图）
• 道具概念图：玉佩（未生成概念图）

当前完整度：75%（3/4 已完成）

建议您先跳转到资产分区补充这些资产，否则后续的场景策略、表演策略和分镜制作可能无法正常进行。

您希望：
A. 跳转到资产分区补充资产（推荐）
B. 忽略缺失资产，继续创建剧情卡片（不推荐）

请选择 A 或 B。
```

---

## 阶段4：创建卡片

**作用**：创建分集分场剧情卡片，保存所有提取的信息和资产完整度状态。

**卡片字段**：
```typescript
interface EpisodeSceneDetailCard {
  // 基础信息
  episodeNumber: number;
  sceneNumber: string;          // 支持字母后缀（如："1-1A"）
  sceneId: string;              // 场次ID（格式：第X集-第X场）
  sceneLocationId: string;
  location: string;             // 场景名称
  timeOfDay: string;
  lighting: string;             // 光照条件（自然光/人工光/混合光）
  weather?: string;
  
  // 角色信息
  characters: Array<{
    characterId: string;
    characterName: string;
    costumeCardId?: string;     // 角色妆造卡片ID（如果已生成）
    roleType: 'protagonist' | 'supporting' | 'minor';
  }>;
  
  // 剧情信息
  plotSummary: string;
  scriptRawText: string;        // 剧本原文（从分集分场表继承，必填）
  dialogue?: string;            // 台词（从分集分场表继承）
  emotion: string;              // 情绪基调
  emotionIntensity: number;     // 情绪强度（1-10）
  rhythm: 'fast' | 'medium' | 'slow'; // 节奏
  
  // 详细的视觉描述（从分集分场表继承）
  visualDescription: Array<{
    sequence: number;
    content: string;
    type: 'action' | 'camera' | 'environment' | 'character';
  }>;
  
  // 场景视觉元素（从分集分场表继承）
  sceneElements: {
    environment: string[];
    characterStates: Array<{
      character: string;
      state: string;
    }>;
    objects: string[];
    lighting?: string;
    atmosphere?: string;
  };
  
  // 镜头信息（从分集分场表继承）
  cameraInfo?: {
    movements: string[];
    angles?: string[];
    focusSubjects?: string[];
  };
  
  // 角色弧光和剧情转折
  characterArcMoments: Array<{
    characterId: string;
    characterName: string;
    isKeyMoment: boolean;
    arcDescription?: string;
    emotionalShift?: string;
  }>;
  plotTurningPoint: {
    isTurningPoint: boolean;
    turningPointDescription?: string;
    impactLevel?: 'major' | 'moderate' | 'minor';
  };
  
  // 道具信息
  props?: Array<{
    propId: string;
    propName: string;
    propConceptCardId?: string;  // 道具概念图卡片ID（如果已生成）
  }>;
  
  // 资产完整度
  assetCompleteness: {
    characterAssets: Array<{
      characterId: string;
      characterName: string;
      costumeCardId?: string;
      hasCostume: boolean;
      costumeVersion?: string;
    }>;
    sceneAssets: {
      sceneId: string;
      sceneName: string;
      hasConceptArt: boolean;
      conceptArtCardId?: string;
    };
    propAssets: Array<{
      propId: string;
      propName: string;
      hasDesign: boolean;
      designCardId?: string;
    }>;
    completenessPercentage: number;
    missingAssets: string[];    // 缺失资产列表（用于显示）
  };
  
  // 上游卡片
  upstreamCards: string[];      // 上游卡片ID列表
  
  // 元数据
  createdAt: string;
  status: 'draft' | 'in_progress' | 'completed';
  notes?: string;
}
```

**创建规则（只继承不推断）**：
1. 所有从分集分场表提取的信息直接填入对应字段
2. **直接继承的字段**：
   - `dialogue`：直接从分集分场表继承
   - `visualDescription`：直接从分集分场表继承
   - `sceneElements`：直接从分集分场表继承
   - `cameraInfo`：直接从分集分场表继承
3. **简单格式化的字段**：
   - `sceneId`：自动生成（格式："第1集-第1场"）
   - `lighting`：根据 `timeOfDay` 简单映射
4. **字段名称映射**：
   - `moodAndPace.emotionalTone` → `emotion`
   - `moodAndPace.intensity` → `emotionIntensity`
   - `moodAndPace.pace` → `rhythm`
5. 资产完整度信息完整保存（使用新的结构）
6. 如果资产不完整，`missingAssets` 数组记录所有缺失项
7. `status` 初始值为 `'draft'`
8. **不做任何推断性工作**：内容量、结构选择和策略方向由下游导演讲戏skill预判

**上下游连线**：
- 上游：分集分场表卡片
- 直接下游：导演讲戏卡片（precheck）
- 间接下游：场景策略卡片、表演策略卡片、拍摄策略卡片

---

## 测试用例

### 测试用例1：资产完整（100%）

**输入**：
- 分集分场表卡片ID：`episode-scene-table-001`
- 集数：1
- 场数：3

**前置条件**：
- 角色"林渊"已有妆造卡片
- 角色"苏婉"已有妆造卡片
- 场景"林府-书房"已有概念图卡片
- 道具"玉佩"已有概念图卡片

**预期输出**：
```typescript
{
  assetCompleteness: {
    characterAssets: [
      {
        characterId: 'char-001',
        characterName: '林渊',
        costumeCardId: 'costume-001',
        hasCostume: true,
        costumeVersion: '林渊-末世大佬'
      },
      {
        characterId: 'char-002',
        characterName: '苏婉',
        costumeCardId: 'costume-002',
        hasCostume: true,
        costumeVersion: '苏婉-妆造1'
      }
    ],
    sceneAssets: {
      sceneId: 'scene-003',
      sceneName: '林府-书房',
      hasConceptArt: true,
      conceptArtCardId: 'scene-concept-003'
    },
    propAssets: [
      {
        propId: 'prop-001',
        propName: '玉佩',
        hasDesign: true,
        designCardId: 'prop-concept-001'
      }
    ],
    completenessPercentage: 100,
    missingAssets: []
  }
}
```

**用户交互**：
```
✅ 资产完整度检查通过（100%）

所有资产已准备就绪：
- 角色妆造：2/2 已生成
- 场景概念图：1/1 已生成
- 道具概念图：1/1 已生成

是否继续创建分集分场剧情卡片？
```

---

### 测试用例2：资产不完整（75%）

**输入**：
- 分集分场表卡片ID：`episode-scene-table-001`
- 集数：1
- 场数：5

**前置条件**：
- 角色"林渊"已有妆造卡片
- 角色"苏婉"**没有**妆造卡片
- 场景"林府-花园"已有概念图卡片
- 道具"折扇"**没有**概念图卡片

**预期输出**：
```typescript
{
  assetCompleteness: {
    characterAssets: [
      {
        characterId: 'char-001',
        characterName: '林渊',
        costumeCardId: 'costume-001',
        hasCostume: true,
        costumeVersion: '林渊-末世大佬'
      },
      {
        characterId: 'char-002',
        characterName: '苏婉',
        costumeCardId: null,
        hasCostume: false
      }
    ],
    sceneAssets: {
      sceneId: 'scene-005',
      sceneName: '林府-花园',
      hasConceptArt: true,
      conceptArtCardId: 'scene-concept-005'
    },
    propAssets: [
      {
        propId: 'prop-003',
        propName: '折扇',
        hasDesign: false,
        designCardId: null
      }
    ],
    completenessPercentage: 50,
    missingAssets: [
      '角色妆造：苏婉（未生成角色妆造三视图）',
      '道具概念图：折扇（未生成道具概念图）'
    ]
  }
}
```
    checkedAt: '2026-06-01T10:35:00Z'
  }
}
```

**用户交互**：
```
⚠️ 资产完整度检查未通过（50%）

缺失资产清单：
1. 角色妆造：苏婉（未生成角色妆造三视图）
   → 跳转到资产分区 > 角色妆造师

2. 道具概念图：折扇（未生成道具概念图）
   → 跳转到资产分区 > 道具生成师

建议：
- 选项A：跳转到资产分区补充缺失资产（推荐）
- 选项B：忽略缺失资产，继续创建剧情卡片（不推荐，后续制作可能受阻）

请选择 A 或 B。
```

---

### 测试用例3：场次不存在

**输入**：
- 分集分场表卡片ID：`episode-scene-table-001`
- 集数：1
- 场数：99（不存在）

**预期输出**：
```
❌ 错误：找不到指定的场次

您指定的场次（第1集-第99场）在分集分场表中不存在。

可用的场次：
第1集：
  - 第1场：林府-大门（白天）
  - 第2场：林府-书房（白天）
  - 第3场：林府-书房（夜晚）
  - 第4场：街道（白天）
  - 第5场：林府-花园（黄昏）

请重新指定集数和场数。
```

---

## 实施检查清单

### 开发前
- [ ] 确认分集分场表卡片字段定义
- [ ] 确认分集分场剧情卡片字段定义
- [ ] 确认资产分区卡片类型（角色妆造、场景概念图、道具概念图）
- [ ] 设计资产查询接口

### 开发中
- [ ] 实现场次信息提取逻辑
- [ ] 实现角色妆造资产检查
- [ ] 实现场景资产检查
- [ ] 实现道具资产检查
- [ ] 实现完整度计算
- [ ] 实现用户交互逻辑（完整/不完整两种情况）
- [ ] 实现卡片创建逻辑
- [ ] 实现上下游连线

### 测试
- [ ] 测试用例1：资产完整（100%）
- [ ] 测试用例2：资产不完整（75%）
- [ ] 测试用例3：场次不存在
- [ ] 测试用例4：分集分场表卡片不存在
- [ ] 测试用例5：多角色多道具场景

### 上线前
- [ ] 用户话术审查
- [ ] 错误提示清晰度检查
- [ ] 性能测试（大量资产查询）
- [ ] 与资产分区skill的集成测试

---

## 注意事项

### 资产查询性能
- 如果角色/道具数量很多，资产查询可能较慢
- 建议使用索引优化查询（按 `characterId`、`sceneLocationId`、`propId`）
- 考虑缓存已查询的资产信息

### 用户体验
- 缺失资产清单应该清晰明了，提供跳转链接
- 如果用户选择"忽略缺失资产"，应在卡片中明确标注，避免后续困惑
- 完整度百分比应该直观（如：75% = 3/4 已完成）

### 边界情况
- 场景没有道具 → 道具检查跳过，不影响完整度
- 角色没有台词 → 不影响资产检查
- 场景是"虚拟场景"（如梦境） → 可能不需要场景概念图，需要特殊处理

### 与其他Skill的协作
- 剧务统筹是制作分区的**入口skill**
- 输出的分集分场剧情卡片是后续所有策略skill的输入
- 资产完整度检查确保后续制作流程顺畅

## 完成后下一步

触发规则：用户提到要做具体某一集/某一场时，应调用 `production-coordinator`。

完成判定：已检查是否存在对应 `EpisodeSceneDetailCard`；没有则创建，有则检查当前分集分场的完成情况，包括资产完整度、导演讲戏、三张策略卡片、故事板和视频状态。

推荐下一步：

- 如果没有 `DirectorBriefingCard.precheck`：调用 `director-briefing` 进行第一次导演预判。
- 如果三张策略卡片未齐：建议补齐缺失的 `scene-strategy-designer`、`performance-strategy-designer`、`cinematography-strategy-designer`。
- 如果三张策略卡片已齐但没有 `StoryboardPlanCard`：调用 `director-briefing` 进行复判与镜头组落版。
- 如果已有 `StoryboardPlanCard` 但没有确认故事板：调用 `storyboard-creator`。
- 如果已有确认故事板但没有视频：调用 `video-creator`。

推荐话术：`我已检查当前分集分场的完成情况。建议下一步处理缺失环节：{缺失项}。`
