const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');

// Rutas públicas
router.post('/login', authController.login);
router.post('/register', authController.register);

// Rutas protegidas
router.get('/profile', authenticateToken, authController.getProfile);
router.put('/profile', authenticateToken, authController.updateProfile);
router.put(
  '/change-password',
  authenticateToken,
  authController.changePassword
);
router.post('/logout', authenticateToken, authController.logout);

module.exports = router;
