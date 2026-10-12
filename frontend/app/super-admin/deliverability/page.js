'use client';

import { useCallback, useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import { Badge, Button, Card, Input, Select, Spinner } from '@/components/ui';
import api, { errMsg } from '@/lib/api';
import { CheckCircle2, Clipboard, Inbox, KeyRound, Plus, Trash2 } from 'lucide-react';

const presets = { gmail: 'imap.gmail.com', outlook: 'outlook.office365.com', yahoo: 'imap.mail.yahoo.com', aol: 'imap.aol.com', custom: '' };
const emptySeed = { provider: 'gmail', name: '', email: '', host: presets.gmail, port: 993, secure: true, username: '', password: '', enabled: true };

export default function DeliverabilityPage() {
  const [data, setData] = useState(null);
  const [secret, setSecret] = useState('');
  const [seed, setSeed] = useState(emptySeed);
  const [busy, setBusy] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const load = useCallback(() => api.get('/super-admin/deliverability/overview').then(({ data: next }) => setData(next)), []);
  useEffect(() => { load().catch((err) => setError(errMsg(err))); }, [load]);

  const saveWebhook = async (event) => {
    event.preventDefault(); setBusy('webhook'); setError('');
    try { const { data: result } = await api.put('/super-admin/deliverability/webhook', { signingSecret: secret }); setNotice(result.message); setSecret(''); await load(); }
    catch (err) { setError(errMsg(err)); } finally { setBusy(''); }
  };
  const saveSeed = async (event) => {
    event.preventDefault(); setBusy('seed'); setError('');
    try {
      const path = seed._id ? `/super-admin/deliverability/seeds/${seed._id}` : '/super-admin/deliverability/seeds';
      const { data: result } = await api[seed._id ? 'put' : 'post'](path, seed);
      setNotice(result.message); setSeed(emptySeed); await load();
    } catch (err) { setError(errMsg(err)); } finally { setBusy(''); }
  };
  const test = async (item) => {
    setBusy(`test-${item._id}`); setError('');
    try { const { data: result } = await api.post(`/super-admin/deliverability/seeds/${item._id}/test`); setNotice(result.message); await load(); }
    catch (err) { setError(errMsg(err)); await load(); } finally { setBusy(''); }
  };
  const remove = async (item) => {
    if (!confirm(`Remove ${item.email} from placement monitoring?`)) return;
    await api.delete(`/super-admin/deliverability/seeds/${item._id}`); setNotice('Seed mailbox removed.'); await load();
  };
  const edit = (item) => setSeed({ ...item, password: '' });
  const changeProvider = (provider) => setSeed({ ...seed, provider, host: presets[provider] });

  if (!data) return <AppShell title="Deliverability"><div className="flex justify-center py-24"><Spinner size={30} /></div></AppShell>;
  return <AppShell title="Deliverability"><div className="space-y-6 max-w-6xl">
    <div><h1 className="text-xl font-bold text-ink">Inbox placement and delivery events</h1><p className="text-sm text-ink-soft mt-1">Connect Resend for delivery events and controlled seed inboxes for folder-level placement estimates.</p></div>
    {(notice || error) && <div className={`rounded-xl px-4 py-3 text-sm ${error ? 'bg-danger-bg text-danger' : 'bg-emerald-50 text-emerald-700'}`}>{error || notice}</div>}
    <Card className="p-6">
      <div className="flex items-start gap-3"><div className="p-2 rounded-lg bg-emerald-50"><KeyRound size={18} className="text-emerald-700" /></div><div><h2 className="font-bold">Resend webhook</h2><p className="text-xs text-ink-soft mt-1">In Resend, create a webhook for this exact URL and subscribe to sent, delivered, delayed, bounced, complained, opened, clicked and failed events.</p></div></div>
      <div className="mt-4 flex flex-col sm:flex-row gap-2"><div className="flex-1 rounded-lg border border-surface-line bg-surface px-3.5 py-2.5 text-sm font-mono break-all">{data.webhook.url}</div><Button variant="secondary" onClick={() => navigator.clipboard.writeText(data.webhook.url)}><Clipboard size={15}/> Copy URL</Button></div>
      <div className="mt-3"><Badge tone={data.webhook.configured ? 'success' : 'warning'}>{data.webhook.configured ? 'Signing secret configured' : 'Signing secret required'}</Badge></div>
      <form onSubmit={saveWebhook} className="mt-5 flex flex-col sm:flex-row gap-3 items-end"><Input className="sm:min-w-96" label="Resend signing secret" type="password" value={secret} onChange={(e) => setSecret(e.target.value)} placeholder="whsec_…" required /><Button disabled={busy === 'webhook'}>{busy === 'webhook' ? 'Saving…' : 'Save secret'}</Button></form>
    </Card>
    <div className="grid lg:grid-cols-5 gap-5">
      <Card className="lg:col-span-2 p-6"><h2 className="font-bold flex gap-2 items-center"><Plus size={17}/> {seed._id ? 'Edit seed inbox' : 'Add seed inbox'}</h2><p className="text-xs text-ink-soft mt-1 mb-5">Use a controlled test mailbox and an app password where supported. HeyMailer never asks subscribers for mailbox access.</p><form onSubmit={saveSeed} className="space-y-4">
        <Select label="Provider" value={seed.provider} onChange={(e) => changeProvider(e.target.value)}>{Object.keys(presets).map((provider) => <option key={provider} value={provider}>{provider[0].toUpperCase() + provider.slice(1)}</option>)}</Select>
        <Input label="Display name" value={seed.name} onChange={(e) => setSeed({ ...seed, name: e.target.value })} placeholder="Gmail seed 1" required />
        <Input label="Mailbox email" type="email" value={seed.email} onChange={(e) => setSeed({ ...seed, email: e.target.value, username: seed.username || e.target.value })} required />
        <div className="grid grid-cols-3 gap-3"><Input className="col-span-2" label="IMAP host" value={seed.host} onChange={(e) => setSeed({ ...seed, host: e.target.value })} required /><Input label="Port" type="number" value={seed.port} onChange={(e) => setSeed({ ...seed, port: e.target.value })} required /></div>
        <Input label="IMAP username" value={seed.username} onChange={(e) => setSeed({ ...seed, username: e.target.value })} required />
        <Input label={seed._id ? 'New password (leave blank to keep current)' : 'App password'} type="password" value={seed.password} onChange={(e) => setSeed({ ...seed, password: e.target.value })} required={!seed._id} />
        <label className="flex gap-2 items-center text-sm text-ink-soft"><input type="checkbox" checked={seed.enabled} onChange={(e) => setSeed({ ...seed, enabled: e.target.checked })}/> Enabled for tests</label>
        <div className="flex gap-2"><Button disabled={busy === 'seed'}>{busy === 'seed' ? 'Saving…' : 'Save mailbox'}</Button>{seed._id && <Button type="button" variant="ghost" onClick={() => setSeed(emptySeed)}>Cancel</Button>}</div>
      </form></Card>
      <Card className="lg:col-span-3 overflow-hidden"><div className="px-6 py-4 border-b border-surface-line"><h2 className="font-bold flex gap-2 items-center"><Inbox size={17}/> Controlled seed inboxes</h2></div>{!data.seeds.length ? <div className="p-10 text-sm text-ink-soft text-center">No seed inboxes configured yet.</div> : <div className="divide-y divide-surface-line">{data.seeds.map((item) => <div key={item._id} className="p-5"><div className="flex justify-between gap-4"><div className="min-w-0"><div className="flex flex-wrap gap-2 items-center"><p className="font-bold truncate">{item.name}</p><Badge tone={item.enabled ? 'success' : 'default'}>{item.provider}</Badge></div><p className="text-sm text-ink-soft mt-1">{item.email}</p><p className="text-xs text-ink-faint mt-1">{item.host}:{item.port} · {item.passwordConfigured ? 'Credentials stored' : 'Credentials missing'}</p>{item.lastError && <p className="text-xs text-danger mt-2">{item.lastError}</p>}{item.lastCheckedAt && !item.lastError && <p className="text-xs text-emerald-700 mt-2 flex gap-1 items-center"><CheckCircle2 size={13}/> Connected {new Date(item.lastCheckedAt).toLocaleString()}</p>}</div><div className="flex gap-1 shrink-0"><Button size="sm" variant="secondary" disabled={busy === `test-${item._id}`} onClick={() => test(item)}>Test</Button><Button size="sm" variant="ghost" onClick={() => edit(item)}>Edit</Button><Button size="sm" variant="ghost" aria-label="Remove mailbox" onClick={() => remove(item)}><Trash2 size={14}/></Button></div></div></div>)}</div>}</Card>
    </div>
  </div></AppShell>;
}
