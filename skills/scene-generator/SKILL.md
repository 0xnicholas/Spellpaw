---
name: scene-generator
description: Use when a SceneAssetCard generation requirement must produce SceneConceptCard image versions and write back the confirmed visual to SceneAssetCard.selectedVisual
version: 1.0.0
author: Modo
tags: [ai-short-drama, scene-design, image-generation]
---

# 场景生成师 Skill

从场景资产卡片生成标准化的场景概念图，支持GPT-Image-2和Seedance5两种生图模型。

## 整体工作流

```
输入：SceneAssetCard（场景资产卡片，来自资产分区）
可选输入：ArtDirectionCard（美术设定卡片，用于风格统一）

阶段1：依赖检查
  检查场景资产卡片是否存在
  检查美术设定卡片（可选）

阶段2：构建场景描述
  整合继承信息和用户补充的视觉细节
  确定画面构图方案
  确定视觉焦点层次

阶段3：生成提示词
  根据目标模型生成优化提示词
  GPT-Image-2：中文自然语言，500-600字
  Seedance5：英文标签，300-400字

阶段4：调用生图模型
  选择目标模型
  生成场景概念图
  支持多状态批量生成

阶段5：质量检查
  场景一致性（与设定卡片的符合度）
  风格一致性（与美术设定的符合度）
  关键元素完整性（一级焦点是否清晰可见）

阶段6：创建场景概念图卡片
  整合生成结果
  创建卡片
  建立上下游连线

输出：SceneConceptCard（场景概念图卡片）
```

---

## 阶段1：依赖检查

**检查项**：
1. 场景资产卡片（必需）
2. 美术设定卡片（可选，用于风格统一）

**错误处理**：
- 如果场景资产卡片不存在，提示用户先运行 `/scene-asset-extraction`

---

## 阶段2：构建场景描述

### 构图方案选择

根据场景类型和叙事功能选择构图：

| 场景类型 | 推荐构图 | 适用场景 |
|---------|---------|---------|
| 核心据点（interior） | 广角全景 + 景深 | 展示空间规模和氛围 |
| 战斗/高潮场景 | 低角度仰拍 | 强化压迫感和戏剧性 |
| 幸存者聚居地（exterior） | 平视全景 | 展示环境规模和人文感 |
| 情感场景 | 中景 + 环境光 | 突出情感氛围 |
| 关键道具/地标 | 特写 + 背景虚化 | 强调视觉焦点 |

### 信息整合顺序

构建提示词时按以下优先级整合信息：
1. **场景名称和类型**（定义基础）
2. **一级视觉焦点**（核心元素，必须清晰可见）
3. **光影方案**（氛围定义）
4. **色彩方案**（视觉风格）
5. **材质质感**（细节质感）
6. **二级视觉焦点**（支撑元素）
7. **特殊视觉效果**（氛围增强）
8. **情感基调**（整体感受）

---

## 阶段3：生成提示词

**默认模型**：GPT-Image-2（中文自然语言）
**备选模型**：Gemini（Imagen 3，中文自然语言，更简洁）、Seedance5.0（英文标签）

**默认画幅**：横版16:9（概念图用途，适合分镜/美术参考/视频生成底图）

### GPT-Image-2 提示词模板（主模型，中文自然语言，500-600字）

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

**示例（海底基地-运营期）**：

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

### Gemini（Imagen 3）提示词模板（备选，中文自然语言，400-500字）

结构与GPT-Image-2相同，但更简洁——省略材质质感的详细描述，合并氛围效果与画面要求：

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

### Seedance5.0 提示词模板（备选，英文标签，300-400字）

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

## 阶段4：调用生图模型

### 模型选择建议

| 场景特征 | 推荐模型 | 原因 |
|---------|---------|------|
| 默认/大多数场景 | GPT-Image-2 | 中文理解准确，氛围描述细腻 |
| GPT-Image-2失败或效果不佳 | Gemini（Imagen 3） | 备选，结构相同，更简洁 |
| 需要批量生成多状态 | Seedance5.0 | 标签化易于批量调整 |

### 批量生成策略

如果场景有多个状态，按以下顺序生成：
1. 先生成主要状态（剧集跨度最长的）
2. 再生成特殊状态（关键事件发生时）
3. 最后生成过渡状态（如有）

---

## 阶段5：质量检查

### 检查维度

