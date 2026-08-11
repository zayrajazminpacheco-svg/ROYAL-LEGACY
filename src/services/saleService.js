const prisma = require('../lib/prisma');

function createError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function toNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

// ============================================================
// LISTAR VENTAS
// ============================================================

async function listSales(query = {}) {
  const page = Math.max(
    Number.parseInt(query.page || '1', 10),
    1
  );

  const pageSize = Math.min(
    Math.max(
      Number.parseInt(query.pageSize || '20', 10),
      1
    ),
    100
  );

  const where = {};

  if (query.status) {
    where.status = String(query.status).toUpperCase();
  }

  if (query.clientId) {
    where.clientId = String(query.clientId);
  }

  if (query.employeeId) {
    where.employeeId = String(query.employeeId);
  }

  if (query.paymentStatus) {
    where.paymentStatus =
      String(query.paymentStatus).toUpperCase();
  }

  if (query.channel) {
    where.channel =
      String(query.channel).toUpperCase();
  }

  const [items, total] = await Promise.all([
    prisma.sale.findMany({
      where,

      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        },

        User_Sale_employeeIdToUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },

        items: {
          include: {
            ProductVariant: {
              include: {
                product: true
              }
            },

            Provider: true,

            InventoryItem: true
          },

          orderBy: {
            createdAt: 'asc'
          }
        }
      },

      orderBy: {
        createdAt: 'desc'
      },

      skip: (page - 1) * pageSize,

      take: pageSize
    }),

    prisma.sale.count({
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
        : Math.ceil(total / pageSize)
  };
}

// ============================================================
// OBTENER UNA VENTA
// ============================================================

async function getSale(id) {
  if (!id) {
    throw createError(
      400,
      'Sale id is required'
    );
  }

  const sale =
    await prisma.sale.findUnique({
      where: {
        id
      },

      include: {
        client: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true
          }
        },

        User_Sale_employeeIdToUser: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },

        items: {
          include: {
            ProductVariant: {
              include: {
                product: true
              }
            },

            Provider: true,

            InventoryItem: true,

            ProviderOrder: true
          },

          orderBy: {
            createdAt: 'asc'
          }
        },

        Delivery: true,

        PurchaseSheet: true,

        ProviderOrder: true,

        WalletTransaction: true
      }
    });

  if (!sale) {
    throw createError(
      404,
      'Sale not found'
    );
  }

  return sale;
}

// ============================================================
// CREAR VENTA
// ============================================================

async function createSale(payload = {}) {
  const clientId = payload.clientId;

  if (!clientId) {
    throw createError(
      400,
      'clientId is required'
    );
  }

  const client =
    await prisma.user.findUnique({
      where: {
        id: clientId
      }
    });

  if (!client) {
    throw createError(
      404,
      'Client not found'
    );
  }

  if (client.status === 'BLOCKED') {
    throw createError(
      409,
      'Client is blocked'
    );
  }

  const rawItems =
    Array.isArray(payload.items)
      ? payload.items
      : [];

  let calculatedSubtotal = 0;
  let calculatedInternalCost = 0;

  for (const item of rawItems) {
    const quantity = Math.max(
      toNumber(item.quantity, 1),
      1
    );

    const unitPrice = toNumber(
      item.unitPrice,
      0
    );

    const internalCost = toNumber(
      item.internalCost ??
        item.unitCost,
      0
    );

    calculatedSubtotal +=
      quantity * unitPrice;

    calculatedInternalCost +=
      quantity * internalCost;
  }

  const subtotal =
    rawItems.length > 0
      ? calculatedSubtotal
      : toNumber(
          payload.subtotal,
          payload.total
        );

  const total = toNumber(
    payload.total,
    subtotal
  );

  const internalCost =
    rawItems.length > 0
      ? calculatedInternalCost
      : toNumber(
          payload.internalCost ??
            payload.costTotal,
          0
        );

  const profit = toNumber(
    payload.profit,
    total - internalCost
  );

  return prisma.$transaction(
    async (tx) => {
      const sale =
        await tx.sale.create({
          data: {
            clientId,

            employeeId:
              payload.employeeId || null,

            walletId:
              payload.walletId || null,

            status:
              payload.status
                ? String(
                    payload.status
                  ).toUpperCase()
                : 'PENDING',

            channel:
              payload.channel
                ? String(
                    payload.channel
                  ).toUpperCase()
                : 'WEB',

            paymentMethod:
              payload.paymentMethod
                ? String(
                    payload.paymentMethod
                  ).toUpperCase()
                : null,

            paymentStatus:
              payload.paymentStatus
                ? String(
                    payload.paymentStatus
                  ).toUpperCase()
                : 'PENDING',

            subtotal,
            total,
            internalCost,
            profit,

            paymentReference:
              payload.paymentReference ||
              null,

            customerName:
              payload.customerName ||
              null,

            customerEmail:
              payload.customerEmail ||
              null,

            customerPhone:
              payload.customerPhone ||
              null,

            paidAt:
              payload.paidAt
                ? new Date(
                    payload.paidAt
                  )
                : null,

            deliveredAt:
              payload.deliveredAt
                ? new Date(
                    payload.deliveredAt
                  )
                : null
          }
        });

      const createdItems = [];

      for (const item of rawItems) {
        if (!item.productVariantId) {
          throw createError(
            400,
            'productVariantId is required for every sale item'
          );
        }

        const variant =
          await tx.productVariant.findUnique({
            where: {
              id: item.productVariantId
            }
          });

        if (!variant) {
          throw createError(
            404,
            `Product variant not found: ${item.productVariantId}`
          );
        }

        const quantity = Math.max(
          toNumber(item.quantity, 1),
          1
        );

        const unitPrice = toNumber(
          item.unitPrice,
          variant.publicPrice
        );

        const itemInternalCost =
          toNumber(
            item.internalCost ??
              item.unitCost,
            0
          );

        const saleItem =
          await tx.saleItem.create({
            data: {
              saleId: sale.id,

              productVariantId:
                item.productVariantId,

              providerId:
                item.providerId ||
                null,

              quantity,

              unitPrice,

              internalCost:
                itemInternalCost,

              expirationDate:
                item.expirationDate
                  ? new Date(
                      item.expirationDate
                    )
                  : null,

              warrantyEndDate:
                item.warrantyEndDate
                  ? new Date(
                      item.warrantyEndDate
                    )
                  : null,

              updatedAt: new Date()
            }
          });

        createdItems.push(
          saleItem
        );
      }

      return {
        ...sale,
        items: createdItems
      };
    }
  );
}

