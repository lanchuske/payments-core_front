/**
 * Clase ApiResponse
 * Estandariza las respuestas de la API
 */

class ApiResponse {
  constructor(success, message, data = null, error = null) {
    this.success = success;
    this.message = message;
    this.data = data;
    this.error = error;
    this.timestamp = new Date().toISOString();
  }

  /**
   * Crear respuesta exitosa
   */
  static success(message, data = null) {
    return new ApiResponse(true, message, data);
  }

  /**
   * Crear respuesta de error
   */
  static error(message, error = null) {
    return new ApiResponse(false, message, null, error);
  }

  /**
   * Crear respuesta con paginación
   */
  static paginated(message, data, pagination) {
    return new ApiResponse(true, message, {
      ...data,
      pagination,
    });
  }

  /**
   * Convertir a objeto JSON
   */
  toJSON() {
    return {
      success: this.success,
      message: this.message,
      data: this.data,
      error: this.error,
      timestamp: this.timestamp,
    };
  }
}

module.exports = { ApiResponse };
