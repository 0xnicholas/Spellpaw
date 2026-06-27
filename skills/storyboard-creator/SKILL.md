---
name: storyboard-creator
description: Use when a confirmed StoryboardPlanCard shot group needs key-shot image planning, prompt confirmation, image generation, and a motion-focused storyboard sheet
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

- Before generating key shot image prompts, read `references/key-shot-prompt-template.md`.
- Before generating storyboard Sheet prompts, read `references/storyboard-sheet-prompt-template.md`.
- When converting abstract plot, emotion, and action into visible cinematic language, read `references/cinematic-translation-vocabulary.md`.
- When breaking down content motion, camera movement, and annotation methods, read `references/motion-camera-vocabulary.md`.
- Before each image generation and card creation entry, read `references/prompt-quality-checklist.md`.

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

```text
references/key-shot-prompt-template.md
references/cinematic-translation-vocabulary.md
```

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

```text
references/cinematic-translation-vocabulary.md
references/motion-camera-vocabulary.md
```

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

```text
references/storyboard-sheet-prompt-template.md
references/motion-camera-vocabulary.md
```

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

Read `references/prompt-quality-checklist.md`, focusing on:

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

Before creating the card, must complete `references/prompt-quality-checklist.md`. If any hard block item is not passed, do not mark the card as `confirmed`.

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
