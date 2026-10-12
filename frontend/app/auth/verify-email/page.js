'use client';

export const dynamic = 'force-dynamic';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button, Spinner } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { CheckCircle2, XCircle } from 'lucide-react';

export default function VerifyEmailPage() {
  return <Suspense fallback={<AuthMessage loading/>}><VerifyEmailContent/></Suspense>;
}

function VerifyEmailContent() {
  const params = useSearchParams();
  const router = useRouter();
  const { completeTokenAuth } = useAuth();
  const started = useRef(false);
  const [state, setState] = useState({ loading: true, error: '', message: '' });
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const token = params.get('token');
    if (!token) return setState({ loading: false, error: 'This verification link is missing its token.', message: '' });
    completeTokenAuth('/auth/verify-email', token).then((result) => {
      setState({ loading: false, error: '', message: result.message });
      setTimeout(() => router.replace(result.admin?.role === 'superadmin' ? '/super-admin/billing' : '/dashboard'), 900);
    }).catch((err) => setState({ loading: false, error: err?.response?.data?.message || 'This verification link is invalid or expired.', message: '' }));
  }, [completeTokenAuth, params, router]);
  return <AuthMessage loading={state.loading} error={state.error} message={state.message} onReturn={() => router.push('/login')} />;
}

function AuthMessage({ loading, error, message, onReturn }) { return <main className="min-h-screen bg-emerald-deep flex items-center justify-center p-6"><div className="bg-white rounded-card shadow-pop max-w-md w-full p-8 text-center">{loading ? <><Spinner size={30} className="mx-auto"/><h1 className="font-bold text-ink mt-5">Verifying your email…</h1></> : error ? <><XCircle className="mx-auto text-danger" size={38}/><h1 className="font-bold text-ink mt-4">Verification failed</h1><p className="text-sm text-ink-soft mt-2">{error}</p><Button className="mt-6" onClick={onReturn}>Return to sign in</Button></> : <><CheckCircle2 className="mx-auto text-emerald-600" size={38}/><h1 className="font-bold text-ink mt-4">Email verified</h1><p className="text-sm text-ink-soft mt-2">{message || 'Your workspace is ready.'}</p></>}</div></main>; }
