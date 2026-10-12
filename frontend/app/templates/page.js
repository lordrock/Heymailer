'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AppShell from '@/components/AppShell';
import { Card, Button, Badge, Input, Select, Modal, EmptyState, Spinner } from '@/components/ui';
import api, { errMsg } from '@/lib/api';
import { Plus, Copy, Trash2, Pencil, FileStack, Search, Lock } from 'lucide-react';

const CATEGORY_TONE = {
  Marketing: 'success', Savings: 'info', Thrift: 'warning', Transactional: 'default',
  Security: 'danger', Announcement: 'info', General: 'default',
};

export default function TemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState(null);
  const [categories, setCategories] = useState([]);
  const [category, setCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState(null); // null | 'new' | template object
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const { data } = await api.get('/templates', { params: { category, search: search || undefined } });
    setTemplates(data.templates);
    setCategories(data.categories);
  }, [category, search]);

  useEffect(() => {
    const t = setTimeout(load, 350);
    return () => clearTimeout(t);
  }, [load]);

  const openNew = () => setEditing({
    name: '', category: 'Marketing', subject: '', preheader: '',
    htmlContent: '<p>Hi {{firstName}},</p>', textContent: 'Hi {{firstName}},', description: '',
  });

  const save = async () => {
    setSaving(true);
    setError('');
    try {
      if (editing._id) {
        await api.put(`/templates/${editing._id}`, editing);
      } else {
        await api.post('/templates', editing);
      }
      setEditing(null);
      load();
    } catch (err) {
      setError(errMsg(err, 'Could not save template.'));
    } finally {
      setSaving(false);
    }
  };

  const duplicate = async (id) => {
    await api.post(`/templates/${id}/duplicate`);
    load();
  };

  const remove = async (t) => {
    if (t.isSystem) return;
    if (!confirm(`Delete "${t.name}"? This can't be undone.`)) return;
    try {
      await api.delete(`/templates/${t._id}`);
      load();
    } catch (err) {
      alert(errMsg(err));
    }
  };

  const openInComposer = (id) => router.push(`/campaigns/compose?templateId=${id}`);

  return (
    <AppShell
      title="Email Templates"
      actions={<Button onClick={openNew}><Plus size={15} /> New Template</Button>}
    >
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint" />
          <Input placeholder="Search templates…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={category} onChange={(e) => setCategory(e.target.value)} className="sm:w-48">
          <option value="All">All Categories</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </Select>
      </div>

      {!templates ? (
        <div className="flex justify-center py-20"><Spinner size={28} /></div>
      ) : templates.length === 0 ? (
        <Card><EmptyState icon={FileStack} title="No templates found" description="Create a template or adjust your filters." action={<Button onClick={openNew}><Plus size={15} /> New Template</Button>} /></Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((t) => (
            <Card key={t._id} className="p-5 flex flex-col">
              <div className="flex items-start justify-between mb-2">
                <Badge tone={CATEGORY_TONE[t.category] || 'default'}>{t.category}</Badge>
                {t.isSystem && <span title="Starter template"><Lock size={13} className="text-ink-faint" /></span>}
              </div>
              <h3 className="text-sm font-bold text-ink mb-1 line-clamp-1">{t.name}</h3>
              <p className="text-xs text-ink-soft line-clamp-2 mb-4 flex-1">{t.description || t.subject}</p>
              <div className="flex items-center gap-2 pt-3 border-t border-surface-line">
                <Button size="sm" variant="secondary" className="flex-1" onClick={() => openInComposer(t._id)}>Use</Button>
                <Button size="sm" variant="ghost" onClick={() => setEditing(t)}><Pencil size={14} /></Button>
                <Button size="sm" variant="ghost" onClick={() => duplicate(t._id)}><Copy size={14} /></Button>
                {!t.isSystem && (
                  <Button size="sm" variant="ghost" onClick={() => remove(t)}><Trash2 size={14} className="text-danger" /></Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={!!editing}
        onClose={() => setEditing(null)}
        title={editing?._id ? 'Edit Template' : 'New Template'}
        size="xl"
        footer={
          <>
            <Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save Template'}</Button>
          </>
        }
      >
        {editing && (
          <div className="space-y-4">
            {error && <p className="text-xs text-danger bg-danger-bg rounded-lg px-3 py-2">{error}</p>}
            <div className="grid sm:grid-cols-2 gap-4">
              <Input label="Template Name" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
              <Select label="Category" value={editing.category} onChange={(e) => setEditing({ ...editing, category: e.target.value })}>
                {(categories.length ? categories : ['Marketing','Savings','Thrift','Transactional','Security','Announcement','General']).map((c) => <option key={c} value={c}>{c}</option>)}
              </Select>
            </div>
            <Input label="Subject" value={editing.subject} onChange={(e) => setEditing({ ...editing, subject: e.target.value })} />
            <Input label="Preheader" value={editing.preheader} onChange={(e) => setEditing({ ...editing, preheader: e.target.value })} />
            <Input label="Description" value={editing.description} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
            <label className="block">
              <span className="block text-xs font-semibold text-ink-soft mb-1.5">HTML Content</span>
              <textarea
                className="w-full h-56 rounded-lg border border-surface-line bg-white px-3.5 py-2.5 text-xs font-mono text-ink focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none"
                value={editing.htmlContent}
                onChange={(e) => setEditing({ ...editing, htmlContent: e.target.value })}
              />
            </label>
            <label className="block">
              <span className="block text-xs font-semibold text-ink-soft mb-1.5">Plain Text Content</span>
              <textarea
                className="w-full h-28 rounded-lg border border-surface-line bg-white px-3.5 py-2.5 text-xs font-mono text-ink focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none"
                value={editing.textContent}
                onChange={(e) => setEditing({ ...editing, textContent: e.target.value })}
              />
            </label>
          </div>
        )}
      </Modal>
    </AppShell>
  );
}
