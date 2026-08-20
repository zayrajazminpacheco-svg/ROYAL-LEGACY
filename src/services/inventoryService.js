const prisma = require('../lib/prisma');
const crypto = require('crypto');

// ============================================================
// UTILIDADES
// ============================================================

function createError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function normalizeStatus(value) {
  if (!value) {
    return null;
  }

  return String(value).trim().toUpperCase();
}

function normalizeDate(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw createError(400, `Fecha inválida: ${value}`);
  }

  return date;
}

function generateId() {
  return crypto.randomUUID();
}

function cleanText(value = '') {
  return String(value || '').trim();
}

function normalizeMoney(value, fieldName, options = {}) {
  const allowNull = options.allowNull === true;

  if (
    value === undefined ||
    value === null ||
    value === ''
  ) {
    if (allowNull) {
      return null;
    }

    throw createError(
      400,
      `${fieldName} es obligatorio`
    );
  }

  const amount = Number(value);

  if (
    !Number.isFinite(amount) ||
    amount < 0
  ) {
    throw createError(
      400,
      `${fieldName} debe ser un número mayor o igual a 0`
    );
  }

  return amount;
}

function addCalculatedProfit(item) {
  if (!item) {
    return item;
  }

  const internalCost = Number(
    item.internalCost || 0
  );

  const hasSalePrice =
    item.salePrice !== null &&
    item.salePrice !== undefined;

  const salePrice = hasSalePrice
    ? Number(item.salePrice)
    : null;

  return {
    ...item,
    profit:
      salePrice === null
        ? null
        : salePrice - internalCost
  };
}

// ============================================================
// SEGURIDAD Y CIFRADO
// ============================================================

function createHash(value = '') {
  if (!value) {
    return null;
  }

  return crypto
    .createHash('sha256')
    .update(
      String(value).trim().toLowerCase()
    )
    .digest('hex');
}

function maskEmail(email = '') {
  const cleanEmail = cleanText(email);
  const parts = cleanEmail.split('@');

  if (parts.length !== 2) {
    return cleanEmail;
  }

  const local = parts[0];
  const domain = parts[1];

  if (local.length <= 3) {
    return `${local.charAt(0) || '*'}***@${domain}`;
  }

  return `${local.slice(0, 3)}***@${domain}`;
}

function getEncryptionKey() {
  const secret =
    process.env.DATA_ENCRYPTION_KEY ||
    process.env.JWT_SECRET;

  if (!secret) {
    throw createError(
      500,
      'Falta DATA_ENCRYPTION_KEY o JWT_SECRET para proteger las credenciales'
    );
  }

  return crypto
    .createHash('sha256')
    .update(secret)
    .digest();
}

function encryptSecret(value) {
  const cleanValue = String(value || '');

  if (!cleanValue) {
    return null;
  }

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);

  const cipher = crypto.createCipheriv(
    'aes-256-gcm',
    key,
    iv
  );

  const encrypted = Buffer.concat([
    cipher.update(cleanValue, 'utf8'),
    cipher.final()
  ]);

  const authTag = cipher.getAuthTag();

  return [
    'v1',
    iv.toString('base64'),
    authTag.toString('base64'),
    encrypted.toString('base64')
  ].join('.');
}

function decryptSecret(value) {
  const cleanValue = cleanText(value);

  if (!cleanValue) {
    return null;
  }

  const parts = cleanValue.split('.');

  if (
    parts.length !== 4 ||
    parts[0] !== 'v1'
  ) {
    return null;
  }

  try {
    const key = getEncryptionKey();

    const iv = Buffer.from(
      parts[1],
      'base64'
    );

    const authTag = Buffer.from(
      parts[2],
      'base64'
    );

    const encrypted = Buffer.from(
      parts[3],
      'base64'
    );

    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      key,
      iv
    );

    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final()
    ]);

    return decrypted.toString('utf8');
  } catch (error) {
    return null;
  }
}

// ============================================================
// ESTADOS
// ============================================================

