const express = require('express');

const inventoryController =
  require('../controllers/inventoryController');

const {
  authenticateToken,
  authorizeRoles
} = require('../middlewares/auth');

const router = express.Router();

// ============================================================
// ESTADÍSTICAS
// ============================================================

router.get(
  '/stats',
  inventoryController.getInventoryStats
);

// ============================================================
// LISTAR INVENTARIO
// ============================================================

router.get(
  '/',
  inventoryController.listInventory
);

// ============================================================
// MOSTRAR CREDENCIALES
// SOLO SUPERADMINISTRADOR Y ADMINISTRADOR
// ============================================================

router.get(
  '/:id/credentials',
  authenticateToken,
  authorizeRoles(
    'SUPER_ADMIN',
    'ADMIN'
  ),
  inventoryController.getInventoryCredentials
);

// ============================================================
// OBTENER UN ARTÍCULO
// ============================================================

router.get(
  '/:id',
  inventoryController.getInventoryItem
);

// ============================================================
// CREAR ARTÍCULO
// ============================================================

router.post(
  '/',
  inventoryController.createInventoryItem
);

// ============================================================
// ACTUALIZAR ARTÍCULO
// ============================================================

router.patch(
  '/:id',
  inventoryController.updateInventoryItem
);

// ============================================================
// REMOVER ARTÍCULO
// ============================================================

router.post(
  '/:id/remove',
  inventoryController.removeInventoryItem
);

module.exports = router;