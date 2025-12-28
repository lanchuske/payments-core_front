/**
 * Rutas Internas del Sandbox
 * Endpoints de administración y gestión interna del sandbox ECHEQ
 * NO son parte de la API oficial de COELSA
 */

const express = require('express');
const router = express.Router();
const logger = require('../services/logger');

// Importar modelos
const { TenantSimple, Echeq, echeqEvent: EcheqEvent } = require('../models/index');

// Importar controladores de administración
const adminController = require('../controllers/adminController');

// ============================================================================
// ENDPOINTS DE ADMINISTRACIÓN DEL SANDBOX
// ============================================================================

/**
 * POST /sandbox/tenants
 * Sincronizar tenant desde el backend principal
 */
router.post('/tenants', async (req, res) => {
  try {
    const { 
      main_tenant_id, 
      name, 
      code, 
      cuit, 
      type, 
      sync_with_main = true, 
      is_independent = false 
    } = req.body;

    // Validaciones
    if (!main_tenant_id || !name || !code) {
      return res.status(400).json({
        success: false,
        message: 'main_tenant_id, name y code son requeridos',
        error: 'MISSING_REQUIRED_FIELDS'
      });
    }

    // Verificar si ya existe un tenant con este main_tenant_id
    const existingTenant = await TenantSimple.findOne({
      where: { main_tenant_id }
    });

    if (existingTenant) {
      return res.status(409).json({
        success: false,
        message: 'Ya existe un tenant sincronizado con este main_tenant_id',
        data: existingTenant
      });
    }

    // Generar credenciales automáticamente
    const generateApiKey = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      let result = '';
      for (let i = 0; i < 32; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return result;
    };

    const generateApiSecret = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      let result = '';
      for (let i = 0; i < 64; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return result;
    };

    const apiKey = generateApiKey();
    const apiSecret = generateApiSecret();

    // Crear tenant en el sandbox con credenciales
    const sandboxTenant = await TenantSimple.create({
      name,
      code,
      cuit,
      main_tenant_id,
      sync_with_main,
      is_independent,
      is_active: true,
      api_key: apiKey,
      api_secret: apiSecret
    });

    await logger.logSystemEvent('info', 'Tenant sincronizado desde backend principal', {
      main_tenant_id,
      sandbox_tenant_id: sandboxTenant.id,
      name,
      code,
      ip: req.ip
    });

    res.json({
      success: true,
      message: 'Tenant sincronizado exitosamente con credenciales generadas',
      data: {
        id: sandboxTenant.id,
        name: sandboxTenant.name,
        code: sandboxTenant.code,
        main_tenant_id: sandboxTenant.main_tenant_id,
        sync_with_main: sandboxTenant.sync_with_main,
        is_independent: sandboxTenant.is_independent,
        api_key: sandboxTenant.api_key,
        api_secret: sandboxTenant.api_secret,
        created_at: sandboxTenant.createdAt
      }
    });

  } catch (error) {
    console.error('Error sincronizando tenant:', error);
    await logger.logSystemEvent('error', 'Error sincronizando tenant desde backend', {
      error: error.message,
      ip: req.ip
    });
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
});

/**
 * POST /sandbox/create-tenant
 * Crear nuevo tenant en el sandbox
 */
router.post('/create-tenant', async (req, res) => {
  try {
    const { name, description, cuit } = req.body;

    if (!name || !cuit) {
      return res.status(400).json({
        success: false,
        message: 'name y cuit son requeridos',
        error: 'MISSING_REQUIRED_FIELDS',
        timestamp: new Date().toISOString(),
      });
    }

    // Simular creación de tenant con UUID válido
    const tenant = {
      id: `12345678-1234-1234-1234-123456789abc`,
      name,
      description: description || '',
      cuit,
      status: 'active',
      createdAt: new Date().toISOString(),
    };

    logger.api('Tenant creado', {
      tenantId: tenant.id,
      name: tenant.name,
      cuit: tenant.cuit,
      timestamp: new Date().toISOString()
    });

    res.status(201).json({
      success: true,
      message: 'Tenant creado exitosamente',
      data: tenant,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error creando tenant:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * POST /sandbox/generate-keys/:tenantId
 * Generar API keys para un tenant
 */
router.post('/generate-keys/:tenantId', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { description } = req.body;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: 'tenantId es requerido',
        error: 'MISSING_REQUIRED_FIELDS',
        timestamp: new Date().toISOString(),
      });
    }

    // Simular generación de API keys
    const apiKey = `api_${tenantId}_${Date.now()}`;
    const apiSecret = `secret_${tenantId}_${Math.random().toString(36).substring(2)}`;

    const credentials = {
      tenantId,
      apiKey,
      apiSecret,
      description: description || 'API Keys generadas automáticamente',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 año
    };

    logger.api('API Keys generadas', {
      tenantId,
      apiKey,
      timestamp: new Date().toISOString()
    });

    res.status(201).json({
      success: true,
      message: 'API Keys generadas exitosamente',
      data: credentials,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error generando API keys:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /sandbox/logs
 * Obtener logs detallados del sistema para diagnóstico
 */
router.get('/logs', async (req, res) => {
  try {
    const { Echeq, echeqEvent: EcheqEvent, TenantSimple } = require('../models/index');
    const { sequelize } = require('../config/database');
    
    // Obtener estadísticas del sistema
    const systemStats = {
      database: {
        connected: sequelize.authenticate ? true : false,
        dialect: sequelize.getDialect(),
        host: sequelize.config.host,
        database: sequelize.config.database
      },
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      nodeVersion: process.version
    };

    // Obtener eventos recientes con información detallada
    const recentEvents = await EcheqEvent.findAll({
      order: [['createdAt', 'DESC']],
      limit: 50,
      attributes: [
        'id', 'echeq_id', 'event_type', 'event_status', 'event_description', 
        'event_data', 'user_cuit', 'timestamp', 'createdAt', 'updatedAt'
      ]
    });

    // Obtener cheques recientes con información detallada
    const recentEcheqs = await Echeq.findAll({
      order: [['createdAt', 'DESC']],
      limit: 20,
      attributes: [
        'id', 'number', 'amount', 'currency', 'status', 'validation_status',
        'createdAt', 'updatedAt', 'issuer', 'beneficiary', 'issue_date', 'due_date'
      ]
    });

    // Obtener tenants activos
    const activeTenants = await TenantSimple.findAll({
      where: { is_active: true },
      attributes: ['id', 'name', 'cuit', 'createdAt'],
      limit: 10
    });

    const logs = [];

    // Agregar eventos como logs con información detallada
    recentEvents.forEach(event => {
      const eventData = event.event_data || {};
      logs.push({
        id: event.id,
        type: 'event',
        message: event.event_description,
        level: event.event_status === 'SUCCESS' ? 'info' : 'error',
        timestamp: event.createdAt,
        source: 'database',
        severity: event.event_status === 'SUCCESS' ? 'INFO' : 'ERROR',
        details: {
          eventType: event.event_type,
          eventStatus: event.event_status,
          echeqId: event.echeq_id,
          userCuit: event.user_cuit,
          eventData: eventData,
          // Información adicional para diagnóstico
          tenantId: eventData.tenantId,
          monto: eventData.monto,
          emisorCuit: eventData.emisor_cuit,
          beneficiarioDocumento: eventData.beneficiario_documento,
          chequeNumber: eventData.chequeNumber
        },
        diagnostic: {
          hasError: event.event_status !== 'SUCCESS',
          hasTenantId: !!eventData.tenantId,
          hasAmount: !!eventData.monto,
          hasCuit: !!eventData.emisor_cuit,
          dataCompleteness: Object.keys(eventData).length
        }
      });
    });

    // Agregar cheques como logs con información detallada
    recentEcheqs.forEach(echeq => {
      logs.push({
        id: echeq.id,
        type: 'echeq',
        message: `Cheque ${echeq.number} - ${echeq.status} - $${echeq.amount} ${echeq.currency}`,
        level: echeq.status === 'EMITTED' ? 'info' : 'warning',
        timestamp: echeq.createdAt,
        source: 'database',
        severity: echeq.status === 'EMITTED' ? 'INFO' : 'WARNING',
        details: {
          echeqId: echeq.id,
          number: echeq.number,
          amount: echeq.amount,
          currency: echeq.currency,
          status: echeq.status,
          validationStatus: echeq.validation_status,
          issuer: echeq.issuer,
          beneficiary: echeq.beneficiary,
          issueDate: echeq.issue_date,
          dueDate: echeq.due_date
        },
        diagnostic: {
          isEmitted: echeq.status === 'EMITTED',
          hasValidation: !!echeq.validation_status,
          hasIssueDate: !!echeq.issue_date,
          hasDueDate: !!echeq.due_date,
          amountValid: echeq.amount > 0,
          currencyValid: !!echeq.currency
        }
      });
    });

    // Agregar información de tenants activos
    activeTenants.forEach(tenant => {
      logs.push({
        id: tenant.id,
        type: 'tenant',
        message: `Tenant activo: ${tenant.name} (CUIT: ${tenant.cuit})`,
        level: 'info',
        timestamp: tenant.createdAt,
        source: 'database',
        severity: 'INFO',
        details: {
          tenantId: tenant.id,
          name: tenant.name,
          cuit: tenant.cuit,
          createdAt: tenant.createdAt
        },
        diagnostic: {
          hasCuit: !!tenant.cuit,
          hasName: !!tenant.name,
          isActive: true
        }
      });
    });

    // Agregar estadísticas del sistema
    logs.push({
      id: 'system-stats',
      type: 'system',
      message: `Sistema funcionando - DB: ${systemStats.database.connected ? 'Conectada' : 'Desconectada'}`,
      level: 'info',
      timestamp: new Date(),
      source: 'system',
      severity: 'INFO',
      details: systemStats,
      diagnostic: {
        databaseConnected: systemStats.database.connected,
        uptimeMinutes: Math.floor(systemStats.uptime / 60),
        memoryUsageMB: Math.round(systemStats.memory.heapUsed / 1024 / 1024),
        nodeVersion: systemStats.nodeVersion
      }
    });

    // Ordenar por timestamp descendente
    logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Agregar resumen de diagnóstico
    const diagnosticSummary = {
      totalLogs: logs.length,
      eventsCount: recentEvents.length,
      echeqsCount: recentEcheqs.length,
      tenantsCount: activeTenants.length,
      errorCount: logs.filter(log => log.level === 'error').length,
      warningCount: logs.filter(log => log.level === 'warning').length,
      infoCount: logs.filter(log => log.level === 'info').length,
      systemHealth: {
        database: systemStats.database.connected,
        uptime: systemStats.uptime,
        memory: systemStats.memory
      }
    };

    res.json({
      success: true,
      data: { 
        logs: logs.slice(0, 100), // Limitar a 100 logs
        total: logs.length, 
        timestamp: new Date().toISOString(),
        diagnosticSummary,
        systemStats
      },
      message: 'Logs detallados obtenidos exitosamente',
    });
  } catch (error) {
    console.error('Error getting logs:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error getting logs',
      error: error.message,
      stack: error.stack,
      diagnostic: {
        errorType: error.name,
        errorCode: error.code,
        timestamp: new Date().toISOString()
      }
    });
  }
});

/**
 * DELETE /sandbox/logs/clear
 * Borrar todos los logs del sistema (requiere clave de admin)
 */
router.delete('/logs/clear', async (req, res) => {
  try {
    // Verificar autorización
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Token de autorización requerido',
        error: 'MISSING_AUTH_TOKEN',
        timestamp: new Date().toISOString(),
      });
    }

    const token = authHeader.substring(7);
    const { validateAdminKey } = require('../utils/adminKey');
    if (!validateAdminKey(token)) {
      return res.status(403).json({
        success: false,
        message: 'Clave de administrador incorrecta',
        error: 'INVALID_ADMIN_KEY',
        timestamp: new Date().toISOString(),
      });
    }

    const { EcheqEvent, sequelize } = require('../models/index');
    
    // Contar registros antes de borrar
    const eventsCount = await EcheqEvent.count();
    
    // Borrar SOLO los logs de eventos usando SQL directo para evitar restricciones
    await sequelize.query('DELETE FROM echeqsandbox.echeq_events', {
      type: sequelize.QueryTypes.DELETE
    });
    
    const totalDeleted = eventsCount;

    logger.api('Logs borrados por administrador', {
      deletedEvents: eventsCount,
      totalDeleted: totalDeleted,
      timestamp: new Date().toISOString(),
      adminAction: true
    });

    res.json({
      success: true,
      data: {
        deletedEvents: eventsCount,
        totalDeleted: totalDeleted,
        timestamp: new Date().toISOString()
      },
      message: `Se borraron ${totalDeleted} logs exitosamente (${eventsCount} eventos)`,
    });
  } catch (error) {
    console.error('Error borrando logs:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error borrando logs',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /sandbox/tenant-data/:tenantId
 * Obtener datos de un tenant
 */
router.get('/tenant-data/:tenantId', async (req, res) => {
  try {
    const { tenantId } = req.params;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: 'tenantId es requerido',
        error: 'MISSING_REQUIRED_FIELDS',
        timestamp: new Date().toISOString(),
      });
    }

    // Simular obtención de datos del tenant
    const tenantData = {
      id: tenantId,
      name: `Tenant ${tenantId}`,
      status: 'active',
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      statistics: {
        totalRequests: Math.floor(Math.random() * 1000),
        successRate: 95.5,
        averageResponseTime: 150,
      },
    };

    res.status(200).json({
      success: true,
      message: 'Datos del tenant obtenidos exitosamente',
      data: tenantData,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error obteniendo datos del tenant:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * DELETE /sandbox/tenant-data/:tenantId
 * Eliminar datos de un tenant
 */
router.delete('/tenant-data/:tenantId', async (req, res) => {
  try {
    const { tenantId } = req.params;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: 'tenantId es requerido',
        error: 'MISSING_REQUIRED_FIELDS',
        timestamp: new Date().toISOString(),
      });
    }

    logger.api('Datos del tenant eliminados', {
      tenantId,
      timestamp: new Date().toISOString()
    });

    res.status(200).json({
      success: true,
      message: 'Datos del tenant eliminados exitosamente',
      data: { tenantId, deletedAt: new Date().toISOString() },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error eliminando datos del tenant:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /sandbox/tenants
 * Listar todos los tenants (requiere admin key)
 */
router.get('/tenants', async (req, res) => {
  try {
    const { adminKey } = req.query;

    const { validateAdminKey } = require('../utils/adminKey');
    if (!adminKey || !validateAdminKey(adminKey)) {
      return res.status(401).json({
        success: false,
        message: 'Clave de administrador requerida',
        error: 'UNAUTHORIZED',
        timestamp: new Date().toISOString(),
      });
    }

    // Obtener tenants reales de la base de datos
    const tenants = await TenantSimple.findAll({
      attributes: ['id', 'name', 'code', 'description', 'is_active', 'createdAt', 'updatedAt'],
      order: [['createdAt', 'DESC']]
    });

    // Formatear los datos para el frontend
    const formattedTenants = tenants.map(tenant => ({
      id: tenant.id,
      name: tenant.name,
      code: tenant.code,
      description: tenant.description,
      cuit: tenant.code ? tenant.code.replace(/[^0-9]/g, '').padStart(11, '20') : '20123456789', // Generar CUIT simulado basado en código
      status: tenant.is_active ? 'active' : 'inactive',
      created_at: tenant.createdAt,
      createdAt: tenant.createdAt, // Mantener ambos formatos por compatibilidad
    }));

    res.status(200).json({
      success: true,
      message: 'Lista de tenants obtenida exitosamente',
      data: formattedTenants,
      count: formattedTenants.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error obteniendo lista de tenants:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * DELETE /sandbox/tenants/:tenantId
 * Eliminar un tenant (requiere admin key)
 */
router.delete('/tenants/:tenantId', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { adminKey } = req.query;

    const { validateAdminKey } = require('../utils/adminKey');
    if (!adminKey || !validateAdminKey(adminKey)) {
      return res.status(401).json({
        success: false,
        message: 'Clave de administrador requerida',
        error: 'UNAUTHORIZED',
        timestamp: new Date().toISOString(),
      });
    }

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: 'tenantId es requerido',
        error: 'MISSING_REQUIRED_FIELDS',
        timestamp: new Date().toISOString(),
      });
    }

    logger.api('Tenant eliminado', {
      tenantId,
      adminKey,
      timestamp: new Date().toISOString()
    });

    res.status(200).json({
      success: true,
      message: 'Tenant eliminado exitosamente',
      data: { tenantId, deletedAt: new Date().toISOString() },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error eliminando tenant:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /sandbox/tenant-credentials/:tenantId
 * Obtener credenciales de un tenant
 */
router.get('/tenant-credentials/:tenantId', (req, res) => {
  try {
    const { tenantId } = req.params;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        message: 'tenantId es requerido',
        error: 'MISSING_REQUIRED_FIELDS',
        timestamp: new Date().toISOString(),
      });
    }

    // Simular credenciales del tenant
    const credentials = {
      tenantId,
      apiKey: `api_${tenantId}_${Date.now()}`,
      apiSecret: `secret_${tenantId}_${Math.random().toString(36).substring(2)}`,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    };

    res.status(200).json({
      success: true,
      message: 'Credenciales del tenant obtenidas exitosamente',
      data: credentials,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error obteniendo credenciales del tenant:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /sandbox/debug-tenant/:id
 * Debug de un tenant específico
 */
router.get('/debug-tenant/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        success: false,
        message: 'ID es requerido',
        error: 'MISSING_REQUIRED_FIELDS',
        timestamp: new Date().toISOString(),
      });
    }

    // Simular datos de debug
    const debugData = {
      tenantId: id,
      status: 'active',
      lastActivity: new Date().toISOString(),
      configuration: {
        maxRequests: 1000,
        timeout: 30000,
        retries: 3,
      },
      statistics: {
        totalRequests: Math.floor(Math.random() * 1000),
        successRate: 95.5,
        averageResponseTime: 150,
        errors: Math.floor(Math.random() * 10),
      },
    };

    res.status(200).json({
      success: true,
      message: 'Datos de debug obtenidos exitosamente',
      data: debugData,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error obteniendo datos de debug:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

/**
 * GET /sandbox/debug-panel
 * Panel de debug del sandbox
 */
router.get('/debug-panel', (req, res) => {
  res.send(`<!DOCTYPE html>
<html>
<head>
    <title>Debug Panel - Sandbox ECHEQ</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .container { max-width: 800px; margin: 0 auto; }
        .section { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
        .endpoint { background: #f5f5f5; padding: 10px; margin: 5px 0; border-radius: 3px; }
        .method { font-weight: bold; color: #007bff; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔧 Debug Panel - Sandbox ECHEQ</h1>
        
        <div class="section">
            <h2>📊 Endpoints de Administración</h2>
            <div class="endpoint">
                <span class="method">POST</span> /sandbox/create-tenant - Crear tenant
            </div>
            <div class="endpoint">
                <span class="method">POST</span> /sandbox/generate-keys/:tenantId - Generar API keys
            </div>
            <div class="endpoint">
                <span class="method">GET</span> /sandbox/logs - Obtener logs del sistema
            </div>
            <div class="endpoint">
                <span class="method">GET</span> /sandbox/tenants - Listar tenants (requiere admin key)
            </div>
            <div class="endpoint">
                <span class="method">GET</span> /sandbox/tenant-data/:tenantId - Datos del tenant
            </div>
            <div class="endpoint">
                <span class="method">DELETE</span> /sandbox/tenant-data/:tenantId - Eliminar datos del tenant
            </div>
        </div>
        
        <div class="section">
            <h2>🔗 Enlaces Útiles</h2>
            <p><a href="/api-docs">📚 Documentación API</a></p>
            <p><a href="/swagger.json">📄 Swagger JSON</a></p>
            <p><a href="/health">❤️ Health Check</a></p>
        </div>
    </div>
</body>
</html>`);
});

/**
 * GET /sandbox/api-docs
 * Panel de administración
 */
/**
 * GET /api-docs
 * Redirigir al Swagger del BFF
 * ✅ MIGRADO: Ahora apunta al Swagger del BFF en lugar de documentación local
 */
router.get('/api-docs', (req, res) => {
  try {
    const bffUrl = process.env.CORE_BFF_URL || 'http://localhost:3002';
    const swaggerUrl = `${bffUrl}/api/docs`;
    
    // Redirigir al Swagger del BFF
    res.redirect(swaggerUrl);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error redirigiendo al Swagger del BFF',
      error: error.message,
    });
  }
});

/**
 * GET /api-docs-old
 * Versión antigua (mantener por compatibilidad)
 */
router.get('/api-docs-old', (req, res) => {
  try {
    res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>COELSA Sandbox API Documentation</title>
      <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@4.15.5/swagger-ui.css" />
    </head>
    <body>
      <div id="swagger-ui"></div>
      <script src="https://unpkg.com/swagger-ui-dist@4.15.5/swagger-ui-bundle.js"></script>
      <script>
        // Leer credenciales de los parámetros de URL
        const urlParams = new URLSearchParams(window.location.search);
        const apiKey = urlParams.get('apiKey');
        const apiSecret = urlParams.get('apiSecret');
        const tenantId = urlParams.get('tenantId');
        
        console.log('🔍 [SWAGGER] Parámetros de URL encontrados:', {
          apiKey: apiKey ? apiKey.substring(0, 10) + '...' : 'No encontrado',
          apiSecret: apiSecret ? apiSecret.substring(0, 10) + '...' : 'No encontrado',
          tenantId: tenantId ? tenantId.substring(0, 10) + '...' : 'No encontrado'
        });
        
        const ui = SwaggerUIBundle({
          url: '/api/coelsa/swagger.json',
          dom_id: '#swagger-ui',
          presets: [
            SwaggerUIBundle.presets.apis,
            SwaggerUIBundle.presets.standalone
          ],
          onComplete: function() {
            console.log('✅ [SWAGGER] Swagger UI cargado con autenticación automática');
            if (apiKey && apiSecret && tenantId) {
              console.log('🔐 [SWAGGER] Pre-autorizando credenciales automáticamente...');
              ui.preauthorizeApiKey("CoelsaApiKey", apiKey);
              ui.preauthorizeApiKey("CoelsaApiSecret", apiSecret);
              ui.preauthorizeApiKey("CoelsaTenantId", tenantId);
              console.log('🔐 [SWAGGER] Credenciales pre-autorizadas en Swagger UI.');
            } else {
              console.warn('⚠️ [SWAGGER] No se encontraron credenciales válidas en URL para pre-autorizar.');
            }
          }
        });
      </script>
    </body>
    </html>
  `);
  } catch (error) {
    console.error('Error renderizando documentación:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message,
    });
  }
});

/**
 * GET /sandbox/api/admin/system-data
 * Datos del sistema
 */
router.get('/api/admin/system-data', (req, res) => {
  res.json({ message: 'Datos del sistema - En desarrollo' });
});

/**
 * GET /sandbox/api/admin/logs
 * Logs del sistema
 */
router.get('/api/admin/logs', (req, res) => {
  res.json({ message: 'Logs del sistema - En desarrollo' });
});

/**
 * GET /sandbox/api-docs-old
 * Documentación antigua
 */
router.get('/api-docs-old', (req, res) => {
  try {
    res.send(`<!DOCTYPE html>
<html>
<head>
    <title>Documentación API - Sandbox ECHEQ</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .container { max-width: 1000px; margin: 0 auto; }
        .section { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
        .endpoint { background: #f5f5f5; padding: 10px; margin: 5px 0; border-radius: 3px; }
        .method { font-weight: bold; color: #007bff; }
    </style>
</head>
<body>
    <div class="container">
        <h1>📚 Documentación API - Sandbox ECHEQ</h1>
        
        <div class="section">
            <h2>🔧 Endpoints de Administración del Sandbox</h2>
            <p>Estos endpoints son internos del sandbox y NO forman parte de la API oficial de COELSA.</p>
            
            <h3>Gestión de Tenants</h3>
            <div class="endpoint">
                <span class="method">POST</span> /sandbox/create-tenant - Crear nuevo tenant
            </div>
            <div class="endpoint">
                <span class="method">GET</span> /sandbox/tenants - Listar todos los tenants
            </div>
            <div class="endpoint">
                <span class="method">DELETE</span> /sandbox/tenants/:tenantId - Eliminar tenant
            </div>
            
            <h3>Gestión de API Keys</h3>
            <div class="endpoint">
                <span class="method">POST</span> /sandbox/generate-keys/:tenantId - Generar API keys
            </div>
            <div class="endpoint">
                <span class="method">GET</span> /sandbox/tenant-credentials/:tenantId - Obtener credenciales
            </div>
            
            <h3>Logs y Debug</h3>
            <div class="endpoint">
                <span class="method">GET</span> /sandbox/logs - Obtener logs del sistema
            </div>
            <div class="endpoint">
                <span class="method">GET</span> /sandbox/debug-panel - Panel de debug
            </div>
        </div>
        
        <div class="section">
            <h2>🔗 Enlaces Útiles</h2>
            <p><a href="/api-docs">📚 Documentación API</a></p>
            <p><a href="/swagger.json">📄 Swagger JSON</a></p>
            <p><a href="/health">❤️ Health Check</a></p>
        </div>
    </div>
</body>
</html>`);
  } catch (error) {
    console.error('Error renderizando documentación:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message,
    });
  }
});

module.exports = router;
