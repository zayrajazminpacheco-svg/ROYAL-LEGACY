const express = require('express');

const mailboxController =
  require('../controllers/mailboxController');

const inboxController =
  require('../controllers/inboxController');

const {
  authenticateMailbox
} = require('../services/mailboxAccessService');

const router =
  express.Router();

router.post(
  '/login',
  mailboxController.login
);

router.get(
  '/me',
  authenticateMailbox,
  mailboxController.getMe
);

router.get(
  '/messages',
  authenticateMailbox,
  inboxController.getInbox
);

module.exports =
  router;
