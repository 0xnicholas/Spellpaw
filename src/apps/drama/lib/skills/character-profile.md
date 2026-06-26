---
id: character-profile
name: 创建角色卡
description: 从名字+简介创建一张 character 画布卡，缺失字段用合理占位
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
    description: 年龄，如 25 / 二十岁
  职业:
    type: string
    description: 职业 / 身份
  性格:
    type: string
    description: 性格特点，逗号分隔
  描述:
    type: string
    description: 背景或人物弧光描述
required: ["姓名"]
---

# 创建角色卡

在画布上创建一张 `character` 类型的卡片，附带可结构化的角色元信息。

## 行为

- **姓名必填** — 缺失时返回提示，不创建卡片
- 其他字段（年龄/职业/性格/描述）缺失 → 用「未知」/「待补充」占位
- character 卡片 schema 顶层只支持 `title`/`description`/`tags`，结构化字段会被编码到 description 文本里：

  ```
  年龄：25
  职业：律师
  性格：冷静

  （可选：用户提供的描述）
  ```

- tags 自动包含「角色」+ 职业 + 性格

## 示例

```
/character-profile 姓名:林小夏
/character-profile 姓名:顾言 年龄:28 职业:律师 性格:冷静
/character-profile 姓名:Mystery 描述:"有秘密的咖啡师"
```

> 💡 中文 key 直接使用，含空格的 value 用引号包裹。
