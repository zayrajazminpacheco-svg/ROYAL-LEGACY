const crypto = require('crypto');
const prisma = require('../lib/prisma');

const {
  decryptSecret
} = require('./secretService');

const {
  ensureSaleAliasAccess
} = require('./mailboxAccessService');

const PURCHASE_RETRY_LIMIT = 4;

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

function amountToCents(value) {
  const amount =
    Number(value);

  if (!Number.isFinite(amount)) {
    throw createError(
      409,
      'Uno de los importes no es válido'
    );
  }

  return Math.round(
    amount * 100
  );
}

function centsToAmount(cents) {
  return (
    cents / 100
  ).toFixed(2);
}

function formatMoney(cents) {
  return Number(
    centsToAmount(cents)
  ).toLocaleString(
    'es-MX',
    {
      style: 'currency',
      currency: 'MXN'
    }
  );
}

function getWarrantyEndDate(
  now,
  durationDays,
  inventoryExpirationDate
) {
  const days =
    Math.max(
      Number.parseInt(
        durationDays || '0',
        10
      ) || 0,
      0
    );

  const planEnd =
    days > 0
      ? new Date(
          now.getTime() +
          days * 24 * 60 * 60 * 1000
        )
      : null;

  const inventoryEnd =
    inventoryExpirationDate
      ? new Date(
          inventoryExpirationDate
        )
      : null;

  if (
    planEnd &&
    inventoryEnd
  ) {
    return planEnd < inventoryEnd
      ? planEnd
      : inventoryEnd;
  }

  return (
    planEnd ||
    inventoryEnd ||
    null
  );
}

function isPurchaseConflict(error) {
  return (
    error?.code === 'P2034' ||
    error?.code ===
      'INVENTORY_RACE'
  );
}

async function runPurchaseTransaction(
  callback
) {
  let lastError;

  for (
    let attempt = 1;
    attempt <=
      PURCHASE_RETRY_LIMIT;
    attempt += 1
  ) {
    try {
      return await prisma.$transaction(
        callback,
        {
          isolationLevel:
            'Serializable',
          maxWait:
            10000,
          timeout:
            30000
        }
      );
    } catch (error) {
      lastError = error;

      if (
        !isPurchaseConflict(
          error
        ) ||
        attempt ===
          PURCHASE_RETRY_LIMIT
      ) {
        throw error;
      }
    }
  }

  throw lastError;
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
// CLIENTE: OBTENER CREDENCIALES DE MI PEDIDO
// ============================================================

async function getMySaleDelivery(
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

      include: {
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
            },

            InventoryItem: {
              include: {
                InventoryAlias: {
                  where: {
                    active: true
                  },
                  include: {
                    EmailAlias: {
                      select: {
                        id: true,
                        fullAddress: true,
                        accessPasswordHash: true,
                        accessPasswordEncrypted: true
                      }
                    }
                  },
                  orderBy: {
                    assignedAt:
                      'desc'
                  },
                  take: 1
                }
              }
            }
          },
          orderBy: {
            createdAt:
              'asc'
          }
        }
      }
    });

  if (!sale) {
    throw createError(
      404,
      'Pedido no encontrado'
    );
  }

  if (
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
    throw createError(
      409,
      'Las credenciales estarán disponibles cuando el pedido esté pagado'
    );
  }

  const items =
    (
      await Promise.all(
        sale.items
          .map(async item => {
        const inventory =
          item.InventoryItem;

        if (!inventory) {
          return null;
        }

        const linkedAlias =
          inventory
            .InventoryAlias?.[0]
            ?.EmailAlias ||
          null;

        const linkedEmail =
          linkedAlias
            ?.fullAddress ||
          null;

        const mailboxAccess =
          linkedAlias
            ? await ensureSaleAliasAccess(
                linkedAlias.id,
                sale.id,
                sale.deliveredAt ||
                  sale.paidAt ||
                  sale.createdAt
              )
            : null;

        return {
          saleItemId:
            item.id,
          inventoryItemId:
            inventory.id,
          product:
            item.ProductVariant
              ?.product ||
            null,
          variant: {
            id:
              item.ProductVariant
                ?.id,
            publicName:
              item.ProductVariant
                ?.publicName,
            accessType:
              item.ProductVariant
                ?.accessType
          },
          email:
            linkedEmail ||
            decryptSecret(
              inventory
                .loginEmailEncrypted
            ) ||
            inventory
              .loginEmailMasked ||
            null,
          password:
            decryptSecret(
              inventory
                .passwordEncrypted
            ),
          passwordMode:
            inventory.passwordMode,
          mailboxAccess:
            mailboxAccess
              ? {
                  email:
                    linkedEmail,
                  password:
                    mailboxAccess.password,
                  url:
                    mailboxAccess.mailboxUrl
                }
              : null,
          profileName:
            decryptSecret(
              inventory
                .profileNameEncrypted
            ),
          profilePin:
            decryptSecret(
              inventory
                .profilePinEncrypted
            ),
          expirationDate:
            item.expirationDate ||
            inventory.expirationDate ||
            null,
          warrantyEndDate:
            item.warrantyEndDate ||
            null
        };
          })
      )
    )
      .filter(Boolean);

  return {
    saleId:
      sale.id,
    status:
      sale.status,
    paymentStatus:
      sale.paymentStatus,
    deliveredAt:
      sale.deliveredAt,
    items
  };
}

