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

/**
 * Features grid — buzzy.now-style 3-column dark surface cards
 * with subtle borders and hover lift.
 */
export function FeaturesSection() {
  return (
    <section
      id="features"
      className="relative py-24 sm:py-32"
      style={{ background: 'var(--portal-bg)' }}
    >
      <div className="relative mx-auto max-w-6xl px-6">
        {/* Section header */}
        <div className="mb-14 text-center">
          <div
            className="mb-3 inline-block text-xs font-semibold tracking-[0.18em]"
            style={{ color: 'var(--portal-accent)' }}
          >
            CAPABILITIES
          </div>
          <h2
            className="mb-3 text-3xl font-bold tracking-tight text-white sm:text-4xl"
            style={{ fontFamily: 'var(--font-family-display)', letterSpacing: '-0.025em' }}
          >
            核心能力
          </h2>
          <p className="text-base" style={{ color: 'var(--portal-text-muted)' }}>
            为短剧/短视频创作者打造的全链路 AI 辅助工具
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="group relative overflow-hidden rounded-[20px] border p-6 transition-all duration-300 hover:-translate-y-0.5"
                style={{
                  background: 'var(--portal-bg-elevated)',
                  borderColor: 'var(--portal-border)',
                  boxShadow: '0 1px 0 oklch(100% 0 0 / 0.04) inset',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'oklch(45% 0.1 275 / 0.5)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--portal-border)';
                }}
              >
                {/* Icon */}
                <div
                  className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl transition-colors"
                  style={{
                    background: 'oklch(50% 0.18 275 / 0.15)',
                    border: '1px solid oklch(60% 0.16 275 / 0.22)',
                  }}
                >
                  <Icon className="h-[18px] w-[18px]" style={{ color: 'var(--portal-accent)' }} />
                </div>

                {/* Title */}
                <h3
                  className="mb-1.5 text-base font-semibold text-white"
                  style={{ fontFamily: 'var(--font-family-display)' }}
                >
                  {feature.title}
                </h3>

                {/* Description */}
                <p
                  className="text-[13px] leading-relaxed"
                  style={{ color: 'var(--portal-text-muted)' }}
                >
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
