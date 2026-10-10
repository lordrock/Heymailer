const { wrapEmail, button, secondaryButton, divider } = require('./layout');

const preheader = 'A structure that makes saving harder to postpone.';

const bodyHtml = `
  <h1 style="margin:0 0 16px;font-size:21px;line-height:1.4;color:#14241C;font-weight:700;">
    Some people don't have a problem earning money. They simply need a structure that
    makes saving harder to postpone.
  </h1>
  <p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:#637069;">
    Hi {{firstName}},
  </p>
  <p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:#637069;">
    HeyMailer Thrift brings the rotating-savings model you already trust — Ajo, esusu,
    adashi — into a simple, transparent digital format. You contribute on an agreed
    schedule, and you receive your payout according to your position in the circle.
  </p>
  ${divider()}
  <p style="margin:0 0 12px;font-size:15px;line-height:1.65;color:#14241C;font-weight:600;">
    How it works:
  </p>
  <ul style="margin:0 0 24px;padding-left:20px;font-size:15px;line-height:1.8;color:#637069;">
    <li>Join a thrift circle with an agreed contribution amount</li>
    <li>Contribute on the group's schedule — weekly or monthly</li>
    <li>Track your position and progress in real time</li>
    <li>Receive your payout on your scheduled date</li>
  </ul>
  ${button('Explore Available Thrifts', '{{thriftUrl}}')}
  <br>
  ${secondaryButton('Talk to HeyMailer Support', '{{telegramUrl}}')}
  ${divider()}
  <p style="margin:0;font-size:13px;line-height:1.6;color:#98A29C;">
    Every contribution, position, and payout is tracked transparently so you always
    know exactly where your money and your turn stand.
  </p>
`;

module.exports = {
  name: 'HeyMailer Thrift Invitation',
  category: 'Thrift',
  subject: 'A savings structure that makes postponing harder',
  preheader,
  description: 'Marketing invitation introducing the HeyMailer rotational thrift/Ajo product.',
  htmlContent: wrapEmail({ preheader, bodyHtml }),
  textContent: `Hi {{firstName}},

Some people don't have a problem earning money. They simply need a structure that makes saving harder to postpone.

HeyMailer Thrift brings the rotating-savings model you already trust — Ajo, esusu, adashi — into a simple, transparent digital format.

How it works:
- Join a thrift circle with an agreed contribution amount
- Contribute on the group's schedule — weekly or monthly
- Track your position and progress in real time
- Receive your payout on your scheduled date

Explore available thrifts: {{thriftUrl}}
Talk to HeyMailer Support: {{telegramUrl}}

HeyMailer
{{websiteUrl}}

To stop receiving marketing emails: {{unsubscribeUrl}}`,
};
