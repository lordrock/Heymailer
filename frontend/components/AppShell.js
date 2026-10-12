'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import clsx from 'clsx';
import {
  LayoutDashboard, Megaphone, PenSquare, FileStack, Users, UsersRound,
  FileClock, History, Settings as SettingsIcon, LogOut, Menu, CreditCard, ShieldCheck, Building2, AlertTriangle, Inbox,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';

const CUSTOMER_NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/campaigns', label: 'Campaigns', icon: Megaphone },
  { href: '/campaigns/compose', label: 'Compose Email', icon: PenSquare },
  { href: '/templates', label: 'Templates', icon: FileStack },
  { href: '/contacts', label: 'Contacts', icon: Users },
  { href: '/contact-groups', label: 'Contact Groups', icon: UsersRound },
  { href: '/drafts', label: 'Drafts', icon: FileClock },
  { href: '/sent-emails', label: 'Sent Emails', icon: History },
  { href: '/settings', label: 'Settings', icon: SettingsIcon },
  { href: '/billing', label: 'Billing', icon: CreditCard },
];

const SUPER_ADMIN_NAV = [
  { href: '/super-admin/billing', label: 'Billing Control', icon: ShieldCheck },
  { href: '/super-admin/workspaces', label: 'Workspaces', icon: Building2 },
  { href: '/super-admin/deliverability', label: 'Deliverability', icon: Inbox },
];

function Logo() {
  return (
    <div className="flex items-center gap-2.5 px-1">
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <rect width="32" height="32" rx="8" fill="#EAF8F1" />
        <rect x="6.5" y="9.5" width="19" height="14" rx="2.5" fill="#0B7A53" />
        <path d="m8 11 6.6 5.3a2.2 2.2 0 0 0 2.8 0L24 11" stroke="#EAF8F1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="25" cy="8" r="4" fill="#FBBF24" stroke="#062F24" />
        <path d="m23.5 8 1 1 2-2" stroke="#062F24" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div>
        <p className="text-white text-sm font-bold leading-none">HeyMailer</p>
        <p className="text-emerald-100/60 text-[10px] font-medium tracking-wide mt-0.5">EMAIL SERVICES</p>
      </div>
    </div>
  );
}

function SidebarContent({ pathname, onNavigate }) {
  const { admin, logout } = useAuth();
  const navigation = admin?.role === 'superadmin' ? SUPER_ADMIN_NAV : CUSTOMER_NAV;
  return (
    <div className="flex flex-col h-full bg-emerald-deep">
      <div className="px-5 py-6">
        <Logo />
      </div>
      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
        {navigation.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              className={clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors relative',
                isActive ? 'bg-white/10 text-white' : 'text-emerald-100/70 hover:bg-white/5 hover:text-white'
              )}
            >
              {isActive && <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full bg-emerald-100" />}
              <Icon size={17} strokeWidth={2} />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="px-3 py-4 border-t border-white/10">
        <div className="flex items-center gap-2.5 px-3 py-2">
          <div className="w-8 h-8 rounded-full bg-emerald-100/20 flex items-center justify-center text-white text-xs font-bold">
            {admin?.name?.[0]?.toUpperCase() || 'A'}
          </div>
          <div className="min-w-0">
            <p className="text-white text-xs font-semibold truncate">{admin?.name}</p>
            <p className="text-emerald-100/50 text-[11px] truncate">{admin?.email}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="mt-1 w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-emerald-100/70 hover:bg-white/5 hover:text-white transition-colors"
        >
          <LogOut size={17} /> Log out
        </button>
      </div>
    </div>
  );
}

export default function AppShell({ title, actions, children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { loading, admin, access } = useAuth();
  const wrongRoleArea = Boolean(admin) && (
    (admin.role === 'superadmin' && !pathname.startsWith('/super-admin/')) ||
    (admin.role !== 'superadmin' && pathname.startsWith('/super-admin/'))
  );

  useEffect(() => {
    if (!wrongRoleArea) return;
    router.replace(admin.role === 'superadmin' ? '/super-admin/billing' : '/dashboard');
  }, [admin, router, wrongRoleArea]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-surface text-ink-soft text-sm">Loading…</div>;
  }
  if (!admin || wrongRoleArea) return null;
  const restricted = admin.role !== 'superadmin' && access?.state && access.state !== 'active';
  const billingAllowed = access?.state === 'payment_required' && pathname === '/billing';
  const lockContent = restricted && !billingAllowed;

  return (
    <div className="min-h-screen flex bg-surface">
      <aside className="hidden lg:block w-64 shrink-0">
        <div className="fixed w-64 h-screen">
          <SidebarContent pathname={pathname} />
        </div>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-64">
            <SidebarContent pathname={pathname} onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex-1 min-w-0">
        <header className="sticky top-0 z-30 bg-surface/90 backdrop-blur border-b border-surface-line">
          <div className="flex items-center justify-between px-5 lg:px-8 py-4">
            <div className="flex items-center gap-3">
              <button className="lg:hidden text-ink" onClick={() => setMobileOpen(true)}>
                <Menu size={22} />
              </button>
              <h1 className="text-lg font-bold text-ink">{title}</h1>
            </div>
            <div className="flex items-center gap-2">{actions}</div>
          </div>
        </header>
        <main className="px-5 lg:px-8 py-6">
          {restricted && <div className={`mb-5 rounded-xl border px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${access.state === 'suspended' ? 'border-red-200 bg-red-50 text-red-800' : 'border-amber-200 bg-amber-50 text-amber-900'}`}><div className="flex gap-3"><AlertTriangle size={19} className="shrink-0 mt-0.5"/><div><p className="text-sm font-bold">{access.state === 'suspended' ? 'Workspace suspended' : 'Subscription required'}</p><p className="text-xs mt-0.5">{access.state === 'suspended' ? 'Your account remains available, but workspace features are locked. Contact HeyMailer support.' : 'Choose a plan and submit your payment to activate workspace features.'}</p></div></div>{access.state === 'payment_required' ? <Link href="/billing" className="text-xs font-bold underline shrink-0">Open billing</Link> : <a href="mailto:savings.heymailer@gmail.com" className="text-xs font-bold underline shrink-0">Contact support</a>}</div>}
          <div className={lockContent ? 'relative min-h-[420px]' : ''}>
            {lockContent && <div className="absolute inset-0 z-20 rounded-xl bg-white/65 backdrop-blur-[2px] flex items-center justify-center"><div className="max-w-sm text-center px-6"><AlertTriangle className="mx-auto text-amber-600" size={30}/><p className="mt-3 font-bold text-ink">This area is temporarily locked</p><p className="mt-1 text-sm text-ink-soft">{access.state === 'suspended' ? 'Contact support to restore your workspace.' : 'Activate a plan from Billing to continue.'}</p></div></div>}
            <div className={lockContent ? 'pointer-events-none select-none opacity-35' : ''}>{children}</div>
          </div>
        </main>
      </div>
    </div>
  );
}
