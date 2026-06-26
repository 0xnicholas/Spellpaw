---
name: prop-asset-extraction
description: Use when a PropSettingCard must be converted into a PropAssetCard for prop image generation, state variants, and downstream prop concept cards
version: 1.0.0
author: Modo
tags: [ai-short-drama, prop-design, asset-extraction]
---

# 道具资产提取师 Skill

从道具设定卡片生成道具资产卡片，通过推断规则库和用户交互，将概念级描述转化为具体的视觉资产需求。

## 整体工作流

```
输入：PropSettingCard（道具设定卡片，来自创作分区）
可选输入：WorldviewCard（世界观卡片）
可选输入：ArtDirectionCard（美术设定卡片）

阶段1：依赖检查
阶段2：提取继承信息
阶段3：象征意义视觉化转译
阶段4：引导用户补充和确认具体化信息
阶段5：确定生成需求
阶段6：创建道具资产卡片

输出：PropAssetCard（道具资产卡片）
```

---

## 阶段1：依赖检查

**检查项**：
1. 道具设定卡片（必需）
2. 世界观卡片（可选，用于材质/色彩推断）
3. 美术设定卡片（可选，用于风格统一）

**错误处理**：
- 如果道具设定卡片不存在，提示用户先运行 `/script-deconstruct`
- 如果世界观卡片或美术设定卡片不存在，提示用户（但不阻塞流程）

---

## 阶段2：提取继承信息

从道具设定卡片提取所有字段，直接继承到 `PropAssetCard.inheritedInfo`：

```typescript
inheritedInfo: {
  propId: propSettingCard.id,
  propSettingCardId: propSettingCard.id,
  propName: propSettingCard.content.name,
  category: propSettingCard.content.category,
  importance: propSettingCard.content.importance,
  roleInStory: propSettingCard.content.roleInStory,
  basicAppearance: propSettingCard.content.basicAppearance,  // 完整继承结构化字段
  functionality: propSettingCard.content.functionality,
  symbolism: propSettingCard.content.symbolism,
  propStates: propSettingCard.content.propStates,
  keyAppearances: propSettingCard.content.keyAppearances
}
```

**注意**：
- `basicAppearance` 已经是结构化字段（包含 size/materialDetails/colorScheme/visualEffects），正式类型为 `PropBasicAppearance`
- `keyAppearances` 是权威关键出场字段
- 历史字段 `keyMoments` 只能作为 legacy 输入迁移到 `keyAppearances`
- 历史简单外观字段 `size: string`、`material: string`、`color: string` 只能通过 `legacyFieldCompatibility` 记录迁移，不得覆盖结构化字段
- 如果字段中有 `_inferred: true` 标注，保留该标注

---

## 阶段3：象征意义视觉化转译

将抽象的象征意义转化为具体的视觉设计方向。

### 转译规则库

| 象征意义关键词 | 设计方向 | 视觉元素示例 |
|-------------|---------|------------|
| 权力/统治 | 威严感 + 精致感 | 对称构图、金色装饰、复杂纹饰 |
| 忠义/承诺 | 厚重感 + 历史感 | 磨损痕迹、铭文、传承感 |
| 神秘/未知 | 神秘感 + 能量感 | 发光效果、不规则形态、内部结构可见 |
| 生存/资源 | 稀有感 + 价值感 | 晶体质感、发光强度区分等级 |
| 危险/威胁 | 锋利感 + 冷峻感 | 尖锐边缘、冷色调、金属质感 |
| 温暖/希望 | 柔和感 + 亲和感 | 暖色调、圆润形态、自然材质 |

### 转译输出

```typescript
visualTranslation: {
  symbolicDesign: {
    designDirection: string;  // 如："稀有感 + 神秘感 + 能量感"
    symbolicElements: string[];  // 如：["晶体多面体折射光效", "内部能量流动可见", "发光强度区分等级"]
    visualMetaphor: string;  // 如："末世硬通货的价值感 = 晶体质感 + 能量感并存"
  }
}
```