**场景一致性**（对照场景资产卡片）：
- [ ] 一级视觉焦点元素清晰可见
- [ ] 场景类型（室内/室外）正确
- [ ] 规模感符合设定（大型/中型/小型）
- [ ] 时代背景特征正确（末世后/现代/古代）

**风格一致性**（对照美术设定卡片，如有）：
- [ ] 整体视觉风格符合美术设定
- [ ] 色彩倾向与全剧色彩系统一致
- [ ] 光影风格与全剧光影系统一致

**情感基调**：
- [ ] 画面氛围与 `emotionalTone.primaryMood` 一致
- [ ] 关键事件场景的戏剧性足够强

### 质量评分

| 维度 | 权重 | 评分标准 |
|------|------|---------|
| 场景一致性 | 40% | 一级焦点可见=满分，缺失=0分 |
| 风格一致性 | 30% | 与美术设定符合度 |
| 情感基调 | 30% | 氛围与设定的匹配度 |

**通过标准**：总分 ≥ 70分

---

## 阶段6：创建场景概念图卡片

**卡片结构**：
```typescript
interface SceneConceptCard extends BaseCard {
  cardId: string;
  cardType: "SceneConceptCard";
  type: "scene_concept";
  title: string;  // 如："海底基地 - 运营期 - 场景概念图"
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
    cn?: string;   // GPT-Image-2 / Gemini 中文提示词
    en?: string;   // Seedance5 英文提示词
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

### 6.1 写回 SceneAssetCard.selectedVisual

用户确认某个 `SceneConceptCard.imageVersions[]` 后，必须执行 `writeBackSelectedVisual`：

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

**硬性规则**：
1. `sceneAssetCard.selectedVisual` 是制作区读取场景图的唯一入口。
2. `SceneConceptCard.imageVersions[]` 是生成记录，不是下游随机挑图池。
3. 没有执行 `writeBackSelectedVisual` 时，`scene-strategy-designer` 必须阻断。

---

## 与其他Skill的协作

### 上游依赖
- **script-deconstruct**：提供场景设定卡片
- **scene-asset-extraction**：提供场景资产卡片（必需）
- **art-direction**：提供美术设定卡片（可选）

### 下游输出
- 为分镜设计提供场景参考
- 为AI视频生成提供场景底图
- 为美术团队提供视觉参考

---

## 测试用例

### 测试用例1：海底基地（双状态）

**输入**：海底基地场景资产卡片（改造期 + 运营期）

**预期输出**：
- 改造期概念图：工地感，冷白灯光，施工中的酒店
- 运营期概念图：末世天堂感，暖光+海底蓝光，强烈内外反差

### 测试用例2：斗兽场（单状态高情感）

**输入**：斗兽场场景资产卡片（运营中）

**预期输出**：
- 压抑戏剧性概念图：低调侧逆光，铁笼为核心焦点，血腥氛围

---

## 实施检查清单

- [ ] 阶段1：依赖检查完成
- [ ] 阶段2：场景描述构建完成，构图方案已确定
- [ ] 阶段3：提示词生成完成（目标模型对应版本）
- [ ] 阶段4：生图模型调用成功，图像已生成
- [ ] 阶段5：质量检查通过（总分 ≥ 70）
- [ ] 阶段6：场景概念图卡片创建成功

---

**Skill版本**：v1.0  
**创建日期**：2026-05-29  
**测试状态**：待测试

---

## VR全景图生成（720度全景）

### 概述

**VR全景图**是一种720度全景图像（水平360度 + 垂直360度），可以实现上下左右全方位环视。

### 核心价值

**生成绝对一致性的多角度连贯场景图**：

从单个VR全景图可以切出多个不同视角的场景图，确保：
- ✅ 所有视角的场景元素完全一致（家具位置、道具摆放、装饰细节）
- ✅ 光影系统完全一致（光源位置、色温、阴影方向）
- ✅ 色调氛围完全一致（色彩方案、材质质感）
- ✅ 视角之间连贯流畅（可以从一个角度平滑过渡到另一个角度）

**对比传统多次生成**：
- ❌ 传统方法：每次生成一个视角，场景细节不一致，需要大量后期修正
- ✅ VR全景方法：一次生成，多次切片，场景绝对一致

### 适用场景

| 场景需求 | 是否使用VR全景 | 原因 |
|---------|--------------|------|
| 需要多个角度展示同一场景 | ✅ 推荐 | 确保一致性 |
| 需要连贯的环视镜头 | ✅ 推荐 | 可以切片拼接为环视视频 |
| 只需要单一固定视角 | ❌ 不推荐 | 直接生成16:9场景图更高效 |
| 需要VR体验或全景预览 | ✅ 必须 | VR全景是唯一选择 |

---

## VR全景图生成工作流

```
阶段1：构建VR全景提示词
  - 基于场景资产卡片的视觉化描述
  - 转换为720度环视描述（6个方向）
  - 指定equirectangular格式，2:1比例

