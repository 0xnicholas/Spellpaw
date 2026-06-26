# 导演讲戏 (Director Briefing)

基于分集分场剧情卡片，先对整场戏进行内容量初判和结构选择初判，创建导演讲戏卡片；再把场景策略、表演策略、拍摄策略三个skill作为子skill派发执行；三张策略卡片完成后回到导演讲戏进行内容量复判、连续性审计和镜头组落版，生成结构化的分镜制作计划。

**本skill的核心**：不是最后才做汇总，而是作为制作分区的总导演中枢，前置决定“这场戏怎么拍”，约束三张策略卡片的设计方向，最后再把策略落成可执行镜头组。

---

## 整体工作流

```
第一次进入输入：分集分场剧情卡片
  ↓
阶段0：确认全剧视频生成时长配置
  - 读取 FullScriptCard.metadata.videoGenerationProfile
  - 缺失时询问用户是否采用支持最长30秒镜头组的生产配置
  - 接受则本剧后续未落版镜头组上限为30秒；明确拒绝则为15秒
  - 将已确认配置写入 DirectorBriefingCard 快照
  ↓
阶段A：导演预判（创建 DirectorBriefingCard.precheck）
  - 提取剧情内容和叙事目的
  - 识别节奏变化和情绪曲线
  - 找到关键转变点（情节转折、情绪高潮、关键台词）
  - 按可播放内容量判断时长、复杂度和是否需要拆分
  - 选择主结构/辅助结构
  - 生成镜头组粗拆建议
  - 写入给场景/表演/拍摄三张策略卡片的设计指令
  ↓
阶段B：派发子skill
  - 场景策略：读取 DirectorBriefingCard.precheck.strategyDirectives.scene
  - 表演策略：读取 DirectorBriefingCard.precheck.strategyDirectives.performance
  - 拍摄策略：读取 DirectorBriefingCard.precheck.strategyDirectives.cinematography
  - 三张策略卡片完成后回写 DirectorBriefingCard.strategyCards
  ↓
第二次进入输入：DirectorBriefingCard + 场景策略卡片 + 表演策略卡片 + 拍摄策略卡片
  ↓
阶段C：导演复判（更新 DirectorBriefingCard.finalBriefing）
  - 判断预判结构是否仍然成立
  - 判断三张策略卡片展开后内容量是否变重/变轻
  - 做连续性审计：轴线、视线、站位、运动方向、持物手、道具、服装状态、光线、情绪余韵
  ↓
阶段D：镜头组落版
  - 场景策略：光照、色调、氛围、角色站位
  - 表演策略：每个角色的动作、表情、台词演绎
  - 拍摄策略：所有镜头的景别、运镜、角度、参数
  - 基于复判结果进行最终镜头组拆分
  - 考虑剪辑合理性（叙事流畅、节奏合理、转场自然）
  - 考虑时长合理性（每组≤当前配置的 maxShotGroupDuration）
  - 为每个镜头组定义尾帧锚点
  - 形成结构化的镜头表和 StoryboardPlanCard
  - 不确定时用引导式提问和用户确认
  ↓
输出：DirectorBriefingCard + 分镜制作计划卡片（StoryboardPlanCard）
```

---

## 运行模式判断

根据输入自动判断当前处于哪个阶段：

- 如果只有分集分场剧情卡片，执行 `导演预判`，创建 `DirectorBriefingCard`，状态为 `precheck` 或 `strategies_in_progress`。
- 如果已有 `DirectorBriefingCard.precheck` 且三张策略卡片尚未完成，提示继续完成场景策略、表演策略、拍摄策略。
- 如果已有 `DirectorBriefingCard` 且三张策略卡片都已完成，执行 `导演复判 + 镜头组落版`，更新 `DirectorBriefingCard.finalBriefing` 并创建 `StoryboardPlanCard`。

---

## Reference Routing

本skill的重规则放在 `references/`，按需读取：

- 内容量初判、结构选择、镜头组粗拆：读取 `references/content-load-and-structure.md`。
- 全剧视频模型偏好、15/30秒上限、卡片快照和旧卡兼容：读取 `references/video-generation-duration-profile.md`。
- 导演复判、连续性审计、尾帧锚点：读取 `references/continuity-tailframe-audit.md`。
- 镜头组落版前的质量检查、压缩和拆分：读取 `references/director-quality-self-check.md`。
- 测试、评审或大改制作分区skill时：读取 `references/production-regression-cases.md`。

不要把这些reference完整复述给用户；把它们作为内部判断依据，输出简洁的导演判断和卡片字段。

---

## 阶段A：导演预判

**目标**：在三张策略卡片之前，为整场戏确定内容量、主结构和三张子策略卡片的设计重点。

### A.0 确认全剧视频生成时长配置

在内容量初判和镜头组粗拆之前，读取：

```text
FullScriptCard.metadata.videoGenerationProfile
```

字段缺失或 `userConfirmed !== true` 时，询问用户是否采用支持最长30秒单次视频生成的 Seedance 2.5 生产配置：

- 接受：`supports30SecondShotGroup = true`，`maxShotGroupDuration = 30`。
- 明确拒绝：`supports30SecondShotGroup = false`，`maxShotGroupDuration = 15`。
- 未确认前不能完成 `DirectorBriefingCard.precheck`。
- 字段已确认后，同一部剧后续场次直接继承，不重复询问。

把已确认配置保存到：

```text
DirectorBriefingCard.videoGenerationProfileSnapshot
```

该字段表达用户确认的生产规划能力；实际视频生成时仍由 `video-creator` 查询目标 API 的真实能力。

### A.1 全局理解这场戏

**目标**：从分集分场剧情卡片中理解这场戏的叙事目的、节奏、关键重点

### A.1.1 读取分集分场剧情卡片

**输入**：
- `sceneId`：场次ID（如："第1集-第3场"）
- `FullScriptCard.metadata.videoGenerationProfile`：全剧视频生成能力配置；缺失时先完成 A.0 确认

**需要提取的信息**：

#### 1.1.1 剧情内容
- `visualDescription`：视觉描述数组（按sequence排序）
- `sceneElements.environment`：环境描述
- `sceneElements.characterStates`：角色状态
- `sceneElements.objects`：重要物件
- `dialogueLines`：台词列表（如有）

#### 1.1.2 节奏和情绪
- `rhythm`：节奏（fast/medium/slow）
- `emotion`：情绪基调
- `emotionIntensity`：情绪强度（1-10）
- `tension`：紧张度（1-10）

#### 1.1.3 叙事结构
- `narrativeRole`：叙事作用（exposition/rising/climax/falling/resolution）
- `dramaticFunction`：戏剧功能（conflict/reveal/decision/action/reflection）
- `keyConflict`：核心冲突（如有）

#### 1.1.4 拍摄意图
- `cameraInfo.purpose`：镜头目的
- `cameraInfo.focus`：视觉焦点
- `duration`：预计时长

---

### A.1.2 分析这场戏的核心重点

**执行逻辑**：基于提取的信息，回答以下问题

#### 问题1：这场戏的叙事目的是什么？

**分析维度**：
- **narrativeRole**：在整个故事中的作用（铺垫/推进/高潮/收尾）
- **dramaticFunction**：具体的戏剧功能（冲突/揭示/决策/行动/反思）
- **keyConflict**：核心矛盾是什么

**输出格式**：
```
叙事目的：[一句话概括]

示例：
- "展现主角面对危机时的冷静和决心，为后续战斗做铺垫"
- "通过对话揭示两人之间的隐藏矛盾，推动情节转折"
- "营造紧张氛围，展现敌人的强大，制造悬念"
```

---

#### 问题2：这场戏的情绪曲线是什么？

**分析维度**：
- **emotion + emotionIntensity**：起始情绪和强度
- **visualDescription**：从视觉描述推断情绪变化
- **tension**：紧张度变化
- **dialogueLines**：从台词内容推断情绪转变

