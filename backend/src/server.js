require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');
const validateProductionEnv = require('./config/validateEnv');
const seedData = require('./utils/seed');
const { resumeInFlightCampaigns } = require('./services/queue');
const { startBounceProcessor } = require('./services/bounceProcessor');
const { startPlacementProcessor } = require('./services/placementEngine');
const { connectRedis, closeRedis } = require('./config/redis');

const PORT = process.env.PORT || 5100;

validateProductionEnv();

async function start() {
  await connectDB();
  await connectRedis();

  if (process.env.AUTO_SEED !== 'false') {
    await seedData();
  }

  await resumeInFlightCampaigns();

  const server = app.listen(PORT, () => {
    console.log(`[server] HeyMailer Email System API running on port ${PORT}`);
    startBounceProcessor().catch((err) => console.error('[bounce] failed to start:', err.message));
    startPlacementProcessor();
  });

  const shutdown = async () => {
    server.close();
    await closeRedis();
    process.exit(0);
  };
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
}

start().catch((err) => {
  console.error('[server] failed to start:', err);
  process.exit(1);
});
