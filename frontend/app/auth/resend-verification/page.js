'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, ArrowRight, BadgeCheck, MailCheck, ShieldCheck } from 'lucide-react';
import api, { errMsg } from '@/lib/api';
import { Button, Input, Spinner } from '@/components/ui';

function BrandMark() {
  return <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-pop"><svg width="31" height="31" viewBox="0 0 32 32" fill="none" aria-hidden="true"><rect x="4" y="7" width="24" height="18" rx="4" fill="#0B7A53"/><path d="m6 9.5 8.5 6.7a2.4 2.4 0 0 0 3 0L26 9.5" stroke="#EAF8F1" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/><circle cx="26" cy="6" r="4.5" fill="#FBBF24" stroke="white" strokeWidth="1.5"/></svg></div>;
}

export default function ResendVerificationPage() {
  return <Suspense fallback={<main className="min-h-screen bg-emerald-deep flex items-center justify-center"><Spinner size={30} className="text-white"/></main>}><ResendVerificationContent/></Suspense>;
}

function ResendVerificationContent() {
  const params = useSearchParams();
  const [email, setEmail] = useState(() => params.get('email') || '');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');
    try {
      const response = await api.post('/auth/resend-verification', { email });
      setMessage(response.data?.message || 'If that account exists, a verification email has been sent.');
    } catch (err) {
      setError(errMsg(err, 'We could not send the verification email. Please try again.'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f6f8f7] grid lg:grid-cols-[.9fr_1.1fr]">
      <section className="relative overflow-hidden bg-emerald-deep px-6 py-10 text-white sm:px-12 lg:flex lg:items-center lg:px-16">
        <div className="absolute -right-40 -top-44 h-96 w-96 rounded-full bg-emerald-600/30" />
        <div className="absolute -bottom-44 -left-40 h-96 w-96 rounded-full border border-white/10" />
        <div className="relative mx-auto w-full max-w-lg">
          <div className="flex items-center gap-3"><BrandMark/><div><p className="text-lg font-bold">HeyMailer</p><p className="text-[10px] tracking-[.22em] text-emerald-100/60">EMAIL SERVICES</p></div></div>
          <div className="mt-14 lg:mt-20">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10"><BadgeCheck size={24} className="text-emerald-100"/></div>
            <h1 className="mt-6 text-4xl font-bold tracking-tight">Verify your email.<br/><span className="text-emerald-100">Protect your workspace.</span></h1>
            <p className="mt-5 max-w-md text-sm leading-7 text-emerald-100/70">Email verification confirms that only you can activate your HeyMailer workspace and access its audience data.</p>
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/[.06] p-4"><MailCheck size={18} className="text-emerald-100"/><p className="mt-3 text-sm font-semibold">Fresh secure link</p><p className="mt-1 text-xs leading-5 text-emerald-100/60">Valid for 24 hours</p></div>
              <div className="rounded-2xl border border-white/10 bg-white/[.06] p-4"><ShieldCheck size={18} className="text-emerald-100"/><p className="mt-3 text-sm font-semibold">Single-use token</p><p className="mt-1 text-xs leading-5 text-emerald-100/60">Stored securely and hashed</p></div>
            </div>
          </div>
        </div>
      </section>

      <section className="flex items-center justify-center px-6 py-12 sm:px-12">
        <div className="w-full max-w-md rounded-card border border-surface-line bg-white p-8 shadow-pop sm:p-10">
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-600">Account verification</p>
          <h2 className="mt-2 text-3xl font-bold text-ink">Send a fresh verification link</h2>
          <p className="mt-3 text-sm leading-6 text-ink-soft">Enter the email address used to create your HeyMailer account.</p>
          <form onSubmit={submit} className="mt-7 space-y-4">
            <Input label="Email address" type="email" required autoFocus autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@company.com" />
            {message && <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-xs leading-5 text-emerald-700">{message}</div>}
            {error && <p className="rounded-lg bg-danger-bg px-3 py-2 text-xs text-danger">{error}</p>}
            <Button type="submit" size="lg" className="w-full" disabled={loading}>{loading ? 'Sending…' : 'Resend verification email'} {!loading && <ArrowRight size={16}/>}</Button>
          </form>
          <Link className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 hover:underline" href="/login"><ArrowLeft size={15}/>Back to sign in</Link>
        </div>
      </section>
    </main>
  );
}
