const saleService = require('../services/saleService');

async function listSales(req, res, next) {
  try {
    const result = await saleService.listSales(req.query);
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

async function getSale(req, res, next) {
  try {
    const result = await saleService.getSale(req.params.id);
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

async function createSale(req, res, next) {
  try {
    const result = await saleService.createSale(req.body);
    return res.status(201).json({ success: true, message: 'Sale created successfully', data: result });
  } catch (error) {
    next(error);
  }
}

async function updateSale(req, res, next) {
  try {
    const result = await saleService.updateSale(req.params.id, req.body);
    return res.status(200).json({ success: true, message: 'Sale updated successfully', data: result });
  } catch (error) {
    next(error);
  }
}

async function deleteSale(req, res, next) {
  try {
    await saleService.deleteSale(req.params.id);
    return res.status(200).json({ success: true, message: 'Sale deleted successfully' });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listSales,
  getSale,
  createSale,
  updateSale,
  deleteSale
};
