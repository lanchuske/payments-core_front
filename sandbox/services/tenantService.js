/**
 * Servicio de Gestión de Tenants
 * Gestiona operaciones relacionadas con tenants (bancos/entidades financieras)
 */

const { v4: uuidv4 } = require('uuid');
const { Op } = require('sequelize');
const { TenantSimple, User, Client, Account, Echeq } = require('../models');
const { ApiResponse } = require('../utils/apiResponse');

class TenantService {
  /**
   * Crear un nuevo tenant
   * Acepta code o tenantId (el frontend api-migrated puede enviar tenantId con el valor del código)
   */
  async createTenant(tenantData) {
    try {
      const codeRaw = tenantData.code ?? tenantData.tenantId;
      if (!tenantData.name || !codeRaw) {
        throw new Error('Nombre y código son requeridos');
      }
      const code = String(codeRaw).trim();

      // Verificar que el código no exista
      const existingTenant = await TenantSimple.findOne({
        where: { code },
      });

      if (existingTenant) {
        throw new Error('El código de tenant ya existe');
      }

      // Crear el tenant
      const tenant = await TenantSimple.create({
        id: uuidv4(),
        name: tenantData.name,
        code,
        cuit: tenantData.cuit || null,
        branding: tenantData.branding || {},
        domains: tenantData.domains || [],
        limits: tenantData.limits || {},
        rules: tenantData.rules || {},
        credenciales_coelsa: tenantData.credenciales_coelsa || {},
        commercialConfig: tenantData.commercialConfig || {},
        primaryContact: tenantData.primaryContact || {},
        notificationConfig: tenantData.notificationConfig || {},
        metadata: tenantData.metadata || {},
      });

      return new ApiResponse(true, 'Tenant creado exitosamente', tenant);
    } catch (error) {
      console.error('Error en createTenant:', error);
      throw error;
    }
  }

  /**
   * Obtener un tenant por ID
   */
  async getTenantById(tenantId) {
    try {
      const tenant = await TenantSimple.findByPk(tenantId);

      if (!tenant) {
        throw new Error('Tenant no encontrado');
      }

      return new ApiResponse(true, 'Tenant encontrado', tenant);
    } catch (error) {
      console.error('Error en getTenantById:', error);
      throw error;
    }
  }

  /**
   * Obtener un tenant por código
   */
  async getTenantByCode(codigo) {
    try {
      const tenant = await TenantSimple.findOne({
        where: { code: codigo },
      });

      if (!tenant) {
        throw new Error('Tenant no encontrado');
      }

      return new ApiResponse(true, 'Tenant encontrado', tenant);
    } catch (error) {
      console.error('Error en getTenantByCode:', error);
      throw error;
    }
  }

  /**
   * Listar todos los tenants con filtros
   */
  async listTenants(filters = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        estado,
        search,
        sortBy = 'createdAt',
        sortOrder = 'DESC',
      } = filters;

      const offset = (page - 1) * limit;
      const whereClause = {};

      // Filtros
      if (estado) {
        whereClause.status = estado;
      }

      if (search) {
        whereClause[Op.or] = [
          { name: { [Op.iLike]: `%${search}%` } },
          { code: { [Op.iLike]: `%${search}%` } },
        ];
      }

      const { count, rows } = await TenantSimple.findAndCountAll({
        where: whereClause,
        order: [[sortBy, sortOrder]],
        limit: parseInt(limit),
        offset: parseInt(offset),
        attributes: { exclude: ['credenciales_coelsa'] }, // No mostrar credenciales sensibles
      });

      const pagination = {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        totalPages: Math.ceil(count / limit),
      };

