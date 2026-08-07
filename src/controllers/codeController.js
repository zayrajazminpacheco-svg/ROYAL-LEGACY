const prisma = require('../lib/prisma');

function createError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

// =============================
// SOLICITUDES DE CÓDIGO
// =============================

async function listCodeRequests(req, res, next) {
  try {
    const status = req.query?.status;

    const where = {};

    if (status) {
      where.status = status;
    }

    const requests = await prisma.codeRequest.findMany({
      where,
      include: {
        inventoryItem: {
          include: {
            productVariant: {
              include: {
                product: true
              }
            },
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

async function getCodeRequest(req, res, next) {
  try {
    const request = await prisma.codeRequest.findUnique({
      where: {
        id: req.params.id
      },
      include: {
        inventoryItem: {
          include: {
            productVariant: {
              include: {
                product: true
              }
            },
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
            }
          }
        }
      }
    });

    if (!request) {
      throw createError(404, 'Code request not found');
    }

    return res.status(200).json({
      success: true,
      data: request
    });
  } catch (error) {
    next(error);
  }
}

async function createCodeRequest(req, res, next) {
  try {
    const inventoryItemId = req.body?.inventoryItemId;

    if (!inventoryItemId) {
      throw createError(
        400,
        'inventoryItemId is required'
      );
    }

    const inventoryItem =
      await prisma.inventoryItem.findUnique({
        where: {
          id: inventoryItemId
        },
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
      });

    if (!inventoryItem) {
      throw createError(
        404,
        'Inventory item not found'
      );
    }

    const pending =
      await prisma.codeRequest.findFirst({
        where: {
          inventoryItemId,
          status: 'PENDING'
        }
      });

    if (pending) {
      throw createError(
        409,
        'There is already a pending code request for this item'
      );
    }

    const request = await prisma.codeRequest.create({
      data: {
        inventoryItemId,
        requestedById: req.user?.id || null,
        status: 'PENDING',
        notes: req.body?.notes?.trim() || null
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Code request created successfully',
      data: request
    });
  } catch (error) {
    next(error);
  }
}

// =============================
// MARCAR CÓDIGO RECIBIDO
// =============================

async function markCodeReceived(req, res, next) {
  try {
    const id = req.params.id;
    const code = String(req.body?.code || '').trim();

    if (!code) {
      throw createError(
        400,
        'Code is required'
      );
    }

    const existing = await prisma.codeRequest.findUnique({
      where: {
        id
      }
    });

    if (!existing) {
      throw createError(
        404,
        'Code request not found'
      );
    }

    if (
      existing.status === 'DELIVERED' ||
      existing.status === 'EXPIRED'
    ) {
      throw createError(
        409,
        'This code request can no longer be modified'
      );
    }

    const updated = await prisma.codeRequest.update({
      where: {
        id
      },
      data: {
        codeEncrypted: code,
        status: 'RECEIVED',
        receivedAt: new Date()
      }
    });

    return res.status(200).json({
      success: true,
      message: 'Code marked as received',
      data: updated
    });
  } catch (error) {
    next(error);
  }
}

// =============================
// MARCAR CÓDIGO ENTREGADO
// =============================

async function markCodeDelivered(req, res, next) {
  try {
    const id = req.params.id;

    const existing = await prisma.codeRequest.findUnique({
      where: {
        id
      }
    });

    if (!existing) {
      throw createError(
        404,
        'Code request not found'
      );
    }

    if (existing.status !== 'RECEIVED') {
      throw createError(
        409,
        'The code must be received before it can be delivered'
      );
    }

    const updated = await prisma.codeRequest.update({
      where: {
        id
      },
      data: {
        status: 'DELIVERED',
        deliveredAt: new Date()
      }
    });

    return res.status(200).json({
      success: true,
      message: 'Code marked as delivered',
      data: updated
    });
  } catch (error) {
    next(error);
  }
}

// =============================
// MARCAR COMO EXPIRADO
// =============================

async function expireCodeRequest(req, res, next) {
  try {
    const id = req.params.id;

    const existing = await prisma.codeRequest.findUnique({
      where: {
        id
      }
    });

    if (!existing) {
      throw createError(
        404,
        'Code request not found'
      );
    }

    const updated = await prisma.codeRequest.update({
      where: {
        id
      },
      data: {
        status: 'EXPIRED',
        expiresAt: new Date()
      }
    });

    return res.status(200).json({
      success: true,
      message: 'Code request expired',
      data: updated
    });
  } catch (error) {
    next(error);
  }
}

// =============================
// MARCAR COMO FALLIDO
// =============================

async function failCodeRequest(req, res, next) {
  try {
    const id = req.params.id;

    const existing = await prisma.codeRequest.findUnique({
      where: {
        id
      }
    });

    if (!existing) {
      throw createError(
        404,
        'Code request not found'
      );
    }

    const updated = await prisma.codeRequest.update({
      where: {
        id
      },
      data: {
        status: 'FAILED',
        notes:
          req.body?.notes?.trim() ||
          existing.notes
      }
    });

    return res.status(200).json({
      success: true,
      message: 'Code request marked as failed',
      data: updated
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listCodeRequests,
  getCodeRequest,
  createCodeRequest,
  markCodeReceived,
  markCodeDelivered,
  expireCodeRequest,
  failCodeRequest
};