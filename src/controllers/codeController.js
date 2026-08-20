const { v4: uuidv4 } = require('uuid');
const prisma = require('../lib/prisma');

const CODE_STATUSES = [
  'PENDING',
  'RECEIVED',
  'DELIVERED',
  'EXPIRED',
  'FAILED'
];

const CLIENT_SALE_STATUSES = [
  'PAID',
  'PROCESSING',
  'DELIVERED'
];

const ACTIVE_CODE_STATUSES = [
  'PENDING',
  'RECEIVED'
];

function createError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function cleanText(value, maxLength = 500) {
  const text =
    String(value || '').trim();

  return text
    ? text.slice(0, maxLength)
    : null;
}

function getRequestInclude() {
  return {
    InventoryItem: {
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
          },

          orderBy: {
            assignedAt: 'desc'
          }
        },

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
        }
      }
    }
  };
}

function getOwnedInventoryInclude() {
  return {
    ProductVariant: {
      include: {
        product: true
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
      },

      orderBy: {
        assignedAt: 'desc'
      }
    },

    SaleItem: {
      include: {
        sale: {
          select: {
            id: true,
            clientId: true,
            status: true,
            createdAt: true
          }
        }
      }
    }
  };
}

function getProductData(inventoryItem) {
  const variant =
    inventoryItem?.ProductVariant ||
    inventoryItem?.productVariant ||
    null;

  const product =
    variant?.product ||
    variant?.Product ||
    null;

  return {
    product,
    variant
  };
}

function serializeClientRequest(request) {
  const inventoryItem =
    request?.InventoryItem ||
    request?.inventoryItem ||
    null;

  const {
    product,
    variant
  } = getProductData(
    inventoryItem
  );

  const sale =
    inventoryItem?.SaleItem?.sale ||
    inventoryItem?.saleItem?.sale ||
    null;

  const canShowCode = [
    'RECEIVED',
    'DELIVERED'
  ].includes(request.status);

  return {
    id:
      request.id,

    status:
      request.status,

    notes:
      request.notes ||
      null,

    code:
      canShowCode
        ? request.codeEncrypted || null
        : null,

    requestedAt:
      request.requestedAt,

    receivedAt:
      request.receivedAt,

    deliveredAt:
      request.deliveredAt,

    expiresAt:
      request.expiresAt,

    purchase:
      sale
        ? {
            id:
              sale.id,

            status:
              sale.status,

            createdAt:
              sale.createdAt
          }
        : null,

    inventoryItemId:
      inventoryItem?.id ||
      request.inventoryItemId,

    product:
      product
        ? {
            id:
              product.id,

            name:
              product.name,

            slug:
              product.slug ||
              null,

            imageUrl:
              product.imageUrl ||
              null
          }
        : null,

    variant:
      variant
        ? {
            id:
              variant.id,

            publicName:
              variant.publicName,

            accessType:
              variant.accessType,

            durationDays:
              variant.durationDays
          }
        : null
  };
}

async function findOwnedInventoryItem(
  inventoryItemId,
  userId
) {
  const inventoryItem =
    await prisma.inventoryItem.findUnique({
      where: {
        id:
          inventoryItemId
      },

      include:
        getOwnedInventoryInclude()
    });

  if (!inventoryItem) {
    throw createError(
      404,
      'La cuenta comprada no fue encontrada'
    );
  }

  const sale =
    inventoryItem.SaleItem?.sale ||
    null;

  if (
    !sale ||
    sale.clientId !== userId
  ) {
    throw createError(
      404,
      'La cuenta comprada no fue encontrada'
    );
  }

  if (
    !CLIENT_SALE_STATUSES.includes(
      sale.status
    )
  ) {
    throw createError(
      409,
      'La compra debe estar pagada antes de solicitar un código'
    );
  }

  if (
    [
      'REMOVED',
      'BLOCKED',
      'EXPIRED'
    ].includes(
      inventoryItem.status
    )
  ) {
    throw createError(
      409,
      'Esta cuenta no está disponible para solicitar códigos'
    );
  }

  return inventoryItem;
}

// ============================================================
// CLIENTE: COMPRAS ELEGIBLES PARA SOLICITAR CÓDIGO
// ============================================================

