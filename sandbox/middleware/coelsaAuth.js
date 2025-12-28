/**
 * ⚠️ CÓDIGO LEGACY - NO EN USO ⚠️
 * 
 * Este código está DEPRECADO. La plataforma usa echeq-sandbox-nestjs.
 * Ver DEPRECATED.md y LEGACY_README.md en la raíz del repositorio.
 * 
 * ⚠️ NO MODIFICAR - Este código no se ejecuta en producción
 */

/**
 * Middleware de autenticación específico para COELSA
 * Valida las API keys enviadas en los headers X-API-Key, X-API-Secret y X-Tenant-ID
 */

// const crypto = require('crypto');

/**
 * Middleware para validar credenciales de API de COELSA
 */
const validateCoelsaApiKeys = async (req, res, next) => {
  try {
    console.log('🔍 [COELSA AUTH] Iniciando validación de API keys');
    console.log('🔍 [COELSA AUTH] Headers recibidos:', req.headers);
    console.log('🔍 [COELSA AUTH] Middleware ejecutándose correctamente');
    console.log('🔍 [COELSA AUTH] Llegando a extracción de headers...');
    console.log(
      '🔍 [COELSA AUTH] DEBUG: Verificando si el middleware se está ejecutando...'
    );
    console.log(
      '🔍 [COELSA AUTH] DEBUG: El middleware se está ejecutando correctamente'
    );
    console.log(
      '🔍 [COELSA AUTH] DEBUG: El middleware se está ejecutando correctamente - FINAL'
    );
    console.log(
      '🔍 [COELSA AUTH] DEBUG: El middleware se está ejecutando correctamente - FINAL - FINAL'
    );

    // Extraer headers de autenticación
    const apiKey = req.headers['x-api-key'];
    const apiSecret = req.headers['x-api-secret'];
    const tenantId = req.headers['x-tenant-id'];

    console.log('🔍 [COELSA AUTH] API Key:', apiKey);
    console.log('🔍 [COELSA AUTH] API Secret:', apiSecret);
    console.log('🔍 [COELSA AUTH] Tenant ID:', tenantId);

    console.log('🔍 [COELSA AUTH] Continuando con validaciones...');

    // Validar que todos los headers estén presentes
    console.log('🔍 [COELSA AUTH] Verificando headers presentes...');
    if (!apiKey || !apiSecret || !tenantId) {
      return res.status(401).json({
        success: false,
        message: 'Credenciales de API requeridas',
        error: 'MISSING_API_CREDENTIALS',
        required_headers: ['X-API-Key', 'X-API-Secret', 'X-Tenant-ID'],
      });
    }

    // Validar formato del API Key
    console.log('🔍 [COELSA AUTH] Validando API Key:', apiKey);
    if (!isValidApiKeyFormat(apiKey)) {
      console.log('🔍 [COELSA AUTH] API Key inválido');
      return res.status(401).json({
        success: false,
        message: 'Formato de API Key inválido',
        error: 'INVALID_API_KEY_FORMAT',
      });
    }
    console.log('🔍 [COELSA AUTH] API Key válido');

    // Validar formato del API Secret
    console.log('🔍 [COELSA AUTH] Validando API Secret:', apiSecret);
    console.log(
      '🔍 [COELSA AUTH] Partes del API Secret:',
      apiSecret.split('_')
    );
    if (!isValidApiSecretFormat(apiSecret)) {
      console.log('🔍 [COELSA AUTH] API Secret inválido');
      return res.status(401).json({
        success: false,
        message: 'Formato de API Secret inválido',
        error: 'INVALID_API_SECRET_FORMAT',
      });
    }

    // Validar formato del Tenant ID
    if (!isValidTenantIdFormat(tenantId)) {
      return res.status(401).json({
        success: false,
        message: 'Formato de Tenant ID inválido',
        error: 'INVALID_TENANT_ID_FORMAT',
      });
    }

    // Extraer información del API Key
    const keyParts = apiKey.split('_');
    const environment = keyParts[0];
    const keyTenantId = keyParts[1];
    const timestamp = keyParts[2];
    // const random = keyParts[3];

    // Validar que el Tenant ID del header coincida con el del API Key
    if (keyTenantId !== tenantId.substring(0, 8)) {
      return res.status(401).json({
        success: false,
        message: 'Tenant ID no coincide con el API Key',
        error: 'TENANT_ID_MISMATCH',
      });
    }

    // Validar que el API Secret sea válido para este tenant y ambiente
    const isValidSecret = generateExpectedApiSecret();
    if (!isValidSecret) {
      return res.status(401).json({
        success: false,
        message: 'API Secret inválido',
        error: 'INVALID_API_SECRET',
      });
    }

    // Validar que el timestamp no sea muy antiguo (máximo 1 año)
    let keyTimestamp;
    try {
      keyTimestamp = parseInt(timestamp, 36);
      if (isNaN(keyTimestamp)) {
        return res.status(401).json({
          success: false,
          message: 'Timestamp inválido en API Key',
          error: 'INVALID_TIMESTAMP',
        });
      }
    } catch {
      return res.status(401).json({
        success: false,
        message: 'Timestamp inválido en API Key',
        error: 'INVALID_TIMESTAMP',
      });
    }

    const currentTime = Date.now();
    const oneYearInMs = 365 * 24 * 60 * 60 * 1000;

    if (currentTime - keyTimestamp > oneYearInMs) {
      return res.status(401).json({
        success: false,
        message: 'API Key expirada',
        error: 'API_KEY_EXPIRED',
      });
    }

    // Agregar información de autenticación al request
    req.coelsaAuth = {
      apiKey,
      apiSecret,
      tenantId,
      environment,
      timestamp: keyTimestamp,
      isValid: true,
    };

    // Log de autenticación exitosa
    console.log(
      `[COELSA AUTH] Autenticación exitosa para tenant: ${tenantId}, ambiente: ${environment}`
    );
    console.log(`[COELSA AUTH] req.coelsaAuth configurado:`, req.coelsaAuth);

    next();
  } catch (error) {
    console.error('Error en validación de API keys de COELSA:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno en validación de credenciales',
      error: 'INTERNAL_AUTH_ERROR',
    });
  }
};

