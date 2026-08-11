const express = require('express');
const catalogController = require('../controllers/catalogController');

const router = express.Router();

router.get('/categories', catalogController.listCategories);
router.get('/products', catalogController.listProducts);
router.get('/products/:slug', catalogController.getProductBySlug);

router.post('/products', catalogController.createProduct);
router.post('/products/:productId/variants', catalogController.createProductVariant);

module.exports = router;