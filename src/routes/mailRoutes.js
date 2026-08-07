const express = require('express');

const {
  authenticateToken,
  authorizeRoles
} = require('../middlewares/auth');

const mailController = require('../controllers/mailController');

const router = express.Router();

// Solo administradores
router.use(
  authenticateToken,
  authorizeRoles('SUPER_ADMIN', 'ADMIN')
);

// ===== DOMINIOS =====
router.get('/domains', mailController.listDomains);
router.post('/domains', mailController.createDomain);

// ===== ALIAS =====
router.get('/aliases', mailController.listAliases);
router.post('/aliases', mailController.createAlias);
router.post('/aliases/generate', mailController.generateAliases);
router.patch('/aliases/:id/status', mailController.updateAliasStatus);
router.post('/aliases/:id/assign', mailController.assignAlias);
router.post('/aliases/:id/release', mailController.releaseAlias);

module.exports = router;