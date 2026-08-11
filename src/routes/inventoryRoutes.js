const express = require('express');
const inventoryController = require('../controllers/inventoryController');

const router = express.Router();

// Estadísticas del inventario
router.get(
  '/stats',
  inventoryController.getInventoryStats
);

// Listar inventario
router.get(
  '/',
  inventoryController.listInventory
);

// Obtener un artículo del inventario
router.get(
  '/:id',
  inventoryController.getInventoryItem
);

// Crear un artículo de inventario
router.post(
  '/',
  inventoryController.createInventoryItem
);

// Actualizar un artículo de inventario
router.patch(
  '/:id',
  inventoryController.updateInventoryItem
);

// Remover un artículo del inventario
router.post(
  '/:id/remove',
  inventoryController.removeInventoryItem
);

module.exports = router;