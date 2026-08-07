const express = require('express');
const inboxController = require('../controllers/inboxController');

const router = express.Router();

function verifyInboxSecret(req, res, next) {
  const configuredSecret = process.env.INBOX_WEBHOOK_SECRET;
  const receivedSecret = req.headers['x-inbox-secret'];

  if (!configuredSecret) {
    return res.status(503).json({
      success: false,
      message: 'Inbox webhook secret is not configured'
    });
  }

  if (!receivedSecret || receivedSecret !== configuredSecret) {
    return res.status(401).json({
      success: false,
      message: 'Invalid inbox webhook secret'
    });
  }

  next();
}

router.post(
  '/',
  verifyInboxSecret,
  inboxController.receiveEmail
);

module.exports = router;