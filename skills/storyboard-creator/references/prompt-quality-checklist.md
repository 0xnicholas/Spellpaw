# 故事板生图质量检查

## A. 输入与引用

- [ ] 当前镜头组来自 `StoryboardPlanCard.shotGroups[]`。
- [ ] `duration <= maxDurationApplied`；旧卡缺少该字段时按15秒兼容。
- [ ] `sceneStrategy`、`performanceStrategy`、`cinematographyStrategy`、`shotBreakdown`、`tailFrameAnchor` 完整。
- [ ] 场景站位标注图来自 `positionAnnotationImage.imageUrl` 且已确认。
- [ ] 旧 `annotatedImageUrl` 仅作为兼容字段，并记录迁移警告。
- [ ] 可见角色、场景和道具均绑定相应资产图。
- [ ] 没有重复读取三张策略源卡的文本来覆盖 shotGroup 快照。

## B. 关键分镜图

- [ ] 生图计划已由用户确认。
- [ ] 每张图只有一个单一冻结瞬间。
- [ ] 时间点、类型、叙事目的和来源镜头清楚。
- [ ] 角色身份、数量、脸、发型、服装和体态锁定。
- [ ] 站位、朝向、视线和轴线与场景站位标注图一致。
- [ ] 道具数量、持物手和状态正确。
- [ ] 光源、色卡和材质来自上游约束。
- [ ] 图片画幅等于全局画幅。
- [ ] 清晰度是用户从当前 API 支持选项中确认的值。
- [ ] 尾帧关键图严格匹配 `tailFrameAnchor`。

## C. 闸门

- [ ] 每张计划内关键图均有已确认版本。
- [ ] 未确认或已取消确认的关键图不会进入故事板引用。
- [ ] 关键图未全部确认时，工作流不能进入 `planning_storyboard`。

## D. 动作节拍

- [ ] 按可见状态变化拆分，不按秒数机械取样。
- [ ] 通常为 4-12 格；超过 12 格已压缩次要节拍并获得用户确认。
- [ ] 相邻近似状态已合并。
- [ ] 单格没有包含两个不能同时冻结的动作阶段。
- [ ] 首帧和尾帧状态明确。
- [ ] 每个 BEAT 有 `contentMotion` 和 `cameraMotion`。
- [ ] Static 镜头明确写出，不留空。

## E. 故事板 Sheet

- [ ] 每格绑定一个或多个已确认关键图版本。
- [ ] 每格内部画幅等于全局画幅。
- [ ] 整张 Sheet 外层比例按布局决定。
- [ ] 默认通过连续状态表达运动。
- [ ] 只有复杂路径、接触或运镜才使用少量显式标注。
- [ ] 没有机械添加双箭头。
- [ ] 没有色卡、材质板、长段说明或参考图拼贴。
- [ ] 可见文字仅含两行表头、格头和必要短标注。
- [ ] 角色、道具、轴线、银幕方向和首尾状态连续。

## F. 依赖与交接

- [ ] `dependencyState.referencedKeyShotVersions` 与实际绑定版本一致。
- [ ] 任一绑定关键图版本变化后，`storyboardSheet.stale = true`。
- [ ] `stale` 为 true 时卡片不能保持 `confirmed`。
- [ ] `videoHandoff` 包含已确认关键图、故事板图、BEATS、首帧和尾帧状态。
- [ ] 兼容字段 `imageUrl`、`generationPrompt`、`keyFrames` 可由新结构派生。
