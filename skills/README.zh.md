# Spellpaw Skills

AI 短剧制作技能库 — 19 个 skill，覆盖 3 个分区，贯穿从剧本到视频的完整流水线。

## 目录结构

```
skills/
├── README.md                           # 英文版
├── README.zh.md                        # 本文件（中文版）
├── script-ingestion/                   # 创作区 — 剧本上传
├── script-deconstruct/                 # 创作区 — 剧本解构（调度 art-direction + music-direction）
├── art-direction/                      # 创作区 — 美术设定（子 skill）
├── music-direction/                    # 创作区 — 音乐设定（子 skill）
├── character-asset-extraction/         # 资产区 — 角色视觉转译
├── character-costume-designer/         # 资产区 — 角色妆造三视图
├── scene-asset-extraction/             # 资产区 — 场景视觉转译
├── scene-generator/                    # 资产区 — 场景概念图
├── prop-asset-extraction/              # 资产区 — 道具视觉转译
├── prop-generator/                     # 资产区 — 道具多视角图
├── music-asset-extraction/             # 资产区 — BGM/SFX 清单
├── music-prompt-generator/             # 资产区 — Suno/Udio 提示词
├── production-coordinator/             # 制作区 — 场次详情 + 资产检查
├── scene-strategy-designer/            # 制作区 — 布光、色调、角色站位
├── performance-strategy-designer/      # 制作区 — 动作、表情、台词演绎
├── cinematography-strategy-designer/   # 制作区 — 镜头拆分、运镜、转场
├── director-briefing/                  # 制作区 — 导演中枢（预判→派发→复判→落版）
├── storyboard-creator/                 # 制作区 — 关键分镜图 + 运动故事板
└── video-creator/                      # 制作区 — 视频生成
```

## 完整流水线

```
剧本
  │
  ├─ script-ingestion → FullScriptCard
  └─ script-deconstruct
       ├─ EpisodeSceneTableCard（分集分场表）
       ├─ StoryCoreCard（故事核心）、WorldviewCard（世界观）、PlotPacingCard（剧情节奏）
       ├─ CharacterSettingCard[] → character-asset-extraction → CharacterAssetCard → character-costume-designer → CharacterCostumeCard
       ├─ SceneSettingCard[]      → scene-asset-extraction      → SceneAssetCard      → scene-generator            → SceneConceptCard
       ├─ PropSettingCard[]       → prop-asset-extraction       → PropAssetCard       → prop-generator             → PropConceptCard
       ├─ art-direction           → ArtDirectionCard（美术设定）
       └─ music-direction         → MusicDirectionCard → music-asset-extraction → MusicAssetCard → music-prompt-generator → MusicPromptCard
            │                                                              （音乐支线，不阻塞主链路）
            ▼
制作区（按场次）
  │
  ├─ production-coordinator → EpisodeSceneDetailCard
  ├─ director-briefing（第一次：预判） → DirectorBriefingCard.precheck
  ├─ scene-strategy-designer      → SceneStrategyCard        ┐
  ├─ performance-strategy-designer → PerformanceStrategyCard ├─ 可并行
  └─ cinematography-strategy-designer → CinematographyStrategyCard ┘
       │
       ▼
  director-briefing（第二次：复判落版） → StoryboardPlanCard
       │
       ▼
  storyboard-creator → StoryboardCard
       │
       ▼
  video-creator → VideoCard
```

## 速查表

| # | Skill | 输入 → 输出 | 行数 |
|---|-------|------------|------|
| 1 | `script-ingestion` | 剧本文件 → FullScriptCard | 121 |
| 2 | `script-deconstruct` | FullScriptCard → 7 种卡片 + 子 skill | 639 |
| 3 | `art-direction` | 剧本 + 用户风格 → ArtDirectionCard | 971 |
| 4 | `music-direction` | 剧本 + 用户风格 → MusicDirectionCard | 680 |
| 5 | `character-asset-extraction` | CharacterSettingCard → CharacterAssetCard | 644 |
| 6 | `character-costume-designer` | CharacterAssetCard → CharacterCostumeCard | 356 |
| 7 | `scene-asset-extraction` | SceneSettingCard → SceneAssetCard | 415 |
| 8 | `scene-generator` | SceneAssetCard → SceneConceptCard | 417 |
| 9 | `prop-asset-extraction` | PropSettingCard → PropAssetCard | 514 |
| 10 | `prop-generator` | PropAssetCard → PropConceptCard | 417 |
| 11 | `music-asset-extraction` | MusicDirectionCard → MusicAssetCard | 220 |
| 12 | `music-prompt-generator` | MusicAssetCard → MusicPromptCard | 237 |
| 13 | `production-coordinator` | EpisodeSceneTableCard → EpisodeSceneDetailCard | 740 |
| 14 | `scene-strategy-designer` | DetailCard + AssetCard → SceneStrategyCard | 663 |
| 15 | `performance-strategy-designer` | DetailCard + CharacterCards → PerformanceStrategyCard | 990 |
| 16 | `cinematography-strategy-designer` | DetailCard + StrategyCards → CinematographyStrategyCard | 555 |
| 17 | `director-briefing` | DetailCard + 3 StrategyCards → StoryboardPlanCard | 1,463 |
| 18 | `storyboard-creator` | StoryboardPlanCard → StoryboardCard | 757 |
| 19 | `video-creator` | StoryboardCard → VideoCard | 741 |

## Skill 文件规范

每个 skill 目录结构：

```
skill-name/
├── SKILL.md              # 工作流 + 规则（必需）
└── references/           # 参考数据、schema、示例（可选）
    ├── *.md              # 大型参考表格、词汇库
    └── *.json            # 示例卡片输出
```

**SKILL.md** frontmatter 格式：
```yaml
---
name: skill-name
description: Use when [第三人称触发条件]
---
```

**核心原则**：SKILL.md = 工作流 + 决策点。参考数据、大型示例、schema 放在 `references/` 中。不要在 SKILL.md 中内联巨型表格或 JSON。

## 近期优化 (2026-06-27)

- 全部 19 个 skill：规范的 YAML frontmatter + 英文描述
- 9 个超大 skill 的内联参考数据提取到 `references/` 文件
- SKILL.md 总行数减少约 32%（17k → 11.5k）
- 删除垃圾文件（空 `build-a-story.md`、`.DS_Store`）
- 移除不支持的 frontmatter 字段（`version`、`author`、`tags`）
- 最大压缩：scene-generator (-63%)、character-costume-designer (-64%)、scene-asset-extraction (-48%)
