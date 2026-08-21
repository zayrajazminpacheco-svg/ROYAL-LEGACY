const crypto = require('crypto');
const prisma = require('../lib/prisma');
const config = require('../config/env');

const BANXICO_VALIDATOR_URL =
  'https://www.banxico.org.mx/validador-cep-spei/';

const TOP_UP_STATUSES = [
  'PENDING',
  'REVIEW',
  'APPROVED',
  'REJECTED',
  'EXPIRED',
  'CANCELLED'
];

const MAX_CEP_BYTES =
  1024 * 1024;

function createError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function cleanText(value, maxLength = 250) {
  const text = String(value || '').trim();

  return text
    ? text.slice(0, maxLength)
    : null;
}

function normalizeTrackingKey(value) {
  return String(value || '')
    .trim()
    .replace(/\s+/g, '')
    .toUpperCase()
    .slice(0, 100);
}

function normalizeAccount(value) {
  return String(value || '')
    .replace(/\D/g, '');
}

function normalizeWords(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toUpperCase();
}

function amountToCents(value) {
  const normalized = String(value ?? '')
    .trim()
    .replace(/,/g, '');

  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) {
    throw createError(
      400,
      'El monto debe tener como máximo dos decimales'
    );
  }

  const [whole, decimal = ''] =
    normalized.split('.');

  const cents =
    Number(whole) * 100 +
    Number(decimal.padEnd(2, '0'));

  if (!Number.isSafeInteger(cents)) {
    throw createError(
      400,
      'El monto no es válido'
    );
  }

  return cents;
}

function centsToAmount(cents) {
  return (cents / 100).toFixed(2);
}

function configuredLimits() {
  const minimum =
    Number.isFinite(config.speiMinAmount) &&
    config.speiMinAmount > 0
      ? config.speiMinAmount
      : 10;

  const maximum =
    Number.isFinite(config.speiMaxAmount) &&
    config.speiMaxAmount >= minimum
      ? config.speiMaxAmount
      : 50000;

  return {
    minimum,
    maximum
  };
}

function getBankInstructions() {
  const receiverName =
    cleanText(
      config.speiReceiverName,
      180
    );

  const receiverBank =
    cleanText(
      config.speiReceiverBank,
      120
    );

  const receiverAccount =
    normalizeAccount(
      config.speiReceiverAccount
    );

  return {
    configured:
      Boolean(
        receiverName &&
        receiverBank &&
        receiverAccount
      ),

    receiverName,
    receiverBank,
    receiverAccount,
    validatorUrl:
      BANXICO_VALIDATOR_URL,
    ...configuredLimits()
  };
}

function requireBankConfiguration() {
  const instructions =
    getBankInstructions();

  if (!instructions.configured) {
    throw createError(
      503,
      'Las recargas SPEI todavía no están configuradas'
    );
  }

  return instructions;
}

function maskAccount(value) {
  const account =
    normalizeAccount(value);

  if (!account) {
    return null;
  }

  if (account.length <= 4) {
    return account;
  }

  return `${'*'.repeat(
    Math.min(
      account.length - 4,
      10
    )
  )}${account.slice(-4)}`;
}

function decodeXmlEntities(value) {
  return String(value || '')
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&amp;/gi, '&');
}

