'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button, Spinner } from '@/components/ui';
import { useAuth } from '@/lib/auth';

export default function MagicLinkPage() {
  const params = useSearchParams(); const router = useRouter(); const { completeTokenAuth } = useAuth();
  const [error, setError] = useState('');
  useEffect(() => { const token = params.get('token'); if (!token) { setError('This sign-in link is missing its token.'); return; } completeTokenAuth('/auth/magic-link/consume', token).then(() => router.replace('/billing')).catch((err) => setError(err?.response?.data?.message || 'This sign-in link is invalid or expired.')); }, [completeTokenAuth, params, router]);
  return <main className="min-h-screen bg-emerald-deep flex items-center justify-center p-6"><div className="bg-white rounded-card shadow-pop max-w-md w-full p-8 text-center">{error ? <><h1 className="font-bold text-ink">Sign-in link unavailable</h1><p className="text-sm text-ink-soft mt-2">{error}</p><Button className="mt-6" onClick={() => { window.location.href = '/login'; }}>Return to sign in</Button></> : <><Spinner size={30} className="mx-auto"/><h1 className="font-bold text-ink mt-5">Signing you in securely…</h1></>}</div></main>;
}
