const { v4: uuidv4 } = require('uuid');
const prisma = require('../lib/prisma');

const REPORT_TYPES = [
  'ACCESS',
  'PASSWORD',
  'CODE',
  'PROFILE',
  'EXPIRATION',
  'PAYMENT',
  'OTHER'
];

const REPORT_STATUSES = [
  'OPEN',
  'IN_REVIEW',
  'WAITING_CLIENT',
  'RESOLVED',
  'CLOSED'
];

const REPORT_PRIORITIES = [
  'LOW',
  'NORMAL',
  'HIGH',
  'URGENT'
];

const ALLOWED_ATTACHMENT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf'
];

const MAX_ATTACHMENT_BYTES =
  2 * 1024 * 1024;

function createError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function cleanText(
  value,
  maxLength
) {
  const text =
    String(value || '').trim();

  return text
    ? text.slice(0, maxLength)
    : null;
}

function parsePositiveInteger(
  value,
  fallback
) {
  const parsed =
    Number.parseInt(value, 10);

  return Number.isFinite(parsed) &&
    parsed > 0
    ? parsed
    : fallback;
}

function getReportSelect() {
  return {
    id: true,
    clientId: true,
    saleId: true,
    saleItemId: true,
    type: true,
    subject: true,
    description: true,
    status: true,
    priority: true,
    adminResponse: true,
    attachmentName: true,
    attachmentMimeType: true,
    attachmentSize: true,
    createdAt: true,
    updatedAt: true,
    resolvedAt: true,

    User: {
      select: {
        id: true,
        name: true,
        email: true,
        phone: true
      }
    },

    Sale: {
      select: {
        id: true,
        status: true,
        paymentStatus: true,
        total: true,
        createdAt: true
      }
    },

    SaleItem: {
      select: {
        id: true,
        quantity: true,
        unitPrice: true,

        ProductVariant: {
          select: {
            id: true,
            publicName: true,
            accessType: true,
            durationDays: true,

            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                imageUrl: true
              }
            }
          }
        }
      }
    }
  };
}

function serializeReport(report) {
  const saleItem =
    report.SaleItem ||
    null;

  const variant =
    saleItem?.ProductVariant ||
    null;

  const product =
    variant?.product ||
    null;

  return {
    id:
      report.id,

    clientId:
      report.clientId,

    saleId:
      report.saleId,

    saleItemId:
      report.saleItemId,

    type:
      report.type,

    subject:
      report.subject,

    description:
      report.description,

    status:
      report.status,

    priority:
      report.priority,

    adminResponse:
      report.adminResponse,

    createdAt:
      report.createdAt,

    updatedAt:
      report.updatedAt,

    resolvedAt:
      report.resolvedAt,

    hasAttachment:
      Boolean(
        report.attachmentName &&
        report.attachmentMimeType &&
        report.attachmentSize
      ),

    attachment:
      report.attachmentName
        ? {
            name:
              report.attachmentName,

            mimeType:
              report.attachmentMimeType,

            size:
              report.attachmentSize,

            url:
              `/api/reports/${encodeURIComponent(report.id)}/attachment`
          }
        : null,

    client:
      report.User ||
      null,

    purchase:
      report.Sale ||
      null,

    item:
      saleItem
        ? {
            id:
              saleItem.id,

            quantity:
              saleItem.quantity,

            unitPrice:
              saleItem.unitPrice,

            variant:
              variant
                ? {
                    id:
                      variant.id,

                    publicName:
                      variant.publicName,

                    accessType:
                      variant.accessType,

                    durationDays:
                      variant.durationDays
                  }
                : null,

            product:
              product
                ? {
                    id:
                      product.id,

                    name:
                      product.name,

                    slug:
                      product.slug,

                    imageUrl:
                      product.imageUrl
                  }
                : null
          }
        : null
  };
}

