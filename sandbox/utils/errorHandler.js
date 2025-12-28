/**
 * Error Handler Utility
 * 
 * Utilidades para manejar errores de forma consistente,
 * especialmente errores de respuestas HTTP del BFF.
 * 
 * @module utils/errorHandler
 */

/**
 * Manejar errores de respuesta del BFF
 * @param {Error} error - Error de axios
 * @param {string} defaultMessage - Mensaje por defecto
 * @returns {Object} - Objeto con status, message y data
 */
function handleBFFError(error, defaultMessage = 'Error en la operación') {
  if (error.response) {
    // Error de respuesta del servidor (4xx, 5xx)
    return {
      status: error.response.status,
      message: error.response.data?.message || defaultMessage,
      data: error.response.data,
      isBFFError: true,
    };
  } else if (error.request) {
    // Error de red (no hay respuesta del servidor)
    return {
      status: 503,
      message: 'Servicio no disponible. No se pudo conectar al BFF.',
      data: null,
      isNetworkError: true,
    };
  } else {
    // Error al configurar la request
    return {
      status: 500,
      message: error.message || defaultMessage,
      data: null,
      isConfigError: true,
    };
  }
}

/**
 * Formatear respuesta de error para Express
 * @param {Error} error - Error de axios
 * @param {string} defaultMessage - Mensaje por defecto
 * @returns {Object} - Objeto formateado para respuesta Express
 */
function formatErrorResponse(error, defaultMessage = 'Error en la operación') {
  const errorInfo = handleBFFError(error, defaultMessage);
  
  return {
    success: false,
    message: errorInfo.message,
    ...(errorInfo.data && { error: errorInfo.data }),
    ...(process.env.NODE_ENV === 'development' && {
      debug: {
        status: errorInfo.status,
        isBFFError: errorInfo.isBFFError,
        isNetworkError: errorInfo.isNetworkError,
        isConfigError: errorInfo.isConfigError,
      },
    }),
  };
}

/**
 * Middleware para manejar errores de forma consistente
 * @param {Error} error - Error
 * @param {Object} req - Request de Express
 * @param {Object} res - Response de Express
 * @param {Function} next - Next middleware
 */
function errorMiddleware(error, req, res, next) {
  const errorInfo = handleBFFError(error, 'Error en la operación');
  
  // Log del error
  if (errorInfo.isNetworkError) {
    console.error('[BFF Error] Error de red:', {
      url: error.config?.url,
      method: error.config?.method,
    });
  } else if (errorInfo.isBFFError) {
    console.error('[BFF Error] Error del BFF:', {
      status: errorInfo.status,
      message: errorInfo.message,
      url: error.config?.url,
    });
  } else {
    console.error('[BFF Error] Error desconocido:', error);
  }
  
  res.status(errorInfo.status).json(formatErrorResponse(error));
}

/**
 * Wrapper para manejar errores en async routes
 * @param {Function} fn - Función async
 * @returns {Function} - Función wrapper
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

module.exports = {
  handleBFFError,
  formatErrorResponse,
  errorMiddleware,
  asyncHandler,
};

