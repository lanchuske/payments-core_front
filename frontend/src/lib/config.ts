// Configuración centralizada de URLs y variables de entorno
// Todo por Next.js en puerto 3001 - usando rutas relativas para APIs internas

// Variables de entorno se cargan en build time para Next.js
// ⚠️ IMPORTANTE: Las variables NEXT_PUBLIC_* deben estar configuradas durante el build
// Estas se pasan como build args al Dockerfile o se configuran en .env.local para desarrollo local

// Función para obtener la URL base de la API
// REQUIERE: Variable de entorno NEXT_PUBLIC_API_URL (configurar en .env.local para desarrollo)
function getApiBaseUrl(): string {
  if (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  
  // Si no está definida, lanzar error (no usar fallbacks)
  throw new Error('NEXT_PUBLIC_API_URL no está definida. Configúrala en .env.local para desarrollo.');
}

export const config = {
  // URL base de la API del frontend
  // ⚠️ IMPORTANTE: Siempre usar NEXT_PUBLIC_API_URL durante el build
  get API_BASE_URL() {
    return getApiBaseUrl();
  },
  
  // URL base para documentación Swagger
  // ⚠️ IMPORTANTE: Usar NEXT_PUBLIC_SWAGGER_URL durante el build, o construir desde API_BASE_URL
  get SWAGGER_URL() {
    // 1. PRIORIDAD: Variable de entorno (build time)
    if (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SWAGGER_URL) {
      return process.env.NEXT_PUBLIC_SWAGGER_URL;
    }
    
    // 2. Construir desde API_BASE_URL si no está definida explícitamente
    const apiBaseUrl = config.API_BASE_URL;
    return apiBaseUrl.replace('/api/coelsa', '/api/docs');
  },
  
  // URL base del frontend (Next.js)
  // ⚠️ IMPORTANTE: Usar NEXT_PUBLIC_FRONTEND_URL durante el build
  get FRONTEND_URL() {
    // REQUIERE: Variable de entorno NEXT_PUBLIC_FRONTEND_URL (configurar en .env.local para desarrollo)
    if (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_FRONTEND_URL) {
      return process.env.NEXT_PUBLIC_FRONTEND_URL;
    }
    
    // Si no está definida, lanzar error (no usar fallbacks)
    throw new Error('NEXT_PUBLIC_FRONTEND_URL no está definida. Configúrala en .env.local para desarrollo.');
  },
  
  // Configuración de desarrollo
  IS_DEVELOPMENT: process.env.NODE_ENV === 'development',
  
  // Puerto único (Next.js) - REQUIERE variable de entorno PORT (configurar en .env.local para desarrollo)
  get PORT() {
    if (typeof process !== 'undefined' && process.env?.PORT) {
      return process.env.PORT;
    }
    throw new Error('PORT no está definida. Configúrala en .env.local para desarrollo.');
  },
};

// Función helper para obtener la URL completa de la API
export const getApiUrl = (endpoint: string = '') => {
  const baseUrl = config.API_BASE_URL.endsWith('/') 
    ? config.API_BASE_URL.slice(0, -1) 
    : config.API_BASE_URL;
  
  const cleanEndpoint = endpoint.startsWith('/') 
    ? endpoint 
    : `/${endpoint}`;
  
  return `${baseUrl}${cleanEndpoint}`;
};

// Función helper para obtener la URL de Swagger con credenciales
// ⚠️ IMPORTANTE: Siempre usar NEXT_PUBLIC_SWAGGER_URL durante el build
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const getSwaggerUrl = (credentials?: { apiKey: string; apiSecret: string; tenantId: string }) => {
  // Usar config.SWAGGER_URL que ya maneja la prioridad correcta
  return config.SWAGGER_URL;
};
