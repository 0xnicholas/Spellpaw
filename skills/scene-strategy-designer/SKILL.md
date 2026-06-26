---
name: scene-strategy-designer
description: Use when an EpisodeSceneDetailCard and DirectorBriefingCard need a scene strategy based on a confirmed SceneAssetCard.selectedVisual
---

# 现场设计 (Scene Strategy Designer)

根据分集分场剧情卡片、导演讲戏卡片的预判指令、场景资产卡片（含已确认的 `selectedVisual`）、美术设定卡片，设计场景的光照方案、色调氛围、角色站位，生成带有光照效果和角色站位标注的场景效果图。

**核心逻辑**：基于 `SceneAssetCard.selectedVisual` 中已确认的场景图，叠加剧情所需的光照设计和角色站位标注，而不是从零生成新场景。

**本skill是唯一生成图片的策略skill**，采用两阶段生成：先生成场景效果图（场景全景图+光照效果），再讨论并标注角色站位。

---

## Reference Routing

本skill的场景、灯光、空间和氛围规则放在 `references/`，按需读取：

- 光源动机、灯光层级、光线词汇：读取 `references/lighting-vocabulary.md`。
- 空间站位、轴线前置、动作路径、场景参考图类型：读取 `references/spatial-blocking-reference.md`。
- 色彩叙事、氛围词汇、场景负面约束：读取 `references/color-atmosphere-vocabulary.md`。

使用原则：reference用于约束场景策略和生图提示词，不要机械输出所有灯光层级或所有站位字段；按导演预判结构选择最必要的场景控制点。

---

## 整体工作流

```
前提条件：`SceneAssetCard.selectedVisual` 已在资产分区生成并确认 ✅
输入：分集分场剧情卡片 + 导演讲戏卡片（precheck）+ 场景资产卡片（含 `selectedVisual`）+ 美术设定卡片
  ↓
阶段1：分析上游信息
  - 读取剧情卡片（visualDescription、sceneElements、emotion、rhythm）
  - 读取导演讲戏卡片（primaryStructure、preliminaryShotGroupPlan、strategyDirectives.scene）⭐
  - 读取场景资产卡片（场景描述、光影方案、`selectedVisual.image` / `selectedVisual.panoramaImage`） ⭐ 关键
  - 读取美术设定卡片（视觉风格、色彩系统）
  ↓
阶段2：设计光照方案
  - 根据情绪基调选择光照类型
  - 根据时间（日/夜）确定光照强度
  - 确定打光方向和色温
  ↓
阶段3：设计色调和氛围
  - 根据美术设定选择主色调
  - 根据情绪选择强调色
  - 描述整体氛围
  ↓
阶段4：设计角色站位（基于剧情推断）
  - 根据visualDescription推断角色位置
  - 根据characterStates推断角色姿态
  - 确定前景/中景/后景关系
  - ⚠️ 与用户讨论确认推断的站位（必须）
  ↓
阶段5：生成场景效果图（第一阶段）⭐ 核心差异
  - 创建场景策略卡片（包含光照、色调、氛围、角色站位设计）
  - 与用户讨论确认所有推断内容（尤其是角色站位）
  - 生成提示词（基于场景全景图 + 叠加光照调整）
  - 展示提示词给用户确认/修改
  - 调用图像生成模型（GPT-Image-2优先），要求：
    * 使用场景全景图作为基础参考
    * 调整光照效果以匹配剧情情绪
    * 保持场景结构与全景图高度一致
  - 用户确认效果图
  ↓
阶段6：标注角色站位（第二阶段）
  - 在效果图上标注角色站位（数字或文字标注）
  - 用户可以调整站位
  - 更新场景策略卡片（添加带标注的效果图URL）
  ↓
输出：场景策略卡片（含场景效果图和角色站位标注图）
```

---

## ⚠️ 关键区别说明

### Scene Generator vs Scene Strategy Designer

| 维度 | Scene Generator（资产分区） | Scene Strategy Designer（制作分区） |
|------|----------------------------|-----------------------------------|
| **任务定位** | 生成场景资产 | 基于场景资产设计拍摄策略 |
| **输入** | 场景资产卡片（文字描述） | 剧情卡片 + 场景资产卡片（含 `selectedVisual`） |
| **输出** | 场景全景图（空置、无人、标准光照） | 场景效果图（全景图+光照调整+站位标注） |
| **场景内容** | 纯净场景，无角色 | 场景+角色站位标注 |
| **光照设计** | 标准光照方案 | 根据剧情情绪调整光照 |
| **生成逻辑** | 从零生成新场景 | 基于已有全景图叠加效果 |

