const express = require('express');

const catalogController = require('../controllers/catalogController');

const {
  authenticateToken,
  authorizeRoles
} = require('../middlewares/auth');

const router = express.Router();


// ============================================================
// CATÁLOGO PÚBLICO / CONSULTA
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
// ADMINISTRACIÓN DEL CATÁLOGO
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


module.exports = router;