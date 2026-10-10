const Admin = require('../models/Admin');
const Workspace = require('../models/Workspace');
const Settings = require('../models/Settings');
const Subscription = require('../models/Subscription');
const { encryptSecret } = require('../utils/credentialCrypto');
const { verifyConnection, invalidateTransporterCache } = require('../services/mailer');

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DOMAIN_PATTERN = /^(?=.{3,253}$)(?!-)[a-z0-9-]+(?:\.[a-z0-9-]+)+$/i;

function publicIdentity(settings) {
  const obj = settings.toObject();
  delete obj.providerApiKeyEncrypted;
  delete obj.providerSecretEncrypted;
  delete obj.smtpAppPasswordOverride;
  delete obj.bounceLastUid;
  obj.apiKeyConfigured = Boolean(settings.providerApiKeyEncrypted);
  obj.providerSecretConfigured = Boolean(settings.providerSecretEncrypted);
  obj.smtpPasswordConfigured = Boolean(settings.smtpAppPasswordOverride);
  return obj;
}

async function list(req, res) {
  const workspaces = await Workspace.find().sort({ createdAt: -1 }).lean();
  const ids = workspaces.map((item) => item._id);
  const [owners, subscriptions, identities] = await Promise.all([
    Admin.find({ workspaceId: { $in: ids } }).select('name email role status workspaceId').lean(),
    Subscription.find({ userId: { $in: workspaces.map((item) => item.ownerId) } }).populate('planId', 'name').lean(),
    Settings.find({ workspaceId: { $in: ids } }).lean(),
  ]);
  res.json({ workspaces: workspaces.map((workspace) => ({
    ...workspace,
    owner: owners.find((item) => String(item._id) === String(workspace.ownerId)),
    subscription: subscriptions.find((item) => String(item.userId) === String(workspace.ownerId)),
    identity: identities.find((item) => String(item.workspaceId) === String(workspace._id)),
  })) });
}

async function getOne(req, res) {
  const workspace = await Workspace.findById(req.params.id);
  if (!workspace) return res.status(404).json({ message: 'Workspace not found.' });
  const [owner, subscription, settings] = await Promise.all([
    Admin.findById(workspace.ownerId).select('name email role status workspaceName'),
    Subscription.findOne({ userId: workspace.ownerId }).populate('planId', 'name limits'),
    Settings.getForWorkspace(workspace._id, true),
  ]);
  res.json({ workspace, owner, subscription, identity: publicIdentity(settings) });
}

async function updateIdentity(req, res) {
  const workspace = await Workspace.findById(req.params.id);
  if (!workspace) return res.status(404).json({ message: 'Workspace not found.' });
  const settings = await Settings.getForWorkspace(workspace._id, true);
  const provider = String(req.body.mailProvider || settings.mailProvider || '').toLowerCase();
  const sendingDomain = String(req.body.sendingDomain ?? settings.sendingDomain).trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');
  const senderEmail = String(req.body.senderEmail ?? settings.senderEmail).trim().toLowerCase();
  const replyTo = String(req.body.replyTo ?? settings.replyTo).trim().toLowerCase();
  const unsubscribeEndpoint = String(req.body.unsubscribeEndpoint ?? settings.unsubscribeEndpoint).trim().replace(/\/$/, '');

  if (!['resend', 'mailjet', 'smtp'].includes(provider)) return res.status(400).json({ message: 'Choose Resend, Mailjet, or SMTP.' });
  if (sendingDomain && !DOMAIN_PATTERN.test(sendingDomain)) return res.status(400).json({ message: 'Enter a valid sending domain without https:// or a path.' });
  if (senderEmail && (!EMAIL_PATTERN.test(senderEmail) || senderEmail.split('@')[1] !== sendingDomain)) {
    return res.status(400).json({ message: 'The From email must use the exact verified sending domain.' });
  }
  if (replyTo && !EMAIL_PATTERN.test(replyTo)) return res.status(400).json({ message: 'Enter a valid Reply-To email.' });
  if (unsubscribeEndpoint) {
    try {
      const endpoint = new URL(unsubscribeEndpoint);
      const hostnameMatches = endpoint.hostname === sendingDomain || endpoint.hostname.endsWith(`.${sendingDomain}`);
      if (!sendingDomain || endpoint.protocol !== 'https:' || !hostnameMatches) throw new Error('invalid');
    } catch {
      return res.status(400).json({ message: 'The unsubscribe endpoint must be an HTTPS URL on the verified customer domain.' });
    }
  }

  settings.mailProvider = provider;
  settings.sendingDomain = sendingDomain;
  settings.senderName = String(req.body.senderName ?? settings.senderName).trim().slice(0, 120);
  settings.senderEmail = senderEmail;
  settings.replyTo = replyTo;
  settings.unsubscribeEndpoint = unsubscribeEndpoint;
  ['domainStatus', 'spfStatus', 'dkimStatus', 'dmarcStatus'].forEach((field) => {
    if (req.body[field] !== undefined) settings[field] = req.body[field];
  });
  if (req.body.apiKey) settings.providerApiKeyEncrypted = encryptSecret(String(req.body.apiKey).trim());
  if (req.body.providerSecret) settings.providerSecretEncrypted = encryptSecret(String(req.body.providerSecret).trim());
  if (req.body.smtpPassword) settings.smtpAppPasswordOverride = encryptSecret(String(req.body.smtpPassword).replace(/\s/g, ''));
  if (req.body.smtpUser !== undefined) settings.smtpUser = String(req.body.smtpUser).trim();
  if (req.body.smtpHost !== undefined) settings.smtpHost = String(req.body.smtpHost).trim();
  if (req.body.smtpPort !== undefined) settings.smtpPort = Number(req.body.smtpPort);
  if (req.body.smtpSecure !== undefined) settings.smtpSecure = Boolean(req.body.smtpSecure);

  const authReady = provider === 'resend'
    ? Boolean(settings.providerApiKeyEncrypted)
    : provider === 'mailjet'
      ? Boolean(settings.providerApiKeyEncrypted && settings.providerSecretEncrypted)
      : Boolean(settings.smtpUser && settings.smtpAppPasswordOverride);
  const identityReady = Boolean(senderEmail && sendingDomain && settings.domainStatus === 'verified' && settings.spfStatus === 'verified' && settings.dkimStatus === 'verified');
  settings.sendingEnabled = Boolean(req.body.sendingEnabled) && authReady && identityReady;
  workspace.sendingEnabled = settings.sendingEnabled;
  await Promise.all([settings.save(), workspace.save()]);
  invalidateTransporterCache();
  res.json({ workspace, identity: publicIdentity(settings), message: settings.sendingEnabled ? 'Sending identity verified and enabled.' : 'Sending identity saved. Sending remains disabled until credentials, SPF, DKIM, and domain verification are complete.' });
}

async function testProvider(req, res) {
  const workspace = await Workspace.findById(req.params.id);
  if (!workspace) return res.status(404).json({ message: 'Workspace not found.' });
  const settings = await Settings.getForWorkspace(workspace._id, true);
  await verifyConnection(settings);
  settings.smtpConnected = true;
  settings.smtpLastCheckedAt = new Date();
  await settings.save();
  res.json({ connected: true, message: `${settings.mailProvider} credentials connected successfully.` });
}

module.exports = { list, getOne, updateIdentity, testProvider };
