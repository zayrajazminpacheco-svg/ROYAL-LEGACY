const express = require('express');
const multer = require('multer');

const {
  authenticateToken,
  authorizeRoles
} = require('../middlewares/auth');

const customerController = require('../controllers/customerController');
const productController = require('../controllers/productController');
const providerController = require('../controllers/providerController');
const saleController = require('../controllers/saleController');
const reportController = require('../controllers/reportController');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage()
});

// Todas las rutas requieren autenticación y permisos de administrador
router.use(
  authenticateToken,
  authorizeRoles('SUPER_ADMIN', 'ADMIN')
);

// Dashboard
router.get('/dashboard', reportController.getDashboard);

// Clientes
router.get('/customers', customerController.listCustomers);
router.get('/customers/:id', customerController.getCustomer);
router.post('/customers', customerController.createCustomer);
router.put('/customers/:id', customerController.updateCustomer);
router.delete('/customers/:id', customerController.deleteCustomer);

// Productos
router.get('/products', productController.listProducts);
router.get('/products/:id', productController.getProduct);
router.post('/products', productController.createProduct);
router.put('/products/:id', productController.updateProduct);
router.delete('/products/:id', productController.deleteProduct);
router.patch('/products/:id/stock', productController.updateStock);

router.post(
  '/products/:id/image',
  upload.single('image'),
  productController.uploadImage
);

// Proveedores
router.get('/providers', providerController.listProviders);
router.get('/providers/:id', providerController.getProvider);
router.post('/providers', providerController.createProvider);
router.put('/providers/:id', providerController.updateProvider);
router.delete('/providers/:id', providerController.deleteProvider);

// Ventas
router.get('/sales', saleController.listSales);
router.get('/sales/:id', saleController.getSale);
router.post('/sales', saleController.createSale);
router.put('/sales/:id', saleController.updateSale);
router.delete('/sales/:id', saleController.deleteSale);

// Reportes
router.get('/reports', reportController.getReports);

module.exports = router;