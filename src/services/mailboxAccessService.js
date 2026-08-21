const crypto = require('crypto');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const prisma = require('../lib/prisma');
const config = require('../config/env');

const {
  encryptSecret,
  decryptSecret
} = require('./secretService');

const MAILBOX_TOKEN_TTL =
  '12h';

// CLIENT_MAILBOX_VISIBILITY_V1

const PASSWORD_ALPHABET =
  'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';

function createError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function normalizeEmail(value) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

function randomPart(length = 4) {
  const bytes =
    crypto.randomBytes(length);

  let result = '';

  for (
    let index = 0;
    index < length;
    index += 1
  ) {
    result +=
      PASSWORD_ALPHABET[
        bytes[index] %
        PASSWORD_ALPHABET.length
      ];
  }

  return result;
}

function generateMailboxPassword() {
  return [
    'RL',
    randomPart(4),
    randomPart(4),
    randomPart(4)
  ].join('-');
}

async function buildPasswordData() {
  const password =
    generateMailboxPassword();

  const passwordHash =
    await bcrypt.hash(
      password,
      12
    );

  return {
    password,
    passwordHash,
    passwordEncrypted:
      encryptSecret(password)
  };
}

function safeAlias(alias) {
  if (!alias) {
    return null;
  }

  const {
    accessPasswordHash,
    accessPasswordEncrypted,
    ...safe
  } = alias;

  return {
    ...safe,
    hasAccessPassword:
      Boolean(
        accessPasswordHash &&
        accessPasswordEncrypted
      )
  };
}

function getMailboxUrl(email) {
  return `/correo?email=${encodeURIComponent(
    normalizeEmail(email)
  )}`;
}

async function resolveMailboxSaleContext(
  aliasId,
  database = prisma
) {
  const assignments =
    await database.inventoryAlias.findMany({
      where: {
        emailAliasId:
          aliasId,
        active:
          true
      },
      include: {
        InventoryItem: {
          include: {
            SaleItem: {
              include: {
                sale: true
              }
            }
          }
        }
      },
      orderBy: {
        assignedAt:
          'desc'
      },
      take: 20
    });

  for (
    const assignment
    of assignments
  ) {
    const inventory =
      assignment.InventoryItem;

    const sale =
      inventory?.SaleItem?.sale;

    if (
      !sale ||
      inventory.status !==
        'SOLD' ||
      sale.paymentStatus !==
        'PAID' ||
      ![
        'PAID',
        'PROCESSING',
        'DELIVERED'
      ].includes(
        sale.status
      )
    ) {
      continue;
    }

    const visibleFrom =
      sale.deliveredAt ||
      sale.paidAt ||
      inventory.soldAt ||
      sale.createdAt;

    if (!visibleFrom) {
      continue;
    }

    return {
      saleId:
        sale.id,
      visibleFrom:
        new Date(
          visibleFrom
        ),
      inventoryItemId:
        inventory.id
    };
  }

  return null;
}

async function createAliasPasswordData() {
  const passwordData =
    await buildPasswordData();

  return {
    password:
      passwordData.password,

    data: {
      accessPasswordHash:
        passwordData.passwordHash,
      accessPasswordEncrypted:
        passwordData.passwordEncrypted,
      accessEnabled:
        true,
      accessVersion:
        1,
      accessPasswordChangedAt:
        new Date()
    }
  };
}

async function ensureAliasAccess(
  aliasId,
  database = prisma
) {
  const alias =
    await database.emailAlias.findUnique({
      where: {
        id:
          aliasId
      }
    });

  if (!alias) {
    throw createError(
      404,
      'Correo no encontrado'
    );
  }

  const currentPassword =
    decryptSecret(
      alias.accessPasswordEncrypted
    );

  if (
    alias.accessPasswordHash &&
    currentPassword
  ) {
    return {
      alias:
        safeAlias(alias),
      password:
        currentPassword,
      mailboxUrl:
        getMailboxUrl(
          alias.fullAddress
        )
    };
  }

  const passwordData =
    await buildPasswordData();

  const updated =
    await database.emailAlias.update({
      where: {
        id:
          alias.id
      },
      data: {
        accessPasswordHash:
          passwordData.passwordHash,
        accessPasswordEncrypted:
          passwordData.passwordEncrypted,
        accessEnabled:
          true,
        accessVersion: {
          increment: 1
        },
        accessPasswordChangedAt:
          new Date(),
        updatedAt:
          new Date()
      }
    });

  return {
    alias:
      safeAlias(updated),
    password:
      passwordData.password,
    mailboxUrl:
      getMailboxUrl(
        updated.fullAddress
      )
  };
}

