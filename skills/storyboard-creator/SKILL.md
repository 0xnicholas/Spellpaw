---
name: storyboard-creator
description: Use when a confirmed StoryboardPlanCard shot group needs key-shot image planning, prompt confirmation, image generation, and a motion-focused storyboard sheet
version: 2.0.0
author: Modo
tags: [ai-short-drama, storyboard, key-shot, image-generation]
---

# 故事板制作

## 核心职责

针对 `StoryboardPlanCard.shotGroups[]` 中的一个已确认镜头组，依次完成：

1. 与用户确认关键分镜图生图计划。
2. 逐张确认提示词、清晰度、生成结果和最终版本。
3. 把已确认关键分镜图作为硬参考，按动作节拍生成运动故事板 Sheet。
4. 输出一张综合 `StoryboardCard`。

关键分镜图负责“最终画面长什么样”；故事板负责“主体、机位和站位如何变化”。两者不是二选一，也不输出独立 `ShotImageCard`。

## Reference Routing

按任务读取以下 reference，不要把 reference 全文复制到用户输出：

- 生成关键分镜图提示词前，读取 `references/key-shot-prompt-template.md`。
- 生成故事板 Sheet 提示词前，读取 `references/storyboard-sheet-prompt-template.md`。
- 把抽象剧情、情绪和动作转成可见影视语言时，读取 `references/cinematic-translation-vocabulary.md`。
- 拆分内容运动、运镜和标注方式时，读取 `references/motion-camera-vocabulary.md`。
- 每次进入生图和创建卡片前，读取 `references/prompt-quality-checklist.md`。

## 输入

### 主输入

```text
StoryboardPlanCard
StoryboardPlanCard.videoGenerationProfileSnapshot
StoryboardPlanCard.sceneStrategyCardId
StoryboardPlanCard.shotGroups[] 中的当前镜头组
```

`StoryboardPlanCard.videoGenerationProfileSnapshot` 必须存在，用来确认镜头组时长上限来自落版时的全剧视频配置快照，而不是运行时重新读取当前配置。

`StoryboardPlanCard.sceneStrategyCardId` 必须存在，用来定位已确认的 `SceneStrategyCard.positionAnnotationImage`。不得从 `upstreamCards` 模糊猜测场景策略卡。

当前镜头组必须包含：

```text
groupId
groupNumber
duration
maxDurationApplied
description
sceneStrategy
performanceStrategy
cinematographyStrategy
shotBreakdown
tailFrameAnchor
```

`duration` 必须为正数，且不得超过 `maxDurationApplied`。

旧卡缺少 `maxDurationApplied` 时，按15秒兼容，不从当前全剧配置反推并改写旧镜头组。

### 策略文本读取边界

`shotGroups[]` 当前项是场景、表演和拍摄策略文本的唯一事实源：

```text
shotGroup.sceneStrategy
shotGroup.performanceStrategy
shotGroup.cinematographyStrategy
shotGroup.shotBreakdown
shotGroup.tailFrameAnchor
```

不要再次读取三张策略源卡的文本并覆盖当前镜头组快照。源卡可能继续编辑，重复拼接会制造版本漂移。

### 额外视觉资产

只为获取无法内嵌的图片引用而读取源卡或资产卡：

```text
SceneStrategyCard.positionAnnotationImage.imageUrl
ArtDirectionCard
CharacterAssetCard[]
SceneAssetCard[]
PropAssetCard[]
```

场景站位标注图读取规则：

1. 通过 `StoryboardPlanCard.sceneStrategyCardId` 定位 `SceneStrategyCard`。
2. 优先读取 `positionAnnotationImage.imageUrl`。
3. 同时校验 `positionAnnotationImage.userConfirmed === true`。
4. 旧数据只有 `annotatedImageUrl` 时允许兼容读取，但必须记录迁移警告。
5. `StoryboardPlanCard.sceneStrategyCardId` 缺失、两个图片字段均缺失，或图片未确认时，停止生图并要求先补齐分镜计划卡或场景站位标注图。

不要用未标注站位的 `sceneEffectImage` 替代 `positionAnnotationImage`。

