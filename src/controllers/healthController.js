const { getHealthStatus } = require('../services/healthService');
const { successResponse } = require('../utils/response');

function getHealth(req, res, next) {
  try {
    const payload = getHealthStatus();
    return res.status(200).json(successResponse(payload));
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getHealth
};
