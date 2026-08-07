const catalogService = require('../services/catalogService');

async function listCategories(req, res, next) {
  try {
    const categories = await catalogService.listCategories();
    return res.status(200).json({ success: true, data: categories });
  } catch (error) {
    next(error);
  }
}

async function listProducts(req, res, next) {
  try {
    const products = await catalogService.listProducts();
    return res.status(200).json({ success: true, data: products });
  } catch (error) {
    next(error);
  }
}

async function getProductBySlug(req, res, next) {
  try {
    const product = await catalogService.getProductBySlug(req.params.slug);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    return res.status(200).json({ success: true, data: product });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listCategories,
  listProducts,
  getProductBySlug
};
