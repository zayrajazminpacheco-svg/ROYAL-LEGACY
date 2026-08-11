const prisma = require('../lib/prisma');

async function ensureDatabaseConnection() {
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (error) {
    error.status = 503;
    error.message =
      'No se pudo conectar con la base de datos';
    throw error;
  }
}

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

function normalizeSlug(value) {
  return String(value || '')
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

  if (!slug) {
    throw createError(
      400,
      'El slug del producto es obligatorio'
    );
  }

  const product =
    await prisma.product.findUnique({
      where: {
        slug
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

async function createProduct(data = {}) {
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
      'El nombre del producto es obligatorio'
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
      'No se pudo generar el slug'
    );
  }

  const existing =
    await prisma.product.findUnique({
      where: {
        slug
      }
    });

  if (existing) {
    slug =
      `${slug}-${Date.now()}`;
  }

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
        data.active !== false
    },

    include: {
      Category: true,
      variants: true
    }
  });
}


// ============================================================
// CREAR VARIANTE
// ============================================================

async function createProductVariant(
  productId,
  data = {}
) {
  await ensureDatabaseConnection();

  const id =
    String(
      productId || ''
    ).trim();

  if (!id) {
    throw createError(
      400,
      'El producto es obligatorio'
    );
  }

  const product =
    await prisma.product.findUnique({
      where: {
        id
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
      'El nombre de la variante es obligatorio'
    );
  }

  if (!accessType) {
    throw createError(
      400,
      'Selecciona el tipo de acceso'
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
      'El precio público no es válido'
    );
  }

  return prisma.productVariant.create({
    data: {
      productId: id,
      accessType,
      durationDays,
      publicName,
      publicPrice,
      active:
        data.active !== false
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