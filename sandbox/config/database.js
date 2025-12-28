/**
 * ⚠️ CÓDIGO LEGACY - NO EN USO ⚠️
 * 
 * Este código está DEPRECADO. La plataforma usa echeq-sandbox-nestjs.
 * Ver DEPRECATED.md y LEGACY_README.md en la raíz del repositorio.
 * 
 * ⚠️ NO MODIFICAR - Este código no se ejecuta en producción
 */

/**
 * Configuración de Base de Datos del Sandbox - VERSIÓN INDEPENDIENTE
 * Ubicación: sandbox/config/database.js
 *
 * Esta versión funciona independientemente en Railway sin depender del backend
 */

const { Sequelize } = require('sequelize');

// 🔧 Configuración simplificada usando DATABASE_URL
// SSL solo para conexiones remotas (Railway, producción), no para localhost
const dbUrl = process.env.DATABASE_URL || '';
const isLocalhost = dbUrl.includes('localhost') || dbUrl.includes('127.0.0.1') || !dbUrl.includes('@');
const dbConfig = {
  url: dbUrl,
  ssl: process.env.DB_SSL === 'true' || (!isLocalhost && process.env.DB_SSL !== 'false'),
};

console.log(`🌍 Ambiente: ${process.env.NODE_ENV || 'development'}`);
console.log(`🔧 Usando DATABASE_URL del archivo .env`);

// 🗄️ Crear instancia de Sequelize usando configuración disponible
if (!dbConfig.url) {
  console.error('❌ DATABASE_URL no está definida en las variables de entorno');
  process.exit(1);
}

const sequelize = new Sequelize(dbConfig.url, {
  dialect: 'postgres',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  pool: {
    max: 5,
    min: 1,
    acquire: 60000,
    idle: 30000,
  },
  dialectOptions: {
    ssl: dbConfig.ssl
      ? {
          require: true,
          rejectUnauthorized: false,
        }
      : false,
    connectTimeout: 60000,
    acquireTimeout: 60000,
    timeout: 60000,
    keepAlive: true,
    keepAliveInitialDelayMillis: 0,
  },
  // FORZAR IPv4 - CRÍTICO para Railway
  family: 4,
  define: {
    timestamps: true,
    underscored: true, // La BD usa snake_case (created_at, updated_at)
    schema: 'echeqsandbox', // Usar esquema echeqsandbox para el sandbox
  },
  // Configuración adicional para resolver problemas de autenticación
  retry: {
    match: [
      /ETIMEDOUT/,
      /EHOSTUNREACH/,
      /ECONNRESET/,
      /ECONNREFUSED/,
      /ETIMEDOUT/,
      /ESOCKETTIMEDOUT/,
      /EHOSTUNREACH/,
      /EPIPE/,
      /EAI_AGAIN/,
      /SequelizeConnectionError/,
      /SequelizeConnectionRefusedError/,
      /SequelizeHostNotFoundError/,
      /SequelizeHostNotReachableError/,
      /SequelizeInvalidConnectionError/,
      /SequelizeConnectionTimedOutError/,
    ],
    max: 5,
  },
});

// 🔧 Función de conexión con reintentos mejorados
async function connectDatabase(maxRetries = 5) {
  // Parsear DATABASE_URL para mostrar información útil
  let hostInfo = 'Railway PostgreSQL';
  let dbInfo = 'railway';
  let userInfo = 'postgres';

  if (process.env.DATABASE_URL) {
    try {
      const url = new URL(process.env.DATABASE_URL);
      hostInfo = `${url.hostname}:${url.port}`;
      dbInfo = url.pathname.slice(1) || 'railway';
      userInfo = url.username || 'postgres';
    } catch (error) {
      // Si no se puede parsear, usar valores por defecto
    }
  }

  console.log(
    `🔧 Conectando a PostgreSQL en ambiente: ${process.env.NODE_ENV || 'development'}`
  );
  console.log(`🌐 Host: ${hostInfo}`);
  console.log(`🗄️  Base de datos: ${dbInfo}`);
  console.log(`👤 Usuario: ${userInfo}`);
  console.log(`🔒 SSL: ${dbConfig.ssl ? 'Habilitado' : 'Deshabilitado'}`);
  console.log(`📁 Schema: echeqsandbox`);

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(
        `🔄 Intento ${attempt}/${maxRetries} de conexión a PostgreSQL...`
      );
      await sequelize.authenticate();
      console.log('✅ Conexión a PostgreSQL establecida correctamente');
      return true;
    } catch (error) {
      console.error(
        `❌ Error en intento ${attempt}/${maxRetries}:`,
        error.message
      );
      if (attempt < maxRetries) {
        const delay = Math.min(2 ** (attempt - 1) * 1000, 10000); // Max 10s delay
        console.log(
          `⏳ Esperando ${delay / 1000}s antes del siguiente intento...`
        );
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  console.error('❌ Todos los intentos de conexión fallaron');
  throw new Error(
    'No se pudo conectar a la base de datos después de varios reintentos.'
  );
}

// 🔧 Función para cerrar conexión
async function closeDatabase() {
  try {
    await sequelize.close();
    console.log('✅ Conexión a PostgreSQL cerrada correctamente');
  } catch (error) {
    console.error('❌ Error cerrando conexión a PostgreSQL:', error.message);
  }
}

module.exports = {
  sequelize,
  connectDatabase,
  closeDatabase,
};
