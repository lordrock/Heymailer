const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const { RedisStore } = require('rate-limit-redis');

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
const adminDeliverabilityRoutes = require('./routes/adminDeliverabilityRoutes');
const healthRoutes = require('./routes/healthRoutes');
const webhookRoutes = require('./routes/webhookRoutes');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const { requireAuth, requireActiveSubscription } = require('./middleware/auth');
const { bindTenant } = require('./middleware/tenant');
const { getFrontendOrigins } = require('./config/frontendUrl');
const { getRedisClient } = require('./config/redis');

const app = express();

const allowedOrigins = getFrontendOrigins();

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
app.use(express.json({
  limit: '5mb',
  verify(req, _res, buffer) {
    if (req.originalUrl === '/api/webhooks/resend') req.rawBody = Buffer.from(buffer);
  },
}));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const redis = getRedisClient();
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 600,
  standardHeaders: true,
  legacyHeaders: false,
  ...(redis ? { store: new RedisStore({ sendCommand: (...args) => redis.sendCommand(args), prefix: 'heymailer:rate:api:' }) } : {}),
});
const webhookLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5000,
  standardHeaders: true,
  legacyHeaders: false,
  ...(redis ? { store: new RedisStore({ sendCommand: (...args) => redis.sendCommand(args), prefix: 'heymailer:rate:webhook:' }) } : {}),
});
app.use('/api/health', healthRoutes);
app.use('/api/webhooks', webhookLimiter, webhookRoutes);
app.use('/api', apiLimiter);

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
app.use('/api/super-admin/deliverability', adminDeliverabilityRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
