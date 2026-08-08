const prisma = require('../lib/prisma');

function createError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function normalizeSaleStatus(status) {
  const value = String(status || 'PENDING').toUpperCase();

  const map = {
    PENDING: 'PENDING',
    PAID: 'PAID',
    PROCESSING: 'PROCESSING',
    DELIVERED: 'DELIVERED',
    COMPLETED: 'DELIVERED',
    EXPIRED: 'EXPIRED',
    REFUNDED: 'REFUNDED'
  };

  return map[value] || 'PENDING';
}


// ==========================================
// LISTAR VENTAS
// ==========================================

async function listSales(query = {}) {
  const page = Math.max(
    Number(query.page || 1),
    1
  );

  const pageSize = Math.min(
    Math.max(Number(query.pageSize || 20), 1),
    100
  );

  const where = {};

  if (query.status) {
    where.status = normalizeSaleStatus(
      query.status
    );
  }

  if (query.clientId) {
    where.clientId = query.clientId;
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

        employee: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },

        items: {
          include: {
            productVariant: {
              include: {
                product: true
              }
            },

            provider: true,

            inventoryItem: {
              include: {
                aliases: {
                  where: {
                    active: true
                  },

                  include: {
                    emailAlias: true
                  }
                }
              }
            }
          }
        }
      },

      orderBy: {
        createdAt: 'desc'
      },

      skip:
        (page - 1) * pageSize,

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
    pageSize
  };
}


// ==========================================
// OBTENER UNA VENTA
// ==========================================