阶段2：生成VR全景图
  - 调用支持全景图的生图模型
  - 推荐分辨率：4096x2048 或 8192x4096
  - 输出格式：equirectangular投影

阶段3：质量检查
  - 检查天地接缝是否自然
  - 检查水平环视是否连贯
  - 检查场景元素是否符合资产卡片描述

阶段4：切片生成多视角场景图
  - 使用切片工具从VR全景图提取指定视角
  - 畸变还原（equirectangular → 正常透视）
  - 输出多个角度的一致性场景图

输出：VR全景图 + 多个视角的场景图切片
```

---

## VR全景提示词模板（720度，中文）

```
【VR全景图 - {场景名称} - {状态名称} - 720度环视】

画面格式：720度全景图，equirectangular投影，2:1比例（推荐4096x2048或8192x4096）

视点位置：{视点描述，如"站在客厅中央，视线高度1.7米"}

环视描述（6个主要方向）：

【正前方（北，0度）】
{正前方看到的场景元素详细描述}

【右侧（东，90度）】
{右侧看到的场景元素详细描述}

【正后方（南，180度）】
{正后方看到的场景元素详细描述}

【左侧（西，270度）】
{左侧看到的场景元素详细描述}

【向上看（天顶）】
{抬头向上看到的天花板、灯具等描述}

【向下看（地面）】
{低头向下看到的地面、地毯、家具底部等描述}

光影设定：
{光影方案，描述光源在360度空间中的分布}

色彩方案：
{整体色彩系统，在360度空间中保持一致}

材质质感：
{各个方向的材质保持统一风格}

氛围效果：
{整体氛围，360度环绕体验}

画面要求：
720度VR全景图，equirectangular格式，超高清，无人物，纯净场景，可用于切片生成多视角场景图
```

---

## VR全景提示词示例（海底基地观景客厅区）

```
【VR全景图 - 海底基地观景客厅区 - 状态4运营期 - 720度环视】

画面格式：720度全景图，equirectangular投影，2:1比例（4096x2048）

视点位置：站在客厅中央，视线高度1.7米（成人视角），可环视四周及上下

环视描述（6个主要方向）：

【正前方（北，0度）】
巨大的弧形落地玻璃观景窗占据整个视野，高3-4米，宽10-15米。高科技防爆玻璃，边缘有金属加固框架，厚度清晰可见。窗外是湛蓝的深海海水，阳光从水面折射进来，形成梦幻的光影波纹。热带鱼、鲨鱼、海龟等深海生物在窗外游弋，偶尔擦过玻璃。海底可见珊瑚礁和水草。观景窗下方是地面，铺有地毯。

【右侧（东，90度）】
L型真皮沙发的右侧部分，深棕色或米白色，空置状态，摆放整齐。沙发上有抱枕和毛毯。沙发旁边是边几，上面摆放台灯。墙面挂有装饰画。墙面为米色或浅色，与整体暖色调协调。地面铺有地毯延伸到这一侧。

【正后方（南，180度）】
客厅的入口区域。可见通往走廊或其他房间的门或开口。墙面挂有时钟和装饰画。暖白色吊灯从天花板垂下，可以看到吊灯的侧面或背面。墙面装饰与整体风格统一，米色或浅色墙面。地面延续地毯铺设。

【左侧（西，270度）】
L型沙发的左侧部分，延续深棕色或米白色。黑色大理石茶几位于这一侧视野中，茶几上摆放一瓶啤酒作为场景道具。沙发和茶几组合完整可见。墙面继续延伸，可能有窗户的边缘或其他装饰。地毯铺设在沙发和茶几区域。

【向上看（天顶）】
天花板，高度4-5米，营造宽敞空间感。暖白色吊灯垂下，可以看到吊灯的灯罩、灯泡、悬挂结构。天花板为白色或浅色，可能有装饰线条或简约设计。天花板边缘与墙面的交接处平滑自然。

