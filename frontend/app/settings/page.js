'use client';

import { useCallback, useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import { Badge, Button, Card, Input, Spinner } from '@/components/ui';
import api, { errMsg } from '@/lib/api';
import { CheckCircle2, Globe2, LockKeyhole, MailCheck, Send, ShieldAlert, XCircle } from 'lucide-react';

const statusTone = (status) => status === 'verified' ? 'success' : status === 'failed' ? 'danger' : 'warning';

export default function SettingsPage() {
  const [settings, setSettings] = useState(null);
  const [testRecipient, setTestRecipient] = useState('');
  const [result, setResult] = useState(null);
  const [saving, setSaving] = useState(false);
  const load = useCallback(() => api.get('/settings').then(({ data }) => setSettings(data.settings)), []);
  useEffect(() => { load(); }, [load]);
  const update = (field, value) => setSettings((current) => ({ ...current, [field]: value }));
  const save = async () => { setSaving(true); setResult(null); try { const { data } = await api.put('/settings', settings); setSettings(data.settings); setResult({ ok: true, message: 'Workspace preferences saved.' }); } catch (err) { setResult({ ok: false, message: errMsg(err) }); } finally { setSaving(false); } };
  const sendTest = async () => { setSaving(true); setResult(null); try { const { data } = await api.post('/settings/test-email', { recipient: testRecipient }); setResult({ ok: true, message: data.message }); } catch (err) { setResult({ ok: false, message: errMsg(err) }); } finally { setSaving(false); } };
  if (!settings) return <AppShell title="Settings"><div className="flex justify-center py-24"><Spinner size={28}/></div></AppShell>;

  return <AppShell title="Workspace Settings"><div className="max-w-3xl space-y-6">
    <Card className={`p-6 border-l-4 ${settings.sendingEnabled ? 'border-l-emerald-600' : 'border-l-amber'}`}>
      <div className="flex items-start justify-between gap-4"><div className="flex gap-3"><div className={`w-10 h-10 rounded-xl flex items-center justify-center ${settings.sendingEnabled ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-bg text-amber'}`}>{settings.sendingEnabled ? <MailCheck size={20}/> : <ShieldAlert size={20}/>}</div><div><h2 className="font-bold text-ink">Sending identity</h2><p className="text-xs text-ink-soft mt-1">Managed and verified by HeyMailer administrators.</p></div></div><Badge tone={settings.sendingEnabled ? 'success' : 'warning'}>{settings.sendingEnabled ? 'Sending enabled' : 'Setup required'}</Badge></div>
      <div className="grid sm:grid-cols-2 gap-3 mt-5"><Info label="Provider" value={settings.mailProvider?.toUpperCase()} icon={LockKeyhole}/><Info label="Verified domain" value={settings.sendingDomain || 'Not configured'} icon={Globe2}/><Info label="From email" value={settings.senderEmail || 'Not configured'} icon={MailCheck}/><Info label="Reply-To email" value={settings.replyTo || 'Not configured'} icon={Send}/><Info label="Unsubscribe URL" value={settings.unsubscribeEndpoint || 'Uses HeyMailer default'} icon={ShieldAlert}/></div>
      <div className="flex flex-wrap gap-2 mt-4">{[['Domain',settings.domainStatus],['SPF',settings.spfStatus],['DKIM',settings.dkimStatus],['DMARC',settings.dmarcStatus]].map(([label,status]) => <Badge key={label} tone={statusTone(status)}>{label}: {status?.replace('_',' ')}</Badge>)}</div>
      {!settings.sendingEnabled && <p className="text-xs text-amber bg-amber-bg rounded-lg px-3 py-2.5 mt-4">Campaign sending stays locked until your provider credentials, domain, SPF and DKIM are verified.</p>}
      {settings.sendingEnabled && <div className="mt-5 pt-5 border-t border-surface-line"><p className="text-xs font-semibold text-ink-soft mb-2">Send a deliverability test</p><div className="flex flex-col sm:flex-row gap-2"><Input type="email" value={testRecipient} onChange={(e) => setTestRecipient(e.target.value)} placeholder="recipient@example.com" className="sm:w-72"/><Button onClick={sendTest} disabled={saving || !testRecipient}><Send size={14}/>{saving ? 'Sending…' : 'Send test'}</Button></div></div>}
    </Card>

    <Card className="p-6"><h2 className="font-bold text-ink">Brand and email content</h2><p className="text-xs text-ink-soft mt-1 mb-5">These values are available as variables inside your templates.</p><div className="grid sm:grid-cols-2 gap-4"><Input label="Sender display name" value={settings.senderName} onChange={(e) => update('senderName',e.target.value)}/><Input label="Support email" value={settings.supportEmail} onChange={(e) => update('supportEmail',e.target.value)}/><Input label="Website URL" value={settings.websiteUrl} onChange={(e) => update('websiteUrl',e.target.value)}/><Input label="Telegram/support URL" value={settings.telegramUrl} onChange={(e) => update('telegramUrl',e.target.value)}/></div></Card>
    <Card className="p-6"><h2 className="font-bold text-ink">Sending pace</h2><p className="text-xs text-ink-soft mt-1 mb-5">Conservative pacing supports provider limits and sender reputation.</p><div className="grid sm:grid-cols-2 gap-4"><Input label="Emails per batch" type="number" min="1" max="1000" value={settings.batchSize} onChange={(e) => update('batchSize',Number(e.target.value))}/><Input label="Minutes between batches" type="number" min="0" max="1440" value={Math.round(settings.batchDelayMs/60000)} onChange={(e) => update('batchDelayMs',Number(e.target.value)*60000)}/></div></Card>
    {result && <p className={`text-xs font-semibold flex items-center gap-1.5 ${result.ok ? 'text-emerald-700' : 'text-danger'}`}>{result.ok ? <CheckCircle2 size={14}/> : <XCircle size={14}/>} {result.message}</p>}
    <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save workspace settings'}</Button>
  </div></AppShell>;
}

function Info({ label, value, icon: Icon }) { return <div className="bg-surface rounded-xl p-3.5 flex gap-3"><Icon size={16} className="text-emerald-600 mt-0.5 shrink-0"/><div className="min-w-0"><p className="text-[10px] uppercase tracking-wider text-ink-faint font-semibold">{label}</p><p className="text-sm font-semibold text-ink mt-0.5 truncate">{value}</p></div></div>; }