const ALLOWED_STATUSES = [
  'AVAILABLE',
  'RESERVED',
  'SOLD',
  'BLOCKED',
  'EXPIRED',
  'MAINTENANCE',
  'REMOVED'
];

function validateStatus(value) {
  const status = normalizeStatus(value);

  if (!ALLOWED_STATUSES.includes(status)) {
    throw createError(
      400,
      `Estado de inventario inválido: ${status}`
    );
  }

  return status;
}

// ============================================================
// RELACIONES DE INVENTARIO
// ============================================================

function getInventoryIncludes(options = {}) {
  return {
    ProductVariant: {
      include: {
        product: {
          include: {
            Category: true
          }
        }
      }
    },

    provider: true,

    providerPanel: true,

    SaleItem: {
      include: {
        sale: {
          include: {
            client: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true
              }
            }
          }
        }
      }
    },

    InventoryAlias: options.onlyActiveAliases
      ? {
          where: {
            active: true
          },
          include: {
            EmailAlias: {
              include: {
                MailDomain: true
              }
            }
          }
        }
      : {
          include: {
            EmailAlias: {
              include: {
                MailDomain: true
              }
            }
          },
          orderBy: {
            assignedAt: 'desc'
          }
        },

    CodeRequest: {
      orderBy: {
        requestedAt: 'desc'
      },
      ...(options.limitCodeRequests
        ? {
            take: 5
          }
        : {})
    },

    OutletOffer: true
  };
}

// ============================================================
// LISTAR INVENTARIO
// ============================================================

async function listInventory(query = {}) {
  const page = Math.max(
    Number.parseInt(query.page || '1', 10),
    1
  );

  const pageSize = Math.min(
    Math.max(
      Number.parseInt(
        query.pageSize || '50',
        10
      ),
      1
    ),
    100
  );

  const where = {};

  if (query.status) {
    where.status = normalizeStatus(
      query.status
    );
  }

  if (query.productVariantId) {
    where.productVariantId = cleanText(
      query.productVariantId
    );
  }

  if (query.providerId) {
    where.providerId = cleanText(
      query.providerId
    );
  }

  if (query.providerPanelId) {
    where.providerPanelId = cleanText(
      query.providerPanelId
    );
  }

  if (query.saleItemId) {
    where.saleItemId = cleanText(
      query.saleItemId
    );
  }

  const [items, total] = await Promise.all([
    prisma.inventoryItem.findMany({
      where,

      include: getInventoryIncludes({
        onlyActiveAliases: true,
        limitCodeRequests: true
      }),

      orderBy: [
        {
          createdAt: 'desc'
        }
      ],

      skip: (page - 1) * pageSize,
      take: pageSize
    }),

    prisma.inventoryItem.count({
      where
    })
  ]);

  return {
    items: items.map(addCalculatedProfit),
    total,
    page,
    pageSize,
    totalPages:
      total === 0
        ? 0
        : Math.ceil(total / pageSize)
  };
}

// ============================================================
// OBTENER INVENTARIO POR ID
// ============================================================

async function getInventoryItem(id) {
  if (!id) {
    throw createError(
      400,
      'El ID del artículo es obligatorio'
    );
  }

  const item =
    await prisma.inventoryItem.findUnique({
      where: {
        id
      },

      include: getInventoryIncludes()
    });

  if (!item) {
    throw createError(
      404,
      'Artículo de inventario no encontrado'
    );
  }

  return addCalculatedProfit(item);
}

// ============================================================
// VALIDAR CORREO O ALIAS
// ============================================================

async function getAvailableEmailAlias(
  emailAliasId
) {
  if (!emailAliasId) {
    return null;
  }

  const alias =
    await prisma.emailAlias.findUnique({
      where: {
        id: cleanText(emailAliasId)
      }
    });

  if (!alias) {
    throw createError(
      404,
      'El correo seleccionado no existe'
    );
  }

  if (alias.status !== 'AVAILABLE') {
    throw createError(
      409,
      `El correo ${alias.fullAddress} ya está asignado o no está disponible`
    );
  }

  const activeAssignment =
    await prisma.inventoryAlias.findFirst({
      where: {
        emailAliasId: alias.id,
        active: true
      }
    });

  if (activeAssignment) {
    throw createError(
      409,
      'Ese correo ya está relacionado con otra cuenta'
    );
  }

  return alias;
}

