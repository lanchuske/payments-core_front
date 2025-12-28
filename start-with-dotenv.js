#!/usr/bin/env node

/**
 * Script de inicio con dotenv para ECHEQ Sandbox
 * Carga las variables de entorno desde archivo .env
 * Siguiendo el patrón del backend para Railway deployment
 */

require('dotenv').config();

// Verificar que las variables críticas estén cargadas
const requiredVars = [
  'NODE_ENV',
  'PORT',
  'DATABASE_URL',
  'JWT_SECRET',
];

const optionalVars = [
  'CORS_ORIGIN',
  'RATE_LIMIT_MAX',
  'RATE_LIMIT_WINDOW',
  'REDIS_URL',
  'LOG_LEVEL',
  'SANDBOX_MODE',
  'ENABLE_SIMULATION',
  // COELSA credentials son opcionales - se configuran por banco en BD
  'COELSA_API_KEY',
  'COELSA_API_SECRET',
  'COELSA_API_URL',
];

console.log('🔧 Variables de entorno cargadas desde .env');
console.log('📋 Variables críticas:');

requiredVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    console.log(
      `  ✅ ${varName}=${varName.includes('SECRET') || varName.includes('PASSWORD') ? '***' : value}`
    );
  } else {
    console.log(`  ❌ ${varName}=undefined`);
  }
});

console.log('📋 Variables opcionales:');
optionalVars.forEach(varName => {
  const value = process.env[varName];
  if (value) {
    console.log(
      `  ✅ ${varName}=${varName.includes('SECRET') || varName.includes('PASSWORD') ? '***' : value}`
    );
  } else {
    console.log(`  ⚠️ ${varName}=undefined (usando valor por defecto)`);
  }
});

console.log('🚀 Iniciando sandbox...\n');

// Importar y ejecutar el sandbox principal
require('./sandbox/index.js');
