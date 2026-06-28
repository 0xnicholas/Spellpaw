---
id: storyboard-creator
name: storyboard-creator
description: Use to create storyboard cards (key-shot images + motion notes) for a scene. Reads scene cards via get_canvas, drives generate_storyboard for each shot to emit sceneCard nodes with reference imagery.
slashCommand: storyboard-creator
examples: []
parameters: {}
required: []
---

# Storyboard Creation

## Core Responsibilities

For one confirmed shot group in `StoryboardPlanCard.shotGroups[]`, sequentially complete:

1. Confirm the key shot image generation plan with the user.
2. Confirm prompts, resolution, generation results, and final versions one by one.
3. Use confirmed key shot images as hard references to generate a motion storyboard Sheet by action beats.
4. Output a single consolidated `StoryboardCard`.

Key shot images handle "what the final frame looks like"; the storyboard handles "how the subject, camera position, and blocking change." These are not either/or choices, and no standalone `ShotImageCard` is output.

## Reference Routing

Read the following references by task; do not copy reference content verbatim to user output:

## Input

### Main Input

```text
StoryboardPlanCard
StoryboardPlanCard.videoGenerationProfileSnapshot
StoryboardPlanCard.sceneStrategyCardId
StoryboardPlanCard.shotGroups[] current shot group
```

`StoryboardPlanCard.videoGenerationProfileSnapshot` must exist, used to confirm that the shot group duration cap comes from the finalized series-wide video config snapshot, not from re-reading the current config at runtime.

`StoryboardPlanCard.sceneStrategyCardId` must exist, used to locate the confirmed `SceneStrategyCard.positionAnnotationImage`. Do not guess the scene strategy card from `upstreamCards`.

The current shot group must contain:

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

`duration` must be a positive number and must not exceed `maxDurationApplied`.

For legacy cards missing `maxDurationApplied`, default to 15s compatibility; do not backfill from the current series-wide config and rewrite legacy shot groups.

### Strategy Text Reading Boundary

The current `shotGroups[]` entry is the sole source of truth for scene, performance, and cinematography strategy text:

```text
shotGroup.sceneStrategy
shotGroup.performanceStrategy
shotGroup.cinematographyStrategy
shotGroup.shotBreakdown
shotGroup.tailFrameAnchor
```

Do not re-read the three strategy source cards' text and overwrite the current shot group snapshot. Source cards may continue to be edited; re-concatenation creates version drift.

### Additional Visual Assets

Only read source cards or asset cards to obtain image references that cannot be inlined:

```text
SceneStrategyCard.positionAnnotationImage.imageUrl
ArtDirectionCard
CharacterAssetCard[]
SceneAssetCard[]
PropAssetCard[]
```

Scene position annotation image reading rules:

1. Locate `SceneStrategyCard` via `StoryboardPlanCard.sceneStrategyCardId`.
2. Prioritize reading `positionAnnotationImage.imageUrl`.
3. Simultaneously validate `positionAnnotationImage.userConfirmed === true`.
4. For legacy data with only `annotatedImageUrl`, allow compatible reading but must record a migration warning.
5. If `StoryboardPlanCard.sceneStrategyCardId` is missing, both image fields are missing, or the image is unconfirmed: stop image generation and require completion of the storyboard plan card or scene position annotation image first.

Do not substitute `sceneEffectImage` (unannotated) for `positionAnnotationImage`.

### Global Aspect Ratio

Read from the full script card `metadata.aspectRatio`:

```text
16:9
9:16
1:1
```

Every key shot image and every storyboard panel must use this aspect ratio. The overall storyboard Sheet's outer ratio may be automatically determined by panel count.

## Output

Sole official output:

```text
StoryboardCard
```

A single card that simultaneously stores the key shot image plan, confirmed key images, action beats, storyboard Sheet, version dependencies, and video handoff information.

## Workflow Status

```typescript
type StoryboardWorkflowStatus =
  | "planning_key_shots"
  | "generating_key_shots"
  | "key_shots_confirmed"
  | "planning_storyboard"
  | "generating_storyboard"
  | "confirmed";
```

Status can only advance in order. When changing a bound key image version, allow rolling back from `confirmed` or `generating_storyboard` to `planning_storyboard`.

---

## Stage 1: Validate Shot Group and Visual Assets

### 1.1 Input Contract

