---
name: music-prompt-generator
description: 配乐提示词生成师 - 从配乐资产卡片生成AI音乐生成提示词（Suno/Udio）
version: 1.0.0
author: Modo
tags: [ai-short-drama, music, prompt-generation, suno, udio]
---

# 配乐提示词生成师 Skill

从配乐资产卡片生成针对AI音乐工具（Suno/Udio）优化的提示词，按优先级批量输出。

## 整体工作流

```
输入：MusicAssetCard（配乐资产卡片）

阶段1：依赖检查
阶段2：选择目标BGM/SFX（按优先级）
阶段3：生成提示词
  Suno：英文标签 + 风格描述
  Udio：英文自然语言描述
阶段4：生成变体提示词（每首BGM的所有变体）
阶段5：输出提示词卡片

输出：MusicPromptCard（配乐提示词卡片）
```

---

## 阶段1：依赖检查

**检查项**：配乐资产卡片（必需）

**错误处理**：不存在时提示用户先运行 `/music-asset-extraction`

---

## 阶段2：选择目标

默认按 P1 → P2 → P3 顺序处理。用户可指定：
- 单首：`生成《逆潮》的提示词`
- 按优先级：`生成所有P1的提示词`
- 按类型：`生成所有SFX提示词`

---

## 阶段3：生成提示词

### Suno 提示词模板

Suno 使用**风格标签 + 简短描述**，控制在 200 字符以内：

```
[genre tags], [mood tags], [instrument tags], [tempo], [production style], [vocal tag]
```

**人声标签规则**（根据 `vocalType` 自动追加）：

| vocalType | 追加标签 |
|-----------|---------|
| `instrumental` | `instrumental, no vocals` |
| `with_vocals` | 不追加（Suno默认生成人声） |
| `optional` | 生成两版：一版追加 `instrumental, no vocals`，一版不追加 |

**情绪→标签映射表**：

| 情绪 | 风格标签 | 情绪标签 | 乐器标签 |
|------|---------|---------|---------|
| 爽感/升级 | electronic, synthpop | energetic, triumphant, satisfying | synthesizer, drum machine, bass synth |
| 喜剧/荒诞 | indie pop, quirky | playful, lighthearted, comedic | clean guitar, music box, light synth |
| 紧张/危机 | electronic, dark synth | tense, urgent, suspenseful | bass synth, fast drums, high-freq synth |
| 复仇/冷酷 | dark electronic, minimal | cold, calculated, controlled | bass loop, minimal percussion, dark pad |
| 悲愤/觉醒 | cinematic electronic | emotional, building, powerful | piano, bass synth, drums crescendo |
| 温情/守护 | ambient pop | warm, gentle, heartfelt | piano, warm pad, soft strings |
| 悬念/片尾 | electronic, minimal | mysterious, anticipating | context-dependent, short stinger |

**示例（主题曲《逆潮》）**：
```
electronic, synthpop, energetic, confident, uplifting, not epic,
synthesizer lead, drum machine, bass synth, piano accent,
120 BPM, modern production, short drama style, loop-friendly
```

**示例（喜剧主题《崩坏》）**：
```
indie pop, quirky, playful, comedic, lighthearted,
clean guitar, music box, light synth, electronic drums,
110 BPM, bouncy rhythm, sudden key change variation available
```

---

### Udio 提示词模板

Udio 支持更长的自然语言描述，控制在 500 字符以内：

```
{mood description}. {instrumentation}. {tempo and rhythm}. 
{production notes}. {usage context}. {what to avoid}.
```

**示例（觉醒主题《破晓》）**：
```
Emotional electronic music that builds from quiet despair to powerful 
resolution. Starts with simple piano chords and low bass drone at 90 BPM, 
gradually adds electronic drums that intensify, culminating in a bright 
synthesizer burst at 150 BPM. Not orchestral or epic — powerful but 
intimate. For a pivotal emotional scene in a fast-paced Chinese web drama. 
Avoid full orchestra, choir, or overly cinematic sound.
```

---

## 阶段4：生成变体提示词

每首BGM的每个变体单独生成提示词，在主提示词基础上追加变体描述：

| 变体类型 | 追加描述 |
|---------|---------|
| 短版（30-45秒） | `short version, 30 seconds, no intro` |
| 循环版 | `seamless loop, no fade in/out` |
| 渐强版 | `starts quiet, builds gradually, full energy at end` |
| 纯器乐版 | `instrumental only, no vocals` |
| 突变版（喜剧反转） | `starts serious for 5 seconds, then suddenly switches to playful` |

---

## 阶段5：输出提示词卡片

### 输出格式

每首BGM/SFX输出一个提示词块：

```markdown
## {bgm_name}（{bgmId}）

**用途**：{usage description}
**优先级**：{P1/P2/P3}

### Suno 提示词
**主版本**：
{suno_prompt}

**变体 - {variation_name}**：
{suno_prompt_variation}

### Udio 提示词
**主版本**：
{udio_prompt}

---
```

### 卡片结构

```typescript
interface MusicPromptCard {
  id: string;
  type: 'music_prompt';
  title: string;  // 如："[剧名] - 配乐提示词"

  content: {
    upstreamCards: { musicAssetCard: string };
    bgmPrompts: Array<{
      bgmId: string;
      name: string;
      priority: 'P1' | 'P2' | 'P3';
      suno: {
        main: string;
        variations: Record<string, string>;
      };
      udio: {
        main: string;
        variations: Record<string, string>;
      };
    }>;
    sfxPrompts: Array<{
      sfxId: string;
      name: string;
      category: string;
      suno: string;
      udio: string;
      note: string;  // SFX通常更适合音效库而非AI生成，此处注明
    }>;
  };
}
```

---

## SFX 特殊处理

SFX（音效）与BGM不同，AI音乐工具生成效果有限。对每个SFX提供两种方案：

1. **AI生成提示词**（Suno/Udio）：适合环境音效
2. **素材库推荐关键词**（Freesound/Epidemic Sound）：适合特殊音效

| SFX类别 | 推荐方案 |
|---------|---------|
| environment | AI生成（环境音效效果较好） |
| ui | 素材库（系统提示音精度要求高） |
| special | 素材库 + 后期处理（御尸术、晶核等需要精确控制） |
| character | 素材库（丧尸声效需要真实感） |

---

## 测试用例

**输入**：丧尸末世短剧配乐资产卡片，生成P1 BGM提示词

**预期输出**：
- 《逆潮》：Suno + Udio 各1套，含4个变体
- 《升级》：Suno + Udio 各1套，含3个变体
- 《暗涌》：Suno + Udio 各1套，含3个变体
- 《破晓》：Suno + Udio 各1套，含2个变体

---

## 实施检查清单

- [ ] 阶段1：依赖检查完成
- [ ] 阶段2：目标BGM/SFX已选定
- [ ] 阶段3：主提示词生成完成（Suno + Udio）
- [ ] 阶段4：所有变体提示词生成完成
- [ ] 阶段5：提示词卡片输出，格式清晰可直接使用

---

**Skill版本**：v1.0  
**创建日期**：2026-05-29  
**测试状态**：待测试

## 完成后下一步

完成判定：`MusicPromptCard` 已创建，BGM 和 SFX 的提示词版本已保存。

当前无强制下游。音乐支线当前不接入视频主链路；用户可以保存提示词、继续生成音乐版本，或回到 `production-coordinator` 推进具体场次制作。

推荐话术：`音乐提示词已完成。当前音乐支线不阻塞视频主链路，你可以继续音乐制作，也可以回到具体场次的视频制作流程。`
