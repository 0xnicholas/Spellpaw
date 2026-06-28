---
id: video-creator
name: video-creator
description: Use when a confirmed StoryboardCard shot group needs an API-aware video prompt, generation configuration, and versioned video output
slashCommand: video-creator
examples: []
parameters: {}
required: []
---

# Video Creation

## Core Responsibilities

For one confirmed shot group's `StoryboardCard`:

1. Validate storyboard, key shot images, BEATS, scene position annotation image, and asset images.
2. Query the target video API's actual capabilities.
3. Confirm model, quality, duration adaptation, and audio capabilities with the user.
4. Generate a Chinese video prompt, discuss and confirm with the user.
5. Call the video model.
6. Append the result to the current shot group's sole `VideoCard.videoVersions[]`.

One `VideoCard` corresponds to exactly one `shotGroupId`. Regenerating video does not create a second card.

## Reference Routing

- Before generating Seedance 2.0 or similar model prompts, read `references/seedance-2-video-prompt-template.md`.
- When selecting editing, content motion, camera movement, and duration remapping expressions, read `references/video-editing-motion-vocabulary.md`.
- Before entering parameter confirmation, API calling, version confirmation, and card creation, read `references/video-generation-quality-checklist.md`.

## Input

### Main Input

A confirmed and non-`stale` consolidated `StoryboardCard`:

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

New cards' `shotGroupSnapshot` must contain `maxDurationApplied`; legacy cards missing it default to 15s compatibility.

### Additional Visual Assets

Read according to what actually appears in the current shot group's frame:

```text
CharacterAssetCard[]
SceneAssetCard[]
PropAssetCard[]
```

### Global Settings

```text
FullScriptCard.metadata.aspectRatio
```

Aspect ratio is read-only; it is not re-selected during the video stage.

## Output

```text
VideoCard
```

`VideoClipCard` only exists as a legacy data compatibility alias. New versions must not create `VideoClipCard`.

## Workflow Status

```typescript
type VideoWorkflowStatus =
  | "configuring"
  | "prompt_review"
  | "generating"
  | "confirmed";
```

---

## Stage 1: Validate Upstream and Shot Group Ownership

### 1.1 One Card One Shot Group

```text
VideoCard.shotGroupId = StoryboardCard.shotGroupId
```

If a `VideoCard` already exists for the same `shotGroupId`, continue updating that card; do not create a new card.

### 1.2 StoryboardCard Gate

Must simultaneously satisfy:

```text
StoryboardCard.workflowStatus === "confirmed"
StoryboardCard.storyboardSheet.userConfirmed === true
StoryboardCard.storyboardSheet.stale === false
videoHandoff.confirmedKeyShotImages.length > 0
videoHandoff.storyboardImage valid
videoHandoff.beats.length > 0
visualReferences.positionAnnotationImage valid and confirmed
```

Each BEAT must have:

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

### 1.3 Asset Completeness

Every visible character, scene, and key prop in the frame must have a corresponding asset image.

Hard blocks:

- Missing any character asset.
- Missing scene asset.
- Upstream defines a key prop but the prop asset is missing.
- Scene position annotation image is missing or unconfirmed.

Do not use text descriptions as substitutes for missing assets to continue generation.

### 1.4 Duration and Aspect Ratio

```text
requestedDuration = StoryboardCard.shotGroupSnapshot.duration
aspectRatio = FullScriptCard.metadata.aspectRatio
```

Requirements:

- `requestedDuration > 0`.
- `requestedDuration <= shotGroupSnapshot.maxDurationApplied`.
- Legacy cards missing `maxDurationApplied`: resolve to 15s.
- Aspect ratio must be the globally confirmed value.
- Do not offer the user an option to change the aspect ratio.

### 1.5 Display Input Summary

Only display:

```text
Shot group ID
Requested duration
Global aspect ratio
Key shot image count
Storyboard BEAT count
Character / scene / prop asset count
Scene position annotation image status
```

---

## Stage 2: Build Reference Image Authority Pack

Each reference image must have a unique responsibility:

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

### Authority Rules

- **Storyboard image**: Shot order, camera position, shot size, composition, pose, blocking, screen direction, content motion, camera movement, subject/prop/effects states, and spatial geography.
- **Key shot images**: Final look, composition, light/color, materials, performance, and key states for the corresponding BEAT.
- **Character assets**: Sole authority for face, appearance, body type, costume, proportions, materials, and character identity.
- **Scene assets**: Sole authority for spatial structure, fixed object positions, environmental materials, and scene identity.
- **Prop assets**: Sole authority for shape, quantity, size, material, and usage method.
- **Scene position annotation image**: Initial blocking, facing, eyeline, axis, movement routes, and safe camera zones.

