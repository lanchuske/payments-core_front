/**
 * Configuración de URLs del Sandbox usando Sistema Centralizado
 * Ubicación: sandbox/config/urls.js
 *
 * Este archivo ahora usa el sistema de configuración centralizada
 * que elimina hardcodeo y proporciona configuración automática por ambiente.
 */

// 🔧 Intentar cargar configuración centralizada
let urls = {};
let environment = 'local';

try {
  const {
    getServiceUrls,
    getCurrentEnvironment,
  } = require('../../../echeq-backend/config');
  urls = getServiceUrls();
  environment = getCurrentEnvironment();
  console.log('✅ Configuración centralizada cargada desde backend');
} catch {
  console.warn(
    '⚠️  No se pudo cargar configuración centralizada, usando configuración local'
  );
  // Fallback para cuando no se puede acceder al backend
  urls = {
    frontend: process.env.FRONTEND_URL || 'http://localhost:3002',
    backend: process.env.BACKEND_URL || 'http://localhost:8082',
    sandbox: process.env.SANDBOX_URL || 'http://localhost:8080',
    api: process.env.API_BASE_URL || 'http://localhost:8082/api',
    database:
      process.env.DATABASE_URL || 'postgresql://localhost:5432/echeq_sandbox',
  };
  environment = process.env.NODE_ENV || 'development';
}

/**
 * Obtener URL para un servicio específico
 */
const getUrl = service => {
  return urls[service] || urls.frontend;
};

/**
 * Obtener configuración completa de URLs
 */
const getUrls = () => {
  return {
    environment,
    frontend: urls.frontend,
    backend: urls.backend,
    sandbox: urls.sandbox,
    api: urls.api,
    database: urls.database,
    cors: {
      origin: process.env.CORS_ORIGIN || urls.frontend,
      credentials: true,
    },
  };
};

/**
 * Configuración específica para el frontend
 */
const getFrontendConfig = () => {
  const config = getUrls();

  return {
    system: {
      name: 'ECHEQ Sandbox',
      version: process.env.SANDBOX_VERSION || '1.0.0',
      environment: config.environment,
    },
    urls: {
      frontend: config.frontend,
      backend: config.backend,
      sandbox: config.sandbox,
      api: config.api,
      backoffice: config.frontend,
      login: `${config.sandbox}/login`,
      admin: `${config.sandbox}/admin`,
    },
    auth: {
      adminEmail: process.env.SANDBOX_ADMIN_EMAIL || 'admin@sandbox.echeq.ar',
      passwordPlaceholder: 'Ingresa tu contraseña',
    },
  };
};

/**
 * Configuración específica para el sandbox
 */
const getSandboxConfig = () => {
  const config = getUrls();

  return {
    system: {
      name: 'ECHEQ Sandbox',
      version: process.env.SANDBOX_VERSION || '1.0.0',
      environment: 'sandbox',
    },
    urls: {
      frontend: config.frontend,
      backend: config.backend,
      sandbox: config.sandbox,
      api: config.api,
      backoffice: config.frontend,
      login: `${config.sandbox}/login`,
      admin: `${config.sandbox}/admin`,
    },
    auth: {
      adminEmail: process.env.SANDBOX_ADMIN_EMAIL || 'admin@sandbox.echeq.ar',
      passwordPlaceholder: 'Ingresa tu contraseña',
    },
  };
};

// 🔧 Funciones de compatibilidad para mantener API existente
const getEnvironment = () => environment;
const getHostname = () => process.env.HOSTNAME || 'localhost';
const getProtocol = () => process.env.PROTOCOL || 'http';
const getPort = service => {
  const ports = {
    frontend: process.env.FRONTEND_PORT || 3001,
    backend: process.env.BACKEND_PORT || 3000,
    sandbox: process.env.SANDBOX_PORT || 8082,
    api: process.env.API_PORT || 3001,
  };
  return ports[service] || 3000;
};

module.exports = {
  getEnvironment,
  getHostname,
  getProtocol,
  getPort,
  getUrl,
  getUrls,
  getFrontendConfig,
  getSandboxConfig,
};
