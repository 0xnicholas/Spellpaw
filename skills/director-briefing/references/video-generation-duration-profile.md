# 视频生成时长配置

## 核心原则

单镜头组最大时长是全剧级、用户确认的生产配置，不是固定常量。

```typescript
interface VideoGenerationProfile {
  preferredModel: "seedance-2.5" | string;
  supports30SecondShotGroup: boolean;
  maxShotGroupDuration: 15 | 30;
  userConfirmed: boolean;
  confirmedAt: string;
}
```

## 首次确认

`director-briefing` 第一次进入一部剧的制作流程时，读取：

```text
FullScriptCard.metadata.videoGenerationProfile
```

字段缺失或 `userConfirmed !== true` 时，必须询问用户是否采用支持最长 30 秒单次生成的生产配置。

- 用户接受：`supports30SecondShotGroup = true`，`maxShotGroupDuration = 30`。
- 用户明确拒绝：`supports30SecondShotGroup = false`，`maxShotGroupDuration = 15`。
- 未确认前不能完成 `DirectorBriefingCard.precheck`。
- 字段已确认后，同一部剧不重复询问。

该配置是生产规划偏好。实际生成时，`video-creator` 仍查询当前 API 能力。

## 快照

创建卡片时保存：

```text
DirectorBriefingCard.videoGenerationProfileSnapshot
StoryboardPlanCard.videoGenerationProfileSnapshot
StoryboardPlanCard.shotGroups[].maxDurationApplied
```

```text
shotGroup.maxDurationApplied =
  StoryboardPlanCard.videoGenerationProfileSnapshot.maxShotGroupDuration
```

## 统一解析顺序

下游解析最大时长时按以下顺序：

```text
shotGroup.maxDurationApplied
  ?? StoryboardPlanCard.videoGenerationProfileSnapshot.maxShotGroupDuration
  ?? DirectorBriefingCard.videoGenerationProfileSnapshot.maxShotGroupDuration
  ?? FullScriptCard.metadata.videoGenerationProfile.maxShotGroupDuration
  ?? 15
```

最后的 15 仅用于旧卡兼容。

## 校验

```text
duration > 0
duration <= resolvedMaxDuration
maxDurationApplied ∈ {15, 30}
```

30 秒只是上限，不是目标：

- 不强制合并可独立成组的叙事任务。
- 不为接近 30 秒而拉长动作、台词或余韵。
- 仍优先在自然转场、动作阶段、情绪转折和空间变化处拆分。

## 配置变更

用户修改全剧配置后：

- 只影响尚未完成导演复判落版的场次。
- 已确认卡片继续使用保存的快照。
- 不自动改变旧镜头组的 `duration` 或 `maxDurationApplied`。
- 需要新上限时，用户必须主动重新进入导演复判并生成新计划版本。

## API 能力不匹配

如果镜头组按 30 秒上限落版，但实际目标 API 不支持该时长：

- `video-creator` 执行 `durationAdaptation`。
- 保持 BEAT 顺序、事件和首尾状态。
- 不反向修改 `StoryboardPlanCard`。