Immediately stop if:

- The current object is not a shot group from `StoryboardPlanCard.shotGroups[]`.
- Missing the three strategy summaries, `shotBreakdown`, or `tailFrameAnchor`.
- `duration > resolvedMaxDuration`, where `shotGroup.maxDurationApplied` takes priority, legacy cards fall back to 15.
- No full script global aspect ratio.
- Missing confirmed scene position annotation image.
- Characters, scenes, or key props in frame cannot find corresponding assets.

When stopping, state the missing field and the upstream step to return to; do not guess.

### 1.2 Tail Frame Validation

`tailFrameAnchor` must have a visual landing point within `shotBreakdown`:

1. Compare composition, character state, prop state, and emotional residue.
2. If `shotBreakdown` does not cover it, determine `StoryboardPlanCard` is incomplete.
3. Do not re-read `CinematographyStrategyCard` text to supplement shots.
4. Return to `director-briefing` to correct the current shot group snapshot.

The strategy text single-source-of-truth principle overrides legacy cross-card frame supplementation logic.

### 1.3 Display Read Results

Briefly present to the user:

```text
Shot group, duration, global aspect ratio
Core task and tail frame
Current shot count
Scene position annotation image status
Character / scene / prop asset counts
```

Do not re-output complete upstream cards.

---

## Stage 2: Build Constraint Pack

Compress the current shot group and visual assets into an internal `constraintPack`:

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

The constraint pack is only for organizing information; it does not modify upstream cards.

---

## Stage 3: Propose and Confirm Key Shot Image Plan

Set:

```text
workflowStatus = planning_key_shots
```

### 3.1 Selection Principles

The agent proposes first; only generate prompts after user confirmation. Key image count is determined by shot group content, not mechanically allocated by duration.

Prioritize selecting:

- Frames that establish space and character relationships.
- Key performance or emotional turning points.
- Moments of greatest video reference value within action initiation, contact, or results.
- Important props, UI, or effects states.
- The tail frame corresponding to `tailFrameAnchor`.

Avoid:

- Two key images that differ only by a small pose.
- Generating high-res images for every storyboard BEAT.
- Writing an entire unfreezable continuous motion as a single image.

### 3.2 Plan Structure

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

### 3.3 User Confirmation

Display item by item:

```text
Number / Timestamp / Type / Frozen moment / Narrative purpose / Selection reason / Source shots
```

User may add, delete, merge, or rewrite. Do not enter image generation before confirmation.

---

## Stage 4: Confirm and Generate Key Shot Images One by One

Set:

```text
workflowStatus = generating_key_shots
```

Execute the following cycle independently for each key image.

### 4.1 Generate Prompt

Read:

The prompt must include:

- Shot task and narrative purpose.
- Per-image purpose for all reference images.
- A single frozen moment.
- Character pose, micro-expressions, eyeline, and hand/prop state.
- Scene zone, blocking, axis, and screen direction.
- Shot size, camera position, focal length intent, composition, and depth of field.
- Motivated light sources, color palette, materials, and atmosphere.
- Identity, quantity, first/last frame, and prop continuity locks.
- Negative constraints.

### 4.2 Confirm Prompt

Show the user an editable `generationPrompt`. Do not call the image generation model before user confirmation.

### 4.3 Confirm Model and Resolution

Query the actual options of the currently available image generation API, then let the user choose:

```text
Model
Supported aspect ratios
Supported resolutions / quality
Other parameters that significantly affect results
```

Do not promise parameters the API does not support, such as "8K" or "infinite detail." Aspect ratio must equal the global aspect ratio and is not an optional choice.

### 4.4 Generation and Versioning

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

Regeneration only adds versions for the current key image; it does not alter other already-confirmed key images.

### 4.5 Result Confirmation

User chooses:

```text
Confirm current version
Modify prompt and generate new version
Generate new version with same prompt
Return to key image plan
```

Only selected versions with `userConfirmed: true` are available for storyboard reference.

### 4.6 Gate One

After all planned key images have confirmed versions:

```text
workflowStatus = key_shots_confirmed
```

Otherwise, forbid entering the storyboard stage.

---

## Stage 5: Build Storyboard Plan by Action Beats

Set:

```text
workflowStatus = planning_storyboard
```

### 5.1 Split Basis

Read:

Split BEATs by visible state changes, not by evenly sampling seconds. The following changes can produce a new BEAT:

- Subject action phases.
- Contact or result states.
- Blocking, facing, eyeline, or occlusion.
- Performance reactions.
- Shot size, camera position, or camera movement phases.
- First frame and tail frame continuity states.

Typically 4-12 panels:

- Merge when adjacent states are similar.
- Split when a single panel contains two action phases that cannot be simultaneously frozen.
- When exceeding 12 panels, compress secondary beats first and explain to the user.

### 5.2 BEAT Structure

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

Every BEAT must have `contentMotion` and `cameraMotion`. For static shots, write `Static`.

### 5.3 Key Image Binding

Each panel binds at least one confirmed key image:

- Establishing panels bind space or establishing-type key images.
- Performance panels bind corresponding performance key images.
- Action/effects panels bind the closest action or effects key image.
- Tail panel binds the tail frame key image.

Key images only lock visual identity and state anchors; BEATs supplement adjacent motion, not copy key image thumbnails onto the Sheet.

### 5.4 Mixed Motion Expression

Default to `mixed`:

- Prioritize expressing through adjacent panel pose, position, composition, and framing changes.
- For complex paths, multi-person crossovers, or rapid contact, only add minimal trajectory or contact stroke marks.
- For complex camera movements, only add camera frame boxes, dashed arrows, or camera symbols.
- Do not require both content arrows and camera arrows for every panel.
- Static is usually not annotated; only show a small locked camera symbol when misinterpretation is possible.

### 5.5 User Confirmation

Display to user:

```text
P## / Time / Beat name / Frozen moment / Content motion / Camera motion / Key image binding / Annotation mode
```

User confirms action beats and annotation intensity before generating storyboard prompt.

---

## Stage 6: Confirm and Generate Storyboard Sheet

### 6.1 Generate Prompt

Read:

The prompt must include:

- Two-line Chinese header.
- AUTO layout and accurate panel count.
- Fixed `P## / Shot tag / Beat name` per panel.
- Concise cinematic storyboard visual grammar.
- Per-image reference usage for confirmed key shot images.
- Identity, quantity, blocking, axis, screen direction, and first/last frame continuity.
- Mixed motion expression rules.
- Panel-by-panel BEATS.
- Negative constraints.

Do not add color swatch panels, material boards, lengthy production notes, reference image thumbnails, or decorative information zones.

### 6.2 Aspect Ratio

```text
panelAspectRatio = globalAspectRatio
sheetAspectRatio = automatically determined by panelCount and layout
```

The prompt must explicitly state each panel's aspect ratio, not just the overall Sheet ratio.

### 6.3 User Confirmation

User confirms:

```text
BEATS
Key image bindings
Explicit annotation positions
Sheet layout
generationPrompt
```

Do not call the model before confirmation.

### 6.4 Generation

Set:

```text
workflowStatus = generating_storyboard
```

The storyboard is generated as an independent version sequence. Regenerating the storyboard does not redo key images.

### 6.5 Result Check

- Panel count and order are correct.
- Each panel's internal aspect ratio equals the global aspect ratio.
- Each panel has only one frozen moment.
- Characters and props are not duplicated.
- Key image-locked identity, scene, and composition are not reset.
- Content motion and camera movement are readable from consecutive panels or minimal annotations.
- No long text, color swatches, material boards, or arrows filling the screen.
- Tail panel matches `tailFrameAnchor`.

When failing, only correct the storyboard prompt and storyboard version.

### 6.6 Gate Two

After user confirms the selected storyboard version:

```text
workflowStatus = confirmed
storyboardSheet.stale = false
```

---

## Stage 7: Dependency Invalidation

The storyboard must save the key image versions it references:

```typescript
dependencyState: {
  referencedKeyShotVersions: Record<string, number>;
}
```

When any of the following occurs:

- Switching the selected version of a bound key image.
- Unconfirming a bound key image.
- Deleting or replacing a bound key image.

Immediately execute:

```text
storyboardSheet.stale = true
storyboardSheet.userConfirmed = false
workflowStatus = planning_storyboard
```

`stale` storyboards cannot be handed to `video-creator`.

---

## Stage 8: Create StoryboardCard

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

  // Migration-period compatibility views, derived from new structure
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

Compatibility mapping:

