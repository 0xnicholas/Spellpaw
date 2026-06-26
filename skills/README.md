# AI短剧工作室 - Skills 目录

本目录包含AI短剧工作室项目的所有自定义skill。这些skill用于自动化短剧制作流程中的各个环节。

## 📁 目录结构

```
skills/
├── README.md                           # 本文件
├── script-ingestion/                   # 剧本上传入口（创作分区）
├── script-deconstruct/                 # 剧本解构（创作分区）
├── art-direction/                      # 美术设定（创作分区）
├── music-direction/                    # 音乐设定（创作分区）
├── character-asset-extraction/         # 角色资产提取（资产分区）
├── character-costume-designer/         # 角色妆造师（资产分区）
├── scene-asset-extraction/             # 场景资产提取（资产分区）
├── scene-generator/                    # 场景生成师（资产分区）
├── prop-asset-extraction/              # 道具资产提取（资产分区）
├── prop-generator/                     # 道具生成师（资产分区）
├── music-asset-extraction/             # 配乐资产提取（资产分区）
├── music-prompt-generator/             # 配乐提示词生成师（资产分区）
├── production-coordinator/             # 剧务统筹（制作分区）
├── scene-strategy-designer/            # 现场设计（制作分区）
├── performance-strategy-designer/      # 表演设计（制作分区）
├── cinematography-strategy-designer/   # 拍摄设计（制作分区）
├── director-briefing/                  # 导演讲戏（制作分区）
├── storyboard-creator/                 # 故事板制作（制作分区）
└── video-creator/                      # 视频制作（制作分区）
```

## 🎬 工作流程

### 创作分区（Creation Zone）

#### 1. script-ingestion（剧本上传入口）
**作用**：读取用户上传的完整剧本文件，确认元信息，创建正式 FullScriptCard

**输入**：剧本文件（txt/md/docx/pdf/fountain）

**输出**：
- 完整剧本卡片（包含 sourceFile、rawText、parseVersion、metadata）

**使用方式**：
```
/script-ingestion
```

#### 2. script-deconstruct（剧本解构）
**作用**：将完整剧本解构为结构化的设定卡片

**输入**：完整剧本文本

**输出**：
- 分集分场表卡片
- 故事核心卡片
- 世界观卡片
- 剧情节奏卡片
- 角色设定卡片 × N
- 场景设定卡片 × N
- 道具设定卡片 × N
- 美术设定卡片（调用art-direction）
- 音乐设定卡片（调用music-direction）

**使用方式**：
```
/script-deconstruct
```

#### 2. art-direction（美术设定）
**作用**：基于剧本和用户偏好，生成详细的美术设定卡片

**输入**：
- 剧本内容
- 用户风格偏好

**输出**：
- 美术设定卡片（包含视觉风格、色彩系统、光影系统、构图原则等）

**使用方式**：
```
/art-direction
```

#### 3. music-direction（音乐设定）
**作用**：基于剧本和用户偏好，生成详细的音乐设定卡片

**输入**：
- 剧本内容
- 用户音乐偏好

**输出**：
- 音乐设定卡片（包含音乐风格、主题音乐、角色主题、场景音乐等）

**使用方式**：
```
/music-direction
```

---

### 资产分区（Assets Zone）

#### 4. character-asset-extraction（角色资产提取）
**作用**：从角色设定卡片提取和转译视觉化信息，创建角色资产卡片

**输入**：
- 角色设定卡片（来自创作分区）
- 世界观卡片（可选）
- 美术设定卡片（可选）

**输出**：
- 角色资产卡片（包含典型表情、典型动作、整体气质、物理细节、妆造需求等）

**核心功能**：
- 性格 → 典型表情（5个）
- 动机 → 典型动作（5个）
- 综合 → 整体气质
- 用户补充物理细节
- 确定妆造需求

**使用方式**：
```
/character-asset-extraction
```

#### 5. character-costume-designer（角色妆造师）
**作用**：从角色资产卡片生成标准化的角色妆造三视图

**输入**：
- 角色资产卡片（来自资产分区）
- 美术设定卡片（来自创作分区）

**输出**：
- 角色妆造三视图卡片（包含生成的图像、提示词、质量检查结果等）

**核心功能**：
- 生成针对GPT-Image-2/Seedance5优化的提示词
- 融入典型表情和典型动作到三视图模板
- 调用生图模型生成三视图
- 质量检查（角色一致性、风格一致性、细节清晰度）
- 支持角色换装（参考图生成）

