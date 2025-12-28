/**
 * Rutas de Gestión de Tenants
 * Endpoints para la gestión de tenants (bancos/entidades financieras)
 */

const express = require('express');
const router = express.Router();
const tenantController = require('../controllers/tenantController');
const { authenticateToken } = require('../middleware/auth');
const {
  checkActionPermission,
  checkFlowPermission,
  auditPermissionLog,
} = require('../middleware/flowAuth');

// Aplicar middleware de autenticación a todas las rutas
router.use(authenticateToken);
router.use(auditPermissionLog);

// Rutas públicas (solo SYSTEM_ADMIN)
router.post(
  '/',
  checkActionPermission('tenant.create'),
  tenantController.createTenant
);

router.get(
  '/',
  checkActionPermission('tenant.list'),
  tenantController.listTenants
);

router.get(
  '/code/:codigo',
  checkActionPermission('tenant.view'),
  tenantController.getTenantByCode
);

// Rutas por tenant específico
router.get(
  '/:id',
  checkActionPermission('tenant.view'),
  tenantController.getTenantById
);

router.put(
  '/:id',
  checkActionPermission('tenant.update'),
  tenantController.updateTenant
);

router.put(
  '/:id/activate',
  checkActionPermission('tenant.activate'),
  tenantController.activateTenant
);

router.put(
  '/:id/suspend',
  checkActionPermission('tenant.suspend'),
  tenantController.suspendTenant
);

router.delete(
  '/:id',
  checkActionPermission('tenant.delete'),
  tenantController.deleteTenant
);

router.get(
  '/:id/stats',
  checkActionPermission('tenant.stats'),
  tenantController.getTenantStats
);

router.get(
  '/:id/config',
  checkActionPermission('tenant.config'),
  tenantController.getTenantCommercialConfig
);

router.put(
  '/:id/coelsa-credentials',
  checkActionPermission('tenant.coelsa_credentials'),
  tenantController.updateCoelsaCredentials
);

router.post(
  '/:id/can-perform',
  checkActionPermission('tenant.check_permission'),
  tenantController.canTenantPerformOperation
);

// Ruta para obtener logs del tenant
router.get(
  '/:id/logs',
  checkActionPermission('tenant.view'),
  tenantController.getTenantLogs
);

// Ruta para obtener información del tenant actual
router.get(
  '/current/info',
  checkActionPermission('tenant.view_own'),
  tenantController.getCurrentTenant
);

// Ruta para generar API keys del sandbox para un tenant
router.post(
  '/:id/generate-keys',
  checkActionPermission('tenant.update'),
  tenantController.generateSandboxApiKeys
);

module.exports = router;
