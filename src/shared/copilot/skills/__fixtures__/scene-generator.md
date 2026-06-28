---
id: scene-generator
name: scene-generator
description: Use when a SceneAssetCard generation requirement must produce SceneConceptCard image versions and write back the confirmed visual to SceneAssetCard.selectedVisual
slashCommand: scene-generator
examples: []
parameters: {}
required: []
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


---

# References

## Reference: vr-panorama-generation

# VR全景图生成（720度全景）

按需读取，不要全文复制进卡片。

## 概述

VR全景图是720度全景图像（水平360度 + 垂直360度），equirectangular投影，2:1比例。

### 核心价值

从单个VR全景图切出多个不同视角的场景图，确保所有视角的场景元素、光影、色调、材质绝对一致。

- ✅ 一次生成，多次切片，场景绝对一致
- ❌ 不需要多视角时，直接生成16:9更高效

### 适用场景

| 场景需求 | 是否使用VR全景 |
|---------|--------------|
| 需要多个角度展示同一场景 | ✅ 推荐 |
| 需要连贯的环视镜头 | ✅ 推荐 |
| 只需要单一固定视角 | ❌ 直接生成16:9 |
| 需要VR体验或全景预览 | ✅ 必须 |

---

## 工作流

```
阶段1：构建VR全景提示词 → 6方向描述 + equirectangular格式
阶段2：生成VR全景图 → 4096x2048 或 8192x4096
阶段3：质量检查 → 天地接缝、水平环视、场景一致性
阶段4：切片生成多视角 → py360convert畸变还原
```

---

## VR全景提示词模板（720度，中文）

```
【VR全景图 - {场景名称} - {状态名称} - 720度环视】

画面格式：720度全景图，equirectangular投影，2:1比例（推荐4096x2048或8192x4096）

视点位置：{视点描述，如"站在客厅中央，视线高度1.7米"}

环视描述（6个主要方向）：
【正前方（北，0度）】{正前方场景描述}
【右侧（东，90度）】{右侧场景描述}
【正后方（南，180度）】{正后方场景描述}
【左侧（西，270度）】{左侧场景描述}
【向上看（天顶）】{天花板、灯具等描述}
【向下看（地面）】{地面、地毯、家具底部等描述}

光影设定：{光源在360度空间中的分布}
色彩方案：{整体色彩系统}
材质质感：{各个方向的材质}
氛围效果：{整体氛围}
画面要求：720度VR全景图，equirectangular格式，超高清，无人物，纯净场景
```

完整示例见本文件末尾的海底基地观景客厅区案例。

---

## VR全景图切片方法

### 切片参数

| 参数 | 说明 | 示例值 |
|------|------|--------|
| yaw（偏航角）| 水平旋转 | 0=前, 90=右, 180=后, 270=左 |
| pitch（俯仰角）| 垂直旋转 | 0=平视, 正=上, 负=下 |
| FOV（视场角）| 视野范围 | 90标准, 120广角, 60窄角 |
| 输出分辨率 | 切片分辨率 | 1920x1080 |
| 输出比例 | 切片比例 | 16:9横版 |

### 切片工具

**推荐：Python + py360convert**（pip install py360convert）

```python
import py360convert, numpy as np
from PIL import Image

equirect_img = np.array(Image.open('vr_panorama.png'))
perspective_img = py360convert.e2p(
    equirect_img, fov_deg=(90, 90),
    u_deg=0, v_deg=0, out_hw=(1080, 1920), mode='bilinear'
)
Image.fromarray(perspective_img).save('scene_view_front.png')
```

**备选**：360Toolkit（在线）、Insta360 Studio、Blender全景插件。

### 常用切片配置

**标准6方向**：前(0,0,90) | 右(90,0,90) | 后(180,0,90) | 左(270,0,90) | 上(0,30,90) | 下(0,-30,90)

**电影级多机位**：主机位(0,0,60) | 侧面特写(45,0,45) | 广角全景(0,0,120) | 仰拍(0,-15,75) | 俯瞰(0,30,75)

---

## VR全景图质量检查

- [ ] 天地接缝自然（天顶和地面过渡平滑）
- [ ] 水平环视连贯（360度无跳变）
- [ ] 场景元素与资产卡片一致
- [ ] 光影逻辑正确（光源位置和阴影方向统一）
- [ ] equirectangular比例正确（2:1）
- [ ] 切片图畸变还原正确、多视角一致

---

## 完整示例：海底基地观景客厅区