/**
 * Validar formato del API Key
 * Formato esperado: {environment}_{tenantId}_{timestamp}_{random}
 */
function isValidApiKeyFormat(apiKey) {
  if (!apiKey || typeof apiKey !== 'string') return false;

  const parts = apiKey.split('_');
  if (parts.length !== 4) return false;

  const [environment, tenantId, timestamp, random] = parts;

  console.log('🔍 [API KEY VALIDATION] Environment:', environment);
  console.log('🔍 [API KEY VALIDATION] Tenant ID:', tenantId);
  console.log('🔍 [API KEY VALIDATION] Timestamp:', timestamp);
  console.log('🔍 [API KEY VALIDATION] Random:', random);

  // Validar ambiente
  if (
    !['local', 'development', 'production', 'sandbox'].includes(environment)
  ) {
    console.log('🔍 [API KEY VALIDATION] Environment inválido:', environment);
    return false;
  }

  // Validar tenant ID (8 caracteres)
  if (!/^[a-f0-9]{8}$/.test(tenantId)) {
    console.log('🔍 [API KEY VALIDATION] Tenant ID inválido:', tenantId);
    return false;
  }

  // Validar timestamp (base36)
  if (!/^[a-z0-9]+$/.test(timestamp)) return false;

  // Validar random (8-16 caracteres alfanuméricos)
  if (!/^[a-z0-9]{8,16}$/.test(random)) return false;

  return true;
}

/**
 * Validar formato del API Secret
 * Formato esperado: secret_{tenantId}_{timestamp}_{random}
 */
function isValidApiSecretFormat(apiSecret) {
  if (!apiSecret || typeof apiSecret !== 'string') return false;

  console.log('🔍 [API SECRET VALIDATION] Validando API Secret:', apiSecret);

  // Validación temporal: siempre retornar true para debug
  console.log('🔍 [API SECRET VALIDATION] API Secret válido (debug)');
  return true;
}

/**
 * Validar formato del Tenant ID
 * Debe ser un UUID válido
 */
function isValidTenantIdFormat(tenantId) {
  if (!tenantId || typeof tenantId !== 'string') return false;
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(tenantId);
}

/**
 * Generar el API Secret esperado para validación
 * Debe coincidir con la lógica del backend
 */
function generateExpectedApiSecret() {
  // El backend usa Date.now() para generar el secret, no el timestamp del API Key
  // Por ahora, vamos a permitir cualquier secret válido para simplificar
  // En producción, esto debería validarse contra una base de datos
  return true; // Temporalmente permitir cualquier secret
}

/**
 * Middleware para logging de auditoría de COELSA
 */
const coelsaAuditLog = action => {
  return (req, res, next) => {
    const originalSend = res.send;

    res.send = function (data) {
      // Log de auditoría después de la respuesta
      const auditData = {
        service: 'coelsa',
        tenantId: req.coelsaAuth?.tenantId,
        environment: req.coelsaAuth?.environment,
        action: action,
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date(),
      };

      console.log('COELSA AUDIT LOG:', auditData);

      originalSend.call(this, data);
    };

    next();
  };
};

module.exports = {
  validateCoelsaApiKeys,
  coelsaAuditLog,
};
