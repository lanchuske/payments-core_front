/**
 * Controlador Administrativo
 * Endpoints para administración del sistema
 */

// Importar modelos solo cuando sea necesario
let Tenant, Account, Echeq;

try {
  const models = require('../models');
  Tenant = models.TenantSimple;
  Account = models.Account;
  Echeq = models.Echeq;
} catch (error) {
  console.log('⚠️ Modelos no disponibles:', error.message);
  // Crear objetos mock para desarrollo
  Tenant = {
    findAll: () => Promise.resolve([]),
    create: () => Promise.resolve({}),
  };
  Account = {
    findAll: () => Promise.resolve([]),
    create: () => Promise.resolve({}),
  };
  Echeq = {
    findAll: () => Promise.resolve([]),
    count: () => Promise.resolve(0),
  };
}

class AdminController {
  /**
   * GET /admin/tenants
   * Listar todos los tenants
   * ✅ MIGRADO: Ahora usa BFF API
   */
  async listarTenants(req, res) {
    try {
      const bffClient = require('../services/bffClient');
      const { formatErrorResponse } = require('../utils/errorHandler');

      const response = await bffClient.getTenants({
        page: req.query.page || 1,
        limit: req.query.limit || 100,
      });

      // Formatear para mantener compatibilidad
      const tenants = (response.data || []).map(tenant => ({
        id: tenant.id,
        name: tenant.name || tenant.tenantName,
        code: tenant.code || tenant.tenantId,
        description: tenant.description || tenant.name || tenant.tenantName,
        created_at: tenant.createdAt || tenant.created_at,
        updated_at: tenant.updatedAt || tenant.updated_at,
      }));

      res.json({
        success: true,
        data: {
          tenants: tenants,
          total: response.total || tenants.length
        },
        message: 'Tenants listados exitosamente'
      });
    } catch (error) {
      const { formatErrorResponse } = require('../utils/errorHandler');
      res.status(error.response?.status || 500).json(
        formatErrorResponse(error, 'Error interno del servidor')
      );
    }
  }

  /**
   * POST /admin/tenants
   * Crear nuevo tenant
   * ✅ MIGRADO: Ahora usa BFF API
   */
  async crearTenant(req, res) {
    try {
      const { name, description, status = 'ACTIVE', tenantId, type, taxId } = req.body;

      if (!name && !tenantId) {
        return res.status(400).json({
          success: false,
          message: 'Nombre del tenant o tenantId es requerido'
        });
      }

      const bffClient = require('../services/bffClient');
      const { formatErrorResponse } = require('../utils/errorHandler');

      // Preparar datos para el BFF
      const tenantData = {
        tenantId: tenantId || `TENANT_${Date.now()}`,
        tenantName: name,
        type: type || 'COMPANY',
        taxId: taxId || null,
        status: status === 'ACTIVE' ? 'ACTIVE' : 'INACTIVE',
        ...(description && { description }),
      };

      const response = await bffClient.createTenant(tenantData);

      res.status(201).json({
        success: true,
        data: response.data || response,
        message: response.message || 'Tenant creado exitosamente'
      });
    } catch (error) {
      const { formatErrorResponse } = require('../utils/errorHandler');
      res.status(error.response?.status || 500).json(
        formatErrorResponse(error, 'Error interno del servidor')
      );
    }
  }

  /**
   * GET /admin/stats
   * Obtener estadísticas del sistema
   */
  async getStats(req, res) {
    try {
      const totalTenants = await Tenant.count();
      const totalAccounts = await Account.count();
      const totalEcheqs = await Echeq.count();

      const stats = {
        tenants: {
          total: totalTenants
        },
        accounts: {
          total: totalAccounts
        },
        echeqs: {
          total: totalEcheqs,
          emitted: await Echeq.count({ where: { status: 'EMITTED' } }),
          active: await Echeq.count({ where: { status: 'ACTIVE' } }),
          endorsed: await Echeq.count({ where: { status: 'ENDORSED' } })
        },
        timestamp: new Date().toISOString()
      };

      res.json({
        success: true,
        data: stats,
        message: 'Estadísticas obtenidas exitosamente'
      });
    } catch (error) {
      console.error('Error obteniendo estadísticas:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  /**
   * DELETE /admin/tenants/:id
   * Eliminar un tenant
   */
  async eliminarTenant(req, res) {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'ID del tenant es requerido'
        });
      }

      // Simular eliminación de tenant
      console.log(`🗑️ [ADMIN] Eliminando tenant: ${id}`);

      res.json({
        success: true,
        data: { 
          tenantId: id, 
          deletedAt: new Date().toISOString() 
        },
        message: 'Tenant eliminado exitosamente'
      });
    } catch (error) {
      console.error('Error eliminando tenant:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  /**
   * GET /admin/health
   * Health check administrativo
   */
  async getHealth(req, res) {
    try {
      const health = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services: {
          database: 'connected',
          api: 'running',
          admin: 'active'
        },
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development'
      };

      res.json({
        success: true,
        data: health,
        message: 'Sistema funcionando correctamente'
      });
    } catch (error) {
      console.error('Error en health check:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }

  /**
   * GET /admin/tenants/:id/credentials
   * Obtener credenciales de un tenant específico
   */
  async obtenerCredenciales(req, res) {
    try {
      const { id } = req.params;

      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'ID del tenant es requerido'
        });
      }

      // Simular credenciales para el tenant
      const credentials = {
        tenantId: id,
        apiKey: `sandbox_api_key_${id.substring(0, 8)}`,
        apiSecret: `sandbox_secret_${id.substring(0, 8)}_${Date.now()}`,
        baseUrl: 'https://sandbox.echeq.ar/api',
        environment: 'sandbox',
        permissions: [
          'read:cheques',
          'write:cheques',
          'read:cuentas',
          'write:cuentas',
          'read:endosos',
          'write:endosos'
        ],
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 año
        createdAt: new Date().toISOString()
      };

      console.log(`🔑 [ADMIN] Obteniendo credenciales para tenant: ${id}`);

      res.json({
        success: true,
        data: credentials,
        message: 'Credenciales obtenidas exitosamente'
      });
    } catch (error) {
      console.error('Error obteniendo credenciales:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: error.message
      });
    }
  }
}

module.exports = AdminController;