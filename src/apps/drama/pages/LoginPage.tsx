import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/shared/stores/authStore';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { config } from '@/shared/config';
import { ArrowRight, Mail, Sparkles } from 'lucide-react';

type Mode = 'login' | 'register';

/**
 * Demo account credentials. These mirror `DEMO_USER` in `server/src/seed.ts` —
 * keep them in sync if you ever change the seed.
 */
const DEMO_HINT = {
  email: 'demo@spellpaw.xyz',
  password: 'password123',
} as const;

/**
 * Login / Register page — buzzy-inspired split layout:
 *   - left column: form (logo, heading, mode toggle, email form, demo card, terms)
 *   - right column: 4-tile gradient collage (hidden on small screens)
 * Pure-black background; no aurora glow.
 */
export function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const register = useAuthStore((s) => s.register);
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitCredentials(email, password);
  };

  const switchMode = (next: Mode) => {
    setMode(next);
    setError('');
  };

  const useDemoCredentials = async () => {
    setMode('login');
    setError('');
    setEmail(DEMO_HINT.email);
    setPassword(DEMO_HINT.password);
    await submitCredentials(DEMO_HINT.email, DEMO_HINT.password);
  };

  const submitCredentials = async (emailValue: string, passwordValue: string) => {
    setLoading(true);
    const result =
      mode === 'login'
        ? await login(emailValue, passwordValue)
        : await register(emailValue, passwordValue);
    setLoading(false);
    if (result.success) {
      navigate('/projects');
    } else {
      setError(translateAuthError(result.error, t));
    }
  };

  const submitLabel = mode === 'login' ? t('auth.signIn') : t('auth.signUp');

  return (
    <div
      className="min-h-screen flex bg-black text-white"
      style={{ fontFamily: '"Sora", Inter, sans-serif' }}
    >
      {/* Left: form column */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-[420px]">
          {/* Logo */}
          <div className="mb-12 flex items-center justify-center gap-2.5">
            <img src="/favicon.svg" alt="SpellPaw" className="h-7 w-7" />
            <span className="text-[20px] font-bold tracking-[-0.02em]">
              SpellPaw
            </span>
          </div>

          {/* Heading */}
          <h1
            className="text-center text-[40px] font-bold leading-[1.1] tracking-[-0.02em]"
          >
            {t('auth.welcomeHeading', 'Welcome to Spellpaw')}
          </h1>
          <p
            className="mt-3 mb-9 text-center text-[14px]"
            style={{ color: 'oklch(70% 0 0)' }}
          >
            {t('auth.tagline', '登录或注册以开启 AI 短剧创作')}
          </p>

          {/* Mode toggle */}
          <SegmentedToggle mode={mode} onChange={switchMode} t={t} />

          {/* Form */}
          <form onSubmit={handleSubmit} className="mt-6 space-y-3">
            {error && <ErrorBanner message={error} />}

            <FormField
              label={t('auth.email')}
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={setEmail}
              autoComplete="email"
              required
            />
            <FormField
              label={t('auth.password')}
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={setPassword}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              required
              minLength={8}
            />

            <button
              type="submit"
              disabled={loading}
              className="group mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-[14px] font-semibold transition-all hover:bg-white/[0.04] disabled:opacity-60"
              style={{
                background: 'oklch(100% 0 0 / 0.04)',
                border: '1px solid oklch(100% 0 0 / 0.12)',
                color: 'white',
              }}
            >
              {loading ? (
                <>
                  <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  {mode === 'login' ? t('auth.signingIn', '登录中…') : t('auth.signingUp', '注册中…')}
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4" />
                  {submitLabel}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </>
              )}
            </button>
          </form>

          {/* Demo card */}
          {config.showDemoHint && (
            <button
              type="button"
              onClick={useDemoCredentials}
              className="mt-3 flex h-12 w-full items-center gap-3 rounded-2xl px-4 text-left transition-colors hover:bg-white/[0.04] disabled:opacity-60"
              style={{
                background: 'oklch(100% 0 0 / 0.025)',
                border: '1px solid oklch(100% 0 0 / 0.06)',
              }}
              disabled={loading}
              aria-label={t('auth.demoHint.ariaLabel', 'Use the demo account')}
            >
              <span
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
                style={{ background: 'oklch(60% 0.18 275 / 0.18)', color: 'oklch(82% 0.14 275)' }}
              >
                <Sparkles className="h-3.5 w-3.5" />
              </span>
              <span className="flex-1 min-w-0">
                <span
                  className="block text-[10.5px] font-medium uppercase tracking-[0.08em]"
                  style={{ color: 'oklch(55% 0 0)' }}
                >
                  {t('auth.demoHint.label', 'Try the demo')}
                </span>
                <span
                  className="mt-0.5 block truncate font-mono text-[12px]"
                  style={{ color: 'oklch(70% 0 0)' }}
                >
                  {DEMO_HINT.email} · {DEMO_HINT.password}
                </span>
              </span>
              <ArrowRight className="h-3.5 w-3.5 shrink-0" style={{ color: 'oklch(50% 0 0)' }} />
            </button>
          )}

          {/* Terms */}
          <p
            className="mt-10 text-center text-[11px] leading-[1.6]"
            style={{ color: 'oklch(55% 0 0)' }}
          >
            {t('auth.terms.prefix', '登录即代表同意我们的')}{' '}
            <a href="#" className="underline underline-offset-2" style={{ color: 'oklch(82% 0.16 85)' }}>
              {t('auth.terms.tos', '服务条款')}
            </a>{' '}
            {t('auth.terms.and', '和')}{' '}
            <a href="#" className="underline underline-offset-2" style={{ color: 'oklch(82% 0.16 85)' }}>
              {t('auth.terms.privacy', '隐私政策')}
            </a>
          </p>
        </div>
      </div>

      {/* Right: decorative panel (hidden on mobile) */}
      <div className="hidden lg:block flex-1 relative overflow-hidden" aria-hidden>
        <DecorPanel />
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Mode toggle (segmented)                                                    */
/* -------------------------------------------------------------------------- */

interface SegmentedToggleProps {
  mode: Mode;
  onChange: (next: Mode) => void;
  t: TFunction;
}

function SegmentedToggle({ mode, onChange, t }: SegmentedToggleProps) {
  return (
    <div
      className="flex rounded-full p-1 text-sm"
      style={{ background: 'oklch(100% 0 0 / 0.04)', border: '1px solid oklch(100% 0 0 / 0.06)' }}
    >
      {(['login', 'register'] as Mode[]).map((m) => {
        const active = mode === m;
        return (
          <button
            key={m}
            type="button"
            onClick={() => onChange(m)}
            className="flex-1 rounded-full py-1.5 text-xs font-medium transition-colors"
            style={{
              background: active ? 'oklch(100% 0 0 / 0.08)' : 'transparent',
              color: active ? 'white' : 'oklch(65% 0 0)',
            }}
          >
            {m === 'login' ? t('auth.signIn') : t('auth.signUp')}
          </button>
        );
      })}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Form field                                                                 */
/* -------------------------------------------------------------------------- */

interface FormFieldProps {
  label: string;
  type: 'text' | 'email' | 'password';
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  required?: boolean;
  minLength?: number;
}

function FormField({ label, type, placeholder, value, onChange, autoComplete, required, minLength }: FormFieldProps) {
  return (
    <div>
      <label
        className="mb-1.5 block text-[11px] font-medium uppercase tracking-[0.06em]"
        style={{ color: 'oklch(60% 0 0)' }}
      >
        {label}
      </label>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        required={required}
        minLength={minLength}
        className="h-11 w-full rounded-xl px-3.5 text-sm text-white placeholder:transition-colors focus:outline-none"
        style={{
          background: 'oklch(100% 0 0 / 0.04)',
          border: '1px solid oklch(100% 0 0 / 0.08)',
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
  );
}

/* -------------------------------------------------------------------------- */
/* Error banner                                                               */
/* -------------------------------------------------------------------------- */

function ErrorBanner({ message }: { message: string }) {
  return (
    <div
      className="rounded-xl px-3 py-2.5 text-xs"
      style={{
        background: 'oklch(22% 0.08 25 / 0.4)',
        color: 'oklch(80% 0.12 25)',
        border: '1px solid oklch(40% 0.12 25 / 0.5)',
      }}
    >
      {message}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Right-side decorative panel                                                */
/* -------------------------------------------------------------------------- */

/**
 * Single decorative panel — a deep tinted background with a subtle radial
 * highlight, a faint diagonal grid, and a thin accent rule. Intentionally
 * quiet so it never competes with the form.
 */
function DecorPanel() {
  return (
    <div
      className="absolute inset-0"
      style={{
        background:
          'radial-gradient(120% 80% at 75% 20%, oklch(22% 0.08 280) 0%, oklch(8% 0.02 280) 55%, oklch(5% 0.01 280) 100%)',
      }}
    >
      {/* faint dot grid */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, oklch(100% 0 0 / 0.06) 1px, transparent 0)',
          backgroundSize: '28px 28px',
          maskImage:
            'radial-gradient(ellipse 80% 60% at 60% 40%, black 30%, transparent 75%)',
          WebkitMaskImage:
            'radial-gradient(ellipse 80% 60% at 60% 40%, black 30%, transparent 75%)',
        }}
      />
      {/* thin vertical accent rule */}
      <div
        className="absolute"
        style={{
          left: '14%',
          top: '12%',
          bottom: '12%',
          width: '1px',
          background:
            'linear-gradient(to bottom, transparent, oklch(70% 0.18 285 / 0.35) 30%, oklch(70% 0.18 285 / 0.35) 70%, transparent)',
        }}
      />
      {/* soft purple glow, anchored bottom-right */}
      <div
        className="absolute -bottom-[20%] -right-[15%] h-[70%] w-[70%] rounded-full"
        style={{
          background: 'oklch(55% 0.2 290 / 0.25)',
          filter: 'blur(120px)',
        }}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Map backend error messages to localized strings.
 * Falls back to the raw server message, then to a generic localized default.
 */
function translateAuthError(raw: string | undefined, t: TFunction): string {
  if (!raw) return t('auth.errors.generic');
  const lower = raw.toLowerCase();
  if (lower.includes('invalid credentials')) return t('auth.errors.invalidCredentials');
  if (lower.includes('email already registered')) return t('auth.errors.emailExists');
  if (lower.includes('network')) return t('auth.errors.network');
  return raw;
}