**使用方式**：
```
/character-costume-designer
```

#### 6. scene-asset-extraction（场景资产提取）
**作用**：从场景设定卡片提取和转译视觉化信息，创建场景资产卡片

**输入**：
- 场景设定卡片（来自创作分区）
- 世界观卡片（可选）
- 美术设定卡片（必需）

**输出**：
- 场景资产卡片（包含光影方案、色彩方案、材质细节、生成需求等）

**使用方式**：
```
/scene-asset-extraction
```

#### 7. scene-generator（场景生成师）
**作用**：从场景资产卡片生成标准化的场景概念图

**输入**：
- 场景资产卡片（来自资产分区）
- 美术设定卡片（可选）

**输出**：
- 场景概念图卡片（16:9横版，GPT-Image-2/Gemini/Seedance5.0三套提示词）

**使用方式**：
```
/scene-generator
```

#### 8. prop-asset-extraction（道具资产提取）
**作用**：从道具设定卡片提取和转译视觉化信息，创建道具资产卡片

**输入**：
- 道具设定卡片（来自创作分区）
- 世界观卡片（可选）
- 美术设定卡片（可选）

**输出**：
- 道具资产卡片（包含材质推断、色彩推断、特效推断、生成需求等）

**核心功能**：
- 4个推断规则库（材质/色彩/特效/尺寸），自动补全剧本未描述的信息
- 用户交互确认机制，所有推断结果经用户确认后标注 `user_confirmed: true`
- 自动生成生成需求清单（core道具：main+detail+effect视图；supporting道具：main视图）

**使用方式**：
```
/prop-asset-extraction
```

#### 9. prop-generator（道具生成师）
**作用**：从道具资产卡片生成标准化的道具多视角图

**输入**：
- 道具资产卡片（来自资产分区）
- 美术设定卡片（可选）

**输出**：
- 道具概念图卡片（**默认多视角图，16:9横版**，参考角色妆造三视图标准）

**核心功能**：
- **默认输出多视角图**，一张图包含三个区域：
  - 主视角区（左60%）：3-4个视角，根据道具类别自动选择（武器/工具/特殊道具/建筑构件）
  - 细节特写区（右上）：4-6个细节特写，聚焦关键功能部件和材质纹理
  - 状态对比区（右下）：并排展示不同状态的视觉差异（如有多状态）
- 根据道具重要性自动选择背景（core纯黑/supporting虚化）
- 根据道具材质自动选择光照（自发光/金属/透明/复合材质）
- 支持GPT-Image-2（主）、Gemini（备选A）、Seedance5.0（备选B）三套提示词

**使用方式**：
```
/prop-generator
```

#### 10. music-asset-extraction（配乐资产提取）
**作用**：从音乐设定卡片提取BGM和SFX清单，生成制作优先级排序，引导用户确认人声设置和制作要求

**输入**：
- 音乐设定卡片（必需）

**输出**：
- 配乐资产卡片（含BGM优先级清单、SFX分组、每首BGM的 `vocalType` 确认）

**核心功能**：
- BGM优先级排序（P1/P2/P3）
- SFX分组（必制/高频/环境/角色）
- 人声设置确认：引导用户逐首指定 `instrumental`/`with_vocals`/`optional`，默认 `main_theme` → `with_vocals`，其余 → `instrumental`
- 引导用户补充参考曲目和制作工具

**使用方式**：
```
/music-asset-extraction
```

#### 11. music-prompt-generator（配乐提示词生成师）
**作用**：从配乐资产卡片生成针对Suno/Udio优化的提示词，按优先级批量输出

**输入**：
- 配乐资产卡片（必需）

**输出**：
- 配乐提示词卡片（每首BGM含Suno + Udio主版本及所有变体提示词）

**核心功能**：
- 根据 `vocalType` 自动追加人声标签（`instrumental` → 追加 `instrumental, no vocals`；`with_vocals` → 不追加；`optional` → 生成两版）
- 情绪→Suno标签映射（7种情绪类型）
- 变体提示词生成（短版/循环版/渐强版/突变版等）
- SFX双方案输出（AI生成提示词 + 素材库关键词）

**使用方式**：
```
/music-prompt-generator
```

---

### 制作分区（Production Zone）

