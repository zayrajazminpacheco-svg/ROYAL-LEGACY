const express = require('express');
const mailController = require('../controllers/mailController');

const {
  authenticateToken,
  authorizeRoles
} = require('../middlewares/auth');

const router = express.Router();

router.use(
  authenticateToken,
  authorizeRoles(
    'SUPER_ADMIN',
    'ADMIN'
  )
);

// ==========================================
// DOMINIOS
// ==========================================

router.get(
  '/domains',
  mailController.listDomains
);

router.post(
  '/domains',
  mailController.createDomain
);


// ==========================================
// CORREOS / ALIAS
// ==========================================

router.get(
  '/aliases',
  mailController.listAliases
);

router.post(
  '/aliases',
  mailController.createAlias
);

router.post(
  '/aliases/generate',
  mailController.generateAliases
);

router.post(
  '/aliases/:aliasId/access/credentials',
  mailController.getAliasAccessCredentials
);

router.post(
  '/aliases/:aliasId/access/reset',
  mailController.resetAliasAccessCredentials
);


// ==========================================
// ASIGNAR MANUALMENTE
// ==========================================

router.post(
  '/aliases/:aliasId/assign',
  mailController.assignAlias
);


// ==========================================
// ASIGNAR AUTOMÁTICAMENTE
// ==========================================

router.post(
  '/aliases/assign-auto',
  mailController.assignAliasAutomatically
);


// ==========================================
// LIBERAR
// ==========================================

router.post(
  '/aliases/:aliasId/release',
  mailController.releaseAlias
);


module.exports = router;
