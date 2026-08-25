'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import {
  LayoutDashboard, Megaphone, PenSquare, FileStack, Users, UsersRound,
  FileClock, History, Settings as SettingsIcon, LogOut, Menu, X,
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '@/lib/auth';

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/campaigns', label: 'Campaigns', icon: Megaphone },
  { href: '/campaigns/compose', label: 'Compose Email', icon: PenSquare },
  { href: '/templates', label: 'Templates', icon: FileStack },
  { href: '/contacts', label: 'Contacts', icon: Users },
  { href: '/contact-groups', label: 'Contact Groups', icon: UsersRound },
  { href: '/drafts', label: 'Drafts', icon: FileClock },
  { href: '/sent-emails', label: 'Sent Emails', icon: History },
  { href: '/settings', label: 'Settings', icon: SettingsIcon },
];

function Logo() {
  return (
    <div className="flex items-center gap-2.5 px-1">
      <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
        <circle cx="15" cy="15" r="13" stroke="#0B7A53" strokeWidth="2" strokeDasharray="4 3.4" />
        <circle cx="15" cy="15" r="6.5" fill="#0B7A53" />
      </svg>
      <div>
        <p className="text-white text-sm font-bold leading-none">RoundTable</p>
        <p className="text-emerald-100/60 text-[10px] font-medium tracking-wide mt-0.5">EMAIL STUDIO</p>
      </div>
    </div>
  );
}

function SidebarContent({ pathname, onNavigate }) {
  const { admin, logout } = useAuth();
  return (
    <div className="flex flex-col h-full bg-emerald-deep">
      <div className="px-5 py-6">
        <Logo />
      </div>
      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(href) && href !== '/campaigns/compose') || pathname === href;
          const isActive = pathname === href;
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
  const [mobileOpen, setMobileOpen] = useState(false);
  const { loading, admin } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-surface text-ink-soft text-sm">Loading…</div>;
  }
  if (!admin) return null;

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
        <main className="px-5 lg:px-8 py-6">{children}</main>
      </div>
    </div>
  );
}
