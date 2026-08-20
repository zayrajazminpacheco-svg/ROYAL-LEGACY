const prisma = require('../lib/prisma');

function createError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function toNumber(value, fallback = 0) {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : fallback;
}

function normalizePagination(query = {}) {
  const page = Math.max(
    Number.parseInt(
      query.page || '1',
      10
    ),
    1
  );

  const pageSize = Math.min(
    Math.max(
      Number.parseInt(
        query.pageSize || '20',
        10
      ),
      1
    ),
    100
  );

  return {
    page,
    pageSize
  };
}

// ============================================================
// RELACIONES PARA ADMINISTRADORES
// ============================================================

function getAdminSaleInclude() {
  return {
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
  };
}

// ============================================================
// RELACIONES SEGURAS PARA CLIENTES
// ============================================================

function getClientSaleInclude() {
  return {
    items: {
      include: {
        ProductVariant: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true
              }
            }
          }
        }
      },

      orderBy: {
        createdAt: 'asc'
      }
    }
  };
}

// ============================================================
// ADMINISTRACIÓN: LISTAR VENTAS
// ============================================================

async function listSales(query = {}) {
  const {
    page,
    pageSize
  } = normalizePagination(query);

  const where = {};

  if (query.status) {
    where.status =
      String(
        query.status
      ).toUpperCase();
  }

  if (query.clientId) {
    where.clientId =
      String(
        query.clientId
      );
  }

  if (query.employeeId) {
    where.employeeId =
      String(
        query.employeeId
      );
  }

  if (query.paymentStatus) {
    where.paymentStatus =
      String(
        query.paymentStatus
      ).toUpperCase();
  }

  if (query.channel) {
    where.channel =
      String(
        query.channel
      ).toUpperCase();
  }

  const [
    items,
    total
  ] = await Promise.all([
    prisma.sale.findMany({
      where,

      include:
        getAdminSaleInclude(),

      orderBy: {
        createdAt: 'desc'
      },

      skip:
        (page - 1) *
        pageSize,

      take:
        pageSize
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
        : Math.ceil(
            total / pageSize
          )
  };
}

// ============================================================
// ADMINISTRACIÓN: OBTENER UNA VENTA
// ============================================================

async function getSale(id) {
  if (!id) {
    throw createError(
      400,
      'El ID de la venta es obligatorio'
    );
  }

  const sale =
    await prisma.sale.findUnique({
      where: {
        id
      },

      include:
        getAdminSaleInclude()
    });

  if (!sale) {
    throw createError(
      404,
      'Venta no encontrada'
    );
  }

  return sale;
}

// ============================================================
// CLIENTE: LISTAR MIS COMPRAS
// ============================================================

async function listMySales(
  userId,
  query = {}
) {
  if (!userId) {
    throw createError(
      401,
      'Debes iniciar sesión'
    );
  }

  const {
    page,
    pageSize
  } = normalizePagination(query);

  const where = {
    clientId:
      userId
  };

  if (query.status) {
    where.status =
      String(
        query.status
      ).toUpperCase();
  }

  const [
    items,
    total
  ] = await Promise.all([
    prisma.sale.findMany({
      where,

      include:
        getClientSaleInclude(),

      orderBy: {
        createdAt: 'desc'
      },

      skip:
        (page - 1) *
        pageSize,

      take:
        pageSize
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
        : Math.ceil(
            total / pageSize
          )
  };
}

// ============================================================
// CLIENTE: OBTENER MI PEDIDO
// ============================================================

async function getMySale(
  id,
  userId
) {
  if (!id) {
    throw createError(
      400,
      'El ID del pedido es obligatorio'
    );
  }

  if (!userId) {
    throw createError(
      401,
      'Debes iniciar sesión'
    );
  }

  const sale =
    await prisma.sale.findFirst({
      where: {
        id,
        clientId:
          userId
      },

      include:
        getClientSaleInclude()
    });

  if (!sale) {
    throw createError(
      404,
      'Pedido no encontrado'
    );
  }

  return sale;
}

// ============================================================
// CLIENTE: CREAR PEDIDO SEGURO
// ============================================================

async function createClientSale(
  userId,
  payload = {}
) {
  if (!userId) {
    throw createError(
      401,
      'Debes iniciar sesión para comprar'
    );
  }

  const client =
    await prisma.user.findUnique({
      where: {
        id:
          userId
      },

      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        status: true
      }
    });

  if (!client) {
    throw createError(
      404,
      'Cliente no encontrado'
    );
  }

  if (
    client.status !==
    'ACTIVE'
  ) {
    throw createError(
      403,
      'Tu cuenta no está activa'
    );
  }

  if (
    client.role !==
    'CLIENT'
  ) {
    throw createError(
      403,
      'Esta cuenta no puede realizar compras'
    );
  }

  const rawItems =
    Array.isArray(
      payload.items
    )
      ? payload.items
      : [];

  if (!rawItems.length) {
    throw createError(
      400,
      'El carrito está vacío'
    );
  }

  if (
    rawItems.length >
    20
  ) {
    throw createError(
      400,
      'El carrito contiene demasiados productos'
    );
  }

  const quantities =
    new Map();

  for (
    const rawItem
    of rawItems
  ) {
    const productVariantId =
      String(
        rawItem
          ?.productVariantId ||
        ''
      ).trim();

    if (!productVariantId) {
      throw createError(
        400,
        'Todos los artículos deben incluir un plan'
      );
    }

    const quantity =
      Math.min(
        Math.max(
          Number.parseInt(
            rawItem.quantity ||
            '1',
            10
          ),
          1
        ),
        10
      );

    quantities.set(
      productVariantId,

      Math.min(
        (
          quantities.get(
            productVariantId
          ) ||
          0
        ) +
        quantity,

        10
      )
    );
  }

  const preparedItems = [];

  let subtotal = 0;

  for (
    const [
      productVariantId,
      quantity
    ]
    of quantities.entries()
  ) {
    const variant =
      await prisma
        .productVariant
        .findUnique({
          where: {
            id:
              productVariantId
          },

          include: {
            product: true
          }
        });

    if (
      !variant ||
      variant.active === false ||
      variant.product?.active === false
    ) {
      throw createError(
        404,
        'Uno de los planes ya no está disponible'
      );
    }

    const available =
      await prisma
        .inventoryItem
        .count({
          where: {
            productVariantId,
            status:
              'AVAILABLE'
          }
        });

    if (
      available <
      quantity
    ) {
      throw createError(
        409,

        `No hay stock suficiente para ${
          variant.product
            ?.name ||
          'el producto'
        } - ${
          variant.publicName
        }`
      );
    }

    const unitPrice =
      toNumber(
        variant.publicPrice,
        0
      );

    if (
      unitPrice <
      0
    ) {
      throw createError(
        409,
        'El precio del plan no es válido'
      );
    }

    subtotal +=
      unitPrice *
      quantity;

    preparedItems.push({
      productVariantId,
      quantity,
      unitPrice
    });
  }

  const createdId =
    await prisma.$transaction(
      async tx => {
        const sale =
          await tx.sale.create({
            data: {
              clientId:
                client.id,

              status:
                'PENDING',

              channel:
                'WEB',

              paymentStatus:
                'PENDING',

              subtotal,
              total:
                subtotal,

              internalCost:
                0,

              profit:
                0,

              paymentReference:
                null,

              customerName:
                client.name,

              customerEmail:
                client.email,

              customerPhone:
                client.phone ||
                null
            }
          });

        for (
          const item
          of preparedItems
        ) {
          await tx
            .saleItem
            .create({
              data: {
                saleId:
                  sale.id,

                productVariantId:
                  item.productVariantId,

                quantity:
                  item.quantity,

                unitPrice:
                  item.unitPrice,

                internalCost:
                  0,

                updatedAt:
                  new Date()
              }
            });
        }

        return sale.id;
      }
    );

  return getMySale(
    createdId,
    client.id
  );
}

// ============================================================
// ADMINISTRACIÓN: CREAR VENTA
// ============================================================

async function createSale(
  payload = {}
) {
  const clientId =
    payload.clientId;

  if (!clientId) {
    throw createError(
      400,
      'clientId es obligatorio'
    );
  }

  const client =
    await prisma.user.findUnique({
      where: {
        id:
          clientId
      }
    });

  if (!client) {
    throw createError(
      404,
      'Cliente no encontrado'
    );
  }

  if (
    client.status ===
    'BLOCKED'
  ) {
    throw createError(
      409,
      'El cliente está bloqueado'
    );
  }

  const rawItems =
    Array.isArray(
      payload.items
    )
      ? payload.items
      : [];

  let calculatedSubtotal =
    0;

  let calculatedInternalCost =
    0;

  for (
    const item
    of rawItems
  ) {
    const quantity =
      Math.max(
        toNumber(
          item.quantity,
          1
        ),
        1
      );

    const unitPrice =
      toNumber(
        item.unitPrice,
        0
      );

    const internalCost =
      toNumber(
        item.internalCost ??
        item.unitCost,
        0
      );

    calculatedSubtotal +=
      quantity *
      unitPrice;

    calculatedInternalCost +=
      quantity *
      internalCost;
  }

  const subtotal =
    rawItems.length >
    0
      ? calculatedSubtotal
      : toNumber(
          payload.subtotal,
          payload.total
        );

  const total =
    toNumber(
      payload.total,
      subtotal
    );

  const internalCost =
    rawItems.length >
    0
      ? calculatedInternalCost
      : toNumber(
          payload.internalCost ??
          payload.costTotal,
          0
        );

  const profit =
    toNumber(
      payload.profit,
      total -
      internalCost
    );

  return prisma.$transaction(
    async tx => {
      const sale =
        await tx.sale.create({
          data: {
            clientId,

            employeeId:
              payload.employeeId ||
              null,

            walletId:
              payload.walletId ||
              null,

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
                    payload
                      .paymentMethod
                  ).toUpperCase()
                : null,

            paymentStatus:
              payload.paymentStatus
                ? String(
                    payload
                      .paymentStatus
                  ).toUpperCase()
                : 'PENDING',

            subtotal,
            total,
            internalCost,
            profit,

            paymentReference:
              payload
                .paymentReference ||
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

      for (
        const item
        of rawItems
      ) {
        if (
          !item.productVariantId
        ) {
          throw createError(
            400,
            'Cada artículo debe incluir productVariantId'
          );
        }

        const variant =
          await tx
            .productVariant
            .findUnique({
              where: {
                id:
                  item
                    .productVariantId
              }
            });

        if (!variant) {
          throw createError(
            404,

            `Plan no encontrado: ${
              item
                .productVariantId
            }`
          );
        }

        const quantity =
          Math.max(
            toNumber(
              item.quantity,
              1
            ),
            1
          );

        const unitPrice =
          toNumber(
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
          await tx
            .saleItem
            .create({
              data: {
                saleId:
                  sale.id,

                productVariantId:
                  item
                    .productVariantId,

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
                        item
                          .expirationDate
                      )
                    : null,

                warrantyEndDate:
                  item.warrantyEndDate
                    ? new Date(
                        item
                          .warrantyEndDate
                      )
                    : null,

                updatedAt:
                  new Date()
              }
            });

        createdItems.push(
          saleItem
        );
      }

      return {
        ...sale,
        items:
          createdItems
      };
    }
  );
}

// ============================================================
// ADMINISTRACIÓN: ACTUALIZAR VENTA
// ============================================================

async function updateSale(
  id,
  payload = {}
) {
  if (!id) {
    throw createError(
      400,
      'El ID de la venta es obligatorio'
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
      'Venta no encontrada'
    );
  }

  const data = {};

  if (
    payload.employeeId !==
    undefined
  ) {
    data.employeeId =
      payload.employeeId ||
      null;
  }

  if (
    payload.walletId !==
    undefined
  ) {
    data.walletId =
      payload.walletId ||
      null;
  }

  if (
    payload.status !==
    undefined
  ) {
    data.status =
      String(
        payload.status
      ).toUpperCase();
  }

  if (
    payload.channel !==
    undefined
  ) {
    data.channel =
      String(
        payload.channel
      ).toUpperCase();
  }

  if (
    payload.paymentMethod !==
    undefined
  ) {
    data.paymentMethod =
      payload.paymentMethod
        ? String(
            payload.paymentMethod
          ).toUpperCase()
        : null;
  }

  if (
    payload.paymentStatus !==
    undefined
  ) {
    data.paymentStatus =
      String(
        payload.paymentStatus
      ).toUpperCase();
  }

  if (
    payload.subtotal !==
    undefined
  ) {
    data.subtotal =
      toNumber(
        payload.subtotal
      );
  }

  if (
    payload.total !==
    undefined
  ) {
    data.total =
      toNumber(
        payload.total
      );
  }

  if (
    payload.internalCost !==
      undefined ||
    payload.costTotal !==
      undefined
  ) {
    data.internalCost =
      toNumber(
        payload.internalCost ??
        payload.costTotal
      );
  }

  if (
    payload.profit !==
    undefined
  ) {
    data.profit =
      toNumber(
        payload.profit
      );
  }

  if (
    payload.paymentReference !==
    undefined
  ) {
    data.paymentReference =
      payload
        .paymentReference ||
      null;
  }

  if (
    payload.customerName !==
    undefined
  ) {
    data.customerName =
      payload.customerName ||
      null;
  }

  if (
    payload.customerEmail !==
    undefined
  ) {
    data.customerEmail =
      payload.customerEmail ||
      null;
  }

  if (
    payload.customerPhone !==
    undefined
  ) {
    data.customerPhone =
      payload.customerPhone ||
      null;
  }

  if (
    payload.paidAt !==
    undefined
  ) {
    data.paidAt =
      payload.paidAt
        ? new Date(
            payload.paidAt
          )
        : null;
  }

  if (
    payload.deliveredAt !==
    undefined
  ) {
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

  return getSale(
    updated.id
  );
}

// ============================================================
// ADMINISTRACIÓN: ELIMINAR VENTA
// ============================================================

async function deleteSale(id) {
  if (!id) {
    throw createError(
      400,
      'El ID de la venta es obligatorio'
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
      'Venta no encontrada'
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
  listMySales,
  getMySale,
  createClientSale,
  createSale,
  updateSale,
  deleteSale
};