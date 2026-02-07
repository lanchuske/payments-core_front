#!/usr/bin/env node

/**
 * Script de inicio con dotenv para ECHEQ Sandbox
 * Carga las variables de entorno desde .env (y .env.local si existe) en la raíz del proyecto.
 * Usa __dirname para que funcione igual desde cualquier directorio de trabajo.
 */

const path = require('path');

const projectRoot = path.resolve(__dirname);
const envPath = path.join(projectRoot, '.env');
const envLocalPath = path.join(projectRoot, '.env.local');

require('dotenv').config({ path: envPath });
require('dotenv').config({ path: envLocalPath, override: true });

// Verificar que las variables críticas estén cargadas
const requiredVars = [
  'NODE_ENV',
  'PORT',
  'DATABASE_URL',
  'JWT_SECRET',
];

const optionalVars = [
  'ADMIN_KEY',
  'ADMIN_PASSWORD',
  'CORS_ORIGIN',
  'RATE_LIMIT_MAX',
  'RATE_LIMIT_WINDOW',
  'REDIS_URL',
  'REDIS_ENABLED',
  'LOG_LEVEL',
  'SANDBOX_MODE',
  'ENABLE_SIMULATION',
  'APPLICATIONINSIGHTS_CONNECTION_STRING',
  'SANDBOX_URL',
  'FRONTEND_URL',
  'COELSA_API_KEY',
  'COELSA_API_SECRET',
  'COELSA_API_URL',
];

const fs = require('fs');
if (!fs.existsSync(envPath) && !fs.existsSync(envLocalPath)) {
  console.warn('⚠️  No se encontró .env ni .env.local en ' + projectRoot);
  console.warn('   Crea .env con: cp .env.example .env');
  console.warn('   Luego edita .env con DATABASE_URL, JWT_SECRET, etc.\n');
}

console.log('🔧 Variables de entorno (desde ' + projectRoot + ')');
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