The prompt must explicitly state:

```text
Do not render the storyboard Sheet, reference image borders, panel headers, arrows, labels, numbers, or asset collages.
```

---

## Stage 3: Query Video API Capabilities

Set:

```text
workflowStatus = configuring
```

Before asking the user for parameters, query the currently available video API/tool capabilities to obtain:

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

Prohibited:

- Guessing current API parameters from outdated documentation.
- Hardcoding options like "1920x1080", "1080x1920", "8K".
- Promising the model supports specific duration, quality, audio, or reference image counts before querying capabilities.

If the API does not support the global aspect ratio, stop and state the conflict; do not auto-change the aspect ratio.

If the reference image count exceeds the limit:

1. Keep the storyboard image.
2. Keep key shot images directly bound to current BEATS.
3. Keep all visible character identity assets.
4. Keep the scene position annotation image.
5. Select scene and prop assets by visual relevance.
6. Show the trimming plan to the user for confirmation; do not silently discard reference images.

---

## Stage 4: Parameter Confirmation Gate

Display to the user what the API actually supports:

```text
Model
Quality
Resolution (if independently provided by the API)
Supported durations
Native audio capability
Reference image limit
Other key model parameters
```

User confirms:

- `model`
- `quality`
- `resolution` (if applicable)
- Required `generatedDuration`
- Other parameters that significantly affect results

Aspect ratio is fixed to the global value and does not enter the options list.

### 4.1 Exact Duration Support

If the API supports `requestedDuration`:

```text
generatedDuration = requestedDuration
durationAdaptation = undefined
```

### 4.2 Duration Adaptation

If the API does not support exact duration:

1. Display available durations.
2. User selects `generatedDuration`.
3. Read `references/video-editing-motion-vocabulary.md`.
4. Preserve event and BEAT order.
5. Remap each BEAT's time range.
6. Keep contact points, dialogue landing points, climax, and tail frame readable.
7. Do not silently truncate, pad with blanks, or add events.

```typescript
interface DurationAdaptation {
  reason: string;
  originalDuration: number;
  selectedDuration: number;
  beatTimingMap: Record<string, string>;
}
```

`beatTimingMap` must cover every BEAT.

### 4.3 Parameter Confirmation State

```typescript
generationConfig.userConfirmed = true;
```

When the user changes model, quality, duration, or key model parameters, clear the old parameter confirmation and re-execute this stage.

---

## Stage 5: Generate Chinese Video Prompt

Set:

```text
workflowStatus = prompt_review
```

Read:

```text
references/seedance-2-video-prompt-template.md
references/video-editing-motion-vocabulary.md
```

### 5.1 Prompt Structure

```text
Reference image authority
Editing and spatial continuity
Visual style
Environment
Characters and performance
Emotional guidance
Rhythm and escalation
Audio guidance
Action beats BEATS
Opening and tail states
Negative constraints
Generation parameters
```

### 5.2 Information Sources

- Visual style, light/color, materials: key shot images, asset images, and `shotGroupSnapshot.sceneStrategy`.
- Performance: `shotGroupSnapshot.performanceStrategy` and BEATS.
- Editing, camera movement, shot size: `shotGroupSnapshot.cinematographyStrategy` and BEATS.
- Blocking, eyeline, axis: scene position annotation image and `subjectBlocking`.
- Opening and tail states: `videoHandoff.openingState` and `videoHandoff.tailState`.

Do not re-read the three strategy source cards' text to overwrite `shotGroupSnapshot`.

### 5.3 BEAT Translation

Each BEAT must contain:

```text
Time range
Editing method
Frozen state starting point
Content motion
Camera movement
Blocking and screen direction
Result state
Key image binding
```

`timeRange` uses the original time or the confirmed `beatTimingMap`.

Must not:

- Add events not defined upstream.
- Advance one BEAT's result into the previous BEAT.
- Delete the tail frame state.
- Replace specific content motion and camera movement with generic "cinematic action."

### 5.4 Audio Split

Always generate and save:

```text
VideoCard.audioGuidance
```

If:

```text
supportsNativeAudio === true
```

