const catalogService = require('../services/catalogService');


// ============================================================
// LISTAR CATEGORÍAS
// ============================================================

async function listCategories(
  req,
  res,
  next
) {
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


// ============================================================
// LISTAR PRODUCTOS
// ============================================================

async function listProducts(
  req,
  res,
  next
) {
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


// ============================================================
// OBTENER PRODUCTO POR SLUG
// ============================================================

async function getProductBySlug(
  req,
  res,
  next
) {
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


// ============================================================
// CREAR PLATAFORMA / PRODUCTO
// ============================================================

async function createProduct(
  req,
  res,
  next
) {
  try {

    const product =
      await catalogService.createProduct(
        req.body || {}
      );

    return res.status(201).json({
      success: true,
      message:
        'Plataforma agregada correctamente',
      data: product
    });

  } catch (error) {
    next(error);
  }
}


// ============================================================
// CREAR PLAN / VARIANTE
// ============================================================

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
        'Plan agregado correctamente',
      data: variant
    });

  } catch (error) {
    next(error);
  }
}


// ============================================================
// EXPORTAR
// ============================================================

module.exports = {
  listCategories,
  listProducts,
  getProductBySlug,
  createProduct,
  createProductVariant
};