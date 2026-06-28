---
id: analyze-pacing
name: 节奏分析
description: 深入分析当前项目的节奏，输出最关键的 3 条修改建议
slashCommand: analyze-pacing
examples: ["/analyze-pacing", "/analyze-pacing 聚焦:开场段"]
parameters:
  focusArea:
    type: string
    description: 可选，聚焦某段：overall（默认）/ first_act / climax / ending
required: []
---

# 目标
分析当前画布上所有 sceneCard，输出结构诊断 + 节奏分析 + 视觉缺口统计。

# 可用工具
- `get_canvas` — 获取画布上所有卡片
- `analyze_structure` — 得到结构诊断 JSON
- `get_pacing_report` — 得到节奏分析 JSON

# 步骤
1. 调用 `get_canvas` 获取当前卡片列表
2. 如果画布为空（卡片数 0），直接报告「当前项目无内容，无法分析节奏」
3. 调用 `analyze_structure`，从返回的 JSON 取 `summary` 字段作为「结构诊断」
4. 调用 `get_pacing_report`，从返回的 JSON 取 `summary` 字段作为「节奏分析」
5. 手动统计 sceneCard 中没有 thumbnail 的卡片数 → 报告为「视觉缺口」
6. 如果用户指定了 focusArea（如"开场段"），在报告末尾追加「（聚焦：${focusArea}）」

# 输出格式
把结构诊断、节奏分析、视觉缺口、聚焦提示拼接成一段话。例如：

```
📊 结构诊断：2 幕 5 场景，共 7 张画布卡
🎬 节奏分析：5 个场景，总时长 120s（平均 24s），2 个场景缺分镜图
🎨 视觉缺口：2 个场景卡还没分镜图，40% 的视觉节奏未定义
（聚焦：开场段）
```

然后附带 3 条基于报告的关键建议，让用户可以选择下一步操作。
