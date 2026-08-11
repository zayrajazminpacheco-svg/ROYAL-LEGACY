const crypto = require('crypto');
const prisma = require('../lib/prisma');


function createError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}


function createId() {
  return crypto.randomUUID();
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
  const chars =
    'abcdefghijklmnopqrstuvwxyz0123456789';

  let result = '';

  for (let i = 0; i < length; i += 1) {
    result += chars.charAt(
      Math.floor(
        Math.random() * chars.length
      )
    );
  }

  return result;
}


// ============================================================
// DOMINIOS
// ============================================================

async function listDomains(req, res, next) {
  try {
    const domains =
      await prisma.mailDomain.findMany({
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
    const domain =
      normalizeDomain(
        req.body?.domain
      );

    if (!domain) {
      throw createError(
        400,
        'El dominio es obligatorio'
      );
    }

    const existing =
      await prisma.mailDomain.findUnique({
        where: {
          domain
        }
      });

    if (existing) {
      throw createError(
        409,
        'Este dominio ya existe'
      );
    }

    const now =
      new Date();

    const created =
      await prisma.mailDomain.create({
        data: {
          id:
            createId(),

          domain,

          providerName:
            req.body?.providerName
              ? String(
                  req.body.providerName
                ).trim()
              : null,

          platformGroup:
            req.body?.platformGroup
              ? String(
                  req.body.platformGroup
                ).trim()
              : null,

          catchAllEnabled:
            Boolean(
              req.body?.catchAllEnabled
            ),

          rotationGroup:
            req.body?.rotationGroup
              ? String(
                  req.body.rotationGroup
                ).trim()
              : null,

          rotationPriority:
            Number(
              req.body?.rotationPriority ||
              0
            ),

          status:
            'ACTIVE',

          notes:
            req.body?.notes
              ? String(
                  req.body.notes
                ).trim()
              : null,

          updatedAt:
            now
        }
      });

    return res.status(201).json({
      success: true,
      message:
        'Dominio creado correctamente',
      data:
        created
    });

  } catch (error) {
    next(error);
  }
}


// ============================================================
// LISTAR CORREOS / ALIASES
// ============================================================

async function listAliases(req, res, next) {
  try {
    const aliases =
      await prisma.emailAlias.findMany({
        include: {
          MailDomain:
            true,

          InventoryAlias: {
            include: {
              InventoryItem:
                true
            }
          }
        },

        orderBy: {
          createdAt:
            'desc'
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


// ============================================================
// CREAR UN CORREO
// ============================================================

async function createAlias(req, res, next) {
  try {
    const domainId =
      String(
        req.body?.domainId ||
        ''
      ).trim();

    if (!domainId) {
      throw createError(
        400,
        'domainId es obligatorio'
      );
    }

    const domain =
      await prisma.mailDomain.findUnique({
        where: {
          id:
            domainId
        }
      });

    if (!domain) {
      throw createError(
        404,
        'Dominio no encontrado'
      );
    }

    if (
      domain.status !==
      'ACTIVE'
    ) {
      throw createError(
        400,
        'El dominio no está activo'
      );
    }

    let localPart =
      normalizeLocalPart(
        req.body?.localPart
      );

    if (!localPart) {
      localPart =
        randomString(
          Number(
            req.body?.length ||
            10
          )
        );
    }

    let fullAddress =
      `${localPart}@${domain.domain}`;

    let existing =
      await prisma.emailAlias.findUnique({
        where: {
          fullAddress
        }
      });

    let attempts =
      0;

    while (
      existing &&
      attempts < 20
    ) {
      localPart =
        randomString(10);

      fullAddress =
        `${localPart}@${domain.domain}`;

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
        'No se pudo generar un correo único'
      );
    }

    const now =
      new Date();

    const alias =
      await prisma.emailAlias.create({
        data: {
          id:
            createId(),

          domainId:
            domain.id,

          localPart,

          fullAddress,

          destinationEmailEncrypted:
            null,

          destinationEmailMasked:
            null,

          platformGroup:
            req.body?.platformGroup
              ? String(
                  req.body.platformGroup
                ).trim()
              : domain.platformGroup ||
                null,

          status:
            'AVAILABLE',

          assignedAt:
            null,

          updatedAt:
            now
        },

        include: {
          MailDomain:
            true
        }
      });

    return res.status(201).json({
      success:
        true,

      message:
        'Correo generado correctamente',

      data:
        alias
    });

  } catch (error) {
    next(error);
  }
}


// ============================================================
// GENERAR VARIOS CORREOS
// ============================================================

async function generateAliases(
  req,
  res,
  next
) {
  try {
    const domainId =
      String(
        req.body?.domainId ||
        ''
      ).trim();

    const requestedQuantity =
      Number(
        req.body?.quantity ||
        1
      );

    const quantity =
      Math.min(
        Math.max(
          Number.isFinite(
            requestedQuantity
          )
            ? requestedQuantity
            : 1,
          1
        ),
        100
      );

    const requestedLength =
      Number(
        req.body?.length ||
        10
      );

    const aliasLength =
      Math.min(
        Math.max(
          Number.isFinite(
            requestedLength
          )
            ? requestedLength
            : 10,
          4
        ),
        40
      );

    if (!domainId) {
      throw createError(
        400,
        'domainId es obligatorio'
      );
    }

    const domain =
      await prisma.mailDomain.findUnique({
        where: {
          id:
            domainId
        }
      });

    if (!domain) {
      throw createError(
        404,
        'Dominio no encontrado'
      );
    }

    if (
      domain.status !==
      'ACTIVE'
    ) {
      throw createError(
        400,
        'El dominio no está activo'
      );
    }

    const generated =
      [];

    for (
      let i = 0;
      i < quantity;
      i += 1
    ) {
      let created =
        false;

      let attempts =
        0;

      while (
        !created &&
        attempts < 30
      ) {
        const localPart =
          randomString(
            aliasLength
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
          const now =
            new Date();

          const alias =
            await prisma.emailAlias.create({
              data: {
                id:
                  createId(),

                domainId:
                  domain.id,

                localPart,

                fullAddress,

                destinationEmailEncrypted:
                  null,

                destinationEmailMasked:
                  null,

                platformGroup:
                  req.body?.platformGroup
                    ? String(
                        req.body.platformGroup
                      ).trim()
                    : domain.platformGroup ||
                      null,

                status:
                  'AVAILABLE',

                assignedAt:
                  null,

                updatedAt:
                  now
              },

              include: {
                MailDomain:
                  true
              }
            });

          generated.push(
            alias
          );

          created =
            true;
        }

        attempts += 1;
      }

      if (!created) {
        throw createError(
          500,
          'No fue posible generar todos los correos solicitados'
        );
      }
    }

    return res.status(201).json({
      success:
        true,

      message:
        `${generated.length} correo(s) generado(s) correctamente`,

      data:
        generated
    });

  } catch (error) {
    next(error);
  }
}


// ============================================================
// ACTUALIZAR ESTADO DEL CORREO
// ============================================================

async function updateAliasStatus(
  req,
  res,
  next
) {
  try {
    const aliasId =
      String(
        req.params.aliasId ||
        req.params.id ||
        ''
      ).trim();

    const status =
      String(
        req.body?.status ||
        ''
      )
        .trim()
        .toUpperCase();

    const allowedStatuses = [
      'AVAILABLE',
      'ASSIGNED',
      'PAUSED',
      'BLOCKED'
    ];

    if (!aliasId) {
      throw createError(
        400,
        'aliasId es obligatorio'
      );
    }

    if (
      !allowedStatuses.includes(
        status
      )
    ) {
      throw createError(
        400,
        'Estado de correo no válido'
      );
    }

    const existing =
      await prisma.emailAlias.findUnique({
        where: {
          id:
            aliasId
        }
      });

    if (!existing) {
      throw createError(
        404,
        'Correo no encontrado'
      );
    }

    const alias =
      await prisma.emailAlias.update({
        where: {
          id:
            aliasId
        },

        data: {
          status,

          updatedAt:
            new Date()
        }
      });

    return res.status(200).json({
      success:
        true,

      message:
        'Estado del correo actualizado',

      data:
        alias
    });

  } catch (error) {
    next(error);
  }
}


// ============================================================
// ASIGNACIÓN MANUAL
// ============================================================

async function assignAlias(
  req,
  res,
  next
) {
  try {
    const aliasId =
      String(
        req.params.aliasId ||
        req.params.id ||
        ''
      ).trim();

    const inventoryItemId =
      String(
        req.body?.inventoryItemId ||
        ''
      ).trim();

    if (!aliasId) {
      throw createError(
        400,
        'aliasId es obligatorio'
      );
    }

    if (!inventoryItemId) {
      throw createError(
        400,
        'inventoryItemId es obligatorio'
      );
    }

    const alias =
      await prisma.emailAlias.findUnique({
        where: {
          id:
            aliasId
        }
      });

    if (!alias) {
      throw createError(
        404,
        'Correo no encontrado'
      );
    }

    if (
      alias.status !==
      'AVAILABLE'
    ) {
      throw createError(
        409,
        'El correo no está disponible'
      );
    }

    const inventoryItem =
      await prisma.inventoryItem.findUnique({
        where: {
          id:
            inventoryItemId
        },

        include: {
          InventoryAlias:
            true
        }
      });

    if (!inventoryItem) {
      throw createError(
        404,
        'Artículo de inventario no encontrado'
      );
    }

    const alreadyAssigned =
      inventoryItem
        .InventoryAlias
        ?.some(
          item =>
            item.active === true
        );

    if (alreadyAssigned) {
      throw createError(
        409,
        'Este artículo ya tiene un correo activo'
      );
    }

    const result =
      await prisma.$transaction(
        async (tx) => {
          const link =
            await tx.inventoryAlias.create({
              data: {
                id:
                  createId(),

                inventoryItemId,

                emailAliasId:
                  aliasId,

                active:
                  true
              }
            });

          await tx.emailAlias.update({
            where: {
              id:
                aliasId
            },

            data: {
              status:
                'ASSIGNED',

              assignedAt:
                new Date(),

              updatedAt:
                new Date()
            }
          });

          return link;
        }
      );

    return res.status(200).json({
      success:
        true,

      message:
        'Correo asignado correctamente',

      data:
        result
    });

  } catch (error) {
    next(error);
  }
}


// ============================================================
// ASIGNACIÓN AUTOMÁTICA
// ============================================================

async function assignAliasAutomatically(
  req,
  res,
  next
) {
  try {
    const productVariantId =
      String(
        req.body?.productVariantId ||
        ''
      ).trim();

    if (!productVariantId) {
      throw createError(
        400,
        'productVariantId es obligatorio'
      );
    }


    // --------------------------------------------------------
    // 1. BUSCAR VARIANTE
    // --------------------------------------------------------

    const productVariant =
      await prisma.productVariant.findUnique({
        where: {
          id:
            productVariantId
        },

        include: {
          product:
            true
        }
      });

    if (!productVariant) {
      throw createError(
        404,
        'Variante del producto no encontrada'
      );
    }


    // --------------------------------------------------------
    // 2. BUSCAR INVENTARIO DISPONIBLE SIN CORREO ACTIVO
    // --------------------------------------------------------

    const inventoryItem =
      await prisma.inventoryItem.findFirst({
        where: {
          productVariantId,

          status:
            'AVAILABLE',

          InventoryAlias: {
            none: {
              active:
                true
            }
          }
        },

        orderBy: {
          createdAt:
            'asc'
        }
      });

    if (!inventoryItem) {
      throw createError(
        409,
        'No hay inventario disponible para esta variante'
      );
    }


    // --------------------------------------------------------
    // 3. BUSCAR CORREO DISPONIBLE
    // --------------------------------------------------------

    const availableAliases =
      await prisma.emailAlias.findMany({
        where: {
          status:
            'AVAILABLE'
        },

        include: {
          MailDomain:
            true
        },

        orderBy: {
          createdAt:
            'asc'
        }
      });

    const alias =
      availableAliases
        .filter(
          item =>
            item.MailDomain &&
            item.MailDomain.status ===
              'ACTIVE'
        )
        .sort(
          (a, b) => {
            const priorityA =
              Number(
                a.MailDomain
                  ?.rotationPriority ||
                0
              );

            const priorityB =
              Number(
                b.MailDomain
                  ?.rotationPriority ||
                0
              );

            if (
              priorityA !==
              priorityB
            ) {
              return (
                priorityB -
                priorityA
              );
            }

            return (
              new Date(
                a.createdAt
              ).getTime() -
              new Date(
                b.createdAt
              ).getTime()
            );
          }
        )[0];

    if (!alias) {
      throw createError(
        409,
        'No hay correos disponibles'
      );
    }


    // --------------------------------------------------------
    // 4. ASIGNAR DENTRO DE TRANSACCIÓN
    // --------------------------------------------------------

    const result =
      await prisma.$transaction(
        async (tx) => {
          const freshInventory =
            await tx.inventoryItem.findUnique({
              where: {
                id:
                  inventoryItem.id
              },

              include: {
                InventoryAlias:
                  true
              }
            });

          if (!freshInventory) {
            throw createError(
              404,
              'Artículo de inventario no encontrado'
            );
          }

          if (
            freshInventory.status !==
            'AVAILABLE'
          ) {
            throw createError(
              409,
              'El artículo ya no está disponible'
            );
          }

          const hasActiveAlias =
            freshInventory
              .InventoryAlias
              ?.some(
                item =>
                  item.active === true
              );

          if (hasActiveAlias) {
            throw createError(
              409,
              'El artículo ya tiene un correo activo'
            );
          }

          const freshAlias =
            await tx.emailAlias.findUnique({
              where: {
                id:
                  alias.id
              }
            });

          if (!freshAlias) {
            throw createError(
              404,
              'Correo no encontrado'
            );
          }

          if (
            freshAlias.status !==
            'AVAILABLE'
          ) {
            throw createError(
              409,
              'El correo ya no está disponible'
            );
          }

          const link =
            await tx.inventoryAlias.create({
              data: {
                id:
                  createId(),

                inventoryItemId:
                  freshInventory.id,

                emailAliasId:
                  freshAlias.id,

                active:
                  true
              }
            });

          const updatedAlias =
            await tx.emailAlias.update({
              where: {
                id:
                  freshAlias.id
              },

              data: {
                status:
                  'ASSIGNED',

                assignedAt:
                  new Date(),

                updatedAt:
                  new Date()
              },

              include: {
                MailDomain:
                  true
              }
            });

          return {
            link,

            alias:
              updatedAlias,

            inventoryItem:
              freshInventory,

            productVariant
          };
        }
      );


    // --------------------------------------------------------
    // 5. RESPUESTA
    // --------------------------------------------------------

    return res.status(200).json({
      success:
        true,

      message:
        'Correo asignado automáticamente',

      data: {
        inventoryItemId:
          result
            .inventoryItem
            .id,

        productVariantId:
          productVariant.id,

        product:
          productVariant
            .product
            ?.name ||
          null,

        alias: {
          id:
            result.alias.id,

          fullAddress:
            result
              .alias
              .fullAddress,

          status:
            result.alias.status,

          domain:
            result.alias
              .MailDomain
              ?.domain ||
            null
        },

        link:
          result.link
      }
    });

  } catch (error) {
    next(error);
  }
}


// ============================================================
// LIBERAR CORREO
// ============================================================

async function releaseAlias(
  req,
  res,
  next
) {
  try {
    const aliasId =
      String(
        req.params.aliasId ||
        req.params.id ||
        ''
      ).trim();

    if (!aliasId) {
      throw createError(
        400,
        'aliasId es obligatorio'
      );
    }

    const alias =
      await prisma.emailAlias.findUnique({
        where: {
          id:
            aliasId
        }
      });

    if (!alias) {
      throw createError(
        404,
        'Correo no encontrado'
      );
    }

    const links =
      await prisma.inventoryAlias.findMany({
        where: {
          emailAliasId:
            aliasId,

          active:
            true
        }
      });

    await prisma.$transaction(
      async (tx) => {
        if (
          links.length > 0
        ) {
          await tx.inventoryAlias.updateMany({
            where: {
              emailAliasId:
                aliasId,

              active:
                true
            },

            data: {
              active:
                false,

              releasedAt:
                new Date()
            }
          });
        }

        await tx.emailAlias.update({
          where: {
            id:
              aliasId
          },

          data: {
            status:
              'AVAILABLE',

            assignedAt:
              null,

            updatedAt:
              new Date()
          }
        });
      }
    );

    return res.status(200).json({
      success:
        true,

      message:
        'Correo liberado correctamente'
    });

  } catch (error) {
    next(error);
  }
}


// ============================================================
// EXPORTACIONES
// ============================================================

module.exports = {
  listDomains,
  createDomain,
  listAliases,
  createAlias,
  generateAliases,
  updateAliasStatus,
  assignAlias,
  assignAliasAutomatically,
  releaseAlias
};