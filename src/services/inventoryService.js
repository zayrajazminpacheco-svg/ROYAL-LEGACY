const prisma = require('../lib/prisma');

function createError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function normalizeStatus(value) {
  if (!value) {
    return null;
  }

  return String(value)
    .trim()
    .toUpperCase();
}

function normalizeDate(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw createError(
      400,
      `Fecha inválida: ${value}`
    );
  }

  return date;
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
    where.status =
      normalizeStatus(query.status);
  }

  if (query.productVariantId) {
    where.productVariantId =
      String(
        query.productVariantId
      ).trim();
  }

  if (query.providerId) {
    where.providerId =
      String(
        query.providerId
      ).trim();
  }

  if (query.providerPanelId) {
    where.providerPanelId =
      String(
        query.providerPanelId
      ).trim();
  }

  if (query.saleItemId) {
    where.saleItemId =
      String(
        query.saleItemId
      ).trim();
  }

  const [items, total] =
    await Promise.all([
      prisma.inventoryItem.findMany({
        where,

        include: {
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

          InventoryAlias: {
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
          },

          CodeRequest: {
            orderBy: {
              requestedAt: 'desc'
            },

            take: 5
          },

          OutletOffer: true
        },

        orderBy: [
          {
            createdAt: 'desc'
          }
        ],

        skip:
          (page - 1) *
          pageSize,

        take:
          pageSize
      }),

      prisma.inventoryItem.count({
        where
      })
    ]);

  return {
    items,
    total,
    page,
    pageSize,

    totalPages:
      total === 0
        ? 0
        : Math.ceil(
            total / pageSize
          )
  };
}

// ============================================================
// OBTENER INVENTARIO POR ID
// ============================================================

async function getInventoryItem(id) {
  if (!id) {
    throw createError(
      400,
      'Inventory item id is required'
    );
  }

  const item =
    await prisma.inventoryItem.findUnique({
      where: {
        id
      },

      include: {
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

        InventoryAlias: {
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
          }
        },

        OutletOffer: true
      }
    });

  if (!item) {
    throw createError(
      404,
      'Inventory item not found'
    );
  }

  return item;
}

// ============================================================
// CREAR INVENTARIO
// ============================================================

async function createInventoryItem(
  payload = {}
) {
  const productVariantId =
    String(
      payload.productVariantId ||
      ''
    ).trim();

  if (!productVariantId) {
    throw createError(
      400,
      'productVariantId is required'
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
      'Product variant not found'
    );
  }

  if (!variant.active) {
    throw createError(
      409,
      'Product variant is inactive'
    );
  }

  const providerId =
    payload.providerId
      ? String(
          payload.providerId
        ).trim()
      : null;

  const providerPanelId =
    payload.providerPanelId
      ? String(
          payload.providerPanelId
        ).trim()
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
        'Provider not found'
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
        'Provider panel not found'
      );
    }
  }

  const status =
    payload.status
      ? normalizeStatus(
          payload.status
        )
      : 'AVAILABLE';

  const allowedStatuses = [
    'AVAILABLE',
    'RESERVED',
    'SOLD',
    'BLOCKED',
    'EXPIRED',
    'MAINTENANCE',
    'REMOVED'
  ];

  if (
    !allowedStatuses.includes(
      status
    )
  ) {
    throw createError(
      400,
      `Invalid inventory status: ${status}`
    );
  }

  const created =
    await prisma.inventoryItem.create({
      data: {
        productVariantId,

        providerId,

        providerPanelId,

        loginEmailEncrypted:
          payload.loginEmailEncrypted ||
          null,

        loginEmailMasked:
          payload.loginEmailMasked ||
          null,

        loginEmailHash:
          payload.loginEmailHash ||
          null,

        passwordEncrypted:
          payload.passwordEncrypted ||
          null,

        passwordMode:
          payload.passwordMode
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
          payload.externalReference ||
          null,

        notes:
          payload.notes ||
          null,

        status,

        acquiredAt:
          payload.acquiredAt
            ? normalizeDate(
                payload.acquiredAt
              )
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

  return getInventoryItem(
    created.id
  );
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
      'Inventory item not found'
    );
  }

  const data = {};

  if (
    payload.productVariantId !==
    undefined
  ) {
    const productVariantId =
      String(
        payload.productVariantId ||
        ''
      ).trim();

    if (!productVariantId) {
      throw createError(
        400,
        'productVariantId cannot be empty'
      );
    }

    const variant =
      await prisma.productVariant.findUnique({
        where: {
          id:
            productVariantId
        }
      });

    if (!variant) {
      throw createError(
        404,
        'Product variant not found'
      );
    }

    data.productVariantId =
      productVariantId;
  }

  if (
    payload.providerId !==
    undefined
  ) {
    data.providerId =
      payload.providerId
        ? String(
            payload.providerId
          ).trim()
        : null;
  }

  if (
    payload.providerPanelId !==
    undefined
  ) {
    data.providerPanelId =
      payload.providerPanelId
        ? String(
            payload.providerPanelId
          ).trim()
        : null;
  }

  if (
    payload.externalReference !==
    undefined
  ) {
    data.externalReference =
      payload.externalReference ||
      null;
  }

  if (
    payload.notes !==
    undefined
  ) {
    data.notes =
      payload.notes ||
      null;
  }

  if (
    payload.expirationDate !==
    undefined
  ) {
    data.expirationDate =
      payload.expirationDate
        ? normalizeDate(
            payload.expirationDate
          )
        : null;
  }

  if (
    payload.passwordMode !==
    undefined
  ) {
    data.passwordMode =
      String(
        payload.passwordMode
      ).toUpperCase();
  }

  if (
    payload.status !==
    undefined
  ) {
    const status =
      normalizeStatus(
        payload.status
      );

    const allowedStatuses = [
      'AVAILABLE',
      'RESERVED',
      'SOLD',
      'BLOCKED',
      'EXPIRED',
      'MAINTENANCE',
      'REMOVED'
    ];

    if (
      !allowedStatuses.includes(
        status
      )
    ) {
      throw createError(
        400,
        `Invalid inventory status: ${status}`
      );
    }

    data.status =
      status;

    if (
      status === 'SOLD' &&
      !existing.soldAt
    ) {
      data.soldAt =
        new Date();
    }

    if (
      status !== 'SOLD' &&
      existing.status === 'SOLD'
    ) {
      data.soldAt =
        null;
    }

    if (
      status === 'REMOVED'
    ) {
      data.removedAt =
        existing.removedAt ||
        new Date();
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
      'Inventory item not found'
    );
  }

  if (existing.saleItemId) {
    throw createError(
      409,
      'Sold inventory cannot be removed'
    );
  }

  await prisma.inventoryItem.update({
    where: {
      id
    },

    data: {
      status:
        'REMOVED',

      removalReason:
        payload.removalReason ||
        payload.reason ||
        'Removed manually',

      removedAt:
        new Date()
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
  ] =
    await Promise.all([
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
          status:
            'MAINTENANCE'
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
  removeInventoryItem,
  getInventoryStats
};