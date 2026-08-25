/**
 * Shared RoundTable email shell. Every seed template renders its body
 * through this so all starter templates share one consistent, table-based
 * (Outlook-safe) layout using the brand palette defined in the PRD.
 */
function wrapEmail({ preheader = '', bodyHtml }) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>RoundTable</title>
</head>
<body style="margin:0;padding:0;background-color:#F4F7F5;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${preheader}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F4F7F5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#FFFFFF;border-radius:16px;overflow:hidden;">
          <tr>
            <td style="background-color:#073D2D;padding:28px 32px;">
              <span style="color:#FFFFFF;font-size:18px;font-weight:700;letter-spacing:0.3px;">RoundTable</span>
            </td>
          </tr>
          <tr>
            <td style="padding:36px 32px;">
              ${bodyHtml}
            </td>
          </tr>
          <tr>
            <td style="background-color:#F4F7F5;padding:24px 32px;border-top:1px solid #EAEFEC;">
              <p style="margin:0 0 8px;font-size:12px;color:#637069;line-height:1.6;">
                <a href="{{websiteUrl}}" style="color:#0B7A53;text-decoration:none;font-weight:600;">Website</a>
                &nbsp;·&nbsp;
                <a href="{{telegramUrl}}" style="color:#0B7A53;text-decoration:none;font-weight:600;">Telegram Support</a>
                &nbsp;·&nbsp;
                <a href="mailto:{{supportEmail}}" style="color:#0B7A53;text-decoration:none;font-weight:600;">{{supportEmail}}</a>
              </p>
              <p style="margin:0;font-size:11px;color:#98A29C;line-height:1.6;">
                You're receiving this because you engaged with RoundTable Savings & Thrift.
                <a href="{{unsubscribeUrl}}" style="color:#98A29C;text-decoration:underline;">Unsubscribe</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function button(label, url) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0;">
  <tr>
    <td style="background-color:#0B7A53;border-radius:10px;">
      <a href="${url}" style="display:inline-block;padding:13px 26px;font-size:14px;font-weight:600;color:#FFFFFF;text-decoration:none;border-radius:10px;">${label}</a>
    </td>
  </tr>
</table>`;
}

function secondaryButton(label, url) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0;">
  <tr>
    <td style="background-color:#FFFFFF;border:1px solid #0B7A53;border-radius:10px;">
      <a href="${url}" style="display:inline-block;padding:12px 26px;font-size:14px;font-weight:600;color:#0B7A53;text-decoration:none;border-radius:10px;">${label}</a>
    </td>
  </tr>
</table>`;
}

function divider() {
  return `<hr style="border:none;border-top:1px solid #EAEFEC;margin:24px 0;">`;
}

function statCard(label, value) {
  return `<td style="background-color:#EAF8F1;border-radius:14px;padding:16px 18px;">
    <p style="margin:0 0 4px;font-size:11px;color:#0B7A53;text-transform:uppercase;letter-spacing:0.4px;font-weight:700;">${label}</p>
    <p style="margin:0;font-size:18px;color:#14241C;font-weight:700;">${value}</p>
  </td>`;
}

module.exports = { wrapEmail, button, secondaryButton, divider, statCard };
