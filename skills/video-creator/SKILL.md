---
name: video-creator
description: Use when a confirmed StoryboardCard shot group needs an API-aware video prompt, generation configuration, and versioned video output
version: 2.0.0
author: Modo
tags: [ai-short-drama, video-generation, seedance, shot-group]
---

# 视频制作

## 核心职责

针对一个已确认镜头组的 `StoryboardCard`：

1. 校验故事板、关键分镜图、BEATS、场景站位标注图和资产图片。
2. 查询目标视频 API 的真实能力。
3. 与用户确认模型、画质、时长适配和音频能力。
4. 生成中文视频提示词，与用户讨论确认。
5. 调用视频模型。
6. 把结果追加到当前镜头组唯一的 `VideoCard.videoVersions[]`。

一张 `VideoCard` 只对应一个 `shotGroupId`。重新生成视频不会创建第二张卡片。

## Reference Routing

- 生成 Seedance 2.0 或同类模型提示词前，读取 `references/seedance-2-video-prompt-template.md`。
- 选择剪辑、内容运动、运镜和时长重映射表达时，读取 `references/video-editing-motion-vocabulary.md`。
- 进入参数确认、调用 API、确认版本和创建卡片前，读取 `references/video-generation-quality-checklist.md`。

## 输入

### 主输入

已确认且非 `stale` 的综合 `StoryboardCard`：

```text
sceneId
shotGroupId
groupNumber
version
shotGroupSnapshot
visualReferences.positionAnnotationImage
videoHandoff.confirmedKeyShotImages
videoHandoff.storyboardImage
videoHandoff.beats
videoHandoff.openingState
videoHandoff.tailState
dependencyState.referencedKeyShotVersions
```

新卡的 `shotGroupSnapshot` 必须包含 `maxDurationApplied`；旧卡缺失时按15秒兼容。

### 额外视觉资产

根据当前镜头组实际入画内容读取：

```text
CharacterAssetCard[]
SceneAssetCard[]
PropAssetCard[]
```

### 全局设定

```text
FullScriptCard.metadata.aspectRatio
```

画幅只读，不在视频阶段重新选择。

## 输出

```text
VideoCard
```

`VideoClipCard` 仅作为旧数据兼容别名。新版不得创建 `VideoClipCard`。

## 工作流状态

```typescript
type VideoWorkflowStatus =
  | "configuring"
  | "prompt_review"
  | "generating"
  | "confirmed";
```

---

## 阶段 1：校验上游与镜头组归属

### 1.1 一卡一镜头组

```text
VideoCard.shotGroupId = StoryboardCard.shotGroupId
```

同一 `shotGroupId` 已存在 `VideoCard` 时，继续更新该卡；不要创建新卡。

### 1.2 StoryboardCard 闸门

必须同时满足：

```text
StoryboardCard.workflowStatus === "confirmed"
StoryboardCard.storyboardSheet.userConfirmed === true
StoryboardCard.storyboardSheet.stale === false
videoHandoff.confirmedKeyShotImages.length > 0
videoHandoff.storyboardImage 有效
videoHandoff.beats.length > 0
visualReferences.positionAnnotationImage 有效且已确认
```

每个 BEAT 必须具备：

```text
beatId
timeRange
frozenMoment
subjectBlocking
contentMotion
cameraMotion
continuityState
keyShotBindings[]
```

### 1.3 资产完整性

画面中每个可见角色、场景和关键道具都必须有对应资产图片。

硬阻断：

- 缺少任一角色资产。
- 缺少场景资产。
- 上游定义了关键道具，但缺少道具资产。
- 场景站位标注图缺失或未确认。

不要使用文字描述替代缺失资产继续生成。

### 1.4 时长与画幅

```text
requestedDuration = StoryboardCard.shotGroupSnapshot.duration
aspectRatio = FullScriptCard.metadata.aspectRatio
```

要求：

- `requestedDuration > 0`。
- `requestedDuration <= shotGroupSnapshot.maxDurationApplied`。
- 旧卡缺少 `maxDurationApplied` 时，解析为15秒。
- 画幅必须是全局已确认值。
- 不向用户提供改变画幅的选项。

### 1.5 展示输入摘要

只展示：

```text
镜头组ID
请求时长
全局画幅
关键分镜图数量
故事板 BEAT 数量
角色/场景/道具资产数量
场景站位标注图状态
```

---

## 阶段 2：建立参考图权限包

