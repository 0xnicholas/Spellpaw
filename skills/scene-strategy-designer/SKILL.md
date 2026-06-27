---
name: scene-strategy-designer
description: Use when an EpisodeSceneDetailCard and DirectorBriefingCard need a scene strategy based on a confirmed SceneAssetCard.selectedVisual
---

# Scene Strategy Designer

Based on the EpisodeSceneDetailCard, DirectorBriefingCard precheck directives, SceneAssetCard (with confirmed `selectedVisual`), and Art Direction Card, design the scene's lighting scheme, color tone and atmosphere, and character positioning. Generate a scene effect image with lighting effects and character position annotations.

**Core logic**: Based on the confirmed scene image in `SceneAssetCard.selectedVisual`, overlay lighting design and character position annotations required by the story, rather than generating a new scene from scratch.

**This skill is the only strategy skill that generates images**, using a two-stage generation: first generate the scene effect image (scene panorama + lighting effects), then discuss and annotate character positions.

---

## Reference Routing

This skill's scene, lighting, spatial, and atmosphere rules are stored in `references/`; read on demand:

- Light source motivation, light layers, light vocabulary: read `references/lighting-vocabulary.md`.
- Spatial blocking, axis pre-establishment, action paths, scene reference image types: read `references/spatial-blocking-reference.md`.
- Color narrative, atmosphere vocabulary, scene negative constraints: read `references/color-atmosphere-vocabulary.md`.

Usage principle: References are used to constrain the scene strategy and image generation prompts. Do not mechanically output all light layers or all blocking fields; select only the most essential scene control points based on the director's precheck structure.

---

## Overall Workflow

```
Prerequisite: `SceneAssetCard.selectedVisual` has been generated and confirmed in the asset zone ✅
Input: EpisodeSceneDetailCard + DirectorBriefingCard (precheck) + SceneAssetCard (with `selectedVisual`) + Art Direction Card
  ↓
Stage 1: Analyze upstream information
  - Read EpisodeSceneDetailCard (visualDescription, sceneElements, emotion, rhythm)
  - Read DirectorBriefingCard (primaryStructure, preliminaryShotGroupPlan, strategyDirectives.scene) ⭐
  - Read SceneAssetCard (scene description, lighting solution, `selectedVisual.image` / `selectedVisual.panoramaImage`) ⭐ Critical
  - Read Art Direction Card (visual style, color system)
  ↓
Stage 2: Design lighting scheme
  - Select lighting type based on emotional tone
  - Determine lighting intensity based on time (day/night)
  - Determine lighting direction and color temperature
  ↓
Stage 3: Design color tone and atmosphere
  - Select dominant color based on art direction
  - Select accent color based on emotion
  - Describe overall atmosphere
  ↓
Stage 4: Design character positions (inferred from story)
  - Infer character positions from visualDescription
  - Infer character postures from characterStates
  - Determine foreground/midground/background relationships
  - ⚠️ Discuss and confirm inferred positions with user (required)
  ↓
Stage 5: Generate scene effect image (Phase One) ⭐ Core difference
  - Create SceneStrategyCard (containing lighting, color tone, atmosphere, character position design)
  - Discuss and confirm all inferred content with user (especially character positions)
  - Generate prompt (based on scene panorama + overlaid lighting adjustments)
  - Present prompt to user for confirmation/modification
  - Call image generation model (GPT-Image-2 preferred), requirements:
    * Use scene panorama as base reference
    * Adjust lighting effects to match story emotion
    * Keep scene structure highly consistent with panorama
  - User confirms effect image
  ↓
Stage 6: Annotate character positions (Phase Two)
  - Annotate character positions on the effect image (numbered or text annotations)
  - User may adjust positions
  - Update SceneStrategyCard (add annotated effect image URL)
  ↓
Output: SceneStrategyCard (with scene effect image and character position annotation image)
```

---

## ⚠️ Key Distinction

### Scene Generator vs Scene Strategy Designer

| Dimension | Scene Generator (Asset Zone) | Scene Strategy Designer (Production Zone) |
|-----------|------------------------------|-------------------------------------------|
| **Task** | Generate scene assets | Design shooting strategy based on scene assets |
| **Input** | SceneAssetCard (text description) | EpisodeSceneDetailCard + SceneAssetCard (with `selectedVisual`) |
| **Output** | Scene panorama (empty, no characters, standard lighting) | Scene effect image (panorama + lighting adjustments + position annotations) |
| **Scene content** | Clean scene, no characters | Scene + character position annotations |
| **Lighting design** | Standard lighting scheme | Lighting adjusted for story emotion |
| **Generation logic** | Generate new scene from scratch | Overlay effects on existing panorama |

### Workflow Handoff