async function listMyEligibleItems(
  req,
  res,
  next
) {
  try {
    const saleItems =
      await prisma.saleItem.findMany({
        where: {
          sale: {
            clientId:
              req.user.id,

            status: {
              in:
                CLIENT_SALE_STATUSES
            }
          }
        },

        include: {
          sale: {
            select: {
              id: true,
              status: true,
              createdAt: true
            }
          },

          ProductVariant: {
            include: {
              product: true
            }
          },

          InventoryItem: {
            include: {
              CodeRequest: {
                where: {
                  status: {
                    in:
                      ACTIVE_CODE_STATUSES
                  }
                },

                orderBy: {
                  requestedAt:
                    'desc'
                }
              }
            }
          }
        },

        orderBy: {
          createdAt:
            'desc'
        }
      });

    const items =
      saleItems
        .filter(item => {
          const inventory =
            item.InventoryItem;

          return Boolean(
            inventory &&
            ![
              'REMOVED',
              'BLOCKED',
              'EXPIRED'
            ].includes(
              inventory.status
            )
          );
        })
        .map(item => {
          const inventory =
            item.InventoryItem;

          const variant =
            item.ProductVariant;

          const product =
            variant?.product ||
            null;

          const activeRequest =
            Array.isArray(
              inventory.CodeRequest
            )
              ? inventory.CodeRequest[0] ||
                null
              : null;

          return {
            inventoryItemId:
              inventory.id,

            inventoryStatus:
              inventory.status,

            expirationDate:
              inventory.expirationDate,

            purchase: {
              id:
                item.sale.id,

              status:
                item.sale.status,

              createdAt:
                item.sale.createdAt
            },

            product:
              product
                ? {
                    id:
                      product.id,

                    name:
                      product.name,

                    slug:
                      product.slug ||
                      null,

                    imageUrl:
                      product.imageUrl ||
                      null
                  }
                : null,

            variant:
              variant
                ? {
                    id:
                      variant.id,

                    publicName:
                      variant.publicName,

                    accessType:
                      variant.accessType,

                    durationDays:
                      variant.durationDays
                  }
                : null,

            activeRequest:
              activeRequest
                ? {
                    id:
                      activeRequest.id,

                    status:
                      activeRequest.status,

                    requestedAt:
                      activeRequest.requestedAt
                  }
                : null
          };
        });

    return res.status(200).json({
      success: true,
      data:
        items
    });

  } catch (error) {
    next(error);
  }
}

// ============================================================
// CLIENTE: LISTAR MIS SOLICITUDES
// ============================================================

async function listMyCodeRequests(
  req,
  res,
  next
) {
  try {
    const requests =
      await prisma.codeRequest.findMany({
        where: {
          requestedById:
            req.user.id
        },

        include:
          getRequestInclude(),

        orderBy: {
          requestedAt:
            'desc'
        }
      });

    return res.status(200).json({
      success: true,

      data:
        requests.map(
          serializeClientRequest
        )
    });

  } catch (error) {
    next(error);
  }
}

// ============================================================
// CLIENTE: VER UNA SOLICITUD PROPIA
// ============================================================

async function getMyCodeRequest(
  req,
  res,
  next
) {
  try {
    const request =
      await prisma.codeRequest.findFirst({
        where: {
          id:
            req.params.id,

          requestedById:
            req.user.id
        },

        include:
          getRequestInclude()
      });

    if (!request) {
      throw createError(
        404,
        'Solicitud de código no encontrada'
      );
    }

    return res.status(200).json({
      success: true,

      data:
        serializeClientRequest(
          request
        )
    });

  } catch (error) {
    next(error);
  }
}

// ============================================================
// CLIENTE: CREAR SOLICITUD PARA UNA COMPRA PROPIA
// ============================================================

