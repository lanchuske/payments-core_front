/**
 * Middleware de Autenticación Simple
 * Usa variable de entorno ADMIN_KEY con fallback a admin1234 para desarrollo
 */

const { validateAdminKey } = require('../utils/adminKey');

const simpleAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const password = req.query.password || req.body.password;
  
  // Verificar password en header Authorization
  if (authHeader && validateAdminKey(authHeader)) {
    req.user = { role: 'ADMIN', id: 'admin' };
    return next();
  }
  
  // Verificar password en query o body
  if (password && validateAdminKey(password)) {
    req.user = { role: 'ADMIN', id: 'admin' };
    return next();
  }
  
  return res.status(401).json({
    success: false,
    message: 'Acceso denegado. Se requiere clave de administrador válida',
    error: 'UNAUTHORIZED'
  });
};

module.exports = { simpleAuth };