```
Asset Zone:
├─ Scene asset card creation → scene-asset-extraction skill
└─ Scene panorama generation → scene-generator skill
       ↓
Production Zone:
└─ Scene effect image generation → scene-strategy-designer skill (this skill)
     Based on panorama + overlaid lighting + position annotations
```

---

## Stage 1: Analyze Upstream Information

### 1.1 Read EpisodeSceneDetailCard

**Goal**: Retrieve scene visual description, elements, emotion, and rhythm information

**Input**:
- `episodeNumber`: Episode number
- `sceneNumber`: Scene number (e.g. "1-1A")

**Execution logic**:
1. Locate the EpisodeSceneDetailCard by `episodeNumber` and `sceneNumber`
2. Extract the following fields:
   - `visualDescription`: Detailed visual description array
   - `sceneElements`: Scene visual elements (environment, characterStates, objects, lighting, atmosphere)
   - `cameraInfo`: Camera information
   - `emotion`: Emotional tone
   - `emotionIntensity`: Emotional intensity (1-10)
   - `rhythm`: Rhythm (fast/medium/slow)
   - `location`: Scene location
   - `timeOfDay`: Time of day (day/night)
   - `lighting`: Lighting type (natural/artificial)

**Sample output**:
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

### 1.1.5 Read DirectorBriefingCard (CRITICAL)

**Goal**: Retrieve director precheck constraints on scene strategy, ensuring the scene strategy does not diverge independently.

**Input**:
- `directorBriefingCardId`: Created by the production zone workflow after the EpisodeSceneDetailCard

**Must extract**:
- `precheck.primaryStructure`: Primary structure
- `precheck.secondaryStructure`: Secondary structure
- `precheck.preliminaryShotGroupPlan`: Preliminary shot group plan
- `precheck.strategyDirectives.scene`: Scene strategy design directives

**Execution rules**:
1. Scene lighting, blocking, and preview images must serve the director's precheck structure.
2. If primary structure is `dialogue_cross_cutting`, prioritize establishing axis, seating/standing positions, eye-line direction, and cuttable reaction angles.
3. If primary structure is `close_up_micro_expression`, the scene strategy should compress background complexity, emphasizing light source, facial readability, and emotional atmosphere.
4. If primary structure is `continuous_action` or `fight_choreography`, must clearly define start point, end point, action path, obstacles, and interactable/collidable environmental anchor points.
5. If primary structure is `sequential_split`, each shot group's starting and ending spatial state must be inheritable by tail-frame anchors.

**Output to SceneStrategyCard**:
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

### 1.2 Read SceneAssetCard

**Goal**: Retrieve confirmed scene visual reference (required), lighting solution, material details

**Input**:
- `sceneId`: From the EpisodeSceneDetailCard's `sceneLocationId` field

**Execution logic**:
1. Locate the SceneAssetCard by `sceneId`
2. Extract the following fields:
   - `selectedVisual.image`: Confirmed scene concept art (required) ⭐
   - `selectedVisual.panoramaImage`: Confirmed panorama (optional; preferred for scenes requiring spatial surround-view or multi-angle consistency)
   - `lightingSolution`: Lighting solution (light source type, intensity, color temperature)
   - `colorSolution`: Color solution (dominant color, accent color)
   - `materialDetails`: Material details

**Precondition check (CRITICAL)**:
- ⚠️ If `selectedVisual` does not exist, **must stop work**
- ⚠️ If `selectedVisual.userConfirmed === true` is not satisfied, **must stop work**
- ⚠️ If `selectedVisual.stale === true`, **must stop work**
- Prompt user: "Scene visual has not been confirmed. Please use the scene-generator skill in the asset zone to generate and confirm the scene image first."
- Scene strategy design must be based on `SceneAssetCard.selectedVisual`; cannot generate scene from scratch
- Must not read `scenePanoramaUrl`; this field is not part of the current contract
- Must not bypass `selectedVisual` to randomly pick images from `SceneConceptCard.imageVersions[]`

### 1.3 Read Art Direction Card

**Goal**: Retrieve the series-wide visual style, color system, and lighting system

**Execution logic**:
1. Read the Art Direction Card
2. Extract the following fields:
   - `visualStyle.artStyle`: Art style (e.g., post-apocalyptic realism)
   - `colorSystem.emotionMapping`: Emotion-to-color mapping table
   - `lightingSystem.moodMapping`: Mood-to-lighting mapping table
   - `compositionPrinciples`: Composition principles

**Sample output**:
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

## Stage 2: Design Lighting Scheme

### 2.1 Select Lighting Type

**Inference rules**:

| Condition | Lighting Type |
|-----------|---------------|
| `timeOfDay` = "日" + `lighting` = "自然光" | natural |
| `timeOfDay` = "夜" + `lighting` = "人工光" | artificial |
| `timeOfDay` = "日" + `lighting` = "人工光" | mixed |
| `sceneElements.lighting` exists | Reference lighting description |

