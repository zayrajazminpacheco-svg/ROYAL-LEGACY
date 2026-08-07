const productService = require('../services/productService');

async function listProducts(req, res, next) {
  try {
    const result = await productService.listProducts(req.query);
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

async function getProduct(req, res, next) {
  try {
    const result = await productService.getProduct(req.params.id);
    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

async function createProduct(req, res, next) {
  try {
    const result = await productService.createProduct(req.body);
    return res.status(201).json({ success: true, message: 'Product created successfully', data: result });
  } catch (error) {
    next(error);
  }
}

async function updateProduct(req, res, next) {
  try {
    const result = await productService.updateProduct(req.params.id, req.body);
    return res.status(200).json({ success: true, message: 'Product updated successfully', data: result });
  } catch (error) {
    next(error);
  }
}

async function deleteProduct(req, res, next) {
  try {
    await productService.deleteProduct(req.params.id);
    return res.status(200).json({ success: true, message: 'Product deleted successfully' });
  } catch (error) {
    next(error);
  }
}

async function updateStock(req, res, next) {
  try {
    const result = await productService.updateStock(req.params.id, req.body);
    return res.status(200).json({ success: true, message: 'Stock updated successfully', data: result });
  } catch (error) {
    next(error);
  }
}

async function uploadImage(req, res, next) {
  try {
    const result = await productService.uploadProductImage(req.params.id, req.file);
    return res.status(200).json({ success: true, message: 'Image uploaded successfully', data: result });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  updateStock,
  uploadImage
};