### 工作流衔接

```
资产分区：
├─ 场景资产卡片创建 → scene-asset-extraction skill
└─ 场景全景图生成 → scene-generator skill
       ↓
制作分区：
└─ 场景效果图生成 → scene-strategy-designer skill（本skill）
     基于全景图 + 叠加光照 + 标注站位
```

---

## 阶段1：分析上游信息

### 1.1 读取分集分场剧情卡片

**目标**：获取场景的视觉描述、元素、情绪、节奏信息

**输入**：
- `episodeNumber`：集数
- `sceneNumber`：场次编号（如："1-1A"）

**执行逻辑**：
1. 根据 `episodeNumber` 和 `sceneNumber` 定位剧情卡片
2. 提取以下字段：
   - `visualDescription`：详细的视觉描述数组
   - `sceneElements`：场景视觉元素（environment、characterStates、objects、lighting、atmosphere）
   - `cameraInfo`：镜头信息
   - `emotion`：情绪基调
   - `emotionIntensity`：情绪强度（1-10）
   - `rhythm`：节奏（fast/medium/slow）
   - `location`：场景位置
   - `timeOfDay`：时间（日/夜）
   - `lighting`：光照类型（自然光/人工光）

**输出示例**：
```typescript
{
  visualDescription: [
    { sequence: 1, content: "水面翻涌，洪水淹没陆地...", type: "environment" },
    { sequence: 2, content: "在一只巨型丧尸的指挥下，尸潮从水下涌来...", type: "action" }
  ],
  sceneElements: {
    environment: ["水面翻涌", "洪水淹没陆地", "远处楼群只剩楼顶"],
    characterStates: [
      { character: "战士", state: "站在浮岛城墙上，举枪拼死抵抗" }
    ],
    objects: ["浮岛城墙", "枪", "浮桥"],
    lighting: "海底酒店亮着灯光"
  },
  emotion: "震撼、压迫感、末世惨烈",
  emotionIntensity: 8,
  rhythm: "fast"
}
```

### 1.1.5 读取导演讲戏卡片（CRITICAL）

**目标**：获取导演预判对场景策略的约束，避免场景策略独立发散。

**输入**：
- `directorBriefingCardId`：由制作分区流程在分集分场剧情卡片后创建

**必须提取**：
- `precheck.primaryStructure`：主结构
- `precheck.secondaryStructure`：辅助结构
- `precheck.preliminaryShotGroupPlan`：镜头组粗拆
- `precheck.strategyDirectives.scene`：场景策略设计指令

**执行规则**：
1. 场景布光、站位和预览图必须服务导演预判结构。
2. 如果主结构是 `dialogue_cross_cutting`，优先确定轴线、坐位/站位、视线方向和可切反应角度。
3. 如果主结构是 `close_up_micro_expression`，场景策略应压缩背景复杂度，突出光源、面部可读性和情绪氛围。
4. 如果主结构是 `continuous_action` 或 `fight_choreography`，必须明确起点、终点、动作路径、障碍物和可撞击/互动的环境锚点。
5. 如果主结构是 `sequential_split`，每个镜头组的首尾空间状态要能被尾帧锚点继承。

**输出到场景策略卡片**：
```typescript
directorBriefingCardId: string;
directorPrecheckSnapshot: {
  primaryStructure: SceneStructureType;
  secondaryStructure?: SceneStructureType;
  sceneDirective: string;
  preliminaryShotGroupPlan: Array<{
    groupNumber: number;
    corePurpose: string;
    tentativeDuration: string;
  }>;
}
```

### 1.2 读取场景资产卡片

**目标**：获取已确认场景视觉引用（必需）、光影方案、材质细节

**输入**：
- `sceneId`：从剧情卡片的 `sceneLocationId` 字段获取

**执行逻辑**：
1. 根据 `sceneId` 定位场景资产卡片
2. 提取以下字段：
   - `selectedVisual.image`：已确认场景概念图（必需）⭐
   - `selectedVisual.panoramaImage`：已确认全景图（可选，优先用于需要空间环视或多角度一致性的场次）
   - `lightingSolution`：光影方案（光源类型、光照强度、色温）
   - `colorSolution`：色彩方案（主色调、强调色）
   - `materialDetails`：材质细节