### 转译示例

**输入**（symbolism）：
```json
{
  "meaning": "末世中的权力与生存资源，谁掌握晶核谁掌握末世"
}
```

**输出**（symbolicDesign）：
```json
{
  "designDirection": "稀有感 + 神秘感 + 能量感",
  "symbolicElements": [
    "晶体多面体折射光效（稀有宝石感）",
    "内部能量流动可见（神秘能量感）",
    "发光强度区分等级（普通暗紫 vs 高纯度金色）"
  ],
  "visualMetaphor": "末世硬通货的价值感 = 晶体质感 + 能量感并存"
}
```

---

## 阶段3.5：生成各状态的视觉细节

为每个 propState 生成详细的视觉描述：

```typescript
stateVisuals: Array<{
  stateName: string;
  visualFocus: {
    primary: string[];    // 一级视觉焦点（2-3个核心元素）
    secondary: string[];  // 二级视觉焦点（支撑元素）
  };
  materialDetails: {
    surface: string;      // 从 inheritedInfo.basicAppearance.materialDetails 继承并细化
    texture: string;
    glowEffect?: string;
    particleEffect?: string;
  };
  colorPalette: {
    primary: string;      // 从 inheritedInfo.basicAppearance.colorScheme 继承并细化
    secondary?: string;
    accent?: string;
    grading: string;
  };
  specialEffects?: {
    activationEffect?: string;  // 使用时的特效
    ambientEffect?: string;     // 环境影响
  };
}>
```

**生成规则**：
1. 从 `inheritedInfo.basicAppearance` 继承基础信息
2. 根据 `propStates[].visualCharacteristics` 细化每个状态的差异
3. 为核心道具（core）生成更详细的描述
4. 为支撑道具（supporting）生成简化描述

---

## 阶段4：引导用户补充和确认具体化信息

### 4.1 检查推断结果的完整度

遍历 `inheritedInfo.basicAppearance` 中的所有字段，检查是否有缺失：

| 字段 | 检查条件 | 用户交互 |
|------|---------|---------|
| size.dimensions | 如果为空 | 询问："请补充{道具名称}的具体尺寸（如：约5-8cm直径）" |
| materialDetails.textureDescription | 如果为空 | 询问："请描述{道具名称}的表面纹理（如：多面体切割面/拉丝纹理/自然木纹）" |
| colorScheme.secondary | 如果为空且道具重要性为core | 询问："请补充{道具名称}的辅助色（内部细节色彩）" |
| colorScheme.accent | 如果为空且有发光效果 | 询问："请补充{道具名称}的发光颜色" |
| visualEffects.particleDescription | 如果particles=true但描述为空 | 询问："请描述{道具名称}的粒子效果（如：金色能量粒子环绕）" |

### 4.2 确认推断结果

对于所有标注 `_inferred: true` 的字段，向用户展示推断结果并请求确认：

```
基于道具类别和美术设定，我推断{道具名称}的材质为：
- 材质类型：{type}
- 表面类型：{surfaceType}
- 推断依据：{_inferredFrom}

是否确认？（是/否/修改）
```

**用户响应处理**：
- 用户回答"是" → 标注 `_inferred: false`, `_userConfirmed: true`
- 用户回答"否" → 询问正确值，更新字段，标注 `_inferred: false`, `_userConfirmed: true`
- 用户回答"修改" → 询问修改内容，更新字段，标注 `_inferred: false`, `_userConfirmed: true`

### 4.3 补充展示策略

为每个状态询问展示策略（如果用户未提供）：

```
{道具名称} - {状态名称} 的展示方案：

根据道具类别（{category}），我建议：
- 展示角度：{根据类别推荐的角度}
- 背景方案：{根据重要性推荐的背景}
- 光照方案：{根据道具特性推荐的光照}

是否确认？（是/否/修改）
```