async function createMyCodeRequest(
  req,
  res,
  next
) {
  try {
    const inventoryItemId =
      String(
        req.body?.inventoryItemId ||
        ''
      ).trim();

    if (!inventoryItemId) {
      throw createError(
        400,
        'Selecciona la cuenta para la que necesitas el código'
      );
    }

    await findOwnedInventoryItem(
      inventoryItemId,
      req.user.id
    );

    const activeRequest =
      await prisma.codeRequest.findFirst({
        where: {
          inventoryItemId,

          status: {
            in:
              ACTIVE_CODE_STATUSES
          }
        },

        orderBy: {
          requestedAt:
            'desc'
        }
      });

    if (activeRequest) {
      throw createError(
        409,
        'Ya existe una solicitud activa para esta cuenta'
      );
    }

    const created =
      await prisma.codeRequest.create({
        data: {
          id:
            uuidv4(),

          inventoryItemId,

          requestedById:
            req.user.id,

          status:
            'PENDING',

          notes:
            cleanText(
              req.body?.notes
            )
        },

        include:
          getRequestInclude()
      });

    return res.status(201).json({
      success: true,

      message:
        'Solicitud de código enviada correctamente',

      data:
        serializeClientRequest(
          created
        )
    });

  } catch (error) {
    next(error);
  }
}

// ============================================================
// ADMINISTRACIÓN: LISTAR SOLICITUDES
// ============================================================

async function listCodeRequests(
  req,
  res,
  next
) {
  try {
    const status =
      req.query?.status
        ? String(
            req.query.status
          )
            .trim()
            .toUpperCase()
        : null;

    if (
      status &&
      !CODE_STATUSES.includes(
        status
      )
    ) {
      throw createError(
        400,
        'Estado de solicitud no válido'
      );
    }

    const where = {};

    if (status) {
      where.status =
        status;
    }

    const requests =
      await prisma.codeRequest.findMany({
        where,

        include:
          getRequestInclude(),

        orderBy: {
          requestedAt:
            'desc'
        }
      });

    return res.status(200).json({
      success: true,
      data:
        requests
    });

  } catch (error) {
    next(error);
  }
}

// ============================================================
// ADMINISTRACIÓN: VER UNA SOLICITUD
// ============================================================

async function getCodeRequest(
  req,
  res,
  next
) {
  try {
    const request =
      await prisma.codeRequest.findUnique({
        where: {
          id:
            req.params.id
        },

        include:
          getRequestInclude()
      });

    if (!request) {
      throw createError(
        404,
        'Solicitud de código no encontrada'
      );
    }

    return res.status(200).json({
      success: true,
      data:
        request
    });

  } catch (error) {
    next(error);
  }
}

// ============================================================
// ADMINISTRACIÓN: CREAR SOLICITUD
// ============================================================

async function createCodeRequest(
  req,
  res,
  next
) {
  try {
    const inventoryItemId =
      String(
        req.body?.inventoryItemId ||
        ''
      ).trim();

    if (!inventoryItemId) {
      throw createError(
        400,
        'inventoryItemId es obligatorio'
      );
    }

    const inventoryItem =
      await prisma.inventoryItem.findUnique({
        where: {
          id:
            inventoryItemId
        },

        include:
          getOwnedInventoryInclude()
      });

    if (!inventoryItem) {
      throw createError(
        404,
        'Artículo de inventario no encontrado'
      );
    }

    const activeAlias =
      Array.isArray(
        inventoryItem.InventoryAlias
      )
        ? inventoryItem
            .InventoryAlias[0] ||
          null
        : null;

    if (!activeAlias) {
      throw createError(
        409,
        'Este artículo no tiene un correo activo asignado'
      );
    }

    const activeRequest =
      await prisma.codeRequest.findFirst({
        where: {
          inventoryItemId,

          status: {
            in:
              ACTIVE_CODE_STATUSES
          }
        },

        orderBy: {
          requestedAt:
            'desc'
        }
      });

    if (activeRequest) {
      throw createError(
        409,
        'Ya existe una solicitud activa para este artículo'
      );
    }

    const created =
      await prisma.codeRequest.create({
        data: {
          id:
            uuidv4(),

          inventoryItemId,

          requestedById:
            req.user?.id ||
            null,

          status:
            'PENDING',

          notes:
            cleanText(
              req.body?.notes
            )
        },

        include:
          getRequestInclude()
      });

    return res.status(201).json({
      success: true,

      message:
        'Solicitud de código creada correctamente',

      data:
        created
    });

  } catch (error) {
    next(error);
  }
}

// ============================================================
// ADMINISTRACIÓN: MARCAR CÓDIGO COMO RECIBIDO
// ============================================================

