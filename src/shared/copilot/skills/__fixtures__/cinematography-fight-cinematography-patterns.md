---
id: cinematography-fight-cinematography-patterns
name: cinematography-fight-cinematography-patterns
description: Use to plan fight-scene cinematography (coverage, pacing, beat-anchors). Reads scene cards via get_canvas, inserts additional art cards via add_card (type=art) for action keyframes, and updates shot metadata.
slashCommand: cinematography-fight-cinematography-patterns
examples: []
parameters: {}
required: []
---
# 动作与打斗摄影参考


## 打斗镜头基本原则

- 少量角色优先，1v1或1v2更容易清晰。
- 每个动作要有攻击线、防守/闪避、接触点、重心变化、结果。
- 摄影机服务动作可读性，不为炫技破坏空间。
- 避免血腥和真实伤害描写，按电影特技安全处理。

## 动作节拍字段

```typescript
fightBeat: {
  attacker: string;
  attackLine: string;       // 从哪里打向哪里
  defenseOrEvasion: string; // 如何挡/躲
  contactPoint: string;     // 接触点
  footwork: string;         // 脚步和重心
  result: string;           // 对方如何反应
  cameraResponse: string;   // 摄影机如何跟
  soundOrEnvironment: string;
}
```

## 长镜头近身打斗

适用于港片犯罪感、巷战、仓库、走廊、车边近身搏斗：

- 一条连续动作链，不突然换空间。
- 保持全身可读，关键摔、踢、抱摔前拉开景别。
- 每次撞击都绑定环境：墙面、桌角、车门、地面、柱子。
- 声音反馈具体：衣料摩擦、鞋底急停、金属碰撞、木椅滑动、呼吸。

## 环境打斗

环境不是背景，而是动作因果的一部分：

```text
身体 -> 道具接触 -> 道具反应 -> 对手反应 -> 摄影机反应 -> 声音反馈
```

可用环境锚点：

- 赌桌、长凳、木柱、门框、车身、扶手、墙面、楼梯、地面水渍、碎玻璃、灯管。

## 节奏模式

10-15秒打斗建议：

- 2-3个镜头。
- 6-10个动作节拍。
- 不要超过一个主要攻防阶段和一个反制阶段。

可用节奏：

```text
试探 -> 近身 -> 失衡 -> 环境撞击 -> 短暂停顿 -> 反制
```

## 摄影方式

- `FLS/LS`：保证全身动作可读。
- `Handheld`：可用于压迫和混乱，但不能晃到看不清。
- `Dolly/Track`：跟随身体移动。
- 短慢动作：只用于关键接触瞬间，随后回到实时。
- Dutch angle：少用，只在失衡或心理压迫时使用。

## 失败修正

- 动作太多：删到6-10个节拍。
- 看不清谁打谁：固定A/B屏幕位置。
- 摔倒无因果：补重心变化、抓握和借力。
- 环境随机变化：建立房间布局和道具位置。
- 人群干扰：人群只做压力和反应，不进入主打斗。