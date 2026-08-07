const bcrypt = require('bcrypt');
const prisma = require('../src/lib/prisma');
const config = require('../src/config/env');

async function main() {
  if (!config.superAdminEmail || !config.superAdminPassword) {
    console.warn('[seed] Super admin credentials are not configured. Seed skipped.');
    return;
  }

  const email = config.superAdminEmail.trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (!existing) {
    const passwordHash = await bcrypt.hash(config.superAdminPassword, 10);
    await prisma.user.create({
      data: {
        name: 'Super Administrator',
        email,
        passwordHash,
        role: 'SUPER_ADMIN',
        status: 'ACTIVE'
      }
    });
  }

  const categories = [
    { name: 'Streaming', slug: 'streaming', description: 'Servicios de streaming' },
    { name: 'Invitaciones', slug: 'invitaciones', description: 'Invitaciones y pases' },
    { name: 'Trámites', slug: 'tramites', description: 'Gestiones y trámites' },
    { name: 'Pago de servicios', slug: 'pago-de-servicios', description: 'Pagos de servicios' },
    { name: 'Seguidores y redes', slug: 'seguidores-y-redes', description: 'Crecimiento de redes' },
    { name: 'Videojuegos y recargas', slug: 'videojuegos-y-recargas', description: 'Recargas y videojuegos' }
  ];

  for (const item of categories) {
    const existingCategory = await prisma.category.findUnique({ where: { slug: item.slug } });
    if (!existingCategory) {
      await prisma.category.create({ data: { ...item, sortOrder: 0 } });
    }
  }

  console.log('[seed] Initial super admin and categories were added.');
}

main()
  .catch((error) => {
    console.error('[seed] Failed', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