function getXmlTagAttributes(
  xml,
  tagName
) {
  const tagExpression =
    new RegExp(
      `<(?:[\\w.-]+:)?${tagName}\\b([^>]*)>`,
      'i'
    );

  const tagMatch =
    String(xml || '').match(
      tagExpression
    );

  if (!tagMatch) {
    return {};
  }

  const attributes = {};

  const attributeExpression =
    /([\w:.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;

  let match;

  while (
    (
      match =
        attributeExpression.exec(
          tagMatch[1]
        )
    )
  ) {
    const rawName =
      match[1]
        .split(':')
        .pop();

    attributes[
      rawName.toLowerCase()
    ] =
      decodeXmlEntities(
        match[2] ??
        match[3] ??
        ''
      );
  }

  return attributes;
}

function pickAttribute(
  attributes,
  names
) {
  for (const name of names) {
    const value =
      attributes[
        String(name).toLowerCase()
      ];

    if (
      value !== undefined &&
      value !== null &&
      String(value).trim()
    ) {
      return String(value).trim();
    }
  }

  return null;
}

function normalizeOperationDate(value) {
  const text =
    String(value || '').trim();

  let match =
    text.match(
      /^(\d{4})[-/](\d{2})[-/](\d{2})/
    );

  if (match) {
    return `${match[1]}-${match[2]}-${match[3]}`;
  }

  match =
    text.match(
      /^(\d{2})[-/](\d{2})[-/](\d{4})/
    );

  if (match) {
    return `${match[3]}-${match[2]}-${match[1]}`;
  }

  return null;
}

function parseOperationDate(value) {
  const normalized =
    normalizeOperationDate(value);

  if (!normalized) {
    throw createError(
      400,
      'La fecha de la transferencia no es válida'
    );
  }

  const date =
    new Date(
      `${normalized}T12:00:00.000Z`
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    throw createError(
      400,
      'La fecha de la transferencia no es válida'
    );
  }

  const tomorrow =
    Date.now() +
    24 * 60 * 60 * 1000;

  const oldest =
    Date.now() -
    90 * 24 * 60 * 60 * 1000;

  if (
    date.getTime() > tomorrow ||
    date.getTime() < oldest
  ) {
    throw createError(
      400,
      'La fecha de la transferencia debe estar dentro de los últimos 90 días'
    );
  }

  return {
    date,
    normalized
  };
}

function parseCepFile(value) {
  if (
    !value ||
    typeof value !== 'object'
  ) {
    throw createError(
      400,
      'Adjunta el CEP descargado de Banxico en formato XML'
    );
  }

  const name =
    cleanText(
      value.name,
      180
    );

  let mimeType =
    cleanText(
      value.mimeType,
      100
    ) ||
    'application/xml';

  let base64 =
    String(value.data || '')
      .trim();

  const dataUrlMatch =
    base64.match(
      /^data:([^;,]+)?(?:;charset=[^;,]+)?;base64,(.+)$/is
    );

  if (dataUrlMatch) {
    mimeType =
      String(
        dataUrlMatch[1] ||
        mimeType
      )
        .trim()
        .toLowerCase();

    base64 =
      dataUrlMatch[2];
  }

  base64 =
    base64.replace(
      /\s/g,
      ''
    );

  if (
    !name ||
    !base64
  ) {
    throw createError(
      400,
      'El archivo CEP está incompleto'
    );
  }

  if (
    !name.toLowerCase().endsWith('.xml')
  ) {
    throw createError(
      400,
      'El CEP debe ser el archivo XML descargado de Banxico'
    );
  }

  if (
    ![
      'application/xml',
      'text/xml',
      'application/octet-stream',
      ''
    ].includes(
      String(mimeType).toLowerCase()
    )
  ) {
    throw createError(
      400,
      'El CEP debe estar en formato XML'
    );
  }

  if (
    !/^[A-Za-z0-9+/]*={0,2}$/.test(
      base64
    )
  ) {
    throw createError(
      400,
      'El contenido del CEP no es válido'
    );
  }

  const buffer =
    Buffer.from(
      base64,
      'base64'
    );

  if (!buffer.length) {
    throw createError(
      400,
      'El archivo CEP está vacío'
    );
  }

  if (
    buffer.length >
    MAX_CEP_BYTES
  ) {
    throw createError(
      413,
      'El archivo CEP no puede superar 1 MB'
    );
  }

  const xml =
    buffer
      .toString('utf8')
      .replace(/^\uFEFF/, '')
      .trim();

  if (
    !xml.startsWith('<') ||
    !/<(?:[\w.-]+:)?CEP\b/i.test(xml)
  ) {
    throw createError(
      400,
      'El archivo no parece ser un CEP XML de Banxico'
    );
  }

  if (
    /<!DOCTYPE|<!ENTITY/i.test(xml)
  ) {
    throw createError(
      400,
      'El archivo XML contiene instrucciones no permitidas'
    );
  }

  const root =
    getXmlTagAttributes(
      xml,
      'CEP'
    );

  const beneficiary =
    getXmlTagAttributes(
      xml,
      'Beneficiario'
    );

  const sender =
    getXmlTagAttributes(
      xml,
      'Ordenante'
    );

  const parsed = {
    trackingKey:
      normalizeTrackingKey(
        pickAttribute(
          root,
          [
            'claveRastreo',
            'clave_rastreo'
          ]
        )
      ),

    operationDate:
      normalizeOperationDate(
        pickAttribute(
          root,
          [
            'fechaOperacion',
            'fecha'
          ]
        )
      ),

    amount:
      pickAttribute(
        beneficiary,
        [
          'montoPago',
          'monto'
        ]
      ),

    receiverAccount:
      normalizeAccount(
        pickAttribute(
          beneficiary,
          [
            'cuenta',
            'cuentaBeneficiario'
          ]
        )
      ),

    receiverBank:
      cleanText(
        pickAttribute(
          beneficiary,
          [
            'bancoReceptor',
            'institucionReceptora'
          ]
        ),
        120
      ),

    receiverName:
      cleanText(
        pickAttribute(
          beneficiary,
          ['nombre']
        ),
        180
      ),

    senderAccount:
      normalizeAccount(
        pickAttribute(
          sender,
          ['cuenta']
        )
      ),

    senderBank:
      cleanText(
        pickAttribute(
          sender,
          [
            'bancoEmisor',
            'institucionEmisora'
          ]
        ),
        120
      ),

    senderName:
      cleanText(
        pickAttribute(
          sender,
          ['nombre']
        ),
        180
      )
  };

  if (
    !parsed.trackingKey ||
    !parsed.operationDate ||
    !parsed.amount ||
    !parsed.receiverAccount
  ) {
    throw createError(
      400,
      'No fue posible leer los datos principales del CEP XML'
    );
  }

  return {
    name:
      name
        .replace(/[\\/]/g, '_')
        .replace(/[\u0000-\u001f\u007f]/g, '')
        .slice(0, 180),
    mimeType:
      'application/xml',
    size:
      buffer.length,
    data:
      buffer,
    parsed
  };
}

function serializeWallet(wallet) {
  const balance =
    Number(wallet?.balance || 0);

  const reservedBalance =
    Number(
      wallet?.reservedBalance ||
      0
    );

  return wallet
    ? {
        id:
          wallet.id,
        balance,
        reservedBalance,
        availableBalance:
          balance -
          reservedBalance,
        currency:
          wallet.currency,
        status:
          wallet.status,
        updatedAt:
          wallet.updatedAt
      }
    : null;
}

function serializeTopUp(
  topUp,
  includeClient = false
) {
  const client =
    topUp.User_SpeiTopUp_userIdToUser ||
    topUp.client ||
    null;

  return {
    id:
      topUp.id,
    userId:
      topUp.userId,
    walletId:
      topUp.walletId,
    amount:
      Number(topUp.amount || 0),
    status:
      topUp.status,
    reference:
      topUp.reference,
    trackingKey:
      topUp.trackingKey,
    bankReference:
      topUp.bankReference,
    senderName:
      topUp.senderName,
    senderBank:
      topUp.senderBank,
    senderAccount:
      maskAccount(
        topUp.senderAccount
      ),
    receiverAccount:
      maskAccount(
        topUp.receiverAccount
      ),
    receiverBank:
      topUp.receiverBank,
    operationDate:
      topUp.operationDate,
    requestedAt:
      topUp.requestedAt,
    expiresAt:
      topUp.expiresAt,
    verifiedAt:
      topUp.verifiedAt,
    rejectedReason:
      topUp.rejectedReason,
    reviewNotes:
      topUp.reviewNotes,
    cepLocalMatch:
      Boolean(
        topUp.cepLocalMatch
      ),
    banxicoValidated:
      Boolean(
        topUp.banxicoValidated
      ),
    banxicoValidatedAt:
      topUp.banxicoValidatedAt,
    hasCep:
      Boolean(
        topUp.cepFileName &&
        topUp.cepSize
      ),
    cep:
      topUp.cepFileName
        ? {
            name:
              topUp.cepFileName,
            mimeType:
              topUp.cepMimeType,
            size:
              topUp.cepSize,
            url:
              `/api/wallet/top-ups/${encodeURIComponent(topUp.id)}/cep`
          }
        : null,
    createdAt:
      topUp.createdAt,
    updatedAt:
      topUp.updatedAt,
    client:
      includeClient &&
      client
        ? {
            id:
              client.id,
            name:
              client.name,
            email:
              client.email,
            phone:
              client.phone
          }
        : undefined
  };
}

async function getOrCreateWallet(
  userId,
  client = prisma
) {
  const now =
    new Date();

  return client.wallet.upsert({
    where: {
      userId
    },
    update: {},
    create: {
      id:
        crypto.randomUUID(),
      userId,
      balance:
        '0.00',
      reservedBalance:
        '0.00',
      currency:
        'MXN',
      status:
        'ACTIVE',
      createdAt:
        now,
      updatedAt:
        now
    }
  });
}

async function getMyWallet(userId) {
  const wallet =
    await getOrCreateWallet(
      userId
    );

  const transactions =
    await prisma.walletTransaction.findMany({
      where: {
        walletId:
          wallet.id
      },
      orderBy: {
        createdAt:
          'desc'
      },
      take:
        30
    });

  return {
    wallet:
      serializeWallet(
        wallet
      ),
    bankInstructions:
      getBankInstructions(),
    transactions:
      transactions.map(
        item => ({
          id:
            item.id,
          type:
            item.type,
          status:
            item.status,
          amount:
            Number(item.amount || 0),
          balanceBefore:
            Number(item.balanceBefore || 0),
          balanceAfter:
            Number(item.balanceAfter || 0),
          reference:
            item.reference,
          concept:
            item.concept,
          createdAt:
            item.createdAt
        })
      )
  };
}

async function createTopUp(
  userId,
  payload = {}
) {
  const bank =
    requireBankConfiguration();

  const amountCents =
    amountToCents(
      payload.amount
    );

  const minimumCents =
    Math.round(
      bank.minimum * 100
    );

  const maximumCents =
    Math.round(
      bank.maximum * 100
    );

  if (
    amountCents < minimumCents ||
    amountCents > maximumCents
  ) {
    throw createError(
      400,
      `La recarga debe ser de ${bank.minimum} a ${bank.maximum} pesos`
    );
  }

  const wallet =
    await getOrCreateWallet(
      userId
    );

  if (
    wallet.status !==
    'ACTIVE'
  ) {
    throw createError(
      403,
      'La cartera del cliente no está activa'
    );
  }

  const now =
    new Date();

  const expiresAt =
    new Date(
      now.getTime() +
      24 * 60 * 60 * 1000
    );

  const reference =
    `RL-${now
      .toISOString()
      .slice(0, 10)
      .replace(/-/g, '')}-${crypto
      .randomUUID()
      .replace(/-/g, '')
      .slice(0, 8)
      .toUpperCase()}`;

  const topUp =
    await prisma.speiTopUp.create({
      data: {
        id:
          crypto.randomUUID(),
        userId,
        walletId:
          wallet.id,
        amount:
          centsToAmount(
            amountCents
          ),
        status:
          'PENDING',
        reference,
        receiverAccount:
          bank.receiverAccount,
        receiverBank:
          bank.receiverBank,
        requestedAt:
          now,
        expiresAt,
        createdAt:
          now,
        updatedAt:
          now,
        metadata: {
          receiverName:
            bank.receiverName
        }
      }
    });

  return {
    topUp:
      serializeTopUp(
        topUp
      ),
    bankInstructions:
      bank
  };
}

async function listMyTopUps(
  userId,
  query = {}
) {
  const page =
    Math.max(
      1,
      Number.parseInt(
        query.page,
        10
      ) || 1
    );

  const pageSize =
    Math.min(
      100,
      Math.max(
        1,
        Number.parseInt(
          query.pageSize,
          10
        ) || 30
      )
    );

  const where = {
    userId
  };

  const [items, total] =
    await Promise.all([
      prisma.speiTopUp.findMany({
        where,
        orderBy: {
          createdAt:
            'desc'
        },
        skip:
          (page - 1) *
          pageSize,
        take:
          pageSize
      }),

      prisma.speiTopUp.count({
        where
      })
    ]);

  return {
    items:
      items.map(
        item =>
          serializeTopUp(
            item
          )
      ),
    total,
    page,
    pageSize
  };
}

async function submitTopUp(
  userId,
  topUpId,
  payload = {}
) {
  const topUp =
    await prisma.speiTopUp.findFirst({
      where: {
        id:
          topUpId,
        userId
      }
    });

  if (!topUp) {
    throw createError(
      404,
      'La solicitud de recarga no existe'
    );
  }

  if (
    ![
      'PENDING',
      'REJECTED'
    ].includes(
      topUp.status
    )
  ) {
    throw createError(
      409,
      'Esta solicitud ya fue enviada o procesada'
    );
  }

  const trackingKey =
    normalizeTrackingKey(
      payload.trackingKey
    );

  if (
    trackingKey.length < 5
  ) {
    throw createError(
      400,
      'Escribe una clave de rastreo válida'
    );
  }

  const operation =
    parseOperationDate(
      payload.operationDate
    );

  const cep =
    parseCepFile(
      payload.cep
    );

  const duplicate =
    await prisma.speiTopUp.findFirst({
      where: {
        trackingKey,
        id: {
          not:
            topUp.id
        }
      },
      select: {
        id: true
      }
    });

  if (duplicate) {
    throw createError(
      409,
      'Esta clave de rastreo ya fue registrada'
    );
  }

  const expectedAccount =
    normalizeAccount(
      topUp.receiverAccount ||
      config.speiReceiverAccount
    );

  const amountMatches =
    amountToCents(
      cep.parsed.amount
    ) ===
    amountToCents(
      topUp.amount
    );

  const trackingMatches =
    cep.parsed.trackingKey ===
    trackingKey;

  const dateMatches =
    cep.parsed.operationDate ===
    operation.normalized;

  const accountMatches =
    Boolean(expectedAccount) &&
    cep.parsed.receiverAccount ===
      expectedAccount;

  const configuredBank =
    normalizeWords(
      config.speiReceiverBank
    );

  const cepBank =
    normalizeWords(
      cep.parsed.receiverBank
    );

  const bankMatches =
    !configuredBank ||
    !cepBank ||
    configuredBank.includes(
      cepBank
    ) ||
    cepBank.includes(
      configuredBank
    );

  const cepLocalMatch =
    amountMatches &&
    trackingMatches &&
    dateMatches &&
    accountMatches;

  if (!cepLocalMatch) {
    const differences = [];

    if (!amountMatches) {
      differences.push(
        'monto'
      );
    }

    if (!trackingMatches) {
      differences.push(
        'clave de rastreo'
      );
    }

    if (!dateMatches) {
      differences.push(
        'fecha'
      );
    }

    if (!accountMatches) {
      differences.push(
        'cuenta beneficiaria'
      );
    }

    throw createError(
      400,
      `El CEP no coincide con la solicitud: ${differences.join(', ')}`
    );
  }

  const now =
    new Date();

  const existingMetadata =
    topUp.metadata &&
    typeof topUp.metadata === 'object' &&
    !Array.isArray(topUp.metadata)
      ? topUp.metadata
      : {};

  const updated =
    await prisma.speiTopUp.update({
      where: {
        id:
          topUp.id
      },
      data: {
        status:
          'REVIEW',
        trackingKey,
        bankReference:
          cleanText(
            payload.bankReference,
            100
          ),
        senderName:
          cep.parsed.senderName ||
          cleanText(
            payload.senderName,
            180
          ),
        senderBank:
          cep.parsed.senderBank ||
          cleanText(
            payload.senderBank,
            120
          ),
        senderAccount:
          cep.parsed.senderAccount ||
          normalizeAccount(
            payload.senderAccount
          ) ||
          null,
        receiverAccount:
          cep.parsed.receiverAccount,
        receiverBank:
          cep.parsed.receiverBank ||
          config.speiReceiverBank ||
          null,
        operationDate:
          operation.date,
        cepFileName:
          cep.name,
        cepMimeType:
          cep.mimeType,
        cepSize:
          cep.size,
        cepData:
          cep.data,
        cepLocalMatch:
          true,
        banxicoValidated:
          false,
        banxicoValidatedAt:
          null,
        rejectedReason:
          null,
        reviewNotes:
          bankMatches
            ? null
            : 'El nombre del banco receptor requiere revisión manual',
        metadata: {
          ...existingMetadata,
          cepSummary: {
            trackingKey:
              cep.parsed.trackingKey,
            operationDate:
              cep.parsed.operationDate,
            amount:
              cep.parsed.amount,
            receiverAccountLast4:
              cep.parsed.receiverAccount.slice(-4),
            receiverBank:
              cep.parsed.receiverBank,
            receiverName:
              cep.parsed.receiverName,
            senderBank:
              cep.parsed.senderBank,
            bankNameMatches:
              bankMatches
          }
        },
        updatedAt:
          now
      }
    });

  return serializeTopUp(
    updated
  );
}

async function cancelMyTopUp(
  userId,
  topUpId
) {
  const result =
    await prisma.speiTopUp.updateMany({
      where: {
        id:
          topUpId,
        userId,
        status:
          'PENDING'
      },
      data: {
        status:
          'CANCELLED',
        updatedAt:
          new Date()
      }
    });

  if (!result.count) {
    throw createError(
      409,
      'Solo puedes cancelar una solicitud pendiente'
    );
  }

  const updated =
    await prisma.speiTopUp.findUnique({
      where: {
        id:
          topUpId
      }
    });

  return serializeTopUp(
    updated
  );
}

async function listTopUps(
  query = {}
) {
  const page =
    Math.max(
      1,
      Number.parseInt(
        query.page,
        10
      ) || 1
    );

  const pageSize =
    Math.min(
      100,
      Math.max(
        1,
        Number.parseInt(
          query.pageSize,
          10
        ) || 50
      )
    );

  const status =
    String(
      query.status || ''
    )
      .trim()
      .toUpperCase();

  const where = {};

  if (
    TOP_UP_STATUSES.includes(
      status
    )
  ) {
    where.status =
      status;
  }

  const [items, total] =
    await Promise.all([
      prisma.speiTopUp.findMany({
        where,
        include: {
          User_SpeiTopUp_userIdToUser: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true
            }
          }
        },
        orderBy: {
          createdAt:
            'desc'
        },
        skip:
          (page - 1) *
          pageSize,
        take:
          pageSize
      }),

      prisma.speiTopUp.count({
        where
      })
    ]);

  return {
    items:
      items.map(
        item =>
          serializeTopUp(
            item,
            true
          )
      ),
    total,
    page,
    pageSize,
    validatorUrl:
      BANXICO_VALIDATOR_URL
  };
}

