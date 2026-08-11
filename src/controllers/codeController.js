const { v4: uuidv4 } = require('uuid');
const prisma = require('../lib/prisma');

function createError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

// ============================================================
// LISTAR SOLICITUDES DE CÓDIGO
// ============================================================

async function listCodeRequests(req, res, next) {
  try {
    const status =
      req.query?.status
        ? String(req.query.status)
            .trim()
            .toUpperCase()
        : null;

    const where = {};

    if (status) {
      where.status = status;
    }

    const requests =
      await prisma.codeRequest.findMany({
        where,

        include: {
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
        },

        orderBy: {
          requestedAt: 'desc'
        }
      });

    return res.status(200).json({
      success: true,
      data: requests
    });

  } catch (error) {
    next(error);
  }
}

// ============================================================
// VER UNA SOLICITUD
// ============================================================

async function getCodeRequest(req, res, next) {
  try {
    const request =
      await prisma.codeRequest.findUnique({
        where: {
          id: req.params.id
        },

        include: {
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
        }
      });

    if (!request) {
      throw createError(
        404,
        'Solicitud de código no encontrada'
      );
    }

    return res.status(200).json({
      success: true,
      data: request
    });

  } catch (error) {
    next(error);
  }
}

// ============================================================
// CREAR SOLICITUD
// ============================================================

async function createCodeRequest(req, res, next) {
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
          id: inventoryItemId
        },

        include: {
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
          }
        }
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
        ? inventoryItem.InventoryAlias[0]
        : null;

    if (!activeAlias) {
      throw createError(
        409,
        'Este artículo no tiene un correo activo asignado'
      );
    }

    const pending =
      await prisma.codeRequest.findFirst({
        where: {
          inventoryItemId,
          status: 'PENDING'
        },

        orderBy: {
          requestedAt: 'desc'
        }
      });

    if (pending) {
      throw createError(
        409,
        'Ya existe una solicitud de código pendiente para este artículo'
      );
    }

    const request =
      await prisma.codeRequest.create({
        data: {
          id: uuidv4(),

          inventoryItemId,

          requestedById:
            req.user?.id ||
            null,

          status:
            'PENDING',

          notes:
            req.body?.notes
              ? String(
                  req.body.notes
                ).trim()
              : null
        }
      });

    const complete =
      await prisma.codeRequest.findUnique({
        where: {
          id: request.id
        },

        include: {
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
                }
              }
            }
          }
        }
      });

    return res.status(201).json({
      success: true,
      message:
        'Solicitud de código creada correctamente',
      data: complete
    });

  } catch (error) {
    next(error);
  }
}

// ============================================================
// MARCAR CÓDIGO COMO RECIBIDO
// ============================================================

async function markCodeReceived(req, res, next) {
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
      existing.status === 'DELIVERED' ||
      existing.status === 'EXPIRED'
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
      data: updated
    });

  } catch (error) {
    next(error);
  }
}

// ============================================================
// MARCAR CÓDIGO COMO ENTREGADO
// ============================================================

async function markCodeDelivered(req, res, next) {
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
        data: existing
      });
    }

    if (!existing.codeEncrypted) {
      throw createError(
        409,
        'Todavía no se ha recibido ningún código'
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
      data: updated
    });

  } catch (error) {
    next(error);
  }
}

// ============================================================
// MARCAR COMO EXPIRADO
// ============================================================

async function expireCodeRequest(req, res, next) {
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
      data: updated
    });

  } catch (error) {
    next(error);
  }
}

// ============================================================
// MARCAR COMO FALLIDA
// ============================================================

async function failCodeRequest(req, res, next) {
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
            req.body?.notes
              ? String(
                  req.body.notes
                ).trim()
              : existing.notes
        }
      });

    return res.status(200).json({
      success: true,
      message:
        'Solicitud marcada como fallida',
      data: updated
    });

  } catch (error) {
    next(error);
  }
}

// ============================================================
// EXPORTAR
// ============================================================

module.exports = {
  listCodeRequests,
  getCodeRequest,
  createCodeRequest,
  markCodeReceived,
  markCodeDelivered,
  expireCodeRequest,
  failCodeRequest
};