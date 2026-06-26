---
id: duplicate-project
name: 复制项目
description: 把当前项目结构复制为新项目，标题可改
slashCommand: duplicate-project
examples: ["/duplicate-project 新标题:都市奇缘 v2", "/duplicate-project 新标题:'Stale Update v2'"]
parameters:
  newTitle:
    type: string
    description: 新项目标题（必填）
required: ["newTitle"]
---

# 复制项目

把当前项目的结构（幕 + 场景）克隆为新项目。**镜头不复制**。

## 行为

1. 创建新项目（自动生成新 id，颜色继承 `#6366f1`）
2. 遍历当前项目的顶层幕：
   - 每个幕在新项目中复制（标题）
   - 每个幕下的场景复制（标题、描述、时长）
   - 镜头级别**不复制**（超出当前实现的递归深度）
3. 切换到新项目作为当前项目

## 返回说明

- 原项目无幕/场景 → 创建空项目，summary 标注「原项目无幕/场景可复制」
- 正常复制 → summary 标注幕/场景数量
- **不复制镜头** — 在 summary 中明确告知

## 示例

```
/duplicate-project 新标题:都市奇缘 v2
/duplicate-project 新标题:'Stale Update v2'
```

> 💡 含空格的标题建议用引号包裹：`新标题:'复杂 标题 v2'`
