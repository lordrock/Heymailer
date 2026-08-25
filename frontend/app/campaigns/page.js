'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AppShell from '@/components/AppShell';
import { Card, Button, Badge, statusTone, Select, EmptyState, Spinner } from '@/components/ui';
import api from '@/lib/api';
import { Plus, Megaphone } from 'lucide-react';
import { format } from 'date-fns';

const STATUSES = ['All', 'draft', 'scheduled', 'sending', 'completed', 'failed', 'cancelled'];

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState(null);
  const [status, setStatus] = useState('All');

  useEffect(() => {
    api.get('/campaigns', { params: { status } }).then((res) => setCampaigns(res.data.campaigns));
  }, [status]);

  return (
    <AppShell
      title="Campaigns"
      actions={
        <Link href="/campaigns/compose">
          <Button><Plus size={15} /> New Campaign</Button>
        </Link>
      }
    >
      <div className="mb-5">
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="w-48">
          {STATUSES.map((s) => <option key={s} value={s}>{s === 'All' ? 'All Statuses' : s}</option>)}
        </Select>
      </div>

      {!campaigns ? (
        <div className="flex justify-center py-20"><Spinner size={28} /></div>
      ) : campaigns.length === 0 ? (
        <Card>
          <EmptyState
            icon={Megaphone}
            title="No campaigns yet"
            description="Compose your first email campaign to get started."
            action={<Link href="/campaigns/compose"><Button><Plus size={15} /> New Campaign</Button></Link>}
          />
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-ink-faint uppercase tracking-wide border-b border-surface-line">
                <th className="px-5 py-3 font-semibold">Campaign</th>
                <th className="px-5 py-3 font-semibold">Template</th>
                <th className="px-5 py-3 font-semibold">Recipients</th>
                <th className="px-5 py-3 font-semibold">Sent / Failed</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold">Created</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c) => (
                <tr key={c._id} className="border-b border-surface-line last:border-0 hover:bg-surface transition-colors">
                  <td className="px-5 py-3.5">
                    <Link href={`/campaigns/${c._id}`} className="font-semibold text-ink hover:text-emerald-600">{c.name}</Link>
                    <p className="text-xs text-ink-soft truncate max-w-xs">{c.subject}</p>
                  </td>
                  <td className="px-5 py-3.5 text-ink-soft">{c.templateId?.name || '—'}</td>
                  <td className="px-5 py-3.5 text-ink-soft">{c.recipientCount}</td>
                  <td className="px-5 py-3.5 text-ink-soft">{c.sentCount} / {c.failedCount}</td>
                  <td className="px-5 py-3.5"><Badge tone={statusTone(c.status)}>{c.status}</Badge></td>
                  <td className="px-5 py-3.5 text-ink-soft">{format(new Date(c.createdAt), 'MMM d, yyyy')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </AppShell>
  );
}
