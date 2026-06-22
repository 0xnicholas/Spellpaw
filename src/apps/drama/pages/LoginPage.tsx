import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/shared/stores/authStore';
import { useTranslation } from 'react-i18next';
import { ArrowRight } from 'lucide-react';

/**
 * Login page — buzzy.now-style dark surface with subtle aurora glow,
 * dark login card with subtle border, pill submit button.
 */
export function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const [email, setEmail] = useState('demo@spellpaw.xyz');
  const [password, setPassword] = useState('password123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    if (result.success) {
      navigate('/projects');
    } else {
      setError(result.error || '出了点问题');
    }
  };

  return (
    <div
      className="relative flex h-full min-h-screen items-center justify-center overflow-hidden px-6"
      style={{ background: 'var(--portal-bg)' }}
    >
      {/* Aurora glow */}
      <div
        className="absolute -left-[10%] -top-[15%] h-[600px] w-[700px] rounded-full blur-[160px] pointer-events-none"
        style={{ background: 'oklch(45% 0.2 275 / 0.3)' }}
      />
      <div
        className="absolute -right-[5%] -bottom-[10%] h-[500px] w-[600px] rounded-full blur-[140px] pointer-events-none"
        style={{ background: 'oklch(50% 0.2 290 / 0.22)' }}
      />

      <div className="relative z-10 w-full max-w-[400px]">
        {/* Logo */}
        <div className="mb-8 flex items-center justify-center gap-2.5">
          <img src="/favicon.svg" alt="SpellPaw" className="h-7 w-7" />
          <span
            className="text-[22px] font-bold tracking-[-0.02em] text-white"
            style={{ fontFamily: '"Sora", Inter, sans-serif' }}
          >
            SpellPaw
          </span>
        </div>

        {/* Card */}
        <div
          className="rounded-[24px] border p-8"
          style={{
            background: 'var(--portal-bg-elevated)',
            borderColor: 'var(--portal-border)',
            boxShadow: '0 1px 0 oklch(100% 0 0 / 0.04) inset, 0 24px 60px oklch(0% 0 0 / 0.4)',
          }}
        >
          <h1
            className="mb-1.5 text-center text-[22px] font-bold text-white"
            style={{ fontFamily: 'var(--font-family-display)', letterSpacing: '-0.02em' }}
          >
            欢迎回来
          </h1>
          <p
            className="mb-7 text-center text-sm"
            style={{ color: 'var(--portal-text-muted)' }}
          >
            {t('auth.signIn')}
          </p>

          {error && (
            <div
              className="mb-4 rounded-xl px-3 py-2.5 text-xs"
              style={{
                background: 'oklch(22% 0.08 25 / 0.4)',
                color: 'oklch(80% 0.12 25)',
                border: '1px solid oklch(40% 0.12 25 / 0.5)',
              }}
            >
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                className="mb-1.5 block text-xs font-medium"
                style={{ color: 'var(--portal-text-muted)' }}
              >
                {t('auth.email')}
              </label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-10 w-full rounded-xl px-3.5 text-sm text-white placeholder:transition-colors focus:outline-none"
                style={{
                  background: 'oklch(100% 0 0 / 0.04)',
                  border: '1px solid oklch(100% 0 0 / 0.08)',
                  color: 'white',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'oklch(60% 0.18 275 / 0.6)';
                  e.currentTarget.style.boxShadow = '0 0 0 3px oklch(60% 0.18 275 / 0.12)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'oklch(100% 0 0 / 0.08)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
            </div>

            <div>
              <label
                className="mb-1.5 block text-xs font-medium"
                style={{ color: 'var(--portal-text-muted)' }}
              >
                {t('auth.password')}
              </label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-10 w-full rounded-xl px-3.5 text-sm text-white placeholder:transition-colors focus:outline-none"
                style={{
                  background: 'oklch(100% 0 0 / 0.04)',
                  border: '1px solid oklch(100% 0 0 / 0.08)',
                  color: 'white',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'oklch(60% 0.18 275 / 0.6)';
                  e.currentTarget.style.boxShadow = '0 0 0 3px oklch(60% 0.18 275 / 0.12)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'oklch(100% 0 0 / 0.08)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="group flex w-full items-center justify-center gap-2 rounded-full bg-white py-3 text-[14px] font-semibold text-[oklch(15%_0.02_270)] transition-all hover:bg-white/95 disabled:opacity-60"
              style={{
                fontFamily: 'var(--font-family-display)',
                boxShadow: '0 8px 24px rgba(255,255,255,0.12), 0 0 32px oklch(60% 0.2 275 / 0.2)',
              }}
            >
              {loading ? (
                <>
                  <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  登录中…
                </>
              ) : (
                <>
                  {t('auth.signIn')}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </button>
          </form>

          <div
            className="mt-5 rounded-xl px-3 py-2.5 text-center text-[11px]"
            style={{
              background: 'oklch(100% 0 0 / 0.03)',
              border: '1px solid oklch(100% 0 0 / 0.05)',
              color: 'var(--portal-text-dim)',
            }}
          >
            演示账号已预填，直接点击登录即可
          </div>
        </div>

        <p
          className="mt-6 text-center text-[11px]"
          style={{ color: 'var(--portal-text-dim)' }}
        >
          没有账号？联系管理员获取访问权限
        </p>
      </div>
    </div>
  );
}