**前置检查（CRITICAL）**：
- ⚠️ 如果 `selectedVisual` 不存在，**必须停止工作**
- ⚠️ 如果 `selectedVisual.userConfirmed === true` 不成立，**必须停止工作**
- ⚠️ 如果 `selectedVisual.stale === true`，**必须停止工作**
- 提示用户："场景视觉图未确认，请先使用 scene-generator skill 在资产分区生成并确认场景图"
- 场景策略设计必须基于 `SceneAssetCard.selectedVisual`，不能从零生成场景
- 不得读取 scenePanoramaUrl；该字段不是当前契约的一部分
- 不得绕过 `selectedVisual` 从 `SceneConceptCard.imageVersions[]` 随机挑图

### 1.3 读取美术设定卡片

**目标**：获取全剧的视觉风格、色彩系统、光影系统

**执行逻辑**：
1. 读取美术设定卡片
2. 提取以下字段：
   - `visualStyle.artStyle`：美术风格（如：末世写实风格）
   - `colorSystem.emotionMapping`：情绪-色彩映射表
   - `lightingSystem.moodMapping`：情绪-光影映射表
   - `compositionPrinciples`：构图原则

**输出示例**：
```typescript
{
  visualStyle: {
    artStyle: "末世写实风格",
    keywords: ["压迫感", "末世惨烈", "视觉反差"]
  },
  colorSystem: {
    emotionMapping: {
      "震撼": { primary: "冷灰色", accent: "暗红色" },
      "压迫感": { primary: "深蓝色", accent: "铁灰色" }
    }
  }
}
```

---

## 阶段2：设计光照方案

### 2.1 选择光照类型

**推断规则**：

| 条件 | 光照类型 |
|------|----------|
| `timeOfDay` = "日" + `lighting` = "自然光" | natural（自然光） |
| `timeOfDay` = "夜" + `lighting` = "人工光" | artificial（人工光） |
| `timeOfDay` = "日" + `lighting` = "人工光" | mixed（混合光） |
| `sceneElements.lighting` 存在 | 参考lighting描述 |

**示例**：
```typescript
// 输入：timeOfDay = "日", lighting = "自然光"
// 输出：
{
  type: "natural",
  description: "自然日光从上方照射，模拟海面反射的散射光"
}
```

### 2.2 确定光照强度

**推断规则**：

| 条件 | 光照强度 |
|------|----------|
| `emotionIntensity` >= 8 | strong（强光） |
| `emotionIntensity` 5-7 | medium（中等） |
| `emotionIntensity` < 5 | weak（弱光） |
| `emotion` 包含"压迫感"/"恐怖" | weak（弱光，营造压迫感） |

### 2.3 确定打光方向和色温

**推断规则**：

| 情绪类型 | 打光方向 | 色温 |
|----------|----------|------|
| 震撼、压迫感 | 顶光/侧光 | cool（冷色） |
| 温馨、欢快 | 正面光 | warm（暖色） |
| 神秘、诡异 | 逆光/底光 | cool（冷色） |
| 日常、平静 | 侧光 | neutral（中性） |

**输出示例**：
```typescript
{
  type: "natural",
  position: "画面上方",
  direction: "顶光",
  intensity: "medium",
  colorTemperature: "cool",
  description: "自然日光从上方照射，模拟海面反射的散射光，形成冷峻的顶光效果，营造末世压迫感"
}
```

---

## 阶段3：设计色调和氛围

### 3.1 选择主色调

**推断规则**：
1. 从美术设定的 `emotionMapping` 中查找匹配的情绪
2. 如果找到匹配，使用映射的主色调
3. 如果未找到，使用默认规则：

| 情绪类型 | 主色调 |
|----------|--------|
| 震撼、压迫感 | 冷灰色/深蓝色 |
| 温馨、欢快 | 暖黄色/橙色 |
| 神秘、诡异 | 紫色/暗绿色 |
| 悲伤、绝望 | 深灰色/黑色 |

### 3.2 选择强调色

**推断规则**：
1. 根据 `visualDescription` 中的关键元素选择
2. 例如："海底酒店亮着灯光" → 暖黄色作为强调色
3. 强调色应与主色调形成对比

### 3.3 描述整体氛围

**推断规则**：
1. 融合 `emotion`、`emotionIntensity`、`rhythm`
2. 参考 `visualDescription` 中的氛围描述
3. 确定紧张度：
   - `emotionIntensity` >= 8 → high
   - 5-7 → medium
   - < 5 → low

