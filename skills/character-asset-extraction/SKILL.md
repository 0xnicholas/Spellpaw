---
name: character-asset-extraction
description: Use when a CharacterSettingCard must be converted into a CharacterAssetCard for visual translation, costume requirements, and downstream character image generation
---

# 角色资产提取 Skill

从角色设定卡片（创作分区）提取和转译视觉化信息，创建角色资产卡片（资产分区-中间资产）。

## 整体工作流

```
输入：CharacterCard（角色设定卡片，来自创作分区）
可选输入：WorldviewCard、ArtDirectionCard（用于推断）

阶段1：依赖检查
  检查角色设定卡片是否存在
  检查世界观卡片、美术设定卡片（可选）

阶段2：提取继承信息
  从角色设定卡片读取：
  - 基础信息（姓名、年龄、性别、职业）
  - 性格特征
  - 动机和目标
  - 视觉形态（如果有）

阶段3：视觉化转译
  性格 → 典型表情（5个）
  动机 → 典型动作（5个）
  综合 → 整体气质

阶段4：用户补充物理细节
  展示已转译的信息
  引导用户补充：
  - 物理细节（身高、体型、肤色、面部特征）
  - 发型（样式、颜色、配饰）
  - 服装风格（主要风格、色彩、材质、层次）
  - 配饰（首饰、武器、道具、特殊标志）

阶段5：确定妆造需求
  基于视觉形态确定妆造数量
  为每套妆造命名
  关联到剧集范围

阶段6：创建角色资产卡片
  整合所有信息
  创建卡片
  建立上下游连线

输出：CharacterAssetCard（角色资产卡片）
```

---

## 阶段1：依赖检查

**作用**：确保必需的上游卡片存在。

**检查项**：
1. 角色设定卡片（必需）
2. 世界观卡片（可选，用于推断）
3. 美术设定卡片（可选，用于推断）

**错误处理**：
- 如果角色设定卡片不存在，终止执行并提示用户

---

## 阶段2：提取继承信息

**作用**：从角色设定卡片读取概念级信息。

**提取字段**：
```typescript
interface InheritedInfo {
  characterId: string;
  characterName: string;
  role: 'protagonist' | 'antagonist' | 'supporting' | 'minor';
  sourceCharacterSchemaVersion: "CharacterSettingCard.v1";
  legacyFieldCompatibility?: {
    usedLegacyFields: string[];
    ignoredLegacyFields: string[];
    notes: string;
  };
  biography: {
    age?: string;
    gender?: string;
    occupation?: string;
    socialStatus?: string;
    appearance?: string;
    backstory?: string;
    personalityTraits: string[];
    relationships?: Array<{
      characterId?: string;
      targetCharacter: string;
      relationship: string;
    }>;
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
  visualForms?: Array<{
    formName: string;
    episodeRange: string;
    appearanceChange: string;
    triggerEvent: string;
  }>;
}
```

**提取规则**：
1. 以创作分区 `CharacterSettingCard` 当前正式字段为唯一权威：
   - `content.role`
   - `content.biography.backstory`
   - `content.motivation.surfaceDesire`
   - `content.motivation.deepDesire`
   - `content.motivation.drivingForce`
   - `content.coreConflict.externalConflict`
   - `content.coreConflict.internalConflict`
   - `content.visualForms[].appearanceChange`
2. 不再读取旧字段作为主来源：
   - `biography.background`
   - `motivation.goals`
   - `motivation.fears`
   - `motivation.internalConflict`
   - `visualForms[].description`
3. 如果历史卡片只有旧字段，可进入 `legacyFieldCompatibility`：
   - 旧 `biography.background` 只可迁移为 `biography.backstory`
   - 旧 `motivation.goals[]` 只可作为 `surfaceDesire` 的候选摘要，必须标记为 legacy
   - 旧 `motivation.fears[]` 不得覆盖 `coreConflict.internalConflict`
   - 旧 `visualForms[].description` 只可作为 `appearanceChange` 的候选摘要，必须标记为 legacy
4. 继承信息不得被推断覆盖；推断只能写入视觉化转译或用户补充字段
5. `role` 必须支持 `minor`，旁白、系统声音、纯 VO 角色不应自动进入视觉资产流程

---

## 阶段3：视觉化转译

**重要原则**：
1. **分形态转译**：如果角色设定卡片中有多个视觉形态（visualForms），必须为每个形态分别转译表情、动作和气质
2. **性格差异识别**：不同形态的性格特质可能不同（如：前世懦弱 vs 重生后冷酷），转译时需基于各形态的性格状态
3. **避免矛盾**：确保每个形态的表情、动作与该形态的性格特质一致