每张引用图必须有唯一职责：

```typescript
interface VideoReferencePack {
  storyboardImage: {
    image: ImageReference;
    authority: "shot-order-camera-blocking-motion-geography";
  };
  keyShotImages: Array<{
    image: ImageReference;
    keyShotId: string;
    authority: "final-look-and-key-state";
  }>;
  positionAnnotationImage: {
    image: ImageReference;
    authority: "blocking-eyeline-axis-route";
  };
  characterAssets: Array<{
    image: ImageReference;
    characterId: string;
    authority: "character-identity";
  }>;
  sceneAssets: Array<{
    image: ImageReference;
    sceneId: string;
    authority: "scene-identity";
  }>;
  propAssets: Array<{
    image: ImageReference;
    propId: string;
    authority: "prop-identity";
  }>;
}
```

### 权限规则

- **故事板图**：镜头顺序、机位、景别、构图、姿态、站位、银幕方向、内容运动、运镜、主体/道具/特效状态和空间地理。
- **关键分镜图**：对应 BEAT 的成片效果、构图、光色、材质、表演和关键状态。
- **角色资产**：脸、外貌、体型、服装、比例、材质和角色身份的唯一权威。
- **场景资产**：空间结构、固定物位置、环境材质和场景身份的唯一权威。
- **道具资产**：形状、数量、尺寸、材质和使用方式的唯一权威。
- **场景站位标注图**：初始站位、朝向、视线、轴线、运动路线和安全机位区。

提示词必须明确：

```text
不要渲染故事板 Sheet、参考图边框、格头、箭头、标签、编号或资产拼贴。
```

---

## 阶段 3：查询视频 API 能力

设置：

```text
workflowStatus = configuring
```

在询问用户参数前，调用当前可用的视频 API/工具能力查询，获得：

```typescript
interface VideoModelCapabilities {
  model: string;
  supportedDurations: number[] | {
    min: number;
    max: number;
    step?: number;
  };
  supportedAspectRatios: string[];
  qualityOptions: string[];
  resolutionOptions?: string[];
  supportsNativeAudio: boolean;
  referenceImageLimit?: number;
  modelParams: Record<string, unknown>;
}
```

禁止：

- 根据旧文档猜测当前 API 参数。
- 写死“1920x1080”“1080x1920”“8K”等选项。
- 在未查询能力前承诺模型支持特定时长、画质、音频或参考图数量。

如果 API 不支持全局画幅，停止并说明冲突，不自动改画幅。

如果参考图数量超出上限：

1. 保留故事板图。
2. 保留与当前 BEATS 直接绑定的关键分镜图。
3. 保留所有可见角色的身份资产。
4. 保留场景站位标注图。
5. 依画面相关性选择场景和道具资产。
6. 向用户展示裁剪方案并确认，不静默丢弃引用图。

---

## 阶段 4：参数确认闸门

向用户展示 API 实际支持的：

```text
模型
画质
分辨率（如 API 独立提供）
支持时长
原生音频能力
参考图上限
其他关键模型参数
```

用户确认：

- `model`
- `quality`
- `resolution`（如适用）
- 必要的 `generatedDuration`
- 其他会显著影响结果的参数

画幅固定为全局值，不进入可选列表。

### 4.1 精确时长支持

如果 API 支持 `requestedDuration`：

```text
generatedDuration = requestedDuration
durationAdaptation = undefined
```

### 4.2 时长适配

如果 API 不支持精确时长：

1. 展示可用时长。
2. 用户选择 `generatedDuration`。
3. 读取 `references/video-editing-motion-vocabulary.md`。
4. 保持事件和 BEAT 顺序。
5. 重排每个 BEAT 的时间段。
6. 保持接触、台词落点、高潮和尾帧可读。
7. 不静默截断、补空白或增加事件。

```typescript
interface DurationAdaptation {
  reason: string;
  originalDuration: number;
  selectedDuration: number;
  beatTimingMap: Record<string, string>;
}
```

`beatTimingMap` 必须覆盖每个 BEAT。

### 4.3 参数确认状态

```typescript
generationConfig.userConfirmed = true;
```

用户改变模型、画质、时长或关键模型参数时，清除旧参数确认并重新执行本阶段。

---

## 阶段 5：生成中文视频提示词

设置：

```text
workflowStatus = prompt_review
```

读取：

```text
references/seedance-2-video-prompt-template.md
references/video-editing-motion-vocabulary.md
```

