const express = require('express');
const mailController = require('../controllers/mailController');

const router = express.Router();

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