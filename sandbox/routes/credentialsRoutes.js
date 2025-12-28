/**
 * Rutas de Gestión de Credenciales - Sandbox ECHEQ
 * Permite recuperar y regenerar API Keys/Secrets
 */

const express = require('express');
const router = express.Router();
const logger = require('../services/logger');

// Importar modelos
const { TenantSimple } = require('../models/index');

// ============================================================================
// ENDPOINTS DE GESTIÓN DE CREDENCIALES
// ============================================================================

/**
 * GET /credentials/:tenantId
 * Recuperar credenciales existentes de un tenant
 * ✅ MIGRADO: Ahora usa BFF API
 */
router.get('/:tenantId', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { adminKey } = req.query;

    // Verificar autenticación administrativa
    if (!adminKey || adminKey !== 'admin123') {
      return res.status(401).json({
        success: false,
        message: 'Clave de administrador requerida',
        error: 'UNAUTHORIZED',
        timestamp: new Date().toISOString(),
      });
    }

    const bffClient = require('../services/bffClient');
    const { formatErrorResponse } = require('../utils/errorHandler');

    // Obtener tenant del BFF
    const tenantResponse = await bffClient.getTenant(tenantId);
    const tenant = tenantResponse.data;

    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'Tenant no encontrado',
        timestamp: new Date().toISOString(),
      });
    }

    // Obtener credenciales del BFF
    const credentialsResponse = await bffClient.getTenantCredentials(tenantId);
    const credentials = credentialsResponse.data;

    if (!credentials || !credentials.apiKey || !credentials.apiSecret) {
      return res.status(404).json({
        success: false,
        message: 'Credenciales no generadas para este tenant',
        timestamp: new Date().toISOString(),
      });
    }

    logger.api('Credenciales consultadas', {
      tenantId: tenant.id,
      tenantName: tenant.name || tenant.tenantName,
      hasCredentials: !!(credentials.apiKey && credentials.apiSecret),
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      data: {
        tenant_id: tenant.id,
        tenant_name: tenant.name || tenant.tenantName,
        tenant_code: tenant.code || tenant.tenantId,
        api_key: credentials.apiKey,
        api_secret: credentials.apiSecret,
        is_active: tenant.status === 'ACTIVE' || tenant.isActive,
        generated_at: credentials.createdAt || tenant.updatedAt || tenant.updated_at
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const { formatErrorResponse } = require('../utils/errorHandler');
    res.status(error.response?.status || 500).json(
      formatErrorResponse(error, 'Error interno del servidor')
    );
  }
});

/**
 * POST /credentials/:tenantId/regenerate
 * Regenerar credenciales para un tenant
 * ✅ MIGRADO: Ahora usa BFF API
 */
router.post('/:tenantId/regenerate', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { adminKey, notifyMain = false } = req.body;

    // Verificar autenticación administrativa
    if (!adminKey || adminKey !== 'admin123') {
      return res.status(401).json({
        success: false,
        message: 'Clave de administrador requerida',
        error: 'UNAUTHORIZED',
        timestamp: new Date().toISOString(),
      });
    }

    const bffClient = require('../services/bffClient');
    const { formatErrorResponse } = require('../utils/errorHandler');

    // Verificar que el tenant existe
    const tenantResponse = await bffClient.getTenant(tenantId);
    const tenant = tenantResponse.data;

    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'Tenant no encontrado',
        timestamp: new Date().toISOString(),
      });
    }

    // Regenerar credenciales usando el BFF
    const credentialsResponse = await bffClient.generateTenantCredentials(tenantId);
    const credentials = credentialsResponse.data;

    // Log de regeneración
    logger.api('Credenciales regeneradas', {
      tenantId: tenant.id,
      tenantName: tenant.name || tenant.tenantName,
      newApiKey: credentials.apiKey ? '***' + credentials.apiKey.slice(-4) : 'none',
      notifyMain,
      timestamp: new Date().toISOString()
    });

    // Nota: La sincronización con backend principal debería manejarse en el BFF
    // o a través de webhooks/eventos del BFF

    res.json({
      success: true,
      message: credentialsResponse.message || 'Credenciales regeneradas exitosamente',
      data: {
        tenant_id: tenant.id,
        tenant_name: tenant.name || tenant.tenantName,
        api_key: credentials.apiKey,
        api_secret: credentials.apiSecret,
        regenerated_at: credentials.createdAt || new Date().toISOString()
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const { formatErrorResponse } = require('../utils/errorHandler');
    res.status(error.response?.status || 500).json(
      formatErrorResponse(error, 'Error interno del servidor')
    );
  }
});

/**
 * GET /credentials/:tenantId/status
 * Obtener estado de credenciales de un tenant
 */
router.get('/:tenantId/status', async (req, res) => {
  try {
    const { tenantId } = req.params;

    const tenant = await TenantSimple.findByPk(tenantId, {
      attributes: ['id', 'name', 'code', 'api_key', 'api_secret', 'is_active', 'sync_with_main', 'main_tenant_id']
    });

    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'Tenant no encontrado',
        timestamp: new Date().toISOString(),
      });
    }

    const hasCredentials = !!(tenant.api_key && tenant.api_secret);
    const credentialsStatus = hasCredentials ? 'ACTIVE' : 'MISSING';

    res.json({
      success: true,
      data: {
        tenant_id: tenant.id,
        tenant_name: tenant.name,
        tenant_code: tenant.code,
        credentials_status: credentialsStatus,
        has_api_key: !!tenant.api_key,
        has_api_secret: !!tenant.api_secret,
        is_active: tenant.is_active,
        sync_with_main: tenant.sync_with_main,
        main_tenant_id: tenant.main_tenant_id,
        last_updated: tenant.updatedAt
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error obteniendo estado de credenciales:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

// ============================================================================
// FUNCIONES AUXILIARES
// ============================================================================

/**
 * Generar API Key única
 */
function generateApiKey() {
  const prefix = 'sk_sandbox_';
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 15);
  return prefix + timestamp + '_' + random;
}

/**
 * Generar API Secret único
 */
function generateApiSecret() {
  const prefix = 'ss_sandbox_';
  const timestamp = Date.now().toString(36);
  const random1 = Math.random().toString(36).substring(2, 15);
  const random2 = Math.random().toString(36).substring(2, 15);
  return prefix + timestamp + '_' + random1 + random2;
}

module.exports = router;
