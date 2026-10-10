const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/authRoutes');
const templateRoutes = require('./routes/templateRoutes');
const contactRoutes = require('./routes/contactRoutes');
const contactGroupRoutes = require('./routes/contactGroupRoutes');
const campaignRoutes = require('./routes/campaignRoutes');
const emailLogRoutes = require('./routes/emailLogRoutes');
const draftRoutes = require('./routes/draftRoutes');
const settingsRoutes = require('./routes/settingsRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const publicRoutes = require('./routes/publicRoutes');
const billingRoutes = require('./routes/billingRoutes');
const adminBillingRoutes = require('./routes/adminBillingRoutes');
const adminWorkspaceRoutes = require('./routes/adminWorkspaceRoutes');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const { requireAuth, requireActiveSubscription } = require('./middleware/auth');
const { bindTenant } = require('./middleware/tenant');

const app = express();

const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:3100')
  .split(',')
  .map((origin) => origin.trim().replace(/\/+$/, ''))
  .filter(Boolean);

app.set('trust proxy', 1);

// Register request logging first so rejected CORS/preflight requests are logged too.
// Morgan never logs request bodies, so login passwords and SMTP credentials stay out of logs.
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(helmet({ contentSecurityPolicy: false })); // CSP off: we render admin-authored HTML email previews
app.use(
  cors({
    origin(origin, callback) {
      // Requests without an Origin header are server-to-server or local tools.
      if (!origin || allowedOrigins.includes(origin.replace(/\/+$/, ''))) {
        return callback(null, true);
      }
      const error = new Error(`Origin is not allowed by CORS: ${origin}`);
      error.status = 403;
      return callback(error);
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', apiLimiter);

app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'heymailer-email-system' }));

app.use('/api/auth', authRoutes);
const workspaceAccess = [requireAuth, requireActiveSubscription, bindTenant];
app.use('/api/templates', workspaceAccess, templateRoutes);
app.use('/api/contacts', workspaceAccess, contactRoutes);
app.use('/api/contact-groups', workspaceAccess, contactGroupRoutes);
app.use('/api/campaigns', workspaceAccess, campaignRoutes);
app.use('/api/email-logs', workspaceAccess, emailLogRoutes);
app.use('/api/drafts', workspaceAccess, draftRoutes);
app.use('/api/settings', workspaceAccess, settingsRoutes);
app.use('/api/dashboard', workspaceAccess, dashboardRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/super-admin/billing', adminBillingRoutes);
app.use('/api/super-admin/workspaces', adminWorkspaceRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
