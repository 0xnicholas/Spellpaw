import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '@/shared/stores/authStore';
import { fetchCurrentUser, updateProfile } from '@console/lib/consoleApi';
import { ArrowRight } from 'lucide-react';

export function ProfileSection() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const [name, setName] = useState(user?.name ?? '');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchCurrentUser().then((fresh) => {
      if (fresh) {
        setName(fresh.name);
      }
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    const trimmedName = name.trim();
    if (!trimmedName) {
      setStatus('error');
      setMessage(t('console.profile.nameRequired'));
      return;
    }
    const result = await updateProfile({ name: trimmedName });
    if (result.success) {
      setStatus('success');
      setMessage(t('console.profile.updateSuccess'));
      const fresh = await fetchCurrentUser();
      if (fresh) {
        useAuthStore.setState({ user: fresh });
      }
    } else {
      setStatus('error');
      setMessage(result.error || t('console.profile.updateError'));
    }
  };

  return (
    <section className="space-y-6">
      <div>
        <div
          className="mb-2 inline-block text-xs font-semibold tracking-[0.18em]"
          style={{ color: 'var(--portal-accent)' }}
        >
          PROFILE
        </div>
        <h2
          className="mb-1.5 text-2xl font-bold text-white"
          style={{ fontFamily: 'var(--font-family-display)', letterSpacing: '-0.02em' }}
        >
          {t('console.profile.title')}
        </h2>
        <p className="text-sm" style={{ color: 'var(--portal-text-muted)' }}>
          {t('console.profile.description')}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div
          className="rounded-[20px] border p-6"
          style={{
            background: 'var(--portal-bg-elevated)',
            borderColor: 'var(--portal-border)',
          }}
        >
          <div className="space-y-4">
            <div>
              <label
                className="mb-1.5 block text-xs font-medium"
                style={{ color: 'var(--portal-text-muted)' }}
              >
                {t('console.profile.email')}
              </label>
              <input
                value={user?.email ?? ''}
                disabled
                className="h-10 w-full cursor-not-allowed rounded-xl px-3.5 text-sm outline-none"
                style={{
                  background: 'oklch(100% 0 0 / 0.02)',
                  border: '1px solid oklch(100% 0 0 / 0.05)',
                  color: 'var(--portal-text-dim)',
                }}
              />
              <p className="mt-1.5 text-[10px]" style={{ color: 'var(--portal-text-dim)' }}>
                {t('console.profile.emailReadonly')}
              </p>
            </div>

            <div>
              <label
                className="mb-1.5 block text-xs font-medium"
                style={{ color: 'var(--portal-text-muted)' }}
              >
                {t('console.profile.name')}
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('console.profile.name')}
                className="h-10 w-full rounded-xl px-3.5 text-sm text-white outline-none"
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

            {message && (
              <p
                className="text-xs"
                style={{ color: status === 'success' ? 'oklch(80% 0.12 145)' : 'oklch(80% 0.12 25)' }}
              >
                {message}
              </p>
            )}

            <div className="pt-2">
              <button
                type="submit"
                disabled={status === 'loading'}
                className="group flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-[oklch(15%_0.02_270)] transition-all hover:scale-[1.02] disabled:opacity-60"
                style={{
                  fontFamily: 'var(--font-family-display)',
                  boxShadow: '0 4px 12px rgba(255,255,255,0.1), 0 0 24px oklch(60% 0.2 275 / 0.2)',
                }}
              >
                {status === 'loading' ? (
                  <>
                    <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    保存中…
                  </>
                ) : (
                  <>
                    {t('console.profile.save')}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </form>
    </section>
  );
}