**输出示例**：
```typescript
{
  colorScheme: {
    dominantColor: "#2C3E50",
    dominantColorName: "冷峻深蓝",
    accentColor: "#FFA500",
    accentColorName: "暖橙色（海底酒店灯光）",
    mood: "冷峻压抑",
    description: "以冷峻深蓝为主色调，营造末世压迫感；海底酒店的暖橙色灯光作为强调色，形成强烈视觉反差"
  },
  atmosphere: {
    mood: "震撼、压迫、末世惨烈",
    tension: "high",
    visualStyle: "末世写实风格，水面翻涌，尸潮围攻浮岛，镜头沉入海底揭示海底基地的视觉反差。冷峻的深蓝色调营造压迫感，海底酒店的暖光形成希望的隐喻。快节奏剪辑，强化末世惨烈的震撼感。"
  }
}
```

---

## 阶段4：设计角色站位

### 4.1 推断角色位置

**推断规则**：
1. 从 `visualDescription` 中提取角色相关的描述
2. 从 `sceneElements.characterStates` 中提取角色状态
3. 推断角色的景深位置：

| 描述关键词 | 景深位置 |
|-----------|----------|
| "近景"/"特写"/"面前" | foreground（前景） |
| "中景"/"站立"/"对话" | midground（中景） |
| "远景"/"背景"/"远处" | background（后景） |

### 4.2 推断角色姿态

**推断规则**：
1. 直接从 `characterStates[].state` 提取姿态描述
2. 补充动作细节（根据emotion和rhythm）

**示例**：
```typescript
// 输入：
characterStates: [
  { character: "战士", state: "站在浮岛城墙上，举枪拼死抵抗" }
]

// 输出：
characterPositions: [
  {
    characterId: "战士-群体",
    characterName: "战士",
    position: {
      depth: "midground",
      relativePosition: "画面中景，浮岛城墙上",
      facing: "facing_camera"
    },
    posture: "站立，举枪射击",
    action: "拼死抵抗尸潮"
  }
]
```

### 4.3 确定前景/中景/后景关系

**推断规则**：
1. 根据 `visualDescription` 的 sequence 顺序确定视觉层次
2. sequence 越小，越靠近前景
3. 确保至少有2个景深层次

**输出示例**：
```typescript
characterPositions: [
  {
    characterId: "zombie-001",
    characterName: "巨型丧尸",
    position: {
      depth: "foreground",
      relativePosition: "画面前景，水下",
      facing: "facing_camera"
    },
    posture: "指挥姿态",
    action: "指挥尸潮攻击"
  },
  {
    characterId: "soldier-group",
    characterName: "战士群体",
    position: {
      depth: "midground",
      relativePosition: "画面中景，浮岛城墙上",
      facing: "facing_camera"
    },
    posture: "战斗姿态",
    action: "举枪射击"
  }
]
```

---

## 阶段5：生成场景效果图（第一阶段）

### 5.0 创建场景策略卡片并与用户确认（CRITICAL）⭐

**用户交互流程**（在生成提示词之前）：

1. **创建场景策略卡片草稿**
   - 包含阶段2-4设计的所有内容：光照方案、色调方案、氛围、角色站位
   - 标记状态为 `draft`

2. **向用户展示并讨论推断内容**
   ```
   【场景策略卡片已创建 - 需要您的确认】
   
   卡片位置：[文件路径]
   
   ⚠️ 需要重点讨论的推断内容：
   
   1. 角色站位问题（最关键）
      - [列出每个角色的推断站位]
      - [标注不确定的地方，询问用户]
   
   2. 构图与纵深问题
      - [描述推断的构图方案]
      - [询问用户确认]
   
   3. 视觉焦点问题
      - [列出可能的焦点选项]
      - [询问用户希望强调什么]
   
   请提供反馈：
   A. 全部确认
   B. 具体修改（告诉我需要调整的部分）
   C. 整体调整（描述您心目中的画面）
   ```

3. **根据用户反馈调整卡片**
   - 更新角色站位
   - 调整构图方案
   - 修改视觉焦点
   - 更新卡片状态为 `confirmed`

4. **确认后进入提示词生成阶段**
   - 只有在用户确认后，才生成提示词
   - 基于确认后的卡片内容生成提示词

### 5.1 生成提示词

**前提条件**：
- 场景全景图已存在 ✅
- 场景策略卡片已与用户确认 ✅

