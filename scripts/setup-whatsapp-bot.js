require('dotenv').config();

const prisma = require('../src/lib/prisma');

async function main() {
  console.log('');
  console.log('======================================');
  console.log(' ROYAL LEGACY - BOT WHATSAPP SETUP');
  console.log('======================================');
  console.log('');

  await prisma.$connect();

  console.log('Conectado a PostgreSQL.');

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "WhatsAppBotSettings" (
      "id" TEXT PRIMARY KEY,
      "enabled" BOOLEAN NOT NULL DEFAULT FALSE,
      "allowedGroupId" TEXT,
      "allowedGroupName" TEXT,
      "prefix" TEXT NOT NULL DEFAULT '!',
      "welcomeEnabled" BOOLEAN NOT NULL DEFAULT FALSE,
      "welcomeMessage" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "WhatsAppBotCommand" (
      "id" TEXT PRIMARY KEY,
      "command" TEXT NOT NULL UNIQUE,
      "response" TEXT NOT NULL,
      "matchType" TEXT NOT NULL DEFAULT 'EXACT',
      "responseType" TEXT NOT NULL DEFAULT 'TEXT',
      "mediaUrl" TEXT,
      "enabled" BOOLEAN NOT NULL DEFAULT TRUE,
      "sortOrder" INTEGER NOT NULL DEFAULT 0,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS
    "WhatsAppBotCommand_enabled_idx"
    ON "WhatsAppBotCommand" ("enabled")
  `);

  await prisma.$executeRawUnsafe(`
    INSERT INTO "WhatsAppBotSettings" (
      "id",
      "enabled",
      "prefix",
      "welcomeEnabled",
      "createdAt",
      "updatedAt"
    )
    VALUES (
      'main',
      FALSE,
      '!',
      FALSE,
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
    )
    ON CONFLICT ("id") DO NOTHING
  `);

  console.log('');
  console.log('Tablas creadas correctamente.');
  console.log('');
  console.log('Bot WhatsApp listo para comandos.');
  console.log('');
}

main()
  .catch(error => {
    console.error('');
    console.error('ERROR:');
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });