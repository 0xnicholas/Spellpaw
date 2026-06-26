# Seedance 2.0 中文视频提示词模板

## 用途

把已确认 `StoryboardCard` 中的关键分镜图、故事板图、BEATS、首尾状态和资产图片转为视频生成提示词。模板只组织上游已确认的信息，不新增事件。

## 参考图权限

```text
仅将 @故事板图 用作以下信息的视觉锚点：
镜头顺序、机位角度、景别与取景、姿态、站位、银幕方向、构图、
角色/道具/特效状态和空间地理。
严格遵循故事板各格，不要渲染故事板 Sheet 本身，
不要复制其边框、格头、箭头、标签或说明文字，
不要添加本提示词和上游 BEATS 之外的事件。

将 @关键分镜图K01、@关键分镜图K02…… 用作对应动作节拍的成片效果锚点，
锁定关键状态、构图、光色、材质和表演瞬间。

将 @角色资产C01、@角色资产C02…… 作为对应角色最终外貌、脸部、体型、
服装、比例、材质和身份一致性的唯一权威。

将 @场景资产S01 作为空间结构、固定物位置、环境材质和场景身份的唯一权威。

将 @道具资产P01、@道具资产P02…… 作为道具形状、数量、尺寸、材质和使用方式的唯一权威。

将 @场景站位标注图B01 只用于锁定角色初始站位、朝向、视线、轴线、
运动路线和安全机位区；不要渲染图中的标注、文字、编号或箭头。
```

## 完整模板

```text
【参考图权限】
{referenceAuthority}

【剪辑与空间连续性】
使用{editingLanguage}。
跨剪辑始终保持：{geographyLocks}。
保持轴线、视线、银幕运动方向、角色相对位置和固定物位置连续。
不得通过剪辑跳过上游定义的关键接触、结果状态或尾帧。

【视觉风格】
{visualStyle}
光影：{lighting}
色彩：{palette}
材质与画面质感：{materialsAndRendering}
景深与场面可读性：{depthAndReadability}

【环境】
{environment}
固定地理：{fixedGeography}
动态环境：{environmentMotion}

【角色与表演】
{characterIdentityLocks}
{performanceGuidance}
角色数量、道具数量、持用方式和服装状态全程一致。

【情绪指导】
{emotionalGuidance}
用眼神、眉、嘴、呼吸、肩颈、手势和身体重心表达，不只写抽象情绪。

【节奏与升级】
{rhythmAndEscalation}
动作、剪辑和运镜从{openingRhythm}升级到{peakRhythm}，最后以{releaseRhythm}收束。

【音频指导】
{audioGuidance}

【动作节拍 BEATS】
{beats}

【首尾状态】
首帧：{openingState}
尾帧：{tailState}
尾帧必须稳定保留，供下一镜头组衔接。

【负面约束】
不要渲染故事板 Sheet、参考图边框、文字、编号、箭头或拼贴；
不要增加上游未定义的角色、道具、动作、特效、事件或镜头；
不要改变角色身份、脸、服装、体型、道具设计、场景结构和固定地理；
不要重复角色、幽灵残影、错误肢体、错误持物手、错误道具数量；
不要跨轴、反转银幕方向、清空应保持拥挤的群体或改变首尾状态；
{projectNegativeConstraints}

【生成参数】
模型：{model}
画幅：{aspectRatio}
请求时长：{requestedDuration}秒
生成时长：{generatedDuration}秒
画质：{quality}
分辨率：{resolutionIfSupported}
原生音频：{supportsNativeAudio}
{modelSpecificParams}
```

## BEAT 模板

```text
P{number}（{timeRange}）：
剪辑：{editType}；
起始冻结状态：{frozenStart}；
内容运动：{contentMotion}；
运镜：{cameraMotion}；
站位与银幕方向：{blockingAndScreenDirection}；
结果状态：{resultState}；
关键图绑定：{keyShotBindings}。
```

## 音频分流

### API 支持原生音频

在 `fullPrompt` 中保留：

```text
【音频指导】
无配乐。使用{environmentSounds}、{actionSounds}、{impactSounds}和{silenceDesign}。
声音事件必须与对应 BEAT 同步。
```

同时把音频能力写入模型参数。

### API 不支持原生音频

- 从 `fullPrompt` 的视觉提示词中移除整段音频指导。
- 不要在 `fullPrompt` 中保留“无音频”“不要音乐”等否定句；视觉模型提示词中完全不出现音频段。
- `generationPrompt` 可以向用户展示音频意图，但必须标注“仅供后续声音制作”。
- 完整内容保存到 `VideoCard.audioGuidance`。

## 时长适配

默认：

```text
requestedDuration = StoryboardCard.shotGroupSnapshot.duration
generatedDuration = requestedDuration
```

API 不支持精确时长时：

1. 向用户展示 API 支持的时长。
2. 用户选择 `generatedDuration`。
3. 保持 BEAT 顺序和相对节奏，按比例重排时间段。
4. 把每个原始 BEAT 时间映射保存到 `durationAdaptation.beatTimingMap`。
5. 不得静默删减事件、补空白或改变首尾状态。

## 用户案例的中文结构示例

以下示例用于说明原英文案例的专业语言转译，不作为固定内容：

```text
【剪辑与空间连续性】
使用强硬切、爆发切、闪切、甩切和冲击插入镜头。
跨剪辑保持上坡方向、密集军阵、左侧悬崖、右侧岩壁和上方山门一致。

【视觉风格】
夜间山脊上的3D风格化电影动漫动作；低调月光、冷雾、白袍与黑色军阵剪影对比；
空中红色剑轨；以花瓣消散代替血液，不出现血腥。
使用深焦保持军阵规模可读，前景动作始终按单个敌人逐一命中，
配合高张力作画爆发和闪白冲击帧。

【情绪指导】
主角始终向山顶推进，不停止攀登；
每一次独立命中都在仍然拥挤的军阵内部形成一个独立花瓣爆点。

【节奏与升级】
从奔跑中段开始，以目标到目标的爆发闪切推进；
逐步进入山门前的压力停顿；
以一次超自然山门斩击达到峰值；
最后释放为山下密集的花瓣轨迹。
```
