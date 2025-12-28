const express = require('express');
const router = express.Router();
const discountController = require('../controllers/discountController');
const {
  authenticateToken,
  requireRole,
  auditLog,
} = require('../middleware/auth');

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// Rutas para usuarios de empresa
router.post(
  '/',
  auditLog('REQUEST_DISCOUNT'),
  discountController.requestDiscount
);
router.get('/', auditLog('GET_DISCOUNTS'), discountController.getDiscounts);
router.get('/:id', auditLog('GET_DISCOUNT'), discountController.getDiscount);
router.put(
  '/:id/cancel',
  auditLog('CANCEL_DISCOUNT'),
  discountController.cancelDiscount
);

// Rutas para administradores
router.get(
  '/admin/all',
  requireRole('BANK_ADMIN'),
  auditLog('GET_ALL_DISCOUNTS'),
  discountController.getAllDiscounts
);
router.put(
  '/:id/approve',
  requireRole('BANK_ADMIN'),
  auditLog('APPROVE_DISCOUNT'),
  discountController.approveDiscount
);
router.put(
  '/:id/reject',
  requireRole('BANK_ADMIN'),
  auditLog('REJECT_DISCOUNT'),
  discountController.rejectDiscount
);

module.exports = router;
