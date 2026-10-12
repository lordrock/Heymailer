'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRight, MailCheck, ShieldCheck } from 'lucide-react';
import api, { errMsg } from '@/lib/api';
import { Button, Input } from '@/components/ui';

function BrandMark() {
  return <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-pop"><svg width="31" height="31" viewBox="0 0 32 32" fill="none" aria-hidden="true"><rect x="4" y="7" width="24" height="18" rx="4" fill="#0B7A53"/><path d="m6 9.5 8.5 6.7a2.4 2.4 0 0 0 3 0L26 9.5" stroke="#EAF8F1" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/><circle cx="26" cy="6" r="4.5" fill="#FBBF24" stroke="white" strokeWidth="1.5"/></svg></div>;
}

export default function RequestMagicLinkPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setLoading(true); setError('');
    try {
      await api.post('/auth/magic-link', { email });
      setSent(true);
    } catch (err) {
      setError(errMsg(err, 'We could not send the sign-in link. Please try again.'));
    } finally { setLoading(false); }
  }

  return (
    <main className="min-h-screen bg-[#f6f8f7] grid lg:grid-cols-[.9fr_1.1fr]">
      <section className="relative overflow-hidden bg-emerald-deep px-6 py-10 text-white sm:px-12 lg:flex lg:items-center lg:px-16">
        <div className="absolute -right-40 -top-44 h-96 w-96 rounded-full bg-emerald-600/30" />
        <div className="absolute -bottom-44 -left-40 h-96 w-96 rounded-full border border-white/10" />
        <div className="relative mx-auto w-full max-w-lg">
          <div className="flex items-center gap-3"><BrandMark/><div><p className="text-lg font-bold">HeyMailer</p><p className="text-[10px] tracking-[.22em] text-emerald-100/60">EMAIL SERVICES</p></div></div>
          <div className="mt-14 lg:mt-20">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10"><MailCheck size={24} className="text-emerald-100"/></div>
            <h1 className="mt-6 text-4xl font-bold tracking-tight">Passwordless sign-in,<br/><span className="text-emerald-100">delivered securely.</span></h1>
            <p className="mt-5 max-w-md text-sm leading-7 text-emerald-100/70">We’ll email a single-use link that expires after 15 minutes. No password is needed on this page.</p>
            <div className="mt-8 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[.06] p-4 text-sm text-emerald-100/80"><ShieldCheck size={20} className="shrink-0"/><span>The link works once and can only sign in to the account that requested it.</span></div>
          </div>
        </div>
      </section>

      <section className="flex items-center justify-center px-6 py-12 sm:px-12">
        <div className="w-full max-w-md rounded-card border border-surface-line bg-white p-8 shadow-pop sm:p-10">
          <p className="text-xs font-bold uppercase tracking-widest text-emerald-600">Secure access</p>
          <h2 className="mt-2 text-3xl font-bold text-ink">Email me a sign-in link</h2>
          <p className="mt-3 text-sm leading-6 text-ink-soft">Enter the email address attached to your HeyMailer workspace.</p>
          {!sent ? <form onSubmit={submit} className="mt-7 space-y-4">
            <Input label="Email address" type="email" required autoFocus autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@company.com" />
            {error && <p className="rounded-lg bg-danger-bg px-3 py-2 text-xs text-danger">{error}</p>}
            <Button type="submit" size="lg" className="w-full" disabled={loading}>{loading ? 'Sending…' : 'Send sign-in link'} {!loading && <ArrowRight size={16}/>}</Button>
          </form> : <div className="mt-7 rounded-xl border border-emerald-100 bg-emerald-50 p-4"><p className="text-sm font-semibold text-emerald-800">Check your inbox</p><p className="mt-1 text-xs leading-5 text-emerald-700">If an account exists for {email}, a secure sign-in link is on its way.</p></div>}
          <Link className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 hover:underline" href="/login"><ArrowLeft size={15}/>Back to password sign in</Link>
        </div>
      </section>
    </main>
  );
}