### 5.1 提示词结构

```text
参考图权限
剪辑与空间连续性
视觉风格
环境
角色与表演
情绪指导
节奏与升级
音频指导
动作节拍 BEATS
首尾状态
负面约束
生成参数
```

### 5.2 信息来源

- 视觉风格、光色、材质：关键分镜图、资产图片和 `shotGroupSnapshot.sceneStrategy`。
- 表演：`shotGroupSnapshot.performanceStrategy` 和 BEATS。
- 剪辑、运镜和景别：`shotGroupSnapshot.cinematographyStrategy` 和 BEATS。
- 站位、视线和轴线：场景站位标注图与 `subjectBlocking`。
- 首尾状态：`videoHandoff.openingState` 和 `videoHandoff.tailState`。

不要重新读取三张策略源卡文本覆盖 `shotGroupSnapshot`。

### 5.3 BEAT 转译

每个 BEAT 必须包含：

```text
时间段
剪辑方式
冻结状态起点
内容运动
运镜
站位与银幕方向
结果状态
关键图绑定
```

`timeRange` 使用原始时间或确认后的 `beatTimingMap`。

不得：

- 添加上游未定义的事件。
- 把一个 BEAT 的结果提前到前一 BEAT。
- 删除尾帧状态。
- 用泛化“电影感动作”替代具体内容运动和运镜。

### 5.4 音频分流

始终生成并保存：

```text
VideoCard.audioGuidance
```

如果：

```text
supportsNativeAudio === true
```

则把音频指导写入 `fullPrompt` 和模型参数。

如果：

```text
supportsNativeAudio === false
```

则：

- `generationPrompt` 可显示音频意图，并标注“仅供后续声音制作”。
- `fullPrompt` 的视觉部分完全移除音频段，也不保留“无音频”“不要音乐”等否定句。
- 完整音频内容只保存在 `audioGuidance`。

### 5.5 generationPrompt 与 fullPrompt

```text
generationPrompt：中文、用户可见、可讨论修改。
fullPrompt：用户确认后生成，包含模型所需引用图映射和技术参数。
```

---

## 阶段 6：提示词确认闸门

向用户展示：

```text
参考图权限
参数摘要
时长适配（如有）
剪辑与空间连续性
逐 BEAT 动作和运镜
首尾状态
音频分流结果
负面约束
generationPrompt
```

用户可以：

```text
确认提示词
调整某个 BEAT
调整剪辑或节奏
调整表演或运镜
返回参数确认闸门
```

确认前不得：

- 生成 `fullPrompt` 最终版本。
- 调用视频生成 API。

记录确认：

```typescript
confirmationLog.push({
  stage: "prompt_review",
  confirmedAt: string,
  summary: string
});
```

---

## 阶段 7：调用视频生成 API

设置：

```text
workflowStatus = generating
```

调用参数来自已确认的：

```text
referenceImages
generationConfig
fullPrompt
```

### 7.1 生成失败

记录：

```typescript
interface VideoGenerationAttempt {
  attemptedAt: string;
  model: string;
  errorCode?: string;
  errorMessage: string;
}
```

失败时保留已确认的参数和提示词。用户可：

- 使用同一配置重试。
- 返回参数确认闸门。
- 返回提示词确认闸门。

失败不会创建空视频版本。

### 7.2 生成成功

追加版本：

```typescript
videoVersions.push({
  version: nextVersion,
  videoUrl,
  videoFile,
  thumbnailUrl,
  modelUsed,
  duration: generationConfig.generatedDuration,
  quality: generationConfig.quality,
  resolution: generationConfig.resolution,
  generatedAt,
  changes,
  userConfirmed: false
});
```

不要覆盖历史版本。

---

## 阶段 8：结果确认与版本管理

展示：

```text
视频预览
版本号
模型
时长
画质/分辨率
本版调整
```

用户可以：

- 确认当前版本。
- 使用同一提示词生成新版本。
- 修改提示词后生成新版本。
- 返回参数确认闸门后生成新版本。

确认时：

```text
selectedVersion = 当前版本
当前版本.userConfirmed = true
workflowStatus = confirmed
stale = false
userConfirmed = true
```

同一时间只允许一个选中最终版本。历史版本保留。

---

## 阶段 9：依赖失效

创建卡片时保存：

```typescript
storyboardDependency: {
  storyboardVersion: number;
  storyboardImageVersion: number;
  keyShotVersions: Record<string, number>;
}
```

