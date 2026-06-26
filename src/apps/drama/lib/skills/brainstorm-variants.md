---
id: brainstorm-variants
name: 脑暴 3 个故事变体
description: 围绕一个主题生成 3 个不同角度（喜剧/悬疑/温情）的故事线卡片
slashCommand: brainstorm-variants
examples:
  - /brainstorm-variants 主题:时间旅行
  - /brainstorm-variants 主题:都市独居
parameters:
  主题:
    type: string
    description: 故事主题 / 关键词（必填）
required: ["主题"]
---

# 脑暴 3 个故事变体

给定一个主题，生成 3 张 storyline 卡片，每张采用一个固定的角度，提供给用户挑选或对比。

## 三个固定角度

| 角度 | Emoji | 风格 |
|------|-------|------|
| 喜剧反差 | 😄 | 用荒诞和反差制造笑点 |
| 悬疑反转 | 🔍 | 不断反转的揭秘 |
| 温情治愈 | 💝 | 温暖日常中见真挚 |

## 行为

- 主题必填 → 缺失返回提示
- 在画布上创建 3 张 storyline 卡，标题格式：`{emoji} {主题}（{角度}）`
- 每张卡片的 description 是固定模板（不含 LLM 调用）— 当前实现是模板化的，不是 LLM 生成的「真」脑暴
- tags 自动包含「角度标签」+ 主题 + 风格标签

## 局限

- 当前是固定模板，**没用 LLM 生成丰富前提**。如需要真正的 LLM 增强版，可以加一个 `creativity: 'rich'` 参数走 LLM 路径（未实现）。

## 示例

```
/brainstorm-variants 主题:时间旅行
/brainstorm-variants 主题:都市独居
```
