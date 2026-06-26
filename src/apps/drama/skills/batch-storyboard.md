---
id: batch-storyboard
name: 批量生成分镜
description: 为画布上所有/空白的场景卡批量生成分镜参考图
slashCommand: batch-storyboard
examples: ["/batch-storyboard", "/batch-storyboard 风格:电影感 暖色调"]
parameters:
  stylePrompt:
    type: string
    description: 可选，统一风格描述，会附加到每张分镜的 prompt
  onlyEmpty:
    type: string
    description: 'true/false。默认 true：只生成还没分镜图的场景卡'
required: []
---

# 批量生成分镜

遍历画布上所有 sceneCard，依次调用 `generate_storyboard` 生成参考图。

## 行为

- 默认 (`onlyEmpty: true`) 只处理没有 thumbnail 的卡片 — 避免覆盖已有图
- `stylePrompt` 会附加到每张卡片的 prompt，统一视觉风格
- 单张失败 → 计为 failed（通常是没配置 AI provider）
- summary 报告 `succeeded/total` 和 failed 数
- `needsLlmFollowup: false` — 报告已自包含

## 边界

- 画布无 sceneCard → summary 明确告知
- 所有 sceneCard 都已有图 → summary 明确告知

## 示例

```
/batch-storyboard
/batch-storyboard 风格:电影感 暖色调 onlyEmpty:false
```
