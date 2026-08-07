const express = require('express');

const {
  authenticateToken,
  authorizeRoles
} = require('../middlewares/auth');

const codeController = require('../controllers/codeController');

const router = express.Router();

// Todas las rutas requieren autenticación.
// Admin y Super Admin pueden gestionar códigos.
router.use(
  authenticateToken,
  authorizeRoles('SUPER_ADMIN', 'ADMIN')
);

// Listar solicitudes
router.get(
  '/',
  codeController.listCodeRequests
);

// Ver una solicitud
router.get(
  '/:id',
  codeController.getCodeRequest
);

// Crear solicitud
router.post(
  '/',
  codeController.createCodeRequest
);

// Marcar código como recibido
router.patch(
  '/:id/received',
  codeController.markCodeReceived
);

// Marcar código como entregado
router.patch(
  '/:id/delivered',
  codeController.markCodeDelivered
);

// Marcar solicitud como expirada
router.patch(
  '/:id/expire',
  codeController.expireCodeRequest
);

// Marcar solicitud como fallida
router.patch(
  '/:id/fail',
  codeController.failCodeRequest
);

module.exports = router;