async function markCodeReceived(
  req,
  res,
  next
) {
  try {
    const id =
      req.params.id;

    const code =
      String(
        req.body?.code ||
        ''
      ).trim();

    if (!code) {
      throw createError(
        400,
        'El código es obligatorio'
      );
    }

    if (code.length > 100) {
      throw createError(
        400,
        'El código no es válido'
      );
    }

    const existing =
      await prisma.codeRequest.findUnique({
        where: {
          id
        }
      });

    if (!existing) {
      throw createError(
        404,
        'Solicitud de código no encontrada'
      );
    }

    if (
      [
        'DELIVERED',
        'EXPIRED',
        'FAILED'
      ].includes(
        existing.status
      )
    ) {
      throw createError(
        409,
        'Esta solicitud ya no puede modificarse'
      );
    }

    const updated =
      await prisma.codeRequest.update({
        where: {
          id
        },

        data: {
          codeEncrypted:
            code,

          status:
            'RECEIVED',

          receivedAt:
            new Date()
        }
      });

    return res.status(200).json({
      success: true,

      message:
        'Código marcado como recibido',

      data:
        updated
    });

  } catch (error) {
    next(error);
  }
}

// ============================================================
// ADMINISTRACIÓN: MARCAR CÓDIGO COMO ENTREGADO
// ============================================================

async function markCodeDelivered(
  req,
  res,
  next
) {
  try {
    const id =
      req.params.id;

    const existing =
      await prisma.codeRequest.findUnique({
        where: {
          id
        }
      });

    if (!existing) {
      throw createError(
        404,
        'Solicitud de código no encontrada'
      );
    }

    if (
      existing.status ===
      'DELIVERED'
    ) {
      return res.status(200).json({
        success: true,

        message:
          'El código ya estaba marcado como entregado',

        data:
          existing
      });
    }

    if (!existing.codeEncrypted) {
      throw createError(
        409,
        'Todavía no se ha recibido ningún código'
      );
    }

    if (
      [
        'EXPIRED',
        'FAILED'
      ].includes(
        existing.status
      )
    ) {
      throw createError(
        409,
        'Esta solicitud ya no puede entregarse'
      );
    }

    const updated =
      await prisma.codeRequest.update({
        where: {
          id
        },

        data: {
          status:
            'DELIVERED',

          receivedAt:
            existing.receivedAt ||
            new Date(),

          deliveredAt:
            new Date()
        }
      });

    return res.status(200).json({
      success: true,

      message:
        'Código marcado como entregado',

      data:
        updated
    });

  } catch (error) {
    next(error);
  }
}

// ============================================================
// ADMINISTRACIÓN: MARCAR COMO EXPIRADA
// ============================================================

async function expireCodeRequest(
  req,
  res,
  next
) {
  try {
    const id =
      req.params.id;

    const existing =
      await prisma.codeRequest.findUnique({
        where: {
          id
        }
      });

    if (!existing) {
      throw createError(
        404,
        'Solicitud de código no encontrada'
      );
    }

    const updated =
      await prisma.codeRequest.update({
        where: {
          id
        },

        data: {
          status:
            'EXPIRED',

          expiresAt:
            new Date()
        }
      });

    return res.status(200).json({
      success: true,

      message:
        'Solicitud marcada como expirada',

      data:
        updated
    });

  } catch (error) {
    next(error);
  }
}

// ============================================================
// ADMINISTRACIÓN: MARCAR COMO FALLIDA
// ============================================================

async function failCodeRequest(
  req,
  res,
  next
) {
  try {
    const id =
      req.params.id;

    const existing =
      await prisma.codeRequest.findUnique({
        where: {
          id
        }
      });

    if (!existing) {
      throw createError(
        404,
        'Solicitud de código no encontrada'
      );
    }

    const updated =
      await prisma.codeRequest.update({
        where: {
          id
        },

        data: {
          status:
            'FAILED',

          notes:
            cleanText(
              req.body?.notes
            ) ||
            existing.notes
        }
      });

    return res.status(200).json({
      success: true,

      message:
        'Solicitud marcada como fallida',

      data:
        updated
    });

  } catch (error) {
    next(error);
  }
}

// ============================================================
// EXPORTAR
// ============================================================

module.exports = {
  listMyEligibleItems,
  listMyCodeRequests,
  getMyCodeRequest,
  createMyCodeRequest,
  listCodeRequests,
  getCodeRequest,
  createCodeRequest,
  markCodeReceived,
  markCodeDelivered,
  expireCodeRequest,
  failCodeRequest
};