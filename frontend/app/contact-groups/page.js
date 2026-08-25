'use client';

import { useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import { Card, Button, Input, Select, Modal, EmptyState, Spinner } from '@/components/ui';
import api, { errMsg } from '@/lib/api';
import { Plus, Pencil, Trash2, UsersRound, ArrowRightLeft } from 'lucide-react';

export default function ContactGroupsPage() {
  const [groups, setGroups] = useState(null);
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [transferring, setTransferring] = useState(null);
  const [transferForm, setTransferForm] = useState({ targetGroupId: '', mode: 'copy' });
  const [transferResult, setTransferResult] = useState('');

  const load = () => api.get('/contact-groups').then((res) => setGroups(res.data.groups));
  useEffect(() => { load(); }, []);

  const save = async () => {
    setBusy(true);
    setError('');
    try {
      if (editing._id) await api.put(`/contact-groups/${editing._id}`, editing);
      else await api.post('/contact-groups', editing);
      setEditing(null);
      load();
    } catch (err) {
      setError(errMsg(err, 'Could not save group.'));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (g) => {
    if (!confirm(`Delete "${g.name}"? Contacts will remain but lose this group.`)) return;
    await api.delete(`/contact-groups/${g._id}`);
    load();
  };

  const openTransfer = (group) => {
    const firstTarget = groups.find((item) => item._id !== group._id)?._id || '';
    setTransferForm({ targetGroupId: firstTarget, mode: 'copy' });
    setTransferResult('');
    setError('');
    setTransferring(group);
  };

  const runTransfer = async () => {
    setBusy(true);
    setError('');
    try {
      const { data } = await api.post(`/contact-groups/${transferring._id}/contacts/transfer`, transferForm);
      setTransferResult(data.message);
      await load();
    } catch (err) {
      setError(errMsg(err, 'Could not update group memberships.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell title="Contact Groups" actions={<Button onClick={() => setEditing({ name: '', description: '' })}><Plus size={15} /> New Group</Button>}>
      {!groups ? (
        <div className="flex justify-center py-20"><Spinner size={28} /></div>
      ) : groups.length === 0 ? (
        <Card><EmptyState icon={UsersRound} title="No groups yet" description="Create groups to organise contacts for campaigns." action={<Button onClick={() => setEditing({ name: '', description: '' })}><Plus size={15} /> New Group</Button>} /></Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map((g) => (
            <Card key={g._id} className="p-5">
              <div className="flex items-start justify-between mb-2">
                <span className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center"><UsersRound size={16} /></span>
                <span className="text-xs font-semibold text-ink-soft">{g.contactCount} contact{g.contactCount === 1 ? '' : 's'}</span>
              </div>
              <h3 className="text-sm font-bold text-ink mb-1">{g.name}</h3>
              <p className="text-xs text-ink-soft mb-4 line-clamp-2">{g.description || 'No description'}</p>
              <div className="flex gap-2 pt-3 border-t border-surface-line">
                <Button size="sm" variant="secondary" className="flex-1" onClick={() => setEditing(g)}><Pencil size={13} /> Edit</Button>
                <Button size="sm" variant="ghost" onClick={() => openTransfer(g)} disabled={groups.length < 2 || g.contactCount === 0} title="Copy or move contacts"><ArrowRightLeft size={13} /></Button>
                <Button size="sm" variant="ghost" onClick={() => remove(g)}><Trash2 size={13} className="text-danger" /></Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing?._id ? 'Edit Group' : 'New Group'}
        footer={<><Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button><Button onClick={save} disabled={busy}>Save</Button></>}
      >
        {editing && (
          <div className="space-y-4">
            {error && <p className="text-xs text-danger bg-danger-bg rounded-lg px-3 py-2">{error}</p>}
            <Input label="Group Name" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="Savings Prospects" autoFocus />
            <Input label="Description" value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
          </div>
        )}
      </Modal>

      <Modal
        open={!!transferring}
        onClose={() => setTransferring(null)}
        title={`Copy or Move — ${transferring?.name || ''}`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setTransferring(null)}>Close</Button>
            {!transferResult && <Button onClick={runTransfer} disabled={busy || !transferForm.targetGroupId}>{busy ? 'Updating…' : transferForm.mode === 'move' ? 'Move Contacts' : 'Copy Contacts'}</Button>}
          </>
        }
      >
        {transferring && (
          <div className="space-y-4">
            <p className="text-xs text-ink-soft">
              This applies to all {transferring.contactCount} contact{transferring.contactCount === 1 ? '' : 's'} currently in this group. Email records are reused, so duplicates are never created.
            </p>
            {error && <p className="text-xs text-danger bg-danger-bg rounded-lg px-3 py-2">{error}</p>}
            {transferResult ? (
              <p className="text-xs text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2">{transferResult}</p>
            ) : (
              <>
                <Select label="Action" value={transferForm.mode} onChange={(e) => setTransferForm((form) => ({ ...form, mode: e.target.value }))}>
                  <option value="copy">Copy — keep contacts in both groups</option>
                  <option value="move">Move — remove contacts from the current group</option>
                </Select>
                <Select label="Destination Group" value={transferForm.targetGroupId} onChange={(e) => setTransferForm((form) => ({ ...form, targetGroupId: e.target.value }))}>
                  {groups.filter((group) => group._id !== transferring._id).map((group) => (
                    <option key={group._id} value={group._id}>{group.name}</option>
                  ))}
                </Select>
              </>
            )}
          </div>
        )}
      </Modal>
    </AppShell>
  );
}
