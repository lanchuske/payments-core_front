/**
 * Utilidad para obtener la clave de administrador
 * Centraliza la obtención de la clave desde variables de entorno
 * con un valor por defecto para desarrollo
 */

/**
 * Obtener la clave de administrador desde variables de entorno
 * @returns {string} Clave de administrador
 */
function getAdminKey() {
  // Prioridad: ADMIN_KEY > ADMIN_PASSWORD > valor por defecto para desarrollo
  return (
    process.env.ADMIN_KEY ||
    process.env.ADMIN_PASSWORD ||
    'admin123' // Valor por defecto para desarrollo (debe coincidir con la UI del panel)
  );
}

/**
 * Validar si una clave de administrador es válida
 * @param {string} providedKey - Clave proporcionada
 * @returns {boolean} true si la clave es válida
 */
function validateAdminKey(providedKey) {
  if (!providedKey) {
    return false;
  }
  return providedKey === getAdminKey();
}

module.exports = {
  getAdminKey,
  validateAdminKey,
};