// ============================================================
// CREAR INVENTARIO
// ============================================================

async function createInventoryItem(
  payload = {}
) {
  const productVariantId = cleanText(
    payload.productVariantId
  );

  if (!productVariantId) {
    throw createError(
      400,
      'Selecciona un plan'
    );
  }

  const variant =
    await prisma.productVariant.findUnique({
      where: {
        id: productVariantId
      },

      include: {
        product: true
      }
    });

  if (!variant) {
    throw createError(
      404,
      'El plan seleccionado no existe'
    );
  }

  if (!variant.active) {
    throw createError(
      409,
      'El plan seleccionado está inactivo'
    );
  }

  const providerId = payload.providerId
    ? cleanText(payload.providerId)
    : null;

  const providerPanelId =
    payload.providerPanelId
      ? cleanText(payload.providerPanelId)
      : null;

  if (providerId) {
    const provider =
      await prisma.provider.findUnique({
        where: {
          id: providerId
        }
      });

    if (!provider) {
      throw createError(
        404,
        'Proveedor no encontrado'
      );
    }
  }

  if (providerPanelId) {
    const panel =
      await prisma.providerPanel.findUnique({
        where: {
          id: providerPanelId
        }
      });

    if (!panel) {
      throw createError(
        404,
        'Panel de proveedor no encontrado'
      );
    }
  }

  const status = payload.status
    ? validateStatus(payload.status)
    : 'AVAILABLE';

  const emailAliasId = payload.emailAliasId
    ? cleanText(payload.emailAliasId)
    : null;

  const alias = emailAliasId
    ? await getAvailableEmailAlias(
        emailAliasId
      )
    : null;

  const accountEmail =
    alias?.fullAddress ||
    cleanText(payload.accountEmail || '') ||
    null;

  const accountPassword =
    payload.accountPassword !== undefined
      ? String(
          payload.accountPassword || ''
        )
      : '';

  const internalCost =
    payload.internalCost !== undefined
      ? normalizeMoney(
          payload.internalCost,
          'El costo interno'
        )
      : 0;

  const salePrice = normalizeMoney(
    payload.salePrice,
    'El precio de venta',
    {
      allowNull: true
    }
  );

  const createdId = await prisma.$transaction(
    async tx => {
      const created =
        await tx.inventoryItem.create({
          data: {
            productVariantId,
            providerId,
            providerPanelId,

            internalCost,
            salePrice,

            loginEmailEncrypted: accountEmail
              ? encryptSecret(accountEmail)
              : payload.loginEmailEncrypted ||
                null,

            loginEmailMasked: accountEmail
              ? maskEmail(accountEmail)
              : payload.loginEmailMasked ||
                null,

            loginEmailHash: accountEmail
              ? createHash(accountEmail)
              : payload.loginEmailHash ||
                null,

            passwordEncrypted: accountPassword
              ? encryptSecret(accountPassword)
              : payload.passwordEncrypted ||
                null,

            passwordMode: payload.passwordMode
              ? String(
                  payload.passwordMode
                ).toUpperCase()
              : 'STATIC',

            profileNameEncrypted:
              payload.profileNameEncrypted ||
              null,

            profilePinEncrypted:
              payload.profilePinEncrypted ||
              null,

            externalLookupIdEncrypted:
              payload.externalLookupIdEncrypted ||
              null,

            externalReference:
              payload.externalReference || null,

            notes: payload.notes || null,

            status,

            acquiredAt: payload.acquiredAt
              ? normalizeDate(payload.acquiredAt)
              : new Date(),

            expirationDate:
              payload.expirationDate
                ? normalizeDate(
                    payload.expirationDate
                  )
                : null,

            soldAt:
              status === 'SOLD'
                ? new Date()
                : null
          }
        });

      if (alias) {
        await tx.inventoryAlias.create({
          data: {
            id: generateId(),
            inventoryItemId: created.id,
            emailAliasId: alias.id,
            active: true,
            assignedAt: new Date()
          }
        });

        await tx.emailAlias.update({
          where: {
            id: alias.id
          },

          data: {
            status: 'ASSIGNED',
            assignedAt: new Date(),

            platformGroup:
              variant.product?.name ||
              alias.platformGroup ||
              null,

            updatedAt: new Date()
          }
        });
      }

      return created.id;
    }
  );

  return getInventoryItem(createdId);
}

