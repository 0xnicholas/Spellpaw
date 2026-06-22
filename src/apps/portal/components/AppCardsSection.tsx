import { Film, ArrowRight, UserCog, Beaker, Sparkles, Users } from 'lucide-react';
import { Link } from 'react-router-dom';

const apps = [
  {
    id: 'drama',
    name: '短剧工作室',
    description:
      '树状叙事结构、无限画布、AI Copilot。\n从一句话梗概到完整分镜，一气呵成。',
    icon: Film,
    href: '/projects',
    status: 'available',
    tags: ['短剧创作', '分镜', 'AI 助手'],
    /** 大卡片占 2 列 2 行 */
    span: 'lg:col-span-2 lg:row-span-2',
  },
  {
    id: 'console',
    name: '个人中心',
    description: '账户、密码、语言主题、第三方 API Key。',
    icon: UserCog,
    href: '/console',
    status: 'available',
    tags: ['账户', '偏好'],
    span: 'lg:col-span-1',
  },
  {
    id: 'lab',
    name: 'Copilot Lab',
    description: '开发/调试 Copilot 的 playground。',
    icon: Beaker,
    href: '/copilot-lab',
    status: 'available',
    tags: ['debug'],
    span: 'lg:col-span-1',
  },
];

/**
 * App cards — buzzy.now-style bento grid: 1 large featured card + smaller
 * companion cards, mixed sizes, dark elevated surfaces with purple accent.
 */
export function AppCardsSection() {
  return (
    <section
      id="apps"
      className="relative py-24 sm:py-32"
      style={{ background: 'var(--portal-bg)' }}
    >
      <div className="relative mx-auto max-w-6xl px-6">
        {/* Section header — buzzy-style kicker + bold headline + helper */}
        <div className="mb-12 flex flex-col items-start gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div
              className="mb-3 inline-flex items-center gap-2 text-xs font-semibold tracking-[0.18em]"
              style={{ color: 'var(--portal-accent)' }}
            >
              <Sparkles className="h-3 w-3" />
              APPLICATIONS
            </div>
            <h2
              className="text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl"
              style={{ fontFamily: 'var(--font-family-display)', letterSpacing: '-0.025em' }}
            >
              创作应用
            </h2>
          </div>
          <p className="max-w-md text-sm sm:text-base" style={{ color: 'var(--portal-text-muted)' }}>
            从剧本构思到分镜输出，再到个人配置——所有工具一站式集成。
          </p>
        </div>

        {/* Bento grid */}
        <div className="grid auto-rows-[minmax(180px,auto)] grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {apps.map((app, idx) => {
            const Icon = app.icon;
            const isLarge = idx === 0;
            return (
              <Link
                key={app.id}
                to={app.href}
                className={`group relative flex overflow-hidden rounded-3xl border p-6 transition-all duration-300 hover:-translate-y-1 sm:p-7 ${app.span}`}
                style={{
                  background: isLarge
                    ? 'linear-gradient(135deg, oklch(22% 0.04 275) 0%, oklch(18% 0.02 270) 100%)'
                    : 'var(--portal-bg-elevated)',
                  borderColor: 'var(--portal-border)',
                  boxShadow: '0 1px 0 oklch(100% 0 0 / 0.04) inset',
                  minHeight: isLarge ? '320px' : '180px',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'oklch(55% 0.18 275 / 0.5)';
                  e.currentTarget.style.boxShadow =
                    '0 0 0 1px oklch(60% 0.18 275 / 0.18), 0 20px 48px oklch(0% 0 0 / 0.45)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--portal-border)';
                  e.currentTarget.style.boxShadow = '0 1px 0 oklch(100% 0 0 / 0.04) inset';
                }}
              >
                {/* Large card: extra gradient blob in corner */}
                {isLarge && (
                  <div
                    className="absolute -right-20 -top-20 h-60 w-60 rounded-full blur-3xl"
                    style={{ background: 'oklch(55% 0.22 275 / 0.25)' }}
                  />
                )}

                <div className="relative flex h-full flex-col">
                  {/* Icon */}
                  <div
                    className={`mb-4 flex items-center justify-center rounded-2xl ${isLarge ? 'h-12 w-12' : 'h-10 w-10'}`}
                    style={{
                      background: 'oklch(55% 0.18 275 / 0.18)',
                      border: '1px solid oklch(65% 0.16 275 / 0.3)',
                    }}
                  >
                    <Icon
                      className={isLarge ? 'h-6 w-6' : 'h-5 w-5'}
                      style={{ color: 'var(--portal-accent)' }}
                    />
                  </div>

                  {/* Title */}
                  <h3
                    className={`mb-2 font-semibold text-white ${isLarge ? 'text-2xl' : 'text-lg'}`}
                    style={{ fontFamily: 'var(--font-family-display)' }}
                  >
                    {app.name}
                  </h3>

                  {/* Description */}
                  <p
                    className={`mb-4 flex-1 whitespace-pre-line leading-relaxed ${isLarge ? 'text-base' : 'text-sm'}`}
                    style={{ color: 'var(--portal-text-muted)' }}
                  >
                    {app.description}
                  </p>

                  {/* Footer row: tags + CTA */}
                  <div className="flex items-end justify-between gap-3">
                    <div className="flex flex-wrap gap-1.5">
                      {app.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full px-2.5 py-0.5 text-[11px] font-medium"
                          style={{
                            background: 'oklch(100% 0 0 / 0.05)',
                            color: 'var(--portal-text-muted)',
                            border: '1px solid oklch(100% 0 0 / 0.06)',
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                    <div
                      className="flex shrink-0 items-center gap-1 text-sm font-semibold transition-all group-hover:gap-2"
                      style={{ color: 'var(--portal-accent)' }}
                    >
                      {isLarge && <span>立即使用</span>}
                      <ArrowRight className="h-4 w-4" />
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}

          {/* Coming soon — buzzy-style pill placeholder */}
          <div
            className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed p-6 text-center lg:col-span-3"
            style={{
              borderColor: 'oklch(100% 0 0 / 0.06)',
              background: 'transparent',
              minHeight: '120px',
            }}
          >
            <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--portal-text-dim)' }}>
              <Users className="h-4 w-4" />
              更多应用即将上线
            </div>
            <div className="text-xs" style={{ color: 'var(--portal-text-dim)' }}>
              模板市场 · 协作空间 · 数据洞察
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}