**提示词核心逻辑**：
- 基于已有的场景全景图
- 要求AI调整光照效果（而不是生成新场景）
- 保持场景结构与全景图高度一致

**提示词结构**：
```
基于已有场景图的光照调整提示词：

[参考场景描述：从场景资产卡片提取] + 
[光照调整方案：阶段2设计] + 
[色调调整：阶段3设计] + 
[氛围强化：阶段3设计] + 
[质量标签]

⚠️ 重要约束：
- 场景结构必须与已有场景全景图保持一致
- 仅调整光照、色调、氛围
- 不改变场景布局和物体位置
```

**提示词模板**（针对GPT-Image-2优化）：

```
基于以下场景的光照调整版本：

[从场景资产卡片提取场景描述，包括空间布局、主要元素、材质]

光照调整方案：
[lighting.description], [lighting.direction], [lighting.colorTemperature] color temperature, [lighting.intensity] intensity

色调调整：
Adjust color scheme to: Dominated by [colorScheme.dominantColorName] ([dominantColor]), accented with [accentColorName] ([accentColor]), creating a [colorScheme.mood] mood

氛围强化：
[atmosphere.visualStyle]

情绪基调：[emotion], [emotionIntensity]/10 intensity, [rhythm]-paced

重要约束：
- 保持场景布局与已有场景全景图完全一致
- 仅调整光照方向、强度、色温
- 仅调整色调和氛围
- 不改变物体位置和场景结构

质量：cinematic lighting adjustment, highly detailed, photorealistic, 8K, 16:9 composition
```

**示例**：
```
A cinematic scene of underwater base and floating island under siege, daytime.

Environment: Turbulent water surface, flooded land, distant buildings with only rooftops visible, shaking floating island base, seabed, glowing underwater hotel

Lighting: Natural daylight from above, simulating scattered light reflected from the sea surface, creating a cold top-light effect to convey post-apocalyptic oppression, cool color temperature, medium intensity

Color scheme: Dominated by cold steel blue (#2C3E50), accented with warm orange (underwater hotel lights, #FFA500), creating a cold and oppressive mood

Atmosphere: Post-apocalyptic realism style, turbulent water, zombie horde besieging the floating island, camera descending to the seabed revealing the underwater base's visual contrast. The cold deep blue tone creates oppression, while the warm light from the underwater hotel forms a metaphor of hope. Fast-paced editing enhances the shocking brutality of the apocalypse.

Visual style: post-apocalyptic realism, high-tension, fast-paced

Quality: cinematic composition, highly detailed, photorealistic, 8K, dramatic lighting, wide angle shot
```

### 5.2 展示提示词给用户确认

**用户交互**：
```
【场景效果图生成 - 提示词确认】

场景：第1集-第1场（海上浮岛/海底）
基于场景全景图：[全景图URL或文件名]

提示词（中文版 - GPT-Image-2）：
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[显示上面生成的提示词]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

说明：
- 此提示词将基于已有场景全景图，调整光照和色调以匹配剧情情绪
- 场景结构将保持与全景图一致

请选择：
1. 确认生成（使用GPT-Image-2） ⭐ 推荐
2. 修改提示词后生成
3. 切换模型（Gemini）
4. 讨论提示词策略

请输入选项（1/2/3/4）：
```

### 5.3 调用图像生成模型

**模型选择**：
- 优先：GPT-Image-2（场景氛围最好）
- 备选A：Gemini（细节更丰富）
- 备选B：Seedance5.0（风格化强）

**调用逻辑**：
```typescript
async function generateSceneImage(prompt: string, model: string) {
  const fullPrompt = prompt;
  
  // 调用对应模型API
  const imageUrl = await imageGenerationAPI.generate({
    model: model,
    prompt: fullPrompt,
    aspectRatio: "16:9",
    quality: "high"
  });
  
  return {
    prompt: prompt,
    fullPrompt: fullPrompt,
    imageUrl: imageUrl,
    modelUsed: model,
    generatedAt: new Date().toISOString()
  };
}
```

### 5.4 用户确认效果图

**用户交互**：
```
【场景效果图已生成】

[显示生成的图片]

图片URL: [imageUrl]
生成模型: GPT-Image-2
生成时间: 2026-06-02 14:30:00

请选择：
1. 确认此效果图，进入角色站位标注阶段
2. 重新生成（修改提示词）
3. 切换模型重新生成

请输入选项（1/2/3）：
```

