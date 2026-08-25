'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';
import { Card, Button, Badge, statusTone, Spinner } from '@/components/ui';
import api, { errMsg } from '@/lib/api';
import { XCircle, ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';

export default function CampaignDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [campaign, setCampaign] = useState(null);
  const [logs, setLogs] = useState([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data } = await api.get(`/campaigns/${id}`);
    setCampaign(data.campaign);
    const logsRes = await api.get('/email-logs', { params: { campaignId: id, limit: 50 } });
    setLogs(logsRes.data.logs);
  }, [id]);

  useEffect(() => {
    load();
    const interval = setInterval(() => {
      if (campaign?.status === 'sending') load();
    }, 8000);
    return () => clearInterval(interval);
  }, [load, campaign?.status]);

  const cancel = async () => {
    if (!confirm('Cancel this campaign? Pending sends will be marked as failed.')) return;
    setBusy(true);
    try {
      await api.post(`/campaigns/${id}/cancel`);
      load();
    } catch (err) {
      alert(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  if (!campaign) {
    return <AppShell title="Campaign"><div className="flex justify-center py-20"><Spinner size={28} /></div></AppShell>;
  }

  const progressPct = campaign.recipientCount
    ? Math.round(((campaign.sentCount + campaign.failedCount) / campaign.recipientCount) * 100)
    : 0;

  return (
    <AppShell
      title={campaign.name}
      actions={
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => router.push('/campaigns')}><ArrowLeft size={14} /> All Campaigns</Button>
          {campaign.status === 'sending' && (
            <Button variant="danger" size="sm" onClick={cancel} disabled={busy}><XCircle size={14} /> Cancel Sending</Button>
          )}
        </div>
      }
    >
      <div className="grid lg:grid-cols-3 gap-5 mb-6">
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <Badge tone={statusTone(campaign.status)}>{campaign.status}</Badge>
            <span className="text-xs text-ink-soft">Created {format(new Date(campaign.createdAt), 'MMM d, yyyy · h:mm a')}</span>
          </div>
          <h3 className="text-sm font-bold text-ink mb-1">{campaign.subject}</h3>
          <p className="text-xs text-ink-soft mb-4">{campaign.preheader}</p>

          {campaign.status === 'sending' && (
            <div className="mb-2">
              <div className="h-2 bg-surface-line rounded-full overflow-hidden">
                <div className="h-full bg-emerald-600 transition-all" style={{ width: `${progressPct}%` }} />
              </div>
              <p className="text-[11px] text-ink-soft mt-1.5">{progressPct}% processed — batching in progress, refreshing automatically</p>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3 mt-4">
            <div className="bg-surface rounded-lg p-3 text-center">
              <p className="text-lg font-bold text-ink">{campaign.recipientCount}</p>
              <p className="text-[11px] text-ink-soft">Recipients</p>
            </div>
            <div className="bg-emerald-50 rounded-lg p-3 text-center">
              <p className="text-lg font-bold text-emerald-700">{campaign.sentCount}</p>
              <p className="text-[11px] text-emerald-700/70">Sent</p>
            </div>
            <div className="bg-danger-bg rounded-lg p-3 text-center">
              <p className="text-lg font-bold text-danger">{campaign.failedCount}</p>
              <p className="text-[11px] text-danger/70">Failed</p>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="text-xs font-bold text-ink-soft uppercase tracking-wide mb-3">Details</h3>
          <dl className="space-y-2.5 text-sm">
            <div className="flex justify-between"><dt className="text-ink-soft">Sender</dt><dd className="font-medium text-ink">{campaign.senderName}</dd></div>
            <div className="flex justify-between"><dt className="text-ink-soft">Template</dt><dd className="font-medium text-ink">{campaign.templateId?.name || '—'}</dd></div>
            <div className="flex justify-between"><dt className="text-ink-soft">Batch Size</dt><dd className="font-medium text-ink">{campaign.batchSize}</dd></div>
            <div className="flex justify-between"><dt className="text-ink-soft">Batch Delay</dt><dd className="font-medium text-ink">{Math.round(campaign.batchDelayMs / 1000 / 60)} min</dd></div>
          </dl>
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="px-5 py-4 border-b border-surface-line">
          <h3 className="text-sm font-bold text-ink">Send Log</h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-ink-faint uppercase tracking-wide border-b border-surface-line">
              <th className="px-5 py-3 font-semibold">Recipient</th>
              <th className="px-5 py-3 font-semibold">Status</th>
              <th className="px-5 py-3 font-semibold">Sent At</th>
              <th className="px-5 py-3 font-semibold">Detail</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log._id} className="border-b border-surface-line last:border-0">
                <td className="px-5 py-3 text-ink">{log.recipientEmail}</td>
                <td className="px-5 py-3"><Badge tone={statusTone(log.status)}>{log.status}</Badge></td>
                <td className="px-5 py-3 text-ink-soft">{log.sentAt ? format(new Date(log.sentAt), 'MMM d, h:mm a') : '—'}</td>
                <td className="px-5 py-3 text-ink-soft text-xs truncate max-w-xs">{log.errorMessage || log.smtpResponse || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </AppShell>
  );
}