**输出格式**：
```
情绪曲线：[起点] → [转折点1] → [转折点2] → [终点]

示例：
- "平静警惕(3) → 看到危机后紧张(7) → 下定决心后坚定(8)"
- "温馨平和(2) → 对话中渐生嫌隙(5) → 矛盾爆发愤怒(9)"
- "好奇探索(4) → 发现真相后震惊(10) → 理解后释然(6)"
```

---

#### 问题3：这场戏的关键转变点在哪里？

**分析维度**：
- **情节转折**：剧情从A状态转到B状态的时刻
- **情绪高潮**：情绪强度达到峰值的时刻
- **关键台词**：揭示重要信息或推动情节的台词
- **关键动作**：改变局势的动作

**识别方法**：
1. 遍历 `visualDescription` 数组，识别描述中的转折词："但是"、"突然"、"这时"、"然而"
2. 识别 `dialogueLines` 中的重要台词（通常是短句、反问、决定性语句）
3. 识别 `characterStates` 中的状态变化

**输出格式**：
```
关键转变点：

#1 [时间点估计：Xs] [类型：情节转折/情绪高潮/关键台词/关键动作]
描述：[具体内容]
重要性：critical/important/supporting

示例：
#1 [0s] [情节触发] 林渊看到尸潮涌来
重要性：critical
理由：触发整场戏的核心事件

#2 [8s] [情绪转变] 林渊从警惕转为坚定
重要性：important
理由：角色内心状态的关键变化

#3 [12s] [关键台词] 林渊说"它们来了"
重要性：important
理由：宣告战斗即将开始，推动情节
```

---

#### 问题4：这场戏需要表现的核心重点是什么？

**综合分析**：基于叙事目的、情绪曲线、关键转变点，提炼出2-3个核心重点

**输出格式**：
```
核心重点：

1. [重点1]：[为什么重要]
2. [重点2]：[为什么重要]
3. [重点3]：[为什么重要]（如有）

示例：
1. 展现主角的决心：通过表情变化和肢体语言，展现林渊从警惕到坚定的内心转变
2. 营造危机感：通过环境描写（洪水、尸潮）和光影对比，营造末日危机的压迫感
3. 为战斗做铺垫：通过镜头推进和角色动作，预示即将到来的激战
```

---

### A.2 内容量初判

不要只按文字长短判断。按这场戏真实可播放的画面内容判断它能否被一个镜头组承载：

- 剧情节点或反转数量
- 关键台词数量、说话前停顿、听者反应
- 身体动作、空间移动、打斗、拥抱、跌倒、拿放道具
- 情绪转折和微表情沉淀时间
- 场景/地点/时间变化
- 运镜、重新构图和大动作前需要拉开景别的时间
- 结尾1-2秒的呼吸、反应、声音尾巴或尾帧停留

输出格式：

```text
【内容量初判】
内容量等级：low / medium / high / overloaded
可播放节点数：X个
预计可播放时长：X-Y秒
判断理由：
- 剧情节点：...
- 台词与反应：...
- 动作/空间移动：...
- 情绪转折：...
- 结尾余韵：...
拆分倾向：单镜头组 / 2-3组 / 4组以上 / 需先压缩
```

如果超过一个 `maxShotGroupDuration` 镜头组能自然承载的内容，不要硬塞。先给出镜头组粗拆建议，让三张策略卡片围绕这个粗拆工作。

### A.3 结构选择初判

先选择结构，再派发三张策略卡片。结构会决定场景站位、表演组织和拍摄策略。

| 结构 | 使用场景 | 三张策略卡片的重点 |
|---|---|---|
| 单场景一镜到底 | 一个空间、一个连续情绪变化、动作少 | 场景保持单一动线；表演强调连续动作锚点；拍摄强调一个稳定运动路径 |
| 单场景连续剪辑 | 一个地点内有多个动作/反应节点 | 场景明确前中后景；表演按节点推进；拍摄用3-5个镜头建立、反应、结尾 |
| 多人对话交叉剪辑 | 2-4人关系压力来自台词和沉默 | 场景确定轴线/坐位/视线；表演强调台词和听者反应；拍摄设计关系镜头与反打 |
| 长特写微表情 | 情绪主要靠脸部和头部细节完成 | 场景压缩背景和光源；表演写微表情时间轴；拍摄使用ECU/CU和稳定机位 |
| 连续动作剪辑 | 人物带目标穿越空间或逃跑追逐 | 场景明确起点/终点/路径；表演强调动作因果；拍摄保持方向连续 |
| 蒙太奇/匹配剪辑 | 记忆、时间压缩、象征或过去/现在对照 | 场景找转场锚点；表演保持姿态/物件呼应；拍摄用声音、动作或物件匹配 |
| 大场面压缩 | 灾难、战场、宴会、群像但要跟随一个人 | 场景明确人群压力和主角锚点；表演避免群体抢戏；拍摄只保留4-5个关键节点 |
| 格斗动作编排 | 1v1或少量角色清晰攻防 | 场景锁定环境撞击点；表演写攻防链；拍摄保证全身可读和空间连续 |
| 长剧情拆分 | 超过当前 `maxShotGroupDuration` 承载能力或多次转折 | 场景/表演/拍摄按镜头组粗拆工作；每组保留尾帧锚点 |

输出格式：

```text
【结构选择初判】
主结构：...
辅助结构：...
选择理由：...
镜头组粗拆：
1. X-Ys：核心任务...
2. X-Ys：核心任务...
给三张策略卡片的指令：
- 场景策略：...
- 表演策略：...
- 拍摄策略：...
```

### A.4 创建导演讲戏卡片

将 A.1-A.3 的结果写入 `DirectorBriefingCard.precheck`：

```typescript
{
  cardType: "DirectorBriefingCard",
  workflowStatus: "precheck",
  videoGenerationProfileSnapshot,
  precheck: {
    narrativeObjective,
    emotionalCore,
    visualCore,
    playableContentLoad,
    playableBeatCount,
    estimatedPlayableDuration,
    primaryStructure,
    secondaryStructure,
    preliminaryShotGroupPlan,
    strategyDirectives
  }
}
```

创建后提示用户进入三张子策略卡片：场景策略、表演策略、拍摄策略。

### A.5 输出预判结果

将第一步的分析结果汇总，形成对这场戏的整体理解：

```
============================================
第一步：全局理解这场戏
============================================

场次：第1集-第3场
预计时长：45秒
节奏：medium
情绪基调：紧张、压抑

叙事目的：
  展现主角林渊面对末日危机时的冷静和决心，为后续战斗做铺垫

情绪曲线：
  平静警惕(3) → 看到尸潮后紧张(7) → 下定决心后坚定(8)

关键转变点：
  #1 [0s] [情节触发] 林渊看到尸潮涌来 (critical)
  #2 [8s] [情绪转变] 林渊从警惕转为坚定 (important)
  #3 [12s] [关键台词] 林渊说"它们来了" (important)

核心重点：
  1. 展现主角的决心：通过表情变化展现内心转变
  2. 营造危机感：通过环境和光影营造压迫感
  3. 为战斗做铺垫：通过镜头推进预示激战

============================================
```

---

## 阶段C：导演复判

**目标**：理解已确认的场景、表演、拍摄设计细节，判断它们是否遵守 `DirectorBriefingCard.precheck`，并为镜头组落版提供依据。

### C.1 汇总场景策略

**读取**：场景策略卡片（SceneStrategyCard）

**提取信息**：
- **lighting**：光照方案（type、direction、intensity、colorTemperature、description）
- **colorScheme**：色调方案（dominantColor、accentColor、mood、description）
- **atmosphere**：氛围（mood、tension、visualStyle）
- **characterPositions**：角色站位列表

