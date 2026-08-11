const prisma = require('../lib/prisma');


// ============================================================
// ERROR HTTP
// ============================================================

function createError(
  status,
  message
) {
  const error =
    new Error(message);

  error.status =
    status;

  return error;
}


// ============================================================
// COMPROBAR BASE DE DATOS
// ============================================================

async function ensureDatabaseConnection() {
  try {

    await prisma.$queryRaw`
      SELECT 1
    `;

  } catch (error) {

    const connectionError =
      new Error(
        'No se pudo conectar con la base de datos'
      );

    connectionError.status =
      503;

    throw connectionError;
  }
}


// ============================================================
// NORMALIZAR SLUG
// ============================================================

function normalizeSlug(
  value
) {
  return String(
    value || ''
  )
    .normalize('NFD')
    .replace(
      /[\u0300-\u036f]/g,
      ''
    )
    .toLowerCase()
    .trim()
    .replace(
      /[^a-z0-9]+/g,
      '-'
    )
    .replace(
      /^-+|-+$/g,
      ''
    );
}


// ============================================================
// OBTENER SLUG ÚNICO
// ============================================================

async function generateUniqueSlug(
  name
) {
  const base =
    normalizeSlug(name) ||
    `producto-${Date.now()}`;

  let slug =
    base;

  let counter =
    2;

  while (
    await prisma.product.findUnique({
      where: {
        slug
      },
      select: {
        id: true
      }
    })
  ) {

    slug =
      `${base}-${counter}`;

    counter +=
      1;
  }

  return slug;
}


// ============================================================
// CATEGORÍA STREAMING AUTOMÁTICA
// ============================================================

async function ensureStreamingCategory() {

  let category =
    await prisma.category.findFirst({
      where: {
        active: true,
        OR: [
          {
            slug: 'streaming'
          },
          {
            name: {
              equals:
                'Streaming',
              mode:
                'insensitive'
            }
          }
        ]
      }
    });


  if (
    category
  ) {
    return category;
  }


  category =
    await prisma.category.create({
      data: {
        name:
          'Streaming',

        slug:
          'streaming',

        description:
          'Plataformas de streaming',

        active:
          true,

        sortOrder:
          0
      }
    });


  return category;
}


// ============================================================
// LISTAR CATEGORÍAS
// ============================================================

async function listCategories() {

  await ensureDatabaseConnection();


  return prisma.category.findMany({
    where: {
      active: true
    },

    orderBy: [
      {
        sortOrder: 'asc'
      },
      {
        name: 'asc'
      }
    ]
  });
}


// ============================================================
// LISTAR PRODUCTOS / PLATAFORMAS
// ============================================================

async function listProducts() {

  await ensureDatabaseConnection();


  return prisma.product.findMany({
    where: {
      active: true
    },

    include: {

      Category:
        true,

      variants: {
        where: {
          active: true
        },

        orderBy: {
          publicPrice:
            'asc'
        }
      }
    },

    orderBy: {
      createdAt:
        'desc'
    }
  });
}


// ============================================================
// BUSCAR PRODUCTO POR SLUG
// ============================================================

async function getProductBySlug(
  slug
) {

  await ensureDatabaseConnection();


  const normalized =
    normalizeSlug(slug);


  const product =
    await prisma.product.findUnique({
      where: {
        slug:
          normalized
      },

      include: {

        Category:
          true,

        variants: {
          where: {
            active: true
          },

          orderBy: {
            publicPrice:
              'asc'
          }
        }
      }
    });


  if (
    !product
  ) {
    throw createError(
      404,
      'Plataforma no encontrada'
    );
  }


  return product;
}


// ============================================================
// CREAR PRODUCTO / PLATAFORMA
// ============================================================

