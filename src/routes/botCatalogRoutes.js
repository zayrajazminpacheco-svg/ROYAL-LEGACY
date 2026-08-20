const express = require('express');
const botCatalogController = require('../controllers/botCatalogController');

const router = express.Router();

// Lista general para el bot
router.get('/platforms', botCatalogController.listPlatformsForBot);

// Buscar una plataforma por comando
router.get('/platforms/:command', botCatalogController.getPlatformByCommand);

module.exports = router;