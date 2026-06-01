# ADR-009: 设计系统（Tailwind CSS + OKLCH）

- **Status:** Accepted
- **Date:** 2026-05-27

## Context

Spellpaw 需要一个一致、可维护、支持暗色/亮色主题的设计系统。可选方案：

1. **CSS-in-JS（styled-components / Panda CSS）** — 运行时或构建时生成
2. **Tailwind CSS** — 原子化 utility class
3. **自定义 CSS Modules** — 组件级样式隔离
4. **组件库（Radix / shadcn/ui）** — 预构建 UI 组件

## Decision

**使用 Tailwind CSS 4 + OKLCH 色彩空间 + CSS 自定义属性。** 不引入第三方组件库（除 Lucide Icons）。

**色彩系统：**
```css
/* src/index.css */
:root {
  /* OKLCH 色彩空间 — 感知均匀，暗色/亮色主题自动适配 */
  --color-bg-primary: oklch(0.145 0 0);       /* 主背景 */
  --color-bg-secondary: oklch(0.18 0 0);       /* 次背景 */
  --color-bg-tertiary: oklch(0.22 0 0);        /* 三级背景 */
  --color-text-primary: oklch(0.95 0 0);       /* 主文字 */
  --color-text-secondary: oklch(0.7 0 0);      /* 次文字 */
  --color-text-tertiary: oklch(0.5 0 0);       /* 三级文字 */
  --color-accent-500: oklch(0.65 0.18 250);    /* 主题色 */
  --color-border-default: oklch(0.28 0 0);     /* 默认边框 */
  --color-border-subtle: oklch(0.2 0 0);       /* 浅边框 */
  --radius-base: 0.5rem;
  --radius-sm: 0.25rem;
}

/* 亮色主题 */
[data-theme='light'] {
  --color-bg-primary: oklch(0.98 0 0);
  --color-bg-secondary: oklch(0.95 0 0);
  --color-text-primary: oklch(0.15 0 0);
  /* ... */
}
```

**设计令牌约束：**
- **禁止使用 HEX/RGB：** 所有颜色必须用 OKLCH 值 + CSS 自定义属性
- **禁止使用 Tailwind 原生色板：** 如 `bg-blue-500`，必须用 `bg-[var(--color-accent-500)]`
- **间距/圆角：** 使用 `--radius-*` 和 Tailwind spacing scale
- **字体：** 系统默认字体栈（不引入 Web Font）

**通用 UI 组件（自建，非第三方库）：**
- Button, IconButton, Badge, Modal, TabBar, FormField, Lightbox
- 所有组件接收 `className` 允许覆盖

## Decision Rationale

- **OKLCH > HSL/HEX：** 感知均匀，暗色/亮色主题间颜色过渡更自然；浏览器原生支持（Chrome 111+, Safari 15.4+, Firefox 113+）
- **CSS 自定义属性 > Tailwind 原生色板：** 主题切换只需改 CSS 变量，无需重新编译
- **自建组件 > 第三方库：** Spellpaw 的 Linear 风格设计难以用现成组件库匹配；自建组件完全可控
- **Tailwind 4：** 最新版本，性能更好，配置文件更简洁

## Consequences

**Pros:**
- 设计一致性由令牌强制保证
- 主题切换无闪烁（CSS 变量即时生效）
- OKLCH 色彩在 P3 广色域屏幕上更鲜艳
- 零运行时 CSS-in-JS 开销

**Cons:**
- 自建组件库需要维护成本
- OKLCH 调试工具不如 HEX 丰富（大多数设计工具仍用 HEX）
- Tailwind 4 可能与某些 Vite 插件存在兼容问题
- 团队需要学习 OKLCH 色彩理论

**Mitigations:**
- 通用 UI 组件有单元测试和 Storybook（后续）
- DESIGN.md 作为设计系统参考文档
- OKLCH 转换工具：https://oklch.com

---

*See also: ADR-006 (Canvas Engine), ADR-008 (Multi-App Architecture)*