Then write audio guidance into `fullPrompt` and model parameters.

If:

```text
supportsNativeAudio === false
```

Then:

- `generationPrompt` may display audio intent, annotated "for subsequent sound production only."
- `fullPrompt`'s visual portion completely removes the audio section, and does not retain negation phrases like "no audio" or "no music."
- Complete audio content is only saved in `audioGuidance`.

### 5.5 generationPrompt and fullPrompt

```text
generationPrompt: Chinese, user-visible, open for discussion and modification.
fullPrompt: Generated after user confirmation, containing model-required reference image mappings and technical parameters.
```

---

## Stage 6: Prompt Confirmation Gate

Display to the user:

```text
Reference image authority
Parameter summary
Duration adaptation (if any)
Editing and spatial continuity
Per-BEAT actions and camera movements
Opening and tail states
Audio split result
Negative constraints
generationPrompt
```

User may:

```text
Confirm prompt
Adjust a BEAT
Adjust editing or rhythm
Adjust performance or camera movement
Return to parameter confirmation gate
```

Before confirmation, must not:

- Generate the final `fullPrompt` version.
- Call the video generation API.

Record confirmation:

```typescript
confirmationLog.push({
  stage: "prompt_review",
  confirmedAt: string,
  summary: string
});
```

---

## Stage 7: Call Video Generation API

Set:

```text
workflowStatus = generating
```

Call parameters come from confirmed:

```text
referenceImages
generationConfig
fullPrompt
```

### 7.1 Generation Failure

Record:

```typescript
interface VideoGenerationAttempt {
  attemptedAt: string;
  model: string;
  errorCode?: string;
  errorMessage: string;
}
```

On failure, retain confirmed parameters and prompts. User may:

- Retry with the same config.
- Return to parameter confirmation gate.
- Return to prompt confirmation gate.

Failure does not create an empty video version.

### 7.2 Generation Success

Append version:

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

Do not overwrite historical versions.

---

## Stage 8: Result Confirmation and Version Management

Display:

```text
Video preview
Version number
Model
Duration
Quality / Resolution
Changes in this version
```

User may:

- Confirm the current version.
- Generate a new version with the same prompt.
- Modify the prompt and generate a new version.
- Return to the parameter confirmation gate and generate a new version.

On confirmation:

```text
selectedVersion = current version
current version.userConfirmed = true
workflowStatus = confirmed
stale = false
userConfirmed = true
```

Only one selected final version is allowed at a time. Historical versions are retained.

---

## Stage 9: Dependency Invalidation

Save on card creation:

```typescript
storyboardDependency: {
  storyboardVersion: number;
  storyboardImageVersion: number;
  keyShotVersions: Record<string, number>;
}
```

Also save each asset's cardId/version in `referenceImages`.

When any of the following changes:

- Storyboard selected image version.
- Any referenced key shot image version.
- BEATS.
- First frame or tail frame state.
- Scene position annotation image.
- Referenced character, scene, or prop asset versions.

Immediately execute:

```text
stale = true
userConfirmed = false
workflowStatus = configuring
generationConfig.userConfirmed = false
```

Old video versions are retained for comparison but cannot continue as the current confirmed result.

---

## Stage 10: Create VideoCard

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

Compatibility rule:

```typescript
type VideoClipCard = VideoCard; // @deprecated, only for legacy data reading
```

New version serialization must use:

```text
cardType: "VideoCard"
```

---

## Hard Blocks

- One input contains multiple shot groups.
- Current `shotGroupId` does not match existing `VideoCard.shotGroupId`.
- Upstream StoryboardCard is not confirmed or is `stale`.
- Missing storyboard image, key images, BEATS, opening/tail states, or position annotation image.
- Missing relevant character, scene, or key prop assets.
- Requested duration exceeds the shot group's `maxDurationApplied`.
- API capabilities not queried.
- API does not support the global aspect ratio.
- User has not confirmed model, quality, or necessary duration adaptation.
- User has not confirmed the prompt.

## Local Repairs

- Model, quality, resolution, or duration changes: return to parameter confirmation gate.
- BEAT, editing, action, camera movement, or audio changes: return to prompt confirmation gate.
- Single API failure: retain config and prompt, record failure, then retry.
- Unsatisfactory video result: append new version, do not create a new card.

## Completion Check

Before creating or confirming the card, must complete `references/video-generation-quality-checklist.md`. If any hard block item is not passed, do not mark `workflowStatus` or `status` as `confirmed`.

