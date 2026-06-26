# 视频生成质量检查

## A. 上游与卡片归属

- [ ] 一个 `VideoCard` 只对应一个 `shotGroupId`。
- [ ] `StoryboardCard.workflowStatus === "confirmed"`。
- [ ] `StoryboardCard.storyboardSheet.stale === false`。
- [ ] 故事板图、关键分镜图、BEATS、首帧和尾帧完整。
- [ ] 场景站位标注图已确认。
- [ ] 画面中的角色、场景和道具都有资产图片。

## B. 参考图权限

- [ ] 故事板图只控制镜头、构图、动作、运镜、站位、方向和空间。
- [ ] 关键分镜图锁定对应 BEAT 的成片效果。
- [ ] 角色、场景和道具资产分别是其设计的唯一权威。
- [ ] 场景站位标注图只控制站位、视线、轴线和路线。
- [ ] 提示词明确禁止渲染参考图边框、标签、箭头、文字和拼贴。

## C. 参数确认闸门

- [ ] 已查询当前 API 的模型、时长、画质、分辨率、画幅和原生音频能力。
- [ ] 用户已确认模型和画质。
- [ ] 画幅来自全局 `metadata.aspectRatio`，没有重新选择。
- [ ] `requestedDuration` 等于 `shotGroupSnapshot.duration`。
- [ ] `requestedDuration <= shotGroupSnapshot.maxDurationApplied`；旧卡缺失时按15秒兼容。
- [ ] API 支持精确时长时，`generatedDuration === requestedDuration`。
- [ ] API 不支持精确时长时，用户已确认替代时长。
- [ ] `durationAdaptation.beatTimingMap` 覆盖每个 BEAT，顺序不变。
- [ ] `generationConfig.userConfirmed === true`。

## D. 提示词确认闸门

- [ ] `generationPrompt` 为中文且用户可编辑。
- [ ] 每个 BEAT 包含时间、剪辑、起始状态、内容运动、运镜、站位/方向、结果和关键图绑定。
- [ ] 没有添加上游未定义的事件。
- [ ] 首帧和尾帧与 `videoHandoff` 一致。
- [ ] 用户已确认提示词后才生成 `fullPrompt`。

## E. 音频

- [ ] `audioGuidance` 始终保存在卡片中。
- [ ] `supportsNativeAudio === true` 时，音频进入 `fullPrompt` 和模型参数。
- [ ] `supportsNativeAudio === false` 时，音频不混入视觉 `fullPrompt`。

## F. 版本与失效

- [ ] 重新生成只向 `videoVersions[]` 追加版本。
- [ ] `selectedVersion` 指向存在的视频版本。
- [ ] 只有选中版本可标记为最终确认。
- [ ] 故事板图、关键图、BEATS、首尾状态、站位图或资产版本变化时，`stale = true`。
- [ ] `stale === true` 时，`workflowStatus !== "confirmed"` 且 `userConfirmed === false`。
