const { wrapEmail, button, secondaryButton, divider } = require('./layout');

const preheader = 'Save intentionally and let your eligible savings work towards your goals.';

const bodyHtml = `
  <h1 style="margin:0 0 16px;font-size:22px;line-height:1.35;color:#14241C;font-weight:700;">
    What if the money you're already saving could do more?
  </h1>
  <p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:#637069;">
    Hi {{firstName}},
  </p>
  <p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:#637069;">
    HeyMailer Savings gives you a structured way to grow your money while you save towards
    the goals that matter to you. No guesswork, no complicated forms — just a simple plan
    that works quietly in the background.
  </p>
  <p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:#637069;">
    Depending on the plan you choose, eligible HeyMailer savings may provide:
  </p>
  <ul style="margin:0 0 20px;padding-left:20px;font-size:15px;line-height:1.8;color:#14241C;">
    <li>Up to <strong>15%</strong> on qualifying deposits</li>
    <li>An additional <strong>10%</strong> linked to your total savings, according to applicable terms</li>
  </ul>
  <p style="margin:0 0 24px;font-size:13px;line-height:1.6;color:#98A29C;">
    Returns depend on the specific plan and applicable terms and are not guaranteed unless
    stated otherwise in your plan agreement.
  </p>
  ${button('Explore HeyMailer Savings', '{{savingsUrl}}')}
  <br>
  ${secondaryButton('Talk to Us on Telegram', '{{telegramUrl}}')}
  ${divider()}
  <p style="margin:0;font-size:13px;line-height:1.6;color:#98A29C;">
    Questions about how HeyMailer Savings works? Reply to this email or reach us on Telegram —
    we're happy to walk you through it.
  </p>
`;

module.exports = {
  name: 'Savings Invitation 01',
  category: 'Savings',
  subject: "What if your savings could do more?",
  preheader,
  description: 'Marketing invitation introducing HeyMailer Savings and its return structure.',
  htmlContent: wrapEmail({ preheader, bodyHtml }),
  textContent: `Hi {{firstName}},

What if the money you're already saving could do more?

HeyMailer Savings gives you a structured way to grow your money while you save towards the goals that matter to you.

Depending on the plan you choose, eligible HeyMailer savings may provide:
- Up to 15% on qualifying deposits
- An additional 10% linked to your total savings, according to applicable terms

Returns depend on the specific plan and applicable terms and are not guaranteed unless stated otherwise in your plan agreement.

Explore HeyMailer Savings: {{savingsUrl}}
Talk to us on Telegram: {{telegramUrl}}

HeyMailer
{{websiteUrl}}

To stop receiving marketing emails: {{unsubscribeUrl}}`,
};
