import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Film } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuthStore } from '@/stores/authStore';

export function LoginPage() {
  const navigate = useNavigate();
  const login = useAuthStore((s) => s.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const ok = await login(email, password);
    setLoading(false);
    if (ok) navigate('/projects');
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
          AI-assisted short drama & video production tool
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--color-text-secondary)]">
              Email
            </label>
            <Input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--color-text-secondary)]">
              Password
            </label>
            <Input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full" loading={loading}>
            Log in
          </Button>
        </form>
        <p className="mt-4 text-center text-xs text-[var(--color-text-tertiary)]">
          Any email/password works (Mock mode)
        </p>
      </div>
    </div>
  );
}