### Step 1：识别视觉形态

检查角色设定卡片中的 `visualForms` 字段：
- 如果存在多个形态，提取每个形态的性格状态描述
- 如果没有该字段，按单一形态处理

### Step 2：性格 → 典型表情（分形态）

**作用**：将抽象的性格特征转译为具体的面部表情。

**转译规则库**：

| 性格特征 | 表情名称 | 表情描述 | 触发场景 | 置信度 |
|---------|---------|---------|---------|--------|
| 重情义 | 关切注视 | 眉头微微上扬，眼神温柔而专注，嘴角带着淡淡微笑 | 关心团队成员时 | 0.9 |
| 有担当 | 坚定凝视 | 眉头舒展，眼神坚定有力，嘴角紧抿 | 面对危机、做决策时 | 0.9 |
| 腹黑 | 冷笑 | 嘴角微微上扬，眼神冰冷而锐利，带着嘲讽 | 面对敌人时 | 0.85 |
| 温柔 | 温柔微笑 | 眉眼弯弯，嘴角自然上扬，眼神柔和温暖 | 与亲近之人交流时 | 0.9 |
| 责任感 | 沉思凝神 | 眉头微皱，眼神深邃，目光略微下垂 | 分析局势、规划时 | 0.85 |
| 冷静 | 平静注视 | 面部放松，眼神沉稳，不露声色 | 处理突发事件时 | 0.9 |
| 果断 | 锐利目光 | 眉头紧锁，眼神锐利，嘴角紧抿 | 做出重要决定时 | 0.85 |
| 善良 | 柔和微笑 | 眉眼舒展，嘴角温和上扬，眼神充满关怀 | 帮助他人时 | 0.9 |
| 警觉 | 警惕扫视 | 眉头微皱，眼神锐利，快速扫视周围 | 感知危险时 | 0.85 |
| 自信 | 自信微笑 | 嘴角上扬，眼神坚定，充满自信 | 展示能力时 | 0.9 |
| 懦弱 | 无助迷茫 | 眉头紧皱，眼神空洞无光，嘴角下垂 | 被压榨、被威胁时 | 0.9 |
| 恐惧 | 恐惧惊慌 | 眼睛瞪大，瞳孔收缩，嘴唇微张 | 面对危险时 | 0.9 |
| 疲惫 | 疲惫麻木 | 眼皮下垂，面部松弛，眼神涣散 | 过度劳累时 | 0.85 |
| 掌控 | 傲慢俯视 | 眼神居高临下，嘴角带着轻蔑的笑 | 展示权力时 | 0.9 |

**转译流程（多形态版）**：
1. 遍历每个视觉形态
2. 提取该形态对应的性格特征（从 `appearanceChange`、`triggerEvent` 或性格弧光推断）
3. 对每个性格特征，查找转译规则库
4. 如果找到匹配规则，生成对应的表情
5. 如果表情不足5个，添加"中性表情"或该形态最相关的表情
6. 标注每个表情的来源（inherited/inferred）、置信度和所属形态

**输出格式**：
```typescript
interface TypicalExpression {
  visualForm: string;  // 所属视觉形态
  expressionName: string;
  description: string;
  trigger: string;
  basedOnTrait: string;
  confidence: number;
  source: 'inherited' | 'inferred';
}
```

### Step 3：动机 → 典型动作（分形态）

**作用**：将抽象的动机和目标转译为具体的肢体动作。

**转译规则库**：

| 动机关键词 | 动作名称 | 动作描述 | 触发场景 | 置信度 |
|-----------|---------|---------|---------|--------|
| 保护 | 护在身前 | 张开双臂，身体前倾，眼神坚定 | 保护团队时 | 0.9 |
| 领导 | 指挥手势 | 手势简洁有力，充满掌控感 | 领导团队时 | 0.9 |
| 思考/策略 | 沉思 | 单手托腮或抚摸下巴，眼神专注 | 分析局势时 | 0.85 |
| 战斗 | 战斗姿态 | 身体微微前倾，重心下沉，双手握拳或持武器 | 面对敌人时 | 0.9 |
| 安慰 | 轻拍肩膀 | 伸手轻拍对方肩膀，眼神温柔 | 安慰他人时 | 0.85 |
| 警戒 | 警戒姿态 | 身体紧绷，手放在武器上，眼神扫视 | 感知危险时 | 0.9 |
| 交涉 | 摊手手势 | 双手摊开，掌心向上，表示诚意 | 谈判时 | 0.85 |
| 拒绝 | 摆手 | 手掌向外推，表示拒绝或否定 | 拒绝请求时 | 0.85 |

