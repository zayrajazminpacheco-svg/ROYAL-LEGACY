const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

const connectionString =
  process.env.DIRECT_URL ||
  process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DIRECT_URL or DATABASE_URL is required');
}

const adapter = new PrismaPg({
  connectionString,
  ssl: {
    rejectUnauthorized: false
  }
});

const prisma =
  global.__prisma ||
  new PrismaClient({
    adapter
  });

if (process.env.NODE_ENV !== 'production') {
  global.__prisma = prisma;
}

module.exports = prisma;