### 全局画幅

从完整剧本卡片 `metadata.aspectRatio` 读取：

```text
16:9
9:16
1:1
```

每张关键分镜图和故事板每个 panel 必须使用该画幅。整张故事板 Sheet 的外层比例可按格数自动确定。

## 输出

唯一正式输出：

```text
StoryboardCard
```

一张卡片同时保存关键分镜图计划、已确认关键图、动作节拍、故事板 Sheet、版本依赖和视频交接信息。

## 工作流状态

```typescript
type StoryboardWorkflowStatus =
  | "planning_key_shots"
  | "generating_key_shots"
  | "key_shots_confirmed"
  | "planning_storyboard"
  | "generating_storyboard"
  | "confirmed";
```

状态只能按顺序推进。改变已绑定关键图版本时，允许从 `confirmed` 或 `generating_storyboard` 退回 `planning_storyboard`。

---

## 阶段 1：校验镜头组与视觉资产

### 1.1 输入契约

立即停止的情况：

- 当前对象不是 `StoryboardPlanCard.shotGroups[]` 中的镜头组。
- 缺少三类策略摘要、`shotBreakdown` 或 `tailFrameAnchor`。
- `duration > resolvedMaxDuration`，其中优先使用 `shotGroup.maxDurationApplied`，旧卡回退15。
- 没有完整剧本全局画幅。
- 缺少已确认的场景站位标注图。
- 画面中的角色、场景或关键道具找不到对应资产。

停止时指出缺失字段和应返回的上游步骤，不自行猜测。

### 1.2 尾帧校验

`tailFrameAnchor` 必须能在 `shotBreakdown` 中找到视觉落点：

1. 比对构图、角色状态、道具状态和情绪余韵。
2. 若 `shotBreakdown` 未覆盖，判定 `StoryboardPlanCard` 不完整。
3. 不再回读 `CinematographyStrategyCard` 文本补镜头。
4. 返回 `director-briefing` 修正当前镜头组快照。

策略文本唯一事实源原则高于旧版的跨卡补帧逻辑。

### 1.3 展示读取结果

向用户简要展示：

```text
镜头组、时长、全局画幅
核心任务和尾帧
当前镜头数量
场景站位标注图状态
角色/场景/道具资产数量
```

不要把完整上游卡片重新输出。

---

## 阶段 2：建立约束包

把当前镜头组和视觉资产压缩成内部 `constraintPack`：

```typescript
interface StoryboardConstraintPack {
  aspectRatio: string;
  narrative: {
    purpose: string;
    emotionalRange: string;
    keyMoment: string;
  };
  scene: {
    location: string;
    zones: string[];
    blocking: string;
    axis: string;
    positionAnnotationImage: ImageReference;
  };
  performance: {
    characters: Array<{
      name: string;
      visibleActionChain: string;
      visibleExpressionChain: string;
      eyeline: string;
    }>;
  };
  cinematography: {
    shots: ShotBreakdownItem[];
    shootingStyle: string;
    screenDirection: string;
  };
  art: {
    style: string;
    palette: string;
    motivatedLights: string;
    materials: string;
  };
  continuity: {
    openingState: string;
    tailFrameAnchor: TailFrameAnchor;
    characterState: string;
    propState: string;
  };
  assets: ImageReference[];
}
```

约束包只用于组织信息，不修改上游卡片。

---

## 阶段 3：建议并确认关键分镜图计划

设置：

```text
workflowStatus = planning_key_shots
```

### 3.1 选择原则

Agent 先提出建议，用户确认后才生成提示词。关键图数量由镜头组内容决定，不按时长机械分配。

优先选择：

- 建立空间和人物关系的画面。
- 关键表演或情绪转折。
- 动作启动、接触或结果中最有视频参考价值的瞬间。
- 重要道具、UI 或特效状态。
- `tailFrameAnchor` 对应的尾帧。

避免：

- 两张关键图只差很小的姿态。
- 为故事板每个 BEAT 都生成高清图。
- 把无法冻结的完整运动写成一张图。

### 3.2 计划结构