      return new ApiResponse(true, 'Tenants listados exitosamente', {
        tenants: rows,
        pagination,
      });
    } catch (error) {
      console.error('Error en listTenants:', error);
      throw error;
    }
  }

  /**
   * Actualizar un tenant
   */
  async updateTenant(tenantId, updateData) {
    try {
      const tenant = await TenantSimple.findByPk(tenantId);

      if (!tenant) {
        throw new Error('Tenant no encontrado');
      }

      // Campos que se pueden actualizar
      const allowedFields = [
        'name',
        'code',
        'cuit',
        'type',
        'branding',
        'domains',
        'limits',
        'rules',
        'commercialConfig',
        'primaryContact',
        'notificationConfig',
        'metadata',
      ];

      const updateFields = {};
      allowedFields.forEach(field => {
        if (updateData[field] !== undefined) {
          updateFields[field] = updateData[field];
        }
      });

      await tenant.update(updateFields);

      return new ApiResponse(true, 'Tenant actualizado exitosamente', tenant);
    } catch (error) {
      console.error('Error en updateTenant:', error);
      throw error;
    }
  }

  /**
   * Activar un tenant
   */
  async activateTenant(tenantId) {
    try {
      const tenant = await TenantSimple.findByPk(tenantId);

      if (!tenant) {
        throw new Error('Tenant no encontrado');
      }

      if (tenant.isActive()) {
        throw new Error('El tenant ya está activo');
      }

      await tenant.update({
        status: 'ACTIVE',
        activationDate: new Date(),
      });

      return new ApiResponse(true, 'Tenant activado exitosamente', tenant);
    } catch (error) {
      console.error('Error en activateTenant:', error);
      throw error;
    }
  }

  /**
   * Suspender un tenant
   */
  async suspendTenant(tenantId, motivo = null) {
    try {
      const tenant = await TenantSimple.findByPk(tenantId);

      if (!tenant) {
        throw new Error('Tenant no encontrado');
      }

      if (tenant.isSuspended()) {
        throw new Error('El tenant ya está suspendido');
      }

      await tenant.update({
        status: 'SUSPENDED',
        suspensionDate: new Date(),
        metadata: {
          ...tenant.metadata,
          suspension_motivo: motivo,
        },
      });

      return new ApiResponse(true, 'Tenant suspendido exitosamente', tenant);
    } catch (error) {
      console.error('Error en suspendTenant:', error);
      throw error;
    }
  }

  /**
   * Eliminar un tenant (soft delete)
   */
  async deleteTenant(tenantId) {
    try {
      const tenant = await TenantSimple.findByPk(tenantId);

      if (!tenant) {
        throw new Error('Tenant no encontrado');
      }

      // Verificar que no tenga datos asociados
      const userCount = await User.count({ where: { tenantId: tenantId } });
      const clientCount = await Client.count({ where: { tenantId: tenantId } });
      const accountCount = await Account.count({
        where: { tenantId: tenantId },
      });
      const echeqCount = await Echeq.count({ where: { tenantId: tenantId } });

      if (
        userCount > 0 ||
        clientCount > 0 ||
        accountCount > 0 ||
        echeqCount > 0
      ) {
        throw new Error(
          'No se puede eliminar el tenant porque tiene datos asociados'
        );
      }

      await tenant.update({
        status: 'INACTIVE',
        metadata: {
          ...tenant.metadata,
          deleted_at: new Date(),
        },
      });

      return new ApiResponse(true, 'Tenant eliminado exitosamente');
    } catch (error) {
      console.error('Error en deleteTenant:', error);
      throw error;
    }
  }

  /**
   * Obtener estadísticas del tenant
   */
  async getTenantStats(tenantId) {
    try {
      const tenant = await TenantSimple.findByPk(tenantId);

      if (!tenant) {
        throw new Error('Tenant no encontrado');
      }

      // Contar entidades asociadas
      const userCount = await User.count({ where: { tenantId: tenantId } });
      const clientCount = await Client.count({ where: { tenantId: tenantId } });
      const accountCount = await Account.count({
        where: { tenantId: tenantId },
      });
      const echeqCount = await Echeq.count({ where: { tenantId: tenantId } });

      // Contar por estado
      const activeUserCount = await User.count({
        where: { tenantId: tenantId, status: 'ACTIVE' },
      });
      const activeClientCount = await Client.count({
        where: { tenantId: tenantId, status: 'ACTIVE' },
      });
      const activeAccountCount = await Account.count({
        where: { tenantId: tenantId, status: 'ACTIVE' },
      });
      const activeEcheqCount = await Echeq.count({
        where: { tenantId: tenantId, status: 'ACTIVE' },
      });

      const stats = {
        tenant: {
          id: tenant.id,
          name: tenant.name,
          code: tenant.code,
          status: tenant.status,
          activationDate: tenant.activationDate,
        },
        usuarios: {
          total: userCount,
          activos: activeUserCount,
          inactivos: userCount - activeUserCount,
        },
        clientes: {
          total: clientCount,
          activos: activeClientCount,
          inactivos: clientCount - activeClientCount,
        },
        cuentas: {
          total: accountCount,
          activas: activeAccountCount,
          inactivas: accountCount - activeAccountCount,
        },
        echeqs: {
          total: echeqCount,
          activos: activeEcheqCount,
          inactivos: echeqCount - activeEcheqCount,
        },
      };

      return new ApiResponse(
        true,
        'Estadísticas obtenidas exitosamente',
        stats
      );
    } catch (error) {
      console.error('Error en getTenantStats:', error);
      throw error;
    }
  }

  /**
   * Verificar si un tenant puede realizar una operación
   */
  async canTenantPerformOperation(tenantId, operation, amount = 0) {
    try {
      const tenant = await TenantSimple.findByPk(tenantId);

      if (!tenant) {
        return false;
      }

      return tenant.canPerformOperation(operation, amount);
    } catch (error) {
      console.error('Error en canTenantPerformOperation:', error);
      return false;
    }
  }

  /**
   * Obtener configuración comercial del tenant
   */
  async getTenantCommercialConfig(tenantId) {
    try {
      const tenant = await TenantSimple.findByPk(tenantId);

      if (!tenant) {
        throw new Error('Tenant no encontrado');
      }

      return new ApiResponse(true, 'Configuración obtenida exitosamente', {
        commercialConfig: tenant.getConfiguracionComercial(),
        limits: tenant.getLimites(),
        rules: tenant.getReglas(),
      });
    } catch (error) {
      console.error('Error en getTenantCommercialConfig:', error);
      throw error;
    }
  }

  /**
   * Actualizar credenciales COELSA del tenant
   */
  async updateCoelsaCredentials(tenantId, credentials) {
    try {
      const tenant = await TenantSimple.findByPk(tenantId);

      if (!tenant) {
        throw new Error('Tenant no encontrado');
      }

      await tenant.update({
        credenciales_coelsa: credentials,
      });

      return new ApiResponse(
        true,
        'Credenciales COELSA actualizadas exitosamente'
      );
    } catch (error) {
      console.error('Error en updateCoelsaCredentials:', error);
      throw error;
    }
  }

  /**
   * Obtener logs del tenant
   */
  async getTenantLogs(tenantId, filters = {}) {
    try {
      const { limit = 50, level } = filters;

      // Primero verificar que el tenant existe
      const tenant = await TenantSimple.findByPk(tenantId);
      if (!tenant) {
        throw new Error('Tenant no encontrado');
      }

      // Generar logs realistas basados en el tenant real
      const mockLogs = [
        {
          id: 1,
          timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
          level: 'INFO',
          message: `Operación de emisión procesada para ${tenant.name} (${tenant.code})`,
          details: 'Cheque emitido exitosamente',
          tenantId: tenantId,
          tenantName: tenant.name,
          tenantCode: tenant.code,
        },
        {
          id: 2,
          timestamp: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
          level: 'SUCCESS',
          message: `Validación de beneficiario completada para ${tenant.name}`,
          details: 'Beneficiario validado correctamente',
          tenantId: tenantId,
          tenantName: tenant.name,
          tenantCode: tenant.code,
        },
        {
          id: 3,
          timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
          level: 'WARNING',
          message: `Timeout en operación de endoso para ${tenant.name}`,
          details: 'Reintento automático en progreso',
          tenantId: tenantId,
          tenantName: tenant.name,
          tenantCode: tenant.code,
        },
        {
          id: 4,
          timestamp: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
          level: 'ERROR',
          message: `Error en validación de datos para ${tenant.name}`,
          details: 'Datos del cheque incompletos',
          tenantId: tenantId,
          tenantName: tenant.name,
          tenantCode: tenant.code,
        },
      ];

      // Filtrar por nivel si se especifica
      let filteredLogs = mockLogs;
      if (level) {
        filteredLogs = mockLogs.filter(
          log => log.level === level.toUpperCase()
        );
      }

      // Aplicar límite
      filteredLogs = filteredLogs.slice(0, limit);

      return filteredLogs;
    } catch (error) {
      console.error('Error en getTenantLogs:', error);
      throw error;
    }
  }

  /**
   * Generar API keys del sandbox para un tenant
   */
  async generateSandboxApiKeys(tenantId) {
    try {
      const tenant = await TenantSimple.findByPk(tenantId);

      if (!tenant) {
        throw new Error('Tenant no encontrado');
      }

      // Generar API key y secret únicos para el sandbox
      // Formato: {environment}_{tenantId}_{timestamp}_{random}
      const tenantIdShort = tenantId.replace(/-/g, '').substring(0, 8); // Primeros 8 caracteres del UUID sin guiones
      const apiKey = `sandbox_${tenantIdShort}_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 12)}`;
      const apiSecret = `secret_${tenantIdShort}_${Date.now()}_${Math.random().toString(36).substr(2, 15)}`;

      // Crear objeto de credenciales del sandbox
      const sandboxCredentials = {
        api_key: apiKey,
        api_secret: apiSecret,
        generated_at: new Date().toISOString(),
        generated_by: 'SANDBOX_SYSTEM',
        tenant_id: tenantId,
        tenant_code: tenant.code,
        tenant_name: tenant.name,
        is_active: true,
        permissions: ['read', 'write', 'admin'],
        environment: 'sandbox',
        base_url: process.env.SANDBOX_BASE_URL || 'http://localhost:3002',
      };

      // Actualizar el tenant con las nuevas credenciales del sandbox
      await tenant.update({
        sandbox_credentials: sandboxCredentials,
      });

      console.log(
        `✅ API keys del sandbox generadas para tenant ${tenant.name} (${tenant.code})`
      );

      return new ApiResponse(
        true,
        'API keys del sandbox generadas exitosamente',
        {
          tenant_id: tenantId,
          tenant_name: tenant.name,
          tenant_code: tenant.code,
          sandbox_credentials: {
            api_key: apiKey,
            api_secret: apiSecret,
            generated_at: sandboxCredentials.generated_at,
            base_url: sandboxCredentials.base_url,
          },
          apiKey,
          apiSecret,
        }
      );
    } catch (error) {
      console.error('Error en generateSandboxApiKeys:', error);
      throw error;
    }
  }

  /**
   * Obtener credenciales del sandbox de un tenant
   */
  async getTenantCredentials(tenantId) {
    try {
      const tenant = await TenantSimple.findByPk(tenantId);

      if (!tenant) {
        throw new Error('Tenant no encontrado');
      }

      const raw = tenant.sandbox_credentials || {};
      const apiKey = raw.api_key ?? raw.apiKey;
      const apiSecret = raw.api_secret ?? raw.apiSecret;

      return new ApiResponse(true, 'Credenciales del tenant', {
        tenant_id: tenantId,
        sandbox_credentials: tenant.sandbox_credentials,
        apiKey,
        apiSecret,
      });
    } catch (error) {
      console.error('Error en getTenantCredentials:', error);
      throw error;
    }
  }
}

module.exports = new TenantService();
