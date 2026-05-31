import { Film, ArrowRight, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

const apps = [
  {
    id: 'drama',
    name: '短剧工作室',
    description: '短剧/短视频创作的 AI 辅助工作台。树状叙事结构、无限画布、AI 助手，让创作从灵感到成片一气呵成。',
    icon: Film,
    href: '/projects',
    status: 'available',
    tags: ['短剧创作', '分镜', 'AI 助手'],
  },
];

export function AppCardsSection() {
  return (
    <section id="apps" className="relative py-24">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[var(--color-bg-secondary)]/30 to-transparent" />
      <div className="relative mx-auto max-w-5xl px-6">
        <div className="mb-12 text-center">
          <h2 className="mb-3 text-3xl font-bold tracking-tight text-[var(--color-text-primary)]">
            创作应用
          </h2>
          <p className="text-[var(--color-text-secondary)]">
            选择适合你的创作工具，开启 AI 辅助创作之旅
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {apps.map((app) => {
            const Icon = app.icon;
            return (
              <Link
                key={app.id}
                to={app.href}
                className="group relative flex flex-col rounded-[var(--radius-lg)] border border-[var(--color-border-default)] bg-[var(--color-bg-primary)] p-6 transition-all hover:border-[var(--color-accent-500)]/30 hover:shadow-lg hover:shadow-[var(--color-accent-500)]/5"
              >
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-[var(--radius-base)] bg-[var(--color-accent-500)]/10">
                  <Icon className="h-5 w-5 text-[var(--color-accent-500)]" />
                </div>
                <h3 className="mb-2 text-lg font-semibold text-[var(--color-text-primary)]">
                  {app.name}
                </h3>
                <p className="mb-4 flex-1 text-sm leading-relaxed text-[var(--color-text-secondary)]">
                  {app.description}
                </p>
                <div className="mb-4 flex flex-wrap gap-2">
                  {app.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-[var(--color-bg-secondary)] px-2.5 py-0.5 text-xs text-[var(--color-text-secondary)]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-1.5 text-sm font-medium text-[var(--color-accent-500)]">
                  立即使用
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </div>
              </Link>
            );
          })}

          {/* Coming soon placeholder */}
          <div className="flex flex-col items-center justify-center rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border-default)] bg-[var(--color-bg-secondary)]/30 p-6 text-center">
            <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-[var(--radius-base)] bg-[var(--color-bg-tertiary)]">
              <Clock className="h-5 w-5 text-[var(--color-text-tertiary)]" />
            </div>
            <h3 className="mb-1 text-lg font-semibold text-[var(--color-text-tertiary)]">
              更多应用
            </h3>
            <p className="text-sm text-[var(--color-text-tertiary)]">
              即将上线
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
