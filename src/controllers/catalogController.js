const catalogService = require('../services/catalogService');

async function listCategories(req, res, next) {
  try {
    const categories =
      await catalogService.listCategories();

    return res.status(200).json({
      success: true,
      data: categories
    });
  } catch (error) {
    next(error);
  }
}

async function listProducts(req, res, next) {
  try {
    const products =
      await catalogService.listProducts();

    return res.status(200).json({
      success: true,
      data: products
    });
  } catch (error) {
    next(error);
  }
}

async function getProductBySlug(req, res, next) {
  try {
    const product =
      await catalogService.getProductBySlug(
        req.params.slug
      );

    return res.status(200).json({
      success: true,
      data: product
    });
  } catch (error) {
    next(error);
  }
}

async function createProduct(req, res, next) {
  try {
    const product =
      await catalogService.createProduct(
        req.body || {}
      );

    return res.status(201).json({
      success: true,
      message:
        'Producto creado correctamente',
      data: product
    });
  } catch (error) {
    next(error);
  }
}

async function createProductVariant(
  req,
  res,
  next
) {
  try {
    const variant =
      await catalogService.createProductVariant(
        req.params.productId,
        req.body || {}
      );

    return res.status(201).json({
      success: true,
      message:
        'Variante creada correctamente',
      data: variant
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listCategories,
  listProducts,
  getProductBySlug,
  createProduct,
  createProductVariant
};