```text
imageUrl = selected storyboard version.imageUrl
generationPrompt = storyboardSheet.generationPrompt
keyFrames = simplified mapping of storyboardSheet.beats[]
```

Compatibility fields cannot reverse-override the new structure.

---

## User Interaction Summary

The complete flow must include the following confirmation points:

1. Key shot image plan confirmation.
2. Per-key-image prompt confirmation.
3. Per-key-image model and resolution confirmation.
4. Per-key-image result version confirmation.
5. Storyboard action beats and key image binding confirmation.
6. Storyboard prompt confirmation.
7. Storyboard result version confirmation.

Do not compress multiple image generation calls into a single default confirmation.

## Error Handling

### Hard Blocks

- Shot group input contract is incomplete.
- Scene position annotation image is missing or unconfirmed.
- Required asset references are missing.
- Key images are not all confirmed.
- Storyboard panel aspect ratio does not equal the global aspect ratio.
- Storyboard BEAT is not bound to a confirmed key image.
- `contentMotion` or `cameraMotion` is missing.

### Local Repairs

- Single key image drift: only redo that image.
- BEATs too dense or duplicated: only adjust BEATS.
- Movement direction unclear: supplement continuous states first, then minimal annotations.
- Text garbled: reduce visible text and fix short labels.
- Key image version changed: mark storyboard `stale` then redo.

## Completion Check

## Generated File Naming Convention

Key shot images must save `filename` in the following format:

```text
第{集数}集第{场数}场第{组号}组-镜头{镜头编号}-v{版本号}
```

Storyboard images must save `filename` in the following format:

```text
第{集数}集第{场数}场第{组号}组-故事板-v{版本号}
```

Examples: `第1集第3场第1组-镜头01-v001.png`, `第1集第3场第1组-故事板-v001.png`.

## Next Step After Completion

Completion criteria: `StoryboardCard.workflowStatus === "confirmed"`, key shot images and storyboard sheet are both confirmed, and `storyboardSheet.stale === false`.

Prioritize calling `video-creator` to generate video for the current shot group.

If `StoryboardPlanCard` has other shot groups without storyboards, continue calling the current skill to process the next shot group.

Recommended phrasing: `Current shot group storyboard is confirmed. Suggested next step: call video-creator to generate video for this group; or continue creating storyboards for other shot groups.`

---

# References

## Reference: cinematic-translation-vocabulary

# 影视语言转译词汇

## 原则

把上游叙事、表演和拍摄信息转成可见、可冻结、可生图的描述。避免只写“紧张”“高级”“电影感”等抽象判断。

## 景别

| 中文 | 英文 | 主要用途 |
|---|---|---|
| 大远景 | ELS | 建立地理、规模和人物渺小感 |
| 远景 | LS | 读取完整空间、人物路径和群体关系 |
| 全景 | FS | 读取全身动作、重心和站位 |
| 中景 | MS | 兼顾表演、手势和人物关系 |
| 中近景 | MCU | 表情、肩颈、手部动作 |
| 特写 | CU | 明确的面部反应或关键道具 |
| 大特写 | ECU | 眼、嘴、手指、接触点或微小机关 |
| 插入镜头 | Insert | 道具状态、屏幕信息、伤口或操作细节 |

## 机位与角度

| 术语 | 可见效果 |
|---|---|
| 平视 | 中性关系，便于读取表演 |
| 低机位仰拍 | 增强压迫、力量或高位感 |
| 高机位俯拍 | 强调空间、受困或行动路线 |
| 顶视 | 清楚展示站位、路径和群体几何 |
| 荷兰角 | 只在失衡、眩晕或危险升级时使用 |
| 过肩 | 明确对话关系、视线和前后层次 |
| 主观镜头 | 绑定角色所见和心理压力 |

## 焦段意图

| 焦段倾向 | 转译方式 |
|---|---|
| 18-28mm 广角 | 强空间纵深、近大远小、动作路径清楚 |
| 32-40mm 自然广角 | 兼顾人物与环境，适合走位和对话 |
| 50mm 标准 | 接近自然观看，表演不夸张 |
| 75-100mm 中长焦 | 压缩背景、隔离人物、突出微表情 |
| 微距 | 接触点、纹理、机关或极小状态变化 |

不要无依据罗列焦距和光圈。只有当参数会改变构图、透视或景深时才写入提示词。

## 构图与空间