// ============================================================
// ACTUALIZAR VENTA
// ============================================================

async function updateSale(
  id,
  payload = {}
) {
  if (!id) {
    throw createError(
      400,
      'Sale id is required'
    );
  }

  const existing =
    await prisma.sale.findUnique({
      where: {
        id
      }
    });

  if (!existing) {
    throw createError(
      404,
      'Sale not found'
    );
  }

  const data = {};

  if (payload.employeeId !== undefined) {
    data.employeeId =
      payload.employeeId || null;
  }

  if (payload.walletId !== undefined) {
    data.walletId =
      payload.walletId || null;
  }

  if (payload.status !== undefined) {
    data.status =
      String(
        payload.status
      ).toUpperCase();
  }

  if (payload.channel !== undefined) {
    data.channel =
      String(
        payload.channel
      ).toUpperCase();
  }

  if (payload.paymentMethod !== undefined) {
    data.paymentMethod =
      payload.paymentMethod
        ? String(
            payload.paymentMethod
          ).toUpperCase()
        : null;
  }

  if (payload.paymentStatus !== undefined) {
    data.paymentStatus =
      String(
        payload.paymentStatus
      ).toUpperCase();
  }

  if (payload.subtotal !== undefined) {
    data.subtotal =
      toNumber(payload.subtotal);
  }

  if (payload.total !== undefined) {
    data.total =
      toNumber(payload.total);
  }

  if (
    payload.internalCost !== undefined ||
    payload.costTotal !== undefined
  ) {
    data.internalCost =
      toNumber(
        payload.internalCost ??
          payload.costTotal
      );
  }

  if (payload.profit !== undefined) {
    data.profit =
      toNumber(payload.profit);
  }

  if (
    payload.paymentReference !==
    undefined
  ) {
    data.paymentReference =
      payload.paymentReference ||
      null;
  }

  if (payload.customerName !== undefined) {
    data.customerName =
      payload.customerName ||
      null;
  }

  if (payload.customerEmail !== undefined) {
    data.customerEmail =
      payload.customerEmail ||
      null;
  }

  if (payload.customerPhone !== undefined) {
    data.customerPhone =
      payload.customerPhone ||
      null;
  }

  if (payload.paidAt !== undefined) {
    data.paidAt =
      payload.paidAt
        ? new Date(
            payload.paidAt
          )
        : null;
  }

  if (payload.deliveredAt !== undefined) {
    data.deliveredAt =
      payload.deliveredAt
        ? new Date(
            payload.deliveredAt
          )
        : null;
  }

  const updated =
    await prisma.sale.update({
      where: {
        id
      },

      data
    });

  return getSale(updated.id);
}

// ============================================================
// ELIMINAR VENTA
// ============================================================

async function deleteSale(id) {
  if (!id) {
    throw createError(
      400,
      'Sale id is required'
    );
  }

  const existing =
    await prisma.sale.findUnique({
      where: {
        id
      }
    });

  if (!existing) {
    throw createError(
      404,
      'Sale not found'
    );
  }

  await prisma.sale.delete({
    where: {
      id
    }
  });

  return {
    deleted: true,
    id
  };
}

// ============================================================
// EXPORTAR
// ============================================================

module.exports = {
  listSales,
  getSale,
  createSale,
  updateSale,
  deleteSale
};