【向下看（地面）】
地面铺设地毯，可以看到地毯的纹理和颜色（与整体暖色调协调）。沙发和茶几的底部可见。L型沙发的底座、茶几的桌腿（黑色大理石材质）。地毯边缘与地面的交接。整体地面干净整洁。

光影设定：
双色调光影在360度空间中分布。暖白色吊灯从天花板垂下，作为主光源，照亮整个空间（色温3000K左右）。冷蓝色的海水折射光从正前方的观景窗透入，作为环境光，主要影响前方区域和部分侧面。海水的波纹光影在前方的墙面、地面流动。其他方向（后方、左右两侧）主要受暖白色吊灯照明，营造温馨氛围。光影层次分明，整体和谐。

色彩方案：
主色调深蓝色（40%，来自正前方的海水和观景窗），辅助色暖米色/米黄色/浅棕色（30%，墙面和家具，分布在四周），金属色银色/黑色（20%，窗框、茶几、装饰细节），深棕色点缀（10%，沙发或深色家具）。整体色调在360度空间中保持一致，呈现冷暖对比，蓝色的梦幻感与暖色的温馨感交融。

材质质感：
观景窗玻璃（正前方）呈现透明+反射效果，有厚重感，边缘带光泽。金属窗框为磨砂质感。真皮沙发（左右两侧可见）展现柔软质感和光泽感。大理石茶几（左侧可见）显示纹理和冷硬质感。地毯（向下看）呈现纤维质感。墙面（四周）为平滑或带纹理的墙面材质。天花板（向上看）为平滑材质。所有材质在360度空间中保持统一风格。

氛围效果：
360度环绕的梦幻、安宁、与世隔绝的感觉。奢华、温馨、舒适的居住氛围。空无一人的静谧感，等待使用的状态。强烈的内外反差，正前方窗外是深海世界，其他方向是温馨的室内空间。整体营造"末世中的乌托邦"、"特权避难所"的视觉象征。环视体验连贯流畅，从任何角度看都符合场景设定。

画面要求：
720度VR全景图，equirectangular格式，超高清（4096x2048），无任何人物角色，纯净场景，可用于切片生成多视角一致性场景图
```

---

## VR全景图切片方法

### 切片原理

**equirectangular投影转正常透视投影**：

VR全景图使用equirectangular投影（等距圆柱投影），画面存在畸变：
- 靠近上下边缘的内容被拉伸
- 水平方向循环连续（左边缘与右边缘相接）

切片时需要将畸变还原为正常透视投影。

### 切片参数

| 参数 | 说明 | 示例值 |
|------|------|--------|
| **yaw（偏航角）** | 水平旋转角度，0度=正前方，90度=右侧，180度=正后方，270度=左侧 | 0, 45, 90, 135, 180, 225, 270, 315 |
| **pitch（俯仰角）** | 垂直旋转角度，0度=平视，正值=向上看，负值=向下看 | -30, 0, 30 |
| **FOV（视场角）** | 视野范围，越大视野越广，越小视野越窄 | 90（标准），120（广角），60（窄角） |
| **输出分辨率** | 切片后的图像分辨率 | 1920x1080, 2560x1440 |
| **输出比例** | 切片后的画面比例 | 16:9（横版），9:16（竖版），1:1（方形） |

### 切片工具选择

#### 方案A：Python + py360convert库（推荐）

```python
import py360convert
import numpy as np
from PIL import Image

# 读取VR全景图
equirect_img = np.array(Image.open('vr_panorama.png'))

# 切片参数
yaw = 0      # 正前方
pitch = 0    # 平视
fov = 90     # 标准视场角
output_h = 1080
output_w = 1920

# 转换为正常透视
perspective_img = py360convert.e2p(
    equirect_img, 
    fov_deg=(fov, fov),
    u_deg=yaw, 
    v_deg=pitch, 
    out_hw=(output_h, output_w),
    mode='bilinear'
)

# 保存切片
Image.fromarray(perspective_img).save('scene_view_front.png')
```

**批量生成多视角**：

```python
# 定义多个视角
views = [
    {'name': 'front', 'yaw': 0, 'pitch': 0},      # 正前方
    {'name': 'right', 'yaw': 90, 'pitch': 0},     # 右侧
    {'name': 'back', 'yaw': 180, 'pitch': 0},     # 正后方
    {'name': 'left', 'yaw': 270, 'pitch': 0},     # 左侧
    {'name': 'up', 'yaw': 0, 'pitch': 30},        # 向上
    {'name': 'down', 'yaw': 0, 'pitch': -30},     # 向下
]