**理解设计意图**：
- 为什么选择这种光照？（如：侧光制造明暗对比，强化危机感）
- 色调如何支撑情绪？（如：冷暖对比营造末日氛围）
- 角色站位如何服务叙事？（如：主角居中突出主导地位）

**输出格式**：
```
场景策略摘要：

光照：午后阳光从右侧斜射，中等强度，暖色温
  → 设计意图：侧光形成明暗对比，强化危机感；暖色温与冷色环境对比

色调：冷色调为主（蓝灰色水面），暖橙色强调（阳光）
  → 设计意图：冷暖对比营造末日中的希望感，视觉冲击力强

氛围：压抑、紧张、末日危机感
  → 设计意图：为主角的坚定决心提供强烈对比

角色站位：
  - 林渊：前景中央，站立，面向镜头
    → 设计意图：居中突出主角，面向镜头增强代入感
  - 尸潮：中景到远景，水中涌动
    → 设计意图：距离感制造威胁，涌动感制造压迫
```

---

### C.2 汇总表演策略

**读取**：表演策略卡片（PerformanceStrategyCard）

**提取信息**：
- **performanceType**：表演性质（dialogue/action/mixed）
- **characterPerformances**：每个角色的表演设计
  - `actions.keyActions`：关键动作列表（timestamp、description、intensity、purpose）
  - `facialExpressions`：表情设计（dominantExpression、microExpressions）
  - `dialogue`：台词演绎（如有）

**理解设计意图**：
- 每个动作的目的是什么？
- 表情变化如何体现情绪曲线？
- 台词演绎如何支撑角色性格？

**输出格式**：
```
表演策略摘要：

表演性质：mixed（文武结合）

林渊：
  动作设计：
    [0s] 站在水边观察尸潮 (moderate)
      → 目的：建立警惕状态，展现冷静
    [8s] 表情从警惕转为坚定 (moderate)
      → 目的：展现内心决心，推动情绪曲线
    [12s] 缓慢转身 (subtle)
      → 目的：过渡动作，准备迎战
    [15s] 紧握武器 (strong)
      → 目的：宣告战斗意志，动作高潮
  
  表情设计：
    主导表情：凝重
    微表情变化：
      [2s] 眉头微皱（看到尸潮） → 展现警觉
      [8s] 眼神坚定（决心面对） → 展现决心
  
  台词演绎：
    [12s] "它们来了。" (低沉、坚定，强调"它们")
      → 目的：宣告危机，展现从容

尸潮（群体角色）：
  动作设计：
    [0s] 从水下涌来，在巨型丧尸指挥下前进
      → 目的：营造威胁感，建立危机
```

---

### C.3 汇总拍摄策略

**读取**：拍摄策略卡片（CinematographyStrategyCard）

**提取信息**：
- **shootingStyle**：拍摄风格（style、rationale）
- **equipment**：器材配置
- **shots**：所有镜头列表
  - `shotNumber`、`shotSize`、`cameraMovement`、`cameraAngle`
  - `duration`、`description`、`equipment`、`cameraParams`
- **transitions**：转场设计

**理解设计意图**：
- 为什么选择这种拍摄风格？
- 每个镜头如何服务叙事？
- 运镜和角度如何配合情绪？

**输出格式**：
```
拍摄策略摘要：

拍摄风格：纪实风格（Documentary）
  → 理由：增强真实感和紧迫感，让观众身临其境

器材配置：ARRI ALEXA 65 + Signature Prime镜头组

镜头列表（共11个镜头，总时长45.5秒）：

#1 (3.5s) LS → 缓慢推进 → 平视正面
  描述：远景推进，展现整体环境和尸潮规模
  器材：三脚架 + 线性滑轨
  参数：ISO 800, f/2.8, 1/50s, 5600K, 35mm
  → 设计意图：建立空间感，展现危机规模

#2 (2.5s) MS → 静止 → 平视正面
  描述：中景静止，聚焦林渊表情变化
  器材：三脚架
  参数：ISO 800, f/2.0, 1/50s, 5600K, 50mm
  → 设计意图：捕捉表情细节，展现内心转变

#3 (2.0s) CU → 微推 → 仰视正面
  描述：特写微推，捕捉林渊眼神中的决心
  器材：三脚架
  参数：ISO 800, f/1.8, 1/50s, 5600K, 85mm
  → 设计意图：仰视增强力量感，眼神特写展现决心

... (后续镜头)

转场设计：
  - 镜头1→2：Cut（快速切换增强紧张感）
  - 镜头2→3：Cut（保持节奏流畅）
  - 镜头8→9：Dissolve（情绪转换，从内心到行动）
```

---

### C.4 内容量复判

对比导演预判和三张策略卡片展开后的真实内容量：

```text
【内容量复判】
预判：medium，预计30-45秒，建议3组
复判：heavier / unchanged / lighter / needs_split
变化原因：
- 表演策略新增了X句关键台词，需要额外反应时间
- 场景策略确认角色需要从门口移动到桌边，增加空间移动
- 拍摄策略拆出X个镜头，其中第X镜头可合并/必须保留
处理方案：
- 保持原粗拆 / 合并某组 / 拆分某组 / 压缩次要反应
```

### C.5 连续性审计

在镜头组落版前，必须检查三张策略卡片是否彼此冲突：

- 180度轴线和视线匹配
- 人物左右位置、前中后景、出入口和运动方向
- 持物手、道具位置、道具状态变化
- 服装、妆发、伤痕、泪痕、灰尘、湿度等状态
- 光源方向、色温、明暗关系是否延续
- 情绪是否推进而不是重置
- 镜头组尾帧能否作为下一组首帧或视频续写参考

输出格式：

```text
【连续性审计】
轴线/视线：...
空间/站位：...
道具/持物手：...
服装/状态：...
光线/色调：...
情绪余韵：...
风险与处理：...
```

### C.6 输出复判结果

将三张策略卡片的汇总结果整合：

```
============================================
第二步：汇总三张策略卡片
============================================

【场景策略】
  光照：侧光，暖色温，明暗对比 → 强化危机感
  色调：冷暖对比 → 末日中的希望
  氛围：压抑、紧张 → 为角色坚定提供对比
  站位：主角居中，尸潮远景 → 突出主角，距离感制造威胁

【表演策略】
  林渊：警惕观察 → 内心转变 → 坚定决心 → 准备迎战
  关键动作：观察(0s) → 坚定(8s) → 转身(12s) → 握武器(15s)
  表情曲线：凝重 → 警觉 → 坚定
  关键台词："它们来了"(12s, 低沉坚定)

【拍摄策略】
  风格：纪实风格 → 增强真实感
  镜头：11个镜头，总时长45.5秒
  运镜特点：推进(建立) → 静止(表情) → 微推(决心) → ...
  转场：以Cut为主，关键情绪转换用Dissolve

【三者关系】
  - 场景的冷暖对比 + 表演的情绪转变 + 拍摄的推进节奏 → 共同营造"危机中的决心"
  - 侧光的明暗对比 + 表情的微妙变化 + 特写的仰视角度 → 共同强化"力量感"

============================================
```


---

## 阶段D：导演思维的镜头组落版

**目标**：基于这场戏的叙事重点，运用导演思维进行策略性的镜头组拆分，形成结构化的镜头表

**核心原则**：
1. **服务叙事重点**：每个镜头组的拆分必须服务于这场戏的核心重点
2. **剪辑合理性**：叙事流畅、节奏合理、转场自然
3. **时长合理性**：每组≤当前卡片快照的 `maxShotGroupDuration`；30秒只是上限，不是目标
4. **策略性决策**：在不确定时用引导式提问和用户确认

---

### D.1 导演思维的拆分策略

#### 策略1：基于叙事重点拆分

**核心思想**：每个镜头组应该是一个完整的叙事单元，围绕一个核心重点

