const prisma = require('../lib/prisma');

function createError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function normalizeDomain(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/^@/, '');
}

function normalizeLocalPart(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, '');
}

function randomString(length = 8) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';

  let result = '';

  for (let i = 0; i < length; i += 1) {
    result += chars.charAt(
      Math.floor(Math.random() * chars.length)
    );
  }

  return result;
}

// =============================
// DOMINIOS
// =============================

async function listDomains(req, res, next) {
  try {
    const domains = await prisma.mailDomain.findMany({
      orderBy: [
        {
          rotationPriority: 'desc'
        },
        {
          createdAt: 'desc'
        }
      ]
    });

    return res.status(200).json({
      success: true,
      data: domains
    });
  } catch (error) {
    next(error);
  }
}

async function createDomain(req, res, next) {
  try {
    const domain = normalizeDomain(req.body?.domain);

    if (!domain) {
      throw createError(
        400,
        'Domain is required'
      );
    }

    const existing = await prisma.mailDomain.findUnique({
      where: {
        domain
      }
    });

    if (existing) {
      throw createError(
        409,
        'This domain already exists'
      );
    }

    const created = await prisma.mailDomain.create({
      data: {
        domain,
        providerName:
          req.body?.providerName?.trim() || null,
        platformGroup:
          req.body?.platformGroup?.trim() || null,
        catchAllEnabled:
          Boolean(req.body?.catchAllEnabled),
        rotationGroup:
          req.body?.rotationGroup?.trim() || null,
        rotationPriority:
          Number(req.body?.rotationPriority || 0),
        status: 'ACTIVE',
        notes:
          req.body?.notes?.trim() || null
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Domain created successfully',
      data: created
    });
  } catch (error) {
    next(error);
  }
}

// =============================
// ALIAS / CORREOS
// =============================

async function listAliases(req, res, next) {
  try {
    const aliases = await prisma.emailAlias.findMany({
      include: {
        domain: true,
        inventoryLinks: {
          include: {
            inventoryItem: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return res.status(200).json({
      success: true,
      data: aliases
    });
  } catch (error) {
    next(error);
  }
}

async function createAlias(req, res, next) {
  try {
    const domainId = req.body?.domainId;

    if (!domainId) {
      throw createError(
        400,
        'domainId is required'
      );
    }

    const domain = await prisma.mailDomain.findUnique({
      where: {
        id: domainId
      }
    });

    if (!domain) {
      throw createError(
        404,
        'Domain not found'
      );
    }

    if (domain.status !== 'ACTIVE') {
      throw createError(
        400,
        'Domain is not active'
      );
    }

    let localPart = normalizeLocalPart(
      req.body?.localPart
    );

    if (!localPart) {
      localPart = randomString(
        Number(req.body?.length || 10)
      );
    }

    let fullAddress = `${localPart}@${domain.domain}`;

    let existing =
      await prisma.emailAlias.findUnique({
        where: {
          fullAddress
        }
      });

    let attempts = 0;

    while (existing && attempts < 10) {
      localPart = randomString(10);
      fullAddress = `${localPart}@${domain.domain}`;

      existing =
        await prisma.emailAlias.findUnique({
          where: {
            fullAddress
          }
        });

      attempts += 1;
    }

    if (existing) {
      throw createError(
        409,
        'Could not generate a unique email address'
      );
    }

    const alias = await prisma.emailAlias.create({
      data: {
        domainId: domain.id,
        localPart,
        fullAddress,
        platformGroup:
          req.body?.platformGroup ||
          domain.platformGroup ||
          null,
        status: 'AVAILABLE'
      },
      include: {
        domain: true
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Email generated successfully',
      data: alias
    });
  } catch (error) {
    next(error);
  }
}

async function generateAliases(req, res, next) {
  try {
    const domainId = req.body?.domainId;

    const requestedQuantity =
      Number(req.body?.quantity || 1);

    const quantity = Math.min(
      Math.max(requestedQuantity, 1),
      100
    );

    if (!domainId) {
      throw createError(
        400,
        'domainId is required'
      );
    }

    const domain = await prisma.mailDomain.findUnique({
      where: {
        id: domainId
      }
    });

    if (!domain) {
      throw createError(
        404,
        'Domain not found'
      );
    }

    if (domain.status !== 'ACTIVE') {
      throw createError(
        400,
        'Domain is not active'
      );
    }

    const generated = [];

    for (let i = 0; i < quantity; i += 1) {
      let created = false;
      let attempts = 0;

      while (!created && attempts < 20) {
        const localPart = randomString(
          Number(req.body?.length || 10)
        );

        const fullAddress =
          `${localPart}@${domain.domain}`;

        const existing =
          await prisma.emailAlias.findUnique({
            where: {
              fullAddress
            }
          });

        if (!existing) {
          const alias =
            await prisma.emailAlias.create({
              data: {
                domainId: domain.id,
                localPart,
                fullAddress,
                platformGroup:
                  req.body?.platformGroup ||
                  domain.platformGroup ||
                  null,
                status: 'AVAILABLE'
              }
            });

          generated.push(alias);
          created = true;
        }

        attempts += 1;
      }

      if (!created) {
        throw createError(
          500,
          'Could not generate all requested emails'
        );
      }
    }

    return res.status(201).json({
      success: true,
      message:
        `${generated.length} emails generated successfully`,
      data: generated
    });
  } catch (error) {
    next(error);
  }
}

async function updateAliasStatus(req, res, next) {
  try {
    const aliasId = req.params.id;

    const allowedStatuses = [
      'AVAILABLE',
      'ASSIGNED',
      'PAUSED',
      'BLOCKED'
    ];

    const status = req.body?.status;

    if (!allowedStatuses.includes(status)) {
      throw createError(
        400,
        'Invalid alias status'
      );
    }

    const alias = await prisma.emailAlias.update({
      where: {
        id: aliasId
      },
      data: {
        status
      }
    });

    return res.status(200).json({
      success: true,
      message: 'Alias status updated',
      data: alias
    });
  } catch (error) {
    next(error);
  }
}

async function assignAlias(req, res, next) {
  try {
    const aliasId = req.params.id;
    const inventoryItemId =
      req.body?.inventoryItemId;

    if (!inventoryItemId) {
      throw createError(
        400,
        'inventoryItemId is required'
      );
    }

    const alias = await prisma.emailAlias.findUnique({
      where: {
        id: aliasId
      }
    });

    if (!alias) {
      throw createError(
        404,
        'Email alias not found'
      );
    }

    if (alias.status !== 'AVAILABLE') {
      throw createError(
        409,
        'Email alias is not available'
      );
    }

    const inventoryItem =
      await prisma.inventoryItem.findUnique({
        where: {
          id: inventoryItemId
        }
      });

    if (!inventoryItem) {
      throw createError(
        404,
        'Inventory item not found'
      );
    }

    const result = await prisma.$transaction(
      async (tx) => {
        const link =
          await tx.inventoryAlias.create({
            data: {
              inventoryItemId,
              emailAliasId: aliasId,
              active: true
            }
          });

        await tx.emailAlias.update({
          where: {
            id: aliasId
          },
          data: {
            status: 'ASSIGNED',
            assignedAt: new Date()
          }
        });

        return link;
      }
    );

    return res.status(200).json({
      success: true,
      message: 'Email assigned successfully',
      data: result
    });
  } catch (error) {
    next(error);
  }
}

async function releaseAlias(req, res, next) {
  try {
    const aliasId = req.params.id;

    const links =
      await prisma.inventoryAlias.findMany({
        where: {
          emailAliasId: aliasId,
          active: true
        }
      });

    await prisma.$transaction(
      async (tx) => {
        if (links.length > 0) {
          await tx.inventoryAlias.updateMany({
            where: {
              emailAliasId: aliasId,
              active: true
            },
            data: {
              active: false,
              releasedAt: new Date()
            }
          });
        }

        await tx.emailAlias.update({
          where: {
            id: aliasId
          },
          data: {
            status: 'AVAILABLE',
            assignedAt: null
          }
        });
      }
    );

    return res.status(200).json({
      success: true,
      message: 'Email released successfully'
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listDomains,
  createDomain,
  listAliases,
  createAlias,
  generateAliases,
  updateAliasStatus,
  assignAlias,
  releaseAlias
};