for view in views:
    perspective_img = py360convert.e2p(
        equirect_img, 
        fov_deg=(90, 90),
        u_deg=view['yaw'], 
        v_deg=view['pitch'], 
        out_hw=(1080, 1920),
        mode='bilinear'
    )
    Image.fromarray(perspective_img).save(f"scene_view_{view['name']}.png")
```

#### 方案B：在线工具

- **360Toolkit**：https://360toolkit.co/ （在线全景图切片工具）
- **Insta360 Studio**：官方全景编辑软件，支持导出平面视角

#### 方案C：Blender + 全景插件

适合需要精细控制和后期处理的场景。

---

## 常见视角切片配置

### 配置1：标准6方向（立方体贴图）

用于全方位展示场景，类似立方体贴图：

| 视角 | yaw | pitch | FOV | 用途 |
|------|-----|-------|-----|------|
| 前 | 0 | 0 | 90 | 正前方视角 |
| 右 | 90 | 0 | 90 | 右侧视角 |
| 后 | 180 | 0 | 90 | 正后方视角 |
| 左 | 270 | 0 | 90 | 左侧视角 |
| 上 | 0 | 30~45 | 90 | 向上视角 |
| 下 | 0 | -30~-45 | 90 | 向下视角 |

### 配置2：电影级多机位（分镜使用）

模拟多台摄像机拍摄同一场景：

| 机位 | yaw | pitch | FOV | 用途 |
|------|-----|-------|-----|------|
| 主机位 | 0 | 0 | 60 | 主视角，重点展示核心元素 |
| 侧面特写 | 45 | 0 | 45 | 侧面细节，营造空间感 |
| 广角全景 | 0 | 0 | 120 | 展现空间规模 |
| 低角度仰拍 | 0 | -15 | 75 | 强调高度和压迫感 |
| 俯瞰视角 | 0 | 30 | 75 | 俯视全局 |

### 配置3：环视序列（视频素材）

生成连续的环视镜头，可拼接为环视视频：

```python
# 生成360度环视序列（每10度一帧，共36帧）
for i in range(36):
    yaw = i * 10
    perspective_img = py360convert.e2p(
        equirect_img, 
        fov_deg=(90, 90),
        u_deg=yaw, 
        v_deg=0, 
        out_hw=(1080, 1920),
        mode='bilinear'
    )
    Image.fromarray(perspective_img).save(f"orbit_frame_{i:03d}.png")

# 可使用ffmpeg合成为视频：
# ffmpeg -framerate 30 -i orbit_frame_%03d.png -c:v libx264 orbit_video.mp4
```

---

## 质量检查（VR全景图专项）

### VR全景图质量检查清单

- [ ] **天地接缝自然**：向上看和向下看的内容在天顶和地面接缝处平滑过渡
- [ ] **水平环视连贯**：从0度旋转到360度，场景元素连贯，无跳变
- [ ] **场景元素一致**：与场景资产卡片的描述完全一致
- [ ] **光影逻辑正确**：光源位置合理，阴影方向在360度空间中统一
- [ ] **比例正确**：equirectangular投影比例为2:1（宽度是高度的2倍）
- [ ] **无畸变异常**：边缘拉伸自然，无明显的投影错误

### 切片图质量检查清单

- [ ] **畸变还原正确**：透视自然，无拉伸或压缩变形
- [ ] **清晰度足够**：切片后图像清晰，无模糊或锯齿
- [ ] **视角参数准确**：切片的视角与预期的yaw/pitch/FOV一致
- [ ] **多视角一致性**：多个切片的场景元素、光影、色调完全一致

---

## 工作流程总结（VR全景图 → 多视角切片）

```
Step 1: 读取场景资产卡片
    ↓
Step 2: 生成VR全景提示词（720度，6方向描述）
    ↓
Step 3: 调用生图模型生成VR全景图（equirectangular，4096x2048）
    ↓
Step 4: 质量检查（天地接缝、水平连贯性）
    ↓
Step 5: 确定切片需求（需要哪些视角）
    ↓
Step 6: 使用切片工具批量生成多视角场景图
    ↓
Step 7: 质量检查（畸变还原、多视角一致性）
    ↓
