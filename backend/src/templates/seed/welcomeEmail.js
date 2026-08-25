const { wrapEmail, button, divider, statCard } = require('./layout');

const preheader = 'Your RoundTable account is ready. Here is how to get started.';

const bodyHtml = `
  <h1 style="margin:0 0 16px;font-size:22px;line-height:1.35;color:#14241C;font-weight:700;">
    Welcome to RoundTable, {{firstName}}
  </h1>
  <p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:#637069;">
    Your account is set up and ready. RoundTable gives you two simple ways to build
    consistent savings habits — a structured Savings plan, and rotating Thrift circles
    for goal-based group saving.
  </p>
  ${divider()}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr>
      ${statCard('Account', '{{email}}')}
      <td style="width:12px;"></td>
      ${statCard('Status', 'Active')}
    </tr>
  </table>
  <div style="height:24px;"></div>
  <p style="margin:0 0 12px;font-size:15px;line-height:1.65;color:#14241C;font-weight:600;">
    A few things to try first:
  </p>
  <ul style="margin:0 0 24px;padding-left:20px;font-size:15px;line-height:1.8;color:#637069;">
    <li>Set up a savings plan and pick a target</li>
    <li>Browse thrift circles that match your contribution schedule</li>
    <li>Add a payment method so deposits go through smoothly</li>
  </ul>
  ${button('Go to My Dashboard', '{{websiteUrl}}')}
  ${divider()}
  <p style="margin:0;font-size:13px;line-height:1.6;color:#98A29C;">
    Need a hand getting started? Message us on Telegram — we typically reply within the hour.
  </p>
`;

module.exports = {
  name: 'Welcome Email',
  category: 'Transactional',
  subject: 'Welcome to RoundTable — your account is ready',
  preheader,
  description: 'Sent to new users right after signup to orient them toward savings/thrift setup.',
  htmlContent: wrapEmail({ preheader, bodyHtml }),
  textContent: `Welcome to RoundTable, {{firstName}}

Your account is set up and ready. RoundTable gives you two simple ways to build consistent savings habits — a structured Savings plan, and rotating Thrift circles for goal-based group saving.

Account: {{email}}
Status: Active

A few things to try first:
- Set up a savings plan and pick a target
- Browse thrift circles that match your contribution schedule
- Add a payment method so deposits go through smoothly

Go to your dashboard: {{websiteUrl}}

Need a hand getting started? Message us on Telegram: {{telegramUrl}}

RoundTable
{{websiteUrl}}`,
};
