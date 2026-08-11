const prisma = require('../lib/prisma');


// ============================================================
// ERROR
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
// CONEXIÓN
// ============================================================

async function ensureDatabaseConnection() {

  try {

    await prisma.$queryRaw`SELECT 1`;

  } catch (error) {

    error.status =
      503;

    error.message =
      'No se pudo conectar con la base de datos';

    throw error;

  }
}


// ============================================================
// NORMALIZAR SLUG
// ============================================================

function normalizeSlug(value) {

  return String(
    value || ''
  )
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(
      /[\u0300-\u036f]/g,
      ''
    )
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
// LISTAR PRODUCTOS
// ============================================================

async function listProducts() {

  await ensureDatabaseConnection();

  return prisma.product.findMany({

    where: {
      active: true
    },

    include: {

      Category: {

        select: {
          id: true,
          name: true,
          slug: true
        }

      },

      variants: {

        where: {
          active: true
        },

        select: {
          id: true,
          productId: true,
          publicName: true,
          publicPrice: true,
          accessType: true,
          durationDays: true,
          active: true
        },

        orderBy: {
          publicPrice: 'asc'
        }

      }

    },

    orderBy: {
      name: 'asc'
    }

  });

}


// ============================================================
// OBTENER PRODUCTO POR SLUG
// ============================================================

async function getProductBySlug(slug) {

  await ensureDatabaseConnection();

  const cleanSlug =
    String(
      slug || ''
    ).trim();

  if (!cleanSlug) {

    throw createError(
      400,
      'El producto es obligatorio'
    );

  }

  const product =
    await prisma.product.findUnique({

      where: {
        slug: cleanSlug
      },

      include: {

        Category: {

          select: {
            id: true,
            name: true,
            slug: true
          }

        },

        variants: {

          where: {
            active: true
          },

          select: {
            id: true,
            productId: true,
            publicName: true,
            publicPrice: true,
            accessType: true,
            durationDays: true,
            active: true
          },

          orderBy: {
            publicPrice: 'asc'
          }

        }

      }

    });

  if (
    !product ||
    !product.active
  ) {

    throw createError(
      404,
      'Producto no encontrado'
    );

  }

  return product;

}


// ============================================================
// CREAR PRODUCTO
// ============================================================

async function createProduct(
  data = {}
) {

  await ensureDatabaseConnection();

  const categoryId =
    String(
      data.categoryId || ''
    ).trim();

  const name =
    String(
      data.name || ''
    ).trim();

  const description =
    String(
      data.description || ''
    ).trim();

  const imageUrl =
    String(
      data.imageUrl || ''
    ).trim();

  const requestedSlug =
    String(
      data.slug || ''
    ).trim();


  if (!categoryId) {

    throw createError(
      400,
      'Selecciona una categoría'
    );

  }


  if (!name) {

    throw createError(
      400,
      'Escribe el nombre del producto'
    );

  }


  const category =
    await prisma.category.findUnique({

      where: {
        id: categoryId
      }

    });


  if (
    !category ||
    !category.active
  ) {

    throw createError(
      400,
      'La categoría seleccionada no es válida'
    );

  }


  let slug =
    normalizeSlug(
      requestedSlug ||
      name
    );


  if (!slug) {

    throw createError(
      400,
      'No se pudo generar el identificador del producto'
    );

  }


  const existingProduct =
    await prisma.product.findUnique({

      where: {
        slug
      }

    });


  if (existingProduct) {

    slug =
      `${slug}-${Date.now()}`;

  }


  const product =
    await prisma.product.create({

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
          data.active !== false

      },

      include: {

        Category: {

          select: {
            id: true,
            name: true,
            slug: true
          }

        },

        variants: true

      }

    });


  return product;

}


// ============================================================
// CREAR VARIANTE / PLAN
// ============================================================

async function createProductVariant(
  productId,
  data = {}
) {

  await ensureDatabaseConnection();


  const cleanProductId =
    String(
      productId || ''
    ).trim();


  if (!cleanProductId) {

    throw createError(
      400,
      'Selecciona un producto'
    );

  }


  const product =
    await prisma.product.findUnique({

      where: {
        id: cleanProductId
      }

    });


  if (
    !product ||
    !product.active
  ) {

    throw createError(
      404,
      'Producto no encontrado'
    );

  }


  const publicName =
    String(
      data.publicName || ''
    ).trim();


  const accessType =
    String(
      data.accessType || ''
    ).trim();


  const durationDays =
    Number(
      data.durationDays
    );


  const publicPrice =
    Number(
      data.publicPrice
    );


  if (!publicName) {

    throw createError(
      400,
      'Escribe el nombre del plan'
    );

  }


  const validAccessTypes = [
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
      'Selecciona un tipo de acceso válido'
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
      'El precio no es válido'
    );

  }


  const variant =
    await prisma.productVariant.create({

      data: {

        productId:
          cleanProductId,

        publicName,

        accessType,

        durationDays,

        publicPrice,

        active:
          data.active !== false

      }

    });


  return variant;

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