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
    const error =
      new Error(
        'Product slug is required'
      );

    error.status =
      400;

    throw error;
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
    const error =
      new Error(
        'Product not found'
      );

    error.status =
      404;

    throw error;
  }

  return product;
}


// ============================================================
// EXPORTAR
// ============================================================

module.exports = {
  listCategories,
  listProducts,
  getProductBySlug
};