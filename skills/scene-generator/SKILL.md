---
name: scene-generator
description: Use when a SceneAssetCard generation requirement must produce SceneConceptCard image versions and write back the confirmed visual to SceneAssetCard.selectedVisual
---

# Scene Generator Skill

Generate standardized scene concept images from scene asset cards, supporting both GPT-Image-2 and Seedance5 image generation models.

## Overall Workflow

```
Input: SceneAssetCard (scene asset card, from asset zone)
Optional Input: ArtDirectionCard (art direction card, for style consistency)

Stage 1: Dependency Check
  Check if scene asset card exists
  Check art direction card (optional)

Stage 2: Build Scene Description
  Integrate inherited information and user-supplemented visual details
  Determine composition plan
  Determine visual focus hierarchy

Stage 3: Generate Prompt
  Generate optimized prompt for target model
  GPT-Image-2: Chinese natural language, 500-600 characters
  Seedance5: English labels, 300-400 characters

Stage 4: Call Image Generation Model
  Select target model
  Generate scene concept image
  Support multi-state batch generation

Stage 5: Quality Check
  Scene consistency (alignment with design card)
  Style consistency (alignment with art direction)
  Key element completeness (whether primary focus is clearly visible)

Stage 6: Create Scene Concept Card
  Consolidate generation results
  Create card
  Establish upstream/downstream connections

Output: SceneConceptCard (scene concept card)
```

---

## Stage 1: Dependency Check

**Check Items**:
1. Scene asset card (required)
2. Art direction card (optional, for style consistency)

**Error Handling**:
- If the scene asset card does not exist, prompt the user to first run `/scene-asset-extraction`

---

## Stage 2: Build Scene Description

### Composition Plan Selection

Select composition based on scene type and narrative function:

| Scene Type | Recommended Composition | Use Case |
|---------|---------|---------|
| Core base (interior) | Wide angle full shot + depth of field | Show spatial scale and atmosphere |
| Battle/climax scene | Low angle upward shot | Reinforce pressure and drama |
| Survivor settlement (exterior) | Eye-level full shot | Show environmental scale and human touch |
| Emotional scene | Medium shot + ambient light | Highlight emotional atmosphere |
| Key prop/landmark | Close-up + background bokeh | Emphasize visual focus |

### Information Integration Order

When building prompts, integrate information in the following priority order:
1. **Scene name and type** (definition foundation)
2. **Primary visual focus** (core element, must be clearly visible)
3. **Lighting plan** (atmosphere definition)
4. **Color scheme** (visual style)
5. **Material texture** (detail texture)
6. **Secondary visual focus** (supporting elements)
7. **Special visual effects** (atmosphere enhancement)
8. **Emotional tone** (overall feeling)

---

## Stage 3: Generate Prompt

**Default model**: GPT-Image-2 (Chinese natural language)
**Alternative models**: Gemini (Imagen 3, Chinese natural language, more concise), Seedance5.0 (English labels)

**Default aspect ratio**: Landscape 16:9 (concept art use, suitable for storyboard/art reference/video generation base)

### GPT-Image-2 Prompt Template (primary model, Chinese natural language, 500-600 characters)

```
【场景概念图 - {场景名称} - {状态名称}】

画面构图：{构图方案}，{视角描述}，横版16:9，电影级宽幅

核心视觉元素：
{一级焦点元素1}，{一级焦点元素2}，{一级焦点元素3}

场景特征：
{建筑/环境特征描述}，{规模感描述}，{时代背景特征}

光影设定：
{光影方案名称}，{主光源描述}，{色温描述}，{阴影特征}

色彩方案：
主色调{主色调}，辅助色{辅助色}，强调色{强调色}，整体{色调倾向}

材质质感：
{地面材质}，{墙面/主体材质}，{道具材质}，整体{质感倾向}

氛围效果：
{特殊视觉效果}，{情感基调描述}

画面要求：
超高清，电影级构图，概念艺术风格，{美术风格关键词}，无人物，场景概念图，16:9横版
```

**Example (Undersea Base - Operation Period)**:

```
【场景概念图 - 海底基地（雅兰深海酒店）- 运营期】

画面构图：广角全景，低角度仰拍，强调空间纵深感，横版16:9，电影级宽幅

核心视觉元素：
180度弧形落地观景窗（窗外深海全景），净化机生产线（整洁运转中），监控中心（整面墙屏幕）

场景特征：
海底酒店改造而成，外加潜艇级装甲板，深海抗压玻璃，潜艇级密封闸门，大型空间，末世天堂感

光影设定：
暖调漫射光，柔和室内灯光为主，窗外透入深海蓝光，暖白色温（3200K），软阴影，内外强烈反差

色彩方案：
主色调深蓝色（海底），辅助色暖金色（室内灯光），强调色荧光蓝（净化机指示灯），整体冷暖对比

材质质感：
地面抛光金属，墙面钢铁+深海玻璃，道具高科技金属质感，整体工业感+奢华感

氛围效果：
窗外末世废土与窗内末日天堂的强烈反差，海底水压感，安全感与惬意感

画面要求：
超高清，电影级构图，概念艺术风格，末世科幻风，无人物，场景概念图，16:9横版
```

