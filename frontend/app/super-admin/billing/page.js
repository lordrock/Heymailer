'use client';

import { useCallback, useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import { Badge, Button, Card, Input, Modal, Select, Spinner, Textarea, statusTone } from '@/components/ui';
import api, { errMsg } from '@/lib/api';
import { Bitcoin, CheckCircle2, CreditCard, ExternalLink, ShieldCheck, Users } from 'lucide-react';

const emptyWallet = { asset: 'USDT', network: 'TRC20', address: '', exchangeRateUsd: 1, confirmationsRequired: 1, label: '', instructions: '', enabled: true };
const explorerUrl = (invoice) => {
  if (invoice.asset === 'BTC') return `https://mempool.space/tx/${invoice.transactionHash}`;
  if (invoice.network === 'TRC20') return `https://tronscan.org/#/transaction/${invoice.transactionHash}`;
  if (invoice.network === 'BEP20') return `https://bscscan.com/tx/${invoice.transactionHash}`;
  return `https://etherscan.io/tx/${invoice.transactionHash}`;
};

function Stat({ label, value, icon: Icon }) { return <Card className="p-5"><Icon size={18} className="text-emerald-600" /><p className="text-2xl font-bold mt-3">{value}</p><p className="text-xs text-ink-soft mt-1">{label}</p></Card>; }

export default function SuperAdminBillingPage() {
  const [data, setData] = useState(null);
  const [wallet, setWallet] = useState(emptyWallet);
  const [review, setReview] = useState(null);
  const [reviewNote, setReviewNote] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const load = useCallback(() => api.get('/super-admin/billing/overview').then(({ data: next }) => setData(next)), []);
  useEffect(() => {
    load().catch((err) => setError(errMsg(err)));
    const timer = window.setInterval(() => load().catch(() => {}), 15000);
    return () => window.clearInterval(timer);
  }, [load]);

  const saveWallet = async (e) => {
    e.preventDefault(); setSaving(true); setError('');
    try { await api.put('/super-admin/billing/wallets', wallet); setNotice(`${wallet.asset} ${wallet.network} wallet saved.`); setWallet(emptyWallet); await load(); } catch (err) { setError(errMsg(err)); } finally { setSaving(false); }
  };
  const toggleWallet = async (item) => { await api.patch(`/super-admin/billing/wallets/${item._id}`, { enabled: !item.enabled }); await load(); };
  const updatePrice = async (plan, priceUsd) => { setSaving(true); try { await api.put(`/super-admin/billing/plans/${plan._id}`, { priceUsd: Number(priceUsd) }); setNotice(`${plan.name} price updated.`); await load(); } catch (err) { setError(errMsg(err)); } finally { setSaving(false); } };
  const decide = async (action) => {
    setSaving(true); setError('');
    try { const { data: result } = await api.patch(`/super-admin/billing/invoices/${review._id}/review`, { action, reviewNote }, { headers: { 'Idempotency-Key': crypto.randomUUID() } }); setNotice(result.message); setReview(null); setReviewNote(''); await load(); } catch (err) { setError(errMsg(err)); } finally { setSaving(false); }
  };

  if (!data) return <AppShell title="Billing Control"><div className="flex justify-center py-24"><Spinner size={30} /></div></AppShell>;
  return <AppShell title="Billing Control">
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4"><div><h1 className="text-xl font-bold text-ink">Manual crypto billing</h1><p className="text-sm text-ink-soft mt-1">Manage public receiving wallets, plan prices, and payment verification.</p></div><Badge tone="info">Super admin</Badge></div>
      {(notice || error) && <div className={`rounded-xl px-4 py-3 text-sm ${error ? 'bg-danger-bg text-danger' : 'bg-emerald-50 text-emerald-700'}`}>{error || notice}</div>}
      <div className="grid sm:grid-cols-3 gap-4"><Stat label="Customer accounts" value={data.stats.customers} icon={Users} /><Stat label="Active subscriptions" value={data.stats.activeSubscriptions} icon={CheckCircle2} /><Stat label="Awaiting verification" value={data.stats.pendingPayments} icon={CreditCard} /></div>

      <div className="grid lg:grid-cols-5 gap-5"><Card className="lg:col-span-2 p-6"><h2 className="font-bold flex items-center gap-2"><Bitcoin size={18} /> Add or update wallet</h2><p className="text-xs text-ink-soft mt-1 mb-5">Store public receiving addresses only—never seed phrases or private keys.</p><form className="space-y-4" onSubmit={saveWallet}><div className="grid grid-cols-2 gap-3"><Select label="Asset" value={wallet.asset} onChange={(e) => setWallet({ ...wallet, asset: e.target.value, network: e.target.value === 'BTC' ? 'BITCOIN' : 'TRC20' })}><option>USDT</option><option>BTC</option></Select><Input label="Network" value={wallet.network} onChange={(e) => setWallet({ ...wallet, network: e.target.value.toUpperCase() })} placeholder="TRC20" /></div><Input label="Public receiving address" value={wallet.address} onChange={(e) => setWallet({ ...wallet, address: e.target.value })} required /><div className="grid grid-cols-2 gap-3"><Input label="1 coin equals USD" type="number" min="0.00000001" step="any" value={wallet.exchangeRateUsd} onChange={(e) => setWallet({ ...wallet, exchangeRateUsd: e.target.value })} /><Input label="Confirmations required" type="number" min="0" value={wallet.confirmationsRequired} onChange={(e) => setWallet({ ...wallet, confirmationsRequired: e.target.value })} /></div><Input label="Label (optional)" value={wallet.label} onChange={(e) => setWallet({ ...wallet, label: e.target.value })} placeholder="Primary TRC20 wallet" /><Textarea label="Customer instructions" rows={3} value={wallet.instructions} onChange={(e) => setWallet({ ...wallet, instructions: e.target.value })} /><Button className="w-full" disabled={saving}>{saving ? 'Saving…' : 'Save wallet'}</Button></form></Card>
        <Card className="lg:col-span-3 overflow-hidden"><div className="px-6 py-4 border-b border-surface-line"><h2 className="font-bold">Configured wallets</h2></div>{!data.wallets.length ? <div className="p-8 text-sm text-ink-soft text-center">No payment wallets configured.</div> : <div className="divide-y divide-surface-line">{data.wallets.map((item) => <div key={item._id} className="p-5 flex items-start justify-between gap-4"><div className="min-w-0"><div className="flex items-center gap-2"><p className="font-bold">{item.asset} · {item.network}</p><Badge tone={item.enabled ? 'success' : 'default'}>{item.enabled ? 'Enabled' : 'Disabled'}</Badge></div><p className="text-xs font-mono break-all text-ink-soft mt-2">{item.address}</p><p className="text-xs text-ink-faint mt-2">Rate: ${item.exchangeRateUsd.toLocaleString()} · {item.confirmationsRequired} confirmation(s)</p></div><div className="flex gap-2"><Button size="sm" variant="ghost" onClick={() => setWallet({ ...item })}>Edit</Button><Button size="sm" variant="secondary" onClick={() => toggleWallet(item)}>{item.enabled ? 'Disable' : 'Enable'}</Button></div></div>)}</div>}</Card></div>

      <Card className="p-6"><h2 className="font-bold">Plan pricing</h2><p className="text-xs text-ink-soft mt-1 mb-4">Crypto amounts are calculated from these USD prices and the wallet exchange rate.</p><div className="grid sm:grid-cols-3 gap-4">{data.plans.map((plan) => <PlanPrice key={plan._id} plan={plan} onSave={updatePrice} disabled={saving} />)}</div></Card>

      <Card className="overflow-hidden"><div className="px-6 py-4 border-b border-surface-line"><h2 className="font-bold">Invoices and payment submissions</h2></div><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-surface text-left text-xs text-ink-soft"><tr><th className="px-5 py-3">Customer</th><th className="px-5 py-3">Invoice</th><th className="px-5 py-3">Payment</th><th className="px-5 py-3">Status</th><th className="px-5 py-3"></th></tr></thead><tbody>{data.invoices.map((invoice) => <tr key={invoice._id} className="border-t border-surface-line"><td className="px-5 py-3"><p className="font-medium">{invoice.userId?.workspaceName || invoice.userId?.name}</p><p className="text-xs text-ink-faint">{invoice.userId?.email}</p></td><td className="px-5 py-3"><p>{invoice.reference}</p><p className="text-xs text-ink-faint">{invoice.planSnapshot.name} · ${invoice.amountUsd}</p></td><td className="px-5 py-3"><p>{invoice.amountCrypto} {invoice.asset}</p><p className="text-xs text-ink-faint">{invoice.network}</p></td><td className="px-5 py-3"><Badge tone={statusTone(invoice.status)}>{invoice.status.replace('_', ' ')}</Badge></td><td className="px-5 py-3 text-right">{invoice.transactionHash && <a href={explorerUrl(invoice)} target="_blank" rel="noreferrer" className="inline-flex text-emerald-600 mr-3"><ExternalLink size={15} /></a>}{invoice.status === 'submitted' && <Button size="sm" onClick={() => setReview(invoice)}>Review</Button>}</td></tr>)}</tbody></table>{!data.invoices.length && <div className="p-10 text-center text-sm text-ink-soft">No invoices yet.</div>}</div></Card>
    </div>
    <Modal open={Boolean(review)} onClose={() => setReview(null)} title={`Verify ${review?.reference || ''}`} footer={<><Button variant="danger" onClick={() => decide('reject')} disabled={saving}>Reject</Button><Button onClick={() => decide('approve')} disabled={saving}>Approve and activate</Button></>}><div className="space-y-4"><div className="rounded-xl bg-amber-bg text-amber p-4 text-xs">{review?.transactionHash ? 'Verify the receiving address, exact asset, network, amount, token contract and required confirmations in the blockchain explorer before approving.' : 'Manual verification required: the customer did not provide a transaction hash. Match the account name, amount, wallet and payment note before approving.'}</div>{review && <dl className="grid grid-cols-2 gap-3 text-sm"><div><dt className="text-xs text-ink-soft">Expected</dt><dd className="font-bold">{review.amountCrypto} {review.asset}</dd></div><div><dt className="text-xs text-ink-soft">Network</dt><dd className="font-bold">{review.network}</dd></div><div><dt className="text-xs text-ink-soft">Account name</dt><dd className="font-semibold">{review.accountName || 'Not supplied'}</dd></div><div><dt className="text-xs text-ink-soft">Requested domain</dt><dd className="font-semibold">{review.hasRequestedDomain ? review.requestedDomain : 'No'}</dd></div><div className="col-span-2"><dt className="text-xs text-ink-soft">Transaction hash</dt><dd className="font-mono text-xs break-all mt-1">{review.transactionHash || 'Not supplied — manual review'}</dd></div>{review.customerNote && <div className="col-span-2"><dt className="text-xs text-ink-soft">Payment note</dt><dd className="mt-1">{review.customerNote}</dd></div>}</dl>}<Textarea label="Review note" rows={3} value={reviewNote} onChange={(e) => setReviewNote(e.target.value)} placeholder="Optional internal/customer-facing review note" /></div></Modal>
  </AppShell>;
}

function PlanPrice({ plan, onSave, disabled }) {
  const [price, setPrice] = useState(plan.priceUsd);
  return <div className="border border-surface-line rounded-xl p-4"><div className="flex justify-between"><p className="font-bold">{plan.name}</p>{plan.featured && <Badge tone="success">Popular</Badge>}</div><div className="flex items-end gap-2 mt-4"><Input label="Monthly USD price" type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} /><Button size="sm" onClick={() => onSave(plan, price)} disabled={disabled}>Save</Button></div></div>;
}
