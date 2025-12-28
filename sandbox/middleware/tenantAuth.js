/**
 * Middleware de Autenticación y Aislamiento de Tenant
 * Gestiona la autenticación y aislamiento de datos por tenant
 */

const { ApiResponse } = require('../utils/apiResponse');
const { Tenant } = require('../models');

/**
 * Middleware para extraer y validar el tenant de la request
 */
const extractTenant = async (req, res, next) => {
  try {
    // Obtener tenant_id de diferentes fuentes posibles
    let tenantId = null;

    // 1. Desde el header X-Tenant-ID
    if (req.headers['x-tenant-id']) {
      tenantId = req.headers['x-tenant-id'];
    }
    // 2. Desde el subdominio
    else if (req.headers.host && req.headers.host.includes('.')) {
      const subdomain = req.headers.host.split('.')[0];
      if (subdomain !== 'www' && subdomain !== 'api') {
        tenantId = subdomain;
      }
    }
    // 3. Desde el parámetro de URL
    else if (req.params.tenantId) {
      tenantId = req.params.tenantId;
    }
    // 4. Desde el body (para operaciones de creación)
    else if (req.body && req.body.tenant_id) {
      tenantId = req.body.tenant_id;
    }

    // Si no se encontró tenant_id, verificar si es SYSTEM_ADMIN
    if (!tenantId) {
      if (req.user && req.user.isSystemAdmin()) {
        // SYSTEM_ADMIN puede operar sin tenant específico
        req.tenant = null;
        req.tenantId = null;
        return next();
      } else {
        return res
          .status(400)
          .json(
            new ApiResponse(
              false,
              'Tenant ID requerido',
              null,
              'TENANT_ID_REQUIRED'
            )
          );
      }
    }

    // Validar formato del tenant_id (UUID)
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(tenantId)) {
      return res
        .status(400)
        .json(
          new ApiResponse(
            false,
            'Formato de Tenant ID inválido',
            null,
            'INVALID_TENANT_ID_FORMAT'
          )
        );
    }

    // Buscar el tenant en la base de datos
    const tenant = await Tenant.findByPk(tenantId);
    if (!tenant) {
      return res
        .status(404)
        .json(
          new ApiResponse(
            false,
            'Tenant no encontrado',
            null,
            'TENANT_NOT_FOUND'
          )
        );
    }

    // Verificar que el tenant esté activo
    if (!tenant.isActive()) {
      return res
        .status(403)
        .json(
          new ApiResponse(
            false,
            'Tenant inactivo o suspendido',
            null,
            'TENANT_INACTIVE'
          )
        );
    }

    // Asignar tenant a la request
    req.tenant = tenant;
    req.tenantId = tenantId;

    next();
  } catch (error) {
    console.error('Error en extractTenant:', error);
    return res
      .status(500)
      .json(
        new ApiResponse(
          false,
          'Error interno del servidor',
          null,
          'INTERNAL_SERVER_ERROR'
        )
      );
  }
};

/**
 * Middleware para verificar que el usuario pertenece al tenant
 */
const verifyTenantAccess = async (req, res, next) => {
  try {
    // SYSTEM_ADMIN puede acceder a cualquier tenant
    if (req.user && req.user.isSystemAdmin()) {
      return next();
    }

    // Verificar que el usuario tenga tenant_id
    if (!req.user.tenant_id) {
      return res
        .status(403)
        .json(
          new ApiResponse(
            false,
            'Usuario no asociado a ningún tenant',
            null,
            'USER_NO_TENANT'
          )
        );
    }

    // Verificar que el usuario pertenece al tenant de la request
    if (req.tenantId && req.user.tenant_id !== req.tenantId) {
      return res
        .status(403)
        .json(
          new ApiResponse(
            false,
            'Acceso denegado: usuario no pertenece al tenant',
            null,
            'TENANT_ACCESS_DENIED'
          )
        );
    }

    next();
  } catch (error) {
    console.error('Error en verifyTenantAccess:', error);
    return res
      .status(500)
      .json(
        new ApiResponse(
          false,
          'Error interno del servidor',
          null,
          'INTERNAL_SERVER_ERROR'
        )
      );
  }
};

/**
 * Middleware para verificar permisos específicos del tenant
 */