async function ensureSaleAliasAccess(
  aliasId,
  saleId,
  visibleFrom,
  database = prisma
) {
  const alias =
    await database.emailAlias.findUnique({
      where: {
        id:
          aliasId
      }
    });

  if (!alias) {
    throw createError(
      404,
      'Correo no encontrado'
    );
  }

  const normalizedSaleId =
    String(
      saleId ||
      ''
    ).trim();

  const cutoff =
    visibleFrom
      ? new Date(
          visibleFrom
        )
      : null;

  if (
    !normalizedSaleId ||
    !cutoff ||
    Number.isNaN(
      cutoff.getTime()
    )
  ) {
    throw createError(
      409,
      'No fue posible preparar el acceso privado de esta compra'
    );
  }

  const currentPassword =
    decryptSecret(
      alias.accessPasswordEncrypted
    );

  const passwordChangedAt =
    alias.accessPasswordChangedAt
      ? new Date(
          alias.accessPasswordChangedAt
        )
      : null;

  if (
    alias.accessPasswordHash &&
    currentPassword &&
    passwordChangedAt &&
    passwordChangedAt.getTime() >=
      cutoff.getTime()
  ) {
    return {
      alias:
        safeAlias(alias),
      password:
        currentPassword,
      mailboxUrl:
        getMailboxUrl(
          alias.fullAddress
        ),
      saleId:
        normalizedSaleId,
      visibleFrom:
        cutoff
    };
  }

  const passwordData =
    await buildPasswordData();

  const updated =
    await database.emailAlias.update({
      where: {
        id:
          alias.id
      },
      data: {
        accessPasswordHash:
          passwordData.passwordHash,
        accessPasswordEncrypted:
          passwordData.passwordEncrypted,
        accessEnabled:
          true,
        accessVersion: {
          increment: 1
        },
        accessPasswordChangedAt:
          new Date(),
        updatedAt:
          new Date()
      }
    });

  return {
    alias:
      safeAlias(updated),
    password:
      passwordData.password,
    mailboxUrl:
      getMailboxUrl(
        updated.fullAddress
      ),
    saleId:
      normalizedSaleId,
    visibleFrom:
      cutoff
  };
}

async function resetAliasAccess(
  aliasId,
  database = prisma
) {
  const existing =
    await database.emailAlias.findUnique({
      where: {
        id:
          aliasId
      },
      select: {
        id: true
      }
    });

  if (!existing) {
    throw createError(
      404,
      'Correo no encontrado'
    );
  }

  const passwordData =
    await buildPasswordData();

  const alias =
    await database.emailAlias.update({
      where: {
        id:
          aliasId
      },
      data: {
        accessPasswordHash:
          passwordData.passwordHash,
        accessPasswordEncrypted:
          passwordData.passwordEncrypted,
        accessEnabled:
          true,
        accessVersion: {
          increment: 1
        },
        accessPasswordChangedAt:
          new Date(),
        updatedAt:
          new Date()
      }
    });

  return {
    alias:
      safeAlias(alias),
    password:
      passwordData.password,
    mailboxUrl:
      getMailboxUrl(
        alias.fullAddress
      )
  };
}

