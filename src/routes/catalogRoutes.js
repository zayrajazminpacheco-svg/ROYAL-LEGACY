const express = require('express');
const catalogController = require('../controllers/catalogController');

const {
  authenticateToken,
  authorizeRoles
} = require('../middlewares/auth');

const router = express.Router();


// ============================================================
// CATÁLOGO PÚBLICO / LECTURA
// ============================================================

router.get(
  '/categories',
  catalogController.listCategories
);

router.get(
  '/products',
  catalogController.listProducts
);

router.get(
  '/products/:slug',
  catalogController.getProductBySlug
);


// ============================================================
// CATÁLOGO ADMINISTRATIVO / CREACIÓN
// SOLO SUPER_ADMIN Y ADMIN
// ============================================================

router.post(
  '/products',
  authenticateToken,
  authorizeRoles(
    'SUPER_ADMIN',
    'ADMIN'
  ),
  catalogController.createProduct
);

router.post(
  '/products/:productId/variants',
  authenticateToken,
  authorizeRoles(
    'SUPER_ADMIN',
    'ADMIN'
  ),
  catalogController.createProductVariant
);


// ============================================================
// EXPORTAR
// ============================================================

module.exports = router;