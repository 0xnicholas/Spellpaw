---
id: export-storyboard-pdf
name: 导出分镜 PDF
description: 把当前项目导出为分镜 PDF（在浏览器中触发下载）
slashCommand: export-storyboard-pdf
examples: ["/export-storyboard-pdf"]
parameters:
required: [] 
---

# 导出分镜 PDF

把当前项目的完整分镜表导出为 PDF 文件，浏览器自动下载。

## 输出内容

PDF 包含：

- **页眉**：项目标题、幕/场景/镜头统计、总时长
- **幕**：每幕一个色块标题
- **场景**：标题、状态图标（○ ◐ ◑ ●）、时长、地点、时段、描述
- **镜头**：标题、景别、运镜、时长
- **页脚**：`Exported from SpellPaw · 日期`

文件名格式：`<项目标题>_storyboard.pdf`。

## 行为说明

- 复用 Navbar 工具栏按钮的同一个 `exportStoryboardPDF()` 函数 — 行为完全等价
- 当前没有打开项目 → 返回提示，不执行导出
- 项目无内容（仅有根节点）→ 仍会导出，只是 PDF 内容极少（仅项目标题 + 页脚）
- 调用 `jsPDF.save()` 触发浏览器下载，无 UI 副作用

## 示例

```
/export-storyboard-pdf
→ 已导出「密室逃脱」的分镜 PDF（幕/场景/镜头表格 + 状态 + 时长）。请检查浏览器下载。
```
