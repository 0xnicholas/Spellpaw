import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { updatePassword } from '@console/lib/consoleApi';

export function SecuritySection() {
  const { t } = useTranslation();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');

    if (newPassword.length < 8) {
      setStatus('error');
      setMessage(t('console.security.passwordMin'));
      return;
    }
    if (newPassword !== confirmPassword) {
      setStatus('error');
      setMessage(t('console.security.passwordMismatch'));
      return;
    }

    const result = await updatePassword({ currentPassword, newPassword, confirmPassword });
    if (result.success) {
      setStatus('success');
      setMessage(t('console.security.success'));
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } else {
      setStatus('error');
      setMessage(result.error || t('console.security.error'));
    }
  };

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">{t('console.security.title')}</h2>
        <p className="text-sm text-[var(--color-text-secondary)]">{t('console.security.description')}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--color-text-secondary)]">{t('console.security.currentPassword')}</label>
          <Input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder={t('console.security.currentPassword')}
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--color-text-secondary)]">{t('console.security.newPassword')}</label>
          <Input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder={t('console.security.passwordMin')}
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-[var(--color-text-secondary)]">{t('console.security.confirmPassword')}</label>
          <Input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder={t('console.security.confirmPassword')}
          />
        </div>

        {message && (
          <p className={`text-xs ${status === 'success' ? 'text-green-500' : 'text-red-500'}`}>{message}</p>
        )}

        <div className="pt-2">
          <Button type="submit" loading={status === 'loading'}>{t('console.security.submit')}</Button>
        </div>
      </form>
    </section>
  );
}
