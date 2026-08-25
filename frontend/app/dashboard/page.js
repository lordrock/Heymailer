'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AppShell from '@/components/AppShell';
import { Card, Badge, statusTone, EmptyState, Spinner } from '@/components/ui';
import api from '@/lib/api';
import { Mail, CheckCircle2, XCircle, Users, FileStack, ArrowUpRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

function StatCard({ label, value, icon: Icon, tone }) {
  const tones = {
    emerald: 'bg-emerald-50 text-emerald-700',
    danger: 'bg-danger-bg text-danger',
    slate: 'bg-slate-bg text-slate',
    amber: 'bg-amber-bg text-amber',
  };
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-3">
        <span className={`w-9 h-9 rounded-lg flex items-center justify-center ${tones[tone]}`}>
          <Icon size={17} />
        </span>
      </div>
      <p className="text-2xl font-bold text-ink">{value}</p>
      <p className="text-xs text-ink-soft mt-1">{label}</p>
    </Card>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get('/dashboard/summary').then((res) => setData(res.data)).catch(() => setData({}));
  }, []);

  return (
    <AppShell title="Dashboard">
      {!data ? (
        <div className="flex justify-center py-20"><Spinner size={28} /></div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <StatCard label="Emails Sent" value={data.emailsSent ?? 0} icon={Mail} tone="emerald" />
            <StatCard label="Successful" value={data.emailsSent ?? 0} icon={CheckCircle2} tone="emerald" />
            <StatCard label="Failed" value={data.failed ?? 0} icon={XCircle} tone="danger" />
            <StatCard label="Contacts" value={data.contacts ?? 0} icon={Users} tone="slate" />
            <StatCard label="Templates" value={data.templates ?? 0} icon={FileStack} tone="amber" />
          </div>

          <div className="grid lg:grid-cols-3 gap-5">
            <Card className="lg:col-span-2 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-ink">Recent Campaigns</h2>
                <Link href="/campaigns" className="text-xs font-semibold text-emerald-600 flex items-center gap-1 hover:underline">
                  View all <ArrowUpRight size={13} />
                </Link>
              </div>
              {!data.recentCampaigns?.length ? (
                <EmptyState icon={Mail} title="No campaigns yet" description="Compose your first email to get started." />
              ) : (
                <div className="space-y-1">
                  {data.recentCampaigns.map((c) => (
                    <Link
                      key={c._id}
                      href={`/campaigns/${c._id}`}
                      className="flex items-center justify-between px-3 py-3 rounded-lg hover:bg-surface transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-ink truncate">{c.name}</p>
                        <p className="text-xs text-ink-soft">
                          {c.sentCount}/{c.recipientCount} sent · {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}
                        </p>
                      </div>
                      <Badge tone={statusTone(c.status)}>{c.status}</Badge>
                    </Link>
                  ))}
                </div>
              )}
            </Card>

            <Card className="p-6">
              <h2 className="text-sm font-bold text-ink mb-4">Recent Sends</h2>
              {!data.recentSends?.length ? (
                <p className="text-xs text-ink-soft">Nothing sent yet.</p>
              ) : (
                <div className="space-y-3">
                  {data.recentSends.map((log) => (
                    <div key={log._id} className="flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-ink truncate">{log.recipientEmail}</p>
                        <p className="text-[11px] text-ink-soft truncate">{log.campaignId?.name || (log.isTest ? 'Test send' : '—')}</p>
                      </div>
                      <Badge tone={statusTone(log.status)}>{log.status}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {data.drafts?.length > 0 && (
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-bold text-ink">Saved Drafts</h2>
                <Link href="/drafts" className="text-xs font-semibold text-emerald-600 flex items-center gap-1 hover:underline">
                  View all <ArrowUpRight size={13} />
                </Link>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {data.drafts.map((d) => (
                  <Link
                    key={d._id}
                    href={`/campaigns/compose?draftId=${d._id}`}
                    className="border border-surface-line rounded-lg px-4 py-3 hover:border-emerald-600 transition-colors"
                  >
                    <p className="text-sm font-semibold text-ink truncate">{d.name}</p>
                    <p className="text-[11px] text-ink-soft mt-0.5">
                      Updated {formatDistanceToNow(new Date(d.updatedAt), { addSuffix: true })}
                    </p>
                  </Link>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}
    </AppShell>
  );
}