---

### Gemini (Imagen 3) Prompt Template (alternative, Chinese natural language, 400-500 characters)

Same structure as GPT-Image-2 but more concise — omit detailed material texture descriptions, merge atmosphere effects and image requirements:

```
【场景概念图 - {场景名称} - {状态名称}】

构图：{构图方案}，{视角}，16:9横版

核心元素：{一级焦点元素1}，{一级焦点元素2}，{一级焦点元素3}

场景：{建筑/环境特征}，{规模感}，{时代背景}

光影：{光影方案}，{色温}，{阴影特征}

色彩：主色{主色调}，辅色{辅助色}，强调{强调色}

氛围：{情感基调}，{特殊效果}

要求：超高清，电影级，概念艺术，{风格关键词}，无人物，16:9
```

---

### Seedance5.0 Prompt Template (alternative, English labels, 300-400 characters)

```
scene concept art, {scene_name}, {state_name},
{composition_type}, {camera_angle}, 16:9 widescreen,
{primary_focus_elements},
{architectural_features}, {scale_description},
{lighting_scheme}, {color_temperature}, {shadow_type},
{main_color}, {accent_color}, {color_grading},
{material_textures},
{atmospheric_effects}, {emotional_tone},
cinematic composition, ultra detailed, concept art style,
{art_style_keywords}, no characters, establishing shot,
8k resolution, professional lighting, landscape orientation
```

---

## Stage 4: Call Image Generation Model

### Model Selection Recommendations

| Scene Characteristics | Recommended Model | Reason |
|---------|---------|------|
| Default / most scenes | GPT-Image-2 | Accurate Chinese understanding, rich atmosphere description |
| GPT-Image-2 fails or unsatisfactory | Gemini (Imagen 3) | Alternative, same structure, more concise |
| Batch generation of multiple states | Seedance5.0 | Label-based, easy batch adjustments |

### Batch Generation Strategy

If the scene has multiple states, generate in the following order:
1. Generate main state first (longest episode span)
2. Then special states (during key events)
3. Finally transition states (if any)

---

## Stage 5: Quality Check

### Check Dimensions

**Scene Consistency** (against scene asset card):
- [ ] Primary visual focus elements are clearly visible
- [ ] Scene type (interior/exterior) is correct
- [ ] Scale matches the design (large/medium/small)
- [ ] Era background characteristics are correct (post-apocalyptic/modern/ancient)

**Style Consistency** (against art direction card, if available):
- [ ] Overall visual style matches art direction
- [ ] Color tendency aligns with the series-wide color system
- [ ] Lighting style aligns with the series-wide lighting system

**Emotional Tone**:
- [ ] Image atmosphere matches `emotionalTone.primaryMood`
- [ ] Drama intensity is sufficient for key event scenes

### Quality Scoring

| Dimension | Weight | Scoring Criteria |
|------|------|---------|
| Scene consistency | 40% | Primary focus visible = full marks, missing = 0 |
| Style consistency | 30% | Alignment with art direction |
| Emotional tone | 30% | Atmosphere match with design |

**Pass criteria**: Total score ≥ 70

---

## Stage 6: Create Scene Concept Card

**Card Structure**:
```typescript
interface SceneConceptCard extends BaseCard {
  cardId: string;
  cardType: "SceneConceptCard";
  type: "scene_concept";
  title: string;  // e.g. "海底基地 - 运营期 - 场景概念图"
  upstreamCards: CardRef[];
  sceneLocationId: string;
  sceneAssetCardId: string;
  stateName: string;
  episodeRange?: string;
  generationConfig: {
    model: "gpt-image-2" | "gemini-imagen3" | "seedance5" | string;
    compositionType: string;
    cameraAngle: string;
    aspectRatio: "16:9" | "2:1";
  };
  prompts: {
    cn?: string;   // GPT-Image-2 / Gemini Chinese prompt
    en?: string;   // Seedance5 English prompt
  };
  imageVersions: Array<{
    versionId: string;
    image: ImageReference;
    panoramaImage?: ImageReference;
    generatedAt: string;
    qualityScore: number;
    qualityDetails: {
      sceneConsistency: number;
      styleConsistency: number;
      emotionalTone: number;
    };
    userConfirmed: boolean;
    stale: boolean;
  }>;
  selectedVersionId?: string;
  approvedImage?: ImageReference;
  userConfirmed: boolean;
  stale: boolean;
}
```

