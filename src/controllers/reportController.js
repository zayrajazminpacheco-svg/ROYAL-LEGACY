const reportService = require('../services/reportService');

async function getDashboard(req, res, next) {
  try {
    const result = await reportService.getDashboardSummary();
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

async function getReports(req, res, next) {
  try {
    const result = await reportService.getReportData(req.query);
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getDashboard,
  getReports
};