- **三分构图**：主体偏置，为视线或运动方向留空间。
- **中心构图**：强调仪式、对峙、控制或不可回避的焦点。
- **框中框**：门、窗、屏幕或结构限制人物。
- **引导线**：道路、栏杆、光线或队列指向视觉焦点。
- **前景遮挡**：制造窥视、危险接近或空间层次。
- **负空间**：为威胁进入、视线或孤立感保留空间。
- **深焦分层**：前中后景同时承担动作信息。
- **浅景深隔离**：只保留一个表演或道具焦点。

## 表演的可见化

| 抽象情绪 | 可见证据示例 |
|---|---|
| 警惕 | 下巴微收、肩颈绷紧、眼球先于头部转动、呼吸变浅 |
| 震惊 | 呼吸停顿、瞳孔聚焦、嘴唇微张、重心后移 |
| 犹豫 | 视线短暂偏离、手指松紧变化、吸气后未开口 |
| 坚定 | 视线回正、下颌稳定、肩线打开、手势停止游移 |
| 压抑愤怒 | 咬肌收紧、鼻翼扩张、呼吸压低、握持力度增加 |
| 悲伤克制 | 眨眼延迟、嘴角失去支撑、胸口缓慢下沉 |

提示词至少写出眼、眉、嘴、呼吸、肩颈、手势中的两项，不能只写情绪名。

## 动作阶段

把动作拆为可冻结阶段：

```text
准备：重心和视线建立
启动：第一处身体部位或道具开始改变
进行：路径和力量方向清晰
接触：人与物、人与人或特效发生作用
结果：位置、姿态、道具或环境状态改变
余韵：呼吸、视线、碎片、烟尘、光效或情绪残留
```

一张关键分镜图只选择其中一个阶段。故事板可让相邻 BEAT 分别展示不同阶段。

## 站位与连续性

描述时至少包含：

- 前景/中景/后景。
- 左/中/右或具体场景区域。
- 朝向与视线目标。
- 与其他角色和固定物的距离。
- 银幕运动方向。
- 持物手、道具状态和服装状态。

优先使用场景站位标注图中的空间关系，不凭空重排角色。

## Reference: key-shot-prompt-template

# 关键分镜图提示词模板

## 用途

用于为一个镜头组逐张生成高清关键分镜图。关键分镜图是视频生成阶段的视觉效果参考，负责锁定角色、场景、道具、构图、光色、材质和关键表演瞬间，不负责完整解释运动过程。

## 硬约束

- 一张图只表现一个可冻结的瞬间，不同时画动作前态与后态。
- 图片画幅必须等于全局画幅。
- 必须引用已确认的场景站位标注图 `SceneStrategyCard.positionAnnotationImage.imageUrl`。
- 必须引用画面内相关的角色、场景和道具资产图。
- 参考图用于锁定身份、空间和造型，不得以拼贴、缩略图或说明板形式出现在成图中。
- 清晰度只能从当前图像 API 实际支持的选项中让用户选择。

## 模板

