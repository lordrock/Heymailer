const { wrapEmail, button, divider } = require('./layout');

const preheader = 'Keep more of what you earn, on a schedule that actually sticks.';

const bodyHtml = `
  <h1 style="margin:0 0 16px;font-size:22px;line-height:1.35;color:#14241C;font-weight:700;">
    You earn money. But how much of it actually stays with you?
  </h1>
  <p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:#637069;">
    Hi {{firstName}},
  </p>
  <p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:#637069;">
    Earning is only half the story. What you keep — and how consistently you set it aside —
    is what actually moves you toward your goals. RoundTable Savings is built around that
    second half: a simple structure that makes consistent saving easier to stick to.
  </p>
  <p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:#637069;">
    Set a target, choose a plan, and let your discipline compound — with applicable
    RoundTable returns working alongside it.
  </p>
  ${divider()}
  <p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:#14241C;font-weight:600;">
    A structure that works with you:
  </p>
  <ul style="margin:0 0 24px;padding-left:20px;font-size:15px;line-height:1.8;color:#637069;">
    <li>Save on your own schedule, in amounts that suit you</li>
    <li>Track progress toward a specific goal</li>
    <li>Earn applicable returns on qualifying balances</li>
  </ul>
  ${button('Start Saving with RoundTable', '{{savingsUrl}}')}
  ${divider()}
  <p style="margin:0;font-size:13px;line-height:1.6;color:#98A29C;">
    Have a goal in mind already? Reply and tell us — we'll help you figure out the right plan.
  </p>
`;

module.exports = {
  name: 'Savings Invitation 02',
  category: 'Savings',
  subject: 'You earn money. How much of it actually stays with you?',
  preheader,
  description: 'Marketing invitation focused on financial discipline and consistent saving.',
  htmlContent: wrapEmail({ preheader, bodyHtml }),
  textContent: `Hi {{firstName}},

You earn money. But how much of it actually stays with you?

Earning is only half the story. What you keep — and how consistently you set it aside — is what actually moves you toward your goals. RoundTable Savings is built around that second half.

A structure that works with you:
- Save on your own schedule, in amounts that suit you
- Track progress toward a specific goal
- Earn applicable returns on qualifying balances

Start saving with RoundTable: {{savingsUrl}}

RoundTable
{{websiteUrl}}

To stop receiving marketing emails: {{unsubscribeUrl}}`,
};
