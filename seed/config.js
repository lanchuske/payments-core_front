/**
 * Configuración centralizada para el sistema de seeding
 */

const { sequelize } = require('../sandbox/config/database');
const models = require('../sandbox/models');

/**
 * Generar API key en el formato esperado por el middleware de autenticación
 * Formato: sandbox_{tenantIdHex}_{timestamp}_{random}
 */
function generateApiKey(tenantCode) {
  const tenantIdHex = Math.random().toString(16).substr(2, 8); // 8 caracteres hexadecimales
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 9);
  return `sandbox_${tenantIdHex}_${timestamp}_${random}`;
}

/**
 * Generar API secret único para el tenant
 */
function generateApiSecret(tenantCode) {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substr(2, 15);
  return `secret_${tenantCode.toLowerCase()}_${timestamp}_${random}`;
}

/**
 * Crear credenciales completas del sandbox para un tenant
 */
function createSandboxCredentials(tenant, baseCredentials = {}) {
  const apiKey = generateApiKey(tenant.code);
  const apiSecret = generateApiSecret(tenant.code);

  return {
    ...baseCredentials,
    api_key: apiKey,
    api_secret: apiSecret,
    generated_at: new Date().toISOString(),
    generated_by: 'SANDBOX_SYSTEM',
    tenant_id: tenant.id,
    tenant_code: tenant.code,
    tenant_name: tenant.name,
    is_active: true,
    permissions: ['read', 'write', 'admin'],
    environment: 'sandbox',
    base_url: 'http://localhost:3002',
  };
}

/**
 * Datos base para tenants
 */
const TENANTS_DATA = [
  {
    code: 'SANDBOX_SYSTEM',
    name: 'ECHEQ Sandbox System',
    sandbox_credentials: {
      environment: 'sandbox',
      api_version: 'v1',
      features: ['simulation', 'testing', 'validation'],
    },
    is_active: true,
  },
  {
    code: 'BANCO_DEMO',
    name: 'Banco Demo S.A.',
    sandbox_credentials: {
      environment: 'sandbox',
      api_version: 'v1',
      features: ['emission', 'validation', 'custody'],
    },
    is_active: true,
  },
  {
    code: 'EMPRESA_TEST',
    name: 'Empresa Test S.A.',
    sandbox_credentials: {
      environment: 'sandbox',
      api_version: 'v1',
      features: ['emission', 'endorsement'],
    },
    is_active: true,
  },
  {
    code: 'COMERCIAL_SANDBOX',
    name: 'Comercial Sandbox S.R.L.',
    sandbox_credentials: {
      environment: 'sandbox',
      api_version: 'v1',
      features: ['emission', 'discount'],
    },
    is_active: true,
  },
];

module.exports = {
  sequelize,
  models,
  generateApiKey,
  generateApiSecret,
  createSandboxCredentials,
  TENANTS_DATA,
};
