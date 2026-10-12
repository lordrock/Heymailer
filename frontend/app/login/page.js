'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { errMsg } from '@/lib/api';
import api from '@/lib/api';
import { Button, Input } from '@/components/ui';
import { ArrowRight, Check, Eye, EyeOff, Lock, MailCheck, ShieldCheck, Sparkles } from 'lucide-react';

function BrandMark() {
  return <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-pop"><svg width="31" height="31" viewBox="0 0 32 32" fill="none" aria-hidden="true"><rect x="4" y="7" width="24" height="18" rx="4" fill="#0B7A53"/><path d="m6 9.5 8.5 6.7a2.4 2.4 0 0 0 3 0L26 9.5" stroke="#EAF8F1" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/><circle cx="26" cy="6" r="4.5" fill="#FBBF24" stroke="white" strokeWidth="1.5"/></svg></div>;
}

export default function LoginPage() {
  const { login, signup, admin } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', workspaceName: '', email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [verificationRequired, setVerificationRequired] = useState(false);
  const [loading, setLoading] = useState(false);
  const [plans, setPlans] = useState([]);

  useEffect(() => { api.get('/billing/plans').then(({ data }) => setPlans(data.plans)).catch(() => {}); }, []);
  useEffect(() => { if (admin) router.replace(admin.role === 'superadmin' ? '/super-admin/billing' : '/dashboard'); }, [admin, router]);
  if (admin) return null;

  const submit = async (e) => {
    e.preventDefault(); setError(''); setNotice(''); setVerificationRequired(false); setLoading(true);
    try {
      if (mode === 'forgot') {
        await api.post('/auth/forgot-password', { email: form.email });
        setNotice('If that account exists, password-reset instructions have been sent.');
        return;
      }
      if (mode === 'signup') {
        const result = await signup(form);
        if (result.verificationRequired) {
          if (result.emailSent) setNotice(`We sent a verification link to ${result.email}. Open it to activate your workspace.`);
          else setError('Your account was created, but HeyMailer could not send the verification email. Ask an administrator to check platform mail, then use Resend verification.');
          return;
        }
        router.replace('/dashboard');
      } else {
        const account = await login(form.email, form.password);
        router.replace(account.role === 'superadmin' ? '/super-admin/billing' : '/dashboard');
      }
    } catch (err) { setVerificationRequired(err?.response?.data?.code === 'EMAIL_NOT_VERIFIED'); setError(errMsg(err, mode === 'login' ? 'Invalid email or password.' : 'Could not create your account.')); } finally { setLoading(false); }
  };

  return <main className="min-h-screen bg-[#f6f8f7] lg:grid lg:grid-cols-[1.08fr_.92fr]">
    <section className="relative overflow-hidden bg-emerald-deep text-white px-6 py-8 sm:px-10 lg:px-14 lg:py-12">
      <div className="absolute w-96 h-96 rounded-full bg-emerald-600/30 -right-44 -top-40"/><div className="absolute w-80 h-80 rounded-full border border-white/10 -left-48 bottom-8"/>
      <div className="relative max-w-2xl mx-auto">
        <div className="flex items-center gap-3"><BrandMark/><div><p className="font-bold text-lg">HeyMailer</p><p className="text-[10px] tracking-[.22em] text-emerald-100/60">EMAIL SERVICES</p></div></div>
        <div className="mt-12 lg:mt-20"><span className="inline-flex items-center gap-2 text-xs font-semibold text-emerald-100 bg-white/10 rounded-full px-3 py-1.5"><Sparkles size={13}/> Built for teams ready to grow</span><h1 className="text-4xl sm:text-5xl font-bold tracking-tight leading-[1.08] mt-5">Every campaign.<br/><span className="text-emerald-100">One focused workspace.</span></h1><p className="text-emerald-100/70 text-base leading-7 mt-5 max-w-xl">Build audiences, create polished emails, manage delivery and understand every send without stitching together multiple tools.</p></div>
        <div className="grid sm:grid-cols-3 gap-3 mt-9">{[[MailCheck,'Campaign tools','Create, personalise and send'],[ShieldCheck,'Secure delivery','Your provider, your credentials'],[Lock,'Private workspace','Your contacts stay isolated']].map(([Icon,title,text]) => <div key={title} className="bg-white/[.07] border border-white/10 rounded-2xl p-4"><Icon size={18} className="text-emerald-100"/><p className="text-sm font-semibold mt-3">{title}</p><p className="text-[11px] leading-5 text-emerald-100/55 mt-1">{text}</p></div>)}</div>
        <div className="mt-10"><div className="flex items-end justify-between"><div><p className="text-xs font-semibold uppercase tracking-wider text-emerald-100/55">Simple pricing</p><h2 className="text-lg font-bold mt-1">Choose what fits today. Upgrade as you grow.</h2></div><p className="hidden sm:block text-xs text-emerald-100/50">Paid securely with crypto</p></div><div className="grid sm:grid-cols-3 gap-3 mt-4">{(plans.length ? plans : [{name:'Starter',priceUsd:12,features:['500 contacts']},{name:'Growth',priceUsd:29,features:['5,000 contacts'],featured:true},{name:'Business',priceUsd:79,features:['25,000 contacts']}]).map((plan) => <div key={plan.name} className={`rounded-2xl p-4 border ${plan.featured ? 'bg-white text-ink border-white' : 'bg-white/[.06] border-white/10'}`}><div className="flex items-center justify-between"><p className="font-bold text-sm">{plan.name}</p>{plan.featured && <span className="text-[9px] uppercase font-bold text-emerald-700 bg-emerald-50 rounded-full px-2 py-1">Popular</span>}</div><p className="text-2xl font-bold mt-3">${plan.priceUsd}<span className={`text-xs font-normal ${plan.featured ? 'text-ink-soft' : 'text-emerald-100/55'}`}>/month</span></p><p className={`text-[11px] mt-2 flex items-center gap-1.5 ${plan.featured ? 'text-ink-soft' : 'text-emerald-100/60'}`}><Check size={12}/>{plan.features?.[0]}</p></div>)}</div></div>
      </div>
    </section>

    <section className="flex items-center justify-center px-6 py-12 sm:px-12">
      <div className="w-full max-w-md"><div><p className="text-xs font-bold uppercase tracking-widest text-emerald-600">{mode === 'login' ? 'Welcome back' : mode === 'forgot' ? 'Account recovery' : 'Start your workspace'}</p><h2 className="text-3xl font-bold text-ink mt-2">{mode === 'login' ? 'Sign in to HeyMailer' : mode === 'forgot' ? 'Reset your password' : 'Create your account'}</h2><p className="text-sm text-ink-soft mt-2">{mode === 'login' ? 'Continue managing your campaigns and audience.' : mode === 'forgot' ? 'Enter your email and we’ll send password-reset instructions.' : 'Set up your email workspace in less than a minute.'}</p></div>
        <div className="grid grid-cols-2 bg-surface-line/70 rounded-xl p-1 mt-8"><button className={`rounded-lg py-2 text-sm font-semibold ${mode === 'login' ? 'bg-white shadow-sm text-ink' : 'text-ink-soft'}`} onClick={() => {setMode('login');setError('');}}>Sign in</button><button className={`rounded-lg py-2 text-sm font-semibold ${mode === 'signup' ? 'bg-white shadow-sm text-ink' : 'text-ink-soft'}`} onClick={() => {setMode('signup');setError('');}}>Create account</button></div>
        <form onSubmit={submit} className="mt-6 space-y-4">{mode === 'signup' && <><Input label="Your name" value={form.name} onChange={(e) => setForm({...form,name:e.target.value})} placeholder="Ada Lovelace" required/><Input label="Workspace name" value={form.workspaceName} onChange={(e) => setForm({...form,workspaceName:e.target.value})} placeholder="Acme Marketing" required/></>}<Input label="Email address" type="email" value={form.email} onChange={(e) => setForm({...form,email:e.target.value})} placeholder="you@company.com" required/>{mode !== 'forgot' && <label className="block"><span className="block text-xs font-semibold text-ink-soft mb-1.5">Password</span><span className="relative block"><input className="w-full rounded-lg border border-surface-line bg-white px-3.5 py-2.5 pr-11 text-sm text-ink focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none" type={showPassword?'text':'password'} minLength={8} value={form.password} onChange={(e) => setForm({...form,password:e.target.value})} placeholder={mode === 'signup' ? 'At least 8 characters' : 'Your password'} required/><button type="button" className="absolute inset-y-0 right-0 w-11 flex items-center justify-center text-ink-faint" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword?'Hide password':'Show password'}>{showPassword?<EyeOff size={17}/>:<Eye size={17}/>}</button></span></label>}{error && <p className="text-xs text-danger bg-danger-bg rounded-lg px-3 py-2">{error}</p>}{verificationRequired && <Link className="block text-xs font-semibold text-emerald-700 hover:underline" href={`/auth/resend-verification?email=${encodeURIComponent(form.email)}`}>Resend verification email</Link>}{notice && <p className="text-xs text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">{notice}</p>}<Button type="submit" size="lg" className="w-full" disabled={loading}>{loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : mode === 'forgot' ? 'Send reset instructions' : 'Create workspace'} {!loading && <ArrowRight size={16}/>}</Button></form>
        {mode === 'login' && <div className="flex justify-between text-xs mt-4"><Link className="text-emerald-700 font-semibold hover:underline" href="/auth/magic-link/request">Email me a sign-in link</Link><button type="button" className="text-ink-soft hover:underline" onClick={() => { setMode('forgot'); setError(''); setNotice(''); }}>Forgot password?</button></div>}
        {mode === 'forgot' && <button type="button" className="block mx-auto text-xs text-emerald-700 font-semibold hover:underline mt-4" onClick={() => { setMode('login'); setError(''); setNotice(''); }}>Back to password sign in</button>}
        <p className="text-[11px] leading-5 text-center text-ink-faint mt-6">By continuing, you agree to responsible email use and permission-based sending. Payments are reviewed before subscription activation.</p>
      </div>
    </section>
  </main>;
}
