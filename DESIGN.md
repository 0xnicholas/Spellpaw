# 设计系统

> 风格：Linear  
> 色彩空间：OKLCH（CSS Color Module Level 4）  
> 令牌格式：W3C Design Tokens Community Group

---

## 1. 设计原则

本设计系统受 [Linear](https://linear.app/) 启发，追求**极简、精密与速度感**。

- **减法至上**：每个元素都应有明确目的，移除一切装饰性噪音。
- **信息密度**：在保持呼吸感的同时最大化信息密度，界面服务于效率。
- **微妙反馈**：交互反馈（悬停、按下、聚焦）使用极短的过渡与克制的视觉变化。
- **一致性**：通过严格的令牌系统确保跨平台、跨组件的视觉一致性。

---

## 2. 色彩系统

### 2.1 为什么使用 OKLCH

本系统采用 **OKLCH** 色彩空间（而非 HEX 或 HSL）。OKLCH 是一种感知均匀的色彩空间，具有以下优势：

- **可预测的亮度**：修改色相（Hue）时，亮度（Lightness）保持不变，确保无障碍对比度稳定。
- **更鲜艳的安全色域**：在广色域显示器上能呈现更纯净的色彩，同时优雅降级。
- **符合 CSS 标准**：原生支持 `oklch()` 函数（[CSS Color Module Level 4](https://www.w3.org/TR/css-color-4/)）。

参考工具：[oklch.com](https://oklch.com/)

### 2.2 基础色板（灰阶）

灰阶使用冷灰色调（Hue ≈ 250°），极低饱和度（Chroma 0.005–0.02），呈现精密、中性的视觉感受。

| Token | OKLCH 值 | 用途 |
|-------|----------|------|
| `color.base.white` | `oklch(100% 0 250)` | 纯白，主背景 |
| `color.base.gray-50` | `oklch(98% 0.005 250)` | 极浅灰，次背景 |
| `color.base.gray-100` | `oklch(95% 0.01 250)` | 悬停背景、第三层 |
| `color.base.gray-200` | `oklch(90% 0.01 250)` | 默认边框、分割线 |
| `color.base.gray-300` | `oklch(80% 0.015 250)` | 强边框、禁用态 |
| `color.base.gray-400` | `oklch(70% 0.015 250)` | 占位符文字 |
| `color.base.gray-500` | `oklch(60% 0.015 250)` | 次要文字、图标 |
| `color.base.gray-600` | `oklch(50% 0.02 250)` | 正文文字 |
| `color.base.gray-700` | `oklch(40% 0.02 250)` | 深色正文 |
| `color.base.gray-800` | `oklch(30% 0.02 250)` | 标题文字 |
| `color.base.gray-900` | `oklch(20% 0.015 250)` | 最深文字、反色背景 |
| `color.base.black` | `oklch(0% 0 250)` | 纯黑，极少使用 |

### 2.3 强调色板（Accent）

强调色是一种偏紫的靛蓝色（Hue ≈ 275°），通过调整 Lightness 生成 10 级变体。

| Token | OKLCH 值 | 用途 |
|-------|----------|------|
| `color.accent.50` | `oklch(95% 0.05 275)` | 极浅强调背景 |
| `color.accent.100` | `oklch(90% 0.08 275)` | 浅色强调背景 |
| `color.accent.200` | `oklch(80% 0.12 275)` | 浅色装饰、边框 |
| `color.accent.300` | `oklch(70% 0.16 275)` | 中等强调 |
| `color.accent.400` | `oklch(60% 0.18 275)` | 次主色、按钮悬停 |
| `color.accent.500` | `oklch(55% 0.2 275)` | **主强调色**，主按钮、链接 |
| `color.accent.600` | `oklch(48% 0.18 275)` | 按钮按下态 |
| `color.accent.700` | `oklch(40% 0.16 275)` | 深色强调文字 |
| `color.accent.800` | `oklch(32% 0.12 275)` | 极深强调 |
| `color.accent.900` | `oklch(25% 0.08 275)` | 最深强调 |

### 2.4 语义色彩映射

语义层将基础色与强调色映射到具体的 UI 用途，避免在组件中直接使用色板值。

```
Background:
  color.semantic.bg.primary    → color.base.white
  color.semantic.bg.secondary  → color.base.gray-50
  color.semantic.bg.tertiary   → color.base.gray-100
  color.semantic.bg.inverse    → color.base.gray-900
  color.semantic.bg.accent     → color.accent.500
  color.semantic.bg.accent-subtle → color.accent.50

Text:
  color.semantic.text.primary   → color.base.gray-900
  color.semantic.text.secondary → color.base.gray-600
  color.semantic.text.tertiary  → color.base.gray-500
  color.semantic.text.inverse   → color.base.white
  color.semantic.text.accent    → color.accent.500

Border:
  color.semantic.border.default → color.base.gray-200
  color.semantic.border.subtle  → color.base.gray-100
  color.semantic.border.strong  → color.base.gray-300
  color.semantic.border.accent  → color.accent.500
```

### 2.5 对比度规范

关键文字组合需满足 **WCAG 2.1 AA**（对比度 ≥ 4.5:1）：

| 组合 | 对比度 | 合规 |
|------|--------|------|
| `gray-900` 在 `white` 上 | ~16:1 | ✅ |
| `gray-600` 在 `white` 上 | ~6.5:1 | ✅ |
| `gray-500` 在 `white` 上 | ~4.6:1 | ✅ |
| `accent-500` 在 `white` 上 | ~4.8:1 | ✅ |
| `white` 在 `gray-900` 上 | ~16:1 | ✅ |

---

## 3. 字体排版

### 3.1 字体选择

| 用途 | 字体栈 | 说明 |
|------|--------|------|
| 标题 | Inter Display | 笔画更粗、字距更紧，适合大字号 |
| 正文 | Inter | 高可读性，多权重支持 |
| 代码 | SF Mono / Fira Code | 等宽，用于代码与数据展示 |

> 参考：[rsms.me/inter](https://rsms.me/inter/)

### 3.2 字号阶梯

| Token | 值 | 像素 | 用途 |
|-------|-----|------|------|
| `font.size.xs` | 0.75rem | 12px | 标签、徽章 |
| `font.size.sm` | 0.875rem | 14px | 辅助文字 |
| `font.size.base` | 1rem | 16px | 正文基准 |
| `font.size.lg` | 1.125rem | 18px | 大号正文 |
| `font.size.xl` | 1.25rem | 20px | 小标题 |
| `font.size.2xl` | 1.5rem | 24px | 中标题 |
| `font.size.3xl` | 1.875rem | 30px | 大标题 |
| `font.size.4xl` | 2.25rem | 36px | 超大标题 |

### 3.3 字重

| Token | 值 | 用途 |
|-------|-----|------|
| `font.weight.regular` | 400 | 正文、描述 |
| `font.weight.medium` | 500 | 强调正文、菜单项 |
| `font.weight.semibold` | 600 | 小标题、按钮文字 |
| `font.weight.bold` | 700 | 大标题、强强调 |

### 3.4 行高与字距

| 类型 | Token | 值 | 用途 |
|------|-------|-----|------|
| 行高 | `line-height.tight` | 1.1 | 大标题 |
| 行高 | `line-height.snug` | 1.25 | 小标题 |
| 行高 | `line-height.base` | 1.5 | 正文 |
| 行高 | `line-height.relaxed` | 1.75 | 长文阅读 |
| 字距 | `letter-spacing.tight` | -0.02em | 大标题更凝聚 |
| 字距 | `letter-spacing.normal` | 0em | 默认 |
| 字距 | `letter-spacing.wide` | 0.05em | 大写标签 |

---

## 4. 间距与布局

### 4.1 间距阶梯

以 **4px** 为基准单位，形成 15 级阶梯：

| Token | 值 |
|-------|-----|
| `spacing.0` | 0px |
| `spacing.px` | 1px |
| `spacing.0-5` | 2px |
| `spacing.1` | 4px |
| `spacing.2` | 8px |
| `spacing.3` | 12px |
| `spacing.4` | 16px |
| `spacing.5` | 20px |
| `spacing.6` | 24px |
| `spacing.8` | 32px |
| `spacing.10` | 40px |
| `spacing.12` | 48px |
| `spacing.16` | 64px |
| `spacing.20` | 80px |
| `spacing.24` | 96px |

### 4.2 布局建议

- **容器最大宽度**：1200px 或 1440px，视内容而定。
- **水平内边距**：移动端 `spacing.4`（16px），桌面端 `spacing.6` 至 `spacing.8`（24–32px）。
- **栅格**：推荐 8 列或 12 列， gutter 使用 `spacing.4`（16px）。

---

## 5. 形状与效果

### 5.1 圆角

Linear 风格偏向**极小圆角**，保持锐利感与精密感：

| Token | 值 | 用途 |
|-------|-----|------|
| `radius.none` | 0px | 锐角组件 |
| `radius.sm` | 2px | 输入框、按钮（默认） |
| `radius.base` | 4px | 卡片、弹窗 |
| `radius.lg` | 8px | 浮动面板、模态框 |
| `radius.full` | 9999px | 标签、徽章 |

### 5.2 阴影

本系统**避免使用弥散阴影**。若必须使用，采用极浅的硬阴影或仅使用边框进行层级区分：

```css
/* 不推荐：弥散阴影 */
/* 推荐：无阴影 + 边框 */
border: 1px solid var(--color-border-default);
```

---

## 6. 设计令牌

本系统采用 [W3C Design Tokens Community Group](https://www.w3.org/community/designtokens/) 格式，所有令牌以 JSON 文件组织：

```
tokens/
├── color/
│   ├── base.json      # 基础灰阶
│   ├── accent.json    # 强调色
│   └── semantic.json  # 语义映射
├── typography/
│   ├── font.json      # 字体家族
│   └── scale.json     # 字号、字重、行高、字距
├── spacing/
│   └── scale.json     # 间距阶梯
└── radius/
    └── scale.json     # 圆角
```

令牌字段说明：

| 字段 | 说明 |
|------|------|
| `$type` | 令牌类型：`color`、`fontFamily`、`fontSize`、`fontWeight`、`lineHeight`、`letterSpacing`、`dimension` |
| `$value` | 令牌值，支持别名引用（如 `{color.base.white}`） |
| `$description` | 人类可读的用途说明 |

---

## 7. 多格式导出

基于 `tokens/` 源文件，系统生成以下可直接使用的格式：

| 文件 | 格式 | 用途 |
|------|------|------|
| `dist/tokens.css` | CSS 自定义属性 | 前端项目直接引用 `var(--token-name)` |
| `dist/tokens.scss` | Sass 变量 + Map | Sass/SCSS 项目，支持程序化访问 |
| `dist/tokens.json` | 合并扁平化 JSON | 设计工具（Figma Tokens、Style Dictionary）导入 |

### 使用示例

**CSS:**
```css
.my-button {
  background: var(--color-bg-accent);
  color: var(--color-text-inverse);
  font-family: var(--font-family-display);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  padding: var(--spacing-2) var(--spacing-4);
  border-radius: var(--radius-sm);
}
```

**SCSS:**
```scss
.my-button {
  background: $color-bg-accent;
  color: $color-text-inverse;
  font-family: $font-family-display;
  font-size: $font-size-sm;
  font-weight: $font-weight-medium;
  padding: $spacing-2 $spacing-4;
  border-radius: $radius-sm;
}
```

---

## 8. 参考资源

- [CSS Color Module Level 4](https://www.w3.org/TR/css-color-4/)
- [OKLCH 色彩选择器](https://oklch.com/)
- [Adobe Spectrum Design Tokens](https://spectrum.adobe.com/page/design-tokens/)
- [Inter 字体](https://rsms.me/inter/)
- [W3C Design Tokens Format](https://tr.designtokens.org/format/)
