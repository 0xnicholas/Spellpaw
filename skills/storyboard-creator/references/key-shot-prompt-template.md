# 关键分镜图提示词模板

## 用途

用于为一个镜头组逐张生成高清关键分镜图。关键分镜图是视频生成阶段的视觉效果参考，负责锁定角色、场景、道具、构图、光色、材质和关键表演瞬间，不负责完整解释运动过程。

## 硬约束

- 一张图只表现一个可冻结的瞬间，不同时画动作前态与后态。
- 图片画幅必须等于全局画幅。
- 必须引用已确认的场景站位标注图 `SceneStrategyCard.positionAnnotationImage.imageUrl`。
- 必须引用画面内相关的角色、场景和道具资产图。
- 参考图用于锁定身份、空间和造型，不得以拼贴、缩略图或说明板形式出现在成图中。
- 清晰度只能从当前图像 API 实际支持的选项中让用户选择。

## 模板

```text
【关键分镜图】

[镜头任务]
镜头组：{shotGroupId}
关键图：{keyShotId}
时间点：{timestamp}
类型：{establishing | performance | action | effect | tail | custom}
叙事目的：{narrativePurpose}
来源镜头：{sourceShotIds}
承接关系：{continuityPurpose}

[参考图绑定]
图像A，场景站位标注图：锁定空间结构、角色站位、朝向、视线和轴线。
图像B，场景资产图：锁定场景建筑、家具、环境和材质。
图像C起，角色资产图：分别锁定角色身份、脸型、发型、服装和体态。
后续图像，道具资产图：锁定道具形状、尺寸、材质和持用方式。
只继承与本镜头有关的视觉信息，不把参考图的标注文字、边框或说明复制进成图。

[单一冻结瞬间]
画面冻结在：{frozenMoment}
此刻之前：{priorState，仅用于理解，不得画入}
此刻之后：{nextState，仅用于理解，不得画入}
禁止同一角色重复出现，禁止用残影同时展示前后姿态。

[主体与表演]
角色/主体：{subjectIdentity}
画面位置：{screenPosition}
身体姿态：{bodyPose}
手部与道具：{handPropState}
视线目标：{eyelineTarget}
可见表演：{eyes + brows + mouth + breathing + shoulders + gesture}
动作接触或特效状态：{contactOrEffectState}

[场景与站位]
场景区域：{locationAndZone}
前景：{foreground}
中景：{midground}
后景：{background}
角色间距与遮挡：{spacingAndOcclusion}
轴线与银幕方向：{axisAndScreenDirection}
必须与场景站位标注图一致。

[摄影表达]
景别：{shotSize}
机位与角度：{cameraAngle}
焦段意图：{lensIntent}
构图：{composition}
视觉焦点：{visualFocus}
景深：{depthOfField}
当前画面是静态冻结帧；运镜只用于说明取景状态，不绘制运动箭头。

[光色与材质]
动机光源：{motivatedSources}
主光/补光/轮廓光：{lightingHierarchy}
色彩：{palette}
关键材质：{materials}
氛围与空气状态：{atmosphere}
严格服从 ArtDirectionCard 和当前镜头组 sceneStrategy。

[连续性锁定]
角色身份与数量：{identityCountLock}
服装、伤痕、湿度和污损：{costumeState}
道具数量与状态：{propState}
场景固定物位置：{environmentState}
首帧继承：{openingState}
尾帧目标：{tailFrameAnchor}

[负面约束]
不要重复角色，不要额外人物，不要额外道具，不要错误持物手，不要跨轴，
不要把动作前态和后态同时画入，不要拼贴参考图，不要生成文字说明、边框、Logo或水印，
不要偏离角色资产、场景站位标注图、美术设定和尾帧状态。

[模型参数]
模型：{model}
画幅：{globalAspectRatio}
清晰度：{userConfirmedResolution}
```

## 生成前检查

1. `frozenMoment` 能否在一个瞬间中成立。
2. 站位、朝向、视线是否能在 `positionAnnotationImage` 中找到依据。
3. 每个可见角色、场景和道具是否都有资产引用。
4. 景别、机位、焦段和构图是否服务叙事目的。
5. 尾帧关键图是否严格落在 `tailFrameAnchor`。

