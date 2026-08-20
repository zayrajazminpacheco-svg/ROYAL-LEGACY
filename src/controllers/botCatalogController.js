const botCatalogService = require('../services/botCatalogService');

async function getPlatformByCommand(req, res, next) {
  try {
    const command =
      req.params.command ||
      req.query.command ||
      '';

    const data =
      await botCatalogService.findProductByCommand(command);

    if (!data) {
      return res.status(404).json({
        success: false,
        message: 'No se encontró una plataforma para ese comando'
      });
    }

    return res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
}

async function listPlatformsForBot(req, res, next) {
  try {
    const data =
      await botCatalogService.listPlatformSummaries();

    return res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getPlatformByCommand,
  listPlatformsForBot
};