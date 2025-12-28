/**
 * Rutas de Sincronización Híbrida - Sandbox ECHEQ
 * Permite sincronización bidireccional con el backend principal
 */

const express = require('express');
const router = express.Router();
const logger = require('../services/logger');

// Importar modelos
const { TenantSimple } = require('../models/index');

// ============================================================================
// ENDPOINTS DE SINCRONIZACIÓN
// ============================================================================

/**
 * POST /sync/tenant-from-main
 * Recibir tenant del backend principal y crear en sandbox
 */
router.post('/tenant-from-main', async (req, res) => {
  try {
    const { tenant_id, name, code, cuit, type } = req.body;

    if (!tenant_id || !name || !code) {
      return res.status(400).json({
        success: false,
        message: 'tenant_id, name y code son requeridos',
        error: 'MISSING_REQUIRED_FIELDS',
        timestamp: new Date().toISOString(),
      });
    }

    // Generar credenciales del sandbox
    const api_key = generateApiKey();
    const api_secret = generateApiSecret();

    // Crear tenant en sandbox
    const sandboxTenant = await TenantSimple.create({
      main_tenant_id: tenant_id,
      name,
      code,
      cuit: cuit || null,
      api_key,
      api_secret,
      sync_with_main: true,
      is_independent: false,
      is_active: true,
      sandbox_credentials: {
        type: type || 'BANCO',
        generated_at: new Date().toISOString(),
        sync_status: 'ACTIVE'
      }
    });

    logger.api('Tenant sincronizado desde backend principal', {
      main_tenant_id: tenant_id,
      sandbox_tenant_id: sandboxTenant.id,
      name: sandboxTenant.name,
      code: sandboxTenant.code,
      timestamp: new Date().toISOString()
    });

    res.status(201).json({
      success: true,
      message: 'Tenant sincronizado exitosamente',
      data: {
        sandbox_tenant_id: sandboxTenant.id,
        main_tenant_id: tenant_id,
        api_key: sandboxTenant.api_key,
        api_secret: sandboxTenant.api_secret,
        sync_status: 'ACTIVE'
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error sincronizando tenant desde backend principal:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * POST /sync/tenant-to-main
 * Enviar tenant del sandbox al backend principal
 */
router.post('/tenant-to-main', async (req, res) => {
  try {
    const { sandbox_tenant_id, name, code, cuit, type } = req.body;

    if (!sandbox_tenant_id || !name || !code) {
      return res.status(400).json({
        success: false,
        message: 'sandbox_tenant_id, name y code son requeridos',
        error: 'MISSING_REQUIRED_FIELDS',
        timestamp: new Date().toISOString(),
      });
    }

    // Sincronizar con backend principal
    const syncResponse = await fetch('http://localhost:3001/api/sync/tenant-from-sandbox', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'X-Sandbox-Sync': 'true'
      },
      body: JSON.stringify({
        sandbox_tenant_id,
        name,
        code,
        cuit,
        type: type || 'BANCO'
      })
    });

    if (!syncResponse.ok) {
      throw new Error(`Error sincronizando con backend principal: ${syncResponse.status}`);
    }

    const syncData = await syncResponse.json();

    // Actualizar tenant en sandbox con referencia al backend principal
    await TenantSimple.update(
      { 
        main_tenant_id: syncData.data.main_tenant_id,
        sync_with_main: true,
        is_independent: false
      },
      { where: { id: sandbox_tenant_id } }
    );

    logger.api('Tenant sincronizado hacia backend principal', {
      sandbox_tenant_id,
      main_tenant_id: syncData.data.main_tenant_id,
      name,
      code,
      timestamp: new Date().toISOString()
    });

    res.json({
      success: true,
      message: 'Tenant sincronizado exitosamente con backend principal',
      data: {
        sandbox_tenant_id,
        main_tenant_id: syncData.data.main_tenant_id,
        sync_status: 'ACTIVE'
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error sincronizando tenant hacia backend principal:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /sync/status/:tenantId
 * Obtener estado de sincronización de un tenant
 */
router.get('/status/:tenantId', async (req, res) => {
  try {
    const { tenantId } = req.params;

    const tenant = await TenantSimple.findByPk(tenantId, {
      attributes: ['id', 'main_tenant_id', 'name', 'code', 'sync_with_main', 'is_independent', 'is_active']
    });

    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'Tenant no encontrado',
        timestamp: new Date().toISOString(),
      });
    }

    res.json({
      success: true,
      data: {
        tenant_id: tenant.id,
        main_tenant_id: tenant.main_tenant_id,
        name: tenant.name,
        code: tenant.code,
        sync_with_main: tenant.sync_with_main,
        is_independent: tenant.is_independent,
        is_active: tenant.is_active,
        sync_status: tenant.sync_with_main ? 'SYNCED' : 'INDEPENDENT'
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error obteniendo estado de sincronización:', error);
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
  const random = Math.random().toString(36).substring(2, 15) + 
                 Math.random().toString(36).substring(2, 15);
  return prefix + random;
}

/**
 * Generar API Secret único
 */
function generateApiSecret() {
  const prefix = 'ss_sandbox_';
  const random = Math.random().toString(36).substring(2, 15) + 
                 Math.random().toString(36).substring(2, 15) +
                 Math.random().toString(36).substring(2, 15);
  return prefix + random;
}

module.exports = router;
