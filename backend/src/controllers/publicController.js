const Contact = require('../models/Contact');
const Unsubscribe = require('../models/Unsubscribe');
const { verifyToken } = require('../utils/unsubscribeToken');
const { ALL_VARIABLES } = require('../services/templateEngine');

async function unsubscribe(req, res) {
  const { email, token, workspace } = req.query;

  if (!email || !verifyToken(email, workspace, token)) {
    return res.status(400).send(unsubscribePage({
      title: 'Link could not be verified',
      body: 'This unsubscribe link is invalid or has expired. If you no longer wish to receive emails from HeyMailer, please contact support.',
    }));
  }

  const normalized = email.toLowerCase().trim();

  await Unsubscribe.updateOne(
    { workspaceId: workspace, email: normalized },
    { $setOnInsert: { workspaceId: workspace, email: normalized, reason: 'Clicked unsubscribe link' } },
    { upsert: true }
  );
  await Contact.updateOne({ workspaceId: workspace, email: normalized }, { $set: { status: 'unsubscribed' } });

  res.send(unsubscribePage({
    title: "You've been unsubscribed",
    body: `${normalized} will no longer receive marketing emails from HeyMailer. Account and security notices are unaffected.`,
  }));
}

function unsubscribePage({ title, body }) {
  return `<!doctype html>
<html><head><meta charset="utf-8"><title>HeyMailer</title>
<style>
  body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;background:#F4F7F5;color:#14241C;
    display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:24px;}
  .card{background:#fff;max-width:440px;padding:40px 32px;border-radius:16px;box-shadow:0 1px 3px rgba(0,0,0,.08);text-align:center;}
  h1{font-size:20px;margin:0 0 12px;color:#073D2D;}
  p{font-size:14px;line-height:1.6;color:#637069;margin:0;}
  .badge{width:48px;height:48px;border-radius:50%;background:#EAF8F1;color:#0B7A53;display:flex;
    align-items:center;justify-content:center;margin:0 auto 16px;font-size:22px;}
</style></head>
<body><div class="card"><div class="badge">✓</div><h1>${title}</h1><p>${body}</p></div></body></html>`;
}

async function variables(req, res) {
  res.json({ variables: ALL_VARIABLES });
}

module.exports = { unsubscribe, variables };
