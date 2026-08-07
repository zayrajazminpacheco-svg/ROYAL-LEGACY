function logStartup(message) {
  console.log(`[startup] ${message}`);
}

function logError(message, error) {
  console.error(`[error] ${message}`);
  if (error) {
    console.error(error);
  }
}

module.exports = {
  logStartup,
  logError
};
