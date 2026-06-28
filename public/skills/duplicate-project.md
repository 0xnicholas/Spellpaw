---
id: duplicate-project
name: 复制项目
description: 把当前项目的画布卡片复制为一个新项目
slashCommand: duplicate-project
examples: ["/duplicate-project 新标题:都市奇缘 v2", "/duplicate-project 新标题:'Stale Update v2'"]
parameters:
  newTitle:
    type: string
    description: 新项目标题（必填）
required: ["newTitle"]
---

# 目标
把当前项目画布上所有卡片复制到一个全新的项目中。

# 可用工具
- `get_canvas` — 获取当前画布所有卡片
- `add_card` — 创建新卡片（在新项目中）
- `batch_add_cards` — 批量创建卡片（推荐，减少往返次数）

# 步骤
1. 如果未提供"新标题"参数，回复「请提供新项目标题，例如 /duplicate-project 新标题:都市奇缘 v2」
2. 调用 `get_canvas` 获取当前画布所有卡片
3. 如果卡片数为 0，回复「当前项目无内容可复制」
4. 为新项目创建新 project（这需要在 chat 中引导用户手动操作，或告诉用户当前无法通过工具创建 project）
5. 创建 project 后，用 `batch_add_cards` 批量复制所有卡片：
   - 每条卡片的 `cardType` 用原始 type
   - `data` 字段复制原始的 title / description / tags / status 等
   - **不复制** `linkedCardIds`（指向旧项目的关联）
6. 报告复制结果

# 输出格式
```
已复制项目为「{新标题}」：X 张画布卡。
原项目 Y 幕 Z 场景的卡片结构已全部复制。请注意：卡片间关联（linkedCardIds）已清除，需在新项目中手动重建。
```
