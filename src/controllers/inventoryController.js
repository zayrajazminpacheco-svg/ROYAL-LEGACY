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
// IMAGEN DEL ARTÍCULO
// ============================================================

async function uploadInventoryImage(
  req,
  res,
  next
) {
  try {
    const result =
      await inventoryService
        .uploadInventoryImage(
          req.params.id,
          req.file
        );

    return res.status(200).json({
      success: true,
      message:
        'Imagen del inventario guardada correctamente',
      data: result
    });
  } catch (error) {
    next(error);
  }
}

async function getInventoryImage(
  req,
  res,
  next
) {
  try {
    const image =
      await inventoryService
        .getInventoryImage(
          req.params.id
        );

    res.set(
      'Content-Type',
      image.imageMimeType
    );

    res.set(
      'Content-Length',
      String(image.imageSize)
    );

    res.set(
      'Cache-Control',
      'private, max-age=300'
    );

    return res.status(200).send(
      image.imageData
    );
  } catch (error) {
    next(error);
  }
}

async function deleteInventoryImage(
  req,
  res,
  next
) {
  try {
    const result =
      await inventoryService
        .deleteInventoryImage(
          req.params.id
        );

    return res.status(200).json({
      success: true,
      message:
        'Imagen del inventario eliminada correctamente',
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
  uploadInventoryImage,
  getInventoryImage,
  deleteInventoryImage,
  removeInventoryItem,
  getInventoryStats
};
