const { buildUnsubscribeUrl } = require('../utils/unsubscribeToken');

// The full list of variables the composer's "Insert Variable" dropdown offers.
// Keeping this in one place means the frontend can fetch it from an API
// endpoint instead of hardcoding it, so new variables only need to be added
// here.
const CONTACT_VARIABLES = [
  { key: 'firstName', label: 'First Name' },
  { key: 'lastName', label: 'Last Name' },
  { key: 'email', label: 'Email' },
];

const BRAND_VARIABLES = [
  { key: 'websiteUrl', label: 'Website URL' },
  { key: 'savingsUrl', label: 'Savings Page URL' },
  { key: 'thriftUrl', label: 'Thrift Page URL' },
  { key: 'telegramUrl', label: 'Telegram Support URL' },
  { key: 'supportEmail', label: 'Support Email' },
  { key: 'unsubscribeUrl', label: 'Unsubscribe URL' },
];

const CUSTOMER_VARIABLES = [
  { key: 'totalSavings', label: 'Total Savings' },
  { key: 'depositAmount', label: 'Deposit Amount' },
  { key: 'interestAmount', label: 'Interest Amount' },
  { key: 'maturityDate', label: 'Maturity Date' },
  { key: 'thriftName', label: 'Thrift Name' },
  { key: 'contributionAmount', label: 'Contribution Amount' },
  { key: 'payoutDate', label: 'Payout Date' },
];

const ALL_VARIABLES = [...CONTACT_VARIABLES, ...BRAND_VARIABLES, ...CUSTOMER_VARIABLES];

function formatValue(value) {
  if (value === null || value === undefined || value === '') return '';
  if (value instanceof Date) return value.toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' });
  if (typeof value === 'number') return value.toLocaleString('en-US');
  return String(value);
}

/**
 * Builds the full variable map for a given contact + app settings, then
 * replaces every {{variable}} occurrence in the supplied string.
 */
function resolveVariables(content, { contact, settings, baseUrl }) {
  if (!content) return '';

  const custom = contact?.customFields || {};

  const map = {
    firstName: contact?.firstName || 'there',
    lastName: contact?.lastName || '',
    email: contact?.email || '',

    websiteUrl: settings?.websiteUrl || '',
    savingsUrl: settings?.savingsUrl || '',
    thriftUrl: settings?.thriftUrl || '',
    telegramUrl: settings?.telegramUrl || '',
    supportEmail: settings?.supportEmail || '',
    unsubscribeUrl: contact?.email && baseUrl ? buildUnsubscribeUrl(baseUrl, contact.email) : '#',

    totalSavings: custom.totalSavings,
    depositAmount: custom.depositAmount,
    interestAmount: custom.interestAmount,
    maturityDate: custom.maturityDate,
    thriftName: custom.thriftName,
    contributionAmount: custom.contributionAmount,
    payoutDate: custom.payoutDate,
  };

  return content.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (match, key) => {
    if (!(key in map)) return match; // leave unknown variables untouched
    return formatValue(map[key]);
  });
}

module.exports = {
  ALL_VARIABLES,
  CONTACT_VARIABLES,
  BRAND_VARIABLES,
  CUSTOMER_VARIABLES,
  resolveVariables,
};