**Example**:
```typescript
// Input: timeOfDay = "日", lighting = "自然光"
// Output:
{
  type: "natural",
  description: "自然日光从上方照射，模拟海面反射的散射光"
}
```

### 2.2 Determine Lighting Intensity

**Inference rules**:

| Condition | Lighting Intensity |
|-----------|--------------------|
| `emotionIntensity` >= 8 | strong |
| `emotionIntensity` 5-7 | medium |
| `emotionIntensity` < 5 | weak |
| `emotion` contains "压迫感"/"恐怖" | weak (weak light, creating oppression) |

### 2.3 Determine Lighting Direction and Color Temperature

**Inference rules**:

| Emotion Type | Lighting Direction | Color Temperature |
|--------------|--------------------|--------------------|
| Shock, oppression | Top light / side light | cool |
| Warmth, cheerfulness | Front light | warm |
| Mystery, eeriness | Back light / under light | cool |
| Daily life, calm | Side light | neutral |

**Sample output**:
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

## Stage 3: Design Color Tone and Atmosphere

### 3.1 Select Dominant Color

**Inference rules**:
1. Find matching emotion from the art direction's `emotionMapping`
2. If match found, use the mapped dominant color
3. If not found, use default rules:

| Emotion Type | Dominant Color |
|--------------|----------------|
| Shock, oppression | Cool gray / deep blue |
| Warmth, cheerfulness | Warm yellow / orange |
| Mystery, eeriness | Purple / dark green |
| Sadness, despair | Dark gray / black |

### 3.2 Select Accent Color

**Inference rules**:
1. Select based on key elements in `visualDescription`
2. Example: "海底酒店亮着灯光" → warm yellow as accent color
3. Accent color should contrast with dominant color

### 3.3 Describe Overall Atmosphere

**Inference rules**:
1. Integrate `emotion`, `emotionIntensity`, `rhythm`
2. Reference atmosphere descriptions in `visualDescription`
3. Determine tension level:
   - `emotionIntensity` >= 8 → high
   - 5-7 → medium
   - < 5 → low

**Sample output**:
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

## Stage 4: Design Character Positions

### 4.1 Infer Character Locations

**Inference rules**:
1. Extract character-related descriptions from `visualDescription`
2. Extract character states from `sceneElements.characterStates`
3. Infer character depth position:

| Description Keywords | Depth Position |
|----------------------|----------------|
| "近景"/"特写"/"面前" | foreground |
| "中景"/"站立"/"对话" | midground |
| "远景"/"背景"/"远处" | background |

### 4.2 Infer Character Postures

**Inference rules**:
1. Directly extract posture descriptions from `characterStates[].state`
2. Supplement action details (based on emotion and rhythm)