```typescript
interface KeyShotPlanItem {
  keyShotId: string;
  timestamp: string;
  keyShotType:
    | "establishing"
    | "performance"
    | "action"
    | "effect"
    | "tail"
    | "custom";
  narrativePurpose: string;
  selectionReason: string;
  sourceShotIds: string[];
  frozenMoment: string;
  requiredReferences: string[];
}
```

### 3.3 用户确认

逐项展示：

```text
编号 / 时间点 / 类型 / 冻结瞬间 / 叙事用途 / 选择理由 / 来源镜头
```

用户可以增加、删除、合并或改写。确认前不进入生图。

---

## 阶段 4：逐张确认并生成关键分镜图

设置：

```text
workflowStatus = generating_key_shots
```

每张关键图独立执行以下循环。

### 4.1 生成提示词

读取：

```text
references/key-shot-prompt-template.md
references/cinematic-translation-vocabulary.md
```

提示词必须包含：

- 镜头任务和叙事用途。
- 所有参考图的逐图用途。
- 单一冻结瞬间。
- 角色姿态、微表情、视线和手部/道具状态。
- 场景区域、站位、轴线和银幕方向。
- 景别、机位、焦段意图、构图和景深。
- 动机光源、色卡、材质和氛围。
- 身份、数量、首尾和道具连续性锁定。
- 负面约束。

### 4.2 确认提示词

向用户展示可编辑的 `generationPrompt`。用户确认前不得调用生图模型。

### 4.3 确认模型与清晰度

查询当前可用图像生成 API 的真实选项，再让用户选择：

```text
模型
支持的画幅
支持的清晰度/质量
其他会显著影响结果的参数
```

不要承诺 API 不支持的“8K”“无限细节”等参数。画幅必须等于全局画幅，不作为可选项。

### 4.4 生成与版本

```typescript
interface ImageVersion {
  version: number;
  imageUrl: string;
  imageFile?: string;
  modelUsed: string;
  resolution: string;
  generatedAt: string;
  changes: string;
  userConfirmed: boolean;
}
```

重新生成只增加当前关键图版本，不改变其他已确认关键图。

### 4.5 结果确认

用户选择：

```text
确认当前版本
修改提示词后生成新版本
使用同一提示词生成新版本
返回关键图计划
```

只有 `userConfirmed: true` 的选中版本可供故事板引用。

### 4.6 闸门一

所有计划内关键图均存在已确认版本后：

```text
workflowStatus = key_shots_confirmed
```

否则禁止进入故事板阶段。

---

## 阶段 5：按动作节拍建立故事板计划

设置：

```text
workflowStatus = planning_storyboard
```

### 5.1 拆分依据

读取：

```text
references/cinematic-translation-vocabulary.md
references/motion-camera-vocabulary.md
```

按可见状态变化拆 BEAT，而不是按秒数平均取样。以下变化可产生新 BEAT：

- 主体动作阶段。
- 接触或结果状态。
- 站位、朝向、视线或遮挡。
- 表演反应。
- 景别、机位或运镜阶段。
- 首帧和尾帧连续性状态。

通常为 4-12 格：

- 相邻状态近似时合并。
- 单格包含两个不能同时冻结的动作阶段时拆分。
- 超过 12 格时先压缩次要节拍并向用户说明。

### 5.2 BEAT 结构

```typescript
interface StoryboardBeat {
  beatId: string;
  timeRange: string;
  beatName: string;
  shotTag: string;
  frozenMoment: string;
  subjectBlocking: string;
  contentMotion: string;
  cameraMotion: string;
  continuityState: string;
  keyShotBindings: Array<{
    keyShotId: string;
    version: number;
  }>;
  annotationMode: "implicit" | "explicit" | "mixed";
  visibleAnnotation?: string;
  panelHeader: string;
}
```

每个 BEAT 都必须有 `contentMotion` 和 `cameraMotion`。静止镜头写 `Static`。

### 5.3 关键图绑定

每格至少绑定一张已确认关键图：

- 建立镜头绑定空间或建立型关键图。
- 表演格绑定对应表演关键图。
- 动作/特效格绑定最接近的动作或特效关键图。
- 尾格绑定尾帧关键图。