async function createProduct(
  data = {}
) {

  await ensureDatabaseConnection();


  const name =
    String(
      data.name ||
      ''
    ).trim();


  const description =
    String(
      data.description ||
      ''
    ).trim();


  const imageUrl =
    String(
      data.imageUrl ||
      ''
    ).trim();


  let categoryId =
    String(
      data.categoryId ||
      ''
    ).trim();


  if (
    !name
  ) {
    throw createError(
      400,
      'Escribe el nombre de la plataforma'
    );
  }


  // ----------------------------------------------------------
  // EVITAR PLATAFORMA REPETIDA
  // ----------------------------------------------------------

  const existing =
    await prisma.product.findFirst({
      where: {
        name: {
          equals:
            name,
          mode:
            'insensitive'
        }
      }
    });


  if (
    existing
  ) {
    throw createError(
      409,
      'Esta plataforma ya existe en el catálogo'
    );
  }


  // ----------------------------------------------------------
  // CATEGORÍA
  // ----------------------------------------------------------

  if (
    categoryId
  ) {

    const category =
      await prisma.category.findUnique({
        where: {
          id:
            categoryId
        }
      });


    if (
      !category
    ) {
      throw createError(
        404,
        'La categoría seleccionada no existe'
      );
    }


    if (
      category.active === false
    ) {
      throw createError(
        400,
        'La categoría seleccionada está inactiva'
      );
    }

  } else {

    const category =
      await ensureStreamingCategory();

    categoryId =
      category.id;
  }


  // ----------------------------------------------------------
  // SLUG
  // ----------------------------------------------------------

  const slug =
    await generateUniqueSlug(
      name
    );


  // ----------------------------------------------------------
  // CREAR
  // ----------------------------------------------------------

  return prisma.product.create({
    data: {

      categoryId,

      name,

      slug,

      description:
        description ||
        null,

      imageUrl:
        imageUrl ||
        null,

      active:
        true
    },

    include: {

      Category:
        true,

      variants:
        true
    }
  });
}


// ============================================================
// CREAR PLAN / VARIANTE
// ============================================================

async function createProductVariant(
  productId,
  data = {}
) {

  await ensureDatabaseConnection();


  const cleanProductId =
    String(
      productId ||
      ''
    ).trim();


  const publicName =
    String(
      data.publicName ||
      ''
    ).trim();


  const accessType =
    String(
      data.accessType ||
      'PROFILE'
    )
      .trim()
      .toUpperCase();


  const durationDays =
    Number(
      data.durationDays
    );


  const publicPrice =
    Number(
      data.publicPrice
    );


  if (
    !cleanProductId
  ) {
    throw createError(
      400,
      'Selecciona una plataforma'
    );
  }


  if (
    !publicName
  ) {
    throw createError(
      400,
      'Escribe el nombre del plan'
    );
  }


  const validAccessTypes =
    [
      'PROFILE',
      'FULL_ACCOUNT',
      'INVITATION',
      'NEW_EMAIL',
      'FAMILY'
    ];


  if (
    !validAccessTypes.includes(
      accessType
    )
  ) {

    throw createError(
      400,
      'Tipo de acceso inválido'
    );
  }


  if (
    !Number.isInteger(
      durationDays
    ) ||
    durationDays <= 0
  ) {

    throw createError(
      400,
      'La duración debe ser mayor a 0 días'
    );
  }


  if (
    !Number.isFinite(
      publicPrice
    ) ||
    publicPrice < 0
  ) {

    throw createError(
      400,
      'El precio es inválido'
    );
  }


  // ----------------------------------------------------------
  // PRODUCTO
  // ----------------------------------------------------------

  const product =
    await prisma.product.findUnique({
      where: {
        id:
          cleanProductId
      }
    });


  if (
    !product
  ) {

    throw createError(
      404,
      'La plataforma no existe'
    );
  }


  if (
    product.active === false
  ) {

    throw createError(
      400,
      'La plataforma está inactiva'
    );
  }


  // ----------------------------------------------------------
  // EVITAR PLAN DUPLICADO
  // ----------------------------------------------------------

  const existing =
    await prisma.productVariant.findFirst({
      where: {

        productId:
          cleanProductId,

        publicName: {
          equals:
            publicName,
          mode:
            'insensitive'
        },

        durationDays
      }
    });


  if (
    existing
  ) {

    throw createError(
      409,
      'Ese plan ya existe para esta plataforma'
    );
  }


  // ----------------------------------------------------------
  // CREAR PLAN
  // ----------------------------------------------------------

  return prisma.productVariant.create({
    data: {

      productId:
        cleanProductId,

      accessType,

      durationDays,

      publicName,

      publicPrice,

      active:
        true
    },

    include: {
      product:
        true
    }
  });
}


// ============================================================
// EXPORTAR
// ============================================================

module.exports = {
  listCategories,
  listProducts,
  getProductBySlug,
  createProduct,
  createProductVariant
};