**Example**:
```typescript
// Input:
characterStates: [
  { character: "战士", state: "站在浮岛城墙上，举枪拼死抵抗" }
]

// Output:
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

### 4.3 Determine Foreground/Midground/Background Relationships

**Inference rules**:
1. Determine visual layers based on `visualDescription` sequence order
2. Smaller sequence numbers → closer to foreground
3. Ensure at least 2 depth layers

**Sample output**:
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

## Stage 5: Generate Scene Effect Image (Phase One)

### 5.0 Create SceneStrategyCard and Confirm with User (CRITICAL) ⭐

**User interaction flow** (before generating prompts):

1. **Create SceneStrategyCard draft**
   - Include all Stage 2-4 design content: lighting scheme, color tone scheme, atmosphere, character positions
   - Mark status as `draft`

2. **Present and discuss inferred content with user**
   ```
   【SceneStrategyCard created - requires your confirmation】

   Card location: [file path]

   ⚠️ Inferred content requiring focused discussion:

   1. Character position issues (most critical)
      - [List each character's inferred position]
      - [Mark uncertain points, ask user]

   2. Composition and depth issues
      - [Describe inferred composition scheme]
      - [Ask user to confirm]

   3. Visual focus issues
      - [List possible focus options]
      - [Ask user what they want to emphasize]

   Please provide feedback:
   A. Confirm all
   B. Specific modifications (tell me what needs adjustment)
   C. Overall adjustment (describe the image you have in mind)
   ```

3. **Adjust card based on user feedback**
   - Update character positions
   - Adjust composition scheme
   - Modify visual focus
   - Update card status to `confirmed`

4. **Enter prompt generation stage after confirmation**
   - Only generate prompts after user confirmation
   - Generate prompts based on confirmed card content

### 5.1 Generate Prompt

**Prerequisites**:
- Scene panorama already exists ✅
- SceneStrategyCard confirmed with user ✅

**Prompt core logic**:
- Based on existing scene panorama
- Request AI to adjust lighting effects (rather than generate a new scene)
- Keep scene structure highly consistent with panorama

**Prompt structure**:
```
Lighting adjustment prompt based on existing scene image:

[Reference scene description: extracted from SceneAssetCard] +
[Lighting adjustment scheme: Stage 2 design] +
[Color tone adjustment: Stage 3 design] +
[Atmosphere enhancement: Stage 3 design] +
[Quality tags]

⚠️ Critical constraints:
- Scene structure must remain consistent with existing scene panorama
- Only adjust lighting, color tone, atmosphere
- Do not change scene layout or object positions
```

**Prompt template** (optimized for GPT-Image-2):

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

**Example**:
```
A cinematic scene of underwater base and floating island under siege, daytime.

Environment: Turbulent water surface, flooded land, distant buildings with only rooftops visible, shaking floating island base, seabed, glowing underwater hotel

Lighting: Natural daylight from above, simulating scattered light reflected from the sea surface, creating a cold top-light effect to convey post-apocalyptic oppression, cool color temperature, medium intensity

Color scheme: Dominated by cold steel blue (#2C3E50), accented with warm orange (underwater hotel lights, #FFA500), creating a cold and oppressive mood

Atmosphere: Post-apocalyptic realism style, turbulent water, zombie horde besieging the floating island, camera descending to the seabed revealing the underwater base's visual contrast. The cold deep blue tone creates oppression, while the warm light from the underwater hotel forms a metaphor of hope. Fast-paced editing enhances the shocking brutality of the apocalypse.

Visual style: post-apocalyptic realism, high-tension, fast-paced

Quality: cinematic composition, highly detailed, photorealistic, 8K, dramatic lighting, wide angle shot
```

### 5.2 Present Prompt to User for Confirmation

**User interaction**:
```
【Scene effect image generation - Prompt confirmation】

Scene: Episode 1-Scene 1 (海上浮岛/海底)
Based on scene panorama: [panorama URL or filename]

Prompt (Chinese version - GPT-Image-2):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[Display the generated prompt above]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Notes:
- This prompt will adjust lighting and color tone based on the existing scene panorama to match story emotion
- Scene structure will remain consistent with the panorama

Please choose:
1. Confirm and generate (using GPT-Image-2) ⭐ Recommended
2. Modify prompt then generate
3. Switch model (Gemini)
4. Discuss prompt strategy

Enter option (1/2/3/4):
```

### 5.3 Call Image Generation Model

**Model selection**:
- Preferred: GPT-Image-2 (best scene atmosphere)
- Alternative A: Gemini (richer detail)
- Alternative B: Seedance5.0 (strong stylization)

**Call logic**:
```typescript
async function generateSceneImage(prompt: string, model: string) {
  const fullPrompt = prompt;

  // Call corresponding model API
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

### 5.4 User Confirms Effect Image

**User interaction**:
```
【Scene effect image generated】

[Display generated image]

Image URL: [imageUrl]
Generation model: GPT-Image-2
Generation time: 2026-06-02 14:30:00

Please choose:
1. Confirm this effect image, proceed to character position annotation stage
2. Regenerate (modify prompt)
3. Switch model and regenerate

Enter option (1/2/3):
```

**Note**:
- If user chooses "2" or "3", return to Stage 5.2
- Record version number (increment on each regeneration)
- All generated effect images are preserved; user can revert to previous versions

---

## Stage 6: Annotate Character Positions (Phase Two)

Annotation methods at `references/position-annotation-methods.md`. Three approaches: **A) Generate transparent PNG overlay + composite locally** (recommended), B) text description (fallback), C) manual drawing.

## Test Cases

- Floating Island/Underwater: daytime, high tension, top lighting, cool tones
- Indoor Warm: nighttime, low tension, front light, warm tones

Inference rule tables (lighting→emotion→color) are in `references/lighting-vocabulary.md` and `references/color-atmosphere-vocabulary.md`.

## Generated File Naming Convention

Scene effect images must be saved with `filename` in format:

```text
第{集数}集第{场数}场-{场景名字}-v{版本号}
```

Example: `第1集第3场-海底基地大厅-v001.png`.

## After Completion — Next Steps

Completion criteria: `SceneStrategyCard` has been created, scene effect image and `positionAnnotationImage` have been confirmed.

After completion, must check the completion status of the three strategy cards: `SceneStrategyCard`, `PerformanceStrategyCard`, `CinematographyStrategyCard`.

- Only when all three strategy cards are complete should `director-briefing` be invoked for review and shot group finalization.
- If any strategy cards are still missing, recommend completing the remaining strategy cards.

Recommended dialogue: `Scene strategy design is complete. I will check the completion status of the three strategy cards; only when all three strategy cards are complete should we return to director-briefing for review and finalization.`