**注意**：
- 如果用户选择"2"或"3"，返回阶段5.2
- 记录版本号（每次重新生成版本号+1）
- 所有生成的效果图都保留，用户可以回退到之前的版本

---

## 阶段6：标注角色站位（第二阶段）

### 6.1 在效果图上标注角色站位

**标注逻辑**：
1. 基于阶段4推断并经用户确认的角色站位
2. 在场景效果图上叠加标注层
3. 标注方式（三种可选）：
   - **方式A**：生成透明标注层PNG + 本地叠加（推荐）⭐
   - **方式B**：文字说明文档（无图像编辑工具时）
   - **方式C**：手动绘制标注（使用图像编辑工具）

#### 标注方式A：生成透明标注层（推荐）⭐

**优点**：AI生成、可视化、易调整、专业

**工作流程**：
1. 创建角色站位标注说明文档（文字描述每个角色的位置）
2. 使用提示词生成透明标注层PNG
3. 在本地使用图像编辑工具叠加到场景效果图上

**透明标注层提示词模板**：

```
Generate a transparent overlay layer (PNG with alpha channel) for character position annotations.

Format: 16:9 horizontal, 3840x2160 pixels, transparent background

Annotation markers:
- Style: Numbered circular markers with white background, black numbers
- Size: 80px diameter circles
- Text: Bold sans-serif font, size 48px
- Contrast: White circle with 3px black outline for visibility

Position coordinates (from top-left corner):
1. Position 1 - [角色名称]: X=[x坐标]px, Y=[y坐标]px, label "1" or "1-[角色名]"
2. Position 2 - [角色名称]: X=[x坐标]px, Y=[y坐标]px, label "2" or "2-[角色名]"
[... 继续列出所有角色位置 ...]

Additional elements:
- Optional: Add dotted lines connecting related characters
- Optional: Add small text labels below each number with character name (20px font)

Background: Completely transparent (alpha = 0)
Output: PNG with alpha channel for easy overlay
```

**提示词示例（具体场景）**：
```
生成一个透明图层（PNG格式，带alpha通道），用于标注角色位置。

格式：16:9横版，3840x2160像素，完全透明背景

标注样式：
- 圆形标记，白色背景，黑色数字
- 直径80像素
- 粗体无衬线字体，48像素
- 白色圆形带3像素黑色描边（提高可见度）

标注位置（从左上角计算坐标）：
1. 标注1 - 林渊：X=600px, Y=1200px，标签"1"或"1-林渊"
2. 标注2 - 沈知夏：X=800px, Y=1100px，标签"2"或"2-沈知夏"
3. 标注3 - 方涵：X=1400px, Y=1150px，标签"3"或"3-方涵"
4. 标注4 - 陈烟：X=1600px, Y=1150px，标签"4"或"4-陈烟"
5. 标注5 - 小桃：X=2800px, Y=1300px，标签"5"或"5-小桃"
6. 标注6 - 小咬：X=1920px, Y=1600px，标签"6"或"6-小咬"
7. 标注7 - 尸仆群：X=1920px, Y=1700px，标签"7"或"7-尸仆群"

可选元素：
- 在每个数字下方添加小字角色名称（20像素字体）
- 如需要，可添加虚线连接相关角色

背景：完全透明（alpha = 0）
输出：PNG格式，带alpha通道，方便叠加
```

**本地叠加方法**：
```bash
# 使用ImageMagick命令行工具叠加
convert 场景效果图.png 标注层.png -composite 最终带标注图.png

# 或使用Python PIL库
from PIL import Image
base = Image.open('场景效果图.png')
overlay = Image.open('标注层.png')
base.paste(overlay, (0, 0), overlay)
base.save('最终带标注图.png')
```

**优势**：
- ✅ 标注层可独立调整（位置、样式、数量）
- ✅ 可生成多个版本（数字版、文字版、详细版）
- ✅ 原场景图保持不变
- ✅ 专业视觉效果

#### 标注方式B：文字说明文档

**适用场景**：无图像生成工具或无需可视化标注时

**文档结构**：
```markdown
# 角色站位标注说明

## 标注1：[角色名称]
- 位置：[前景/中景/后景]，[具体位置描述]
- 姿态：[姿态描述]
- 占画面比例：[百分比]

## 标注2：[角色名称]
...
```

**优势**：
- ✅ 无需额外工具
- ✅ 清晰明确
- ✅ 易于修改

