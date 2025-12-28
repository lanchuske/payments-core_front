/**
 * Middleware de autenticación específico para COELSA - TypeScript
 * Valida las API keys enviadas en los headers X-API-Key, X-API-Secret y X-Tenant-ID
 */

import { Request, Response, NextFunction } from 'express';
import { TenantSimple } from '../models/TenantSimple';

// Interfaces para las requests
interface CoelsaAuthRequest extends Request {
  headers: {
    'x-api-key'?: string;
    'x-api-secret'?: string;
    'x-tenant-id'?: string;
    'x-admin-key'?: string;
  };
  tenant?: InstanceType<typeof TenantSimple>;
  apiKey?: string;
  apiSecret?: string;
  tenantId?: string;
}

/**
 * Middleware para validar credenciales de API de COELSA
 */
const validateCoelsaApiKeys = async (req: CoelsaAuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    console.log('🔍 [COELSA AUTH] Iniciando validación de API keys');
    console.log('🔍 [COELSA AUTH] Headers recibidos:', req.headers);
    console.log('🔍 [COELSA AUTH] Middleware ejecutándose correctamente');
    console.log('🔍 [COELSA AUTH] Llegando a extracción de headers...');
    console.log('🔍 [COELSA AUTH] DEBUG: Verificando si el middleware se está ejecutando...');
    console.log('🔍 [COELSA AUTH] DEBUG: El middleware se está ejecutando correctamente');
    console.log('🔍 [COELSA AUTH] DEBUG: El middleware se está ejecutando correctamente - FINAL');
    console.log('🔍 [COELSA AUTH] DEBUG: El middleware se está ejecutando correctamente - FINAL - FINAL');

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
      res.status(401).json({
        success: false,
        message: 'Credenciales de API requeridas',
        error: 'MISSING_API_CREDENTIALS',
        required_headers: ['X-API-Key', 'X-API-Secret', 'X-Tenant-ID'],
      });
      return;
    }

    // Validar formato de API Key
    console.log('🔍 [COELSA AUTH] Validando API Key:', apiKey);
    if (!validateApiKeyFormat(apiKey)) {
      console.log('🔍 [COELSA AUTH] API Key inválido');
      res.status(401).json({
        success: false,
        message: 'Formato de API Key inválido',
        error: 'INVALID_API_KEY_FORMAT',
      });
      return;
    }

    console.log('🔍 [COELSA AUTH] API Key válido');

    // Validar formato de API Secret
    console.log('🔍 [COELSA AUTH] Validando API Secret:', apiSecret);
    if (!validateApiSecretFormat(apiSecret)) {
      console.log('🔍 [COELSA AUTH] API Secret inválido');
      res.status(401).json({
        success: false,
        message: 'Formato de API Secret inválido',
        error: 'INVALID_API_SECRET_FORMAT',
      });
      return;
    }

    console.log('🔍 [COELSA AUTH] API Secret válido');

    // Validar formato de Tenant ID
    console.log('🔍 [COELSA AUTH] Validando Tenant ID:', tenantId);
    if (!validateTenantIdFormat(tenantId)) {
      console.log('🔍 [COELSA AUTH] Tenant ID inválido');
      res.status(401).json({
        success: false,
        message: 'Formato de Tenant ID inválido',
        error: 'INVALID_TENANT_ID_FORMAT',
      });
      return;
    }

    console.log('🔍 [COELSA AUTH] Tenant ID válido');

    // Buscar tenant en la base de datos
    console.log('🔍 [COELSA AUTH] Buscando tenant en la base de datos...');
    const tenant = await TenantSimple.findByPk(tenantId);

    if (!tenant) {
      console.log('🔍 [COELSA AUTH] Tenant no encontrado');
      res.status(401).json({
        success: false,
        message: 'Tenant no encontrado',
        error: 'TENANT_NOT_FOUND',
      });
      return;
    }

    console.log('🔍 [COELSA AUTH] Tenant encontrado:', tenant.name);

    // Verificar que el tenant esté activo
    if (!tenant.isActive()) {
      console.log('🔍 [COELSA AUTH] Tenant inactivo');
      res.status(401).json({
        success: false,
        message: 'Tenant inactivo',
        error: 'TENANT_INACTIVE',
      });
      return;
    }

    console.log('🔍 [COELSA AUTH] Tenant activo');

    // Verificar credenciales del tenant
    const tenantCredentials = tenant.getSandboxCredentials();
    const storedApiKey = tenantCredentials['api_key'];
    const storedApiSecret = tenantCredentials['api_secret'];

    if (!storedApiKey || !storedApiSecret) {
      console.log('🔍 [COELSA AUTH] Credenciales no configuradas para el tenant');
      res.status(401).json({
        success: false,
        message: 'Credenciales no configuradas para el tenant',
        error: 'TENANT_CREDENTIALS_NOT_CONFIGURED',
      });
      return;
    }

    // Verificar que las credenciales coincidan
    if (apiKey !== storedApiKey || apiSecret !== storedApiSecret) {
      console.log('🔍 [COELSA AUTH] Credenciales no coinciden');
      res.status(401).json({
        success: false,
        message: 'Credenciales inválidas',
        error: 'INVALID_CREDENTIALS',
      });
      return;
    }

    console.log('🔍 [COELSA AUTH] Credenciales válidas');

    // Agregar información del tenant a la request
    req.tenant = tenant;
    req.apiKey = apiKey;
    req.apiSecret = apiSecret;
    req.tenantId = tenantId;

    console.log('🔍 [COELSA AUTH] Autenticación exitosa, continuando...');
    next();

  } catch (error) {
    console.error('🔍 [COELSA AUTH] Error en validación:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: 'INTERNAL_SERVER_ERROR',
    });
  }
};

