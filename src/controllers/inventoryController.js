const inventoryService =
  require('../services/inventoryService');

// ============================================================
// LISTAR INVENTARIO
// ============================================================

async function listInventory(
  req,
  res,
  next
) {
  try {
    const result =
      await inventoryService.listInventory(
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
// OBTENER UN ARTÍCULO
// ============================================================

async function getInventoryItem(
  req,
  res,
  next
) {
  try {
    const result =
      await inventoryService.getInventoryItem(
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
// MOSTRAR CREDENCIALES
// ============================================================

async function getInventoryCredentials(
  req,
  res,
  next
) {
  try {
    const result =
      await inventoryService
        .getInventoryCredentials(
          req.params.id
        );

    res.set(
      'Cache-Control',
      'no-store, no-cache, must-revalidate, private'
    );

    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');

    return res.status(200).json({
      success: true,
      message:
        'Credenciales obtenidas correctamente',
      data: result
    });
  } catch (error) {
    next(error);
  }
}

// ============================================================
// CREAR ARTÍCULO
// ============================================================

async function createInventoryItem(
  req,
  res,
  next
) {
  try {
    const result =
      await inventoryService.createInventoryItem(
        req.body
      );

    return res.status(201).json({
      success: true,
      message:
        'Artículo de inventario creado correctamente',
      data: result
    });
  } catch (error) {
    next(error);
  }
}

// ============================================================
// ACTUALIZAR ARTÍCULO
// ============================================================

async function updateInventoryItem(
  req,
  res,
  next
) {
  try {
    const result =
      await inventoryService.updateInventoryItem(
        req.params.id,
        req.body
      );

    return res.status(200).json({
      success: true,
      message:
        'Artículo de inventario actualizado correctamente',
      data: result
    });
  } catch (error) {
    next(error);
  }
}

// ============================================================
// REMOVER ARTÍCULO
// ============================================================

async function removeInventoryItem(
  req,
  res,
  next
) {
  try {
    const result =
      await inventoryService.removeInventoryItem(
        req.params.id,
        req.body
      );

    return res.status(200).json({
      success: true,
      message:
        'Artículo removido del inventario correctamente',
      data: result
    });
  } catch (error) {
    next(error);
  }
}

// ============================================================
// ESTADÍSTICAS
// ============================================================

async function getInventoryStats(
  req,
  res,
  next
) {
  try {
    const result =
      await inventoryService
        .getInventoryStats();

    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
}

// ============================================================
// EXPORTAR
// ============================================================

module.exports = {
  listInventory,
  getInventoryItem,
  getInventoryCredentials,
  createInventoryItem,
  updateInventoryItem,
  removeInventoryItem,
  getInventoryStats
};