**判断方法**：
1. 回顾第一步分析的核心重点
2. 识别哪些镜头在表现同一个重点
3. 将表现同一重点的镜头归为一组

**示例**：
```
核心重点1：展现主角的决心

对应镜头：
  - 镜头1-3：展现林渊看到尸潮后的警惕
  - 镜头4-6：展现林渊表情从警惕到坚定的转变
  - 镜头7-9：展现林渊下定决心的眼神

策略：
  → 镜头1-3归为第1组（建立危机）
  → 镜头4-6归为第2组（内心转变）
  → 镜头7-9归为第3组（决心确立）
```

---

#### 策略2：基于情绪曲线拆分

**核心思想**：在情绪转折点拆分，每个镜头组维持情绪一致性

**判断方法**：
1. 回顾第一步分析的情绪曲线
2. 识别情绪转折点（从A情绪转到B情绪）
3. 在转折点前后拆分

**示例**：
```
情绪曲线：平静警惕(3) → 紧张(7) → 坚定(8)

情绪转折点：
  - [0s-7s] 平静警惕 → 紧张
  - [7s-15s] 紧张 → 坚定

策略：
  → 在7s处拆分
  → 第1组(0-7s)：从平静到紧张的过程
  → 第2组(7-15s)：从紧张到坚定的过程
```

---

#### 策略3：基于关键转变点拆分

**核心思想**：在关键转变点（情节转折、关键台词、关键动作）前后拆分

**判断方法**：
1. 回顾第一步分析的关键转变点
2. 确认每个转变点的重要性（critical/important/supporting）
3. 优先在critical和important转变点拆分

**示例**：
```
关键转变点：
  #1 [0s] 林渊看到尸潮 (critical)
  #2 [8s] 林渊情绪转变 (important)
  #3 [12s] 林渊说"它们来了" (important)

策略：
  → 在8s和12s处拆分
  → 第1组(0-8s)：建立危机
  → 第2组(8-12s)：内心转变
  → 第3组(12-?)：宣告战斗
```

---

#### 策略4：基于拍摄节奏拆分

**核心思想**：考虑镜头切换、运镜速度、转场类型，在自然的拍摄节点拆分

**判断方法**：
1. 识别拍摄策略中的转场类型
2. 优先在非Cut转场处拆分（Fade、Dissolve、Wipe等）
3. 识别运镜的起止点（推进开始/结束、摇移开始/结束）
4. 在运镜自然结束处拆分

**示例**：
```
镜头列表：
  #1 (3.5s) LS推进 → Cut → #2 (2.5s) MS静止 → Cut → #3 (2.0s) CU微推
  → Dissolve →
  #4 (3.0s) MS摇移 → Cut → #5 (2.5s) CU静止

策略：
  → 在Dissolve处拆分（镜头3和镜头4之间）
  → 第1组：镜头1-3（推进+静止+微推的完整节奏）
  → 第2组：镜头4-5（摇移+静止的完整节奏）
```

---

### 3.2 拆分执行流程

#### 步骤1：初步拆分建议

基于上述4个策略，生成初步拆分方案：

```
【初步拆分方案】

依据：
  1. 核心重点："展现主角决心" → 分为建立、转变、确立三个阶段
  2. 情绪曲线：在7s和15s有情绪转折
  3. 关键转变点：8s（情绪转变）、12s（关键台词）是重要节点
  4. 拍摄节奏：镜头3和4之间有Dissolve转场

建议拆分为4组：

第1组 (0-8s, 共8秒)
  核心：建立危机，展现警惕
  镜头：#1-3
  情绪：平静警惕 → 紧张
  关键转变：林渊看到尸潮

第2组 (8-12s, 共4秒)
  核心：内心转变
  镜头：#4-5
  情绪：紧张 → 坚定
  关键转变：林渊情绪转变

第3组 (12-20s, 共8秒)
  核心：宣告决心
  镜头：#6-8
  情绪：坚定
  关键转变：林渊说"它们来了"

第4组 (20-30s, 共10秒)
  核心：准备战斗
  镜头：#9-11
  情绪：坚定 → 行动
  关键转变：林渊紧握武器
```

---

#### 步骤2：检查拆分合理性

**检查维度**：

1. **时长合理性**：每组是否≤当前 `maxShotGroupDuration`？
   - ✓ 第1组：8秒
   - ✓ 第2组：4秒
   - ✓ 第3组：8秒
   - ✓ 第4组：10秒

2. **叙事完整性**：每组是否是完整的叙事单元？
   - ✓ 第1组：完整展现"看到危机"的过程
   - ✓ 第2组：完整展现"内心转变"的过程
   - ✓ 第3组：完整展现"宣告决心"的过程
   - ✓ 第4组：完整展现"准备战斗"的过程

3. **情绪连贯性**：组内情绪是否一致，组间情绪是否有清晰转折？
   - ✓ 第1组内：平静→紧张（渐进）
   - ✓ 第1→2组：紧张→坚定（转折明确）
   - ✓ 第2组内：情绪转变（一致主题）
   - ✓ 第2→3组：坚定→宣告（承接自然）

4. **拍摄节奏**：拆分点是否在自然的拍摄节点？
   - ✓ 8s处：镜头3和4之间有Dissolve转场
   - ✓ 12s处：镜头5和6之间，台词开始前
   - ✓ 20s处：镜头8和9之间，运镜结束

**检查结果**：✓ 拆分方案合理

---

#### 步骤3：引导式提问（如有不确定）

**场景1：时长超限**

如果某个镜头组超过当前 `maxShotGroupDuration`，询问用户：

```
【时长超限提示】

第3组的时长超过当前镜头组时长上限。

建议拆分方案：

方案A（按台词拆分）：
  - 第3-1组 (12-18s, 6秒)：林渊说"它们来了"
  - 第3-2组 (18-30s, 12秒)：林渊紧握武器，准备战斗

方案B（按运镜拆分）：
  - 第3-1组 (12-20s, 8秒)：林渊说台词 + 转身动作
  - 第3-2组 (20-30s, 10秒)：林渊紧握武器，镜头推进

您倾向于哪个方案？或有其他建议？
```

---

**场景2：叙事单元不明确**

如果某个拆分点的叙事单元不清晰，询问用户：

```
【拆分点不确定】

镜头6-8涵盖了两个关键动作：
  - 林渊说"它们来了"（12s）
  - 林渊转身（15s）

这两个动作可以归为一组（"宣告决心"），也可以拆成两组：
  - 第2组：说台词（宣告）
  - 第3组：转身（准备）

建议：
  如果强调"台词的力量"，建议单独一组
  如果强调"从宣告到行动的连贯性"，建议合并一组

您的倾向是？
```

---

**场景3：情绪转折点模糊**

如果情绪曲线的转折点不明确，询问用户：

```
【情绪转折点确认】

根据表演策略，林渊的情绪从"紧张"到"坚定"的转变发生在8-12s之间。

具体转折点可能是：
  - 8s：林渊眉头微皱后，眼神开始坚定
  - 10s：林渊深吸一口气（肢体语言的转变）
  - 12s：林渊说出台词（语言的宣告）

建议：
  如果强调"内心转变的过程"，在8s拆分
  如果强调"台词的宣告意义"，在12s拆分

您认为情绪转折的关键点在哪里？
```

---

#### 步骤4：确认拆分方案

展示最终拆分方案，等待用户确认：