### 6.1 Write Back to SceneAssetCard.selectedVisual

After user confirms a `SceneConceptCard.imageVersions[]`, must execute `writeBackSelectedVisual`:

```typescript
function writeBackSelectedVisual(
  sceneAssetCard: SceneAssetCard,
  sceneConceptCard: SceneConceptCard,
  selectedVersionId: string
): SceneAssetCard {
  const selectedVersion = sceneConceptCard.imageVersions.find(
    version => version.versionId === selectedVersionId
  );

  if (!selectedVersion || selectedVersion.userConfirmed !== true || selectedVersion.stale === true) {
    throw new Error("selected scene visual version is not confirmed or is stale");
  }

  sceneConceptCard.selectedVersionId = selectedVersionId;
  sceneConceptCard.approvedImage = selectedVersion.image;
  sceneConceptCard.userConfirmed = true;
  sceneConceptCard.stale = false;

  sceneAssetCard.selectedVisual = {
    conceptCardId: sceneConceptCard.cardId,
    versionId: selectedVersion.versionId,
    image: selectedVersion.image,
    panoramaImage: selectedVersion.panoramaImage,
    userConfirmed: true,
    stale: false,
    selectedAt: new Date().toISOString()
  };

  return sceneAssetCard;
}
```

**Hard Rules**:
1. `sceneAssetCard.selectedVisual` is the sole entry point for the production zone to read scene images.
2. `SceneConceptCard.imageVersions[]` is a generation record, not a downstream random image picker pool.
3. If `writeBackSelectedVisual` has not been executed, `scene-strategy-designer` must block.

---

## Collaboration with Other Skills

### Upstream Dependencies
- **script-deconstruct**: Provides scene design cards
- **scene-asset-extraction**: Provides scene asset cards (required)
- **art-direction**: Provides art direction cards (optional)

### Downstream Output
- Provides scene reference for storyboard design
- Provides scene base images for AI video generation
- Provides visual reference for art teams

---

## Test Cases

### Test Case 1: Undersea Base (dual-state)

**Input**: Undersea Base scene asset card (renovation period + operation period)

**Expected Output**:
- Renovation period concept: construction site feel, cool white lighting, hotel under renovation
- Operation period concept: post-apocalyptic paradise feel, warm light + deep sea blue light, strong inside/outside contrast

### Test Case 2: Colosseum (single-state, high emotion)

**Input**: Colosseum scene asset card (in operation)

**Expected Output**:
- Oppressive dramatic concept: low-key side/backlight, iron cage as core focus, bloody atmosphere

---

## Implementation Checklist

- [ ] Stage 1: Dependency check complete
- [ ] Stage 2: Scene description built, composition plan confirmed
- [ ] Stage 3: Prompt generated (target model version)
- [ ] Stage 4: Image generation model call successful, image generated
- [ ] Stage 5: Quality check passed (total score ≥ 70)
- [ ] Stage 6: Scene concept card created successfully

---

**Skill Version**: v1.0  
**Created**: 2026-05-29  
**Test Status**: Pending test

---

## VR Panorama and Super Resolution

The following VR-related capabilities have been externalized to `references/`, read on demand:

- VR panorama generation (720°, prompt templates, slicing methods, quality check): read `references/vr-panorama-generation.md`
- VR panorama super-resolution workflow (2K→8K pipeline, tool selection, best practices): read `references/vr-panorama-upscaling.md`

Only use VR panorama solutions when multi-angle consistent scene images or VR experiences are needed. For single fixed-perspective views, directly generating 16:9 scene images is more efficient.

---

## Generated File Naming Convention

Scene asset images must save `filename` in the following format:

```text
场景资产-{场景名字}-{状态}-{类型}-v{版本号}
```

Omit the state or type segment when absent; type example: `VR全景图`. Example: `场景资产-海底基地大厅-夜晚-VR全景图-v001.png`.

## Next Step After Completion

Completion criteria: `SceneConceptCard` created, user has selected a confirmed version, and `SceneAssetCard.selectedVisual` has been written back.

After completing current scene generation, check whether the current episode/scene has other scene assets that need production.

- If there are unfinished scenes in the same set: suggest continuing with `scene-asset-extraction` or `scene-generator`.
- If the current episode/scene scene assets are sufficient: notify the user they can continue with other assets, or call `production-coordinator` to begin production for this specific episode and scene.

Recommended phrasing: `Current scene asset image is confirmed and written back. I will now check if the current episode/scene has other scene assets needing production; if not, we can enter production-coordinator to begin scene production.`
