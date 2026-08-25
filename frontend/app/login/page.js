'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { errMsg } from '@/lib/api';
import { Button, Input } from '@/components/ui';
import { Eye, EyeOff, Lock } from 'lucide-react';

export default function LoginPage() {
  const { login, admin } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (admin) {
    router.replace('/dashboard');
    return null;
  }

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      router.replace('/dashboard');
    } catch (err) {
      setError(errMsg(err, 'Invalid email or password.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-emerald-deep flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center mb-4">
            <svg width="28" height="28" viewBox="0 0 30 30" fill="none">
              <circle cx="15" cy="15" r="13" stroke="#EAF8F1" strokeWidth="2" strokeDasharray="4 3.4" />
              <circle cx="15" cy="15" r="6.5" fill="#EAF8F1" />
            </svg>
          </div>
          <h1 className="text-white text-lg font-bold">RoundTable Email Studio</h1>
          <p className="text-emerald-100/50 text-xs mt-1">Internal communications dashboard</p>
        </div>

        <form onSubmit={submit} className="bg-white rounded-card shadow-pop p-7 space-y-4">
          <Input
            label="Email"
            type="email"
            placeholder="admin@roundtable.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
          />
          <label className="block">
            <span className="block text-xs font-semibold text-ink-soft mb-1.5">Password</span>
            <span className="relative block">
              <input
                className="w-full rounded-lg border border-surface-line bg-white px-3.5 py-2.5 pr-11 text-sm text-ink placeholder:text-ink-faint focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none transition-colors"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-ink-faint transition-colors hover:text-emerald-600 focus-visible:outline-none focus-visible:text-emerald-600"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                aria-pressed={showPassword}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </span>
          </label>
          {error && <p className="text-xs text-danger bg-danger-bg rounded-lg px-3 py-2">{error}</p>}
          <Button type="submit" className="w-full" disabled={loading}>
            <Lock size={15} /> {loading ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
        <p className="text-center text-emerald-100/40 text-[11px] mt-6">
          Access restricted to authorised RoundTable staff.
        </p>
      </div>
    </div>
  );
}
