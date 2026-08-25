'use client';

import { useEffect, useRef, useState } from 'react';
import AppShell from '@/components/AppShell';
import { Card, Button, Badge, statusTone, Input, Select, Modal, EmptyState, Spinner } from '@/components/ui';
import api, { errMsg } from '@/lib/api';
import { Plus, Upload, Search, Pencil, Trash2, Users } from 'lucide-react';

export default function ContactsPage() {
  const [contacts, setContacts] = useState(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [groups, setGroups] = useState([]);
  const [editing, setEditing] = useState(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importGroupIds, setImportGroupIds] = useState([]);
  const [importResult, setImportResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef(null);
  const limit = 20;

  const load = async () => {
    const { data } = await api.get('/contacts', { params: { search: search || undefined, page, limit } });
    setContacts(data.contacts);
    setTotal(data.total);
  };

  useEffect(() => { api.get('/contact-groups').then((res) => setGroups(res.data.groups)); }, []);
  useEffect(() => { load(); }, [page]);
  useEffect(() => {
    const t = setTimeout(() => { setPage(1); load(); }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const openNew = () => setEditing({ firstName: '', lastName: '', email: '', tags: [], groups: [], status: 'active' });

  const save = async () => {
    setBusy(true);
    setError('');
    try {
      const payload = { ...editing, tags: typeof editing.tags === 'string' ? editing.tags.split(',').map((t) => t.trim()).filter(Boolean) : editing.tags };
      if (editing._id) await api.put(`/contacts/${editing._id}`, payload);
      else await api.post('/contacts', payload);
      setEditing(null);
      load();
    } catch (err) {
      setError(errMsg(err, 'Could not save contact.'));
    } finally {
      setBusy(false);
    }
  };

  const remove = async (c) => {
    if (!confirm(`Delete ${c.email}?`)) return;
    await api.delete(`/contacts/${c._id}`);
    load();
  };

  const runImport = async () => {
    if (!importFile) return;
    setBusy(true);
    const form = new FormData();
    form.append('file', importFile);
    form.append('groupIds', JSON.stringify(importGroupIds));
    try {
      const { data } = await api.post('/contacts/import', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      setImportResult(data.results);
      load();
    } catch (err) {
      alert(errMsg(err, 'Import failed.'));
    } finally {
      setBusy(false);
    }
  };

  const closeImport = () => {
    setImportOpen(false);
    setImportFile(null);
    setImportResult(null);
    setImportGroupIds([]);
    if (fileRef.current) fileRef.current.value = '';
  };

  const totalPages = Math.max(1, Math.ceil(total / limit));

  return (
    <AppShell
      title="Contacts"
      actions={
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={() => setImportOpen(true)}><Upload size={14} /> Import CSV</Button>
          <Button size="sm" onClick={openNew}><Plus size={14} /> Add Contact</Button>
        </div>
      }
    >
      <div className="relative max-w-sm mb-5">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
        <Input placeholder="Search name or email…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      {!contacts ? (
        <div className="flex justify-center py-20"><Spinner size={28} /></div>
      ) : contacts.length === 0 ? (
        <Card><EmptyState icon={Users} title="No contacts found" description="Add a contact or import a CSV file." action={<Button onClick={openNew}><Plus size={14} /> Add Contact</Button>} /></Card>
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-ink-faint uppercase tracking-wide border-b border-surface-line">
                <th className="px-5 py-3 font-semibold">Name</th>
                <th className="px-5 py-3 font-semibold">Email</th>
                <th className="px-5 py-3 font-semibold">Groups</th>
                <th className="px-5 py-3 font-semibold">Tags</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold"></th>
              </tr>
            </thead>
            <tbody>
              {contacts.map((c) => (
                <tr key={c._id} className="border-b border-surface-line last:border-0 hover:bg-surface">
                  <td className="px-5 py-3 font-medium text-ink">{c.firstName} {c.lastName}</td>
                  <td className="px-5 py-3 text-ink-soft">{c.email}</td>
                  <td className="px-5 py-3 text-ink-soft text-xs">{c.groups?.map((g) => g.name).join(', ') || '—'}</td>
                  <td className="px-5 py-3 text-ink-soft text-xs">{c.tags?.join(', ') || '—'}</td>
                  <td className="px-5 py-3"><Badge tone={statusTone(c.status)}>{c.status}</Badge></td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => setEditing({ ...c, groups: c.groups?.map((g) => g._id) || [] })}><Pencil size={13} /></Button>
                      <Button variant="ghost" size="sm" onClick={() => remove(c)}><Trash2 size={13} className="text-danger" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flex items-center justify-between px-5 py-3 border-t border-surface-line text-xs text-ink-soft">
            <span>{total} contacts</span>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
              <span className="px-2 py-1">{page} / {totalPages}</span>
              <Button variant="ghost" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
          </div>
        </Card>
      )}

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing?._id ? 'Edit Contact' : 'Add Contact'}
        footer={<><Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button><Button onClick={save} disabled={busy}>Save</Button></>}
      >
        {editing && (
          <div className="space-y-4">
            {error && <p className="text-xs text-danger bg-danger-bg rounded-lg px-3 py-2">{error}</p>}
            <div className="grid grid-cols-2 gap-3">
              <Input label="First Name" value={editing.firstName} onChange={(e) => setEditing({ ...editing, firstName: e.target.value })} />
              <Input label="Last Name" value={editing.lastName} onChange={(e) => setEditing({ ...editing, lastName: e.target.value })} />
            </div>
            <Input label="Email" type="email" value={editing.email} onChange={(e) => setEditing({ ...editing, email: e.target.value })} />
            <Input label="Tags (comma separated)" value={Array.isArray(editing.tags) ? editing.tags.join(', ') : editing.tags} onChange={(e) => setEditing({ ...editing, tags: e.target.value })} placeholder="Savings Lead, Interested" />
            <div>
              <span className="block text-xs font-semibold text-ink-soft mb-1.5">Groups</span>
              <div className="flex flex-wrap gap-2">
                {groups.map((g) => (
                  <button
                    key={g._id}
                    type="button"
                    onClick={() => setEditing((e) => ({ ...e, groups: e.groups?.includes(g._id) ? e.groups.filter((x) => x !== g._id) : [...(e.groups || []), g._id] }))}
                    className={`text-xs font-medium px-3 py-1.5 rounded-full border ${editing.groups?.includes(g._id) ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-surface-line text-ink-soft'}`}
                  >
                    {g.name}
                  </button>
                ))}
              </div>
            </div>
            {editing._id && (
              <Select label="Status" value={editing.status} onChange={(e) => setEditing({ ...editing, status: e.target.value })}>
                <option value="active">Active</option>
                <option value="unsubscribed">Unsubscribed</option>
                <option value="bounced">Bounced</option>
              </Select>
            )}
          </div>
        )}
      </Modal>

      <Modal
        open={importOpen}
        onClose={closeImport}
        title="Import Contacts via CSV"
        footer={
          !importResult ? (
            <><Button variant="ghost" onClick={closeImport}>Cancel</Button><Button onClick={runImport} disabled={!importFile || busy}>{busy ? 'Importing…' : 'Import'}</Button></>
          ) : (
            <Button onClick={closeImport}>Done</Button>
          )
        }
      >
        {!importResult ? (
          <div className="space-y-4">
            <p className="text-xs text-ink-soft">
              CSV should have columns: <code className="bg-surface px-1.5 py-0.5 rounded">firstName,lastName,email</code>.
              Malformed emails are rejected and duplicates are skipped automatically.
            </p>
            <input ref={fileRef} type="file" accept=".csv" onChange={(e) => setImportFile(e.target.files[0])} className="text-sm" />
            <div>
              <span className="block text-xs font-semibold text-ink-soft mb-1.5">Add to groups (optional)</span>
              <div className="flex flex-wrap gap-2">
                {groups.map((g) => (
                  <button
                    key={g._id}
                    type="button"
                    onClick={() => setImportGroupIds((ids) => (ids.includes(g._id) ? ids.filter((x) => x !== g._id) : [...ids, g._id]))}
                    className={`text-xs font-medium px-3 py-1.5 rounded-full border ${importGroupIds.includes(g._id) ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-surface-line text-ink-soft'}`}
                  >
                    {g.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-2 text-sm">
            <p className="text-emerald-700 font-semibold">{importResult.imported} contacts imported</p>
            <p className="text-ink-soft">{importResult.skippedDuplicates} duplicates skipped</p>
            {importResult.updatedMemberships > 0 && (
              <p className="text-ink-soft">{importResult.updatedMemberships} existing contacts added to the selected groups</p>
            )}
            <p className="text-danger">{importResult.invalid} invalid rows</p>
            {importResult.errors?.length > 0 && (
              <ul className="text-xs text-ink-faint max-h-32 overflow-y-auto list-disc pl-4">
                {importResult.errors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            )}
          </div>
        )}
      </Modal>
    </AppShell>
  );
}