async function approveTopUp(
  topUpId,
  adminId,
  payload = {}
) {
  if (
    payload.banxicoValidated !==
    true
  ) {
    throw createError(
      400,
      'Confirma que validaste el CEP en el portal oficial de Banxico'
    );
  }

  return prisma.$transaction(
    async transaction => {
      const topUp =
        await transaction.speiTopUp.findUnique({
          where: {
            id:
              topUpId
          }
        });

      if (!topUp) {
        throw createError(
          404,
          'La solicitud de recarga no existe'
        );
      }

      if (
        topUp.status ===
        'APPROVED'
      ) {
        return {
          topUp:
            serializeTopUp(
              topUp
            ),
          alreadyApproved:
            true
        };
      }

      if (
        topUp.status !==
          'REVIEW' ||
        !topUp.cepLocalMatch ||
        !topUp.cepData
      ) {
        throw createError(
          409,
          'La recarga todavía no tiene un CEP coincidente listo para revisión'
        );
      }

      const now =
        new Date();

      const claimed =
        await transaction.speiTopUp.updateMany({
          where: {
            id:
              topUp.id,
            status:
              'REVIEW',
            cepLocalMatch:
              true
          },
          data: {
            status:
              'APPROVED',
            banxicoValidated:
              true,
            banxicoValidatedAt:
              now,
            verifiedAt:
              now,
            verifiedById:
              adminId,
            reviewNotes:
              cleanText(
                payload.reviewNotes,
                1000
              ),
            rejectedReason:
              null,
            updatedAt:
              now
          }
        });

      if (!claimed.count) {
        const latest =
          await transaction.speiTopUp.findUnique({
            where: {
              id:
                topUp.id
            }
          });

        if (
          latest?.status ===
          'APPROVED'
        ) {
          return {
            topUp:
              serializeTopUp(
                latest
              ),
            alreadyApproved:
              true
          };
        }

        throw createError(
          409,
          'La recarga fue modificada mientras se procesaba'
        );
      }

      const wallet =
        await transaction.wallet.update({
          where: {
            id:
              topUp.walletId
          },
          data: {
            balance: {
              increment:
                topUp.amount
            },
            updatedAt:
              now
          }
        });

      const balanceAfter =
        wallet.balance;

      const balanceBefore =
        balanceAfter.minus(
          topUp.amount
        );

      await transaction.walletTransaction.create({
        data: {
          id:
            crypto.randomUUID(),
          walletId:
            wallet.id,
          actorUserId:
            adminId,
          type:
            'SPEI_RECHARGE',
          status:
            'COMPLETED',
          amount:
            topUp.amount,
          balanceBefore,
          balanceAfter,
          reference:
            topUp.reference,
          concept:
            'Recarga SPEI validada con CEP',
          speiTopUpId:
            topUp.id,
          metadata: {
            trackingKey:
              topUp.trackingKey,
            banxicoValidatedManually:
              true
          },
          createdAt:
            now
        }
      });

      const approved =
        await transaction.speiTopUp.findUnique({
          where: {
            id:
              topUp.id
          }
        });

      return {
        topUp:
          serializeTopUp(
            approved
          ),
        wallet:
          serializeWallet(
            wallet
          ),
        alreadyApproved:
          false
      };
    },
    {
      isolationLevel:
        'Serializable'
    }
  );
}

