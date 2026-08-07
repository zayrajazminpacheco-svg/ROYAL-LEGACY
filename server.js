const config = require('./src/config/env');
const { logStartup, logError } = require('./src/utils/logger');
const app = require('./src/app');

const PORT = config.port || 3000;

app.listen(PORT, () => {
  logStartup(`LEGACY ROYAL STREAM API listening on port ${PORT} in ${config.env} mode`);
});

process.on('unhandledRejection', (error) => {
  logError('Unhandled promise rejection', error);
});

process.on('uncaughtException', (error) => {
  logError('Uncaught exception', error);
});
