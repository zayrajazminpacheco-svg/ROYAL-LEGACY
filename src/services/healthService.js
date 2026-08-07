function getHealthStatus() {
  return {
    success: true,
    service: 'LEGACY ROYAL STREAM API',
    status: 'online'
  };
}

module.exports = {
  getHealthStatus
};