// ============================================================
// ACTUALIZAR INVENTARIO
// ============================================================

async function updateInventoryItem(
  id,
  payload = {}
) {
  const existing =
    await prisma.inventoryItem.findUnique({
      where: {
        id
      }
    });

  if (!existing) {
    throw createError(
      404,
      'Artículo de inventario no encontrado'
    );
  }

  const data = {};

  if (
    payload.productVariantId !== undefined
  ) {
    const productVariantId = cleanText(
      payload.productVariantId
    );

    if (!productVariantId) {
      throw createError(
        400,
        'El plan no puede estar vacío'
      );
    }

    const variant =
      await prisma.productVariant.findUnique({
        where: {
          id: productVariantId
        }
      });

    if (!variant) {
      throw createError(
        404,
        'El plan seleccionado no existe'
      );
    }

    if (!variant.active) {
      throw createError(
        409,
        'El plan seleccionado está inactivo'
      );
    }

    data.productVariantId =
      productVariantId;
  }

  if (payload.providerId !== undefined) {
    const providerId = payload.providerId
      ? cleanText(payload.providerId)
      : null;

    if (providerId) {
      const provider =
        await prisma.provider.findUnique({
          where: {
            id: providerId
          }
        });

      if (!provider) {
        throw createError(
          404,
          'Proveedor no encontrado'
        );
      }
    }

    data.providerId = providerId;
  }

  if (
    payload.providerPanelId !== undefined
  ) {
    const providerPanelId =
      payload.providerPanelId
        ? cleanText(payload.providerPanelId)
        : null;

    if (providerPanelId) {
      const panel =
        await prisma.providerPanel.findUnique({
          where: {
            id: providerPanelId
          }
        });

      if (!panel) {
        throw createError(
          404,
          'Panel de proveedor no encontrado'
        );
      }
    }

    data.providerPanelId = providerPanelId;
  }

  if (
    payload.externalReference !== undefined
  ) {
    data.externalReference =
      payload.externalReference || null;
  }

  if (payload.internalCost !== undefined) {
    data.internalCost = normalizeMoney(
      payload.internalCost,
      'El costo interno'
    );
  }

  if (payload.salePrice !== undefined) {
    data.salePrice = normalizeMoney(
      payload.salePrice,
      'El precio de venta',
      {
        allowNull: true
      }
    );
  }

  if (payload.notes !== undefined) {
    data.notes = payload.notes || null;
  }

  if (
    payload.expirationDate !== undefined
  ) {
    data.expirationDate =
      payload.expirationDate
        ? normalizeDate(
            payload.expirationDate
          )
        : null;
  }

  if (payload.passwordMode !== undefined) {
    data.passwordMode = String(
      payload.passwordMode
    ).toUpperCase();
  }

  if (
    payload.accountPassword !== undefined
  ) {
    const password = String(
      payload.accountPassword || ''
    );

    data.passwordEncrypted = password
      ? encryptSecret(password)
      : null;
  }

  if (payload.accountEmail !== undefined) {
    const accountEmail = cleanText(
      payload.accountEmail
    );

    data.loginEmailEncrypted = accountEmail
      ? encryptSecret(accountEmail)
      : null;

    data.loginEmailMasked = accountEmail
      ? maskEmail(accountEmail)
      : null;

    data.loginEmailHash = accountEmail
      ? createHash(accountEmail)
      : null;
  }

  if (payload.status !== undefined) {
    const status = validateStatus(
      payload.status
    );

    data.status = status;

    if (
      status === 'SOLD' &&
      !existing.soldAt
    ) {
      data.soldAt = new Date();
    }

    if (
      status !== 'SOLD' &&
      existing.status === 'SOLD'
    ) {
      data.soldAt = null;
    }

    if (status === 'REMOVED') {
      data.removedAt =
        existing.removedAt || new Date();
    }
  }

  await prisma.inventoryItem.update({
    where: {
      id
    },
    data
  });

  return getInventoryItem(id);
}