**展示角度推荐规则**（根据道具类别）：
- 武器 → "45度斜侧视，展示整体形态"
- 工具/设备 → "正面全景，展示规模"
- 特殊道具 → "悬浮展示，45度斜侧视，突出神秘感"
- 建筑构件 → "正面全景，展示体量"
- 生活道具 → "45度斜侧视"

**背景方案推荐规则**（根据重要性）：
- core → "纯黑/深色渐变背景，突出道具本身"
- supporting → "场景虚化背景，保留环境感"
- background → "简单场景背景"

**光照方案推荐规则**（根据道具特性）：
- 自发光道具（有visualEffects） → "自发光为主，无额外光源"
- 金属道具 → "三点光（主光+补光+轮廓光），展示金属质感"
- 透明/玻璃道具 → "背光+侧光，展示透明质感"
- 其他道具 → "自然光或场景实际光源"

### 4.4 用户确认标记

所有用户交互完成后，标注：

```json
{
  "userInput": {
    "detailedAppearance": { ... },
    "displayStrategy": { ... },
    "user_confirmed": true
  }
}
```

---

## 阶段5：确定生成需求

根据道具重要性和状态数量自动生成 `generationRequirements`：

### 生成规则

**核心道具（core）**：
```json
{
  "generationRequirements": [
    {
      "stateName": "状态1",
      "priority": 1,
      "imageCount": 3,
      "viewType": "main",
      "description": "主视图，展示道具整体形态",
      "keyFocusElements": ["从visualFocus.primary提取"],
      "aspectRatio": "1:1"
    },
    {
      "stateName": "状态1",
      "priority": 1,
      "imageCount": 1,
      "viewType": "detail",
      "description": "细节特写，展示关键功能部件或材质纹理",
      "keyFocusElements": ["从visualFocus.secondary提取"],
      "aspectRatio": "1:1"
    },
    {
      "stateName": "状态1",
      "priority": 1,
      "imageCount": 1,
      "viewType": "effect",
      "description": "特效视图，展示发光/粒子/使用时特效",
      "keyFocusElements": ["从visualEffects提取"],
      "aspectRatio": "1:1"
    }
  ]
}
```

**支撑道具（supporting）**：
```json
{
  "generationRequirements": [
    {
      "stateName": "状态1",
      "priority": 2,
      "imageCount": 1,
      "viewType": "main",
      "description": "主视图",
      "keyFocusElements": ["从visualFocus.primary提取"],
      "aspectRatio": "1:1"
    }
  ]
}
```

**背景道具（background）**：
```json
{
  "generationRequirements": [
    {
      "stateName": "状态1",
      "priority": 3,
      "imageCount": 1,
      "viewType": "main",
      "description": "主视图",
      "keyFocusElements": ["从visualFocus.primary提取"],
      "aspectRatio": "1:1"
    }
  ]
}
```

### 优先级排序

按首次出现集数排序：
- 第1-10集首次出现 → priority: 1
- 第11-20集首次出现 → priority: 2
- 第21集以后首次出现 → priority: 3

---

## 阶段6：创建道具资产卡片

整合所有信息，生成完整的 `PropAssetCard` JSON。

## PropAssetCard 正式 Schema