```text
【关键分镜图】

[镜头任务]
镜头组：{shotGroupId}
关键图：{keyShotId}
时间点：{timestamp}
类型：{establishing | performance | action | effect | tail | custom}
叙事目的：{narrativePurpose}
来源镜头：{sourceShotIds}
承接关系：{continuityPurpose}

[参考图绑定]
图像A，场景站位标注图：锁定空间结构、角色站位、朝向、视线和轴线。
图像B，场景资产图：锁定场景建筑、家具、环境和材质。
图像C起，角色资产图：分别锁定角色身份、脸型、发型、服装和体态。
后续图像，道具资产图：锁定道具形状、尺寸、材质和持用方式。
只继承与本镜头有关的视觉信息，不把参考图的标注文字、边框或说明复制进成图。

[单一冻结瞬间]
画面冻结在：{frozenMoment}
此刻之前：{priorState，仅用于理解，不得画入}
此刻之后：{nextState，仅用于理解，不得画入}
禁止同一角色重复出现，禁止用残影同时展示前后姿态。

[主体与表演]
角色/主体：{subjectIdentity}
画面位置：{screenPosition}
身体姿态：{bodyPose}
手部与道具：{handPropState}
视线目标：{eyelineTarget}
可见表演：{eyes + brows + mouth + breathing + shoulders + gesture}
动作接触或特效状态：{contactOrEffectState}

[场景与站位]
场景区域：{locationAndZone}
前景：{foreground}
中景：{midground}
后景：{background}
角色间距与遮挡：{spacingAndOcclusion}
轴线与银幕方向：{axisAndScreenDirection}
必须与场景站位标注图一致。

[摄影表达]
景别：{shotSize}
机位与角度：{cameraAngle}
焦段意图：{lensIntent}
构图：{composition}
视觉焦点：{visualFocus}
景深：{depthOfField}
当前画面是静态冻结帧；运镜只用于说明取景状态，不绘制运动箭头。

[光色与材质]
动机光源：{motivatedSources}
主光/补光/轮廓光：{lightingHierarchy}
色彩：{palette}
关键材质：{materials}
氛围与空气状态：{atmosphere}
严格服从 ArtDirectionCard 和当前镜头组 sceneStrategy。

[连续性锁定]
角色身份与数量：{identityCountLock}
服装、伤痕、湿度和污损：{costumeState}
道具数量与状态：{propState}
场景固定物位置：{environmentState}
首帧继承：{openingState}
尾帧目标：{tailFrameAnchor}

[负面约束]
不要重复角色，不要额外人物，不要额外道具，不要错误持物手，不要跨轴，
不要把动作前态和后态同时画入，不要拼贴参考图，不要生成文字说明、边框、Logo或水印，
不要偏离角色资产、场景站位标注图、美术设定和尾帧状态。

[模型参数]
模型：{model}
画幅：{globalAspectRatio}
清晰度：{userConfirmedResolution}
```

## 生成前检查

1. `frozenMoment` 能否在一个瞬间中成立。
2. 站位、朝向、视线是否能在 `positionAnnotationImage` 中找到依据。
3. 每个可见角色、场景和道具是否都有资产引用。
4. 景别、机位、焦段和构图是否服务叙事目的。
5. 尾帧关键图是否严格落在 `tailFrameAnchor`。

## Reference: motion-camera-vocabulary

# 内容运动与运镜词汇

## 两类运动必须分开

```text
contentMotion：画面中的角色、道具、UI、特效、环境或群体如何变化。
cameraMotion：摄影机位置、方向、取景范围或焦距如何变化。
```

每个故事板 BEAT 都必须填写这两个字段。静止机位写 `Static`，不是留空。

## 内容运动句式

```text
主体 + 起始状态/位置 + 动作阶段 + 路径或力量方向 + 结束状态/接触结果
```

示例：

- 林渊从画面中央偏右前倾半步，右手抬至胸前，视线始终锁定系统界面。
- 火焰从丧尸双肩向上卷起，在头顶汇成紫黑色冠状余焰。
- 三名守卫分别在三个接触点被击中，身体不重复，结果以三个独立花瓣爆点表示。
- UI 的警示框由稳定蓝光转为短促红闪，位置固定，不扩大遮挡人物面部。

## 运镜词汇

| 术语 | 含义 | 适合表达 |
|---|---|---|
| Static | 机位和取景范围不变 | 表演、接触结果、空间关系稳定 |
| Dolly In / Out | 摄影机前进/后退 | 接近情绪或揭示环境 |
| Truck / Track | 摄影机横向或沿主体移动 | 跟随路径、保持相对距离 |
| Pan | 固定机位水平旋转 | 追随横向主体或揭示关系 |
| Tilt | 固定机位垂直旋转 | 从局部揭示高度或上下关系 |
| Pedestal | 摄影机整体升降 | 保持角度的垂直移动 |
| Crane / Jib | 弧线升降 | 从人物扩展到场面或反向收束 |
| Orbit | 环绕主体 | 关系反转、力量展示、空间揭示 |
| Zoom | 焦距变化，机位不动 | 人为压缩或放大，不等同 Dolly |
| Rack Focus | 焦点平面切换 | 前后景叙事焦点转移 |
| Handheld | 可控手持波动 | 紧迫、跟随和不稳定感 |

运镜描述需包含阶段和方向，例如“从 MS 缓慢 Dolly In 到 MCU”，不要只写“推进”。

## 标注方式选择

### implicit

依靠相邻格的姿态、位置、构图和取景变化即可读懂。

适用：

- 单人直线走动。
- 简单转身、抬手、坐下或起身。
- 由 LS 到 MS 的清楚推进序列。
- Static 镜头。

### explicit

