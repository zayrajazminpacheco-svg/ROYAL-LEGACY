const express = require('express');

const whatsappBotController =
  require('../controllers/whatsappBotController');

const {
  authenticateToken,
  authorizeRoles
} = require('../middlewares/auth');

const router =
  express.Router();


router.use(
  authenticateToken
);

router.use(
  authorizeRoles(
    'SUPER_ADMIN',
    'ADMIN'
  )
);


// CONFIGURACIÓN

router.get(
  '/settings',
  whatsappBotController.getSettings
);

router.put(
  '/settings',
  whatsappBotController.updateSettings
);


// COMANDOS

router.get(
  '/commands',
  whatsappBotController.listCommands
);

router.post(
  '/commands',
  whatsappBotController.createCommand
);

router.put(
  '/commands/:id',
  whatsappBotController.updateCommand
);

router.delete(
  '/commands/:id',
  whatsappBotController.deleteCommand
);


module.exports =
  router;