async function loginMailbox(payload = {}) {
  const email =
    normalizeEmail(
      payload.email
    );

  const password =
    String(
      payload.password ||
      ''
    );

  if (!email || !password) {
    throw createError(
      400,
      'Correo y contraseña son obligatorios'
    );
  }

  const alias =
    await prisma.emailAlias.findUnique({
      where: {
        fullAddress:
          email
      }
    });

  if (
    !alias ||
    !alias.accessEnabled ||
    !alias.accessPasswordHash
  ) {
    throw createError(
      401,
      'Correo o contraseña incorrectos'
    );
  }

  const saleContext =
    await resolveMailboxSaleContext(
      alias.id
    );

  if (!saleContext) {
    throw createError(
      403,
      'Este correo todavía no está asignado a una compra activa'
    );
  }

  const valid =
    await bcrypt.compare(
      password,
      alias.accessPasswordHash
    );

  if (!valid) {
    throw createError(
      401,
      'Correo o contraseña incorrectos'
    );
  }

  const passwordChangedAt =
    alias.accessPasswordChangedAt
      ? new Date(
          alias.accessPasswordChangedAt
        )
      : null;

  if (
    !passwordChangedAt ||
    passwordChangedAt.getTime() <
      saleContext.visibleFrom.getTime()
  ) {
    throw createError(
      401,
      'El acceso de esta compra fue renovado. Usa la contraseña más reciente.'
    );
  }

  const token =
    jwt.sign(
      {
        type:
          'MAILBOX',
        email:
          alias.fullAddress,
        version:
          alias.accessVersion,
        saleId:
          saleContext.saleId
      },
      config.jwtSecret,
      {
        subject:
          alias.id,
        expiresIn:
          MAILBOX_TOKEN_TTL
      }
    );

  return {
    token,
    mailbox: {
      id:
        alias.id,
      email:
        alias.fullAddress,
      platformGroup:
        alias.platformGroup ||
        null,
      visibleFrom:
        saleContext.visibleFrom
    }
  };
}

async function verifyMailboxToken(token) {
  if (!token) {
    throw createError(
      401,
      'Debes iniciar sesión en el correo'
    );
  }

  let decoded;

  try {
    decoded =
      jwt.verify(
        token,
        config.jwtSecret
      );
  } catch {
    throw createError(
      401,
      'La sesión del correo expiró o no es válida'
    );
  }

  if (
    decoded.type !==
    'MAILBOX'
  ) {
    throw createError(
      401,
      'La sesión del correo no es válida'
    );
  }

  const alias =
    await prisma.emailAlias.findUnique({
      where: {
        id:
          decoded.sub
      }
    });

  if (
    !alias ||
    !alias.accessEnabled ||
    Number(alias.accessVersion) !==
      Number(decoded.version)
  ) {
    throw createError(
      401,
      'El acceso a este correo fue cambiado o revocado'
    );
  }

  if (
    normalizeEmail(
      decoded.email
    ) !==
    normalizeEmail(
      alias.fullAddress
    )
  ) {
    throw createError(
      401,
      'La sesión no corresponde a este correo'
    );
  }

  const saleContext =
    await resolveMailboxSaleContext(
      alias.id
    );

  if (
    !saleContext ||
    String(
      decoded.saleId ||
      ''
    ) !==
      String(
        saleContext.saleId
      )
  ) {
    throw createError(
      401,
      'Esta cuenta fue reasignada y la sesión anterior dejó de funcionar'
    );
  }

  return {
    alias,
    saleContext
  };
}

async function authenticateMailbox(
  req,
  res,
  next
) {
  try {
    const authorization =
      String(
        req.headers.authorization ||
        ''
      );

    const token =
      authorization.startsWith(
        'Bearer '
      )
        ? authorization.slice(7)
        : '';

    const result =
      await verifyMailboxToken(
        token
      );

    const alias =
      result.alias;

    req.mailboxAlias =
      alias;

    req.mailboxEmail =
      alias.fullAddress;

    req.mailboxVisibleFrom =
      result.saleContext
        .visibleFrom;

    req.mailboxSaleId =
      result.saleContext
        .saleId;

    next();

  } catch (error) {
    return res
      .status(
        error.status ||
        401
      )
      .json({
        success: false,
        message:
          error.message ||
          'No fue posible abrir el correo'
      });
  }
}

module.exports = {
  safeAlias,
  getMailboxUrl,
  resolveMailboxSaleContext,
  createAliasPasswordData,
  ensureAliasAccess,
  ensureSaleAliasAccess,
  resetAliasAccess,
  loginMailbox,
  verifyMailboxToken,
  authenticateMailbox
};
