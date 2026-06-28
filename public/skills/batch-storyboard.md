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

# 目标
遍历画布上所有 sceneCard，为符合条件的卡片批量生成 AI 分镜参考图。

# 可用工具
- `get_canvas` — 获取画布上所有卡片
- `generate_storyboard` — 为单张场景卡生成分镜图

# 步骤
1. 调用 `get_canvas`，筛选出所有 `type: "sceneCard"` 的卡片
2. 如果场景卡数量为 0，直接回复「画布上没有任何场景卡，无法生成分镜」
3. 根据 `onlyEmpty` 参数决定范围：
   - 默认（true）：只处理 thumbnail 为空的卡片
   - false：处理所有场景卡
4. 如果所有目标卡片都已有 thumbnail，回复「所有场景卡都已有分镜图，无需生成」
5. 遍历目标卡片，逐个调用 `generate_storyboard`：
   - `cardId`：卡片的 id
   - 如果有 stylePrompt 参数，传 `prompt: stylePrompt`
6. 统计成功/失败数量。单张失败通常是未配置 AI provider，跳过并继续

# 输出格式
```
批量分镜完成：X/Y 张成功。（失败数量）张失败（可能未配置 AI provider）
```

如果全部成功，回复「✅ 已为所有 X 张场景卡生成分镜图」
