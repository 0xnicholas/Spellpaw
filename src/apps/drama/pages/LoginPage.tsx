import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Film } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { useAuthStore } from '@/shared/stores/authStore';
import { useTranslation } from 'react-i18next';

export function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const register = useAuthStore((s) => s.register);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const result = mode === 'login'
      ? await login(email, password)
      : await register(email, password, name);
    setLoading(false);
    if (result.success) {
      navigate('/projects');
    } else {
      setError(result.error || '出了点问题');
    }
  };

  const switchMode = () => {
    setMode(mode === 'login' ? 'register' : 'login');
    setError('');
  };

  return (
    <div className="flex h-full min-h-screen items-center justify-center bg-[var(--color-bg-secondary)]">
      <div className="w-full max-w-[360px] rounded-[var(--radius-base)] border border-[var(--color-border-default)] bg-[var(--color-bg-primary)] p-8">
        <div className="mb-6 flex items-center justify-center gap-2">
          <Film className="h-6 w-6 text-[var(--color-accent-500)]" />
          <span className="text-xl font-semibold tracking-tight text-[var(--color-text-primary)]">
            Spellpaw
          </span>
        </div>
        <p className="mb-6 text-center text-sm text-[var(--color-text-secondary)]">
          {mode === 'login' ? t('auth.signIn') : t('auth.signUp')}
        </p>

        {error && (
          <div className="mb-4 rounded-[var(--radius-sm)] border border-[var(--color-status-danger-bg)] bg-[var(--color-status-danger-bg)] px-3 py-2 text-xs text-[var(--color-status-danger-text)]">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === 'register' && (
            <div>
              <label className="mb-1 block text-xs font-medium text-[var(--color-text-secondary)]">{t('auth.name')}</label>
              <Input
                placeholder="您的名称"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          )}
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--color-text-secondary)]">{t('auth.email')}</label>
            <Input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--color-text-secondary)]">{t('auth.password')}</label>
            <Input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full" loading={loading}>
            {mode === 'login' ? t('auth.signIn') : t('auth.signUp')}
          </Button>
        </form>

        <p className="mt-4 text-center text-xs text-[var(--color-text-tertiary)]">
          {mode === 'login' ? t('auth.switchToRegister') : t('auth.switchToLogin')}
          <button onClick={switchMode} className="text-[var(--color-text-accent)] hover:underline">
            {mode === 'login' ? '注册' : '登录'}
          </button>
        </p>
      </div>
    </div>
  );
}