// ============================================================
// CLIENTE: COMPRAR CON SALDO Y RECIBIR AUTOMÁTICAMENTE
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

    const requestedQuantity =
      Number.parseInt(
        rawItem.quantity ||
        '1',
        10
      );

    const quantity =
      Number.isInteger(
        requestedQuantity
      )
        ? Math.min(
            Math.max(
              requestedQuantity,
              1
            ),
            10
          )
        : 1;

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

  const purchase =
    await runPurchaseTransaction(
      async tx => {
        const now =
          new Date();

        const client =
          await tx.user.findUnique({
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

        const preparedItems = [];
        let totalCents = 0;

        for (
          const [
            productVariantId,
            quantity
          ]
          of quantities.entries()
        ) {
          const variant =
            await tx
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
            variant.active ===
              false ||
            variant.product
              ?.active ===
              false
          ) {
            throw createError(
              404,
              'Uno de los planes ya no está disponible'
            );
          }

          const unitPriceCents =
            amountToCents(
              variant.publicPrice
            );

          if (
            unitPriceCents < 0
          ) {
            throw createError(
              409,
              'El precio del plan no es válido'
            );
          }

          totalCents +=
            unitPriceCents *
            quantity;

          preparedItems.push({
            variant,
            quantity,
            unitPriceCents
          });
        }

        const wallet =
          await tx.wallet.upsert({
            where: {
              userId:
                client.id
            },
            update: {},
            create: {
              id:
                crypto.randomUUID(),
              userId:
                client.id,
              balance:
                '0.00',
              reservedBalance:
                '0.00',
              currency:
                'MXN',
              status:
                'ACTIVE',
              createdAt:
                now,
              updatedAt:
                now
            }
          });

        if (
          wallet.status !==
          'ACTIVE'
        ) {
          throw createError(
            403,
            'Tu saldo no está habilitado para comprar'
          );
        }

        const availableCents =
          amountToCents(
            wallet.balance
          ) -
          amountToCents(
            wallet.reservedBalance
          );

        if (
          availableCents <
          totalCents
        ) {
          throw createError(
            409,
            `Saldo insuficiente. Tienes ${formatMoney(availableCents)} y el pedido cuesta ${formatMoney(totalCents)}.`
          );
        }

        const totalAmount =
          centsToAmount(
            totalCents
          );

        const debited =
          await tx.$executeRaw`
            UPDATE "Wallet"
            SET
              "balance" = "balance" - CAST(${totalAmount} AS DECIMAL),
              "updatedAt" = ${now}
            WHERE
              "id" = ${wallet.id}
              AND "status" = 'ACTIVE'
              AND (
                "balance" -
                "reservedBalance"
              ) >= CAST(${totalAmount} AS DECIMAL)
          `;

        if (
          Number(debited) !== 1
        ) {
          const currentWallet =
            await tx.wallet.findUnique({
              where: {
                id:
                  wallet.id
              }
            });

          const currentAvailable =
            amountToCents(
              currentWallet
                ?.balance ||
              0
            ) -
            amountToCents(
              currentWallet
                ?.reservedBalance ||
              0
            );

          throw createError(
            409,
            `Saldo insuficiente. Tienes ${formatMoney(currentAvailable)} y el pedido cuesta ${formatMoney(totalCents)}.`
          );
        }

        const sale =
          await tx.sale.create({
            data: {
              clientId:
                client.id,
              walletId:
                wallet.id,
              status:
                'DELIVERED',
              channel:
                'WEB',
              paymentMethod:
                'WALLET',
              paymentStatus:
                'PAID',
              subtotal:
                totalAmount,
              total:
                totalAmount,
              internalCost:
                '0.00',
              profit:
                totalAmount,
              paymentReference:
                null,
              customerName:
                client.name,
              customerEmail:
                client.email,
              customerPhone:
                client.phone ||
                null,
              paidAt:
                now,
              deliveredAt:
                now
            }
          });

        let internalCostCents = 0;
        const assignedInventoryIds = [];

        for (
          const prepared
          of preparedItems
        ) {
          for (
            let unit = 0;
            unit <
              prepared.quantity;
            unit += 1
          ) {
            const inventory =
              await tx
                .inventoryItem
                .findFirst({
                  where: {
                    productVariantId:
                      prepared.variant.id,
                    status:
                      'AVAILABLE',
                    saleItemId:
                      null,
                    OR: [
                      {
                        expirationDate:
                          null
                      },
                      {
                        expirationDate: {
                          gt: now
                        }
                      }
                    ]
                  },
                  orderBy: [
                    {
                      acquiredAt:
                        'asc'
                    },
                    {
                      id:
                        'asc'
                    }
                  ]
                });

            if (!inventory) {
              throw createError(
                409,
                `No hay stock suficiente para ${prepared.variant.product?.name || 'el producto'} - ${prepared.variant.publicName}`
              );
            }

            const itemCostCents =
              amountToCents(
                inventory.internalCost ||
                0
              );

            const saleItem =
              await tx.saleItem.create({
                data: {
                  saleId:
                    sale.id,
                  productVariantId:
                    prepared.variant.id,
                  providerId:
                    inventory.providerId ||
                    null,
                  quantity: 1,
                  unitPrice:
                    centsToAmount(
                      prepared
                        .unitPriceCents
                    ),
                  internalCost:
                    centsToAmount(
                      itemCostCents
                    ),
                  expirationDate:
                    inventory
                      .expirationDate ||
                    null,
                  warrantyEndDate:
                    getWarrantyEndDate(
                      now,
                      prepared.variant
                        .durationDays,
                      inventory
                        .expirationDate
                    ),
                  updatedAt:
                    now
                }
              });

            const claimed =
              await tx
                .inventoryItem
                .updateMany({
                  where: {
                    id:
                      inventory.id,
                    productVariantId:
                      prepared.variant.id,
                    status:
                      'AVAILABLE',
                    saleItemId:
                      null,
                    OR: [
                      {
                        expirationDate:
                          null
                      },
                      {
                        expirationDate: {
                          gt: now
                        }
                      }
                    ]
                  },
                  data: {
                    saleItemId:
                      saleItem.id,
                    status:
                      'SOLD',
                    soldAt:
                      now
                  }
                });

            if (
              claimed.count !== 1
            ) {
              const conflict =
                createError(
                  409,
                  'El stock cambió durante la compra. Intenta nuevamente.'
                );

              conflict.code =
                'INVENTORY_RACE';

              throw conflict;
            }

            internalCostCents +=
              itemCostCents;

            assignedInventoryIds.push(
              inventory.id
            );
          }
        }

        const paymentReference =
          `WALLET-${sale.id}`;

        await tx.sale.update({
          where: {
            id:
              sale.id
          },
          data: {
            internalCost:
              centsToAmount(
                internalCostCents
              ),
            profit:
              centsToAmount(
                totalCents -
                internalCostCents
              ),
            paymentReference
          }
        });

        const walletAfter =
          await tx.wallet.findUnique({
            where: {
              id:
                wallet.id
            }
          });

        await tx.walletTransaction.create({
          data: {
            id:
              crypto.randomUUID(),
            walletId:
              wallet.id,
            actorUserId:
              client.id,
            type:
              'PURCHASE',
            status:
              'COMPLETED',
            amount:
              centsToAmount(
                -totalCents
              ),
            balanceBefore:
              centsToAmount(
                amountToCents(
                  wallet.balance
                )
              ),
            balanceAfter:
              centsToAmount(
                amountToCents(
                  walletAfter
                    ?.balance ||
                  0
                )
              ),
            reference:
              paymentReference,
            concept:
              'Compra en Legacy Royal',
            metadata: {
              itemCount:
                assignedInventoryIds
                  .length
            },
            saleId:
              sale.id,
            createdAt:
              now
          }
        });

        await tx.delivery.create({
          data: {
            id:
              crypto.randomUUID(),
            saleId:
              sale.id,
            status:
              'DELIVERED',
            method:
              'PANEL',
            recipientName:
              client.name,
            recipientEmail:
              client.email,
            recipientPhone:
              client.phone ||
              null,
            deliveryText:
              'Credenciales disponibles en el panel del cliente',
            deliveryData: {
              inventoryItemIds:
                assignedInventoryIds
            },
            attempts: 1,
            deliveredAt:
              now,
            createdAt:
              now,
            updatedAt:
              now
          }
        });

        return {
          saleId:
            sale.id,
          balanceAfter:
            Number(
              walletAfter
                ?.balance ||
              0
            )
        };
      }
    );

  const [
    sale,
    delivery
  ] =
    await Promise.all([
      getMySale(
        purchase.saleId,
        userId
      ),
      getMySaleDelivery(
        purchase.saleId,
        userId
      )
    ]);

  return {
    ...sale,
    walletBalance:
      purchase.balanceAfter,
    delivery
  };
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
  getMySaleDelivery,
  createClientSale,
  createSale,
  updateSale,
  deleteSale
};