function parseAttachment(value) {
  if (!value) {
    return {
      attachmentName: null,
      attachmentMimeType: null,
      attachmentSize: null,
      attachmentData: null
    };
  }

  if (
    typeof value !==
    'object'
  ) {
    throw createError(
      400,
      'El archivo adjunto no es válido'
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
    );

  let base64 =
    String(
      value.data || ''
    ).trim();

  const dataUrlMatch =
    base64.match(
      /^data:([^;]+);base64,(.+)$/s
    );

  if (dataUrlMatch) {
    mimeType =
      dataUrlMatch[1]
        .trim()
        .toLowerCase();

    base64 =
      dataUrlMatch[2]
        .replace(/\s/g, '');

  } else {
    base64 =
      base64.replace(
        /\s/g,
        ''
      );
  }

  mimeType =
    String(
      mimeType || ''
    ).toLowerCase();

  if (
    !name ||
    !mimeType ||
    !base64
  ) {
    throw createError(
      400,
      'El archivo adjunto está incompleto'
    );
  }

  if (
    !ALLOWED_ATTACHMENT_TYPES.includes(
      mimeType
    )
  ) {
    throw createError(
      400,
      'Solo se permiten imágenes JPG, PNG, WEBP o archivos PDF'
    );
  }

  if (
    !/^[A-Za-z0-9+/]*={0,2}$/.test(
      base64
    )
  ) {
    throw createError(
      400,
      'El contenido del archivo no es válido'
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
      'El archivo está vacío'
    );
  }

  if (
    buffer.length >
    MAX_ATTACHMENT_BYTES
  ) {
    throw createError(
      413,
      'El archivo no puede superar 2 MB'
    );
  }

  const safeName =
    name
      .replace(
        /[\\/]/g,
        '_'
      )
      .replace(
        /[\u0000-\u001f\u007f]/g,
        ''
      )
      .slice(
        0,
        180
      );

  return {
    attachmentName:
      safeName ||
      'archivo',

    attachmentMimeType:
      mimeType,

    attachmentSize:
      buffer.length,

    attachmentData:
      buffer
  };
}

async function validateOwnedPurchase(
  clientId,
  saleId,
  saleItemId
) {
  const sale =
    await prisma.sale.findFirst({
      where: {
        id:
          saleId,

        clientId
      },

      include: {
        items: {
          select: {
            id: true
          }
        }
      }
    });

  if (!sale) {
    throw createError(
      404,
      'La compra seleccionada no fue encontrada'
    );
  }

  if (saleItemId) {
    const itemBelongsToSale =
      sale.items.some(
        item =>
          item.id ===
          saleItemId
      );

    if (!itemBelongsToSale) {
      throw createError(
        404,
        'El producto seleccionado no pertenece a esta compra'
      );
    }
  }

  return sale;
}

// ============================================================
// CLIENTE: LISTAR MIS REPORTES
// ============================================================

async function listMyReports(
  clientId,
  query = {}
) {
  const page =
    parsePositiveInteger(
      query.page,
      1
    );

  const pageSize =
    Math.min(
      parsePositiveInteger(
        query.pageSize,
        20
      ),
      50
    );

  const where = {
    clientId
  };

  if (query.status) {
    const status =
      String(
        query.status
      )
        .trim()
        .toUpperCase();

    if (
      !REPORT_STATUSES.includes(
        status
      )
    ) {
      throw createError(
        400,
        'Estado de reporte no válido'
      );
    }

    where.status =
      status;
  }

  const [items, total] =
    await Promise.all([
      prisma.supportReport.findMany({
        where,

        select:
          getReportSelect(),

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

      prisma.supportReport.count({
        where
      })
    ]);

  return {
    items:
      items.map(
        serializeReport
      ),

    total,
    page,
    pageSize,

    totalPages:
      total === 0
        ? 0
        : Math.ceil(
            total /
            pageSize
          )
  };
}

// ============================================================
// CLIENTE: VER UN REPORTE PROPIO
// ============================================================

async function getMyReport(
  id,
  clientId
) {
  const report =
    await prisma.supportReport.findFirst({
      where: {
        id,
        clientId
      },

      select:
        getReportSelect()
    });

  if (!report) {
    throw createError(
      404,
      'Reporte no encontrado'
    );
  }

  return serializeReport(
    report
  );
}

// ============================================================
// CLIENTE: CREAR REPORTE
// ============================================================

async function createMyReport(
  clientId,
  payload = {}
) {
  const saleId =
    String(
      payload.saleId || ''
    ).trim();

  const saleItemId =
    payload.saleItemId
      ? String(
          payload.saleItemId
        ).trim()
      : null;

  const type =
    String(
      payload.type ||
      'OTHER'
    )
      .trim()
      .toUpperCase();

  const subject =
    cleanText(
      payload.subject,
      120
    );

  const description =
    cleanText(
      payload.description,
      3000
    );

  if (!saleId) {
    throw createError(
      400,
      'Selecciona la compra relacionada con el reporte'
    );
  }

  if (
    !REPORT_TYPES.includes(
      type
    )
  ) {
    throw createError(
      400,
      'Tipo de reporte no válido'
    );
  }

  if (
    !description ||
    description.length < 10
  ) {
    throw createError(
      400,
      'Describe el problema con al menos 10 caracteres'
    );
  }

  await validateOwnedPurchase(
    clientId,
    saleId,
    saleItemId
  );

  const openReports =
    await prisma.supportReport.count({
      where: {
        clientId,
        saleId,

        status: {
          in: [
            'OPEN',
            'IN_REVIEW',
            'WAITING_CLIENT'
          ]
        }
      }
    });

  if (
    openReports >= 5
  ) {
    throw createError(
      429,
      'Ya tienes varias solicitudes abiertas para esta compra'
    );
  }

  const attachment =
    parseAttachment(
      payload.attachment
    );

  const report =
    await prisma.supportReport.create({
      data: {
        id:
          uuidv4(),

        clientId,
        saleId,
        saleItemId,
        type,
        subject,
        description,

        status:
          'OPEN',

        priority:
          'NORMAL',

        ...attachment,

        updatedAt:
          new Date()
      },

      select:
        getReportSelect()
    });

  return serializeReport(
    report
  );
}

// ============================================================
// ADMINISTRACIÓN: LISTAR REPORTES
// ============================================================

async function listReports(
  query = {}
) {
  const page =
    parsePositiveInteger(
      query.page,
      1
    );

  const pageSize =
    Math.min(
      parsePositiveInteger(
        query.pageSize,
        25
      ),
      100
    );

  const where = {};

  if (query.status) {
    const status =
      String(
        query.status
      )
        .trim()
        .toUpperCase();

    if (
      !REPORT_STATUSES.includes(
        status
      )
    ) {
      throw createError(
        400,
        'Estado de reporte no válido'
      );
    }

    where.status =
      status;
  }

  if (query.type) {
    const type =
      String(
        query.type
      )
        .trim()
        .toUpperCase();

    if (
      !REPORT_TYPES.includes(
        type
      )
    ) {
      throw createError(
        400,
        'Tipo de reporte no válido'
      );
    }

    where.type =
      type;
  }

  if (query.clientId) {
    where.clientId =
      String(
        query.clientId
      );
  }

  if (query.saleId) {
    where.saleId =
      String(
        query.saleId
      );
  }

  const [items, total] =
    await Promise.all([
      prisma.supportReport.findMany({
        where,

        select:
          getReportSelect(),

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

      prisma.supportReport.count({
        where
      })
    ]);

  return {
    items:
      items.map(
        serializeReport
      ),

    total,
    page,
    pageSize,

    totalPages:
      total === 0
        ? 0
        : Math.ceil(
            total /
            pageSize
          )
  };
}

// ============================================================
// ADMINISTRACIÓN: VER REPORTE
// ============================================================

async function getReport(id) {
  const report =
    await prisma.supportReport.findUnique({
      where: {
        id
      },

      select:
        getReportSelect()
    });

  if (!report) {
    throw createError(
      404,
      'Reporte no encontrado'
    );
  }

  return serializeReport(
    report
  );
}

// ============================================================
// ADMINISTRACIÓN: ACTUALIZAR REPORTE
// ============================================================

async function updateReport(
  id,
  payload = {}
) {
  const existing =
    await prisma.supportReport.findUnique({
      where: {
        id
      },

      select: {
        id: true,
        status: true,
        priority: true,
        adminResponse: true
      }
    });

  if (!existing) {
    throw createError(
      404,
      'Reporte no encontrado'
    );
  }

  const data = {
    updatedAt:
      new Date()
  };

  if (
    payload.status !== undefined
  ) {
    const status =
      String(
        payload.status
      )
        .trim()
        .toUpperCase();

    if (
      !REPORT_STATUSES.includes(
        status
      )
    ) {
      throw createError(
        400,
        'Estado de reporte no válido'
      );
    }

    data.status =
      status;

    data.resolvedAt =
      [
        'RESOLVED',
        'CLOSED'
      ].includes(
        status
      )
        ? new Date()
        : null;
  }

  if (
    payload.priority !== undefined
  ) {
    const priority =
      String(
        payload.priority
      )
        .trim()
        .toUpperCase();

    if (
      !REPORT_PRIORITIES.includes(
        priority
      )
    ) {
      throw createError(
        400,
        'Prioridad de reporte no válida'
      );
    }

    data.priority =
      priority;
  }

  if (
    payload.adminResponse !==
    undefined
  ) {
    data.adminResponse =
      cleanText(
        payload.adminResponse,
        3000
      );
  }

  const updated =
    await prisma.supportReport.update({
      where: {
        id
      },

      data,

      select:
        getReportSelect()
    });

  return serializeReport(
    updated
  );
}

// ============================================================
// DESCARGAR ADJUNTO PROTEGIDO
// ============================================================

async function getReportAttachment(
  id,
  user
) {
  const report =
    await prisma.supportReport.findUnique({
      where: {
        id
      },

      select: {
        id: true,
        clientId: true,
        attachmentName: true,
        attachmentMimeType: true,
        attachmentSize: true,
        attachmentData: true
      }
    });

  if (!report) {
    throw createError(
      404,
      'Reporte no encontrado'
    );
  }

  const isAdministrator =
    [
      'SUPER_ADMIN',
      'ADMIN'
    ].includes(
      user?.role
    );

  const isOwner =
    user?.role ===
      'CLIENT' &&
    report.clientId ===
      user.id;

  if (
    !isAdministrator &&
    !isOwner
  ) {
    throw createError(
      404,
      'Archivo no encontrado'
    );
  }

  if (
    !report.attachmentData ||
    !report.attachmentMimeType
  ) {
    throw createError(
      404,
      'Este reporte no tiene archivo adjunto'
    );
  }

  return {
    name:
      report.attachmentName ||
      'archivo',

    mimeType:
      report.attachmentMimeType,

    size:
      report.attachmentSize,

    data:
      Buffer.from(
        report.attachmentData
      )
  };
}

// ============================================================
// EXPORTAR
// ============================================================

module.exports = {
  REPORT_TYPES,
  REPORT_STATUSES,
  REPORT_PRIORITIES,
  MAX_ATTACHMENT_BYTES,
  listMyReports,
  getMyReport,
  createMyReport,
  listReports,
  getReport,
  updateReport,
  getReportAttachment
};