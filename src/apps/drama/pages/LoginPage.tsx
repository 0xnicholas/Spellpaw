import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { useAuthStore } from '@/shared/stores/authStore';
import { useTranslation } from 'react-i18next';

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
    <div className="flex h-full min-h-screen items-center justify-center bg-[var(--color-bg-secondary)]">
      <div className="w-full max-w-[360px] rounded-[var(--radius-base)] border border-[var(--color-border-default)] bg-[var(--color-bg-primary)] p-8">
        <div className="mb-6 flex items-center justify-center gap-2">
          <img src="/favicon.svg" alt="SpellPaw" className="h-7 w-7" />
          <span
            className="text-xl font-bold tracking-[-0.02em] text-[var(--color-text-primary)]"
            style={{ fontFamily: '"Sora", Inter, sans-serif' }}
          >
            SpellPaw
          </span>
        </div>
        <p className="mb-6 text-center text-sm text-[var(--color-text-secondary)]">
          {t('auth.signIn')}
        </p>

        {error && (
          <div className="mb-4 rounded-[var(--radius-sm)] border border-[var(--color-status-danger-bg)] bg-[var(--color-status-danger-bg)] px-3 py-2 text-xs text-[var(--color-status-danger-text)]">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
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
          <Button
            type="submit"
            className="w-full !bg-gradient-to-r !from-[#5b21ff] !to-[#a855f7] !text-white hover:!from-[#4c1ad9] hover:!to-[#9646e5]"
            loading={loading}
          >
            {t('auth.signIn')}
          </Button>
        </form>


      </div>
    </div>
  );
}
