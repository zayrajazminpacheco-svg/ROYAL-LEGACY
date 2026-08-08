const express = require('express');

const { getHealth } = require('../controllers/healthController');

const authRoutes = require('./authRoutes');
const adminRoutes = require('./adminRoutes');
const catalogRoutes = require('./catalogRoutes');
const mailRoutes = require('./mailRoutes');
const codeRoutes = require('./codeRoutes');
const inboxRoutes = require('./inboxRoutes');
const salesRoutes = require('./salesRoutes');

const router = express.Router();

// Health
router.get('/health', getHealth);

// Autenticación
router.use('/auth', authRoutes);

// Catálogo
router.use('/', catalogRoutes);

// Administración
router.use('/admin', adminRoutes);

// Correos
router.use('/mail', mailRoutes);

// Códigos
router.use('/codes', codeRoutes);

// Inbox
router.use('/inbox', inboxRoutes);

// Ventas
router.use('/sales', salesRoutes);

module.exports = router;