const prisma = require('../lib/prisma');

function createError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

async function ensureDatabaseConnection() {
  try {
    await prisma.$connect();
  } catch (error) {
    const wrapped = createError(503, 'Database unavailable');
    wrapped.cause = error;
    throw wrapped;
  }
}

async function listCategories() {
  await ensureDatabaseConnection();

  return prisma.category.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      imageUrl: true
    }
  });
}

async function listProducts() {
  await ensureDatabaseConnection();

  return prisma.product.findMany({
    where: { active: true },
    include: {
      category: {
        select: {
          id: true,
          name: true,
          slug: true
        }
      },
      variants: {
        where: { active: true },
        select: {
          id: true,
          publicName: true,
          publicPrice: true,
          accessType: true,
          durationDays: true
        }
      }
    }
  });
}

async function getProductBySlug(slug) {
  await ensureDatabaseConnection();

  return prisma.product.findUnique({
    where: { slug },
    include: {
      category: {
        select: {
          id: true,
          name: true,
          slug: true
        }
      },
      variants: {
        where: { active: true },
        select: {
          id: true,
          publicName: true,
          publicPrice: true,
          accessType: true,
          durationDays: true
        }
      }
    }
  });
}

module.exports = {
  listCategories,
  listProducts,
  getProductBySlug
};