**转译流程**：
1. 遍历角色的动机和目标列表
2. 提取关键词（如"保护"、"领导"、"战斗"）
3. 对每个关键词，查找转译规则库
4. 如果找到匹配规则，生成对应的动作
5. 结合性格特征补充动作（如"责任感"→"沉思"）
6. 选取最相关的4-5个动作
7. 标注每个动作的来源和置信度

**输出格式**：
```typescript
interface TypicalAction {
  actionName: string;
  description: string;
  trigger: string;
  basedOnMotivation: string;
  confidence: number;
  source: 'inherited' | 'inferred';
}
```

### Step 3：综合 → 整体气质

**作用**：基于性格和动机，推断角色的整体气质。

**推断规则**：

**姿态（posture）**：
- 有担当/领导 → "挺拔自信，身体挺直，重心稳固"
- 谨慎/内向 → "略微收敛，肩膀微微内扣"
- 默认 → "自然放松，姿态舒展"

**步态（gait）**：
- 果断/军人 → "步伐坚定有力，节奏稳定"
- 优雅/贵族 → "步态轻盈优雅，动作流畅"
- 默认 → "步伐自然，节奏适中"

**手势风格（gestureStyle）**：
- 有担当/果断 → "手势简洁有力，充满掌控感"
- 温柔/细腻 → "手势柔和细腻，动作轻柔"
- 默认 → "手势自然，动作适度"

**眼神特征（eyeCharacteristics）**：
- 锐利/警觉 → "眼神锐利而深邃，充满压迫感"
- 温柔/善良 → "眼神柔和温暖，充满关怀"
- 默认 → "眼神平静自然，略带深邃"

**输出格式**：
```typescript
interface OverallAura {
  posture: string;
  gait: string;
  gestureStyle: string;
  eyeCharacteristics: string;
  emotionalTone?: string;
  confidence: number;
  source: 'inferred';
}
```

---

## 阶段4：用户补充物理细节

**作用**：引导用户补充具体的物理细节，完成从概念级到具体级的转换。

**重要原则**：
1. **先给建议，再确认**：不要让用户从空白开始填写，而是基于角色设定、美术设定和剧本逻辑给出完整建议方案
2. **分形态组织**：如果角色有多个视觉形态，必须分别为每个形态补充物理细节（发型、服装、配饰）
3. **参考美术设定**：服装色彩方案必须参考美术设定卡片中的色彩系统和人物服装材质指导
4. **交互自然**：避免机械式的表单填写，用自然的对话方式呈现建议

### Step 1：展示已转译的信息

向用户展示（分形态）：
1. 每个形态的典型表情（5个）
2. 每个形态的典型动作（4-5个）
3. 每个形态的整体气质

每条信息都标注：
- 所属视觉形态
- 来源（inherited/inferred）
- 置信度（0-1）
- 基于的性格特征或动机

### Step 2：给出物理细节建议（分形态）

**Step 2.1：读取美术设定**

在给出建议前，先读取美术设定卡片（如果有）：
- 色彩系统（主色调、色彩对比策略）
- 人物服装材质指导
- 分场景视觉指导

**Step 2.2：为每个形态给出完整建议**

对于每个视觉形态，给出：

**物理细节（physicalDetails）**：
- 身高、体型、肤色、面部特征（眉毛、眼睛、鼻梁、嘴唇、轮廓、胡须）
- 基于角色设定的外形描述推断
- 标注推断理由

**发型（hairstyle）**：
- 样式、颜色、配饰
- 基于该形态的性格状态和场景定位推断
- 标注推断理由

**服装风格（costumeStyle）**：
- 主要风格、色彩方案、材质、层次、细节
- **色彩方案必须参考美术设定**（如：海底基地场景用深蓝+暖色，末世外界用冷灰+灰绿）
- **材质必须参考美术设定**（如：棉质、针织、高档面料）
- 标注推断理由

**配饰（accessories）**：
- 首饰、武器、道具、特殊标志
- 基于角色设定中的标志性元素和该形态的社会地位推断
- 标注推断理由

**示例格式**：
```
### 形态1：前世林渊（第1集回忆）

**场景定位**：末世前都市职场社畜，被压榨、被背叛的懦弱状态

#### 物理细节
**身高**：中等偏高（175-180cm）
...

#### 发型
**我的建议**：
- 样式：普通短发，略显凌乱，刘海略微遮眉
- 颜色：黑色
- 配饰：无

**理由**：符合职场社畜的疲惫状态，没有精力打理形象

#### 服装风格
**我的建议**（基于美术设定-末世前都市色调）：
- 主要风格：职业装（衬衫西裤）
- 色彩方案：灰色衬衫+黑色西裤+深灰色领带（符合美术设定的"中性灰、日常服装色"）
- 材质：普通棉质面料，略显皱褶
...

**理由**：灰色系符合美术设定中"末世前都市"的平淡压抑基调

#### 配饰
**我的建议**：
- 首饰：廉价塑料表带手表（或无）
- 武器：无
...

**理由**：符合底层社畜的经济状况
```