**劣势**：
- ❌ 不直观
- ❌ 需要对照图片理解

#### 标注方式C：手动绘制

**适用场景**：需要高度定制化标注时

**工具**：Photoshop、GIMP、Figma等

**优势**：
- ✅ 完全控制
- ✅ 可自定义样式

**劣势**：
- ❌ 需要专业工具
- ❌ 耗时较多

### 6.2 用户调整站位

**用户交互**：
```
【角色站位标注】

[显示带标注的效果图]

当前角色站位：
1. 巨型丧尸 - 前景，水下，指挥姿态
2. 战士群体 - 中景，城墙上，战斗姿态
3. 海底酒店 - 后景，海底，发光

请选择：
1. 确认站位，生成最终卡片
2. 调整站位（输入角色编号和新位置）

请输入选项（1/2）：
```

**调整示例**：
```
输入：2
请输入要调整的角色编号：2
请输入新位置：中景偏左，城墙上，战斗姿态

更新后的站位：
1. 巨型丧尸 - 前景，水下，指挥姿态
2. 战士群体 - 中景偏左，城墙上，战斗姿态
3. 海底酒店 - 后景，海底，发光

确认更新？(y/n)：
```

### 6.3 生成最终场景策略卡片

**卡片内容**：
```typescript
{
  cardType: "SceneStrategyCard",
  sceneId: "第1集-第1场",
  directorBriefingCardId: "card_director_briefing_ep01_sc01",
  directorPrecheckSnapshot: {
    primaryStructure: "large_scene_compression",
    secondaryStructure: "continuous_action",
    sceneDirective: "明确水面、浮岛城墙、尸潮和海底酒店的空间层级，保证大场面中主视觉锚点清晰",
    preliminaryShotGroupPlan: [
      {
        groupNumber: 1,
        corePurpose: "建立洪水与尸潮压迫",
        tentativeDuration: "8-12s"
      }
    ]
  },
  
  lighting: {
    type: "natural",
    position: "画面上方",
    direction: "顶光",
    intensity: "medium",
    colorTemperature: "cool",
    description: "自然日光从上方照射，模拟海面反射的散射光，形成冷峻的顶光效果"
  },
  
  colorScheme: {
    dominantColor: "#2C3E50",
    dominantColorName: "冷峻深蓝",
    accentColor: "#FFA500",
    accentColorName: "暖橙色（海底酒店灯光）",
    mood: "冷峻压迫",
    description: "以冷峻深蓝为主色调，营造末世压迫感..."
  },
  
  atmosphere: {
    mood: "震撼、压迫、末世惨烈",
    tension: "high",
    visualStyle: "末世写实风格，水面翻涌..."
  },
  
  sceneEffectImage: {
    prompt: "[用户确认的提示词]",
    fullPrompt: "[完整提示词]",
    imageUrl: "[效果图URL]",
    versionNumber: 1,
    modelUsed: "gpt-image-2",
    generatedAt: "2026-06-02T14:30:00Z",
    userConfirmed: true
  },
  
  characterPositions: [
    {
      characterId: "zombie-001",
      characterName: "巨型丧尸",
      position: {
        depth: "foreground",
        relativePosition: "画面前景，水下",
        facing: "facing_camera"
      },
      posture: "指挥姿态",
      action: "指挥尸潮攻击"
    }
  ],
  
  annotatedImageUrl: "[带标注的效果图URL]",
  
  upstreamCards: [
    "episode-scene-detail-card-001",
    "scene-asset-card-001",
    "art-direction-card-001"
  ],
  
  status: "completed",
  createdAt: "2026-06-02T14:35:00Z"
}
```

---

## 测试用例

### 测试用例1：海上浮岛/海底场景

**输入数据**：
- 分集分场剧情卡片：第1集第1场（samples/project-samples/制作区测试结果/01-第1集第1场-分集分场剧情卡片-v3.json）
- 场景资产卡片：scene-001（海上浮岛/海底）
- 美术设定卡片：末世写实风格

**预期输出**：
```typescript
{
  lighting: {
    type: "natural",
    direction: "顶光",
    intensity: "medium",
    colorTemperature: "cool"
  },
  colorScheme: {
    dominantColorName: "冷峻深蓝",
    accentColorName: "暖橙色"
  },
  atmosphere: {
    mood: "震撼、压迫、末世惨烈",
    tension: "high"
  },
  sceneEffectImage: {
    modelUsed: "gpt-image-2",
    userConfirmed: true
  },
  characterPositions: [
    { characterName: "巨型丧尸", depth: "foreground" },
    { characterName: "战士群体", depth: "midground" }
  ]
}
```

