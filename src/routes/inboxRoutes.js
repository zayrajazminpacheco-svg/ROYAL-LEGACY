const express = require('express');
const inboxController = require('../controllers/inboxController');

const {
  authenticateToken,
  authorizeRoles
} = require('../middlewares/auth');

const router = express.Router();


// ==========================================
// SECRETO DEL WEBHOOK
// ==========================================

const FALLBACK_INBOX_SECRET =
  'RoyalLegacyInbox2026_X9m4K7p2L8';


function verifyInboxSecret(req, res, next) {

  const configuredSecret =
    String(
      process.env.INBOX_WEBHOOK_SECRET ||
      FALLBACK_INBOX_SECRET
    ).trim();

  const receivedSecret =
    String(
      req.headers['x-inbox-secret'] || ''
    ).trim();


  if (!receivedSecret) {

    console.error(
      '[INBOX] Cloudflare no envió x-inbox-secret'
    );

    return res.status(401).json({
      success: false,
      message: 'Inbox webhook secret was not received'
    });
  }


  if (receivedSecret !== configuredSecret) {

    console.error(
      '[INBOX] Secret incorrecto'
    );

    return res.status(401).json({
      success: false,
      message: 'Invalid inbox webhook secret'
    });
  }


  console.log(
    '[INBOX] Webhook autorizado'
  );

  next();
}


// ==========================================
// RECIBIR CORREO DESDE CLOUDFLARE
// ==========================================

router.post(
  '/',
  verifyInboxSecret,
  inboxController.receiveEmail
);


// ==========================================
// CONSULTAR BANDEJA
// ==========================================

router.get(
  '/',
  authenticateToken,
  authorizeRoles(
    'SUPER_ADMIN',
    'ADMIN'
  ),
  inboxController.getInbox
);


module.exports = router;