单帧或相邻格仍可能误读，必须显示少量标注。

适用：

- 环绕、变焦、复杂 Crane 路径。
- 多人交叉换位。
- 快速接触点或多目标分别命中。
- 路径被遮挡或银幕方向容易混淆。

可用：

- 单一轨迹线。
- 接触短划。
- 起点/终点。
- 取景框叠影。
- 小型镜头图标或虚线箭头。

### mixed

默认选择。主要依靠连续状态，只为复杂部分添加一到两个标注。不要为每个主体、每格、每种运动都加箭头。

## 质量规则

- 内容运动与运镜不能混写成一句。
- 不使用角色残影同时表示多个时间状态。
- 箭头不得遮挡脸、手、接触点或关键道具。
- 银幕方向应连续；需要反向时必须有可读的转向 BEAT。
- 相邻 BEAT 如果内容与取景均无显著变化，应合并。
- 一个 BEAT 如果含两个不能同时冻结的动作阶段，应拆分。

## Reference: prompt-quality-checklist

# 故事板生图质量检查

## A. 输入与引用

- [ ] 当前镜头组来自 `StoryboardPlanCard.shotGroups[]`。
- [ ] `duration <= maxDurationApplied`；旧卡缺少该字段时按15秒兼容。
- [ ] `sceneStrategy`、`performanceStrategy`、`cinematographyStrategy`、`shotBreakdown`、`tailFrameAnchor` 完整。
- [ ] 场景站位标注图来自 `positionAnnotationImage.imageUrl` 且已确认。
- [ ] 旧 `annotatedImageUrl` 仅作为兼容字段，并记录迁移警告。
- [ ] 可见角色、场景和道具均绑定相应资产图。
- [ ] 没有重复读取三张策略源卡的文本来覆盖 shotGroup 快照。

## B. 关键分镜图

- [ ] 生图计划已由用户确认。
- [ ] 每张图只有一个单一冻结瞬间。
- [ ] 时间点、类型、叙事目的和来源镜头清楚。
- [ ] 角色身份、数量、脸、发型、服装和体态锁定。
- [ ] 站位、朝向、视线和轴线与场景站位标注图一致。
- [ ] 道具数量、持物手和状态正确。
- [ ] 光源、色卡和材质来自上游约束。
- [ ] 图片画幅等于全局画幅。
- [ ] 清晰度是用户从当前 API 支持选项中确认的值。
- [ ] 尾帧关键图严格匹配 `tailFrameAnchor`。

## C. 闸门

- [ ] 每张计划内关键图均有已确认版本。
- [ ] 未确认或已取消确认的关键图不会进入故事板引用。
- [ ] 关键图未全部确认时，工作流不能进入 `planning_storyboard`。

## D. 动作节拍

- [ ] 按可见状态变化拆分，不按秒数机械取样。
- [ ] 通常为 4-12 格；超过 12 格已压缩次要节拍并获得用户确认。
- [ ] 相邻近似状态已合并。
- [ ] 单格没有包含两个不能同时冻结的动作阶段。
- [ ] 首帧和尾帧状态明确。
- [ ] 每个 BEAT 有 `contentMotion` 和 `cameraMotion`。
- [ ] Static 镜头明确写出，不留空。

## E. 故事板 Sheet

- [ ] 每格绑定一个或多个已确认关键图版本。
- [ ] 每格内部画幅等于全局画幅。
- [ ] 整张 Sheet 外层比例按布局决定。
- [ ] 默认通过连续状态表达运动。
- [ ] 只有复杂路径、接触或运镜才使用少量显式标注。
- [ ] 没有机械添加双箭头。
- [ ] 没有色卡、材质板、长段说明或参考图拼贴。
- [ ] 可见文字仅含两行表头、格头和必要短标注。
- [ ] 角色、道具、轴线、银幕方向和首尾状态连续。

## F. 依赖与交接

- [ ] `dependencyState.referencedKeyShotVersions` 与实际绑定版本一致。
- [ ] 任一绑定关键图版本变化后，`storyboardSheet.stale = true`。
- [ ] `stale` 为 true 时卡片不能保持 `confirmed`。
- [ ] `videoHandoff` 包含已确认关键图、故事板图、BEATS、首帧和尾帧状态。
- [ ] 兼容字段 `imageUrl`、`generationPrompt`、`keyFrames` 可由新结构派生。

