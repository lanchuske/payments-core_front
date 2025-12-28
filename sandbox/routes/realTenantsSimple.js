/**
 * Rutas REALES de Tenants con Autenticación Simple
 * Solo requiere password admin1234
 */

const express = require('express');
const router = express.Router();
const { simpleAuth } = require('../middleware/simpleAuth');
const { TenantSimple } = require('../models');
const logger = require('../services/logger');

// Aplicar autenticación simple a todas las rutas
router.use(simpleAuth);

/**
 * GET /api/real/tenants
 * Listar todos los tenants REALES de la base de datos
 */
router.get('/tenants', async (req, res) => {
  try {
    const tenants = await TenantSimple.findAll({
      order: [['createdAt', 'DESC']]
    });

    logger.api('Lista de tenants reales obtenida', {
      count: tenants.length,
      timestamp: new Date().toISOString()
    });

    res.status(200).json({
      success: true,
      message: 'Lista de tenants reales obtenida exitosamente',
      data: tenants,
      count: tenants.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error obteniendo tenants reales:', error);
    logger.api('Error obteniendo tenants reales', {
      error: error.message,
      timestamp: new Date().toISOString()
    });
    
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * POST /api/real/tenants
 * Crear un nuevo tenant REAL
 */
router.post('/tenants', async (req, res) => {
  try {
    const { name, code, cuit, sandbox_credentials } = req.body;

    if (!name || !code) {
      return res.status(400).json({
        success: false,
        message: 'Nombre y código son requeridos',
        error: 'MISSING_REQUIRED_FIELDS',
        timestamp: new Date().toISOString(),
      });
    }

    // Verificar si ya existe un tenant con ese código
    const existingTenant = await TenantSimple.findOne({ where: { code } });
    if (existingTenant) {
      return res.status(409).json({
        success: false,
        message: 'Ya existe un tenant con ese código',
        error: 'TENANT_CODE_EXISTS',
        timestamp: new Date().toISOString(),
      });
    }

    const newTenant = await TenantSimple.create({
      name,
      code,
      cuit,
      sandbox_credentials: sandbox_credentials || {},
      is_active: true
    });

    logger.api('Tenant real creado', {
      tenantId: newTenant.id,
      name: newTenant.name,
      code: newTenant.code,
      timestamp: new Date().toISOString()
    });

    res.status(201).json({
      success: true,
      message: 'Tenant real creado exitosamente',
      data: newTenant,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error creando tenant real:', error);
    logger.api('Error creando tenant real', {
      error: error.message,
      timestamp: new Date().toISOString()
    });
    
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/real/tenants/:tenantId
 * Obtener un tenant REAL por ID
 */
router.get('/tenants/:tenantId', async (req, res) => {
  try {
    const { tenantId } = req.params;

    const tenant = await TenantSimple.findByPk(tenantId);
    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'Tenant no encontrado',
        error: 'TENANT_NOT_FOUND',
        timestamp: new Date().toISOString(),
      });
    }

    logger.api('Tenant real obtenido', {
      tenantId: tenant.id,
      name: tenant.name,
      timestamp: new Date().toISOString()
    });

    res.status(200).json({
      success: true,
      message: 'Tenant real obtenido exitosamente',
      data: tenant,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error obteniendo tenant real:', error);
    logger.api('Error obteniendo tenant real', {
      error: error.message,
      timestamp: new Date().toISOString()
    });
    
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * DELETE /api/real/tenants/:tenantId
 * Eliminar un tenant REAL
 */
router.delete('/tenants/:tenantId', async (req, res) => {
  try {
    const { tenantId } = req.params;

    const tenant = await TenantSimple.findByPk(tenantId);
    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'Tenant no encontrado',
        error: 'TENANT_NOT_FOUND',
        timestamp: new Date().toISOString(),
      });
    }

    await tenant.destroy();

    logger.api('Tenant real eliminado', {
      tenantId: tenant.id,
      name: tenant.name,
      timestamp: new Date().toISOString()
    });

    res.status(200).json({
      success: true,
      message: 'Tenant real eliminado exitosamente',
      data: { tenantId, deletedAt: new Date().toISOString() },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error eliminando tenant real:', error);
    logger.api('Error eliminando tenant real', {
      error: error.message,
      timestamp: new Date().toISOString()
    });
    
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * POST /api/real/tenants/:tenantId/generate-keys
 * Generar API keys REALES para un tenant
 */
router.post('/tenants/:tenantId/generate-keys', async (req, res) => {
  try {
    const { tenantId } = req.params;

    const tenant = await TenantSimple.findByPk(tenantId);
    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'Tenant no encontrado',
        error: 'TENANT_NOT_FOUND',
        timestamp: new Date().toISOString(),
      });
    }

    // Generar API keys reales con formato COELSA
    const environment = 'sandbox';
    const crypto = require('crypto');
    const tenantIdShort = tenantId.substring(0, 8); // Primeros 8 caracteres del UUID
    const timestamp = Date.now().toString(36); // Convertir a base36
    const random = Math.random().toString(36).substring(2, 10); // 8 caracteres
    
    const apiKey = `${environment}_${tenantIdShort}_${timestamp}_${random}`;
    const apiSecret = `secret_${tenantIdShort}_${Math.random().toString(36).substring(2, 10)}`;

    // Actualizar las credenciales del tenant
    const updatedCredentials = {
      ...tenant.sandbox_credentials,
      api_key: apiKey,
      api_secret: apiSecret,
      generated_at: new Date().toISOString()
    };

    await tenant.update({
      sandbox_credentials: updatedCredentials
    });

    logger.api('API keys reales generadas', {
      tenantId: tenant.id,
      apiKey: apiKey,
      timestamp: new Date().toISOString()
    });

    res.status(200).json({
      success: true,
      message: 'API keys reales generadas exitosamente',
      data: {
        tenantId: tenant.id,
        apiKey,
        apiSecret,
        generatedAt: new Date().toISOString()
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error generando API keys reales:', error);
    logger.api('Error generando API keys reales', {
      error: error.message,
      timestamp: new Date().toISOString()
    });
    
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /api/real/tenants/:tenantId/credentials
 * Obtener credenciales REALES de un tenant
 */
router.get('/tenants/:tenantId/credentials', async (req, res) => {
  try {
    const { tenantId } = req.params;

    const tenant = await TenantSimple.findByPk(tenantId);
    if (!tenant) {
      return res.status(404).json({
        success: false,
        message: 'Tenant no encontrado',
        error: 'TENANT_NOT_FOUND',
        timestamp: new Date().toISOString(),
      });
    }

    const credentials = tenant.sandbox_credentials || {};

    res.status(200).json({
      success: true,
      message: 'Credenciales reales obtenidas exitosamente',
      data: {
        tenantId: tenant.id,
        apiKey: credentials.api_key || null,
        apiSecret: credentials.api_secret || null,
        generatedAt: credentials.generated_at || null
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error obteniendo credenciales reales:', error);
    logger.api('Error obteniendo credenciales reales', {
      error: error.message,
      timestamp: new Date().toISOString()
    });
    
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

module.exports = router;

