/**
 * Controlador de Gestión de Tenants
 * Maneja las operaciones HTTP relacionadas con tenants
 */

const tenantService = require('../services/tenantService');
const { ApiResponse } = require('../utils/apiResponse');

class TenantController {
  /**
   * Crear un nuevo tenant
   * POST /api/tenants
   */
  async createTenant(req, res) {
    try {
      const result = await tenantService.createTenant(req.body);
      res.status(201).json(result);
    } catch (error) {
      console.error('Error en createTenant controller:', error);
      res
        .status(400)
        .json(
          new ApiResponse(
            false,
            error.message || 'Error al crear tenant',
            null,
            'TENANT_CREATION_ERROR'
          )
        );
    }
  }

  /**
   * Obtener un tenant por ID
   * GET /api/tenants/:id
   */
  async getTenantById(req, res) {
    try {
      const { id } = req.params;
      const result = await tenantService.getTenantById(id);
      res.status(200).json(result);
    } catch (error) {
      console.error('Error en getTenantById controller:', error);
      res
        .status(404)
        .json(
          new ApiResponse(
            false,
            error.message || 'Tenant no encontrado',
            null,
            'TENANT_NOT_FOUND'
          )
        );
    }
  }

  /**
   * Obtener un tenant por código
   * GET /api/tenants/code/:codigo
   */
  async getTenantByCode(req, res) {
    try {
      const { codigo } = req.params;
      const result = await tenantService.getTenantByCode(codigo);
      res.status(200).json(result);
    } catch (error) {
      console.error('Error en getTenantByCode controller:', error);
      res
        .status(404)
        .json(
          new ApiResponse(
            false,
            error.message || 'Tenant no encontrado',
            null,
            'TENANT_NOT_FOUND'
          )
        );
    }
  }

  /**
   * Listar todos los tenants
   * GET /api/tenants
   */
  async listTenants(req, res) {
    try {
      const filters = {
        page: req.query.page,
        limit: req.query.limit,
        status: req.query.status,
        search: req.query.search,
        sortBy: req.query.sortBy,
        sortOrder: req.query.sortOrder,
      };

      const result = await tenantService.listTenants(filters);
      res.status(200).json(result);
    } catch (error) {
      console.error('Error en listTenants controller:', error);
      res
        .status(500)
        .json(
          new ApiResponse(
            false,
            'Error al listar tenants',
            null,
            'TENANT_LIST_ERROR'
          )
        );
    }
  }

  /**
   * Actualizar un tenant
   * PUT /api/tenants/:id
   */
  async updateTenant(req, res) {
    try {
      const { id } = req.params;
      const result = await tenantService.updateTenant(id, req.body);
      res.status(200).json(result);
    } catch (error) {
      console.error('Error en updateTenant controller:', error);
      res
        .status(400)
        .json(
          new ApiResponse(
            false,
            error.message || 'Error al actualizar tenant',
            null,
            'TENANT_UPDATE_ERROR'
          )
        );
    }
  }

  /**
   * Activar un tenant
   * PUT /api/tenants/:id/activate
   */
  async activateTenant(req, res) {
    try {
      const { id } = req.params;
      const result = await tenantService.activateTenant(id);
      res.status(200).json(result);
    } catch (error) {
      console.error('Error en activateTenant controller:', error);
      res
        .status(400)
        .json(
          new ApiResponse(
            false,
            error.message || 'Error al activar tenant',
            null,
            'TENANT_ACTIVATION_ERROR'
          )
        );
    }
  }

  /**
   * Suspender un tenant
   * PUT /api/tenants/:id/suspend
   */
  async suspendTenant(req, res) {
    try {
      const { id } = req.params;
      const { motivo } = req.body;
      const result = await tenantService.suspendTenant(id, motivo);
      res.status(200).json(result);
    } catch (error) {
      console.error('Error en suspendTenant controller:', error);
      res
        .status(400)
        .json(
          new ApiResponse(
            false,
            error.message || 'Error al suspender tenant',
            null,
            'TENANT_SUSPENSION_ERROR'
          )
        );
    }
  }

  /**
   * Eliminar un tenant
   * DELETE /api/tenants/:id
   */
  async deleteTenant(req, res) {
    try {
      const { id } = req.params;
      const result = await tenantService.deleteTenant(id);
      res.status(200).json(result);
    } catch (error) {
      console.error('Error en deleteTenant controller:', error);
      res
        .status(400)
        .json(
          new ApiResponse(
            false,
            error.message || 'Error al eliminar tenant',
            null,
            'TENANT_DELETION_ERROR'
          )
        );
    }
  }

