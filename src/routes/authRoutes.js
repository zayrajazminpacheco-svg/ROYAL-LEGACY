const express = require('express');

const authController = require('../controllers/authController');

const {
  authenticateToken,
  authorizeRoles
} = require('../middlewares/auth');


const router = express.Router();


// ========================================
// REGISTRO DE CLIENTES
// ========================================

router.post(
  '/register',
  authController.register
);


// ========================================
// LOGIN DE CLIENTES
// ========================================

router.post(
  '/login',
  authController.login
);


// ========================================
// LOGIN DE ADMINISTRADORES
// ========================================

router.post(
  '/admin/login',
  authController.adminLogin
);


// ========================================
// USUARIO AUTENTICADO
// ========================================

router.get(
  '/me',
  authenticateToken,
  authController.getMe
);


// ========================================
// ADMINISTRADOR AUTENTICADO
// ========================================

router.get(
  '/admin/me',
  authenticateToken,
  authorizeRoles(
    'ADMIN',
    'SUPER_ADMIN'
  ),
  authController.getMe
);


module.exports = router;
