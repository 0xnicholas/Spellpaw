/**
 * AI action prompts per canvas card type.
 *
 * Separated from NodeAIActions.tsx so the component file is HMR-friendly
 * (Vite's fast-refresh requires component files to export only components).
 */
export interface AIAction {
  label: string;
  prompt: string;
}

/** AI actions per card type */
export function getCardAIActions(cardType: string, title: string): AIAction[] {
  switch (cardType) {
    case 'sceneCard':
      return [
        { label: '🎨 生成分镜图', prompt: `请为「${title}」生成分镜参考图` },
        { label: '✏️ 改写描述', prompt: `请改写「${title}」的场景描述，使其更有画面感` },
        { label: '🎥 建议镜头', prompt: `请为「${title}」推荐 3 种镜头类型和运镜方式` },
      ];
    case 'art':
      return [
        { label: '🔄 生成变体', prompt: `请为「${title}」生成一个风格变体` },
        { label: '🔒 应用风格', prompt: `请锁定「${title}」的风格，应用到其他场景` },
      ];
    case 'character':
      return [
        { label: '🖼️ 生成立绘', prompt: `请为角色「${title}」生成角色立绘` },
        { label: '📝 扩写性格', prompt: `请扩写角色「${title}」的性格描述和背景故事` },
      ];
    case 'script':
      return [
        { label: '💬 撰写对白', prompt: `请为「${title}」撰写一段自然对白` },
        { label: '✨ 优化脚本', prompt: `请优化「${title}」的脚本，增强戏剧张力` },
      ];
    case 'deliverable':
      return [
        { label: '🔄 重新生成', prompt: `请重新生成产出物「${title}」` },
      ];
    default:
      return [];
  }
}
