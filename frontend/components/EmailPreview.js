'use client';

import { useState } from 'react';
import clsx from 'clsx';
import { Monitor, Smartphone } from 'lucide-react';

export default function EmailPreview({ html, subject, preheader }) {
  const [mode, setMode] = useState('desktop');

  return (
    <div className="border border-surface-line rounded-lg overflow-hidden bg-surface">
      <div className="flex items-center justify-between px-4 py-2.5 bg-white border-b border-surface-line">
        <div className="min-w-0">
          <p className="text-xs font-bold text-ink truncate">{subject || 'No subject yet'}</p>
          <p className="text-[11px] text-ink-faint truncate">{preheader || 'No preheader text'}</p>
        </div>
        <div className="flex items-center gap-1 bg-surface border border-surface-line rounded-md p-0.5 shrink-0 ml-3">
          <button
            onClick={() => setMode('desktop')}
            className={clsx('w-7 h-7 flex items-center justify-center rounded', mode === 'desktop' ? 'bg-emerald-600 text-white' : 'text-ink-soft')}
            title="Desktop preview"
          >
            <Monitor size={13} />
          </button>
          <button
            onClick={() => setMode('mobile')}
            className={clsx('w-7 h-7 flex items-center justify-center rounded', mode === 'mobile' ? 'bg-emerald-600 text-white' : 'text-ink-soft')}
            title="Mobile preview"
          >
            <Smartphone size={13} />
          </button>
        </div>
      </div>
      <div className="flex justify-center py-6 px-4 max-h-[560px] overflow-y-auto">
        <iframe
          title="Email preview"
          srcDoc={html || '<p style="font-family:sans-serif;color:#98A29C;padding:24px;">Nothing to preview yet.</p>'}
          className={clsx('email-preview-frame bg-white shadow-card rounded-lg transition-all', mode === 'desktop' ? 'w-full max-w-[600px] h-[520px]' : 'w-[375px] h-[560px]')}
        />
      </div>
    </div>
  );
}
