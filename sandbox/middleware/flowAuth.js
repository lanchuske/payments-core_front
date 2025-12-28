/**
 * Middleware de Autorización Granular para Flujos ECHEQ
 * Basado en el sistema de entitlements
 */

const {
  hasPermission,
  hasFlowPermission,
  getUserFlowPermissions,
} = require('../config/permissions');
const { ApiResponse } = require('../utils/apiResponse');

/**
 * Middleware para verificar permisos de acción específica
 */
const checkActionPermission = action => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res
          .status(401)
          .json(ApiResponse.error('Autenticación requerida'));
      }

      const userRole = req.user.role;

      if (!hasPermission(userRole, action)) {
        return res
          .status(403)
          .json(
            ApiResponse.error(`No tiene permisos para ejecutar: ${action}`)
          );
      }

      // Agregar información de permisos al request para logging
      req.permissionInfo = {
        action,
        userRole,
        userId: req.user.id,
        timestamp: new Date(),
      };

      next();
    } catch (error) {
      console.error('Error en checkActionPermission:', error);
      return res
        .status(500)
        .json(ApiResponse.error('Error interno en verificación de permisos'));
    }
  };
};

/**
 * Middleware para verificar permisos de flujo específico
 */
const checkFlowPermission = (flow, permission) => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res
          .status(401)
          .json(ApiResponse.error('Autenticación requerida'));
      }

      const userRole = req.user.role;

      if (!hasFlowPermission(userRole, flow, permission)) {
        return res
          .status(403)
          .json(
            ApiResponse.error(`No tiene permisos para ${permission} en ${flow}`)
          );
      }

      // Agregar información de permisos al request para logging
      req.permissionInfo = {
        flow,
        permission,
        userRole,
        userId: req.user.id,
        timestamp: new Date(),
      };

      next();
    } catch (error) {
      console.error('Error en checkFlowPermission:', error);
      return res
        .status(500)
        .json(ApiResponse.error('Error interno en verificación de permisos'));
    }
  };
};

/**
 * Middleware para verificar acceso a recursos propios
 */
const checkResourceOwnership = (resourceType, resourceIdField = 'id') => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res
          .status(401)
          .json(ApiResponse.error('Autenticación requerida'));
      }

      const userRole = req.user.role;

      // Los administradores tienen acceso a todo
      if (userRole === 'SYSTEM_ADMIN' || userRole === 'BANK_ADMIN') {
        return next();
      }

      // Para usuarios de empresa, verificar que el recurso les pertenece
      const resourceId =
        req.params[resourceIdField] || req.body[resourceIdField];

      if (!resourceId) {
        return res
          .status(400)
          .json(ApiResponse.error('ID de recurso requerido'));
      }

      // Verificar que el recurso pertenece al usuario
      if (req.user.id !== resourceId && req.user.customer_id !== resourceId) {
        return res
          .status(403)
          .json(ApiResponse.error('Acceso denegado al recurso'));
      }

      next();
    } catch (error) {
      console.error('Error en checkResourceOwnership:', error);
      return res
        .status(500)
        .json(ApiResponse.error('Error interno en verificación de propiedad'));
    }
  };
};

/**
 * Middleware para verificar permisos de banco específico
 */
const checkBankAccess = (bankIdField = 'bank_id') => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res
          .status(401)
          .json(ApiResponse.error('Autenticación requerida'));
      }

      const userRole = req.user.role;

      // Los administradores del sistema tienen acceso a todos los bancos
      if (userRole === 'SYSTEM_ADMIN') {
        return next();
      }

      // Los administradores de banco solo tienen acceso a su banco
      if (userRole === 'BANK_ADMIN') {
        const bankId = req.params[bankIdField] || req.body[bankIdField];

        if (bankId && req.user.bank_id !== bankId) {
          return res
            .status(403)
            .json(ApiResponse.error('Acceso denegado al banco'));
        }
      }

      // Los operadores y analistas solo tienen acceso a su banco
      if (
        ['BANK_OPERATOR', 'BANK_ANALYST', 'BANK_AUDITOR'].includes(userRole)
      ) {
        const bankId = req.params[bankIdField] || req.body[bankIdField];

        if (bankId && req.user.bank_id !== bankId) {
          return res
            .status(403)
            .json(ApiResponse.error('Acceso denegado al banco'));
        }
      }

      next();
    } catch (error) {
      console.error('Error en checkBankAccess:', error);
      return res
        .status(500)
        .json(
          ApiResponse.error('Error interno en verificación de acceso al banco')
        );
    }
  };
};

/**
 * Middleware para logging de auditoría de permisos
 */
const auditPermissionLog = (req, res, next) => {
  const originalSend = res.send;

  res.send = function (data) {
    // Log de auditoría después de la respuesta
    if (req.permissionInfo) {
      const auditData = {
        ...req.permissionInfo,
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        responseSize: data ? data.length : 0,
      };

      // Aquí se podría guardar en base de datos o enviar a servicio de logs
      console.log('PERMISSION AUDIT LOG:', auditData);
    }

    originalSend.call(this, data);
  };

  next();
};

/**
 * Middleware para obtener permisos del usuario
 */
const getUserPermissions = (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json(ApiResponse.error('Autenticación requerida'));
    }

    const userRole = req.user.role;
    const userPermissions = getUserFlowPermissions(
      userRole,
      req.params.flow || req.body.flow
    );

    req.userPermissions = userPermissions;
    next();
  } catch (error) {
    console.error('Error en getUserPermissions:', error);
    return res
      .status(500)
      .json(ApiResponse.error('Error interno al obtener permisos'));
  }
};

/**
 * Middleware para verificar permisos múltiples (OR lógico)
 */
const checkAnyPermission = permissions => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res
          .status(401)
          .json(ApiResponse.error('Autenticación requerida'));
      }

      const userRole = req.user.role;
      const hasAnyPermission = permissions.some(permission =>
        hasPermission(userRole, permission)
      );

      if (!hasAnyPermission) {
        return res
          .status(403)
          .json(
            ApiResponse.error(
              `No tiene permisos para ninguna de las acciones: ${permissions.join(', ')}`
            )
          );
      }

      next();
    } catch (error) {
      console.error('Error en checkAnyPermission:', error);
      return res
        .status(500)
        .json(ApiResponse.error('Error interno en verificación de permisos'));
    }
  };
};

/**
 * Middleware para verificar permisos múltiples (AND lógico)
 */
const checkAllPermissions = permissions => {
  return (req, res, next) => {
    try {
      if (!req.user) {
        return res
          .status(401)
          .json(ApiResponse.error('Autenticación requerida'));
      }

      const userRole = req.user.role;
      const hasAllPermissions = permissions.every(permission =>
        hasPermission(userRole, permission)
      );

      if (!hasAllPermissions) {
        return res
          .status(403)
          .json(
            ApiResponse.error(
              `No tiene todos los permisos requeridos: ${permissions.join(', ')}`
            )
          );
      }

      next();
    } catch (error) {
      console.error('Error en checkAllPermissions:', error);
      return res
        .status(500)
        .json(ApiResponse.error('Error interno en verificación de permisos'));
    }
  };
};

module.exports = {
  checkActionPermission,
  checkFlowPermission,
  checkResourceOwnership,
  checkBankAccess,
  auditPermissionLog,
  getUserPermissions,
  checkAnyPermission,
  checkAllPermissions,
};