#### 12. production-coordinator（剧务统筹）
**作用**：读取分集分场表卡片，为每一场戏创建分集分场剧情卡片，统筹整场戏的制作

**输入**：
- EpisodeSceneTableCard（分集分场表卡片）
- FullScriptCard（完整剧本卡片）

**输出**：
- EpisodeSceneCard（分集分场剧情卡片）

**核心功能**：
- 从分集分场表提取场次信息
- 从完整剧本中定位并提取该场戏的详细内容
- 整合场景、角色、道具信息
- 提取情绪基调和关键冲突

**使用方式**：
```
/production-coordinator
```

#### 13. scene-strategy-designer（现场设计）
**作用**：为每场戏设计场景策略，包括场景布光、角色站位、色调方案

**输入**：
- EpisodeSceneCard（分集分场剧情卡片）
- SceneAssetCard（场景资产卡片）
- CharacterAssetCard[]（角色资产卡片）
- ArtDirectionCard（美术设定卡片）

**输出**：
- SceneStrategyCard（场景策略卡片，包含场景预览图、布光方案、角色站位图）

**核心功能**：
- 分析场景空间结构和功能分区
- 设计三点布光方案（主光、辅光、轮廓光）
- 生成角色站位图（标注位置、朝向、关系）
- 生成场景效果预览图（整合布光和站位）

**使用方式**：
```
/scene-strategy-designer
```

#### 14. performance-strategy-designer（表演设计）
**作用**：像演员一样深入揣摩角色，设计每场戏的表演细节

**输入**：
- EpisodeSceneCard（分集分场剧情卡片）
- CharacterSettingCard[]（角色设定卡片）
- CharacterAssetCard[]（角色资产卡片）

**输出**：
- PerformanceDesignCard（表演设计卡片）

**核心功能**：
- 角色目标分析（这场戏角色想要什么）
- 障碍识别（什么阻碍了角色）
- 策略设计（角色如何克服障碍）
- 情绪弧线（情绪的起承转合）
- 具体化为动作、台词、微表情

**使用方式**：
```
/performance-strategy-designer
```

#### 15. cinematography-strategy-designer（拍摄设计）
**作用**：设计每场戏的镜头语言和拍摄策略

**输入**：
- EpisodeSceneCard（分集分场剧情卡片）
- PerformanceDesignCard（表演设计卡片）
- SceneStrategyCard（场景策略卡片）
- ArtDirectionCard（美术设定卡片）

**输出**：
- CinematographyStrategyCard（拍摄策略卡片）

**核心功能**：
- 镜头分组策略（按叙事单元分组）
- 景别设计（特写/中景/全景）
- 运镜设计（推拉摇移跟升降）
- 转场设计（切、淡入淡出、叠化等）
- 设备选择（摄影机、镜头、轨道、摇臂等）

**使用方式**：
```
/cinematography-strategy-designer
```

#### 16. director-briefing（导演讲戏）
**作用**：制作分区总导演中枢。先基于分集分场剧情卡片完成内容量初判和结构选择初判，再约束场景、表演、拍摄三张策略卡片；三张策略卡片完成后复判内容量、审计连续性，并落版镜头组。

**输入**：
- 第一次进入：EpisodeSceneCard + FullScriptCard.metadata.videoGenerationProfile
- 第二次进入：DirectorBriefingCard + PerformanceStrategyCard + CinematographyStrategyCard + SceneStrategyCard

**输出**：
- DirectorBriefingCard（导演讲戏卡片，包含precheck和finalBriefing）
- StoryboardPlanCard（分镜制作计划卡片，包含多个镜头组）

**核心功能**：
- 首次确认全剧采用15秒或30秒单镜头组上限，并保存卡片快照
- 内容量初判与结构选择初判
- 派发并约束场景/表演/拍摄三张策略卡片
- 内容量复判、连续性审计和尾帧锚点定义
- 为每个镜头组整合场景、表演和拍摄信息
- 为每个镜头组记录 `maxDurationApplied`
- 创建故事板计划卡片

**使用方式**：
```
/director-briefing
```

#### 17. storyboard-creator（故事板制作）
**作用**：为镜头组先生成高清关键分镜图，再生成引用这些关键图的运动故事板