## Generated File Naming Convention

Video files must save `filename` in the following format:

```text
第{集数}集第{场数}场第{组号}组-v{版本号}
```

Example: `第1集第3场第1组-v001.mp4`.

## Next Step After Completion

Completion criteria: `VideoCard` created or updated, `selectedVersion` points to a confirmed video version, `workflowStatus === "confirmed"`, and `stale === false`.

No mandatory downstream at present. `VideoCard` currently serves as the shot group endpoint; users may continue generating new versions, rework the current video, produce the next shot group, or return to `production-coordinator` to handle the next scene.

Recommended phrasing: `Current shot group video is complete. VideoCard currently serves as the shot group endpoint; you may continue to the next shot group, or append new versions to the current video.`


---

# References

## Reference: seedance-2-video-prompt-template

# Seedance 2.0 中文视频提示词模板

## 用途

把已确认 `StoryboardCard` 中的关键分镜图、故事板图、BEATS、首尾状态和资产图片转为视频生成提示词。模板只组织上游已确认的信息，不新增事件。

## 参考图权限

```text
仅将 @故事板图 用作以下信息的视觉锚点：
镜头顺序、机位角度、景别与取景、姿态、站位、银幕方向、构图、
角色/道具/特效状态和空间地理。
严格遵循故事板各格，不要渲染故事板 Sheet 本身，
不要复制其边框、格头、箭头、标签或说明文字，
不要添加本提示词和上游 BEATS 之外的事件。

将 @关键分镜图K01、@关键分镜图K02…… 用作对应动作节拍的成片效果锚点，
锁定关键状态、构图、光色、材质和表演瞬间。

将 @角色资产C01、@角色资产C02…… 作为对应角色最终外貌、脸部、体型、
服装、比例、材质和身份一致性的唯一权威。

将 @场景资产S01 作为空间结构、固定物位置、环境材质和场景身份的唯一权威。

将 @道具资产P01、@道具资产P02…… 作为道具形状、数量、尺寸、材质和使用方式的唯一权威。

将 @场景站位标注图B01 只用于锁定角色初始站位、朝向、视线、轴线、
运动路线和安全机位区；不要渲染图中的标注、文字、编号或箭头。
```

## 完整模板

```text
【参考图权限】
{referenceAuthority}

【剪辑与空间连续性】
使用{editingLanguage}。
跨剪辑始终保持：{geographyLocks}。
保持轴线、视线、银幕运动方向、角色相对位置和固定物位置连续。
不得通过剪辑跳过上游定义的关键接触、结果状态或尾帧。

【视觉风格】
{visualStyle}
光影：{lighting}
色彩：{palette}
材质与画面质感：{materialsAndRendering}
景深与场面可读性：{depthAndReadability}

【环境】
{environment}
固定地理：{fixedGeography}
动态环境：{environmentMotion}

【角色与表演】
{characterIdentityLocks}
{performanceGuidance}
角色数量、道具数量、持用方式和服装状态全程一致。

【情绪指导】
{emotionalGuidance}
用眼神、眉、嘴、呼吸、肩颈、手势和身体重心表达，不只写抽象情绪。

【节奏与升级】
{rhythmAndEscalation}
动作、剪辑和运镜从{openingRhythm}升级到{peakRhythm}，最后以{releaseRhythm}收束。

【音频指导】
{audioGuidance}

【动作节拍 BEATS】
{beats}

【首尾状态】
首帧：{openingState}
尾帧：{tailState}
尾帧必须稳定保留，供下一镜头组衔接。

【负面约束】
不要渲染故事板 Sheet、参考图边框、文字、编号、箭头或拼贴；
不要增加上游未定义的角色、道具、动作、特效、事件或镜头；
不要改变角色身份、脸、服装、体型、道具设计、场景结构和固定地理；
不要重复角色、幽灵残影、错误肢体、错误持物手、错误道具数量；
不要跨轴、反转银幕方向、清空应保持拥挤的群体或改变首尾状态；
{projectNegativeConstraints}

【生成参数】
模型：{model}
画幅：{aspectRatio}
请求时长：{requestedDuration}秒
生成时长：{generatedDuration}秒
画质：{quality}
分辨率：{resolutionIfSupported}
原生音频：{supportsNativeAudio}
{modelSpecificParams}
```

## BEAT 模板

