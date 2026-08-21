const saleService =
  require('../services/saleService');

// ============================================================
// ADMINISTRACIÓN: LISTAR VENTAS
// ============================================================

async function listSales(
  req,
  res,
  next
) {
  try {
    const result =
      await saleService.listSales(
        req.query
      );

    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
}

// ============================================================
// ADMINISTRACIÓN: OBTENER VENTA
// ============================================================

async function getSale(
  req,
  res,
  next
) {
  try {
    const result =
      await saleService.getSale(
        req.params.id
      );

    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
}

// ============================================================
// CLIENTE: LISTAR MIS COMPRAS
// ============================================================

async function listMySales(
  req,
  res,
  next
) {
  try {
    const result =
      await saleService.listMySales(
        req.user.id,
        req.query
      );

    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
}

// ============================================================
// CLIENTE: OBTENER MI PEDIDO
// ============================================================

async function getMySale(
  req,
  res,
  next
) {
  try {
    const result =
      await saleService.getMySale(
        req.params.id,
        req.user.id
      );

    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
}

// ============================================================
// CLIENTE: OBTENER CREDENCIALES DE MI PEDIDO
// ============================================================

async function getMySaleDelivery(
  req,
  res,
  next
) {
  try {
    const result =
      await saleService
        .getMySaleDelivery(
          req.params.id,
          req.user.id
        );

    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
}

// ============================================================
// CLIENTE: CREAR PEDIDO DESDE LA TIENDA
// ============================================================

async function createClientSale(
  req,
  res,
  next
) {
  try {
    const result =
      await saleService.createClientSale(
        req.user.id,
        req.body
      );

    return res.status(201).json({
      success: true,
      message:
        'Compra realizada y entregada correctamente',
      data: result
    });
  } catch (error) {
    next(error);
  }
}

// ============================================================
// ADMINISTRACIÓN: CREAR VENTA
// ============================================================

async function createSale(
  req,
  res,
  next
) {
  try {
    const result =
      await saleService.createSale(
        req.body
      );

    return res.status(201).json({
      success: true,
      message:
        'Venta creada correctamente',
      data: result
    });
  } catch (error) {
    next(error);
  }
}

// ============================================================
// ADMINISTRACIÓN: ACTUALIZAR VENTA
// ============================================================

async function updateSale(
  req,
  res,
  next
) {
  try {
    const result =
      await saleService.updateSale(
        req.params.id,
        req.body
      );

    return res.status(200).json({
      success: true,
      message:
        'Venta actualizada correctamente',
      data: result
    });
  } catch (error) {
    next(error);
  }
}

// ============================================================
// ADMINISTRACIÓN: ELIMINAR VENTA
// ============================================================

async function deleteSale(
  req,
  res,
  next
) {
  try {
    await saleService.deleteSale(
      req.params.id
    );

    return res.status(200).json({
      success: true,
      message:
        'Venta eliminada correctamente'
    });
  } catch (error) {
    next(error);
  }
}

// ============================================================
// EXPORTAR
// ============================================================

module.exports = {
  listSales,
  getSale,
  listMySales,
  getMySale,
  getMySaleDelivery,
  createClientSale,
  createSale,
  updateSale,
  deleteSale
};
