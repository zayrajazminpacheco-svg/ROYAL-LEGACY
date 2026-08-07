const { verifyToken } = require('../services/authService');

const loginAttempts = new Map();

function loginRateLimiter(maxAttempts = 5, windowMs = 15 * 60 * 1000) {
  return (req, res, next) => {
    const key = req.ip || 'unknown';
    const now = Date.now();
    const attempts = loginAttempts.get(key) || { count: 0, resetAt: now + windowMs };

    if (now > attempts.resetAt) {
      attempts.count = 0;
      attempts.resetAt = now + windowMs;
    }

    if (attempts.count >= maxAttempts) {
      return res.status(429).json({
        success: false,
        message: 'Too many login attempts. Please try again later.'
      });
    }

    attempts.count += 1;
    loginAttempts.set(key, attempts);
    next();
  };
}

async function authenticateToken(req, res, next) {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication token is required'
      });
    }

    const { user } = await verifyToken(token);
    req.user = user;
    next();
  } catch (error) {
    return res.status(error.status || 401).json({
      success: false,
      message: error.message || 'Authentication failed'
    });
  }
}

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

module.exports = {
  authenticateToken,
  authorizeRoles,
  loginRateLimiter
};
