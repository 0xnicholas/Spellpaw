# 运动故事板 Sheet 提示词模板

## 用途

故事板 Sheet 用于视频生成阶段补充主体运动、运镜、站位、空间方向、接触结果和连续性。它必须引用已确认关键分镜图，不承担重新设计角色、场景或成片美术效果的职责。

## 画幅规则

- 每个 panel 内部画幅必须等于全局画幅。
- 整张 Sheet 的外层比例按 panel 数量和可读性自动决定，不要求等于全局画幅。
- panel 数量按动作节拍自动确定，通常为 4-12 格。

## 中文模板

```text
创建一张{sheetAspectRatio}的电影制作故事板 Sheet。

[主体任务]
为{shotGroupId}制作运动故事板。画面讲述：{motionSummary}。
关键分镜图已经锁定视觉效果；本 Sheet 只补充动作阶段、主体路径、运镜、站位和连续性。

[表头]
制作克制、清晰的故事板表头，只显示以下两行中文：
"{title}"
"{oneSentenceSummary}"

[版式结构]
使用 AUTO 布局，共{panelCount}格。
每个 panel 保持{globalAspectRatio}。
严格按 BEATS 的 P## 顺序，每个 BEAT 对应一格。
格头格式固定为：P## / 镜头标签 / 节拍名。

[视觉语法]
panel 内部使用简洁、可读的影视故事板缩略图语言：
清楚的身体轮廓、姿态重心、接触关系、银幕方向和前中后景。
降低面部、服装和材质细节，只保留识别身份和读取动作所需的信息。
每格只画一个冻结瞬间，不画同一角色的前后态副本。

[关键分镜图引用]
关键图A：{keyShotReferenceA}，用于锁定{lockedTraitsA}。
关键图B：{keyShotReferenceB}，用于锁定{lockedTraitsB}。
{moreKeyShotReferences}
每个 BEAT 的 keyShotBindings 指定该格继承哪些关键图。
不得重新设计关键图已锁定的角色身份、场景结构、核心构图和光色关系。

[连续性]
保持以下内容一致：
{identityContinuity}
{blockingContinuity}
{axisAndScreenDirection}
{propAndCostumeContinuity}
{openingAndTailState}

[数量锁定]
{characterCountLock}
{propCountLock}
{crowdOrEffectCountLock}
同一角色在单格只出现一次，除非上游明确要求镜面、屏幕或影像中的第二呈现。

[文字规则]
可见文字仅限两行表头、格头和复杂运动所需的极短中文标注。
不要显示章节名、长句、时间说明、色卡、材质板或参考图缩略图。

[运动表达规则]
默认使用相邻格的姿态、位置、视线、构图和取景范围变化表达运动。
复杂路径、多人交叉调度或快速接触，可使用少量轨迹线、接触短划、起点或终点。
复杂推拉摇移、环绕、变焦或机位切换，可使用少量镜头框、虚线箭头或镜头符号。
不要机械地在每格添加内容箭头和运镜箭头。
Static 镜头通常不加标注；只有可能误读时才使用小型锁定机位符号。

[约束]
避免 Logo、水印、乱码、额外 panel、插图、参考图拼贴、完成度过高的插画风、
重复角色、幽灵残影、动作前后态同框、跨轴、错误银幕方向、错误道具数量、
无关人物、无关场景、密集说明文字和满屏运动箭头。

[动作节拍]
BEATS：
{beats}
```

## BEAT 模板

```text
P{number} / {shotTag} / {beatName}：
{frozenMoment}；
站位：{subjectBlocking}；
内容运动：{contentMotion}；
运镜：{cameraMotion}；
连续性状态：{continuityState}；
关键图绑定：{keyShotBindings}；
标注方式：{implicit | explicit | mixed}，{visibleAnnotationIfNeeded}。
```

## 拆格规则

出现以下任一可见变化时，可产生新 BEAT：

- 主体动作阶段改变。
- 接触或结果状态改变。
- 站位、朝向、视线或遮挡关系改变。
- 表演反应改变。
- 景别、机位或运镜阶段改变。
- 首帧或尾帧连续性状态改变。

相邻 BEAT 状态近似时合并；单个 BEAT 包含两个不能同时冻结的动作阶段时拆分。超过 12 格时先压缩次要节拍并征询用户。