```text
P{number}（{timeRange}）：
剪辑：{editType}；
起始冻结状态：{frozenStart}；
内容运动：{contentMotion}；
运镜：{cameraMotion}；
站位与银幕方向：{blockingAndScreenDirection}；
结果状态：{resultState}；
关键图绑定：{keyShotBindings}。
```

## 音频分流

### API 支持原生音频

在 `fullPrompt` 中保留：

```text
【音频指导】
无配乐。使用{environmentSounds}、{actionSounds}、{impactSounds}和{silenceDesign}。
声音事件必须与对应 BEAT 同步。
```

同时把音频能力写入模型参数。

### API 不支持原生音频

- 从 `fullPrompt` 的视觉提示词中移除整段音频指导。
- 不要在 `fullPrompt` 中保留“无音频”“不要音乐”等否定句；视觉模型提示词中完全不出现音频段。
- `generationPrompt` 可以向用户展示音频意图，但必须标注“仅供后续声音制作”。
- 完整内容保存到 `VideoCard.audioGuidance`。

## 时长适配

默认：

```text
requestedDuration = StoryboardCard.shotGroupSnapshot.duration
generatedDuration = requestedDuration
```

API 不支持精确时长时：

1. 向用户展示 API 支持的时长。
2. 用户选择 `generatedDuration`。
3. 保持 BEAT 顺序和相对节奏，按比例重排时间段。
4. 把每个原始 BEAT 时间映射保存到 `durationAdaptation.beatTimingMap`。
5. 不得静默删减事件、补空白或改变首尾状态。

## 用户案例的中文结构示例

以下示例用于说明原英文案例的专业语言转译，不作为固定内容：

```text
【剪辑与空间连续性】
使用强硬切、爆发切、闪切、甩切和冲击插入镜头。
跨剪辑保持上坡方向、密集军阵、左侧悬崖、右侧岩壁和上方山门一致。

【视觉风格】
夜间山脊上的3D风格化电影动漫动作；低调月光、冷雾、白袍与黑色军阵剪影对比；
空中红色剑轨；以花瓣消散代替血液，不出现血腥。
使用深焦保持军阵规模可读，前景动作始终按单个敌人逐一命中，
配合高张力作画爆发和闪白冲击帧。

【情绪指导】
主角始终向山顶推进，不停止攀登；
每一次独立命中都在仍然拥挤的军阵内部形成一个独立花瓣爆点。

【节奏与升级】
从奔跑中段开始，以目标到目标的爆发闪切推进；
逐步进入山门前的压力停顿；
以一次超自然山门斩击达到峰值；
最后释放为山下密集的花瓣轨迹。
```

## Reference: video-editing-motion-vocabulary

# 视频剪辑与运动词汇

## 剪辑语言

| 中文 | 英文关键词 | 用途 |
|---|---|---|
| 强硬切 | hard cut | 明确、无过渡地切换动作或视角 |
| 爆发切 | burst cut | 用短促密集镜头形成瞬间动作爆发 |
| 闪切 | flash cut | 极短镜头或闪白连接冲击状态 |
| 甩切 | whip cut | 利用快速摇摄或运动模糊切换方向 |
| 冲击插入 | impact insert | 插入手、脚、武器、接触点或结果细节 |
| 猛切 | smash cut | 从一个强状态突然切到反差或结果 |
| 动作匹配切 | match on action | 在同一动作过程中切机位并保持连续 |
| 反应切 | reaction cut | 从事件切到角色的可见反应 |
| 压力停顿 | pressure hold | 在高潮前短暂停留，累积预期 |
| 释放镜头 | release shot | 高潮后扩大空间或降低运动强度 |

不要为“电影感”堆砌剪辑词。每个剪辑词必须对应 BEAT 之间的具体作用。

## 内容运动

每个 BEAT 的内容运动使用：

```text
主体 + 起始位置/状态 + 动作路径和速度 + 接触/变化 + 结果状态
```

示例：

- 主角从画面左下沿台阶向右上连续冲刺，在三个分离接触点逐一命中三名守卫，每次命中形成独立花瓣爆点，军阵密度不降低。
- 系统界面保持固定位置，蓝色警示框短促闪烁两次，光线同步扫过角色面部，随后恢复稳定。

## 运镜

每个 BEAT 的运镜至少写明：

```text
运动类型 + 起始景别/机位 + 方向/路径 + 速度 + 结束景别/机位
```

示例：

