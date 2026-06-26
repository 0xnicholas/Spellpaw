---
name: script-ingestion
description: Use when a user uploads a full script file and the project must create a FullScriptCard before script decomposition can begin
---

# 剧本上传入口 Skill

将用户上传的完整剧本文件解析为唯一正式入口卡片 `FullScriptCard`。本 Skill 只负责“读取、解析、确认元信息、保留原文、创建完整剧本卡片”，不拆分角色/场景/道具；拆解工作交给 `script-deconstruct`。

## 输入

- 用户上传的剧本文件：`.txt`、`.md`、`.docx`、`.pdf`、`.fountain`
- 可选用户补充信息：作品类型、画幅、时长、集数、目标平台

## 输出

- `FullScriptCard`

## 工作流

1. **读取文件**
   - 保存 `sourceFile.fileName`、`mimeType`、`sizeBytes`、`uploadedAt`、可选 `checksum`
   - 尽量保留原始换行、场景标题、角色名、台词缩进、`△` 动作描述、VO/OS 标记

2. **解析文本**
   - 生成 `rawText`：完整剧本原文，不得只保存摘要
   - 生成 `parseVersion`：格式为 `script-ingestion@YYYY-MM-DD`
   - 记录 `parserWarnings[]`：乱码、页眉页脚残留、无法识别的场景标题、集数不连续等

3. **推断并确认元信息**
   - `metadata.projectType`
   - `metadata.aspectRatio`
   - `metadata.duration`
   - `metadata.episodeCount`
   - 可选 `metadata.targetPlatform`
   - 用户跳过时可用默认值，但必须在 `parserWarnings` 或 `notes` 中记录“待确认”

4. **创建 `FullScriptCard`**
   - `id` 为唯一卡片 ID
   - `type = "full_script"`
   - `upstreamCards = []`
   - `content.sourceFile`、`content.rawText`、`content.parseVersion` 必填
   - `content.episodes` 可以是初步解析结构；如果原剧本无法可靠分集，允许为空数组，但 `rawText` 不可为空

5. **衔接剧本解构**
   - 用户确认后调用 `callSkill('script-deconstruct', { fullScriptCard })`
   - 禁止调用旧名称 `script-deconstruction`

## FullScriptCard 最小结构

```typescript
interface FullScriptCard extends BaseCard {
  type: "full_script";
  upstreamCards: [];
  content: {
    title: string;
    subtitle?: string;
    author?: string;
    version: string;
    format: "feature" | "series" | "short";
    totalEpisodes?: number;
    estimatedDuration?: string;
    sourceFile: {
      fileId: string;
      fileName: string;
      mimeType: string;
      sizeBytes?: number;
      uploadedAt: string;
      checksum?: string;
    };
    rawText: string;
    parseVersion: string;
    parserWarnings?: Array<{
      code: string;
      message: string;
      location?: string;
    }>;
    metadata: {
      projectType: "电影" | "电视剧" | "短剧" | "广告" | "MV" | "纪录片";
      aspectRatio: "16:9" | "9:16" | "1:1";
      duration: {
        perEpisode?: number;
        total?: number;
      };
      episodeCount: number;
      targetPlatform?: string[];
      videoGenerationProfile?: VideoGenerationProfile;
    };
    episodes: Array<{
      episodeNumber: number;
      episodeTitle?: string;
      scenes: Array<{
        sceneNumber: string;
        heading?: string;
        rawTextRange?: {
          startOffset: number;
          endOffset: number;
        };
      }>;
    }>;
    characters?: Array<{ name: string; description?: string }>;
    locations?: Array<{ name: string; description?: string }>;
    productionNotes?: string;
  };
}
```

## 硬性规则

- `rawText` 为空时不得创建 `FullScriptCard`。
- `parseVersion` 为空时不得创建 `FullScriptCard`。
- 解析失败时先返回错误和 `parserWarnings`，不要让下游 Skill 猜测。
- `script-ingestion` 只创建入口卡片；所有创作分区下游卡片由 `script-deconstruct` 生成。

## 完成后下一步

完成判定：`FullScriptCard` 已创建，`sourceFile`、`rawText`、`parseVersion` 和用户确认的元信息完整。

优先调用 `script-deconstruct`，把完整剧本拆解为分集分场表、角色/场景/道具设定、美术设定和音乐设定。

推荐话术：`完整剧本卡片已创建。建议下一步调用 script-deconstruct 开始剧本解构，是否继续？`
