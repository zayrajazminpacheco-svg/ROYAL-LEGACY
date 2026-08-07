const express = require('express');

const { getHealth } = require('../controllers/healthController');

const authRoutes = require('./authRoutes');
const adminRoutes = require('./adminRoutes');
const catalogRoutes = require('./catalogRoutes');
const mailRoutes = require('./mailRoutes');
const codeRoutes = require('./codeRoutes');

const router = express.Router();

// Health check
router.get('/health', getHealth);

// Autenticación
router.use('/auth', authRoutes);

// Catálogo público
router.use('/', catalogRoutes);

// Panel administrativo
router.use('/admin', adminRoutes);

// Generador de correos
router.use('/mail', mailRoutes);

// Panel de códigos
router.use('/codes', codeRoutes);

module.exports = router;