  /**
   * Obtener estadísticas del tenant
   * GET /api/tenants/:id/stats
   */
  async getTenantStats(req, res) {
    try {
      const { id } = req.params;
      const result = await tenantService.getTenantStats(id);
      res.status(200).json(result);
    } catch (error) {
      console.error('Error en getTenantStats controller:', error);
      res
        .status(404)
        .json(
          new ApiResponse(
            false,
            error.message || 'Error al obtener estadísticas',
            null,
            'TENANT_STATS_ERROR'
          )
        );
    }
  }

  /**
   * Obtener configuración comercial del tenant
   * GET /api/tenants/:id/config
   */
  async getTenantCommercialConfig(req, res) {
    try {
      const { id } = req.params;
      const result = await tenantService.getTenantCommercialConfig(id);
      res.status(200).json(result);
    } catch (error) {
      console.error('Error en getTenantCommercialConfig controller:', error);
      res
        .status(404)
        .json(
          new ApiResponse(
            false,
            error.message || 'Error al obtener configuración',
            null,
            'TENANT_CONFIG_ERROR'
          )
        );
    }
  }

  /**
   * Actualizar credenciales COELSA del tenant
   * PUT /api/tenants/:id/coelsa-credentials
   */
  async updateCoelsaCredentials(req, res) {
    try {
      const { id } = req.params;
      const result = await tenantService.updateCoelsaCredentials(id, req.body);
      res.status(200).json(result);
    } catch (error) {
      console.error('Error en updateCoelsaCredentials controller:', error);
      res
        .status(400)
        .json(
          new ApiResponse(
            false,
            error.message || 'Error al actualizar credenciales COELSA',
            null,
            'COELSA_CREDENTIALS_ERROR'
          )
        );
    }
  }

  /**
   * Verificar si un tenant puede realizar una operación
   * POST /api/tenants/:id/can-perform
   */
  async canTenantPerformOperation(req, res) {
    try {
      const { id } = req.params;
      const { operation, amount } = req.body;

      const canPerform = await tenantService.canTenantPerformOperation(
        id,
        operation,
        amount
      );

      res.status(200).json(
        new ApiResponse(true, 'Verificación completada', {
          canPerform,
          operation,
          amount,
        })
      );
    } catch (error) {
      console.error('Error en canTenantPerformOperation controller:', error);
      res
        .status(500)
        .json(
          new ApiResponse(
            false,
            'Error al verificar operación',
            null,
            'OPERATION_CHECK_ERROR'
          )
        );
    }
  }

  /**
   * Obtener información básica del tenant actual
   * GET /api/tenants/current
   */
  async getCurrentTenant(req, res) {
    try {
      if (!req.tenant) {
        return res
          .status(404)
          .json(
            new ApiResponse(
              false,
              'No hay tenant activo en la sesión',
              null,
              'NO_ACTIVE_TENANT'
            )
          );
      }

      // Omitir información sensible
      const tenantInfo = {
        id: req.tenant.id,
        name: req.tenant.name,
        code: req.tenant.code,
        status: req.tenant.status,
        branding: req.tenant.branding,
        commercialConfig: req.tenant.getConfiguracionComercial(),
        limits: req.tenant.getLimites(),
        rules: req.tenant.getReglas(),
      };

      res
        .status(200)
        .json(
          new ApiResponse(true, 'Información del tenant obtenida', tenantInfo)
        );
    } catch (error) {
      console.error('Error en getCurrentTenant controller:', error);
      res
        .status(500)
        .json(
          new ApiResponse(
            false,
            'Error al obtener información del tenant',
            null,
            'CURRENT_TENANT_ERROR'
          )
        );
    }
  }

  /**
   * Obtener logs del tenant
   * GET /api/tenants/:id/logs
   */
  async getTenantLogs(req, res) {
    try {
      const { id } = req.params;
      const { limit = 50, level, startDate, endDate } = req.query;

      const logs = await tenantService.getTenantLogs(id, {
        limit: parseInt(limit),
        level,
        startDate,
        endDate,
      });

      res
        .status(200)
        .json(
          new ApiResponse(true, 'Logs del tenant obtenidos exitosamente', logs)
        );
    } catch (error) {
      console.error('Error en getTenantLogs controller:', error);
      res
        .status(500)
        .json(
          new ApiResponse(
            false,
            'Error al obtener logs del tenant',
            null,
            'TENANT_LOGS_ERROR'
          )
        );
    }
  }

  /**
   * Generar API keys del sandbox para un tenant
   * POST /api/tenants/:id/generate-keys
   */
  async generateSandboxApiKeys(req, res) {
    try {
      const { id } = req.params;
      const result = await tenantService.generateSandboxApiKeys(id);
      res.status(200).json(result);
    } catch (error) {
      console.error('Error en generateSandboxApiKeys controller:', error);
      res
        .status(400)
        .json(
          new ApiResponse(
            false,
            error.message || 'Error al generar API keys del sandbox',
            null,
            'SANDBOX_API_KEYS_ERROR'
          )
        );
    }
  }
}

module.exports = new TenantController();
