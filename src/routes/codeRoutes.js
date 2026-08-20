const express = require('express');

const {
  authenticateToken,
  authorizeRoles
} = require('../middlewares/auth');

const codeController =
  require('../controllers/codeController');

const router =
  express.Router();

const clientOnly =
  authorizeRoles(
    'CLIENT'
  );

const adminOnly =
  authorizeRoles(
    'SUPER_ADMIN',
    'ADMIN'
  );

// ============================================================
// TODAS LAS RUTAS REQUIEREN AUTENTICACIÓN
// ============================================================

router.use(
  authenticateToken
);

// ============================================================
// PORTAL DEL CLIENTE
// ============================================================

// Listar compras que pueden solicitar código
router.get(
  '/my/eligible-items',
  clientOnly,
  codeController.listMyEligibleItems
);

// Listar las solicitudes del cliente
router.get(
  '/my',
  clientOnly,
  codeController.listMyCodeRequests
);

// Consultar una solicitud propia
router.get(
  '/my/:id',
  clientOnly,
  codeController.getMyCodeRequest
);

// Crear una solicitud para una compra propia
router.post(
  '/my',
  clientOnly,
  codeController.createMyCodeRequest
);

// ============================================================
// ADMINISTRACIÓN
// ============================================================

// Listar todas las solicitudes
router.get(
  '/',
  adminOnly,
  codeController.listCodeRequests
);

// Consultar cualquier solicitud
router.get(
  '/:id',
  adminOnly,
  codeController.getCodeRequest
);

// Crear una solicitud administrativa
router.post(
  '/',
  adminOnly,
  codeController.createCodeRequest
);

// Registrar el código recibido
router.patch(
  '/:id/received',
  adminOnly,
  codeController.markCodeReceived
);

// Marcar el código como entregado
router.patch(
  '/:id/delivered',
  adminOnly,
  codeController.markCodeDelivered
);

// Marcar la solicitud como expirada
router.patch(
  '/:id/expire',
  adminOnly,
  codeController.expireCodeRequest
);

// Marcar la solicitud como fallida
router.patch(
  '/:id/fail',
  adminOnly,
  codeController.failCodeRequest
);

module.exports =
  router;