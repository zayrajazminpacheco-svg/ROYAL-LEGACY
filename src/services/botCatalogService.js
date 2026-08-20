const prisma = require('../lib/prisma');

async function ensureDatabaseConnection() {
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (error) {
    error.status = 503;
    error.message = 'No se pudo conectar con la base de datos';
    throw error;
  }
}

function normalizeCommand(value = '') {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/^\./, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildSearchTerms(command) {
  const value = normalizeCommand(command);

  const aliasesMap = {
    netflix: ['netflix'],
    disney: ['disney', 'disney+', 'disney plus'],
    hbo: ['hbo', 'hbo max', 'max'],
    prime: ['prime', 'prime video', 'amazon prime', 'amazon prime video'],
    crunchy: ['crunchy', 'crunchyroll'],
    paramount: ['paramount', 'paramount+', 'paramount plus'],
    spotify: ['spotify'],
    youtube: ['youtube', 'youtube premium'],
    gemini: ['gemini', 'gemini pro', 'google one'],
    canva: ['canva', 'canva pro']
  };

  return aliasesMap[value] || [value];
}

async function findProductByCommand(command) {
  await ensureDatabaseConnection();

  const terms = buildSearchTerms(command);

  const products = await prisma.product.findMany({
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
        orderBy: [
          { publicPrice: 'asc' },
          { createdAt: 'asc' }
        ]
      }
    },
    orderBy: {
      name: 'asc'
    }
  });

  const normalizedProducts = products.map((product) => {
    const haystack = [
      product.name,
      product.slug,
      product.description || '',
      ...(product.variants || []).map((variant) => variant.publicName || '')
    ]
      .join(' | ')
      .toLowerCase();

    return {
      ...product,
      __haystack: haystack
    };
  });

  const match = normalizedProducts.find((product) =>
    terms.some((term) => product.__haystack.includes(term))
  );

  if (!match) {
    return null;
  }

  const variantsWithStock = await Promise.all(
    (match.variants || []).map(async (variant) => {
      const stock = await prisma.inventoryItem.count({
        where: {
          productVariantId: variant.id,
          status: 'AVAILABLE'
        }
      });

      return {
        id: variant.id,
        publicName: variant.publicName,
        publicPrice: Number(variant.publicPrice || 0),
        accessType: variant.accessType,
        durationDays: variant.durationDays,
        active: variant.active,
        stock
      };
    })
  );

  const totalStock = variantsWithStock.reduce(
    (acc, item) => acc + Number(item.stock || 0),
    0
  );

  const cheapestVariant =
    variantsWithStock.length > 0
      ? [...variantsWithStock].sort((a, b) => a.publicPrice - b.publicPrice)[0]
      : null;

  return {
    command: normalizeCommand(command),
    product: {
      id: match.id,
      name: match.name,
      slug: match.slug,
      description: match.description || null,
      imageUrl: match.imageUrl || null,
      category: match.Category || null
    },
    cheapestVariant,
    variants: variantsWithStock,
    totalStock
  };
}

async function listPlatformSummaries() {
  await ensureDatabaseConnection();

  const products = await prisma.product.findMany({
    where: {
      active: true
    },
    include: {
      variants: {
        where: {
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

  const result = [];

  for (const product of products) {
    const variants = [];

    for (const variant of product.variants || []) {
      const stock = await prisma.inventoryItem.count({
        where: {
          productVariantId: variant.id,
          status: 'AVAILABLE'
        }
      });

      variants.push({
        id: variant.id,
        publicName: variant.publicName,
        publicPrice: Number(variant.publicPrice || 0),
        accessType: variant.accessType,
        durationDays: variant.durationDays,
        stock
      });
    }

    result.push({
      id: product.id,
      name: product.name,
      slug: product.slug,
      imageUrl: product.imageUrl || null,
      totalStock: variants.reduce((sum, item) => sum + Number(item.stock || 0), 0),
      cheapestPrice:
        variants.length > 0
          ? Math.min(...variants.map((item) => Number(item.publicPrice || 0)))
          : 0,
      variants
    });
  }

  return result;
}

module.exports = {
  normalizeCommand,
  findProductByCommand,
  listPlatformSummaries
};