输出：
- VR全景图原图（用于存档和二次切片）
- 多个视角的一致性场景图（用于分镜、视频生成等）
```

---

## 与传统方法的对比

| 维度 | 传统多次生成 | VR全景图切片 |
|------|------------|-------------|
| **一致性** | ❌ 每次生成细节不同 | ✅ 绝对一致 |
| **效率** | ❌ 需要多次生成+后期修正 | ✅ 一次生成，多次切片 |
| **连贯性** | ❌ 视角间跳跃，不连贯 | ✅ 视角间平滑过渡 |
| **灵活性** | ⚠️ 每次生成需要新提示词 | ✅ 切片参数灵活调整 |
| **成本** | ❌ 多次调用生图API | ✅ 一次生成+本地切片 |
| **适用场景** | 单一固定视角 | 多视角、环视、VR体验 |

---

## 实施建议

### 何时使用VR全景图

**推荐使用**：
- ✅ 需要3个以上不同视角的场景图
- ✅ 需要环视镜头或VR体验
- ✅ 对场景一致性要求极高
- ✅ 需要后期灵活调整视角

**不推荐使用**：
- ❌ 只需要1-2个固定视角（直接生成16:9场景图更高效）
- ❌ 生图模型不支持全景图生成
- ❌ 没有切片工具或技术能力

### 技术准备

**必需**：
- VR全景图生成能力（GPT-Image-2或其他支持全景的模型）
- 切片工具（Python + py360convert 或 在线工具）

**可选**：
- Blender或其他3D软件（用于精细控制和后期处理）
- VR头显（用于预览VR全景图效果）

---

**更新版本**：v1.1.0  
**更新日期**：2026-06-12  
**更新内容**：新增VR全景图生成（720度）和切片方法

---

## VR全景图超分辨率工作流（🚧 尚未完成）

### 概述

**优化方案**：先生成低分辨率VR全景图验证效果，满意后再使用超分辨率工具放大到高分辨率，最后进行切片。

### 核心优势

相比直接生成8K VR全景图，这个工作流有以下优势：

| 对比项 | 直接生成8K | 生成2K → 超分到8K |
|--------|-----------|------------------|
| **生成成本** | 高（8K图片） | 低（2K图片） ⬇️75% |
| **生成时间** | 长 | 快 ⬇️70% |
| **预览验证** | 不便（需等待8K生成） | 方便（2K快速预览） ✅ |
| **灵活性** | 低（一次性生成） | 高（可多次验证后再放大） ✅ |
| **一致性** | 原生细节 | 超分工具保证一致性 ✅ |
| **模型兼容** | 部分模型不支持8K | 所有模型都支持2K ✅ |

**成本节省示例**：
- 直接生成8K：1次生成 × 8K成本 = 100%
- 生成2K → 超分：1次生成 × 2K成本 + 超分成本（很低或免费）= 25%~30%

### 完整工作流

```
阶段1：生成低分辨率VR全景图
  输入：场景资产卡片 + VR全景提示词
  输出：2048x1024 VR全景图
  耗时：约30秒-2分钟
  成本：低

阶段2：质量检查与预览
  使用切片工具生成预览视角
  检查场景元素、构图、接缝
  如不满意，调整提示词重新生成（成本低）

阶段3：超分辨率放大（满意后执行）
  工具：Real-ESRGAN / Magnific AI / Upscale.media
  输入：2048x1024 VR全景图
  输出：8192x4096 VR全景图（4倍放大）
  耗时：约1-5分钟
  特点：严格基于原图，保证绝对一致性

阶段4：高清切片
  输入：8192x4096 VR全景图
  输出：多个1920x1080高清视角切片
  无畸变，无放大模糊
```

### 分辨率建议

| 阶段 | 推荐分辨率 | 用途 |
|------|-----------|------|
| **初始生成** | 2048x1024 | 快速验证构图和效果 |
| **超分放大** | 8192x4096（4倍） | 用于高清切片 |
| **切片输出** | 1920x1080 | 标准高清场景图 |

**分辨率计算**：
```
2048x1024（2:1） → 4倍放大 → 8192x4096（2:1）
                              ↓ 切片（90度FOV约占1/4）
                              1920x1080（无放大，清晰）
