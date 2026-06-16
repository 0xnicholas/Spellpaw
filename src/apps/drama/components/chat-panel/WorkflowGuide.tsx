export function WorkflowGuide() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-12 text-center">
      <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
        开始创作
      </h3>
      <div className="grid grid-cols-1 gap-2 text-left text-xs text-[var(--color-text-secondary)]">
        <div className="flex items-start gap-1.5">
          <span className="mt-0.5 shrink-0">🚀</span>
          <span>
            <b className="text-[var(--color-text-primary)]">Kickstart</b>
            {' '}— 描述你的故事，AI 生成叙事结构初稿
          </span>
        </div>
        <div className="flex items-start gap-1.5">
          <span className="mt-0.5 shrink-0">✨</span>
          <span>
            <b className="text-[var(--color-text-primary)]">Enhance</b>
            {' '}— 逐幕展开分镜、精调对白、优化节奏
          </span>
        </div>
        <div className="flex items-start gap-1.5">
          <span className="mt-0.5 shrink-0">📤</span>
          <span>
            <b className="text-[var(--color-text-primary)]">Extend</b>
            {' '}— 导出分镜图、生成拍摄脚本
          </span>
        </div>
      </div>
    </div>
  );
}
