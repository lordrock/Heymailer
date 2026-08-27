function validateProductionEnv() {
  if (process.env.NODE_ENV !== 'production') return;

  const errors = [];
  const required = ['MONGODB_URI', 'JWT_SECRET', 'UNSUBSCRIBE_SECRET', 'CLIENT_URL', 'SERVER_BASE_URL'];

  required.forEach((name) => {
    if (!process.env[name]) errors.push(`${name} is required`);
  });

  ['JWT_SECRET', 'UNSUBSCRIBE_SECRET'].forEach((name) => {
    if (process.env[name] && process.env[name].length < 32) {
      errors.push(`${name} must contain at least 32 characters`);
    }
  });

  const encryptionSecret = process.env.SMTP_CREDENTIALS_ENCRYPTION_KEY || process.env.JWT_SECRET;
  if (!encryptionSecret || encryptionSecret.length < 32) {
    errors.push('SMTP_CREDENTIALS_ENCRYPTION_KEY must contain at least 32 characters');
  }

  ['CLIENT_URL', 'SERVER_BASE_URL'].forEach((name) => {
    if (process.env[name] && !process.env[name].startsWith('https://')) {
      errors.push(`${name} must use https:// in production`);
    }
  });

  if (process.env.COOKIE_SAME_SITE && !['lax', 'strict', 'none'].includes(process.env.COOKIE_SAME_SITE.toLowerCase())) {
    errors.push('COOKIE_SAME_SITE must be lax, strict, or none');
  }

  if (process.env.AUTO_SEED !== 'false' && (!process.env.ADMIN_EMAIL || !process.env.ADMIN_PASSWORD)) {
    errors.push('ADMIN_EMAIL and ADMIN_PASSWORD are required while AUTO_SEED is enabled');
  }

  const mailProvider = String(process.env.MAIL_PROVIDER || 'smtp').toLowerCase();
  if (!['smtp', 'mailjet', 'resend'].includes(mailProvider)) {
    errors.push('MAIL_PROVIDER must be smtp, mailjet, or resend');
  }
  if (mailProvider === 'mailjet') {
    ['MAILJET_API_KEY', 'MAILJET_SECRET_KEY', 'MAILJET_FROM_EMAIL'].forEach((name) => {
      if (!process.env[name]) errors.push(`${name} is required when MAIL_PROVIDER=mailjet`);
    });
  }
  if (mailProvider === 'resend') {
    ['RESEND_API_KEY', 'RESEND_FROM_EMAIL'].forEach((name) => {
      if (!process.env[name]) errors.push(`${name} is required when MAIL_PROVIDER=resend`);
    });
  }

  if (errors.length) {
    throw new Error(`Production configuration invalid:\n- ${errors.join('\n- ')}`);
  }
}

module.exports = validateProductionEnv;
