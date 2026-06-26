---
name: music-asset-extraction
description: 配乐资产提取 - 从音乐设定卡片提取BGM和SFX清单，创建配乐资产卡片
version: 1.0.0
author: Modo
tags: [ai-short-drama, music, asset-extraction]
---

# 配乐资产提取 Skill

从音乐设定卡片（创作分区）提取BGM和SFX信息，创建配乐资产卡片（资产分区-中间资产）。

## 整体工作流

```
输入：MusicDirectionCard（音乐设定卡片，来自创作分区）

阶段1：依赖检查
阶段2：提取继承信息（全局风格 + BGM清单 + SFX清单）
阶段3：生成制作优先级排序
  按重要性和使用频率排序BGM
  按类别分组SFX
阶段4：用户确认和补充
  确认BGM优先级
  补充特殊制作要求
阶段5：创建配乐资产卡片

输出：MusicAssetCard（配乐资产卡片）
```

---

## 阶段1：依赖检查

**检查项**：音乐设定卡片（必需）

**错误处理**：不存在时提示用户先运行 `/music-direction`

---

## 阶段2：提取继承信息

```typescript
interface InheritedMusicInfo {
  globalStyle: {
    styleDescription: string;
    primaryInstruments: string[];
    forbiddenInstruments: string[];
    tempoRange: string;
    emotionalMapping: Array<{
      emotion: string;
      musicalTreatment: string;
      instruments: string[];
      tempo: string;
    }>;
  };
  bgmList: Array<{
    bgmId: string;
    name: string;
    type: 'main_theme' | 'action' | 'scene_theme' | 'character_theme' | 'emotional_theme' | 'ending';
    mood: string;
    tempo: string;
    keyInstruments: string[];
    duration: string;
    variations: string[];
    usageScenarios: Array<{ sceneType: string; trigger: string }>;
    vocalType: 'instrumental' | 'with_vocals' | 'optional';  // 用户在阶段4确认
  }>;
  sfxList: Array<{
    sfxId: string;
    name: string;
    category: 'ui' | 'special' | 'character' | 'environment';
    description: string;
    duration: string;
    intensity: 'subtle' | 'moderate' | 'prominent';
    variations: string[];
  }>;
}
```

---

## 阶段3：生成制作优先级排序

### BGM 优先级规则

| BGM类型 | 优先级 | 原因 |
|---------|--------|------|
| main_theme | P1 | 每集使用，最高频 |
| action | P1 | 爽感/紧张场景高频使用 |
| emotional_theme（全剧高潮） | P1 | 情感最高点，质量要求最高 |
| character_theme | P2 | 角色专属，中频使用 |
| scene_theme | P2 | 特定场景使用 |
| emotional_theme（其他） | P2 | 中频使用 |
| ending | P3 | 每集结尾，但内容简短 |

### SFX 分组

- **必制组**：`special` 类（御尸术、晶核等剧情核心音效）
- **高频组**：`ui` 类（系统提示音、喜剧点缀）
- **环境组**：`environment` 类（可批量制作或使用素材库）
- **角色组**：`character` 类（丧尸声效等）

---

## 阶段4：用户确认和补充

向用户展示优先级排序后，引导补充：

```
## 配乐制作清单

### P1 优先制作（共X首）
1. **{bgm_name}** - {mood} - {tempo}
   变体：{variations}

...

### 人声设置（必填）
请为每首BGM确认是否需要人声：

| BGM | 默认建议 | 你的选择 |
|-----|---------|---------|
| 主题曲《逆潮》 | with_vocals（主题曲，可带人声） | |
| 爽感主题《升级》 | instrumental（BGM，纯器乐） | |
| ... | ... | |

说明：
- **with_vocals**：AI生成时允许出现人声/哼唱
- **instrumental**：纯器乐，提示词中追加 `instrumental only, no vocals`
- **optional**：两版都生成，后期选用

### 特殊制作要求
请补充以下信息（如有）：

**参考曲目**（如：类似《XXX》的风格，强烈建议填写，大幅提升精准度）：
**制作工具**（如：Suno / Udio / 人工制作）：
**平台限制**（如：红果平台对音量/格式的要求）：
**交付格式**（如：MP3 128kbps / WAV 44.1kHz）：
```

### 人声默认推断规则

用户未明确指定时，按以下规则自动推断：

| BGM类型 | 默认 vocalType |
|---------|--------------|
| main_theme | `with_vocals` |
| 其他所有类型 | `instrumental` |

---

## 阶段5：创建配乐资产卡片

```typescript
interface MusicAssetCard {
  id: string;
  type: 'music_asset';
  title: string;  // 如："[剧名] - 配乐资产"

  content: {
    upstreamCards: { musicDirectionCard: string };
    inheritedInfo: InheritedMusicInfo;
    productionPlan: {
      bgmPriority: Array<{
        priority: 'P1' | 'P2' | 'P3';
        bgmId: string;
        name: string;
        estimatedDuration: string;
      }>;
      sfxGroups: {
        required: string[];    // sfxId列表
        highFreq: string[];
        environment: string[];
        character: string[];
      };
    };
    userInput: {
      referenceTrack?: string;
      platformRequirements?: string;
      productionTool: string;
      deliveryFormat: string;
    };
    downstreamMusicCards: string[];
  };
}
```

---

## 测试用例

**输入**：丧尸末世短剧音乐设定卡片（8首BGM + 10个SFX）

**预期输出**：
- P1：主题曲《逆潮》、爽感主题《升级》、紧张主题《暗涌》、觉醒主题《破晓》
- P2：喜剧主题《崩坏》、复仇主题《冷锋》、温情主题《港湾》
- P3：片尾悬念曲《待续》
- 必制SFX：御尸术激活音效、晶核音效、圆形金属门声效

---

## 实施检查清单

- [ ] 阶段1：依赖检查完成
- [ ] 阶段2：BGM清单和SFX清单完整提取
- [ ] 阶段3：优先级排序完成
- [ ] 阶段4：用户确认制作清单，补充制作要求
- [ ] 阶段5：配乐资产卡片创建成功

---

**Skill版本**：v1.0  
**创建日期**：2026-05-29  
**测试状态**：待测试

## 完成后下一步

完成判定：`MusicAssetCard` 已创建，BGM/SFX 清单、优先级和人声设置已确认。

优先调用 `music-prompt-generator` 生成 Suno/Udio 等工具可用的音乐提示词。

推荐话术：`配乐资产清单已完成。可以调用 music-prompt-generator 生成音乐提示词；音乐支线当前不阻塞视频主链路。`