同时在 `referenceImages` 中保存各资产的 cardId/version。

以下任一变化时：

- 故事板选中图片版本。
- 任一被引用关键分镜图版本。
- BEATS。
- 首帧或尾帧状态。
- 场景站位标注图。
- 被引用角色、场景或道具资产版本。

立即执行：

```text
stale = true
userConfirmed = false
workflowStatus = configuring
generationConfig.userConfirmed = false
```

旧视频版本保留用于对比，但不能继续作为当前确认结果。

---

## 阶段 10：创建 VideoCard

```typescript
interface VideoCard extends BaseCard {
  cardType: "VideoCard";

  sceneId: string;
  shotGroupId: string;
  groupNumber: number;
  workflowStatus: VideoWorkflowStatus;

  storyboardCardId: string;
  storyboardDependency: {
    storyboardVersion: number;
    storyboardImageVersion: number;
    keyShotVersions: Record<string, number>;
  };

  referenceImages: {
    storyboardImage: ImageReference;
    keyShotImages: ImageReference[];
    positionAnnotationImage: ImageReference;
    characterAssets: ImageReference[];
    sceneAssets: ImageReference[];
    propAssets: ImageReference[];
  };

  generationConfig: {
    model: string;
    aspectRatio: string;
    requestedDuration: number;
    generatedDuration: number;
    durationAdaptation?: {
      reason: string;
      originalDuration: number;
      selectedDuration: number;
      beatTimingMap: Record<string, string>;
    };
    quality: string;
    resolution?: string;
    supportsNativeAudio: boolean;
    modelParams: Record<string, unknown>;
    userConfirmed: boolean;
  };

  generationPrompt: string;
  fullPrompt: string;
  audioGuidance: string;

  generationAttempts?: VideoGenerationAttempt[];
  videoVersions: Array<{
    version: number;
    videoUrl: string;
    videoFile?: string;
    thumbnailUrl?: string;
    modelUsed: string;
    duration: number;
    quality: string;
    resolution?: string;
    generatedAt: string;
    changes: string;
    userConfirmed: boolean;
  }>;

  selectedVersion: number;
  confirmationLog: ConfirmationRecord[];
  stale: boolean;
  userConfirmed: boolean;

  createdAt: string;
  updatedAt: string;
  status: "draft" | "confirmed" | "archived";
}
```

兼容规则：

```typescript
type VideoClipCard = VideoCard; // @deprecated，仅用于旧数据读取
```

新版序列化必须使用：

```text
cardType: "VideoCard"
```

---

## 硬阻断

- 一个输入包含多个镜头组。
- 当前 `shotGroupId` 与已有 `VideoCard.shotGroupId` 不一致。
- 上游 StoryboardCard 未确认或已 `stale`。
- 缺少故事板图、关键图、BEATS、首尾状态或站位标注图。
- 缺少相关角色、场景或关键道具资产。
- 请求时长超过镜头组 `maxDurationApplied`。
- API 能力未查询。
- API 不支持全局画幅。
- 用户未确认模型、画质或必要时长适配。
- 用户未确认提示词。

## 局部修复

- 模型、画质、分辨率或时长变化：返回参数确认闸门。
- BEAT、剪辑、动作、运镜或音频变化：返回提示词确认闸门。
- 单次 API 失败：保留配置和提示词，记录失败后重试。
- 视频结果不满意：追加新版本，不创建新卡。

## 完成检查

创建或确认卡片前，必须完成 `references/video-generation-quality-checklist.md`。任何硬阻断项未通过时，不能把 `workflowStatus` 或 `status` 标为 `confirmed`。

## 生成文件命名规则

视频文件必须保存 `filename`，格式：

```text
第{集数}集第{场数}场第{组号}组-v{版本号}
```

示例：`第1集第3场第1组-v001.mp4`。

## 完成后下一步

完成判定：`VideoCard` 已创建或更新，`selectedVersion` 指向已确认视频版本，`workflowStatus === "confirmed"`，且 `stale === false`。

当前无强制下游。`VideoCard` 当前作为镜头组终点；用户可以继续生成新版本、返工当前视频、制作下一个镜头组，或回到 `production-coordinator` 处理下一场。

推荐话术：`当前镜头组视频已完成。VideoCard 当前作为镜头组终点；可以继续下一个镜头组，或对当前视频追加新版本。`
