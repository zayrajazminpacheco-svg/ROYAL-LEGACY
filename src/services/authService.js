const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const config = require('../config/env');

function createError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

async function ensureDatabaseConnection() {
  try {
    await prisma.$connect();
  } catch (error) {
    const wrapped = createError(
      503,
      'Database unavailable'
    );

    wrapped.cause = error;

    throw wrapped;
  }
}

function signToken(payload) {
  return jwt.sign(
    payload,
    config.jwtSecret,
    {
      expiresIn: config.jwtExpiresIn
    }
  );
}

function sanitizeUser(user) {
  if (!user) {
    return null;
  }

  const {
    passwordHash,
    ...safeUser
  } = user;

  return safeUser;
}

function normalizeEmail(email) {
  return String(email || '')
    .trim()
    .toLowerCase();
}

// ========================================
// SUPER ADMIN
// ========================================

async function ensureSuperAdmin() {
  if (
    !config.superAdminEmail ||
    !config.superAdminPassword
  ) {
    return null;
  }

  await ensureDatabaseConnection();

  const email = normalizeEmail(
    config.superAdminEmail
  );

  const passwordHash = await bcrypt.hash(
    config.superAdminPassword,
    10
  );

  const user = await prisma.user.upsert({
    where: {
      email
    },

    update: {
      passwordHash,
      role: 'SUPER_ADMIN',
      status: 'ACTIVE'
    },

    create: {
      name: 'Super Administrator',
      email,
      passwordHash,
      role: 'SUPER_ADMIN',
      status: 'ACTIVE'
    }
  });

  return user;
}

// ========================================
// REGISTRO
// ========================================

async function register(payload) {
  const email = normalizeEmail(
    payload?.email
  );

  const password =
    payload?.password;

  const name =
    payload?.name?.trim();

  if (
    !email ||
    !password ||
    !name
  ) {
    throw createError(
      400,
      'Name, email and password are required'
    );
  }

  await ensureDatabaseConnection();

  const existing =
    await prisma.user.findUnique({
      where: {
        email
      }
    });

  if (existing) {
    throw createError(
      409,
      'A user with this email already exists'
    );
  }

  const passwordHash =
    await bcrypt.hash(
      password,
      10
    );

  const user =
    await prisma.user.create({
      data: {
        name,
        email,
        phone:
          payload?.phone || null,
        passwordHash,
        role: 'CLIENT',
        status: 'ACTIVE'
      }
    });

  const token = signToken({
    sub: user.id,
    role: user.role,
    email: user.email
  });

  return {
    user: sanitizeUser(user),
    token
  };
}

// ========================================
// LOGIN CLIENTE
// ========================================

async function login(payload) {
  const email = normalizeEmail(
    payload?.email
  );

  const password =
    payload?.password;

  if (!email || !password) {
    throw createError(
      400,
      'Email and password are required'
    );
  }

  await ensureDatabaseConnection();

  const user =
    await prisma.user.findUnique({
      where: {
        email
      }
    });

  if (
    !user ||
    !user.passwordHash
  ) {
    throw createError(
      401,
      'Invalid credentials'
    );
  }

  const isValid =
    await bcrypt.compare(
      password,
      user.passwordHash
    );

  if (!isValid) {
    throw createError(
      401,
      'Invalid credentials'
    );
  }

  if (
    user.status !== 'ACTIVE'
  ) {
    throw createError(
      403,
      'This account is not active'
    );
  }

  const token = signToken({
    sub: user.id,
    role: user.role,
    email: user.email
  });

  return {
    user: sanitizeUser(user),
    token
  };
}

// ========================================
// LOGIN ADMIN
// ========================================

async function adminLogin(payload) {
  const email = normalizeEmail(
    payload?.email
  );

  const password =
    payload?.password;

  if (!email || !password) {
    throw createError(
      400,
      'Email and password are required'
    );
  }

  await ensureDatabaseConnection();

  const superAdminEmail =
    normalizeEmail(
      config.superAdminEmail
    );

  // Si el correo coincide con el SUPER ADMIN
  // configurado en .env, lo crea o actualiza.
  if (
    email === superAdminEmail
  ) {
    await ensureSuperAdmin();
  }

  const user =
    await prisma.user.findUnique({
      where: {
        email
      }
    });

  if (
    !user ||
    !user.passwordHash
  ) {
    throw createError(
      401,
      'Invalid admin credentials'
    );
  }

  const isValid =
    await bcrypt.compare(
      password,
      user.passwordHash
    );

  if (!isValid) {
    throw createError(
      401,
      'Invalid admin credentials'
    );
  }

  if (
    ![
      'SUPER_ADMIN',
      'ADMIN'
    ].includes(user.role)
  ) {
    throw createError(
      403,
      'This account is not authorized for admin login'
    );
  }

  if (
    user.status !== 'ACTIVE'
  ) {
    throw createError(
      403,
      'This account is not active'
    );
  }

  const token = signToken({
    sub: user.id,
    role: user.role,
    email: user.email
  });

  return {
    user: sanitizeUser(user),
    token
  };
}

// ========================================
// VERIFICAR TOKEN
// ========================================

async function verifyToken(token) {
  if (!token) {
    throw createError(
      401,
      'Authentication token is required'
    );
  }

  let decoded;

  try {
    decoded = jwt.verify(
      token,
      config.jwtSecret
    );
  } catch (error) {
    if (
      error.name ===
      'TokenExpiredError'
    ) {
      throw createError(
        401,
        'Token expired'
      );
    }

    if (
      error.name ===
        'JsonWebTokenError' ||
      error.name ===
        'NotBeforeError'
    ) {
      throw createError(
        401,
        'Invalid authentication token'
      );
    }

    throw error;
  }

  await ensureDatabaseConnection();

  const user =
    await prisma.user.findUnique({
      where: {
        id: decoded.sub
      }
    });

  if (!user) {
    throw createError(
      401,
      'User not found'
    );
  }

  if (
    user.status !== 'ACTIVE'
  ) {
    throw createError(
      403,
      'This account is not active'
    );
  }

  return {
    user: sanitizeUser(user),
    decoded
  };
}

module.exports = {
  register,
  login,
  adminLogin,
  verifyToken,
  ensureSuperAdmin
};