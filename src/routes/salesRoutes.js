const express = require('express');

const saleController =
  require('../controllers/saleController');

const {
  authenticateToken,
  authorizeRoles
} = require('../middlewares/auth');

const router = express.Router();

// ============================================================
// CLIENTE: MIS COMPRAS
// ============================================================

router.get(
  '/my',
  authenticateToken,
  authorizeRoles(
    'CLIENT'
  ),
  saleController.listMySales
);

// ============================================================
// CLIENTE: OBTENER UNO DE MIS PEDIDOS
// ============================================================

router.get(
  '/my/:id/delivery',
  authenticateToken,
  authorizeRoles(
    'CLIENT'
  ),
  saleController.getMySaleDelivery
);

router.get(
  '/my/:id',
  authenticateToken,
  authorizeRoles(
    'CLIENT'
  ),
  saleController.getMySale
);

// ============================================================
// CLIENTE: CREAR PEDIDO DESDE LA TIENDA
// ============================================================

router.post(
  '/checkout',
  authenticateToken,
  authorizeRoles(
    'CLIENT'
  ),
  saleController.createClientSale
);

// ============================================================
// ADMINISTRACIÓN: LISTAR TODAS LAS VENTAS
// ============================================================

router.get(
  '/',
  authenticateToken,
  authorizeRoles(
    'SUPER_ADMIN',
    'ADMIN'
  ),
  saleController.listSales
);

// ============================================================
// ADMINISTRACIÓN: OBTENER UNA VENTA
// ============================================================

router.get(
  '/:id',
  authenticateToken,
  authorizeRoles(
    'SUPER_ADMIN',
    'ADMIN'
  ),
  saleController.getSale
);

// ============================================================
// ADMINISTRACIÓN: CREAR VENTA
// ============================================================

router.post(
  '/',
  authenticateToken,
  authorizeRoles(
    'SUPER_ADMIN',
    'ADMIN'
  ),
  saleController.createSale
);

// ============================================================
// ADMINISTRACIÓN: ACTUALIZAR VENTA
// ============================================================

router.put(
  '/:id',
  authenticateToken,
  authorizeRoles(
    'SUPER_ADMIN',
    'ADMIN'
  ),
  saleController.updateSale
);

// ============================================================
// ADMINISTRACIÓN: ELIMINAR VENTA
// ============================================================

router.delete(
  '/:id',
  authenticateToken,
  authorizeRoles(
    'SUPER_ADMIN',
    'ADMIN'
  ),
  saleController.deleteSale
);

module.exports = router;