## Reference: storyboard-sheet-prompt-template

# 运动故事板 Sheet 提示词模板

## 用途

故事板 Sheet 用于视频生成阶段补充主体运动、运镜、站位、空间方向、接触结果和连续性。它必须引用已确认关键分镜图，不承担重新设计角色、场景或成片美术效果的职责。

## 画幅规则

- 每个 panel 内部画幅必须等于全局画幅。
- 整张 Sheet 的外层比例按 panel 数量和可读性自动决定，不要求等于全局画幅。
- panel 数量按动作节拍自动确定，通常为 4-12 格。

## 中文模板

```text
创建一张{sheetAspectRatio}的电影制作故事板 Sheet。

[主体任务]
为{shotGroupId}制作运动故事板。画面讲述：{motionSummary}。
关键分镜图已经锁定视觉效果；本 Sheet 只补充动作阶段、主体路径、运镜、站位和连续性。

[表头]
制作克制、清晰的故事板表头，只显示以下两行中文：
"{title}"
"{oneSentenceSummary}"

[版式结构]
使用 AUTO 布局，共{panelCount}格。
每个 panel 保持{globalAspectRatio}。
严格按 BEATS 的 P## 顺序，每个 BEAT 对应一格。
格头格式固定为：P## / 镜头标签 / 节拍名。

[视觉语法]
panel 内部使用简洁、可读的影视故事板缩略图语言：
清楚的身体轮廓、姿态重心、接触关系、银幕方向和前中后景。
降低面部、服装和材质细节，只保留识别身份和读取动作所需的信息。
每格只画一个冻结瞬间，不画同一角色的前后态副本。

[关键分镜图引用]
关键图A：{keyShotReferenceA}，用于锁定{lockedTraitsA}。
关键图B：{keyShotReferenceB}，用于锁定{lockedTraitsB}。
{moreKeyShotReferences}
每个 BEAT 的 keyShotBindings 指定该格继承哪些关键图。
不得重新设计关键图已锁定的角色身份、场景结构、核心构图和光色关系。

[连续性]
保持以下内容一致：
{identityContinuity}
{blockingContinuity}
{axisAndScreenDirection}
{propAndCostumeContinuity}
{openingAndTailState}

[数量锁定]
{characterCountLock}
{propCountLock}
{crowdOrEffectCountLock}
同一角色在单格只出现一次，除非上游明确要求镜面、屏幕或影像中的第二呈现。

[文字规则]
可见文字仅限两行表头、格头和复杂运动所需的极短中文标注。
不要显示章节名、长句、时间说明、色卡、材质板或参考图缩略图。

[运动表达规则]
默认使用相邻格的姿态、位置、视线、构图和取景范围变化表达运动。
复杂路径、多人交叉调度或快速接触，可使用少量轨迹线、接触短划、起点或终点。
复杂推拉摇移、环绕、变焦或机位切换，可使用少量镜头框、虚线箭头或镜头符号。
不要机械地在每格添加内容箭头和运镜箭头。
Static 镜头通常不加标注；只有可能误读时才使用小型锁定机位符号。

[约束]
避免 Logo、水印、乱码、额外 panel、插图、参考图拼贴、完成度过高的插画风、
重复角色、幽灵残影、动作前后态同框、跨轴、错误银幕方向、错误道具数量、
无关人物、无关场景、密集说明文字和满屏运动箭头。

[动作节拍]
BEATS：
{beats}
```

## BEAT 模板

```text
P{number} / {shotTag} / {beatName}：
{frozenMoment}；
站位：{subjectBlocking}；
内容运动：{contentMotion}；
运镜：{cameraMotion}；
连续性状态：{continuityState}；
关键图绑定：{keyShotBindings}；
标注方式：{implicit | explicit | mixed}，{visibleAnnotationIfNeeded}。
```

## 拆格规则

出现以下任一可见变化时，可产生新 BEAT：

- 主体动作阶段改变。
- 接触或结果状态改变。
- 站位、朝向、视线或遮挡关系改变。
- 表演反应改变。
- 景别、机位或运镜阶段改变。
- 首帧或尾帧连续性状态改变。

相邻 BEAT 状态近似时合并；单个 BEAT 包含两个不能同时冻结的动作阶段时拆分。超过 12 格时先压缩次要节拍并征询用户。