关键图只锁定视觉身份和状态锚点；BEAT 补充相邻运动，不复制关键图缩略图到 Sheet。

### 5.4 混合运动表达

默认使用 `mixed`：

- 优先通过相邻格的姿态、位置、构图和取景变化表达。
- 复杂路径、多人交叉或快速接触才增加少量轨迹或接触短划。
- 复杂运镜才增加镜头框、虚线箭头或镜头符号。
- 不要求每格同时出现内容箭头和运镜箭头。
- Static 通常不标注，可能误读时才显示小型锁定机位符号。

### 5.5 用户确认

向用户展示：

```text
P## / 时间 / 节拍名 / 冻结瞬间 / 内容运动 / 运镜 / 关键图绑定 / 标注方式
```

用户确认动作节拍和标注强度后才生成故事板提示词。

---

## 阶段 6：确认并生成故事板 Sheet

### 6.1 生成提示词

读取：

```text
references/storyboard-sheet-prompt-template.md
references/motion-camera-vocabulary.md
```

提示词必须包含：

- 两行中文表头。
- AUTO 布局和准确 panel 数量。
- 每格固定 `P## / 镜头标签 / 节拍名`。
- 简洁影视故事板视觉语法。
- 已确认关键分镜图的逐图引用用途。
- 身份、数量、站位、轴线、银幕方向和首尾连续性。
- 混合运动表达规则。
- 逐格 BEATS。
- 负面约束。

不要加入色卡板、材质板、长段制作说明、参考图缩略图或装饰性信息区。

### 6.2 画幅

```text
panelAspectRatio = globalAspectRatio
sheetAspectRatio = 根据 panelCount 与布局自动决定
```

提示词必须明确每格画幅，而不是只写整张 Sheet 画幅。

### 6.3 用户确认

用户确认：

```text
BEATS
关键图绑定
显式标注位置
Sheet 布局
generationPrompt
```

确认前不调用模型。

### 6.4 生成

设置：

```text
workflowStatus = generating_storyboard
```

故事板作为一个独立版本序列生成。重新生成故事板不会重做关键图。

### 6.5 结果检查

读取 `references/prompt-quality-checklist.md`，重点检查：

- panel 数量和顺序正确。
- 每格内部画幅等于全局画幅。
- 每格只有一个冻结瞬间。
- 角色和道具没有重复。
- 关键图锁定的身份、场景和构图未被重设。
- 内容运动与运镜可从连续格或少量标注中读取。
- 没有长文字、色卡、材质板或满屏箭头。
- 尾格符合 `tailFrameAnchor`。

不合格时只修正故事板提示词和故事板版本。

### 6.6 闸门二

用户确认选中的故事板版本后：

```text
workflowStatus = confirmed
storyboardSheet.stale = false
```

---

## 阶段 7：依赖失效

故事板必须保存它引用的关键图版本：

```typescript
dependencyState: {
  referencedKeyShotVersions: Record<string, number>;
}
```

发生以下任一情况时：

- 切换某张已绑定关键图的选中版本。
- 取消某张已绑定关键图确认。
- 删除或替换某张已绑定关键图。

立即执行：

```text
storyboardSheet.stale = true
storyboardSheet.userConfirmed = false
workflowStatus = planning_storyboard
```

`stale` 故事板不能交给 `video-creator`。

---

## 阶段 8：创建 StoryboardCard

