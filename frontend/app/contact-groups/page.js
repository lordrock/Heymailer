'use client';

import { useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import { Card, Button, Input, Modal, EmptyState, Spinner } from '@/components/ui';
import api, { errMsg } from '@/lib/api';
import { Plus, Pencil, Trash2, UsersRound } from 'lucide-react';

export default function ContactGroupsPage() {
  const [groups, setGroups] = useState(null);
  const [editing, setEditing] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

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
    </AppShell>
  );
}
