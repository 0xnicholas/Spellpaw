---
id: analyze-pacing
name: 节奏分析
description: 深入分析当前项目的节奏，输出最关键的 3 条修改建议
slashCommand: analyze-pacing
examples: ["/analyze-pacing", "/analyze-pacing 开场段"]
parameters:
  focusArea:
    type: string
    description: 可选，聚焦某段：overall（默认）/ first_act / climax / ending
required: []
---

# 节奏分析

对当前项目做一次综合节奏诊断，组合两个原子工具的输出（`analyze_structure` + `get_pacing_report`）并补一层视觉缺口检查。

## 输出包含

1. **结构诊断** — 幕/场景/镜头数量、状态分布、孤节点
2. **节奏报告** — 平均时长、密度分布、推荐区间对比
3. **视觉缺口** — 画布上有多少 sceneCard 还没有分镜图（thumbnail 字段为空），并换算成视觉节奏未定义的百分比
4. **聚焦提示**（如指定了 focusArea）— 在报告末尾标注聚焦范围

## `needsLlmFollowup`

返回 `true` — 让 LLM 在用户追问时可以基于报告展开 top 3 修改建议。

## 示例

```
/analyze-pacing
/analyze-pacing 开场段
```