const checkTenantPermission = permission => {
  return async (req, res, next) => {
    try {
      // SYSTEM_ADMIN tiene todos los permisos
      if (req.user && req.user.isSystemAdmin()) {
        return next();
      }

      // Verificar que el tenant esté presente
      if (!req.tenant) {
        return res
          .status(400)
          .json(
            new ApiResponse(
              false,
              'Tenant no especificado',
              null,
              'TENANT_NOT_SPECIFIED'
            )
          );
      }

      // Verificar que el usuario tenga el rol requerido
      const userRole = req.user.role;
      // const tenantRules = req.tenant.getReglas();

      // Verificar permisos según el rol del usuario
      let hasPermission = false;

      switch (permission) {
        case 'emision':
          hasPermission = ['BANK_ADMIN', 'BANK_OPERATOR'].includes(userRole);
          break;
        case 'endoso':
          hasPermission = ['BANK_ADMIN', 'BANK_OPERATOR'].includes(userRole);
          break;
        case 'custodia':
          hasPermission = ['BANK_ADMIN', 'BANK_OPERATOR'].includes(userRole);
          break;
        case 'aprobacion':
          hasPermission = ['BANK_ADMIN'].includes(userRole);
          break;
        case 'configuracion':
          hasPermission = ['BANK_ADMIN'].includes(userRole);
          break;
        case 'reportes':
          hasPermission = [
            'BANK_ADMIN',
            'BANK_ANALYST',
            'BANK_AUDITOR',
          ].includes(userRole);
          break;
        default:
          hasPermission = false;
      }

      if (!hasPermission) {
        return res
          .status(403)
          .json(
            new ApiResponse(
              false,
              'Permiso denegado para esta operación',
              null,
              'PERMISSION_DENIED'
            )
          );
      }

      next();
    } catch (error) {
      console.error('Error en checkTenantPermission:', error);
      return res
        .status(500)
        .json(
          new ApiResponse(
            false,
            'Error interno del servidor',
            null,
            'INTERNAL_SERVER_ERROR'
          )
        );
    }
  };
};

/**
 * Middleware para verificar límites del tenant
 */
const checkTenantLimits = operation => {
  return async (req, res, next) => {
    try {
      // SYSTEM_ADMIN no tiene límites
      if (req.user && req.user.isSystemAdmin()) {
        return next();
      }

      // Verificar que el tenant esté presente
      if (!req.tenant) {
        return res
          .status(400)
          .json(
            new ApiResponse(
              false,
              'Tenant no especificado',
              null,
              'TENANT_NOT_SPECIFIED'
            )
          );
      }

      const tenantLimits = req.tenant.getLimites();
      const amount = req.body.amount || 0;

      // Verificar límites según la operación
      switch (operation) {
        case 'emision':
          if (amount > tenantLimits.max_emision_individual) {
            return res
              .status(400)
              .json(
                new ApiResponse(
                  false,
                  `Monto excede el límite individual de emisión (${tenantLimits.max_emision_individual})`,
                  null,
                  'AMOUNT_EXCEEDS_LIMIT'
                )
              );
          }
          break;
        case 'usuarios':
          // Verificar límite de usuarios (implementar lógica de conteo)
          break;
        case 'clientes':
          // Verificar límite de clientes (implementar lógica de conteo)
          break;
      }

      next();
    } catch (error) {
      console.error('Error en checkTenantLimits:', error);
      return res
        .status(500)
        .json(
          new ApiResponse(
            false,
            'Error interno del servidor',
            null,
            'INTERNAL_SERVER_ERROR'
          )
        );
    }
  };
};

/**
 * Middleware para agregar tenant_id a todas las consultas
 */
const addTenantFilter = (req, res, next) => {
  // Agregar tenant_id a las consultas de base de datos
  req.tenantFilter = {
    tenant_id: req.tenantId,
  };

  next();
};

/**
 * Middleware para logging de operaciones por tenant
 */
const logTenantOperation = operation => {
  return (req, res, next) => {
    const logData = {
      timestamp: new Date(),
      tenant_id: req.tenantId,
      user_id: req.user ? req.user.id : null,
      operation: operation,
      method: req.method,
      path: req.path,
      ip: req.ip,
      user_agent: req.get('User-Agent'),
    };

    console.log('Tenant Operation Log:', JSON.stringify(logData, null, 2));

    // Aquí se podría enviar a un sistema de logging centralizado
    // o guardar en la base de datos

    next();
  };
};

module.exports = {
  extractTenant,
  verifyTenantAccess,
  checkTenantPermission,
  checkTenantLimits,
  addTenantFilter,
  logTenantOperation,
};
