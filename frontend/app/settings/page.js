'use client';

import { useEffect, useState } from 'react';
import AppShell from '@/components/AppShell';
import { Card, Button, Badge, Input, Select } from '@/components/ui';
import api, { errMsg } from '@/lib/api';
import { PlugZap, CheckCircle2, XCircle, Send, Trash2 } from 'lucide-react';

export default function SettingsPage() {
  const [settings, setSettings] = useState(null);
  const [smtpPassword, setSmtpPassword] = useState('');
  const [envConfigured, setEnvConfigured] = useState(false);
  const [mailProvider, setMailProvider] = useState('smtp');
  const [activeProvider, setActiveProvider] = useState('smtp');
  const [providerConfigurations, setProviderConfigurations] = useState({});
  const [storedPasswordConfigured, setStoredPasswordConfigured] = useState(false);
  const [testRecipient, setTestRecipient] = useState('');
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);
  const [clearingPassword, setClearingPassword] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [saved, setSaved] = useState(false);

  const load = () => api.get('/settings').then(({ data }) => {
    setSettings(data.settings);
    setMailProvider(data.mailProvider || 'smtp');
    setActiveProvider(data.mailProvider || 'smtp');
    setEnvConfigured(data.envConfigured);
    setProviderConfigurations(data.providerConfigurations || {});
    setStoredPasswordConfigured(data.storedPasswordConfigured);
  });
  useEffect(() => { load(); }, []);

  const update = (field, val) => setSettings((s) => ({ ...s, [field]: val }));

  const selectProvider = (provider) => {
    setMailProvider(provider);
    setEnvConfigured(Boolean(providerConfigurations[provider]));
    setTestResult(null);
    update('mailProvider', provider);
  };

  const save = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const payload = { ...settings };
      if (smtpPassword) payload.smtpAppPassword = smtpPassword;
      await api.put('/settings', payload);
      setSmtpPassword('');
      setSaved(true);
      load();
    } catch (err) {
      alert(errMsg(err));
    } finally {
      setSaving(false);
    }
  };

  const testProvider = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const { data } = await api.post('/settings/test-provider');
      setTestResult(data);
    } catch (err) {
      setTestResult({ connected: false, message: errMsg(err) });
    } finally {
      setTesting(false);
      load();
    }
  };

  const sendTestEmail = async () => {
    setSendingTest(true);
    setTestResult(null);
    try {
      const { data } = await api.post('/settings/test-email', { recipient: testRecipient });
      setTestResult({ connected: true, message: data.message });
    } catch (err) {
      setTestResult({ connected: false, message: errMsg(err) });
    } finally {
      setSendingTest(false);
      load();
    }
  };

  const clearSavedPassword = async () => {
    if (!window.confirm('Clear the SMTP password saved in the dashboard?')) return;
    setClearingPassword(true);
    setTestResult(null);
    try {
      const { data } = await api.delete('/settings/smtp-password');
      setSmtpPassword('');
      setTestResult({ connected: true, message: data.message });
      await load();
    } catch (err) {
      setTestResult({ connected: false, message: errMsg(err) });
    } finally {
      setClearingPassword(false);
    }
  };

  if (!settings) return <AppShell title="Settings"><div /></AppShell>;

  return (
    <AppShell title="Settings">
      <div className="max-w-2xl space-y-6">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-ink">
              {mailProvider === 'mailjet' ? 'Mailjet Email API' : mailProvider === 'resend' ? 'Resend Email API' : 'Google SMTP'}
            </h3>
            <Badge tone={settings.smtpConnected ? 'success' : 'default'}>
              {settings.smtpConnected ? 'Connected' : 'Not Connected'}
            </Badge>
          </div>
          <div className="mb-4">
            <Select label="Active Mail Provider" value={mailProvider} onChange={(e) => selectProvider(e.target.value)}>
              <option value="mailjet">Mailjet API{providerConfigurations.mailjet ? ' — configured' : ''}</option>
              <option value="resend">Resend API{providerConfigurations.resend ? ' — configured' : ''}</option>
              <option value="smtp">Google SMTP{providerConfigurations.smtp ? ' — configured' : ''}</option>
            </Select>
            {activeProvider !== mailProvider && (
              <p className="text-xs text-amber-700 mt-1.5">Save Settings to activate this provider.</p>
            )}
          </div>
          <p className="text-xs text-ink-soft mb-4">
            {mailProvider === 'mailjet'
              ? (envConfigured
                ? 'Mailjet API credentials and a sender are configured securely on the backend.'
                : 'Mailjet is selected but its API key, secret, or verified sender is missing from the backend environment.')
              : mailProvider === 'resend'
                ? (envConfigured
                  ? 'Resend API credentials and a verified-domain sender are configured securely on the backend.'
                  : 'Resend is selected but its API key or sender email is missing from the backend environment.')
                : (envConfigured
                ? 'A default SMTP user/app password is configured via environment variables. You can override the app password here if needed.'
                : 'No SMTP credentials found in environment variables — set them here or in the backend .env file.')}
          </p>
          {mailProvider === 'smtp' && storedPasswordConfigured && (
            <p className="text-xs text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2 mb-4">
              An encrypted dashboard password is active and overrides the environment password.
            </p>
          )}
          {mailProvider === 'smtp' && (
            <div className="grid sm:grid-cols-2 gap-4 mb-4">
              <Input label="SMTP User (Gmail address)" value={settings.smtpUser} onChange={(e) => update('smtpUser', e.target.value)} placeholder="notifications@roundtable.com" />
              <Input label="App Password" type="password" value={smtpPassword} onChange={(e) => setSmtpPassword(e.target.value)} placeholder="Leave blank to keep current" />
            </div>
          )}
          {mailProvider === 'mailjet' && (
            <p className="text-xs text-ink-soft bg-surface-muted rounded-lg px-3 py-2 mb-4">
              API credentials are managed in Render environment variables and are never exposed here. Sender Email below must be verified in Mailjet.
            </p>
          )}
          {mailProvider === 'resend' && (
            <p className="text-xs text-ink-soft bg-surface-muted rounded-lg px-3 py-2 mb-4">
              The API key is managed in Render and never exposed here. Sender Email below must use your verified Resend domain.
            </p>
          )}
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="secondary" size="sm" onClick={testProvider} disabled={testing || activeProvider !== mailProvider}>
              <PlugZap size={14} /> {testing ? 'Testing…' : `Test ${mailProvider === 'mailjet' ? 'Mailjet API' : mailProvider === 'resend' ? 'Resend API' : 'SMTP Connection'}`}
            </Button>
            {mailProvider === 'smtp' && storedPasswordConfigured && (
              <Button variant="ghost" size="sm" onClick={clearSavedPassword} disabled={clearingPassword}>
                <Trash2 size={14} /> {clearingPassword ? 'Clearing…' : 'Clear Saved Password'}
              </Button>
            )}
          </div>
          <div className="mt-4 border-t border-surface-line pt-4">
            <p className="text-xs font-semibold text-ink-soft mb-2">Send a real delivery test</p>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                type="email"
                placeholder="recipient@example.com"
                value={testRecipient}
                onChange={(e) => setTestRecipient(e.target.value)}
                className="sm:w-72"
              />
              <Button size="sm" onClick={sendTestEmail} disabled={sendingTest || !testRecipient || activeProvider !== mailProvider}>
                <Send size={14} /> {sendingTest ? 'Sending…' : 'Send Test Email'}
              </Button>
            </div>
          </div>
          <div className="mt-3">
            {testResult && (
              <span className={`text-xs font-semibold flex items-center gap-1 ${testResult.connected ? 'text-emerald-700' : 'text-danger'}`}>
                {testResult.connected ? <CheckCircle2 size={14} /> : <XCircle size={14} />} {testResult.message}
              </span>
            )}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-sm font-bold text-ink mb-4">Sender & Brand</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <Input label="Sender Name" value={settings.senderName} onChange={(e) => update('senderName', e.target.value)} />
            <Input label="Sender Email" value={settings.senderEmail} onChange={(e) => update('senderEmail', e.target.value)} />
            <Input label="Reply-To" value={settings.replyTo} onChange={(e) => update('replyTo', e.target.value)} />
            <Input label="Support Email" value={settings.supportEmail} onChange={(e) => update('supportEmail', e.target.value)} />
            <Input label="Website URL" value={settings.websiteUrl} onChange={(e) => update('websiteUrl', e.target.value)} />
            <Input label="Savings Page URL" value={settings.savingsUrl} onChange={(e) => update('savingsUrl', e.target.value)} />
            <Input label="Thrift Page URL" value={settings.thriftUrl} onChange={(e) => update('thriftUrl', e.target.value)} />
            <Input label="Telegram Support URL" value={settings.telegramUrl} onChange={(e) => update('telegramUrl', e.target.value)} />
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-sm font-bold text-ink mb-4">Sending Queue</h3>
          <div className="grid sm:grid-cols-2 gap-4">
            <Input label="Batch Size" type="number" min={1} value={settings.batchSize} onChange={(e) => update('batchSize', Number(e.target.value))} />
            <Input
              label="Delay Between Batches (minutes)"
              type="number"
              min={0}
              value={Math.round(settings.batchDelayMs / 60000)}
              onChange={(e) => update('batchDelayMs', Number(e.target.value) * 60000)}
            />
          </div>
          <p className="text-xs text-ink-soft mt-3">
            These defaults pace campaign delivery and help protect your sender reputation and provider limits.
          </p>
        </Card>

        <div className="flex items-center gap-3">
          <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save Settings'}</Button>
          {saved && <span className="text-xs text-emerald-700 font-semibold">Saved.</span>}
        </div>
      </div>
    </AppShell>
  );
}
