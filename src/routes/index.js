const express =
  require('express');

const {
  getHealth
} = require(
  '../controllers/healthController'
);

const authRoutes =
  require('./authRoutes');

const adminRoutes =
  require('./adminRoutes');

const catalogRoutes =
  require('./catalogRoutes');

const mailRoutes =
  require('./mailRoutes');

const codeRoutes =
  require('./codeRoutes');

const inboxRoutes =
  require('./inboxRoutes');

const mailboxRoutes =
  require('./mailboxRoutes');

const salesRoutes =
  require('./salesRoutes');

const inventoryRoutes =
  require('./inventoryRoutes');

const supportReportRoutes =
  require('./supportReportRoutes');

const walletRoutes =
  require('./walletRoutes');

const whatsappBotRoutes =
  require('./whatsappBotRoutes');

const botCatalogRoutes =
  require('./botCatalogRoutes');

const router =
  express.Router();

// ============================================================
// HEALTH
// ============================================================

router.get(
  '/health',
  getHealth
);

// ============================================================
// AUTENTICACIÓN
// ============================================================

router.use(
  '/auth',
  authRoutes
);

// ============================================================
// CATÁLOGO
// ============================================================

router.use(
  '/',
  catalogRoutes
);

// ============================================================
// ADMINISTRACIÓN
// ============================================================

router.use(
  '/admin',
  adminRoutes
);

// ============================================================
// CORREOS
// ============================================================

router.use(
  '/mail',
  mailRoutes
);

// ============================================================
// CÓDIGOS
// ============================================================

router.use(
  '/codes',
  codeRoutes
);

// ============================================================
// BANDEJA
// ============================================================

router.use(
  '/inbox',
  inboxRoutes
);

// ============================================================
// BANDEJA PRIVADA POR CORREO Y CONTRASEÑA
// ============================================================

router.use(
  '/mailbox',
  mailboxRoutes
);

// ============================================================
// VENTAS
// ============================================================

router.use(
  '/sales',
  salesRoutes
);

// ============================================================
// INVENTARIO
// ============================================================

router.use(
  '/inventory',
  inventoryRoutes
);

// ============================================================
// REPORTES Y SOPORTE
// ============================================================

router.use(
  '/reports',
  supportReportRoutes
);

// ============================================================
// SALDO Y RECARGAS SPEI
// ============================================================

router.use(
  '/wallet',
  walletRoutes
);

// ============================================================
// BOT DE WHATSAPP
// ============================================================

router.use(
  '/whatsapp-bot',
  whatsappBotRoutes
);

// ============================================================
// CATÁLOGO PARA BOT
// ============================================================

router.use(
  '/bot',
  botCatalogRoutes
);

module.exports =
  router;