### Step 3：用户确认机制

对于所有推断信息（source='inferred'且confidence<0.9），询问用户确认：
```
以下信息是基于角色设定推断的，请确认是否准确：

1. 表情"关切注视"：眉头微微上扬，眼神温柔而专注，嘴角带着淡淡微笑
   - 基于性格：重情义
   - 置信度：90%
   - 是否准确？（是/否/修改）

2. 动作"护在身前"：张开双臂，身体前倾，眼神坚定
   - 基于动机：保护团队
   - 置信度：90%
   - 是否准确？（是/否/修改）

...
```

用户可以：
- 确认（保持原样）
- 否定（删除该项）
- 修改（提供新的描述）

修改后的信息标注为 `source='user_provided'`，`confidence=1.0`

---

## 阶段5：确定妆造需求

**作用**：基于视觉形态确定需要生成的妆造数量和清单。

### Step 1：基于视觉形态确定妆造

如果角色设定卡片中有 `visualForms` 字段：
```typescript
visualForms: [
  { formName: "前世将军", episodeRange: "1-5", appearanceChange: "...", triggerEvent: "..." },
  { formName: "现世商人", episodeRange: "6-10", appearanceChange: "...", triggerEvent: "..." },
  { formName: "末世大佬", episodeRange: "11-20", appearanceChange: "...", triggerEvent: "..." }
]
```

则为每个视觉形态创建一个妆造需求：
```typescript
costumeRequirements: [
  { costumeId: "costume_linyuan_past_general", costumeName: "前世将军", formName: "前世将军", episodeRange: "1-5", sceneIds: [], appearanceChange: "...", triggerEvent: "...", baseOnForm: "前世将军" },
  { costumeId: "costume_linyuan_modern_merchant", costumeName: "现世商人", formName: "现世商人", episodeRange: "6-10", sceneIds: [], appearanceChange: "...", triggerEvent: "...", baseOnForm: "现世商人" },
  { costumeId: "costume_linyuan_apocalypse_leader", costumeName: "末世大佬", formName: "末世大佬", episodeRange: "11-20", sceneIds: [], appearanceChange: "...", triggerEvent: "...", baseOnForm: "末世大佬" }
]
```

如果没有 `visualForms` 字段，创建一个默认妆造：
```typescript
costumeRequirements: [
  { costumeId: "costume_default", costumeName: "默认妆造", formName: "默认形态", episodeRange: "全剧", sceneIds: [], appearanceChange: "无明确形态变化", triggerEvent: "默认创建", baseOnForm: null }
]
```

### Step 2：用户确认妆造清单

向用户展示妆造清单：
```
## 妆造需求清单

我已经为角色 **林渊** 确定了以下妆造需求：

1. **前世将军**
   - 剧集范围：1-5集
   - 描述：古代战袍，深红色+黑色，束发冠

2. **现世商人**
   - 剧集范围：6-10集
   - 描述：现代西装，深蓝色+白色衬衫

3. **末世大佬**
   - 剧集范围：11-20集
   - 描述：深色夹克+深色裤子+战术靴

---

请确认以上妆造清单是否正确，如需修改请说明。
```

用户可以：
- 确认（保持原样）
- 修改（调整妆造名称、剧集范围、描述）
- 增加（添加新的妆造）
- 删除（移除某个妆造）

---

## 阶段6：创建角色资产卡片

**作用**：整合所有信息，创建角色资产卡片。

**卡片结构**：
```typescript
interface CharacterAssetCard extends BaseCard {
  type: 'character_asset';
  title: string;  // 如："林渊 - 角色资产"
  upstreamCards: CardRef[];
  
  content: {
    characterId: string;
    characterName: string;
    role: 'protagonist' | 'antagonist' | 'supporting' | 'minor';
    sourceCharacterSchemaVersion: "CharacterSettingCard.v1";
    legacyFieldCompatibility?: {
      usedLegacyFields: string[];
      ignoredLegacyFields: string[];
      notes: string;
    };
    
    inheritedFromCharacter: InheritedInfo;
    
    visualTranslation: {
      typicalExpressions: TypicalExpression[];
      typicalActions: TypicalAction[];
      overallAura: OverallAura;
    };
    
    userInput: {
      physicalDetails: PhysicalDetails;
      hairstyle: Hairstyle;
      costumeStyle: CostumeStyle;
      accessories: Accessories;
    };
    
    costumeRequirements: Array<{
      costumeId: string;
      costumeName: string;
      formName: string;
      episodeRange: string;
      sceneIds: string[];
      appearanceChange: string;
      triggerEvent: string;
      baseOnForm: string | null;
      userConfirmed: boolean;
    }>;
    
    downstreamCostumeCards: CardRef[];  // 角色妆造三视图卡片引用列表
  };
}
```

