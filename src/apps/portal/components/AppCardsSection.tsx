import { Film, ArrowRight, UserCog } from 'lucide-react';
import { Link } from 'react-router-dom';

const apps = [
  {
    id: 'drama',
    name: '短剧工作室',
    description:
      '短剧/短视频创作的 AI 辅助工作台。树状叙事结构、无限画布、AI 助手，让创作从灵感到成片一气呵成。',
    icon: Film,
    href: '/projects',
    status: 'available',
    tags: ['短剧创作', '分镜', 'AI 助手'],
  },
  {
    id: 'console',
    name: '个人中心',
    description: '管理你的账户资料、密码、语言主题偏好以及第三方 API Key 设置。',
    icon: UserCog,
    href: '/console',
    status: 'available',
    tags: ['账户', '偏好', 'API'],
  },
];

/**
 * App cards — buzzy.now-style dark surface cards with subtle
 * white-opacity borders, hover lift + glow.
 */
export function AppCardsSection() {
  return (
    <section
      id="apps"
      className="relative py-24 sm:py-32"
      style={{ background: 'var(--portal-bg)' }}
    >
      {/* Subtle separator from hero */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-16"
        style={{
          background:
            'linear-gradient(to bottom, transparent, oklch(40% 0.05 275 / 0.4), transparent)',
        }}
      />

      <div className="relative mx-auto max-w-6xl px-6">
        {/* Section header */}
        <div className="mb-14 text-center">
          <div
            className="mb-3 inline-block text-xs font-semibold tracking-[0.18em]"
            style={{ color: 'var(--portal-accent)' }}
          >
            APPLICATIONS
          </div>
          <h2
            className="mb-3 text-3xl font-bold tracking-tight text-white sm:text-4xl"
            style={{ fontFamily: 'var(--font-family-display)', letterSpacing: '-0.025em' }}
          >
            创作应用
          </h2>
          <p className="text-base" style={{ color: 'var(--portal-text-muted)' }}>
            选择适合你的创作工具，开启 AI 辅助创作之旅
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {apps.map((app) => {
            const Icon = app.icon;
            return (
              <Link
                key={app.id}
                to={app.href}
                className="group relative flex flex-col overflow-hidden rounded-[20px] border p-7 transition-all duration-300 hover:-translate-y-1"
                style={{
                  background: 'var(--portal-bg-elevated)',
                  borderColor: 'var(--portal-border)',
                  boxShadow: '0 1px 0 oklch(100% 0 0 / 0.04) inset',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'oklch(45% 0.1 275 / 0.5)';
                  e.currentTarget.style.boxShadow =
                    '0 0 0 1px oklch(60% 0.18 275 / 0.18), 0 16px 40px oklch(0% 0 0 / 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--portal-border)';
                  e.currentTarget.style.boxShadow = '0 1px 0 oklch(100% 0 0 / 0.04) inset';
                }}
              >
                {/* Icon */}
                <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl"
                  style={{
                    background: 'oklch(50% 0.18 275 / 0.18)',
                    border: '1px solid oklch(60% 0.16 275 / 0.25)',
                  }}
                >
                  <Icon className="h-5 w-5" style={{ color: 'var(--portal-accent)' }} />
                </div>

                {/* Title */}
                <h3
                  className="mb-2 text-lg font-semibold text-white"
                  style={{ fontFamily: 'var(--font-family-display)' }}
                >
                  {app.name}
                </h3>

                {/* Description */}
                <p
                  className="mb-5 flex-1 text-sm leading-relaxed"
                  style={{ color: 'var(--portal-text-muted)' }}
                >
                  {app.description}
                </p>

                {/* Tags */}
                <div className="mb-5 flex flex-wrap gap-1.5">
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

                {/* CTA */}
                <div
                  className="flex items-center gap-1.5 text-sm font-semibold transition-all group-hover:gap-2"
                  style={{ color: 'var(--portal-accent)' }}
                >
                  立即使用
                  <ArrowRight className="h-3.5 w-3.5" />
                </div>
              </Link>
            );
          })}

          {/* Coming soon — same surface style, dimmer */}
          <div
            className="flex flex-col items-center justify-center rounded-[20px] border border-dashed p-7 text-center"
            style={{
              borderColor: 'oklch(100% 0 0 / 0.06)',
              background: 'transparent',
            }}
          >
            <div
              className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl"
              style={{
                background: 'oklch(100% 0 0 / 0.04)',
                border: '1px solid oklch(100% 0 0 / 0.06)',
              }}
            >
              <span className="text-2xl" style={{ color: 'var(--portal-text-dim)' }}>+</span>
            </div>
            <h3
              className="mb-1.5 text-lg font-semibold"
              style={{ color: 'var(--portal-text-muted)' }}
            >
              更多应用
            </h3>
            <p className="text-sm" style={{ color: 'var(--portal-text-dim)' }}>
              即将上线
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
