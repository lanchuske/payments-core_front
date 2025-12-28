const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const {
  authenticateToken,
  requireRole,
  auditLog,
} = require('../middleware/auth');

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Rutas de usuarios (solo para administradores)
router.post(
  '/',
  requireRole(['BANK_ADMIN', 'SYSTEM_ADMIN']),
  auditLog('CREATE_USER'),
  userController.createUser
);
router.get(
  '/:id',
  requireRole(['BANK_ADMIN', 'SYSTEM_ADMIN']),
  auditLog('GET_USER'),
  userController.getUser
);
router.put(
  '/:id',
  requireRole(['BANK_ADMIN', 'SYSTEM_ADMIN']),
  auditLog('UPDATE_USER'),
  userController.updateUser
);

module.exports = router;