async function getSale(id) {
  const sale =
    await prisma.sale.findUnique({
      where: {
        id
      },

      include: {
        client: true,
        employee: true,

        items: {
          include: {
            productVariant: {
              include: {
                product: true
              }
            },

            provider: true,

            inventoryItem: {
              include: {
                aliases: {
                  where: {
                    active: true
                  },

                  include: {
                    emailAlias: {
                      include: {
                        domain: true
                      }
                    }
                  }
                },

                codeRequests: {
                  orderBy: {
                    requestedAt: 'desc'
                  }
                }
              }
            }
          }
        }
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


// ==========================================
// CREAR VENTA + ASIGNAR INVENTARIO
// ==========================================

async function createSale(payload = {}) {
  const clientId =
    payload.clientId ||
    payload.customerId;

  if (!clientId) {
    throw createError(
      400,
      'clientId or customerId is required'
    );
  }

  if (
    !Array.isArray(payload.items) ||
    !payload.items.length
  ) {
    throw createError(
      400,
      'At least one sale item is required'
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


  return prisma.$transaction(async tx => {

    const preparedItems = [];

    let subtotal = 0;
    let internalCostTotal = 0;


    // ======================================
    // PREPARAR CADA PRODUCTO
    // ======================================

    for (const rawItem of payload.items) {

      const productVariantId =
        rawItem.productVariantId ||
        rawItem.variantId;

      if (!productVariantId) {
        throw createError(
          400,
          'Each item requires productVariantId'
        );
      }

      const quantity = Math.max(
        Number(rawItem.quantity || 1),
        1
      );


      const variant =
        await tx.productVariant.findUnique({
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
          `Product variant not found: ${productVariantId}`
        );
      }


      if (!variant.active) {
        throw createError(
          409,
          `${variant.publicName} is inactive`
        );
      }


      // ====================================
      // BUSCAR INVENTARIO DISPONIBLE
      // ====================================

      const inventory =
        await tx.inventoryItem.findMany({
          where: {
            productVariantId,
            status: 'AVAILABLE',
            saleItemId: null
          },

          orderBy: {
            acquiredAt: 'asc'
          },

          take: quantity
        });


      if (inventory.length < quantity) {
        throw createError(
          409,
          `Not enough inventory for ${variant.publicName}. Available: ${inventory.length}`
        );
      }


      const unitPrice =
        Number(
          rawItem.unitPrice ??
          rawItem.price ??
          variant.publicPrice ??
          0
        );


      const requestedInternalCost =
        rawItem.internalCost ??
        rawItem.cost;


      // Creamos un SaleItem individual
      // por cada unidad para poder conectar
      // un InventoryItem concreto.
      for (let index = 0; index < quantity; index++) {

        const inventoryItem =
          inventory[index];


        const internalCost =
          Number(
            requestedInternalCost ??
            0
          );


        subtotal += unitPrice;
        internalCostTotal += internalCost;


        preparedItems.push({
          productVariantId,
          providerId:
            inventoryItem.providerId ||
            rawItem.providerId ||
            null,

          quantity: 1,

          unitPrice,

          internalCost,

          inventoryItemId:
            inventoryItem.id
        });
      }
    }


    const total =
      Number(
        payload.total ??
        subtotal
      );


    const profit =
      total -
      internalCostTotal;


    // ======================================
    // CREAR VENTA
    // ======================================

    const sale =
      await tx.sale.create({
        data: {
          clientId,

          employeeId:
            payload.employeeId ||
            null,

          status:
            normalizeSaleStatus(
              payload.status
            ),

          subtotal,

          total,

          internalCost:
            internalCostTotal,

          profit,

          paymentReference:
            payload.paymentReference ||
            null,


          items: {
            create:
              preparedItems.map(item => ({
                productVariantId:
                  item.productVariantId,

                providerId:
                  item.providerId,

                quantity:
                  item.quantity,

                unitPrice:
                  item.unitPrice,

                internalCost:
                  item.internalCost
              }))
          }
        },

        include: {
          items: true
        }
      });


    // ======================================
    // CONECTAR INVENTARIO A SALEITEM
    // ======================================

    for (
      let index = 0;
      index < sale.items.length;
      index++
    ) {

      const saleItem =
        sale.items[index];

      const prepared =
        preparedItems[index];


      await tx.inventoryItem.update({
        where: {
          id:
            prepared.inventoryItemId
        },

        data: {
          saleItemId:
            saleItem.id,

          status:
            'SOLD',

          soldAt:
            new Date()
        }
      });
    }


    // ======================================
    // DEVOLVER VENTA COMPLETA
    // ======================================

    return tx.sale.findUnique({
      where: {
        id: sale.id
      },

      include: {
        client: true,

        employee: true,

        items: {
          include: {
            productVariant: {
              include: {
                product: true
              }
            },

            provider: true,

            inventoryItem: {
              include: {
                aliases: {
                  where: {
                    active: true
                  },

                  include: {
                    emailAlias: true
                  }
                }
              }
            }
          }
        }
      }
    });

  });
}


// ==========================================
// ACTUALIZAR VENTA
// ==========================================

async function updateSale(
  id,
  payload = {}
) {

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


  // El inventario no debe modificarse
  // silenciosamente desde un update.
  if (payload.items) {
    throw createError(
      400,
      'Sale items cannot be replaced from updateSale'
    );
  }


  const data = {};


  if (payload.status) {
    data.status =
      normalizeSaleStatus(
        payload.status
      );
  }


  if (
    payload.paymentReference !==
    undefined
  ) {

    data.paymentReference =
      payload.paymentReference ||
      null;
  }


  if (payload.employeeId !== undefined) {
    data.employeeId =
      payload.employeeId ||
      null;
  }


  return prisma.sale.update({
    where: {
      id
    },

    data,

    include: {
      client: true,

      employee: true,

      items: {
        include: {
          productVariant: {
            include: {
              product: true
            }
          },

          provider: true,

          inventoryItem: {
            include: {
              aliases: {
                where: {
                  active: true
                },

                include: {
                  emailAlias: true
                }
              }
            }
          }
        }
      }
    }
  });
}


// ==========================================
// ELIMINAR VENTA Y LIBERAR INVENTARIO
// ==========================================

async function deleteSale(id) {

  return prisma.$transaction(
    async tx => {

      const existing =
        await tx.sale.findUnique({
          where: {
            id
          },

          include: {
            items: {
              include: {
                inventoryItem: true
              }
            }
          }
        });


      if (!existing) {
        throw createError(
          404,
          'Sale not found'
        );
      }


      // Liberar inventario conectado
      for (const item of existing.items) {

        if (item.inventoryItem) {

          await tx.inventoryItem.update({
            where: {
              id:
                item.inventoryItem.id
            },

            data: {
              saleItemId: null,
              status: 'AVAILABLE',
              soldAt: null
            }
          });
        }
      }


      await tx.sale.delete({
        where: {
          id
        }
      });


      return {
        success: true,
        id
      };
    }
  );
}


// ==========================================
// EXPORTAR
// ==========================================

module.exports = {
  listSales,
  getSale,
  createSale,
  updateSale,
  deleteSale
};