'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AppShell from '@/components/AppShell';
import EmailEditor from '@/components/EmailEditor';
import EmailPreview from '@/components/EmailPreview';
import { Card, Button, Input, Select, Modal, Badge } from '@/components/ui';
import api, { errMsg } from '@/lib/api';
import { Send, Save, FileStack, ChevronRight, Users, UsersRound, X, MailCheck } from 'lucide-react';

const emptyCampaign = {
  name: '', subject: '', preheader: '', senderName: 'HeyMailer', senderEmail: '', replyTo: '',
  templateId: '', htmlContent: '<p>Hi {{firstName}},</p>', textContent: 'Hi {{firstName}},',
  recipientType: 'group', contactIds: [], groupIds: [],
};

function ComposeInner() {
  const router = useRouter();
  const params = useSearchParams();
  const [campaign, setCampaign] = useState(emptyCampaign);
  const [templates, setTemplates] = useState([]);
  const [groups, setGroups] = useState([]);
  const [contactSearch, setContactSearch] = useState('');
  const [contactResults, setContactResults] = useState([]);
  const [selectedContacts, setSelectedContacts] = useState([]); // [{_id,email,firstName,lastName}]
  const [variables, setVariables] = useState([]);
  const [step, setStep] = useState('compose');
  const [recipientPreview, setRecipientPreview] = useState(null);
  const [testEmail, setTestEmail] = useState('');
  const [testStatus, setTestStatus] = useState('');
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [draftId, setDraftId] = useState(params.get('draftId') || null);

  useEffect(() => {
    api.get('/templates').then((res) => setTemplates(res.data.templates));
    api.get('/contact-groups').then((res) => setGroups(res.data.groups));
    api.get('/public/variables').then((res) => setVariables(res.data.variables));
    if (!draftId) {
      api.get('/settings').then(({ data }) => {
        setCampaign((current) => ({
          ...current,
          senderName: data.settings.senderName || current.senderName,
          senderEmail: data.activeSenderEmail || data.settings.senderEmail || '',
          replyTo: data.settings.replyTo || '',
        }));
      });
    }
  }, [draftId]);

  useEffect(() => {
    const templateId = params.get('templateId');
    if (templateId) loadTemplate(templateId, { keepName: false });
  }, [params]);

  useEffect(() => {
    if (draftId) {
      api.get(`/drafts/${draftId}`).then(({ data }) => {
        const d = data.draft;
        setCampaign({
          name: d.name, subject: d.subject, preheader: d.preheader, senderName: d.senderName,
          senderEmail: d.senderEmail || '',
          replyTo: d.replyTo, templateId: d.templateId || '', htmlContent: d.htmlContent,
          textContent: d.textContent, recipientType: d.recipientType, contactIds: d.contactIds || [],
          groupIds: d.groupIds || [],
        });
      });
    }
  }, [draftId]);

  useEffect(() => {
    if (!contactSearch) return setContactResults([]);
    const t = setTimeout(() => {
      api.get('/contacts', { params: { search: contactSearch, limit: 8 } }).then((res) => setContactResults(res.data.contacts));
    }, 300);
    return () => clearTimeout(t);
  }, [contactSearch]);

  const loadTemplate = async (id) => {
    const { data } = await api.get(`/templates/${id}`);
    setCampaign((c) => ({
      ...c,
      templateId: id,
      subject: data.template.subject,
      preheader: data.template.preheader,
      htmlContent: data.template.htmlContent,
      textContent: data.template.textContent,
    }));
  };

  const update = (field, val) => setCampaign((c) => ({ ...c, [field]: val }));

  const toggleGroup = (id) => {
    setCampaign((c) => ({
      ...c,
      groupIds: c.groupIds.includes(id) ? c.groupIds.filter((g) => g !== id) : [...c.groupIds, id],
    }));
  };

  const addContact = (contact) => {
    if (campaign.contactIds.includes(contact._id)) return;
    setSelectedContacts((s) => [...s, contact]);
    setCampaign((c) => ({ ...c, contactIds: [...c.contactIds, contact._id] }));
    setContactSearch('');
    setContactResults([]);
  };

  const removeContact = (id) => {
    setSelectedContacts((s) => s.filter((c) => c._id !== id));
    setCampaign((c) => ({ ...c, contactIds: c.contactIds.filter((cid) => cid !== id) }));
  };

  const saveDraft = async () => {
    setBusy(true);
    try {
      const payload = { ...campaign };
      if (draftId) {
        await api.put(`/drafts/${draftId}`, payload);
      } else {
        const { data } = await api.post('/drafts', payload);
        setDraftId(data.draft._id);
      }
      alert('Draft saved.');
    } catch (err) {
      alert(errMsg(err, 'Could not save draft.'));
    } finally {
      setBusy(false);
    }
  };

  const saveAsTemplate = async () => {
    if (!newTemplateName.trim()) return;
    setBusy(true);
    try {
      await api.post('/templates', {
        name: newTemplateName,
        category: 'Marketing',
        subject: campaign.subject,
        preheader: campaign.preheader,
        htmlContent: campaign.htmlContent,
        textContent: campaign.textContent,
        description: `Saved from composer on ${new Date().toLocaleDateString()}`,
      });
      setSaveTemplateOpen(false);
      setNewTemplateName('');
      alert('Saved as a new template.');
    } catch (err) {
      alert(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  const sendTest = async () => {
    if (!testEmail) return;
    setTestStatus('sending');
    try {
      await api.post('/campaigns/send-test', {
        testEmail, subject: campaign.subject, htmlContent: campaign.htmlContent, textContent: campaign.textContent,
        senderName: campaign.senderName, senderEmail: campaign.senderEmail, replyTo: campaign.replyTo,
      });
      setTestStatus('sent');
    } catch (err) {
      setTestStatus('failed');
      alert(errMsg(err, 'Could not send test email.'));
    }
  };

  const validate = () => {
    if (!campaign.name.trim()) return 'Give this campaign a name.';
    if (!campaign.subject.trim()) return 'A subject line is required.';
    if (!campaign.senderEmail.trim()) return 'A sender email is required.';
    if (campaign.groupIds.length === 0 && campaign.contactIds.length === 0) return 'Select at least one contact or group.';
    return null;
  };

  const goToConfirm = async () => {
    const v = validate();
    if (v) return setError(v);
    setError('');
    setBusy(true);
    try {
      const { data } = await api.post('/campaigns/resolve-recipients', {
        contactIds: campaign.contactIds, groupIds: campaign.groupIds,
      });
      setRecipientPreview(data);
      setStep('confirm');
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  };

  const sendCampaign = async () => {
    setBusy(true);
    setError('');
    try {
      const { data } = await api.post('/campaigns', campaign);
      await api.post(`/campaigns/${data.campaign._id}/send`);
      router.push(`/campaigns/${data.campaign._id}`);
    } catch (err) {
      setError(errMsg(err, 'Could not start the campaign.'));
      setBusy(false);
    }
  };

  if (step === 'confirm') {
    return (
      <AppShell title="Ready to Send">
        <div className="max-w-xl mx-auto">
          <Card className="p-7">
            <h2 className="text-base font-bold text-ink mb-1">Ready to Send</h2>
            <p className="text-xs text-ink-soft mb-6">Review the details below before this campaign goes out.</p>

            <dl className="space-y-3 text-sm mb-6">
              {[
                ['Campaign', campaign.name],
                ['Subject', campaign.subject],
                ['Sender', campaign.senderName || 'HeyMailer'],
                ['Sender Email', campaign.senderEmail],
                ['Reply-To', campaign.replyTo || campaign.senderEmail],
                ['Recipients', `${recipientPreview?.eligibleCount ?? 0} eligible${recipientPreview?.excludedCount ? ` (${recipientPreview.excludedCount} excluded — unsubscribed/inactive)` : ''}`],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between border-b border-surface-line pb-3">
                  <dt className="text-ink-soft">{label}</dt>
                  <dd className="font-semibold text-ink text-right max-w-[60%]">{value}</dd>
                </div>
              ))}
            </dl>

            {error && <p className="text-xs text-danger bg-danger-bg rounded-lg px-3 py-2 mb-4">{error}</p>}

            <div className="flex gap-3">
              <Button variant="ghost" className="flex-1" onClick={() => setStep('compose')} disabled={busy}>Back to Edit</Button>
              <Button className="flex-1" onClick={sendCampaign} disabled={busy}>
                <Send size={15} /> {busy ? 'Sending…' : 'Send Campaign'}
              </Button>
            </div>
          </Card>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Compose Email"
      actions={
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={saveDraft} disabled={busy}><Save size={14} /> Save Draft</Button>
          <Button variant="secondary" size="sm" onClick={() => setSaveTemplateOpen(true)}><FileStack size={14} /> Save as Template</Button>
          <Button size="sm" onClick={goToConfirm} disabled={busy}>Continue <ChevronRight size={14} /></Button>
        </div>
      }
    >
      {error && <p className="text-xs text-danger bg-danger-bg rounded-lg px-3 py-2 mb-4">{error}</p>}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* LEFT: controls */}
        <div className="space-y-5">
          <Card className="p-5 space-y-4">
            <h3 className="text-xs font-bold text-ink-soft uppercase tracking-wide">Email Information</h3>
            <Input label="Campaign / Email Name" value={campaign.name} onChange={(e) => update('name', e.target.value)} placeholder="HeyMailer Savings Invitation August" />
            <div className="grid sm:grid-cols-2 gap-3">
              <Select label="Choose Template" value={campaign.templateId} onChange={(e) => e.target.value && loadTemplate(e.target.value)}>
                <option value="">Select a template…</option>
                {templates.map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
              </Select>
              <Input label="Approved Sender Name" value={campaign.senderName} disabled />
            </div>
            <Input label="Approved From Email" type="email" value={campaign.senderEmail} disabled placeholder="Configured by HeyMailer administration" />
            <Input label="Subject" value={campaign.subject} onChange={(e) => update('subject', e.target.value)} placeholder="What if your savings could do more?" />
            <Input label="Preheader Text" value={campaign.preheader} onChange={(e) => update('preheader', e.target.value)} placeholder="Shown after the subject line in most inboxes" />
            <Input label="Approved Reply-To Email" type="email" value={campaign.replyTo} disabled placeholder="Configured by HeyMailer administration" />
            <p className="text-xs text-ink-soft">Your From and Reply-To identities are locked to the verified workspace domain configuration.</p>
          </Card>

          <Card className="p-5 space-y-4">
            <h3 className="text-xs font-bold text-ink-soft uppercase tracking-wide">Recipients</h3>
            <div>
              <p className="text-xs font-semibold text-ink-soft mb-2 flex items-center gap-1.5"><UsersRound size={13} /> Contact Groups</p>
              <div className="flex flex-wrap gap-2">
                {groups.map((g) => (
                  <button
                    key={g._id}
                    onClick={() => toggleGroup(g._id)}
                    className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                      campaign.groupIds.includes(g._id)
                        ? 'bg-emerald-600 border-emerald-600 text-white'
                        : 'bg-white border-surface-line text-ink-soft hover:border-emerald-600'
                    }`}
                  >
                    {g.name} <span className="opacity-70">({g.contactCount})</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold text-ink-soft mb-2 flex items-center gap-1.5"><Users size={13} /> Individual Contacts</p>
              <div className="relative">
                <Input placeholder="Search contacts by name or email…" value={contactSearch} onChange={(e) => setContactSearch(e.target.value)} />
                {contactResults.length > 0 && (
                  <div className="absolute z-20 mt-1 w-full bg-white border border-surface-line rounded-lg shadow-pop max-h-52 overflow-y-auto">
                    {contactResults.map((c) => (
                      <button key={c._id} onClick={() => addContact(c)} className="w-full text-left px-3 py-2 text-xs hover:bg-surface flex justify-between">
                        <span>{c.firstName} {c.lastName}</span>
                        <span className="text-ink-faint">{c.email}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {selectedContacts.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedContacts.map((c) => (
                    <span key={c._id} className="inline-flex items-center gap-1 text-xs bg-surface px-2.5 py-1 rounded-full text-ink">
                      {c.email}
                      <button onClick={() => removeContact(c._id)}><X size={12} className="text-ink-faint" /></button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </Card>

          <Card className="p-5 space-y-3">
            <h3 className="text-xs font-bold text-ink-soft uppercase tracking-wide">Email Body</h3>
            <EmailEditor value={campaign.htmlContent} onChange={(v) => update('htmlContent', v)} variables={variables} />
            <label className="block">
              <span className="block text-xs font-semibold text-ink-soft mb-1.5 mt-2">Plain Text Version</span>
              <textarea
                className="w-full h-24 rounded-lg border border-surface-line bg-white px-3.5 py-2.5 text-xs font-mono text-ink outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                value={campaign.textContent}
                onChange={(e) => update('textContent', e.target.value)}
              />
            </label>
          </Card>

          <Card className="p-5 space-y-3">
            <h3 className="text-xs font-bold text-ink-soft uppercase tracking-wide">Send Test Email</h3>
            <div className="flex gap-2">
              <Input placeholder="admin@example.com" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} className="flex-1" />
              <Button variant="secondary" onClick={sendTest} disabled={testStatus === 'sending'}>
                <MailCheck size={14} /> {testStatus === 'sending' ? 'Sending…' : 'Send Test'}
              </Button>
            </div>
            {testStatus === 'sent' && <Badge tone="success">Test email sent</Badge>}
          </Card>
        </div>

        {/* RIGHT: live preview */}
        <div className="lg:sticky lg:top-20 h-fit">
          <EmailPreview html={campaign.htmlContent} subject={campaign.subject} preheader={campaign.preheader} />
        </div>
      </div>

      <Modal
        open={saveTemplateOpen}
        onClose={() => setSaveTemplateOpen(false)}
        title="Save Changes as New Template"
        footer={
          <>
            <Button variant="ghost" onClick={() => setSaveTemplateOpen(false)}>Cancel</Button>
            <Button onClick={saveAsTemplate} disabled={busy}>Save Template</Button>
          </>
        }
      >
        <Input label="Template Name" value={newTemplateName} onChange={(e) => setNewTemplateName(e.target.value)} placeholder="Savings Invitation 03" autoFocus />
      </Modal>
    </AppShell>
  );
}

export default function ComposePage() {
  return (
    <Suspense fallback={null}>
      <ComposeInner />
    </Suspense>
  );
}
