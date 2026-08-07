const customerService = require('../services/customerService');

async function listCustomers(req, res, next) {
  try {
    const result = await customerService.listCustomers(req.query);
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

async function getCustomer(req, res, next) {
  try {
    const result = await customerService.getCustomer(req.params.id);
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

async function createCustomer(req, res, next) {
  try {
    const result = await customerService.createCustomer(req.body);
    return res.status(201).json({ success: true, message: 'Customer created successfully', data: result });
  } catch (error) {
    next(error);
  }
}

async function updateCustomer(req, res, next) {
  try {
    const result = await customerService.updateCustomer(req.params.id, req.body);
    return res.status(200).json({ success: true, message: 'Customer updated successfully', data: result });
  } catch (error) {
    next(error);
  }
}

async function deleteCustomer(req, res, next) {
  try {
    await customerService.deleteCustomer(req.params.id);
    return res.status(200).json({ success: true, message: 'Customer deleted successfully' });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  deleteCustomer
};
