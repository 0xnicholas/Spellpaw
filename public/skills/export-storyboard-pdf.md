---
id: export-storyboard-pdf
name: 导出分镜 PDF
description: 把当前项目导出为分镜 PDF（在浏览器中触发下载）
slashCommand: export-storyboard-pdf
examples: ["/export-storyboard-pdf"]
parameters:
required: []
---

# 目标
把当前项目的完整信息导出为一个分镜 PDF 文件，浏览器自动下载。PDF 包含项目标题、所有卡片列表（sceneCard/art等）、状态、时长等。

# 可用工具
- `get_canvas` — 获取当前画布所有卡片（用于确认项目非空）

# 步骤
1. 确认当前有打开的项目。如果没有，回复「当前没有打开的项目，无法导出 PDF」
2. 调用 `get_canvas` 获取卡片列表
3. 如果卡片数为 0，回复「当前项目无内容，无法导出 PDF」
4. 告知用户：导出 PDF 功能由浏览器的导出按钮触发。引导用户点击画布工具栏的「导出 PDF」按钮
5. 在回复中总结项目信息：标题、卡片数量、sceneCard 数量等

# 输出格式
```
已触发导出。PDF 文件包含：
- 项目「{项目标题}」
- X 张画布卡（Y 张场景卡）
- 总时长 Zs

请在浏览器中查看下载的文件。
```

> 注意：实际 PDF 生成由前端 `exportStoryboardPDF()` 函数完成（位于画布工具栏按钮中）。slight 命令的主要作用是验证项目状态并提供导出前的信息摘要。
