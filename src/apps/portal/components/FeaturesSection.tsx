import { MessageSquare, GitBranch, Layout, Zap, Shield, Palette } from 'lucide-react';

const features = [
  {
    icon: MessageSquare,
    title: '对话即操作',
    description: 'AI Agent 不仅是聊天对象，更能直接修改项目结构、生成场景、优化叙事节奏。',
  },
  {
    icon: GitBranch,
    title: '结构即内容',
    description: '幕→场景→镜头的树状叙事结构是创作骨架，让复杂的短剧项目井然有序。',
  },
  {
    icon: Layout,
    title: '画布即工作台',
    description: '无限画布上的卡片是思维的可视化延伸，拖拽编排，所见即所得。',
  },
  {
    icon: Zap,
    title: 'AI 节奏分析',
    description: '实时分析项目时长分布，预警节奏失衡，辅助你把控叙事张力。',
  },
  {
    icon: Shield,
    title: '智能同步',
    description: '树与画布双向同步，本地 IndexedDB 缓存，云端异步 push/pull。',
  },
  {
    icon: Palette,
    title: '叙事模板',
    description: '内置多种叙事模板，悬疑、爱情、喜剧一键套用，快速启动创作。',
  },
];

export function FeaturesSection() {
  return (
    <section id="features" className="relative py-24">
      <div className="mx-auto max-w-5xl px-6">
        <div className="mb-12 text-center">
          <h2 className="mb-3 text-3xl font-bold tracking-tight text-[var(--color-text-primary)]">
            核心能力
          </h2>
          <p className="text-[var(--color-text-secondary)]">
            为短剧/短视频创作者打造的全链路 AI 辅助工具
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="rounded-[var(--radius-lg)] border border-[var(--color-border-default)] bg-[var(--color-bg-primary)] p-5 transition-colors hover:border-[var(--color-accent-500)]/20"
              >
                <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-[var(--radius-base)] bg-[var(--color-accent-500)]/10">
                  <Icon className="h-4 w-4 text-[var(--color-accent-500)]" />
                </div>
                <h3 className="mb-1.5 text-base font-semibold text-[var(--color-text-primary)]">
                  {feature.title}
                </h3>
                <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
