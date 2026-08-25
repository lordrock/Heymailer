'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AppShell from '@/components/AppShell';
import { Card, Button, EmptyState, Spinner } from '@/components/ui';
import api from '@/lib/api';
import { FileClock, Trash2, PenSquare } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export default function DraftsPage() {
  const [drafts, setDrafts] = useState(null);

  const load = () => api.get('/drafts').then((res) => setDrafts(res.data.drafts));
  useEffect(() => { load(); }, []);

  const remove = async (d) => {
    if (!confirm(`Delete draft "${d.name}"?`)) return;
    await api.delete(`/drafts/${d._id}`);
    load();
  };

  return (
    <AppShell title="Drafts">
      {!drafts ? (
        <div className="flex justify-center py-20"><Spinner size={28} /></div>
      ) : drafts.length === 0 ? (
        <Card>
          <EmptyState
            icon={FileClock}
            title="No saved drafts"
            description="Unfinished campaigns you save from the composer will show up here."
            action={<Link href="/campaigns/compose"><Button><PenSquare size={14} /> Compose Email</Button></Link>}
          />
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {drafts.map((d) => (
            <Card key={d._id} className="p-5 flex flex-col">
              <h3 className="text-sm font-bold text-ink mb-1 line-clamp-1">{d.name}</h3>
              <p className="text-xs text-ink-soft mb-1 line-clamp-1">{d.subject || 'No subject yet'}</p>
              <p className="text-[11px] text-ink-faint mb-4">Updated {formatDistanceToNow(new Date(d.updatedAt), { addSuffix: true })}</p>
              <div className="flex gap-2 mt-auto pt-3 border-t border-surface-line">
                <Link href={`/campaigns/compose?draftId=${d._id}`} className="flex-1">
                  <Button size="sm" variant="secondary" className="w-full">Continue Editing</Button>
                </Link>
                <Button size="sm" variant="ghost" onClick={() => remove(d)}><Trash2 size={13} className="text-danger" /></Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </AppShell>
  );
}
