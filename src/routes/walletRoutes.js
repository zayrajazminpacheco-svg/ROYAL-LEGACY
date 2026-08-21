const express =
  require('express');

const walletController =
  require('../controllers/walletController');

const {
  authenticateToken,
  authorizeRoles
} = require('../middlewares/auth');

const router =
  express.Router();

const clientOnly =
  authorizeRoles('CLIENT');

const adminOnly =
  authorizeRoles(
    'SUPER_ADMIN',
    'ADMIN'
  );

const clientOrAdmin =
  authorizeRoles(
    'CLIENT',
    'SUPER_ADMIN',
    'ADMIN'
  );

router.use(
  authenticateToken
);

// ============================================================
// CLIENTE
// ============================================================

router.get(
  '/me',
  clientOnly,
  walletController.getMyWallet
);

router.get(
  '/top-ups',
  clientOnly,
  walletController.listMyTopUps
);

router.post(
  '/top-ups',
  clientOnly,
  walletController.createTopUp
);

router.post(
  '/top-ups/:id/submit',
  clientOnly,
  walletController.submitTopUp
);

router.post(
  '/top-ups/:id/cancel',
  clientOnly,
  walletController.cancelMyTopUp
);

// El propietario o un administrador puede descargar el CEP.
router.get(
  '/top-ups/:id/cep',
  clientOrAdmin,
  walletController.getTopUpCep
);

// ============================================================
// ADMINISTRACIÓN
// ============================================================

router.get(
  '/admin/top-ups',
  adminOnly,
  walletController.listTopUps
);

router.post(
  '/admin/top-ups/:id/approve',
  adminOnly,
  walletController.approveTopUp
);

router.post(
  '/admin/top-ups/:id/reject',
  adminOnly,
  walletController.rejectTopUp
);

module.exports =
  router;