```

### 超分辨率工具选择

#### 推荐工具（按推荐度排序）

##### 1. 在线服务（最简单，无需安装）

| 服务 | 特点 | 放大倍数 | 价格 | 链接 |
|------|------|---------|------|------|
| **Magnific AI** ⭐⭐⭐⭐⭐ | 效果最好，AI引导 | 2x/4x/8x/16x | $39/月 | https://magnific.ai |
| **Upscale.media** ⭐⭐⭐⭐ | 免费，效果好 | 2x/4x | 免费（限量） | https://www.upscale.media |
| **Bigjpg** ⭐⭐⭐ | 专注动漫风格 | 2x/4x | 免费（限量） | https://bigjpg.com |

**推荐流程**：
1. 先用 Upscale.media 免费测试效果
2. 如果效果满意，考虑 Magnific AI 批量处理
3. 动漫风格场景使用 Bigjpg

##### 2. 开源工具（需要安装，免费）

**Real-ESRGAN** ⭐⭐⭐⭐⭐（推荐）

**特点**：
- ✅ 开源免费
- ✅ 效果优秀
- ✅ 支持4倍放大
- ✅ 严格保持一致性
- ⚠️ 需要GPU（CPU也可但慢）

**安装方法**：

方案A：使用 brew（macOS）
```bash
brew install xinntao/real-esrgan/realesrgan-ncnn-vulkan
```

方案B：手动下载预编译版本
```bash
# 1. 访问 https://github.com/xinntao/Real-ESRGAN/releases
# 2. 下载对应系统的版本：
#    - macOS: realesrgan-ncnn-vulkan-macos.zip
#    - Windows: realesrgan-ncnn-vulkan-windows.zip
#    - Linux: realesrgan-ncnn-vulkan-ubuntu.zip
# 3. 解压后使用
```

方案C：Python版本（需要GPU）
```bash
pip install realesrgan
```

**使用方法**：
```bash
# 命令行版本（推荐）
realesrgan-ncnn-vulkan \
  -i input_2k.png \
  -o output_8k.png \
  -s 4 \
  -n realesrgan-x4plus

# Python版本
python inference_realesrgan.py \
  -i input_2k.png \
  -o output_8k.png \
  --outscale 4
```

##### 3. 商业软件（付费，效果最好）

**Topaz Gigapixel AI** ⭐⭐⭐⭐⭐

**特点**：
- ✅ 效果业界最好
- ✅ 支持6倍放大
- ✅ AI面部增强
- ❌ 需付费（$99一次性）

### Python集成示例

```python
import subprocess
from PIL import Image

def upscale_vr_panorama(input_path, output_path, scale=4):
    """
    使用Real-ESRGAN放大VR全景图
    
    Args:
        input_path: 输入VR全景图路径
        output_path: 输出路径
        scale: 放大倍数（2或4）
    
    Returns:
        bool: 是否成功
    """
    cmd = [
        'realesrgan-ncnn-vulkan',
        '-i', input_path,
        '-o', output_path,
        '-s', str(scale),
        '-n', 'realesrgan-x4plus',
        '-f', 'png'
    ]
    
    try:
        subprocess.run(cmd, check=True)
        return True
    except subprocess.CalledProcessError:
        return False

# 使用示例
upscale_vr_panorama(
    'vr_panorama_2k.png',
    'vr_panorama_8k.png',
    scale=4
)
```

### 完整管线脚本

见 `vr_upscale_pipeline.py`（已创建，位于demo目录）

**使用方法**：
```bash
# 完整管线：生成 → 超分 → 切片
python vr_upscale_pipeline.py \
  --input vr_panorama_2k.png \
  --output output_dir \
  --views standard

# 跳过超分（仅切片）
python vr_upscale_pipeline.py \
  --input vr_panorama_2k.png \
  --no-upscale
```

### 质量对比

**放大前（2048x1024）**：
- 切片到1920x1080会被放大约1.8倍
- 结果：模糊、细节不足

**放大后（8192x4096）**：
- 切片到1920x1080不需要放大（实际是缩小）
- 结果：清晰、细节丰富

**超分一致性验证**：
- ✅ 场景元素位置：100%一致（严格基于原图）
- ✅ 色调和光影：100%一致
- ✅ 新增细节：AI推测，但风格一致

### 成本分析

#### 场景A：生成3个VR全景图用于选择

**传统方法（直接生成8K）**：
```
3次生成 × 8K成本 × 长时间等待 = 高成本 + 高时间成本
```

**优化方法（生成2K → 超分）**：
```
3次生成 × 2K成本（快速） + 1次超分（选中后） = 低成本 + 低时间成本
节省：约60-70%
```

#### 场景B：需要调整提示词迭代5次

**传统方法**：
```
5次生成 × 8K = 极高成本
```

**优化方法**：
```
5次生成 × 2K + 1次超分 = 成本降低80%
```

### 工作流最佳实践

#### 步骤1：快速验证（生成2K）

```markdown
【VR全景图 - 场景名称 - 720度环视】

