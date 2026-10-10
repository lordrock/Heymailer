'use client';

import { useCallback, useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import { Badge, Button, Card, EmptyState, Input, Modal, Select, Spinner, Textarea, statusTone } from '@/components/ui';
import api, { errMsg } from '@/lib/api';
import { Check, Copy, CreditCard, ExternalLink, ShieldCheck } from 'lucide-react';

const explorerUrl = (invoice) => {
  if (!invoice?.transactionHash) return '';
  if (invoice.asset === 'BTC') return `https://mempool.space/tx/${invoice.transactionHash}`;
  if (invoice.network === 'TRC20') return `https://tronscan.org/#/transaction/${invoice.transactionHash}`;
  if (invoice.network === 'BEP20') return `https://bscscan.com/tx/${invoice.transactionHash}`;
  return `https://etherscan.io/tx/${invoice.transactionHash}`;
};

export default function BillingPage() {
  const [data, setData] = useState(null);
  const [choice, setChoice] = useState({ planId: '', walletId: '' });
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [proof, setProof] = useState({ transactionHash: '', payerAddress: '', customerNote: '' });
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(() => api.get('/billing/overview').then(({ data: next }) => {
    setData(next);
    setChoice((value) => ({ planId: value.planId || next.plans[0]?._id || '', walletId: value.walletId || next.wallets[0]?._id || '' }));
  }), []);
  useEffect(() => { load().catch((err) => setError(errMsg(err))); }, [load]);

  const createInvoice = async () => {
    setSaving(true); setError(''); setNotice('');
    try {
      const { data: result } = await api.post('/billing/invoices', choice);
      setSelectedInvoice(result.invoice); setNotice('Invoice created. Send the exact amount shown below.'); await load();
    } catch (err) { setError(errMsg(err)); } finally { setSaving(false); }
  };
  const submit = async () => {
    setSaving(true); setError('');
    try {
      const { data: result } = await api.post(`/billing/invoices/${selectedInvoice._id}/submit`, proof);
      setNotice(result.message); setSelectedInvoice(null); setProof({ transactionHash: '', payerAddress: '', customerNote: '' }); await load();
    } catch (err) { setError(errMsg(err)); } finally { setSaving(false); }
  };

  if (!data) return <AppShell title="Billing"><div className="flex justify-center py-24"><Spinner size={30} /></div></AppShell>;
  const current = data.subscription;
  return (
    <AppShell title="Billing & Subscription">
      <div className="space-y-6">
        {(notice || error) && <div className={`rounded-xl px-4 py-3 text-sm ${error ? 'bg-danger-bg text-danger' : 'bg-emerald-50 text-emerald-700'}`}>{error || notice}</div>}
        <Card className="p-6 bg-emerald-deep text-white border-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div><p className="text-xs text-emerald-100/70 uppercase tracking-wider font-semibold">Current subscription</p><h2 className="text-2xl font-bold mt-1">{current?.planId?.name || 'No active plan'}</h2><p className="text-sm text-emerald-100/70 mt-1">{current ? `Access until ${new Date(current.endsAt).toLocaleDateString()}` : 'Choose a plan to activate your workspace.'}</p></div>
            <Badge tone={current?.status === 'active' ? 'success' : 'warning'}>{current?.status || 'Inactive'}</Badge>
          </div>
        </Card>

        <div><h2 className="text-lg font-bold text-ink">Choose your plan</h2><p className="text-sm text-ink-soft mt-1">Invoices are priced in USD and converted using the rate set when you create the invoice.</p></div>
        <div className="grid md:grid-cols-3 gap-4">
          {data.plans.map((plan) => <Card key={plan._id} className={`p-5 relative ${choice.planId === plan._id ? 'border-emerald-600 ring-1 ring-emerald-600' : ''}`}>
            {plan.featured && <span className="absolute right-4 top-4 text-[10px] font-bold uppercase text-emerald-700 bg-emerald-50 px-2 py-1 rounded-full">Popular</span>}
            <h3 className="font-bold text-ink">{plan.name}</h3><p className="text-3xl font-bold text-ink mt-3">${plan.priceUsd}<span className="text-sm font-normal text-ink-soft">/{plan.intervalMonths === 1 ? 'month' : `${plan.intervalMonths} months`}</span></p><p className="text-xs text-ink-soft mt-2 min-h-8">{plan.description}</p>
            <ul className="space-y-2 my-5">{plan.features.map((feature) => <li key={feature} className="flex gap-2 text-xs text-ink-soft"><Check size={14} className="text-emerald-600 shrink-0" />{feature}</li>)}</ul>
            <Button variant={choice.planId === plan._id ? 'primary' : 'secondary'} className="w-full" onClick={() => setChoice({ ...choice, planId: plan._id })}>{choice.planId === plan._id ? 'Selected' : 'Select plan'}</Button>
          </Card>)}
        </div>

        <Card className="p-6"><h2 className="font-bold text-ink flex items-center gap-2"><CreditCard size={18} /> Pay with crypto</h2>
          {!data.wallets.length ? <EmptyState icon={ShieldCheck} title="Payments are not available yet" description="A super admin needs to configure a public receiving wallet." /> : <div className="grid sm:grid-cols-[1fr_auto] items-end gap-4 mt-5"><Select label="Currency and network" value={choice.walletId} onChange={(e) => setChoice({ ...choice, walletId: e.target.value })}>{data.wallets.map((wallet) => <option key={wallet._id} value={wallet._id}>{wallet.asset} · {wallet.network}</option>)}</Select><Button onClick={createInvoice} disabled={!choice.planId || !choice.walletId || saving}>{saving ? 'Creating…' : 'Create payment invoice'}</Button></div>}
        </Card>

        <Card className="overflow-hidden"><div className="px-6 py-4 border-b border-surface-line"><h2 className="font-bold text-ink">Payment history</h2></div>
          {!data.invoices.length ? <EmptyState icon={CreditCard} title="No invoices yet" description="Your invoices and payment verification status will appear here." /> : <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-surface text-left text-xs text-ink-soft"><tr><th className="px-5 py-3">Reference</th><th className="px-5 py-3">Plan</th><th className="px-5 py-3">Amount</th><th className="px-5 py-3">Status</th><th className="px-5 py-3"></th></tr></thead><tbody>{data.invoices.map((invoice) => <tr key={invoice._id} className="border-t border-surface-line"><td className="px-5 py-3 font-medium">{invoice.reference}</td><td className="px-5 py-3">{invoice.planSnapshot.name}</td><td className="px-5 py-3">{invoice.amountCrypto} {invoice.asset} <span className="text-xs text-ink-faint">({invoice.network})</span></td><td className="px-5 py-3"><Badge tone={statusTone(invoice.status)}>{invoice.status.replace('_', ' ')}</Badge></td><td className="px-5 py-3 text-right">{['awaiting_payment', 'rejected'].includes(invoice.status) && <Button size="sm" variant="secondary" onClick={() => setSelectedInvoice(invoice)}>Payment details</Button>}{invoice.transactionHash && <a className="inline-flex ml-2 text-emerald-600" href={explorerUrl(invoice)} target="_blank" rel="noreferrer"><ExternalLink size={15} /></a>}</td></tr>)}</tbody></table></div>}
        </Card>
      </div>

      <Modal open={Boolean(selectedInvoice)} onClose={() => setSelectedInvoice(null)} title={`Pay invoice ${selectedInvoice?.reference || ''}`} size="lg" footer={<><Button variant="ghost" onClick={() => setSelectedInvoice(null)}>Close</Button><Button onClick={submit} disabled={saving || !proof.transactionHash}>{saving ? 'Submitting…' : 'Submit payment for review'}</Button></>}>
        {selectedInvoice && <div className="space-y-4"><div className="rounded-xl bg-amber-bg text-amber p-4 text-xs"><strong>Use only {selectedInvoice.asset} on {selectedInvoice.network}.</strong> Sending through another network may result in permanent loss.</div><div className="grid sm:grid-cols-2 gap-3"><div className="bg-surface rounded-xl p-4"><p className="text-xs text-ink-soft">Exact amount</p><p className="text-xl font-bold mt-1">{selectedInvoice.amountCrypto} {selectedInvoice.asset}</p></div><div className="bg-surface rounded-xl p-4"><p className="text-xs text-ink-soft">Payment deadline</p><p className="text-sm font-semibold mt-1">{new Date(selectedInvoice.expiresAt).toLocaleString()}</p></div></div><div><p className="text-xs font-semibold text-ink-soft mb-1.5">Receiving address</p><div className="flex gap-2"><code className="flex-1 break-all bg-surface rounded-lg px-3 py-2.5 text-xs">{selectedInvoice.walletAddress}</code><Button variant="secondary" onClick={() => navigator.clipboard.writeText(selectedInvoice.walletAddress)}><Copy size={15} /></Button></div></div><Input label="Transaction hash" value={proof.transactionHash} onChange={(e) => setProof({ ...proof, transactionHash: e.target.value })} placeholder="Paste the blockchain transaction hash" /><Input label="Sending wallet address (optional)" value={proof.payerAddress} onChange={(e) => setProof({ ...proof, payerAddress: e.target.value })} /><Textarea label="Note (optional)" rows={3} value={proof.customerNote} onChange={(e) => setProof({ ...proof, customerNote: e.target.value })} /></div>}
      </Modal>
    </AppShell>
  );
}
