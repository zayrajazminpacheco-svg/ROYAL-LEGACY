const prisma = require('../lib/prisma');

function extractCode(text = '') {
  const patterns = [
    /\b\d{4,8}\b/,
    /\b[A-Z0-9]{6,8}\b/
  ];

  for (const pattern of patterns) {
    const match = String(text).match(pattern);

    if (match) {
      return match[0];
    }
  }

  return null;
}

function extractLink(text = '') {
  const match = String(text).match(
    /https?:\/\/[^\s"'<>]+/i
  );

  return match ? match[0] : null;
}


// ==========================================
// RECIBIR CORREO DESDE CLOUDFLARE
// ==========================================

async function receiveEmail(req, res, next) {
  try {
    const {
      from,
      to,
      subject,
      text,
      html,
      messageId
    } = req.body || {};

    if (!to) {
      return res.status(400).json({
        success: false,
        message: 'Recipient email is required'
      });
    }

    const recipient = String(to)
      .trim()
      .toLowerCase();

    // ------------------------------------------
    // 1. Buscar alias que recibió el correo
    // ------------------------------------------

    const alias = await prisma.emailAlias.findUnique({
      where: {
        fullAddress: recipient
      }
    });

    if (!alias) {
      return res.status(404).json({
        success: false,
        message: 'Email alias not found'
      });
    }

    // ------------------------------------------
    // 2. Preparar contenido
    // ------------------------------------------

    const content = [
      subject || '',
      text || '',
      html || ''
    ].join('\n');

    const code = extractCode(content);
    const link = extractLink(content);

    const preview = String(
      text ||
      subject ||
      ''
    ).slice(0, 500);

    // ------------------------------------------
    // 3. Guardar mensaje recibido
    // ------------------------------------------

    const inboxMessage =
      await prisma.inboxMessage.create({
        data: {
          emailAliasId: alias.id,

          externalMessageId:
            messageId || null,

          sender:
            from || null,

          recipient,

          subject:
            subject || null,

          bodyPreview:
            preview || null,

          // Temporalmente guardamos el contenido
          // directamente.
          // Después puede conectarse cifrado real.
          bodyEncrypted:
            content || null,

          verificationCodeEncrypted:
            code || null,

          processed:
            Boolean(code || link),

          receivedAt:
            new Date()
        }
      });

    // ------------------------------------------
    // 4. Si detectamos código, buscar si este
    // correo está asignado a inventario
    // ------------------------------------------

    let codeRequestUpdated = null;

    if (code) {
      const inventoryAlias =
        await prisma.inventoryAlias.findFirst({
          where: {
            emailAliasId: alias.id,
            active: true
          },
          orderBy: {
            assignedAt: 'desc'
          }
        });

      // ----------------------------------------
      // 5. Buscar solicitud PENDING de ese item
      // ----------------------------------------

      if (inventoryAlias) {
        const pendingCodeRequest =
          await prisma.codeRequest.findFirst({
            where: {
              inventoryItemId:
                inventoryAlias.inventoryItemId,

              status: 'PENDING'
            },
            orderBy: {
              requestedAt: 'desc'
            }
          });

        // --------------------------------------
        // 6. Cambiar automáticamente a RECEIVED
        // --------------------------------------

        if (pendingCodeRequest) {
          codeRequestUpdated =
            await prisma.codeRequest.update({
              where: {
                id: pendingCodeRequest.id
              },

              data: {
                codeEncrypted: code,
                status: 'RECEIVED',
                receivedAt: new Date()
              }
            });

          console.log(
            `Código ${code} asociado automáticamente a CodeRequest ${pendingCodeRequest.id}`
          );
        } else {
          console.log(
            `Se detectó código ${code}, pero no existe una solicitud PENDING para el inventario ${inventoryAlias.inventoryItemId}`
          );
        }
      } else {
        console.log(
          `Se detectó código ${code}, pero el correo ${recipient} no está asignado a un artículo de inventario`
        );
      }
    }

    // ------------------------------------------
    // 7. Respuesta al Worker
    // ------------------------------------------

    return res.status(201).json({
      success: true,
      message: 'Email received successfully',

      data: {
        id: inboxMessage.id,
        recipient,
        subject: inboxMessage.subject,
        code,
        link,

        codeRequest: codeRequestUpdated
          ? {
              id: codeRequestUpdated.id,
              status: codeRequestUpdated.status,
              inventoryItemId:
                codeRequestUpdated.inventoryItemId
            }
          : null
      }
    });

  } catch (error) {
    console.error(
      'Error receiving email:',
      error
    );

    next(error);
  }
}


// ==========================================
// CONSULTAR BANDEJA DE UN CORREO
// ==========================================

async function getInbox(req, res, next) {
  try {
    const email = String(
      req.query?.email || ''
    )
      .trim()
      .toLowerCase();

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    const alias =
      await prisma.emailAlias.findUnique({
        where: {
          fullAddress: email
        }
      });

    if (!alias) {
      return res.status(404).json({
        success: false,
        message: 'Email alias not found'
      });
    }

    const messages =
      await prisma.inboxMessage.findMany({
        where: {
          emailAliasId: alias.id
        },

        orderBy: {
          receivedAt: 'desc'
        },

        take: 100
      });

    return res.status(200).json({
      success: true,
      email,
      count: messages.length,
      data: messages
    });

  } catch (error) {
    next(error);
  }
}


// ==========================================
// EXPORTAR
// ==========================================

module.exports = {
  receiveEmail,
  getInbox
};