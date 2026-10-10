'use client';

import { useCallback, useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import { Badge, Button, Card, Input, Modal, Select, Spinner, statusTone } from '@/components/ui';
import api, { errMsg } from '@/lib/api';
import { Building2, CheckCircle2, KeyRound, MailCheck, Search, ShieldCheck } from 'lucide-react';

const blankSecrets = { apiKey: '', providerSecret: '', smtpPassword: '' };

export default function WorkspacesPage() {
  const [workspaces, setWorkspaces] = useState(null);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(null);
  const [identity, setIdentity] = useState(null);
  const [secrets, setSecrets] = useState(blankSecrets);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const load = useCallback(() => api.get('/super-admin/workspaces').then(({ data }) => setWorkspaces(data.workspaces)), []);
  useEffect(() => { load().catch((err) => setError(errMsg(err))); }, [load]);

  const open = async (workspace) => {
    setSelected(workspace); setError(''); setNotice(''); setSecrets(blankSecrets);
    try { const { data } = await api.get(`/super-admin/workspaces/${workspace._id}`); setIdentity(data.identity); } catch (err) { setError(errMsg(err)); }
  };
  const update = (field, value) => setIdentity((current) => ({ ...current, [field]: value }));
  const save = async () => {
    setSaving(true); setError(''); setNotice('');
    try { const { data } = await api.put(`/super-admin/workspaces/${selected._id}/sending-identity`, { ...identity, ...secrets }); setIdentity(data.identity); setSecrets(blankSecrets); setNotice(data.message); await load(); } catch (err) { setError(errMsg(err)); } finally { setSaving(false); }
  };
  const test = async () => {
    setSaving(true); setError('');
    try { const { data } = await api.post(`/super-admin/workspaces/${selected._id}/test-provider`); setNotice(data.message); } catch (err) { setError(errMsg(err)); } finally { setSaving(false); }
  };

  if (!workspaces) return <AppShell title="Workspaces"><div className="flex justify-center py-24"><Spinner size={30}/></div></AppShell>;
  const filtered = workspaces.filter((item) => `${item.name} ${item.owner?.name || ''} ${item.owner?.email || ''}`.toLowerCase().includes(query.toLowerCase()));
  return <AppShell title="Workspace Administration"><div className="space-y-6">
    <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4"><div><h1 className="text-xl font-bold text-ink">Customer workspaces</h1><p className="text-sm text-ink-soft mt-1">Control provider credentials, domains, From addresses and sending readiness.</p></div><div className="relative"><Search size={15} className="absolute left-3 top-3 text-ink-faint"/><input className="rounded-lg border border-surface-line bg-white pl-9 pr-3 py-2.5 text-sm outline-none focus:border-emerald-600" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search workspaces"/></div></div>
    {error && !selected && <p className="rounded-xl bg-danger-bg text-danger px-4 py-3 text-sm">{error}</p>}
    <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">{filtered.map((workspace) => <Card key={workspace._id} className="p-5"><div className="flex items-start justify-between"><div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center"><Building2 size={19}/></div><Badge tone={workspace.sendingEnabled ? 'success' : 'warning'}>{workspace.sendingEnabled ? 'Ready to send' : 'Setup needed'}</Badge></div><h2 className="font-bold text-ink mt-4">{workspace.name}</h2><p className="text-xs text-ink-soft mt-1">{workspace.owner?.email || 'No owner found'}</p><div className="grid grid-cols-2 gap-2 mt-4 text-xs"><div className="bg-surface rounded-lg p-2.5"><p className="text-ink-faint">Plan</p><p className="font-semibold mt-0.5">{workspace.subscription?.planId?.name || 'No plan'}</p></div><div className="bg-surface rounded-lg p-2.5"><p className="text-ink-faint">Provider</p><p className="font-semibold mt-0.5">{workspace.identity?.mailProvider?.toUpperCase() || 'Not set'}</p></div></div><Button variant="secondary" className="w-full mt-4" onClick={() => open(workspace)}>Configure sending</Button></Card>)}</div>
    {!filtered.length && <Card className="p-12 text-center text-sm text-ink-soft">No workspaces match your search.</Card>}
  </div>

  <Modal open={Boolean(selected)} onClose={() => {setSelected(null);setIdentity(null);}} title={`Sending identity · ${selected?.name || ''}`} size="xl" footer={<><Button variant="ghost" onClick={() => setSelected(null)}>Close</Button><Button variant="secondary" onClick={test} disabled={saving || !identity}>Test credentials</Button><Button onClick={save} disabled={saving || !identity}>{saving ? 'Saving…' : 'Save identity'}</Button></>}>
    {!identity ? <div className="flex justify-center py-16"><Spinner size={26}/></div> : <div className="space-y-6">
      {(notice || error) && <div className={`rounded-xl px-4 py-3 text-sm ${error ? 'bg-danger-bg text-danger' : 'bg-emerald-50 text-emerald-700'}`}>{error || notice}</div>}
      <div className="rounded-xl bg-amber-bg text-amber px-4 py-3 text-xs"><strong>Never enter a seed phrase or wallet key here.</strong> This form accepts email-provider credentials only. Secrets are encrypted and are not returned after saving.</div>
      <Section icon={MailCheck} title="Approved sender"><div className="grid sm:grid-cols-2 gap-4"><Select label="Provider" value={identity.mailProvider} onChange={(e) => update('mailProvider',e.target.value)}><option value="resend">Resend</option><option value="mailjet">Mailjet</option><option value="smtp">SMTP</option></Select><Input label="Sending domain" value={identity.sendingDomain || ''} onChange={(e) => update('sendingDomain',e.target.value)} placeholder="mail.customer.com"/><Input label="Sender display name" value={identity.senderName || ''} onChange={(e) => update('senderName',e.target.value)}/><Input label="Approved From email" type="email" value={identity.senderEmail || ''} onChange={(e) => update('senderEmail',e.target.value)} placeholder="hello@mail.customer.com"/><Input label="Reply-To email" type="email" value={identity.replyTo || ''} onChange={(e) => update('replyTo',e.target.value)} placeholder="support@customer.com"/><Input label="Branded unsubscribe endpoint" type="url" value={identity.unsubscribeEndpoint || ''} onChange={(e) => update('unsubscribeEndpoint',e.target.value)} placeholder="https://mail.customer.com/unsubscribe"/></div><p className="text-xs text-ink-soft mt-3">This HTTPS endpoint must route to HeyMailer’s <code>/api/public/unsubscribe</code> handler through the customer domain.</p></Section>
      <Section icon={KeyRound} title="Provider credentials">{identity.mailProvider === 'smtp' ? <div className="grid sm:grid-cols-2 gap-4"><Input label="SMTP host" value={identity.smtpHost || ''} onChange={(e) => update('smtpHost',e.target.value)}/><Input label="SMTP port" type="number" value={identity.smtpPort || 587} onChange={(e) => update('smtpPort',Number(e.target.value))}/><Input label="SMTP username" value={identity.smtpUser || ''} onChange={(e) => update('smtpUser',e.target.value)}/><Input label={`SMTP password ${identity.smtpPasswordConfigured ? '(saved — leave blank to keep)' : ''}`} type="password" value={secrets.smtpPassword} onChange={(e) => setSecrets({...secrets,smtpPassword:e.target.value})}/></div> : <div className="grid sm:grid-cols-2 gap-4"><Input label={`API key ${identity.apiKeyConfigured ? '(saved — leave blank to keep)' : ''}`} type="password" value={secrets.apiKey} onChange={(e) => setSecrets({...secrets,apiKey:e.target.value})}/>{identity.mailProvider === 'mailjet' && <Input label={`Secret key ${identity.providerSecretConfigured ? '(saved — leave blank to keep)' : ''}`} type="password" value={secrets.providerSecret} onChange={(e) => setSecrets({...secrets,providerSecret:e.target.value})}/>}</div>}</Section>
      <Section icon={ShieldCheck} title="Authentication and activation"><div className="grid sm:grid-cols-4 gap-3">{['domainStatus','spfStatus','dkimStatus','dmarcStatus'].map((field) => <Select key={field} label={field.replace('Status','').toUpperCase()} value={identity[field]} onChange={(e) => update(field,e.target.value)}><option value={field==='domainStatus'?'not_configured':'unknown'}>Not checked</option><option value="pending">Pending</option><option value="verified">Verified</option><option value="failed">Failed</option></Select>)}</div><label className="flex items-start gap-3 mt-5 rounded-xl border border-surface-line p-4"><input type="checkbox" className="mt-1 accent-[#0B7A53]" checked={Boolean(identity.sendingEnabled)} onChange={(e) => update('sendingEnabled',e.target.checked)}/><span><span className="block text-sm font-semibold text-ink">Enable campaign sending</span><span className="block text-xs text-ink-soft mt-1">Activation succeeds only when credentials, domain, SPF, DKIM and the From address are valid.</span></span></label></Section>
    </div>}
  </Modal>
  </AppShell>;
}

function Section({ icon: Icon, title, children }) { return <section><h3 className="flex items-center gap-2 text-sm font-bold text-ink mb-4"><Icon size={17} className="text-emerald-600"/>{title}</h3>{children}</section>; }
