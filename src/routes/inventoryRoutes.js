const express = require('express');
const multer = require('multer');

const inventoryController =
  require('../controllers/inventoryController');

const {
  authenticateToken,
  authorizeRoles
} = require('../middlewares/auth');

const router = express.Router();

const inventoryImageUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 2 * 1024 * 1024,
    files: 1
  },
  fileFilter: (
    req,
    file,
    callback
  ) => {
    const allowedTypes = new Set([
      'image/jpeg',
      'image/png',
      'image/webp'
    ]);

    if (!allowedTypes.has(file.mimetype)) {
      const error = new Error(
        'La imagen debe ser JPG, PNG o WEBP'
      );
      error.status = 400;
      return callback(error);
    }

    return callback(null, true);
  }
});

function receiveInventoryImage(
  req,
  res,
  next
) {
  inventoryImageUpload.single('image')(
    req,
    res,
    error => {
      if (!error) {
        return next();
      }

      error.status = 400;

      if (
        error.code ===
        'LIMIT_FILE_SIZE'
      ) {
        error.message =
          'La imagen debe pesar máximo 2 MB';
      }

      return next(error);
    }
  );
}

// ============================================================
// ESTADÍSTICAS
// ============================================================

router.get(
  '/stats',
  inventoryController.getInventoryStats
);

// ============================================================
// LISTAR INVENTARIO
// ============================================================

router.get(
  '/',
  inventoryController.listInventory
);

// ============================================================
// MOSTRAR CREDENCIALES
// SOLO SUPERADMINISTRADOR Y ADMINISTRADOR
// ============================================================

router.get(
  '/:id/credentials',
  authenticateToken,
  authorizeRoles(
    'SUPER_ADMIN',
    'ADMIN'
  ),
  inventoryController.getInventoryCredentials
);

// ============================================================
// IMAGEN INDIVIDUAL DEL ARTÍCULO
// SOLO SUPERADMINISTRADOR Y ADMINISTRADOR
// ============================================================

router.get(
  '/:id/image',
  authenticateToken,
  authorizeRoles(
    'SUPER_ADMIN',
    'ADMIN'
  ),
  inventoryController.getInventoryImage
);

router.post(
  '/:id/image',
  authenticateToken,
  authorizeRoles(
    'SUPER_ADMIN',
    'ADMIN'
  ),
  receiveInventoryImage,
  inventoryController.uploadInventoryImage
);

router.delete(
  '/:id/image',
  authenticateToken,
  authorizeRoles(
    'SUPER_ADMIN',
    'ADMIN'
  ),
  inventoryController.deleteInventoryImage
);

// ============================================================
// OBTENER UN ARTÍCULO
// ============================================================

router.get(
  '/:id',
  inventoryController.getInventoryItem
);

// ============================================================
// CREAR ARTÍCULO
// ============================================================

router.post(
  '/',
  inventoryController.createInventoryItem
);

// ============================================================
// ACTUALIZAR ARTÍCULO
// ============================================================

router.patch(
  '/:id',
  inventoryController.updateInventoryItem
);

// ============================================================
// REMOVER ARTÍCULO
// ============================================================

router.post(
  '/:id/remove',
  inventoryController.removeInventoryItem
);

module.exports = router;
