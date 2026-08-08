const express = require('express');
const saleController = require('../controllers/saleController');

const router = express.Router();

// Listar ventas
router.get('/', saleController.listSales);

// Obtener una venta
router.get('/:id', saleController.getSale);

// Crear venta
router.post('/', saleController.createSale);

// Actualizar venta
router.put('/:id', saleController.updateSale);

// Eliminar venta
router.delete('/:id', saleController.deleteSale);

module.exports = router;