const providerService = require('../services/providerService');

async function listProviders(req, res, next) {
  try {
    const result = await providerService.listProviders(req.query);
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

async function getProvider(req, res, next) {
  try {
    const result = await providerService.getProvider(req.params.id);
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

async function createProvider(req, res, next) {
  try {
    const result = await providerService.createProvider(req.body);
    return res.status(201).json({ success: true, message: 'Provider created successfully', data: result });
  } catch (error) {
    next(error);
  }
}

async function updateProvider(req, res, next) {
  try {
    const result = await providerService.updateProvider(req.params.id, req.body);
    return res.status(200).json({ success: true, message: 'Provider updated successfully', data: result });
  } catch (error) {
    next(error);
  }
}

async function deleteProvider(req, res, next) {
  try {
    await providerService.deleteProvider(req.params.id);
    return res.status(200).json({ success: true, message: 'Provider deleted successfully' });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listProviders,
  getProvider,
  createProvider,
  updateProvider,
  deleteProvider
};
