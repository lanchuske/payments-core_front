const jwt = require('jsonwebtoken');
const { User } = require('../models');

/**
 * Middleware para verificar token JWT
 */
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token de acceso requerido',
      });
    }

    const jwtSecret = process.env.JWT_SECRET;
    
    if (!jwtSecret) {
      return res.status(500).json({
        success: false,
        message: 'JWT_SECRET environment variable is not configured',
        error: 'MISSING_JWT_SECRET'
      });
    }
    
    const decoded = jwt.verify(token, jwtSecret);

    // Buscar usuario en base de datos
    const user = await User.findByPk(decoded.userId);

    if (!user || user.status !== 'ACTIVE') {
      return res.status(401).json({
        success: false,
        message: 'Usuario no válido o inactivo',
      });
    }

    // Agregar usuario al request
    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Token inválido',
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expirado',
      });
    }

    console.error('Error en autenticación:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
    });
  }
};

/**
 * Middleware para verificar roles específicos
 */
const requireRole = roles => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Autenticación requerida',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado. Permisos insuficientes.',
      });
    }

    next();
  };
};

/**
 * Middleware para verificar permisos de recurso
 */
const requireResourceAccess = resourceType => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Autenticación requerida',
      });
    }

    // Los administradores tienen acceso a todo
    if (req.user.role === 'BANK_ADMIN' || req.user.role === 'SYSTEM_ADMIN') {
      return next();
    }

    // Para usuarios de empresa, verificar que el recurso les pertenece
    const resourceId = req.params.id || req.body.customer_id;

    if (resourceType === 'user' && req.user.id !== resourceId) {
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado al recurso',
      });
    }

    // Para otros tipos de recursos, verificar que el customer_id coincide
    if (req.body.customer_id && req.user.id !== req.body.customer_id) {
      return res.status(403).json({
        success: false,
        message: 'Acceso denegado al recurso',
      });
    }

    next();
  };
};

/**
 * Middleware para logging de auditoría
 */
const auditLog = action => {
  return async (req, res, next) => {
    const originalSend = res.send;

    res.send = function (data) {
      // Log de auditoría después de la respuesta
      const auditData = {
        userId: req.user?.id,
        action: action,
        resourceType: req.baseUrl.split('/')[1],
        resourceId: req.params.id,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        timestamp: new Date(),
      };

      // Aquí se podría guardar en base de datos o enviar a servicio de logs
      console.log('AUDIT LOG:', auditData);

      originalSend.call(this, data);
    };

    next();
  };
};

module.exports = {
  authenticateToken,
  requireRole,
  requireResourceAccess,
  auditLog,
};