**创建流程**：
1. 生成唯一的卡片ID
2. 整合所有信息到卡片结构
3. 保存卡片到画布
4. 创建上下游连线（角色设定卡片 → 角色资产卡片）
5. 返回创建的卡片

---

## 假设标注规范

所有推断信息必须标注来源和置信度：

```typescript
type InformationSource = 
  | 'inherited'        // 从上游卡片继承
  | 'inferred'         // 基于规则推断
  | 'user_provided'    // 用户直接提供
  | 'default';         // 默认值

interface InformationWithSource {
  value: any;
  source: InformationSource;
  confidence: number;  // 0-1，置信度
  basedOn?: string;    // 基于什么信息推断
}
```

**置信度计算**：
- inherited: 1.0（继承信息100%可信）
- user_provided: 1.0（用户提供100%可信）
- inferred: 0.8-0.9（推断信息80-90%可信，取决于规则的准确性）
- default: 0.5（默认值50%可信）

---

## 错误处理

### 错误1：角色设定卡片不存在
```
错误：角色设定卡片不存在
解决方案：请先使用 /script-deconstruct 创建角色设定卡片
```

### 错误2：性格特征为空
```
警告：角色设定卡片中没有性格特征
解决方案：使用默认表情，引导用户补充性格特征
```

### 错误3：动机为空
```
警告：角色设定卡片中没有动机信息
解决方案：使用默认动作，引导用户补充动机
```

---

## 测试用例

### 测试用例1：林渊（完整信息）

**输入**：
- 角色设定卡片：林渊
  - 性格：重情义、有担当、腹黑（对敌）、温柔（对团队）、责任感
  - 动机：保护团队、生存策略、复仇
  - 视觉形态：前世将军、现世商人、末世大佬

**预期输出**：
- 角色资产卡片：林渊
  - 典型表情：关切注视、坚定凝视、冷笑、温柔微笑、沉思凝神
  - 典型动作：护在身前、沉思、御尸术手势、指挥手势
  - 妆造需求：3套（前世将军、现世商人、末世大佬）

### 测试用例2：沈知夏（部分信息）

**输入**：
- 角色设定卡片：沈知夏
  - 性格：善良、坚强、温柔
  - 动机：保护家人
  - 视觉形态：无

**预期输出**：
- 角色资产卡片：沈知夏
  - 典型表情：柔和微笑、坚定凝视、温柔微笑、关切注视、中性表情
  - 典型动作：护在身前、轻拍肩膀、安慰手势、默认动作
  - 妆造需求：1套（默认妆造）

---

## 实施检查清单

执行本Skill时，请按以下顺序检查：

- [ ] 阶段1：依赖检查完成，角色设定卡片存在
- [ ] 阶段2：继承信息提取完成，所有字段已读取
- [ ] 阶段3：视觉化转译完成
  - [ ] 典型表情：5个
  - [ ] 典型动作：4-5个
  - [ ] 整体气质：已生成
- [ ] 阶段4：用户补充完成
  - [ ] 物理细节：已补充
  - [ ] 发型：已补充
  - [ ] 服装风格：已补充
  - [ ] 配饰：已补充
  - [ ] 所有推断信息已确认
- [ ] 阶段5：妆造需求确定，用户已确认
- [ ] 阶段6：角色资产卡片创建成功
  - [ ] 卡片ID已生成
  - [ ] 所有字段已填充
  - [ ] 上下游连线已建立

---

**Skill版本**：v1.0  
**创建日期**：2026-05-29  
**测试状态**：已通过林渊角色测试

## 完成后下一步

完成判定：`CharacterAssetCard` 已创建，角色视觉转译、物理细节和妆造需求已确认。

完成当前角色资产提取后，优先调用 `character-costume-designer`，把当前角色资产制作成正式 `CharacterCostumeCard`。

如果还有其他角色资产未提取，可继续调用当前 skill；如果用户正在制作某一集/某一场，优先处理该集/场出场角色。

推荐话术：`当前角色资产已提取完成。建议优先调用 character-costume-designer 制作这个角色的妆造三视图，是否继续？`