```
【VR全景图 - 海底基地观景客厅区 - 状态4运营期 - 720度环视】

画面格式：720度全景图，equirectangular投影，2:1比例（4096x2048）
视点位置：站在客厅中央，视线高度1.7米

【正前方（北，0度）】
巨大的弧形落地玻璃观景窗占据整个视野，高3-4米，宽10-15米。高科技防爆玻璃，边缘有金属加固框架。窗外是湛蓝的深海海水，阳光从水面折射进来形成梦幻光影波纹。热带鱼、鲨鱼、海龟在窗外游弋。海底可见珊瑚礁和水草。

【右侧（东，90度）】
L型真皮沙发的右侧部分，深棕色或米白色，空置状态。沙发上有抱枕和毛毯。旁边边几摆放台灯。墙面挂有装饰画。地面铺有地毯延伸到这一侧。

【正后方（南，180度）】
客厅入口区域。可见通往走廊或房间的门。墙面挂有时钟和装饰画。暖白色吊灯从天花板垂下。整体米色或浅色墙面。

【左侧（西，270度）】
L型沙发左侧部分。黑色大理石茶几位于此区域，茶几上摆放一瓶啤酒。沙发和茶几组合完整。地毯铺设在此区域。

【向上看（天顶）】
天花板高度4-5米。暖白色吊灯垂下，可见灯罩、灯泡、悬挂结构。白色简约天花板。

【向下看（地面）】
地面铺设地毯，纹理与整体暖色调协调。可见沙发底座、茶几桌腿（黑色大理石）。地毯边缘与地面交接自然。

光影设定：暖白色吊灯作为主光源（3000K），冷蓝色海水折射光从正前方观景窗透入作为环境光。波纹光影在前方墙面、地面流动。后方和侧面主要受暖光照明。

色彩方案：深蓝色40%（海水+观景窗）、暖米色30%（墙面家具）、金属银/黑20%、深棕点缀10%。整体冷暖对比，蓝色梦幻感与暖色温馨感交融。

材质质感：观景窗玻璃透明+反射，金属窗框磨砂。真皮沙发柔软光泽。大理石茶几冷硬质感。地毯纤维质感。

氛围效果：360度环绕的梦幻、安宁、与世隔绝感。空无一人的静谧，强烈内外反差。营造"末世中的乌托邦"视觉象征。

画面要求：720度VR全景图，equirectangular格式，4096x2048，无人物，纯净场景
```

## Reference: vr-panorama-upscaling

# VR全景图超分辨率工作流（🚧 尚未完成）

按需读取，不要全文复制进卡片。

## 概述

优化方案：先生成低分辨率VR全景图验证效果 → 超分放大 → 高清切片。

相比直接生成8K：成本降低75%，时间降低70%，支持快速预览验证。

## 完整工作流

```
阶段1：生成2048x1024低分辨率VR全景图（快速验证）
阶段2：切片预览检查构图和接缝
阶段3：超分辨率放大 → 8192x4096（4倍，Real-ESRGAN）
阶段4：高清切片输出1920x1080
```

## 分辨率建议

| 阶段 | 推荐分辨率 | 用途 |
|------|-----------|------|
| 初始生成 | 2048x1024 | 快速验证 |
| 超分放大 | 8192x4096（4x）| 高清切片源 |
| 切片输出 | 1920x1080 | 标准高清场景图 |

## 超分辨率工具

### 在线服务（无需安装）
- **Upscale.media** — 免费，2x/4x（推荐先测试）
- **Magnific AI** — $39/月，2x-16x，效果最好
- **Bigjpg** — 免费，专注动漫风格

### 开源工具（免费）
**Real-ESRGAN**（推荐）— 开源，4倍放大，需GPU

```bash
# macOS 安装
brew install xinntao/real-esrgan/realesrgan-ncnn-vulkan

# 使用
realesrgan-ncnn-vulkan -i input_2k.png -o output_8k.png -s 4 -n realesrgan-x4plus
```

Python集成：
```python
import subprocess
subprocess.run([
    'realesrgan-ncnn-vulkan',
    '-i', 'vr_panorama_2k.png',
    '-o', 'vr_panorama_8k.png',
    '-s', '4', '-n', 'realesrgan-x4plus', '-f', 'png'
], check=True)
```

### 商业软件
**Topaz Gigapixel AI** — $99一次性，6倍放大，效果业界最好

## 工作流最佳实践

1. **快速验证**：生成2K VR全景图
2. **预览切片**：`python vr_slice_tool.py --input vr_2k.png --views standard`
3. **超分放大**：确认满意后 `realesrgan-ncnn-vulkan -i vr_2k.png -o vr_8k.png -s 4`
4. **高清切片**：`python vr_slice_tool.py --input vr_8k.png --views cinematic`

## 注意事项

- 放大倍数：2048x1024 → 4x → 8192x4096（推荐）：2048x1024 → 2x → 4096x2048（标准）
- 超分不会修复接缝问题，2K阶段确保接缝质量
- 细节是AI推测而非原生，极复杂图案可能略有差异
- 建筑、室内、风景等几何结构清晰的场景效果好

## 实施状态

🚧 尚未完成。临时方案：手动上传到 Upscale.media 放大后下载。

