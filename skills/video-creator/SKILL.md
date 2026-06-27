---
name: video-creator
description: Use when a confirmed StoryboardCard shot group needs an API-aware video prompt, generation configuration, and versioned video output
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
