'use client';

import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import {
  Bold, Italic, Heading2, Link2, RectangleHorizontal, Minus, Image as ImageIcon,
  MoveVertical, Code2, Eye, Braces,
} from 'lucide-react';

const TOOLS = [
  { key: 'bold', icon: Bold, label: 'Bold' },
  { key: 'italic', icon: Italic, label: 'Italic' },
  { key: 'heading', icon: Heading2, label: 'Heading' },
  { key: 'link', icon: Link2, label: 'Link' },
  { key: 'button', icon: RectangleHorizontal, label: 'CTA Button' },
  { key: 'divider', icon: Minus, label: 'Divider' },
  { key: 'image', icon: ImageIcon, label: 'Image' },
  { key: 'spacer', icon: MoveVertical, label: 'Spacing' },
];

/**
 * A pragmatic two-mode email body editor:
 *  - Visual: a contentEditable surface using execCommand for the common
 *    formatting actions. Good enough for an internal marketing tool without
 *    pulling in a full rich-text framework.
 *  - HTML: a raw textarea for admins who want full control.
 * Both modes read/write the same `value` string so switching never loses
 * content.
 */
export default function EmailEditor({ value, onChange, variables = [] }) {
  const [mode, setMode] = useState('visual');
  const editableRef = useRef(null);
  const [showVarMenu, setShowVarMenu] = useState(false);

  useEffect(() => {
    if (mode === 'visual' && editableRef.current) {
      if (editableRef.current.innerHTML !== value) {
        editableRef.current.innerHTML = value || '<p>Start writing your email…</p>';
      }
    }
  }, [mode]); // eslint-disable-line react-hooks/exhaustive-deps

  const emitChange = () => {
    if (editableRef.current) onChange(editableRef.current.innerHTML);
  };

  const exec = (command, arg) => {
    editableRef.current?.focus();
    document.execCommand(command, false, arg);
    emitChange();
  };

  const runTool = (key) => {
    switch (key) {
      case 'bold': return exec('bold');
      case 'italic': return exec('italic');
      case 'heading': return exec('formatBlock', '<h2>');
      case 'link': {
        const url = prompt('Link URL (you can use {{savingsUrl}}, {{thriftUrl}}, etc.)', 'https://');
        if (url) exec('createLink', url);
        return;
      }
      case 'button': {
        const label = prompt('Button label', 'Explore HeyMailer Savings') || 'Learn More';
        const url = prompt('Button URL', '{{savingsUrl}}') || '#';
        exec(
          'insertHTML',
          `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:12px 0;"><tr><td style="background-color:#0B7A53;border-radius:10px;"><a href="${url}" style="display:inline-block;padding:13px 26px;font-size:14px;font-weight:600;color:#FFFFFF;text-decoration:none;border-radius:10px;">${label}</a></td></tr></table>`
        );
        return;
      }
      case 'divider':
        return exec('insertHTML', '<hr style="border:none;border-top:1px solid #EAEFEC;margin:20px 0;">');
      case 'image': {
        const src = prompt('Image URL', 'https://');
        if (src) exec('insertHTML', `<img src="${src}" alt="" style="max-width:100%;border-radius:8px;margin:12px 0;">`);
        return;
      }
      case 'spacer':
        return exec('insertHTML', '<div style="height:24px;line-height:24px;">&nbsp;</div>');
      default:
        return;
    }
  };

  const insertVariable = (key) => {
    setShowVarMenu(false);
    if (mode === 'html') {
      onChange(`${value || ''}{{${key}}}`);
      return;
    }
    exec('insertHTML', `{{${key}}}`);
  };

  return (
    <div className="border border-surface-line rounded-lg overflow-hidden">
      <div className="flex items-center justify-between bg-surface px-3 py-2 border-b border-surface-line">
        <div className="flex items-center gap-1">
          {mode === 'visual' &&
            TOOLS.map(({ key, icon: Icon, label }) => (
              <button
                key={key}
                type="button"
                title={label}
                onClick={() => runTool(key)}
                className="w-7 h-7 flex items-center justify-center rounded-md text-ink-soft hover:bg-white hover:text-emerald-600 transition-colors"
              >
                <Icon size={14} />
              </button>
            ))}
          <div className="relative">
            <button
              type="button"
              title="Insert Variable"
              onClick={() => setShowVarMenu((s) => !s)}
              className="w-7 h-7 flex items-center justify-center rounded-md text-ink-soft hover:bg-white hover:text-emerald-600 transition-colors"
            >
              <Braces size={14} />
            </button>
            {showVarMenu && (
              <div className="absolute z-20 top-9 left-0 w-56 max-h-64 overflow-y-auto bg-white border border-surface-line rounded-lg shadow-pop py-1">
                {variables.map((v) => (
                  <button
                    key={v.key}
                    type="button"
                    onClick={() => insertVariable(v.key)}
                    className="w-full text-left px-3 py-1.5 text-xs text-ink hover:bg-surface flex items-center justify-between"
                  >
                    <span>{v.label}</span>
                    <span className="text-ink-faint font-mono">{`{{${v.key}}}`}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 bg-white border border-surface-line rounded-md p-0.5">
          <button
            type="button"
            onClick={() => setMode('visual')}
            className={clsx('flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold', mode === 'visual' ? 'bg-emerald-600 text-white' : 'text-ink-soft')}
          >
            <Eye size={12} /> Visual
          </button>
          <button
            type="button"
            onClick={() => {
              if (editableRef.current) onChange(editableRef.current.innerHTML);
              setMode('html');
            }}
            className={clsx('flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-semibold', mode === 'html' ? 'bg-emerald-600 text-white' : 'text-ink-soft')}
          >
            <Code2 size={12} /> HTML
          </button>
        </div>
      </div>

      {mode === 'visual' ? (
        <div
          ref={editableRef}
          contentEditable
          suppressContentEditableWarning
          onInput={emitChange}
          onBlur={emitChange}
          className="min-h-[320px] max-h-[480px] overflow-y-auto px-5 py-4 text-sm text-ink outline-none bg-white [&_a]:text-emerald-600"
        />
      ) : (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          spellCheck={false}
          className="w-full min-h-[320px] max-h-[480px] px-4 py-3 text-xs font-mono text-ink outline-none resize-y"
        />
      )}
    </div>
  );
}