### 测试用例2：室内温馨场景

**输入数据**：
- emotion: "温馨、放松"
- emotionIntensity: 3
- rhythm: "slow"
- timeOfDay: "夜"
- lighting: "人工光"

**预期输出**：
```typescript
{
  lighting: {
    type: "artificial",
    direction: "正面光",
    intensity: "weak",
    colorTemperature: "warm"
  },
  colorScheme: {
    dominantColorName: "暖黄色",
    mood: "温馨舒适"
  },
  atmosphere: {
    tension: "low"
  }
}
```

---

## 实施检查清单

### 功能完整性
- [ ] 能正确读取分集分场剧情卡片（visualDescription、sceneElements）
- [ ] 能正确读取场景资产卡片和美术设定卡片
- [ ] 能根据情绪和节奏推断光照方案
- [ ] 能根据美术设定推断色调和氛围
- [ ] 能根据visualDescription推断角色站位
- [ ] 能生成符合GPT-Image-2规范的提示词
- [ ] 支持两阶段生成（效果图 → 角色站位标注）
- [ ] 支持用户修改提示词和调整站位
- [ ] 支持多个模型选择（GPT-Image-2/Gemini/Seedance5.0）
- [ ] 支持版本控制（迭代生成）

### 用户体验
- [ ] 提示词清晰可读，用户可以理解和修改
- [ ] 用户交互流程简洁明了
- [ ] 支持回退到之前的版本
- [ ] 错误提示友好（如：上游卡片不存在）

### 数据质量
- [ ] 生成的光照方案符合情绪和节奏
- [ ] 生成的色调方案符合美术设定
- [ ] 推断的角色站位符合剧情描述
- [ ] 提示词能准确传达场景氛围

### 技术规范
- [ ] 遵守"专业推断"原则（基于详细信息进行推断）
- [ ] 场景效果图分辨率为16:9
- [ ] 所有生成的图片都有URL和元数据
- [ ] 支持迭代生成（版本号递增）
- [ ] 上游卡片ID正确记录

---

## 附录：推断规则库

### 光照类型映射表

| 时间 | 光照类型 | 推断结果 |
|------|----------|----------|
| 日 | 自然光 | natural |
| 夜 | 人工光 | artificial |
| 日 | 人工光 | mixed |
| 夜 | 自然光 | mixed |

### 情绪-光照方向映射表

| 情绪类型 | 打光方向 | 色温 |
|----------|----------|------|
| 震撼、压迫感、恐怖 | 顶光/侧光 | cool |
| 温馨、欢快、轻松 | 正面光 | warm |
| 神秘、诡异、悬疑 | 逆光/底光 | cool |
| 日常、平静、中性 | 侧光 | neutral |
| 悲伤、绝望、沉重 | 侧光/底光 | cool |

### 情绪-色调映射表

| 情绪类型 | 主色调 | 强调色 |
|----------|--------|--------|
| 震撼、压迫感 | 冷灰色/深蓝色 | 暗红色/橙色 |
| 温馨、欢快 | 暖黄色/橙色 | 粉色/浅蓝色 |
| 神秘、诡异 | 紫色/暗绿色 | 黄色/红色 |
| 悲伤、绝望 | 深灰色/黑色 | 冷蓝色 |
| 希望、振奋 | 明亮色/白色 | 金色/天蓝色 |

## 生成文件命名规则

场景效果图必须保存 `filename`，格式：

```text
第{集数}集第{场数}场-{场景名字}-v{版本号}
```

示例：`第1集第3场-海底基地大厅-v001.png`。

## 完成后下一步

完成判定：`SceneStrategyCard` 已创建，场景效果图和 `positionAnnotationImage` 已确认。

完成后必须检查三张策略卡片的完成情况：`SceneStrategyCard`、`PerformanceStrategyCard`、`CinematographyStrategyCard`。

- 只有三张策略卡片都完成，才建议调用 `director-briefing` 进行复判与镜头组落版。
- 如果还有策略卡缺失，建议继续完成尚未完成的策略卡片。

推荐话术：`现场设计已完成。我会检查三张策略卡片的完成情况；只有三张策略卡片都完成后，才建议回到 director-briefing 进行复判落版。`
