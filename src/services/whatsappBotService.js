const crypto = require('crypto');
const prisma = require('../lib/prisma');

function createError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function makeId(prefix = 'bot') {
  return `${prefix}_${crypto.randomUUID()}`;
}

function normalizeCommand(value = '') {
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}


// ============================================================
// CONFIGURACIÓN
// ============================================================

async function getSettings() {
  const rows = await prisma.$queryRawUnsafe(`
    SELECT *
    FROM "WhatsAppBotSettings"
    WHERE "id" = 'main'
    LIMIT 1
  `);

  if (rows.length) {
    return rows[0];
  }

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
  `);

  return getSettings();
}


async function updateSettings(data = {}) {
  const current = await getSettings();

  const enabled =
    typeof data.enabled === 'boolean'
      ? data.enabled
      : current.enabled;

  const allowedGroupId =
    data.allowedGroupId !== undefined
      ? String(data.allowedGroupId || '').trim() || null
      : current.allowedGroupId;

  const allowedGroupName =
    data.allowedGroupName !== undefined
      ? String(data.allowedGroupName || '').trim() || null
      : current.allowedGroupName;

  const prefix =
    data.prefix !== undefined
      ? String(data.prefix || '!').trim().slice(0, 5) || '!'
      : current.prefix;

  const welcomeEnabled =
    typeof data.welcomeEnabled === 'boolean'
      ? data.welcomeEnabled
      : current.welcomeEnabled;

  const welcomeMessage =
    data.welcomeMessage !== undefined
      ? String(data.welcomeMessage || '').trim() || null
      : current.welcomeMessage;

  await prisma.$executeRawUnsafe(
    `
      UPDATE "WhatsAppBotSettings"
      SET
        "enabled" = $1,
        "allowedGroupId" = $2,
        "allowedGroupName" = $3,
        "prefix" = $4,
        "welcomeEnabled" = $5,
        "welcomeMessage" = $6,
        "updatedAt" = CURRENT_TIMESTAMP
      WHERE "id" = 'main'
    `,
    enabled,
    allowedGroupId,
    allowedGroupName,
    prefix,
    welcomeEnabled,
    welcomeMessage
  );

  return getSettings();
}


// ============================================================
// COMANDOS
// ============================================================

async function listCommands() {
  return prisma.$queryRawUnsafe(`
    SELECT *
    FROM "WhatsAppBotCommand"
    ORDER BY
      "sortOrder" ASC,
      "command" ASC
  `);
}


async function getCommandById(id) {
  const rows = await prisma.$queryRawUnsafe(
    `
      SELECT *
      FROM "WhatsAppBotCommand"
      WHERE "id" = $1
      LIMIT 1
    `,
    id
  );

  return rows[0] || null;
}


async function createCommand(data = {}) {
  const command =
    normalizeCommand(data.command);

  const response =
    String(data.response || '').trim();

  const matchType =
    String(data.matchType || 'EXACT')
      .trim()
      .toUpperCase();

  const responseType =
    String(data.responseType || 'TEXT')
      .trim()
      .toUpperCase();

  const mediaUrl =
    String(data.mediaUrl || '').trim() || null;

  const enabled =
    data.enabled !== false;

  const sortOrder =
    Number.isFinite(Number(data.sortOrder))
      ? Number(data.sortOrder)
      : 0;


  if (!command) {
    throw createError(
      400,
      'Escribe el comando'
    );
  }

  if (!response && responseType === 'TEXT') {
    throw createError(
      400,
      'Escribe la respuesta del bot'
    );
  }

  if (
    !['EXACT', 'CONTAINS', 'STARTS_WITH']
      .includes(matchType)
  ) {
    throw createError(
      400,
      'Tipo de coincidencia inválido'
    );
  }

  if (
    !['TEXT', 'AUDIO', 'LINK']
      .includes(responseType)
  ) {
    throw createError(
      400,
      'Tipo de respuesta inválido'
    );
  }

  const duplicate =
    await prisma.$queryRawUnsafe(
      `
        SELECT "id"
        FROM "WhatsAppBotCommand"
        WHERE LOWER("command") = LOWER($1)
        LIMIT 1
      `,
      command
    );

  if (duplicate.length) {
    throw createError(
      409,
      'Ese comando ya existe'
    );
  }

  const id =
    makeId('cmd');

  await prisma.$executeRawUnsafe(
    `
      INSERT INTO "WhatsAppBotCommand" (
        "id",
        "command",
        "response",
        "matchType",
        "responseType",
        "mediaUrl",
        "enabled",
        "sortOrder",
        "createdAt",
        "updatedAt"
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      )
    `,
    id,
    command,
    response,
    matchType,
    responseType,
    mediaUrl,
    enabled,
    sortOrder
  );

  return getCommandById(id);
}


async function updateCommand(
  id,
  data = {}
) {
  const current =
    await getCommandById(id);

  if (!current) {
    throw createError(
      404,
      'Comando no encontrado'
    );
  }

  const command =
    data.command !== undefined
      ? normalizeCommand(data.command)
      : current.command;

  const response =
    data.response !== undefined
      ? String(data.response || '').trim()
      : current.response;

  const matchType =
    data.matchType !== undefined
      ? String(data.matchType)
          .trim()
          .toUpperCase()
      : current.matchType;

  const responseType =
    data.responseType !== undefined
      ? String(data.responseType)
          .trim()
          .toUpperCase()
      : current.responseType;

  const mediaUrl =
    data.mediaUrl !== undefined
      ? String(data.mediaUrl || '').trim() || null
      : current.mediaUrl;

  const enabled =
    typeof data.enabled === 'boolean'
      ? data.enabled
      : current.enabled;

  const sortOrder =
    data.sortOrder !== undefined
      ? Number(data.sortOrder || 0)
      : current.sortOrder;

  if (!command) {
    throw createError(
      400,
      'Escribe el comando'
    );
  }

  await prisma.$executeRawUnsafe(
    `
      UPDATE "WhatsAppBotCommand"
      SET
        "command" = $1,
        "response" = $2,
        "matchType" = $3,
        "responseType" = $4,
        "mediaUrl" = $5,
        "enabled" = $6,
        "sortOrder" = $7,
        "updatedAt" = CURRENT_TIMESTAMP
      WHERE "id" = $8
    `,
    command,
    response,
    matchType,
    responseType,
    mediaUrl,
    enabled,
    sortOrder,
    id
  );

  return getCommandById(id);
}


async function deleteCommand(id) {
  const current =
    await getCommandById(id);

  if (!current) {
    throw createError(
      404,
      'Comando no encontrado'
    );
  }

  await prisma.$executeRawUnsafe(
    `
      DELETE FROM "WhatsAppBotCommand"
      WHERE "id" = $1
    `,
    id
  );

  return {
    id,
    deleted: true
  };
}


// ============================================================
// MOTOR DE RESPUESTAS
// ============================================================

async function findResponseForMessage(
  message
) {
  const settings =
    await getSettings();

  if (!settings.enabled) {
    return null;
  }

  const text =
    normalizeCommand(message);

  if (!text) {
    return null;
  }

  const commands =
    await prisma.$queryRawUnsafe(`
      SELECT *
      FROM "WhatsAppBotCommand"
      WHERE "enabled" = TRUE
      ORDER BY
        "sortOrder" ASC,
        "command" ASC
    `);

  for (const item of commands) {
    const command =
      normalizeCommand(item.command);

    let matched =
      false;

    if (
      item.matchType === 'EXACT'
    ) {
      matched =
        text === command;
    }

    if (
      item.matchType === 'CONTAINS'
    ) {
      matched =
        text.includes(command);
    }

    if (
      item.matchType === 'STARTS_WITH'
    ) {
      matched =
        text.startsWith(command);
    }

    if (matched) {
      return item;
    }
  }

  return null;
}


// ============================================================
// VALIDAR GRUPO
// ============================================================

async function isAllowedGroup(
  groupId
) {
  const settings =
    await getSettings();

  if (!settings.enabled) {
    return false;
  }

  if (!settings.allowedGroupId) {
    return false;
  }

  return (
    String(groupId) ===
    String(settings.allowedGroupId)
  );
}


module.exports = {
  getSettings,
  updateSettings,

  listCommands,
  getCommandById,
  createCommand,
  updateCommand,
  deleteCommand,

  findResponseForMessage,
  isAllowedGroup
};