```
============================================
镜头组拆分方案
============================================

总时长：45秒
拆分为：4个镜头组

【第1组】(0-8s, 共8秒) - 建立危机
  核心：展现林渊看到尸潮后的警惕和紧张
  情绪：平静警惕(3) → 紧张(7)
  关键转变：林渊看到尸潮涌来
  镜头：#1-3（LS推进 → MS静止 → CU微推）

【第2组】(8-12s, 共4秒) - 内心转变
  核心：展现林渊从紧张到坚定的情绪转变
  情绪：紧张(7) → 坚定(8)
  关键转变：林渊表情转为坚定，眼神中透露决心
  镜头：#4-5（MS特写 → CU极特写）

【第3组】(12-20s, 共8秒) - 宣告决心
  核心：通过台词和动作宣告战斗决心
  情绪：坚定(8)
  关键转变：林渊说"它们来了"，缓慢转身
  镜头：#6-8（CU台词 → MS转身 → FS全景）

【第4组】(20-30s, 共10秒) - 准备战斗
  核心：展现林渊握武器，准备迎战
  情绪：坚定(8) → 战意昂扬(9)
  关键转变：林渊紧握武器
  镜头：#9-11（MS动作 → CU武器 → LS远景）

============================================

是否确认此拆分方案？(y/n)

如需调整，请说明：
  - 希望在哪里重新拆分？
  - 希望合并哪些组？
  - 对拆分理由有不同看法？
```

---

### 3.3 为每个镜头组生成结构化描述

**目标**：为每个确认的镜头组生成详细的镜头表，包含时长、表演内容、镜头运动、特殊细节

对于每个镜头组，生成以下内容：

#### 3.3.1 镜头组概述

**格式**：
```typescript
{
  groupNumber: number;              // 组编号
  groupId: string;                  // 组ID（第X集-第X场-第X组）
  duration: number;                 // 时长（秒）
  coreTheme: string;                // 核心主题（一句话）
  emotionRange: string;             // 情绪范围
  keyMoment: string;                // 关键时刻
  splitReason: string;              // 拆分理由
  tailFrameAnchor: {
    composition: string;            // 尾帧构图
    characterState: string;         // 角色位置、身体、表情状态
    propState?: string;             // 道具状态
    emotionResidue: string;         // 情绪余韵
    continuationUse: string;        // 下一组或视频续写如何沿用
  };
}
```

**示例**：
```json
{
  "groupNumber": 1,
  "groupId": "第1集-第3场-第1组",
  "duration": 8.0,
  "coreTheme": "建立危机，展现林渊的警惕和紧张",
  "emotionRange": "平静警惕(3) → 紧张(7)",
  "keyMoment": "林渊看到尸潮涌来",
  "splitReason": "本组完成危机建立，下一组进入主角内心转变",
  "tailFrameAnchor": {
    "composition": "CU特写林渊眼神，背景虚化为翻涌水面",
    "characterState": "林渊眉头微皱，眼神锁定远处尸潮，身体微紧",
    "propState": "武器仍在身侧，尚未举起",
    "emotionResidue": "警惕刚转为紧张，决心尚未形成",
    "continuationUse": "下一组从同一眼神特写继续，推进到坚定决心"
  }
}
```

---

#### 3.3.2 镜头组整体描述

**格式**：200-300字的段落，融合场景、表演、拍摄三个维度

**包含元素**：
- 场景环境和氛围
- 角色动作和表情
- 镜头运动和视觉重点
- 情绪基调

**示例**：
```
林渊站在被洪水淹没的陆地边缘,目光凝重地望向远方。水面翻涌,无数丧尸的身影在
水中涌动,在一只巨型丧尸的指挥下朝他逼近。午后的阳光从右侧斜射进来,在波动的
水面上形成粼粼波光,但整体氛围却压抑而紧张。林渊的表情从最初的警惕逐渐转为
紧张,眉头微微皱起,身体微微紧绷。镜头从远景缓慢推进到中景,再推至特写,层层
递进地展现他从观察环境到意识到危机的过程。整个画面以冷色调为主,蓝灰色的洪水
与暖橙色的阳光形成对比,营造出末日危机下孤独而坚毅的氛围。推进的镜头运动配合
表情的微妙变化,将观众的注意力从宏大的环境逐步聚焦到主角的内心世界。
```

---

#### 3.3.3 场景策略摘要

从场景策略卡片提取本镜头组相关的信息：

**格式**：
```typescript
{
  lighting: string;           // 光照摘要
  colorScheme: string;        // 色调摘要
  atmosphere: string;         // 氛围摘要
  characterPositions: string; // 角色站位摘要
}
```

**示例**：
```json
{
  "lighting": "午后阳光从右侧斜射,中等强度,暖色温,在水面形成粼粼波光",
  "colorScheme": "冷色调为主(蓝灰色洪水),暖橙色强调(阳光),营造末日氛围",
  "atmosphere": "压抑、紧张、危机感强烈",
  "characterPositions": "林渊:前景中央,站立,面向镜头;尸潮:中景到远景,水中涌动"
}
```

---

#### 3.3.4 表演策略摘要

从表演策略卡片提取本镜头组时间范围内的表演设计：

**格式**：
```typescript
{
  characterActions: Array<{
    characterName: string;
    actions: string;          // 动作序列（用箭头连接）
    expressions: string;      // 表情变化（用箭头连接）
    dialogue?: string;        // 台词（如有）
    performanceFocus: string; // 表演重点
  }>;
}
```

**示例**：
```json
{
  "characterActions": [
    {
      "characterName": "林渊",
      "actions": "站在水边观察尸潮 → 身体微微紧绷 → 眉头微皱",
      "expressions": "凝重 → 警惕(眉头微皱) → 紧张(眼神聚焦)",
      "dialogue": null,
      "performanceFocus": "通过微表情和肢体语言展现从警惕到紧张的渐进过程"
    }
  ]
}
```

---

#### 3.3.5 拍摄策略摘要（镜头表）

从拍摄策略卡片提取本镜头组的所有镜头，形成镜头表：

**格式**：
```typescript
{
  shootingStyle: string;      // 拍摄风格
  shots: Array<{
    shotNumber: number;       // 镜头编号
    duration: number;         // 时长
    shotSize: string;         // 景别
    cameraMovement: string;   // 运镜（易读格式）
    cameraAngle: string;      // 角度（易读格式）
    equipment: string;        // 器材（易读格式）
    cameraParams: string;     // 参数（易读格式）
    visualFocus: string;      // 视觉焦点
    purpose: string;          // 镜头目的
  }>;
  transitionsInGroup: string; // 组内转场说明
}
```

**示例**：
```json
{
  "shootingStyle": "纪实风格(Documentary) - 增强真实感和紧迫感",
  "shots": [
    {
      "shotNumber": 1,
      "duration": 3.5,
      "shotSize": "LS (远景)",
      "cameraMovement": "极慢速推进(从LS推至MS)",
      "cameraAngle": "平视正面",
      "equipment": "三脚架 + 线性滑轨",
      "cameraParams": "ISO 800 | f/2.8 | 1/50s | 5600K | 35mm",
      "visualFocus": "整体环境:洪水、尸潮、林渊的孤独身影",
      "purpose": "建立空间感,展现危机规模,为后续特写做铺垫"
    },
    {
      "shotNumber": 2,
      "duration": 2.5,
      "shotSize": "MS (中景)",
      "cameraMovement": "静止",
      "cameraAngle": "平视正面",
      "equipment": "三脚架",
      "cameraParams": "ISO 800 | f/2.0 | 1/50s | 5600K | 50mm",
      "visualFocus": "林渊上半身,特别是面部表情",
      "purpose": "捕捉表情变化,从警惕到紧张的微妙转变"
    },
    {
      "shotNumber": 3,
      "duration": 2.0,
      "shotSize": "CU (特写)",
      "cameraMovement": "极慢速微推",
      "cameraAngle": "轻微仰视正面(15度)",
      "equipment": "三脚架",
      "cameraParams": "ISO 800 | f/1.8 | 1/50s | 5600K | 85mm",
      "visualFocus": "林渊的眼神,眉头",
      "purpose": "极致特写捕捉眼神中的警觉,仰视增强即将爆发的力量感"
    }
  ],
  "transitionsInGroup": "镜头1→2用Cut(快速切换保持紧张感), 镜头2→3用Cut(流畅过渡到特写)"
}
```

---

#### 3.3.6 特殊细节和注意事项

列出本镜头组需要特别注意的制作细节：

**格式**：
```typescript
{
  performanceDetails: string[];      // 表演细节
  cinematographyDetails: string[];   // 拍摄细节
  postProductionNotes: string[];     // 后期注意事项
}
```

**示例**：
```json
{
  "performanceDetails": [
    "林渊的眉头微皱要非常微妙,不能过于夸张",
    "眼神的聚焦过程要有层次:先扫视→再聚焦→最后锁定",
    "身体的紧绷要克制,只通过肩膀和颈部的微小变化表现"
  ],
  "cinematographyDetails": [
    "推进速度要极慢(0.5m/s),给观众充分时间观察环境",
    "特写镜头的焦点要精确落在眼睛上,背景适度虚化",
    "仰视角度控制在15度以内,避免过度戏剧化"
  ],
  "postProductionNotes": [
    "调色时加强冷暖对比,洪水偏蓝灰,阳光偏暖橙",
    "音效:远处的尸吼声要有空间感,水流声要压抑沉闷",
    "镜头1的推进可适当加入轻微的镜头晃动,增强纪实感"
  ]
}
```


---

### 3.4 生成完整的镜头组卡片数据

汇总上述所有信息，生成 `StoryboardPlanCard` 的 `shotGroups` 数组：

**硬性要求**：
- `StoryboardPlanCard` 顶层必须包含 `shotGroups` 数组，且数组内每个镜头组都必须包含本节字段。
- `StoryboardPlanCard` 顶层必须包含 `videoGenerationProfileSnapshot`。
- `DirectorBriefingCard.finalBriefing` 或 `directorFinalBriefing.shotGroupFinalization` 只能作为导演复判记录，不能替代 `StoryboardPlanCard.shotGroups`。
- 如果只生成了 `shotGroupFinalization`、`groupName`、`timeRange`、`tailFrame` 这类复判摘要，不能进入 `storyboard-creator`。
- 每个 `shotGroups[]` 必须包含 `maxDurationApplied`，取值为15或30。
- 每个 `shotGroups[]` 的 `duration` 必须是数字秒数，且不得超过自身 `maxDurationApplied`。
- 每个 `shotGroups[]` 必须融合三张策略卡片：`sceneStrategy`、`performanceStrategy`、`cinematographyStrategy`、`shotBreakdown` 都不能为空。

**完整示例**：

```json
{
  "groupNumber": 1,
  "groupId": "第1集-第3场-第1组",
  "duration": 8.0,
  "maxDurationApplied": 30,
  "coreTheme": "建立危机,展现林渊的警惕和紧张",
  "emotionRange": "平静警惕(3) → 紧张(7)",
  "keyMoment": "林渊看到尸潮涌来",
  "splitReason": "本组完成危机建立，下一组进入主角内心转变",
  "tailFrameAnchor": {
    "composition": "CU特写林渊眼神，背景虚化为翻涌水面",
    "characterState": "林渊眉头微皱，眼神锁定远处尸潮，身体微紧",
    "propState": "武器仍在身侧，尚未举起",
    "emotionResidue": "警惕刚转为紧张，决心尚未形成",
    "continuationUse": "下一组从同一眼神特写继续，推进到坚定决心"
  },
  
  "description": "林渊站在被洪水淹没的陆地边缘,目光凝重地望向远方。水面翻涌,无数丧尸的身影在水中涌动,在一只巨型丧尸的指挥下朝他逼近。午后的阳光从右侧斜射进来,在波动的水面上形成粼粼波光,但整体氛围却压抑而紧张。林渊的表情从最初的警惕逐渐转为紧张,眉头微微皱起,身体微微紧绷。镜头从远景缓慢推进到中景,再推至特写,层层递进地展现他从观察环境到意识到危机的过程。整个画面以冷色调为主,蓝灰色的洪水与暖橙色的阳光形成对比,营造出末日危机下孤独而坚毅的氛围。",
  
  "keyActions": [
    "林渊看到尸潮涌来",
    "林渊表情从警惕转为紧张",
    "林渊眉头微皱,身体紧绷"
  ],
  
  "keyDialogue": null,
  
  "sceneStrategy": {
    "lighting": "午后阳光从右侧斜射,中等强度,暖色温,在水面形成粼粼波光",
    "colorScheme": "冷色调为主(蓝灰色洪水),暖橙色强调(阳光),营造末日氛围",
    "atmosphere": "压抑、紧张、危机感强烈",
    "characterPositions": "林渊:前景中央,站立,面向镜头;尸潮:中景到远景,水中涌动"
  },
  
  "performanceStrategy": {
    "characterActions": [
      {
        "characterName": "林渊",
        "actions": "站在水边观察尸潮 → 身体微微紧绷 → 眉头微皱",
        "expressions": "凝重 → 警惕(眉头微皱) → 紧张(眼神聚焦)",
        "dialogue": "无",
        "performanceFocus": "通过微表情和肢体语言展现从警惕到紧张的渐进过程"
      }
    ]
  },
  
  "cinematographyStrategy": {
    "shootingStyle": "纪实风格(Documentary) - 增强真实感和紧迫感",
    "shots": [
      {
        "shotNumber": 1,
        "duration": 3.5,
        "shotSize": "LS (远景)",
        "cameraMovement": "极慢速推进(从LS推至MS)",
        "cameraAngle": "平视正面",
        "equipment": "三脚架 + 线性滑轨",
        "cameraParams": "ISO 800 | f/2.8 | 1/50s | 5600K | 35mm",
        "visualFocus": "整体环境:洪水、尸潮、林渊的孤独身影",
        "purpose": "建立空间感,展现危机规模,为后续特写做铺垫"
      },
      {
        "shotNumber": 2,
        "duration": 2.5,
        "shotSize": "MS (中景)",
        "cameraMovement": "静止",
        "cameraAngle": "平视正面",
        "equipment": "三脚架",
        "cameraParams": "ISO 800 | f/2.0 | 1/50s | 5600K | 50mm",
        "visualFocus": "林渊上半身,特别是面部表情",
        "purpose": "捕捉表情变化,从警惕到紧张的微妙转变"
      },
      {
        "shotNumber": 3,
        "duration": 2.0,
        "shotSize": "CU (特写)",
        "cameraMovement": "极慢速微推",
        "cameraAngle": "轻微仰视正面(15度)",
        "equipment": "三脚架",
        "cameraParams": "ISO 800 | f/1.8 | 1/50s | 5600K | 85mm",
        "visualFocus": "林渊的眼神,眉头",
        "purpose": "极致特写捕捉眼神中的警觉,仰视增强即将爆发的力量感"
      }
    ],
    "transitionsInGroup": "镜头1→2用Cut(快速切换保持紧张感), 镜头2→3用Cut(流畅过渡到特写)"
  },
  
  "shotBreakdown": [
    {
      "shotNumber": 1,
      "shotDescription": "LS远景推进,建立洪水环境和尸潮规模,展现林渊孤独站立,冷暖色调对比强烈",
      "estimatedDuration": 3.5,
      "performanceDetail": "林渊凝重观察,身体挺直",
      "cinematographyDetail": "极慢速推进(0.5m/s),三脚架+线性滑轨,35mm广角",
      "specialNotes": "推进要平滑,给观众充分时间建立空间感"
    },
    {
      "shotNumber": 2,
      "shotDescription": "MS中景静止,聚焦林渊上半身,捕捉表情从警惕到紧张的微妙变化",
      "estimatedDuration": 2.5,
      "performanceDetail": "眉头微皱,眼神从扫视到聚焦,身体微紧",
      "cinematographyDetail": "静止拍摄,三脚架,50mm标准镜头,焦点在面部",
      "specialNotes": "表情变化要微妙,不能过于夸张"
    },
    {
      "shotNumber": 3,
      "shotDescription": "CU特写微推,极致特写林渊眼神,轻微仰视增强力量感,背景虚化",
      "estimatedDuration": 2.0,
      "performanceDetail": "眼神锁定目标,眉头微皱,展现警觉和即将爆发的决心",
      "cinematographyDetail": "极慢速微推,轻微仰视15度,85mm长焦,f/1.8浅景深",
      "specialNotes": "焦点精确落在眼睛,背景适度虚化突出眼神"
    }
  ],
  
  "specialDetails": {
    "performanceDetails": [
      "林渊的眉头微皱要非常微妙,不能过于夸张",
      "眼神的聚焦过程要有层次:先扫视→再聚焦→最后锁定",
      "身体的紧绷要克制,只通过肩膀和颈部的微小变化表现"
    ],
    "cinematographyDetails": [
      "推进速度要极慢(0.5m/s),给观众充分时间观察环境",
      "特写镜头的焦点要精确落在眼睛上,背景适度虚化",
      "仰视角度控制在15度以内,避免过度戏剧化"
    ],
    "postProductionNotes": [
      "调色时加强冷暖对比,洪水偏蓝灰,阳光偏暖橙",
      "音效:远处的尸吼声要有空间感,水流声要压抑沉闷",
      "镜头1的推进可适当加入轻微的镜头晃动,增强纪实感"
    ]
  }
}
```

