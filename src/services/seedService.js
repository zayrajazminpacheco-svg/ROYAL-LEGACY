const bcrypt = require('bcrypt');
const prisma = require('../lib/prisma');
const { env, superAdminEmail, superAdminPassword } = require('../config/env');

async function seed() {
  if (!superAdminEmail || !superAdminPassword) {
    console.warn('[seed] Super admin credentials are not configured. Seed skipped.');
    return;
  }

  const existingAdmin = await prisma.user.findUnique({ where: { email: superAdminEmail } });
  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash(superAdminPassword, 10);
    await prisma.user.create({
      data: {
        name: 'Super Administrator',
        email: superAdminEmail,
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

  for (const category of categories) {
    const existing = await prisma.category.findUnique({ where: { slug: category.slug } });
    if (!existing) {
      await prisma.category.create({ data: { ...category, sortOrder: 0 } });
    }
  }

  console.log('[seed] Initial data applied.');
}

module.exports = {
  seed
};
