const { verifyToken } = require('../services/authService');


// ========================================
// AUTENTICAR TOKEN
// ========================================

async function authenticateToken(req, res, next) {
  try {

    const authHeader =
      req.headers.authorization || '';

    const token =
      authHeader.startsWith('Bearer ')
        ? authHeader.slice(7)
        : null;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication token is required'
      });
    }

    const { user } =
      await verifyToken(token);

    req.user = user;

    next();

  } catch (error) {

    return res
      .status(error.status || 401)
      .json({
        success: false,
        message:
          error.message ||
          'Authentication failed'
      });
  }
}


// ========================================
// AUTORIZAR ROLES
// ========================================

function authorizeRoles(...roles) {
  return (req, res, next) => {

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }

    next();
  };
}


// ========================================
// EXPORTAR
// ========================================

module.exports = {
  authenticateToken,
  authorizeRoles
};