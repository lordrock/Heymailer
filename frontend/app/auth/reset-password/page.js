'use client';

export const dynamic = 'force-dynamic';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import api, { errMsg } from '@/lib/api';
import { Button, Input } from '@/components/ui';

export default function ResetPasswordPage() {
  return <Suspense fallback={<main className="min-h-screen bg-emerald-deep flex items-center justify-center p-6"><p className="text-white">Loading password reset…</p></main>}><ResetPasswordContent/></Suspense>;
}

function ResetPasswordContent() {
  const token = useSearchParams().get('token'); const router = useRouter();
  const [password, setPassword] = useState(''); const [confirm, setConfirm] = useState(''); const [error, setError] = useState(''); const [done, setDone] = useState(false); const [saving, setSaving] = useState(false);
  const submit = async (event) => { event.preventDefault(); setError(''); if (!token) return setError('This reset link is missing its token.'); if (password !== confirm) return setError('Passwords do not match.'); setSaving(true); try { await api.post('/auth/reset-password', { token, password }); setDone(true); setTimeout(() => router.replace('/login'), 1000); } catch (err) { setError(errMsg(err)); } finally { setSaving(false); } };
  return <main className="min-h-screen bg-emerald-deep flex items-center justify-center p-6"><form onSubmit={submit} className="bg-white rounded-card shadow-pop max-w-md w-full p-8"><h1 className="text-xl font-bold text-ink">Create a new password</h1><p className="text-sm text-ink-soft mt-2">Choose a new password for your HeyMailer account.</p><div className="space-y-4 mt-6"><Input label="New password" type="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} required/><Input label="Confirm password" type="password" minLength={8} value={confirm} onChange={(e) => setConfirm(e.target.value)} required/>{error && <p className="text-xs text-danger bg-danger-bg rounded-lg px-3 py-2">{error}</p>}{done && <p className="text-xs text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">Password updated. Redirecting to sign in…</p>}<Button className="w-full" disabled={saving || done}>{saving ? 'Updating…' : 'Update password'}</Button></div></form></main>;
}
