---
id: character-profile
name: 创建角色卡
description: 从名字+简介创建一张 character 画布卡，缺失字段用"未知"占位
slashCommand: character-profile
examples:
  - /character-profile 姓名:林小夏
  - /character-profile 姓名:顾言 年龄:28 职业:律师 性格:冷静
  - /character-profile 姓名:Mystery 描述:"有秘密的咖啡师"
parameters:
  姓名:
    type: string
    description: 角色姓名（必填）
  年龄:
    type: string
    description: 年龄，如 25
  职业:
    type: string
    description: 职业 / 身份
  性格:
    type: string
    description: 性格特点
  描述:
    type: string
    description: 背景或人物弧光描述
required: ["姓名"]
---

# 目标
根据用户提供的姓名和可选信息，创建一张 character 类型的画布卡片。

# 可用工具
- `add_character_card` — 创建 character 类型卡片

# 步骤
1. 如果未提供"姓名"参数，回复「请提供角色姓名，例如 /character-profile 姓名:林小夏」
2. 从参数中提取：姓名（必填）、年龄、职业、性格、描述（可选）
3. 缺失字段用以下占位：
   - 年龄 → "未知"
   - 职业 → "未知"
   - 性格 → "待补充"
4. 拼接 description 文本：
   ```
   年龄：{年龄}
   职业：{职业}
   性格：{性格}
   ```
   如果用户提供了额外的"描述"参数，在上面基础上追加空行 + 用户描述
5. 调用 `add_character_card`，参数：
   - `title`: 姓名
   - `description`: 拼接后的描述
   - `tags`: ["角色", 职业, 性格]（过滤空值）
6. 创建完成后报告结果

# 输出格式
```
已创建角色卡「{姓名}」：{职业}，{年龄} 岁，性格：{性格}
```
