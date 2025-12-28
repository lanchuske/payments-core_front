/**
 * Script para inicializar las tablas de la base de datos
 */

const { Sequelize } = require('sequelize');
const bcrypt = require('bcryptjs');

// ⚠️ IMPORTANTE: Usar variable de entorno DATABASE_URL
// No usar valores hardcodeados de Railway o cualquier otra plataforma
if (!process.env.DATABASE_URL) {
  console.error('❌ ERROR: DATABASE_URL no está definida en las variables de entorno');
  console.error('   Por favor configure la variable de entorno DATABASE_URL antes de ejecutar este script');
  process.exit(1);
}

const DATABASE_URL = process.env.DATABASE_URL;

async function initializeTables() {
  try {
    console.log('🔍 Conectando a la base de datos...');
    
    const sequelize = new Sequelize(DATABASE_URL, {
      dialect: 'postgres',
      logging: console.log,
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false
        }
      }
    });

    await sequelize.authenticate();
    console.log('✅ Conexión establecida');

    // Crear esquema si no existe
    await sequelize.query('CREATE SCHEMA IF NOT EXISTS echeqsandbox;');
    console.log('✅ Esquema echeqsandbox creado/verificado');

    // Crear tabla users
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS echeqsandbox.users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        company_name VARCHAR(255),
        role VARCHAR(50) NOT NULL DEFAULT 'USER',
        status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
        "tenantId" UUID,
        "lastLogin" TIMESTAMP,
        metadata JSONB DEFAULT '{}',
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    console.log('✅ Tabla users creada/verificada');

    // Crear tabla tenants si no existe
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS echeqsandbox.tenants (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        code VARCHAR(50) NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        sandbox_credentials JSONB DEFAULT '{}',
        api_key VARCHAR(255),
        api_secret VARCHAR(255),
        main_tenant_id UUID,
        sync_with_main BOOLEAN DEFAULT false,
        is_independent BOOLEAN DEFAULT true,
        cuit VARCHAR(11),
        is_active BOOLEAN DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);
    console.log('✅ Tabla tenants creada/verificada');

    // Insertar usuario admin por defecto
    const hashedPassword = await bcrypt.hash('password', 10);
    
    await sequelize.query(`
      INSERT INTO echeqsandbox.users (id, email, password, company_name, role, status)
      VALUES ('1', 'admin@sandbox.echeq.ar', $1, 'Administrador', 'ADMIN', 'ACTIVE')
      ON CONFLICT (email) DO NOTHING;
    `, {
      bind: [hashedPassword]
    });
    console.log('✅ Usuario admin creado/verificado');

    await sequelize.close();
    console.log('🔒 Conexión cerrada');
    console.log('🎉 Inicialización completada!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

initializeTables();