画面格式：720度全景图，equirectangular投影，2:1比例（2048x1024）
... （其余提示词相同）

画面要求：
720度VR全景图，equirectangular格式，
标准分辨率（2048x1024），用于快速验证构图，
无任何人物角色，纯净场景
```

#### 步骤2：预览切片

```bash
python vr_slice_tool.py --input vr_2k.png --views standard
# 检查 6 个视角的效果
```

#### 步骤3：超分放大（满意后）

```bash
# 使用在线服务上传 vr_2k.png，选择4倍放大
# 或使用 Real-ESRGAN
realesrgan-ncnn-vulkan -i vr_2k.png -o vr_8k.png -s 4
```

#### 步骤4：高清切片

```bash
python vr_slice_tool.py --input vr_8k.png --views cinematic
# 获得高清的多视角场景图
```

### 注意事项

#### 1. 放大倍数选择

| 原始分辨率 | 推荐放大倍数 | 最终分辨率 | 用途 |
|-----------|------------|-----------|------|
| 2048x1024 | 4x | 8192x4096 | 高清切片（推荐） |
| 2048x1024 | 2x | 4096x2048 | 标准切片 |
| 4096x2048 | 2x | 8192x4096 | 已有4K原图时 |

#### 2. 超分工具的局限性

**优点**：
- ✅ 严格保持布局和元素位置一致
- ✅ 保持色调和风格一致
- ✅ 成本低、速度快

**缺点**：
- ⚠️ 细节是AI"推测"的，不是原生的
- ⚠️ 极细微的纹理可能与原图略有差异
- ⚠️ 不能"创造"原图中不存在的元素

**适用场景**：
- ✅ 建筑、室内、风景等几何结构清晰的场景
- ✅ 纹理规则、重复的表面（墙面、地毯、天花板）
- ⚠️ 极复杂的细节（如密集文字、复杂图案）可能略有差异

#### 3. 接缝问题处理

超分辨率放大**不会修复接缝问题**，只会放大接缝：
- 如果原图（2K）接缝有问题 → 放大后（8K）接缝问题依然存在且更明显
- **建议**：在2K阶段就确保接缝质量，通过提示词优化或后期修复

### 实施状态

**🚧 当前状态：尚未完成**

**已完成**：
- ✅ 工作流设计
- ✅ 技术方案验证
- ✅ Python脚本框架（vr_upscale_pipeline.py）
- ✅ 工具选择和对比分析

**待完成**：
- ⏳ Real-ESRGAN 安装和集成测试
- ⏳ 在线服务API集成（Magnific AI / Upscale.media）
- ⏳ 批量处理工作流
- ⏳ 质量自动评估（对比原图和超分图）
- ⏳ 完整的端到端测试

**临时方案**：
在工具完全集成前，用户可以：
1. 使用本skill生成2K VR全景图
2. 手动上传到 Upscale.media 进行4倍放大
3. 下载8K VR全景图
4. 使用 vr_slice_tool.py 进行切片

---

**更新版本**：v1.2.0  
**更新日期**：2026-06-12  
**更新内容**：新增VR全景图超分辨率工作流（尚未完成）

## 生成文件命名规则

场景资产图必须保存 `filename`，格式：

```text
场景资产-{场景名字}-{状态}-{类型}-v{版本号}
```

状态或类型没有时省略对应段；类型示例：`VR全景图`。示例：`场景资产-海底基地大厅-夜晚-VR全景图-v001.png`。

## 完成后下一步

完成判定：`SceneConceptCard` 已创建，用户已选择确认版本，并已回写 `SceneAssetCard.selectedVisual`。

完成当前场景生成后，检查当前集/场是否还有其他场景资产需要制作。

- 如果还有同场场景未完成：建议继续调用 `scene-asset-extraction` 或 `scene-generator`。
- 如果当前集/场场景资产已够用：提示用户可以继续做其他资产，或调用 `production-coordinator` 开始具体这一集这一场戏的制作。

推荐话术：`当前场景资产图已确认并回写。接下来我会检查当前集/场是否还有其他场景资产需要制作；如果没有，可以进入 production-coordinator 开始场次制作。`