**输入**：
- StoryboardPlanCard.shotGroups[]（三类策略文本唯一事实源）
- SceneStrategyCard.positionAnnotationImage（只读取场景站位标注图）
- CharacterAssetCard[]（角色资产卡片）
- SceneAssetCard（场景资产卡片）
- PropAssetCard[]（道具资产卡片，可选）
- ArtDirectionCard（美术设定卡片）

**输出**：
- StoryboardCard（包含关键分镜图、动作节拍和运动故事板）

**核心功能**：
- 双阶段闸门：关键分镜图全部确认后才制作故事板
- Agent 建议关键图计划，逐张确认提示词、清晰度和结果版本
- 按动作节拍自动拆分 4-12 格故事板
- 每格分别记录内容运动、运镜和关键图绑定
- 关键图版本变化时自动把故事板标为 stale

**使用方式**：
```
/storyboard-creator
```

#### 18. video-creator（视频制作）
**作用**：基于综合故事板卡片生成视频片段

**输入**：
- 已确认且非 stale 的 StoryboardCard
- CharacterAssetCard[]（角色资产）
- SceneAssetCard（场景资产）
- PropAssetCard[]（相关道具资产）
- FullScriptCard.metadata.aspectRatio（全局画幅）

**输出**：
- VideoCard（视频卡片）

**核心功能**：
- 关键分镜图控制视觉效果，故事板图和 BEATS 控制运动与连续性
- 场景站位标注图控制站位、视线、轴线和路线
- 查询视频 API 的真实时长、画质、画幅和音频能力
- 参数确认闸门 + 中文提示词确认闸门
- 时长默认引用镜头组，必要时显式重排 BEATS
- 同一镜头组只维护一张 VideoCard，通过 videoVersions[] 迭代

**使用方式**：
```
/video-creator
```

---

## 🔄 完整工作流示例

### 从剧本到角色三视图

```
1. 剧本解构
   /script-deconstruct
   ↓
   输出：角色设定卡片、美术设定卡片等

2. 角色资产提取
   /character-asset-extraction
   ↓
   输出：角色资产卡片（含表情、动作、物理细节）

3. 角色妆造生成
   /character-costume-designer
   ↓
   输出：角色妆造三视图卡片（含生成的图像）
```

### 从剧本到道具多视角图

```
1. 剧本解构
   /script-deconstruct
   ↓
   输出：道具设定卡片、美术设定卡片等

2. 道具资产提取
   /prop-asset-extraction
   ↓
   输出：道具资产卡片（含材质/色彩/特效推断，用户确认）

3. 道具多视角图生成
   /prop-generator
   ↓
   输出：道具多视角图卡片（16:9，主视角区+细节特写区+状态对比区）
```

### 从剧本到视频成片（制作分区完整流程）

```
1. 剧务统筹
   /production-coordinator
   ↓
   触发：用户提到要做具体某一集/某一场
   输出：分集分场剧情卡片（不存在则创建，存在则检查完成情况）

2. 导演讲戏（第一次预判）
   /director-briefing
   ↓
   输入：分集分场剧情卡片 + 全剧视频生成配置
   输出：导演讲戏卡片（precheck：内容量初判 + 结构选择初判）

3. 现场设计
   /scene-strategy-designer
   ↓
   输入：分集分场剧情卡片 + 导演讲戏卡片(precheck) + 场景资产 + 角色资产
   输出：场景策略卡片（布光、站位、场景预览图）

4. 表演设计
   /performance-strategy-designer
   ↓
   输入：分集分场剧情卡片 + 导演讲戏卡片(precheck) + 角色设定
   输出：表演设计卡片（目标、障碍、策略、情绪弧线）

5. 拍摄设计
   /cinematography-strategy-designer
   ↓
   输入：分集分场剧情卡片 + 导演讲戏卡片(precheck) + 表演设计 + 场景策略
   输出：拍摄策略卡片（镜头分组、景别、运镜、转场）

6. 导演讲戏（第二次复判落版）
   /director-briefing
   ↓
   输入：导演讲戏卡片 + 现场设计 + 表演设计 + 拍摄设计
   输出：更新导演讲戏卡片 + 故事板计划卡片（包含多个镜头组）

7. 故事板制作
   /storyboard-creator
   ↓
   输入：故事板计划卡片 + 各类资产
   输出：综合故事板卡片（关键分镜图 + 运动故事板）

8. 视频制作
   /video-creator
   ↓
   输入：已确认综合故事板卡片 + 各类资产
   输出：视频卡片（视频文件；当前作为镜头组终点）
```

