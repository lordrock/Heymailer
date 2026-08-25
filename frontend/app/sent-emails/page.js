'use client';

import { useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import { Card, Badge, statusTone, Input, Select, EmptyState, Spinner } from '@/components/ui';
import api from '@/lib/api';
import { History, Search } from 'lucide-react';
import { format } from 'date-fns';

const STATUSES = ['All', 'sent', 'failed', 'bounced', 'complained', 'pending'];

export default function SentEmailsPage() {
  const [logs, setLogs] = useState(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('All');
  const [search, setSearch] = useState('');
  const limit = 25;

  const load = async () => {
    const { data } = await api.get('/email-logs', { params: { status, search: search || undefined, page, limit } });
    setLogs(data.logs);
    setTotal(data.total);
  };

  useEffect(() => { load(); }, [status, page]);
  useEffect(() => {
    const t = setTimeout(() => { setPage(1); load(); }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <AppShell title="Sent Emails">
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
          <Input placeholder="Search recipient email…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={status} onChange={(e) => setStatus(e.target.value)} className="sm:w-44">
          {STATUSES.map((s) => <option key={s} value={s}>{s === 'All' ? 'All Statuses' : s}</option>)}
        </Select>
      </div>

      {!logs ? (
        <div className="flex justify-center py-20"><Spinner size={28} /></div>
      ) : logs.length === 0 ? (
        <Card><EmptyState icon={History} title="No sent emails yet" description="Once campaigns or test emails go out, they'll appear here." /></Card>
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-ink-faint uppercase tracking-wide border-b border-surface-line">
                <th className="px-5 py-3 font-semibold">Recipient</th>
                <th className="px-5 py-3 font-semibold">Subject</th>
                <th className="px-5 py-3 font-semibold">Campaign</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold">Sent At</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log._id} className="border-b border-surface-line last:border-0 hover:bg-surface">
                  <td className="px-5 py-3 text-ink">{log.recipientEmail}</td>
                  <td className="px-5 py-3 text-ink-soft truncate max-w-xs">{log.subject || '—'}</td>
                  <td className="px-5 py-3 text-ink-soft">{log.campaignId?.name || (log.isTest ? 'Test send' : '—')}</td>
                  <td className="px-5 py-3"><Badge tone={statusTone(log.status)}>{log.status}</Badge></td>
                  <td className="px-5 py-3 text-ink-soft">{log.sentAt ? format(new Date(log.sentAt), 'MMM d, h:mm a') : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex items-center justify-between px-5 py-3 border-t border-surface-line text-xs text-ink-soft">
            <span>{total} logged emails</span>
            <div className="flex gap-2">
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="px-2 py-1 disabled:opacity-40">Previous</button>
              <span className="px-2 py-1">{page} / {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="px-2 py-1 disabled:opacity-40">Next</button>
            </div>
          </div>
        </Card>
      )}
    </AppShell>
  );
}
