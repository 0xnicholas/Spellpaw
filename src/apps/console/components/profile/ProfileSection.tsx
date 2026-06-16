import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { useAuthStore } from '@/shared/stores/authStore';
import { fetchCurrentUser, updateProfile } from '@console/lib/consoleApi';

export function ProfileSection() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const [name, setName] = useState(user?.name ?? '');
  const [avatar, setAvatar] = useState(user?.avatar ?? '');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchCurrentUser().then((fresh) => {
      if (fresh) {
        setName(fresh.name);
        setAvatar(fresh.avatar ?? '');
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
    const result = await updateProfile({ name: trimmedName, avatar: avatar.trim() });
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
        <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">{t('console.profile.title')}</h2>
        <p className="text-sm text-[var(--color-text-secondary)]">{t('console.profile.description')}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--color-text-secondary)]">{t('console.profile.email')}</label>
          <Input value={user?.email ?? ''} disabled className="bg-[var(--color-bg-secondary)] text-[var(--color-text-tertiary)]" />
          <p className="mt-1 text-[10px] text-[var(--color-text-tertiary)]">{t('console.profile.emailReadonly')}</p>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--color-text-secondary)]">{t('console.profile.name')}</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t('console.profile.name')} />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--color-text-secondary)]">{t('console.profile.avatar')}</label>
          <Input value={avatar} onChange={(e) => setAvatar(e.target.value)} placeholder="https://..." />
        </div>

        {message && (
          <p
            className={`text-xs ${
              status === 'success' ? 'text-green-500' : 'text-red-500'
            }`}
          >
            {message}
          </p>
        )}

        <div className="pt-2">
          <Button type="submit" loading={status === 'loading'}>{t('console.profile.save')}</Button>
        </div>
      </form>
    </section>
  );
}
