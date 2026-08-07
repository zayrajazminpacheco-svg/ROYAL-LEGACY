const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

const connectionString = process.env.DATABASE_URL;

const adapter = new PrismaPg({ 
  connectionString,
  ssl: {
  rejectUnauthorized: false
}
 });

const prisma =
  global.__prisma ||
  new PrismaClient({
    adapter,
  });

if (process.env.NODE_ENV !== 'production') {
  global.__prisma = prisma;
}

module.exports = prisma;