/**
 * Valida el formato del API Key
 * Formato esperado: sandbox_{tenantId}_{timestamp}_{random}
 */
function validateApiKeyFormat(apiKey: string): boolean {
  if (!apiKey || typeof apiKey !== 'string') {
    return false;
  }

  // Verificar que comience con 'sandbox_'
  if (!apiKey.startsWith('sandbox_')) {
    return false;
  }

  // Dividir por '_' y verificar que tenga al menos 4 partes
  const parts = apiKey.split('_');
  if (parts.length < 4) {
    return false;
  }

  // Verificar que la segunda parte sea un UUID válido (primeros 8 caracteres)
  const tenantIdPart = parts[1];
  if (!tenantIdPart || tenantIdPart.length < 8) {
    return false;
  }

  // Verificar que la tercera parte sea un timestamp válido
  const timestampPart = parts[2];
  if (!timestampPart || !/^\d+$/.test(timestampPart)) {
    return false;
  }

  // Verificar que la cuarta parte sea un string alfanumérico
  const randomPart = parts[3];
  if (!randomPart || !/^[a-zA-Z0-9]+$/.test(randomPart)) {
    return false;
  }

  return true;
}

/**
 * Valida el formato del API Secret
 * Formato esperado: secret_{tenantId}_{timestamp}_{random}
 */
function validateApiSecretFormat(apiSecret: string): boolean {
  if (!apiSecret || typeof apiSecret !== 'string') {
    return false;
  }

  // Verificar que comience con 'secret_'
  if (!apiSecret.startsWith('secret_')) {
    return false;
  }

  // Dividir por '_' y verificar que tenga al menos 4 partes
  const parts = apiSecret.split('_');
  if (parts.length < 4) {
    return false;
  }

  // Verificar que la segunda parte sea un UUID válido (primeros 8 caracteres)
  const tenantIdPart = parts[1];
  if (!tenantIdPart || tenantIdPart.length < 8) {
    return false;
  }

  // Verificar que la tercera parte sea un timestamp válido
  const timestampPart = parts[2];
  if (!timestampPart || !/^\d+$/.test(timestampPart)) {
    return false;
  }

  // Verificar que la cuarta parte sea un string alfanumérico
  const randomPart = parts[3];
  if (!randomPart || !/^[a-zA-Z0-9]+$/.test(randomPart)) {
    return false;
  }

  return true;
}

/**
 * Valida el formato del Tenant ID
 * Debe ser un UUID válido
 */
function validateTenantIdFormat(tenantId: string): boolean {
  if (!tenantId || typeof tenantId !== 'string') {
    return false;
  }

  // Verificar formato de UUID
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(tenantId);
}

/**
 * Middleware para validar clave de administrador
 */
const validateAdminKey = async (req: CoelsaAuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const adminKey = req.headers['x-admin-key'];

    if (!adminKey) {
      res.status(401).json({
        success: false,
        message: 'Clave de administrador requerida',
        error: 'MISSING_ADMIN_KEY',
      });
      return;
    }

    // Verificar clave de administrador
    const { validateAdminKey } = require('../utils/adminKey');
    if (!validateAdminKey(adminKey)) {
      res.status(401).json({
        success: false,
        message: 'Clave de administrador inválida',
        error: 'INVALID_ADMIN_KEY',
      });
      return;
    }

    next();
  } catch (error) {
    console.error('🔍 [ADMIN AUTH] Error en validación:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: 'INTERNAL_SERVER_ERROR',
    });
  }
};

/**
 * Middleware para validar credenciales de API o clave de administrador
 */
const validateApiOrAdmin = async (req: CoelsaAuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    const adminKey = req.headers['x-admin-key'];
    const apiKey = req.headers['x-api-key'];

    // Si hay clave de administrador, validarla
    if (adminKey) {
      const { validateAdminKey } = require('../utils/adminKey');
      if (validateAdminKey(adminKey)) {
        console.log('🔍 [AUTH] Autenticación como administrador exitosa');
        next();
        return;
      } else {
        res.status(401).json({
          success: false,
          message: 'Clave de administrador inválida',
          error: 'INVALID_ADMIN_KEY',
        });
        return;
      }
    }

    // Si no hay clave de administrador, validar credenciales de API
    if (apiKey) {
      await validateCoelsaApiKeys(req, res, next);
      return;
    }

    // Si no hay ninguna credencial
    res.status(401).json({
      success: false,
      message: 'Credenciales de API o clave de administrador requeridas',
      error: 'MISSING_CREDENTIALS',
      required_headers: ['X-API-Key, X-API-Secret, X-Tenant-ID', 'X-Admin-Key'],
    });

  } catch (error) {
    console.error('🔍 [AUTH] Error en validación:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      error: 'INTERNAL_SERVER_ERROR',
    });
  }
};

export {
  validateCoelsaApiKeys,
  validateAdminKey,
  validateApiOrAdmin,
  validateApiKeyFormat,
  validateApiSecretFormat,
  validateTenantIdFormat
};

export default validateCoelsaApiKeys;
