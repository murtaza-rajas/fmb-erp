const http = require('http');
const app = require('./app');
const { connectDb } = require('./config/db');
const { initSocket } = require('./config/socket');
const { scheduleReorderAlertJob } = require('./jobs/reorderAlertJob');
const { scheduleTokenCleanupJob } = require('./jobs/tokenCleanupJob');
const { port } = require('./config/env');
const logger = require('./utils/logger');

async function start() {
  await connectDb();

  const httpServer = http.createServer(app);
  initSocket(httpServer);
  scheduleReorderAlertJob();
  scheduleTokenCleanupJob();

  httpServer.listen(port, () => {
    logger.info(`FMB ERP API listening on port ${port}`);
  });

  const shutdown = (signal) => {
    logger.info(`Received ${signal}, shutting down gracefully`);
    httpServer.close(() => process.exit(0));
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

start().catch((err) => {
  logger.error('Failed to start server', { error: err.message, stack: err.stack });
  process.exit(1);
});
