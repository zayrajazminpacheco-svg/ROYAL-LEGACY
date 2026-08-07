const prisma = require('../lib/prisma');

function extractCode(text = '') {
  const patterns = [
    /\b\d{4,8}\b/,
    /\b[A-Z0-9]{6,8}\b/
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[0];
    }
  }

  return null;
}

function extractLink(text = '') {
  const match = text.match(/https?:\/\/[^\s"'<>]+/i);
  return match ? match[0] : null;
}

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

    const content = [
      subject || '',
      text || '',
      html || ''
    ].join('\n');

    const code = extractCode(content);
    const link = extractLink(content);

    const preview = String(
      text || subject || ''
    ).slice(0, 500);

    const message = await prisma.inboxMessage.create({
      data: {
        emailAliasId: alias.id,
        externalMessageId: messageId || null,
        sender: from || null,
        recipient,
        subject: subject || null,
        bodyPreview: preview || null,

        // Temporalmente se guarda así.
        // Después conectaremos cifrado real.
        bodyEncrypted: content || null,

        verificationCodeEncrypted: code || null,

        processed: Boolean(code || link),
        receivedAt: new Date()
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Email received successfully',
      data: {
        id: message.id,
        recipient,
        subject: message.subject,
        code,
        link
      }
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  receiveEmail
};