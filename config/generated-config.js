/**
 * Configuración Generada para ECHEQ Sandbox
 * Ambiente: local
 * Generado automáticamente desde Config/config/environments/local.json
 * NO MODIFICAR MANUALMENTE - Se regenera en cada build
 */

const config = {
  "environment": "local",
  "description": "Configuración para desarrollo local con servicios híbridos",
  "services": {
      "backend": {
        "url": "http://localhost:3001",
        "port": 3001,
        "apiUrl": "http://localhost:3001/api",
        "database": {
          "host": process.env.DB_HOST || "localhost",
          "port": parseInt(process.env.DB_PORT || "5432", 10),
          "url": process.env.DATABASE_URL || "postgresql://localhost:5432/echeq"
        }
      },
      "frontend": {
        "url": "http://localhost:3000",
        "port": 3000,
        "apiUrl": "http://localhost:3001/api"
      },
      "sandbox": {
        "url": "http://localhost:3002",
        "port": 3002,
        "apiUrl": "http://localhost:3002/api",
        "database": {
          "host": process.env.DB_HOST || "localhost",
          "port": parseInt(process.env.DB_PORT || "5432", 10),
          "url": process.env.DATABASE_URL || "postgresql://localhost:5432/echeq"
        }
      }
  },
  "shared": {
    "redis": {
      "url": "redis://localhost:6379"
    },
    "cors": {
      "origins": [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002",
        "http://localhost:3003"
      ]
    }
  },
  "database": {
    "host": process.env.DB_HOST || "localhost",
    "port": parseInt(process.env.DB_PORT || "5432", 10),
    "credentials": {
      "username": process.env.DB_USERNAME || "postgres",
      "password": process.env.DB_PASSWORD || "",
      "database": process.env.DB_DATABASE || "echeq"
    },
    "url": process.env.DATABASE_URL || "postgresql://localhost:5432/echeq"
  }
};

/**
 * Configuración del Sandbox
 */
const getSandboxConfig = () => {
  const sandboxConfig = {
    // Configuración del sistema
    system: {
      name: 'ECHEQ Sandbox',
      version: process.env.SANDBOX_VERSION || '1.0.0',
      environment: config.environment,
      port: process.env.PORT || config.services.sandbox.port
    },

    // URLs de servicios
    urls: {
      frontend: config.services.frontend.url,
      backend: config.services.backend.url,
      sandbox: config.services.sandbox.url,
      api: config.services.sandbox.apiUrl,
      backendApi: config.services.backend.apiUrl
    },

    // Configuración de base de datos
    database: {
      url: config.services.sandbox.database.url,
      host: config.services.sandbox.database.host,
      port: config.services.sandbox.database.port,
      // Usar siempre DATABASE_URL de variables de entorno si está disponible
      databaseUrl: process.env.DATABASE_URL || config.services.sandbox.database.url,
      sslMode: config.environment === 'production' ? 'require' : 'disable'
    },

    // Configuración de CORS
    cors: {
      origin: config.shared.cors.origins,
      credentials: true
    },

    // Configuración de autenticación
    // ⚠️ IMPORTANTE: JWT_SECRET es requerido - sin valor por defecto
    auth: {
      jwtSecret: process.env.JWT_SECRET,
      adminEmail: process.env.SANDBOX_ADMIN_EMAIL || 'admin@sandbox.echeq.ar'
    },

    // Configuración COELSA
    // NOTA: En modo sandbox, estas credenciales NO son requeridas ya que el sandbox emula a COELSA.
    // Las credenciales reales de COELSA se configuran por banco en la BD (tabla CoelsaConfig).
    // Estas variables de entorno son opcionales y solo se usan como fallback.
    coelsa: {
      apiKey: process.env.COELSA_API_KEY,
      apiSecret: process.env.COELSA_API_SECRET
    },

    // Configuración de logging
    logging: {
      level: process.env.LOG_LEVEL || 'info',
      enableAudit: process.env.ENABLE_AUDIT === 'true'
    },

    // Configuración de rate limiting
    rateLimit: {
      max: parseInt(process.env.RATE_LIMIT_MAX) || 1000,
      window: parseInt(process.env.RATE_LIMIT_WINDOW) || 900000
    },

    // Configuración específica del ambiente
    environment: {
      isLocal: config.environment === 'local',
      isDevelopment: config.environment === 'development',
      isProduction: config.environment === 'production',
      enableSimulation: process.env.ENABLE_SIMULATION !== 'false',
      sandboxMode: process.env.SANDBOX_MODE !== 'false'
    }
  };
  
  // Validar variables requeridas
  if (!sandboxConfig.auth.jwtSecret) {
    throw new Error('JWT_SECRET environment variable is required');
  }
  
  // COELSA credentials: Solo requeridas si NO estamos en modo sandbox
  // En sandbox, el sistema emula COELSA y las credenciales se configuran por banco en la BD
  const isSandbox = sandboxConfig.environment.sandboxMode || 
                    process.env.NODE_ENV === 'development' ||
                    process.env.SANDBOX_MODE === 'true';
  
  if (!isSandbox && (!sandboxConfig.coelsa.apiKey || !sandboxConfig.coelsa.apiSecret)) {
    console.warn('⚠️ COELSA_API_KEY y COELSA_API_SECRET no están configuradas. ' +
                 'Las credenciales deben configurarse por banco en la BD (tabla CoelsaConfig).');
  }
  
  return sandboxConfig;
};

/**
 * Obtener URL de base de datos con configuración de Railway
 */
const getDatabaseUrl = () => {
  const sandboxConfig = getSandboxConfig();
  
  // Usar siempre DATABASE_URL de variables de entorno si está disponible
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }
  
  // Fallback a la configuración del sandbox
  return sandboxConfig.database.url || sandboxConfig.database.databaseUrl;
};

/**
 * Obtener configuración de CORS
 */
const getCorsConfig = () => {
  const sandboxConfig = getSandboxConfig();
  
  return {
    origin: sandboxConfig.cors.origin,
    credentials: sandboxConfig.cors.credentials
  };
};

/**
 * Obtener puerto del servicio
 */
const getPort = () => {
  const sandboxConfig = getSandboxConfig();
  return process.env.PORT || sandboxConfig.system.port;
};

module.exports = {
  getSandboxConfig,
  getDatabaseUrl,
  getCorsConfig,
  getPort,
  config: getSandboxConfig()
};
