function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function renderAuthEmail({ eyebrow, title, greeting, body, buttonLabel, url, expiry, securityNote }) {
  const safeUrl = escapeHtml(url);
  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title></head>
<body style="margin:0;padding:0;background:#f3f7f5;font-family:Arial,Helvetica,sans-serif;color:#14241c;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f7f5;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border:1px solid #dfe9e4;border-radius:20px;overflow:hidden;box-shadow:0 12px 32px rgba(6,47,36,.08);">
        <tr><td style="background:#062f24;padding:28px 36px;">
          <table role="presentation" cellspacing="0" cellpadding="0"><tr>
            <td style="width:42px;height:42px;border-radius:12px;background:#ffffff;text-align:center;vertical-align:middle;font-size:21px;">✉</td>
            <td style="padding-left:12px;"><div style="font-size:19px;line-height:22px;font-weight:700;color:#ffffff;">HeyMailer</div><div style="margin-top:3px;font-size:9px;letter-spacing:2px;color:#a7d8c3;">EMAIL SERVICES</div></td>
          </tr></table>
        </td></tr>
        <tr><td style="padding:38px 36px 20px;">
          <div style="font-size:11px;line-height:16px;font-weight:700;letter-spacing:1.6px;text-transform:uppercase;color:#0b7a53;">${escapeHtml(eyebrow)}</div>
          <h1 style="margin:10px 0 18px;font-size:28px;line-height:36px;color:#14241c;">${escapeHtml(title)}</h1>
          <p style="margin:0 0 12px;font-size:15px;line-height:24px;color:#3f554b;">${escapeHtml(greeting)}</p>
          <p style="margin:0;font-size:15px;line-height:24px;color:#637069;">${escapeHtml(body)}</p>
        </td></tr>
        <tr><td style="padding:10px 36px 30px;">
          <table role="presentation" cellspacing="0" cellpadding="0"><tr><td style="border-radius:10px;background:#0b7a53;">
            <a href="${safeUrl}" style="display:inline-block;padding:14px 22px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;">${escapeHtml(buttonLabel)} &nbsp;→</a>
          </td></tr></table>
          <p style="margin:18px 0 0;font-size:12px;line-height:19px;color:#7b8b83;">${escapeHtml(expiry)}</p>
        </td></tr>
        <tr><td style="padding:0 36px 34px;">
          <div style="border:1px solid #dcece5;background:#f4fbf7;border-radius:12px;padding:15px 16px;font-size:12px;line-height:19px;color:#456257;">🔒 &nbsp;${escapeHtml(securityNote)}</div>
          <p style="margin:22px 0 7px;font-size:11px;line-height:17px;color:#8a9891;">If the button does not work, copy and paste this address into your browser:</p>
          <p style="margin:0;word-break:break-all;font-size:11px;line-height:17px;color:#0b7a53;">${safeUrl}</p>
        </td></tr>
        <tr><td style="border-top:1px solid #e8efeb;padding:20px 36px;text-align:center;font-size:10px;line-height:16px;color:#94a19b;">This automated security message was sent by HeyMailer.</td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

module.exports = { escapeHtml, renderAuthEmail };