// ============================================================
// MOSTRAR CREDENCIALES AL ADMINISTRADOR
// ============================================================

async function getInventoryCredentials(id) {
  if (!id) {
    throw createError(
      400,
      'El ID del artículo es obligatorio'
    );
  }

  const item =
    await prisma.inventoryItem.findUnique({
      where: {
        id
      },

      select: {
        id: true,
        loginEmailEncrypted: true,
        loginEmailMasked: true,
        passwordEncrypted: true,

        InventoryAlias: {
          where: {
            active: true
          },

          include: {
            EmailAlias: true
          },

          take: 1
        }
      }
    });

  if (!item) {
    throw createError(
      404,
      'Artículo de inventario no encontrado'
    );
  }

  const linkedAlias =
    item.InventoryAlias?.[0]
      ?.EmailAlias || null;

  return {
    id: item.id,

    email:
      linkedAlias?.fullAddress ||
      decryptSecret(
        item.loginEmailEncrypted
      ) ||
      item.loginEmailMasked ||
      null,

    password:
      decryptSecret(
        item.passwordEncrypted
      ) || null,

    emailAliasId:
      linkedAlias?.id || null
  };
}

// ============================================================
// MARCAR COMO REMOVIDO
// ============================================================

async function removeInventoryItem(
  id,
  payload = {}
) {
  const existing =
    await prisma.inventoryItem.findUnique({
      where: {
        id
      }
    });

  if (!existing) {
    throw createError(
      404,
      'Artículo de inventario no encontrado'
    );
  }

  if (existing.saleItemId) {
    throw createError(
      409,
      'No puedes remover un artículo que ya fue vendido'
    );
  }

  await prisma.inventoryItem.update({
    where: {
      id
    },

    data: {
      status: 'REMOVED',

      removalReason:
        payload.removalReason ||
        payload.reason ||
        'Eliminado manualmente',

      removedAt: new Date()
    }
  });

  return getInventoryItem(id);
}

// ============================================================
// ESTADÍSTICAS
// ============================================================

async function getInventoryStats() {
  const [
    total,
    available,
    reserved,
    sold,
    blocked,
    expired,
    maintenance,
    removed
  ] = await Promise.all([
    prisma.inventoryItem.count(),

    prisma.inventoryItem.count({
      where: {
        status: 'AVAILABLE'
      }
    }),

    prisma.inventoryItem.count({
      where: {
        status: 'RESERVED'
      }
    }),

    prisma.inventoryItem.count({
      where: {
        status: 'SOLD'
      }
    }),

    prisma.inventoryItem.count({
      where: {
        status: 'BLOCKED'
      }
    }),

    prisma.inventoryItem.count({
      where: {
        status: 'EXPIRED'
      }
    }),

    prisma.inventoryItem.count({
      where: {
        status: 'MAINTENANCE'
      }
    }),

    prisma.inventoryItem.count({
      where: {
        status: 'REMOVED'
      }
    })
  ]);

  return {
    total,
    available,
    reserved,
    sold,
    blocked,
    expired,
    maintenance,
    removed
  };
}

// ============================================================
// EXPORTAR
// ============================================================

module.exports = {
  listInventory,
  getInventoryItem,
  createInventoryItem,
  updateInventoryItem,
  getInventoryCredentials,
  removeInventoryItem,
  getInventoryStats
};