async function rejectTopUp(
  topUpId,
  adminId,
  payload = {}
) {
  const reason =
    cleanText(
      payload.reason,
      1000
    );

  if (!reason) {
    throw createError(
      400,
      'Escribe el motivo del rechazo'
    );
  }

  const updated =
    await prisma.speiTopUp.updateMany({
      where: {
        id:
          topUpId,
        status: {
          in: [
            'PENDING',
            'REVIEW'
          ]
        }
      },
      data: {
        status:
          'REJECTED',
        rejectedReason:
          reason,
        reviewNotes:
          cleanText(
            payload.reviewNotes,
            1000
          ),
        verifiedById:
          adminId,
        banxicoValidated:
          false,
        banxicoValidatedAt:
          null,
        updatedAt:
          new Date()
      }
    });

  if (!updated.count) {
    throw createError(
      409,
      'La recarga ya fue procesada o no existe'
    );
  }

  const topUp =
    await prisma.speiTopUp.findUnique({
      where: {
        id:
          topUpId
      }
    });

  return serializeTopUp(
    topUp
  );
}

async function getTopUpCep(
  topUpId,
  user
) {
  const topUp =
    await prisma.speiTopUp.findUnique({
      where: {
        id:
          topUpId
      },
      select: {
        id: true,
        userId: true,
        cepFileName: true,
        cepMimeType: true,
        cepSize: true,
        cepData: true
      }
    });

  if (!topUp) {
    throw createError(
      404,
      'La solicitud de recarga no existe'
    );
  }

  const isAdmin =
    [
      'SUPER_ADMIN',
      'ADMIN'
    ].includes(
      user?.role
    );

  if (
    !isAdmin &&
    topUp.userId !==
      user?.id
  ) {
    throw createError(
      403,
      'No tienes permiso para consultar este CEP'
    );
  }

  if (
    !topUp.cepData ||
    !topUp.cepFileName
  ) {
    throw createError(
      404,
      'Esta solicitud no tiene un CEP adjunto'
    );
  }

  return {
    name:
      topUp.cepFileName,
    mimeType:
      topUp.cepMimeType ||
      'application/xml',
    size:
      topUp.cepSize ||
      topUp.cepData.length,
    data:
      topUp.cepData
  };
}

module.exports = {
  getMyWallet,
  createTopUp,
  listMyTopUps,
  submitTopUp,
  cancelMyTopUp,
  listTopUps,
  approveTopUp,
  rejectTopUp,
  getTopUpCep
};