```typescript
interface PropBasicAppearance {
  size: {
    category: string;
    reference: string;
    dimensions?: string;
  };
  shape: string;
  materialDetails: {
    type: string;
    surfaceType: string;
    textureDescription?: string;
    specialProperties?: string[];
  };
  colorScheme: {
    primary: string;
    secondary?: string;
    accent?: string;
    mood?: string;
  };
  visualEffects?: {
    glowType?: string;
    glowIntensity?: string;
    glowColor?: string;
    particles?: boolean;
    particleDescription?: string;
    ambientEffect?: string;
  };
  distinctiveFeatures: string[];
}

interface PropAssetCard extends BaseCard {
  cardId: string;
  cardType: "PropAssetCard";
  type: "prop_asset";
  title: string;
  upstreamCards: CardRef[];

  propId: string;
  propName: string;
  propSettingCardId: string;
  sourcePropSchemaVersion: "PropSettingCard.v1";
  legacyFieldCompatibility?: {
    usedLegacyFields: string[];
    ignoredLegacyFields: string[];
    notes: string;
  };

  inheritedInfo: {
    propName: string;
    category: string;
    importance: "core" | "supporting" | "background";
    roleInStory: string;
    basicAppearance: PropBasicAppearance;
    functionality: {
      primaryFunction: string;
      secondaryFunctions?: string[];
      usage: string;
    };
    symbolism?: {
      meaning: string;
      culturalSignificance?: string;
      thematicRole?: string;
    };
    propStates: Array<{
      stateName: string;
      episodeRange?: { start: number; end: number };
      visualCharacteristics: {
        condition: string;
        appearance: string;
        details?: string;
      };
      usedInScenes?: Array<{
        episode: number;
        scene: string;
        usage: string;
      }>;
    }>;
    keyAppearances: Array<{
      episode: number;
      scene: string;
      context: string;
      significance: string;
      emotionalImpact?: string;
    }>;
  };

  visualTranslation: {
    symbolicDesign?: {
      designDirection: string;
      symbolicElements: string[];
      visualMetaphor: string;
    };
    stateVisuals: Array<{
      stateName: string;
      visualFocus: {
        primary: string[];
        secondary: string[];
      };
      materialDetails: {
        surface: string;
        texture: string;
        glowEffect?: string;
        particleEffect?: string;
      };
      colorPalette: {
        primary: string;
        secondary?: string;
        accent?: string;
        grading: string;
      };
      specialEffects?: {
        activationEffect?: string;
        ambientEffect?: string;
      };
    }>;
  };

  userInput: {
    detailedAppearance: {
      size?: string;
      shape?: string;
      surfaceTreatment?: string;
    };
    displayStrategy: Record<string, {
      viewAngle: string;
      background: string;
      lighting: string;
    }>;
    userConfirmed: boolean;
  };

  generationRequirements: Array<{
    stateName: string;
    priority: number;
    imageCount: number;
    viewType: "main" | "detail" | "effect" | "state_comparison" | "multi_view";
    description: string;
    keyFocusElements: string[];
    aspectRatio: "16:9" | "1:1";
  }>;

  downstreamPropCards: CardRef[];
  userConfirmed: boolean;
  stale: boolean;
}
```

**创建规则**：

1. `propId` 优先继承 `PropSettingCard.id`，如有单独实体注册表则使用注册表 ID。
2. `propSettingCardId` 必须指向来源 `PropSettingCard.id`。
3. `sourcePropSchemaVersion` 固定写入当前读取版本。
4. `keyAppearances` 必须读取 `propSettingCard.content.keyAppearances`。
5. 如果输入只有历史 `keyMoments`，迁移到 `keyAppearances` 并写入 `legacyFieldCompatibility.usedLegacyFields`。
6. `generationRequirements[]` 必须由 `importance + propStates + keyAppearances` 共同决定。
7. `downstreamPropCards` 使用 `CardRef[]`，不得再写裸字符串 ID。

---

## 实施检查清单

- [ ] 阶段1：依赖检查完成
- [ ] 阶段2：继承信息提取完成
- [ ] 阶段3：象征意义转译完成，stateVisuals 生成完成
- [ ] 阶段4：用户交互完成，所有推断结果已确认
- [ ] 阶段5：生成需求清单已生成
- [ ] 阶段6：道具资产卡片创建成功

---

**Skill版本**：v1.0  
**创建日期**：2026-05-30  
**测试状态**：待测试

## 完成后下一步

完成判定：`PropAssetCard` 已创建，`PropSettingCard` 来源、结构化外观、状态和生成需求已确认。

完成当前道具资产提取后，优先调用 `prop-generator`，把当前道具资产制作成正式道具图。

如果还有其他道具资产未提取，可继续调用当前 skill；如果用户正在制作某一集/某一场，优先处理该集/场出现的道具。

推荐话术：`当前道具资产已提取完成。建议优先调用 prop-generator 生成并确认这个道具资产，是否继续？`
