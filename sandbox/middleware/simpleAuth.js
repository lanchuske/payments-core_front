/**
 * Middleware de Autenticación Simple
 * Solo requiere password admin1234
 */

const simpleAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const password = req.query.password || req.body.password;
  
  // Verificar password en header Authorization
  if (authHeader && authHeader === 'admin1234') {
    req.user = { role: 'ADMIN', id: 'admin' };
    return next();
  }
  
  // Verificar password en query o body
  if (password === 'admin1234') {
    req.user = { role: 'ADMIN', id: 'admin' };
    return next();
  }
  
  return res.status(401).json({
    success: false,
    message: 'Acceso denegado. Se requiere password: admin1234',
    error: 'UNAUTHORIZED'
  });
};

module.exports = { simpleAuth };