---

## 📋 Skill开发规范

### 文件结构
每个skill目录必须包含：
```
skill-name/
└── SKILL.md          # Skill定义文件
```

### SKILL.md格式
```markdown
# Skill名称

简短描述

## 整体工作流
[工作流程图]

## 阶段1：xxx
[详细说明]

## 阶段2：xxx
[详细说明]

...

## 测试用例
[测试用例]

## 实施检查清单
[检查清单]
```

### 命名规范
- Skill目录名：小写字母+连字符（如：`character-asset-extraction`）
- Skill文件名：固定为 `SKILL.md`
- 卡片类型：驼峰命名（如：`CharacterAssetCard`）

---

## 🧪 测试数据

测试数据位于 `/samples/project-samples/` 目录：
- `/samples/project-samples/解构测试结果/`：剧本解构的测试输出
- `/samples/project-samples/资产区测试结果/`：资产区的测试输出

---

## 📚 相关文档

### 设计文档
- `/docs/创作分区卡片系统设计.md`
- `/docs/资产分区系统设计-v2.md`
- `/docs/03-card-schemas/资产分区卡片字段定义.md`
- `/docs/02-architecture/制作分区实施计划.md`

### Skill设计文档
- `/docs/Skill剧本解构设计.md`
- `/docs/Skill角色资产提取设计.md`
- `/docs/Skill妆造师设计-v2.md`

### Skill实施文档
- `/docs/Skill实施文档-角色资产提取.md`
- `/docs/Skill实施文档-妆造师.md`

### 优化文档
- `/docs/提示词模板优化-GPT-Image-2和Seedance5.md`
- `/docs/三视图模板调整-融入表情和动作.md`
- `/docs/资产区用户确认机制设计.md`

---

## 🚀 快速开始

1. **安装skill到Claude**
   ```bash
   # 将skill目录链接到用户的.claude目录
   ln -s /Users/shoppen/AI/Ai-agent-studio/skills/* /Users/shoppen/.claude/skills/
   ```

2. **使用skill**
   ```
   # 在Claude Code中直接调用
   /script-deconstruct
   /character-asset-extraction
   /character-costume-designer
   ```

3. **查看skill列表**
   ```
   # 在Claude Code中查看所有可用的skill
   /skills
   ```

---

## 📝 版本历史

- **v3.0.0** (2026-06-09)
  - 新增制作分区完整工作流（7个skill）
  - production-coordinator：剧务统筹，创建分集分场剧情卡片
  - scene-strategy-designer：现场设计，生成场景策略和预览图
  - performance-strategy-designer：表演设计，像演员一样揣摩角色
  - cinematography-strategy-designer：拍摄设计，设计镜头语言
  - director-briefing：导演讲戏，拆分镜头组并整合表演+拍摄
  - storyboard-creator：故事板制作，先生成关键分镜图，再生成运动故事板
  - video-creator：视频制作，基于综合故事板卡片生成视频
  - 完善从剧本到视频成片的完整制作流程

- **v2.0.0** (2026-05-30)
  - prop-generator：默认输出改为多视角图（16:9），参考角色妆造三视图标准
  - prop-asset-extraction：新增4个推断规则库（材质/色彩/特效/尺寸）+ 用户交互确认机制
  - script-deconstruct：道具设定卡片 basicAppearance 字段结构化（size/materialDetails/colorScheme/visualEffects）
  - 新增完整道具管线工作流文档

- **v1.0.0** (2026-05-29)
  - 创建创作分区skill：script-deconstruct, art-direction, music-direction
  - 创建资产分区skill：character-asset-extraction, character-costume-designer
  - 完成基础工作流测试（林渊角色）

---

## 🤝 贡献指南

### 添加新的Skill

1. 在 `skills/` 目录下创建新的skill目录
2. 编写 `SKILL.md` 文件
3. 在本README中添加skill说明
4. 创建测试用例
5. 更新相关文档

### Skill质量标准

- ✅ 清晰的工作流程定义
- ✅ 完整的输入输出说明
- ✅ 详细的转译规则（如适用）
- ✅ 用户交互机制
- ✅ 错误处理策略
- ✅ 测试用例
- ✅ 实施检查清单

---

**维护者**：Modo  
**最后更新**：2026-06-09
