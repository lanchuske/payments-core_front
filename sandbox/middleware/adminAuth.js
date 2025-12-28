/**
 * Middleware para autenticación administrativa
 * Verifica la clave de administrador para endpoints administrativos
 */

const adminAuth = (req, res, next) => {
  try {
    // Verificar header X-Admin-Key
    const adminKey = req.headers['x-admin-key'];
    
    if (!adminKey) {
      return res.status(401).json({
        success: false,
        message: 'Clave de administrador requerida',
        error: 'MISSING_ADMIN_KEY'
      });
    }

    // Verificar clave de administrador
    const validAdminKey = process.env.ADMIN_KEY;
    
    if (!validAdminKey) {
      return res.status(500).json({
        success: false,
        message: 'ADMIN_KEY environment variable is not configured',
        error: 'MISSING_ADMIN_KEY_CONFIG'
      });
    }
    
    if (adminKey !== validAdminKey) {
      return res.status(401).json({
        success: false,
        message: 'Clave de administrador inválida',
        error: 'INVALID_ADMIN_KEY'
      });
    }

    // Agregar información de administrador al request
    req.adminAuth = {
      isAdmin: true,
      adminKey: adminKey,
      timestamp: new Date().toISOString()
    };

    next();
  } catch (error) {
    console.error('Error en autenticación administrativa:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: error.message
    });
  }
};

module.exports = adminAuth;