---

## 输出：分镜制作计划卡片

### 输出前校验

创建 `StoryboardPlanCard` 前必须逐项检查：

```text
顶层字段:
  - directorBriefingCardId
  - sceneStrategyCardId
  - performanceStrategyCardId
  - cinematographyStrategyCardId
  - strategySourceCardIds
  - videoGenerationProfileSnapshot
  - finalBriefingSnapshot
  - summary
  - shotGroups
  - upstreamCards

每个 shotGroups[]:
  - groupNumber
  - groupId
  - maxDurationApplied
  - duration <= maxDurationApplied
  - coreTheme
  - emotionRange
  - keyMoment
  - splitReason
  - description
  - tailFrameAnchor
  - sceneStrategy
  - performanceStrategy
  - cinematographyStrategy
  - shotBreakdown
```

如果任一字段缺失，当前阶段不能标记为完成，应继续补齐 `StoryboardPlanCard`。不要把 `directorFinalBriefing.shotGroupFinalization` 当作故事板计划输出。

### 完整卡片结构

```typescript
interface StoryboardPlanCard extends BaseCard {
  cardType: "StoryboardPlanCard";
  sceneId: string;
  directorBriefingCardId: string;
  sceneStrategyCardId: string;
  performanceStrategyCardId: string;
  cinematographyStrategyCardId: string;
  strategySourceCardIds: {
    sceneStrategyCardId: string;
    performanceStrategyCardId: string;
    cinematographyStrategyCardId: string;
  };
  videoGenerationProfileSnapshot: VideoGenerationProfile;
  finalBriefingSnapshot: {
    finalStructure: string;
    contentLoadRecheck: string;
    continuityAuditSummary: string;
  };
  
  // 第一步的输出
  summary: {
    sceneObjective: string;           // 叙事目的
    keyMoments: Array<{
      momentNumber: number;
      timestamp: number;
      description: string;
      importance: "critical" | "important" | "supporting";
    }>;
    overallTone: string;              // 整体基调
    emotionCurve: string;             // 情绪曲线
    coreThemes: string[];             // 核心重点
    totalDuration: number;
  };
  
  // 第三步的输出
  shotGroups: Array<{
    groupNumber: number;
    groupId: string;
    duration: number;
    maxDurationApplied: 15 | 30;
    
    // 3.3.1 概述
    coreTheme: string;
    emotionRange: string;
    keyMoment: string;
    splitReason: string;
    tailFrameAnchor: {
      composition: string;
      characterState: string;
      propState?: string;
      emotionResidue: string;
      continuationUse: string;
    };
    
    // 3.3.2 整体描述
    description: string;
    
    // 3.3.3-3.3.6 详细信息
    keyActions: string[];
    keyDialogue?: string;
    sceneStrategy: {...};
    performanceStrategy: {...};
    cinematographyStrategy: {...};
    shotBreakdown: Array<{
      shotNumber: number;
      shotDescription: string;
      estimatedDuration: number;
      performanceDetail: string;
      cinematographyDetail: string;
      specialNotes?: string;
    }>;
    specialDetails: {
      performanceDetails: string[];
      cinematographyDetails: string[];
      postProductionNotes: string[];
    };
  }>;
  
  userConfirmed: boolean;
  upstreamCards: string[];  // 审计列表；不得替代上方三个显式策略卡ID
}
```

---

### 完整输出示例

```json
{
  "cardId": "card_storyboard_plan_ep01_sc03",
  "cardType": "StoryboardPlanCard",
  "sceneId": "第1集-第3场",
  "directorBriefingCardId": "card_director_briefing_ep01_sc03",
  "sceneStrategyCardId": "card_scene_strategy_ep01_sc03",
  "performanceStrategyCardId": "card_performance_strategy_ep01_sc03",
  "cinematographyStrategyCardId": "card_cinematography_strategy_ep01_sc03",
  "strategySourceCardIds": {
    "sceneStrategyCardId": "card_scene_strategy_ep01_sc03",
    "performanceStrategyCardId": "card_performance_strategy_ep01_sc03",
    "cinematographyStrategyCardId": "card_cinematography_strategy_ep01_sc03"
  },
  "videoGenerationProfileSnapshot": {
    "preferredModel": "seedance-2.5",
    "supports30SecondShotGroup": true,
    "maxShotGroupDuration": 30,
    "userConfirmed": true,
    "confirmedAt": "2026-06-25T10:00:00+08:00"
  },
  
  "summary": {
    "sceneObjective": "展现主角林渊面对末日危机时的冷静和决心,为后续战斗做铺垫",
    "keyMoments": [
      {
        "momentNumber": 1,
        "timestamp": 0,
        "description": "林渊看到尸潮涌来",
        "importance": "critical"
      },
      {
        "momentNumber": 2,
        "timestamp": 8,
        "description": "林渊从紧张转为坚定",
        "importance": "important"
      },
      {
        "momentNumber": 3,
        "timestamp": 12,
        "description": "林渊说'它们来了'",
        "importance": "important"
      }
    ],
    "overallTone": "紧张而压抑,展现末日危机下的决心",
    "emotionCurve": "平静警惕(3) → 紧张(7) → 坚定(8)",
    "coreThemes": [
      "展现主角的决心:通过表情变化展现内心转变",
      "营造危机感:通过环境和光影营造压迫感",
      "为战斗做铺垫:通过镜头推进预示激战"
    ],
    "totalDuration": 45.5
  },
  
  "shotGroups": [
    {
      "groupNumber": 1,
      "groupId": "第1集-第3场-第1组",
      "duration": 8.0,
      "maxDurationApplied": 30,
      "coreTheme": "建立危机,展现林渊的警惕和紧张",
      "emotionRange": "平静警惕(3) → 紧张(7)",
      "keyMoment": "林渊看到尸潮涌来",
      "description": "...",
      "keyActions": ["..."],
      "sceneStrategy": {...},
      "performanceStrategy": {...},
      "cinematographyStrategy": {...},
      "shotBreakdown": [...],
      "specialDetails": {...}
    },
    {
      "groupNumber": 2,
      "groupId": "第1集-第3场-第2组",
      "duration": 4.0,
      "maxDurationApplied": 30,
      "coreTheme": "内心转变,从紧张到坚定",
      "emotionRange": "紧张(7) → 坚定(8)",
      "keyMoment": "林渊表情转为坚定,眼神透露决心",
      "description": "...",
      "keyActions": ["..."],
      "sceneStrategy": {...},
      "performanceStrategy": {...},
      "cinematographyStrategy": {...},
      "shotBreakdown": [...],
      "specialDetails": {...}
    }
  ],
  
  "userConfirmed": true,
  "upstreamCards": [
    "card_episode_scene_detail_ep01_sc03",
    "card_scene_strategy_ep01_sc03",
    "card_performance_strategy_ep01_sc03",
    "card_cinematography_strategy_ep01_sc03"
  ],
  "status": "completed",
  "createdBy": "agent",
  "createdAt": "2026-06-09T10:00:00Z",
  "updatedAt": "2026-06-09T10:30:00Z"
}
```

