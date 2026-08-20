const express =
  require('express');

const supportReportController =
  require(
    '../controllers/supportReportController'
  );

const {
  authenticateToken,
  authorizeRoles
} = require(
  '../middlewares/auth'
);

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

const clientOrAdmin =
  authorizeRoles(
    'CLIENT',
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

// Listar los reportes del cliente
router.get(
  '/my',
  clientOnly,
  supportReportController.listMyReports
);

// Consultar un reporte propio
router.get(
  '/my/:id',
  clientOnly,
  supportReportController.getMyReport
);

// Crear un reporte
router.post(
  '/my',
  clientOnly,
  supportReportController.createMyReport
);

// ============================================================
// ARCHIVOS PROTEGIDOS
// ============================================================

// Solamente el propietario o un administrador
// podrán consultar el archivo.
router.get(
  '/:id/attachment',
  clientOrAdmin,
  supportReportController.getReportAttachment
);

// ============================================================
// ADMINISTRACIÓN
// ============================================================

// Listar todos los reportes
router.get(
  '/',
  adminOnly,
  supportReportController.listReports
);

// Consultar cualquier reporte
router.get(
  '/:id',
  adminOnly,
  supportReportController.getReport
);

// Cambiar estado, prioridad o respuesta
router.patch(
  '/:id',
  adminOnly,
  supportReportController.updateReport
);

module.exports =
  router;