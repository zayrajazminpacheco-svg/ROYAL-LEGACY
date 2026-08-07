const express = require('express');
const { register, login, adminLogin, getMe } = require('../controllers/authController');
const { authenticateToken, authorizeRoles, loginRateLimiter } = require('../middlewares/auth');

const router = express.Router();

router.post('/register', register);
router.post('/login', loginRateLimiter(), login);
router.post('/admin/login', loginRateLimiter(), adminLogin);
router.get('/me', authenticateToken, authorizeRoles('SUPER_ADMIN', 'ADMIN', 'EMPLOYEE', 'CLIENT'), getMe);

module.exports = router;