---

## 使用示例

### 示例1：标准流程

```
用户: 为第1集第3场生成分镜制作计划

Agent:
============================================
第一步：全局理解这场戏
============================================

正在读取分集分场剧情卡片...
✓ 已读取: card_episode_scene_detail_ep01_sc03

分析结果：

场次：第1集-第3场
预计时长：45秒
节奏：medium
情绪基调：紧张、压抑

叙事目的：
  展现主角林渊面对末日危机时的冷静和决心,为后续战斗做铺垫

情绪曲线：
  平静警惕(3) → 看到尸潮后紧张(7) → 下定决心后坚定(8)

关键转变点：
  #1 [0s] [情节触发] 林渊看到尸潮涌来 (critical)
  #2 [8s] [情绪转变] 林渊从警惕转为坚定 (important)
  #3 [12s] [关键台词] 林渊说"它们来了" (important)

核心重点：
  1. 展现主角的决心：通过表情变化展现内心转变
  2. 营造危机感：通过环境和光影营造压迫感
  3. 为战斗做铺垫：通过镜头推进预示激战

============================================

按Enter继续下一步...

用户: [Enter]

Agent:
============================================
第二步：汇总三张策略卡片
============================================

正在读取三张策略卡片...
✓ 场景策略卡片: card_scene_strategy_ep01_sc03
✓ 表演策略卡片: card_performance_strategy_ep01_sc03
✓ 拍摄策略卡片: card_cinematography_strategy_ep01_sc03

【场景策略】
  光照：侧光,暖色温,明暗对比 → 强化危机感
  色调：冷暖对比 → 末日中的希望
  氛围：压抑、紧张 → 为角色坚定提供对比
  站位：主角居中,尸潮远景 → 突出主角,距离感制造威胁

【表演策略】
  林渊：警惕观察 → 内心转变 → 坚定决心 → 准备迎战
  关键动作：观察(0s) → 坚定(8s) → 转身(12s) → 握武器(15s)
  表情曲线：凝重 → 警觉 → 坚定
  关键台词："它们来了"(12s, 低沉坚定)

【拍摄策略】
  风格：纪实风格 → 增强真实感
  镜头：11个镜头,总时长45.5秒
  运镜特点：推进(建立) → 静止(表情) → 微推(决心)
  转场：以Cut为主,关键情绪转换用Dissolve

【三者关系】
  场景的冷暖对比 + 表演的情绪转变 + 拍摄的推进节奏
  → 共同营造"危机中的决心"

============================================

按Enter继续拆分镜头组...

用户: [Enter]

Agent:
============================================
第三步：导演思维的镜头组拆分
============================================

基于叙事重点和三张策略卡片,建议拆分为4个镜头组：

【初步拆分方案】

第1组 (0-8s, 共8秒) - 建立危机
  核心：展现林渊看到尸潮后的警惕和紧张
  情绪：平静警惕(3) → 紧张(7)
  镜头：#1-3 (LS推进 → MS静止 → CU微推)
  拆分理由：在8s处有Dissolve转场,且林渊情绪开始转变

第2组 (8-12s, 共4秒) - 内心转变
  核心：展现林渊从紧张到坚定的情绪转变
  情绪：紧张(7) → 坚定(8)
  镜头：#4-5 (MS特写 → CU极特写)
  拆分理由：情绪转折点,且12s有关键台词

第3组 (12-20s, 共8秒) - 宣告决心
  核心：通过台词和动作宣告战斗决心
  情绪：坚定(8)
  镜头：#6-8 (CU台词 → MS转身 → FS全景)
  拆分理由：台词是关键转变点,且动作有完整性

第4组 (20-30s, 共10秒) - 准备战斗
  核心：展现林渊握武器,准备迎战
  情绪：坚定(8) → 战意昂扬(9)
  镜头：#9-11 (MS动作 → CU武器 → LS远景)
  拆分理由：完整展现准备动作,为战斗做铺垫

============================================

是否确认此拆分方案？(y/n)
如需调整,请说明调整意见。

用户: y

Agent:
正在为每个镜头组生成详细描述...

✓ 第1组描述已生成
✓ 第2组描述已生成
✓ 第3组描述已生成
✓ 第4组描述已生成

分镜制作计划卡片已创建！

卡片ID: card_storyboard_plan_ep01_sc03
状态: completed
镜头组数量: 4
总时长: 45.5秒

下一步建议：
  - 使用 storyboard-creator skill 为每个镜头组创建故事板
  - 或使用 video-creator skill 直接为每个镜头组生成视频
```

---

### 示例2：需要调整拆分的流程

```
用户: 我觉得第2组太短了,只有4秒。能不能把第2组和第3组合并？

Agent:
收到调整建议,正在重新拆分...

【调整后的拆分方案】

第1组 (0-8s, 共8秒) - 建立危机
  [保持不变]

第2组 (8-20s, 共12秒) - 内心转变到宣告决心
  核心：展现林渊从紧张到坚定,并通过台词宣告决心
  情绪：紧张(7) → 坚定(8)
  镜头：#4-8 (MS特写 → CU极特写 → CU台词 → MS转身 → FS全景)
  关键时刻：
    - 8s: 表情转为坚定
    - 12s: 说出"它们来了"
    - 15s: 缓慢转身
  拆分理由：合并后形成完整的"情绪转变+宣告"单元,时长12秒合理

第3组 (20-30s, 共10秒) - 准备战斗
  [保持不变,编号改为第3组]

============================================

调整后共3个镜头组,是否确认？(y/n)

用户: y

Agent:
✓ 调整后的方案已确认
✓ 正在生成详细描述...
✓ 分镜制作计划卡片已创建
```

---

## 总结

导演讲戏skill的核心价值：

1. **全局理解**：从分集分场剧情卡片深入理解这场戏的叙事目的、情绪曲线、关键重点
2. **信息汇总**：理解三张策略卡片的设计意图,而非简单列举
3. **导演思维**：基于叙事重点进行策略性拆分,考虑剪辑合理性和时长限制
4. **结构化描述**：生成详细的镜头表,包含表演、拍摄、特殊细节等制作所需的所有信息
5. **灵活交互**：支持用户调整拆分方案,通过引导式提问确认不确定的决策

生成的分镜制作计划卡片是后续故事板和视频生成的基础,每个镜头组都包含完整的制作信息。

## 完成后下一步

完成判定分两种：

- 第一次进入：`DirectorBriefingCard.precheck` 已创建，内容量初判、结构选择初判和 `videoGenerationProfileSnapshot` 已确认。
- 第二次进入：三张策略卡片已齐，`finalBriefing` 已更新，并已创建 `StoryboardPlanCard`。

第一次预判完成后，推荐并行或按需调用：

```text
scene-strategy-designer
performance-strategy-designer
cinematography-strategy-designer
```

第二次复判落版完成后，推荐调用 `storyboard-creator`。

推荐话术：`导演预判已完成。建议下一步完成现场、表演、拍摄三张策略卡片；三张都完成后再回到 director-briefing 复判落版。`
