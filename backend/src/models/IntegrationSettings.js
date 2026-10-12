const mongoose = require('mongoose');

const integrationSettingsSchema = new mongoose.Schema(
  {
    singleton: { type: String, default: 'platform', unique: true },
    resendWebhookSecretEncrypted: { type: String, select: false, default: '' },
  },
  { timestamps: true, collection: 'mail_integration_settings' }
);

module.exports = mongoose.model('IntegrationSettings', integrationSettingsSchema);