```typescript
interface StoryboardCard extends BaseCard {
  cardType: "StoryboardCard";

  sceneId: string;
  shotGroupId: string;
  groupNumber: number;
  workflowStatus: StoryboardWorkflowStatus;
  version: number;

  shotGroupSnapshot: StoryboardPlanCard["shotGroups"][number];

  visualReferences: {
    positionAnnotationImage: ImageReference;
    artDirectionCardId: string;
    characterAssets: ImageReference[];
    sceneAssets: ImageReference[];
    propAssets: ImageReference[];
  };

  keyShotPlan: {
    recommendation: string;
    selectionRules: string[];
    userConfirmed: boolean;
    shots: Array<{
      keyShotId: string;
      timestamp: string;
      keyShotType:
        | "establishing"
        | "performance"
        | "action"
        | "effect"
        | "tail"
        | "custom";
      narrativePurpose: string;
      sourceShotIds: string[];
      visualDescription: string;
      generationPrompt: string;
      fullPrompt: string;
      referenceImages: ImageReference[];
      resolution: string;
      imageVersions: ImageVersion[];
      selectedVersion: number;
      userConfirmed: boolean;
    }>;
  };

  storyboardSheet: {
    beats: StoryboardBeat[];
    sheetAspectRatio: string;
    panelAspectRatio: string;
    generationPrompt: string;
    fullPrompt: string;
    imageVersions: ImageVersion[];
    selectedVersion: number;
    stale: boolean;
    userConfirmed: boolean;
  };

  confirmationLog: Array<{
    stage: string;
    targetId: string;
    confirmedAt: string;
    summary: string;
  }>;

  dependencyState: {
    referencedKeyShotVersions: Record<string, number>;
  };

  videoHandoff: {
    confirmedKeyShotImages: ImageReference[];
    storyboardImage: ImageReference;
    beats: StoryboardBeat[];
    openingState: string;
    tailState: string;
  };

  // 迁移期兼容视图，由新结构派生
  imageUrl: string;
  generationPrompt: string;
  keyFrames: Array<{
    frameNumber: number;
    timestamp: string;
    description: string;
    shotSize: string;
    contentMotion: string;
    cameraMovement: string;
    emotion: string;
  }>;
  upstreamCards: string[];

  createdBy: string;
  createdAt: string;
  updatedAt: string;
  status: "draft" | "confirmed" | "archived";
}
```

兼容映射：

```text
imageUrl = 选中故事板版本.imageUrl
generationPrompt = storyboardSheet.generationPrompt
keyFrames = storyboardSheet.beats[] 的简化映射
```

兼容字段不能反向覆盖新结构。

---

## 用户交互摘要

完整流程必须出现以下确认点：

1. 关键分镜图计划确认。
2. 每张关键图提示词确认。
3. 每张关键图模型和清晰度确认。
4. 每张关键图结果版本确认。
5. 故事板动作节拍和关键图绑定确认。
6. 故事板提示词确认。
7. 故事板结果版本确认。

不要把多个生图调用压缩成一次默认确认。

## 错误处理

### 硬阻断

- 镜头组输入契约不完整。
- 场景站位标注图缺失或未确认。
- 必需资产引用缺失。
- 关键图未全部确认。
- 故事板 panel 画幅不等于全局画幅。
- 故事板 BEAT 未绑定已确认关键图。
- `contentMotion` 或 `cameraMotion` 缺失。

### 局部修复

- 单张关键图漂移：只重做该图。
- BEAT 过密或重复：只调整 BEATS。
- 运动方向不清：先补连续状态，再少量标注。
- 文字乱码：减少可见文字并固定短标签。
- 关键图版本改变：标记故事板 `stale` 后重做。

## 完成检查

创建卡片前，必须完成 `references/prompt-quality-checklist.md`。任何硬阻断项未通过时，不得把卡片标为 `confirmed`。

## 生成文件命名规则

关键分镜图必须保存 `filename`，格式：

```text
第{集数}集第{场数}场第{组号}组-镜头{镜头编号}-v{版本号}
```

故事板图必须保存 `filename`，格式：

```text
第{集数}集第{场数}场第{组号}组-故事板-v{版本号}
```

示例：`第1集第3场第1组-镜头01-v001.png`、`第1集第3场第1组-故事板-v001.png`。

## 完成后下一步

完成判定：`StoryboardCard.workflowStatus === "confirmed"`，关键分镜图和故事板图均已确认，且 `storyboardSheet.stale === false`。

优先调用 `video-creator` 为当前镜头组生成视频。

如果 `StoryboardPlanCard` 还有其他镜头组未制作故事板，可继续调用当前 skill 处理下一个镜头组。

推荐话术：`当前镜头组故事板已确认。建议下一步调用 video-creator 生成这一组视频；也可以继续制作其他镜头组故事板。`
