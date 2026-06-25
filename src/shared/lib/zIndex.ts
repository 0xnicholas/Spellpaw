/**
 * Canvas 浮层 z-index 集中管理。
 *
 * 作用域：仅 Canvas 浮层（drawer / popover / menu）。其他 z-50 组件
 * （Modal / Tooltip / ContextMenu）由各自模块独立维护，避免 scope 爆炸。
 */
export const Z_INDEX = {
  cardDetailDrawerMask: 10,
  cardDetailDrawer: 20,
  chatPanel: 40,
  cardCopilotPopover: 50,    // 与现有 Modal 系列（z-50）共存：DOM 后渲染者赢
  paneContextMenu: 60,       // 提升：命令级菜单优先于会话级 popover
  toast: 70,
} as const;
