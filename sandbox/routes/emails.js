/**
 * Rutas de Gestión de Emails
 * Endpoints para el sistema de notificaciones por email
 */

const express = require('express');
const router = express.Router();
const emailController = require('../controllers/emailController');
const { authenticateToken } = require('../middleware/auth');
const {
  checkActionPermission,
  auditPermissionLog,
} = require('../middleware/flowAuth');

// Aplicar middleware de autenticación a todas las rutas
router.use(authenticateToken);
router.use(auditPermissionLog);

// Rutas de verificación y estadísticas
router.get(
  '/verify',
  checkActionPermission('email.verify'),
  emailController.verifyConnection
);

router.get(
  '/stats',
  checkActionPermission('email.stats'),
  emailController.getEmailStats
);

// Rutas de envío de emails
router.post(
  '/test',
  checkActionPermission('email.send_test'),
  emailController.sendTestEmail
);

router.post(
  '/welcome',
  checkActionPermission('email.send_welcome'),
  emailController.sendWelcomeEmail
);

router.post(
  '/password-reset',
  checkActionPermission('email.send_password_reset'),
  emailController.sendPasswordResetEmail
);

router.post(
  '/echeq-emission',
  checkActionPermission('email.send_echeq_emission'),
  emailController.sendEcheqEmissionEmail
);

router.post(
  '/expiration-warning',
  checkActionPermission('email.send_expiration_warning'),
  emailController.sendExpirationWarningEmail
);

router.post(
  '/tenant-activated',
  checkActionPermission('email.send_tenant_activated'),
  emailController.sendTenantActivatedEmail
);

module.exports = router;