- 从低机位全景快速 Track Right，保持主角在画面中央，结束于中景。
- Static，机位和取景范围保持不变，只让角色表演推进。
- 从 MS 缓慢 Dolly In 到 MCU，焦点保持在角色眼睛。

## 空间连续性

跨 BEAT 固定：

- 180度轴线和安全机位区。
- 左右、上下、前后运动方向。
- 角色相对位置和视线。
- 场景固定物位置。
- 道具持用手和状态。
- 拥挤度、群体数量表达和通道宽度。
- 首帧继承状态和尾帧目标状态。

## 节奏与升级

用动作密度、镜头长度、剪辑频率、景别变化和声音留白共同表达：

```text
建立 → 加速 → 压力停顿 → 峰值 → 释放
```

时长适配时保持这一相对结构，不平均拉伸所有 BEAT：

- 建立和释放可适度伸缩。
- 接触、对白落点和高潮结果应保留可读时长。
- 不得把关键事件压缩为不可见瞬间。

## BEAT 时间重映射

当原时长 `D0` 适配到 `D1`：

1. 先按原始时间比例计算候选区间。
2. 为接触、台词落点、峰值和尾帧设置最小可读时长。
3. 从建立、移动过渡和释放段吸收差值。
4. 保持全部 BEAT 顺序。
5. 输出：

```typescript
beatTimingMap: {
  P01: "0.0-1.2s -> 0.0-1.0s";
  P02: "1.2-2.8s -> 1.0-2.4s";
}
```

## Reference: video-generation-quality-checklist

# 视频生成质量检查

## A. 上游与卡片归属

- [ ] 一个 `VideoCard` 只对应一个 `shotGroupId`。
- [ ] `StoryboardCard.workflowStatus === "confirmed"`。
- [ ] `StoryboardCard.storyboardSheet.stale === false`。
- [ ] 故事板图、关键分镜图、BEATS、首帧和尾帧完整。
- [ ] 场景站位标注图已确认。
- [ ] 画面中的角色、场景和道具都有资产图片。

## B. 参考图权限

- [ ] 故事板图只控制镜头、构图、动作、运镜、站位、方向和空间。
- [ ] 关键分镜图锁定对应 BEAT 的成片效果。
- [ ] 角色、场景和道具资产分别是其设计的唯一权威。
- [ ] 场景站位标注图只控制站位、视线、轴线和路线。
- [ ] 提示词明确禁止渲染参考图边框、标签、箭头、文字和拼贴。

## C. 参数确认闸门

- [ ] 已查询当前 API 的模型、时长、画质、分辨率、画幅和原生音频能力。
- [ ] 用户已确认模型和画质。
- [ ] 画幅来自全局 `metadata.aspectRatio`，没有重新选择。
- [ ] `requestedDuration` 等于 `shotGroupSnapshot.duration`。
- [ ] `requestedDuration <= shotGroupSnapshot.maxDurationApplied`；旧卡缺失时按15秒兼容。
- [ ] API 支持精确时长时，`generatedDuration === requestedDuration`。
- [ ] API 不支持精确时长时，用户已确认替代时长。
- [ ] `durationAdaptation.beatTimingMap` 覆盖每个 BEAT，顺序不变。
- [ ] `generationConfig.userConfirmed === true`。

## D. 提示词确认闸门

- [ ] `generationPrompt` 为中文且用户可编辑。
- [ ] 每个 BEAT 包含时间、剪辑、起始状态、内容运动、运镜、站位/方向、结果和关键图绑定。
- [ ] 没有添加上游未定义的事件。
- [ ] 首帧和尾帧与 `videoHandoff` 一致。
- [ ] 用户已确认提示词后才生成 `fullPrompt`。

## E. 音频

- [ ] `audioGuidance` 始终保存在卡片中。
- [ ] `supportsNativeAudio === true` 时，音频进入 `fullPrompt` 和模型参数。
- [ ] `supportsNativeAudio === false` 时，音频不混入视觉 `fullPrompt`。

## F. 版本与失效

- [ ] 重新生成只向 `videoVersions[]` 追加版本。
- [ ] `selectedVersion` 指向存在的视频版本。
- [ ] 只有选中版本可标记为最终确认。
- [ ] 故事板图、关键图、BEATS、首尾状态、站位图或资产版本变化时，`stale = true`。
- [ ] `stale === true` 时，`workflowStatus !== "confirmed"` 且 `userConfirmed === false`。

